package rest.service.impl.serveur;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.serveur.ReglagesServeur.Niveau;
import rest.service.impl.serveur.ReglagesServeur.Reglage;

/**
 * STABILITE DU SERVEUR (demande du 02/11) : reglages de Payara de CHAQUE poste (serveur et caisses secondaires qui ont
 * leur propre Payara). Chaque Payara releve ses propres reglages a son demarrage et a chaque ouverture de l'ecran, dans
 * la base commune (t_serveur_poste, une ligne par machine et par domaine) ; l'ecran du serveur les liste tous. Regles
 * pures (testees a part) :
 * <ul>
 * <li>ligne d'un poste : role (serveur ou caisse), memoire, pool, fils HTTP, reglages a ajuster ;</li>
 * <li>alertes d'ensemble : pools de tous les postes au-dela de ce que MariaDB accepte, plus de postes releves que
 * declares, poste sans nouvelles ; un seul serveur par reseau (retour du 03/11), la machine qui heberge la base : une
 * autre machine configuree en serveur est une caisse a corriger (elle lancerait les taches planifiees en double), la
 * machine de la base configuree en client aussi (les taches ne tourneraient nulle part).</li>
 * </ul>
 * Aucune donnee de vente ni de client ; jamais de mot de passe (l'URL du pool n'est pas gardee).
 */
public final class PostesReglages {

    /** Au-dela, un poste sans nouveau releve est signale (caisse eteinte, retiree, ou Payara arrete). */
    public static final Duration SANS_NOUVELLES = Duration.ofDays(30);
    /** Connexions laissees aux outils (sauvegarde, client SQL), comme dans {@link ReglagesServeur#connexionsMariadb}. */
    static final int MARGE_OUTILS = 50;

    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Un poste releve. */
    public static final class Poste {
        public String hote = "", domaine = "";
        public boolean serveur, mariadbLocale;
        public LocalDateTime releve;
        public long ramMo, heapMo;
        public int processeurs, pool, filsHttp, aAjuster, critiques;
        /** Reglages de Payara du poste, en JSON (cle, libelle, actuel, conseille, niveau). */
        public String reglages = "[]";

        public JSONObject json() {
            return new JSONObject().put("hote", hote).put("domaine", domaine).put("serveur", serveur)
                    .put("mariadbLocale", mariadbLocale).put("releve", releve == null ? "" : releve.toString())
                    .put("ramMo", ramMo).put("heapMo", heapMo).put("processeurs", processeurs).put("pool", pool)
                    .put("filsHttp", filsHttp).put("aAjuster", aAjuster).put("critiques", critiques)
                    .put("reglages", new JSONArray(reglages));
        }
    }

    private PostesReglages() {
    }

    /** Ligne du poste courant, d'apres le calcul des reglages de sa machine. */
    public static Poste depuis(String hote, CalculReglages c, int processeurs, long heapMax, LocalDateTime maintenant) {
        Poste p = new Poste();
        p.hote = hote == null ? "" : hote;
        p.domaine = c.domaine == null ? "" : c.domaine.nom;
        p.serveur = c.serveur;
        p.mariadbLocale = c.mariadbLocale;
        p.releve = maintenant;
        p.ramMo = c.ram / ReglagesServeur.MO;
        p.heapMo = heapMax / ReglagesServeur.MO;
        p.processeurs = processeurs;
        p.pool = c.payara != null && c.payara.lu ? c.payara.poolMax : -1;
        p.filsHttp = c.payara != null && c.payara.lu ? c.payara.filsHttpMax : -1;
        JSONArray a = new JSONArray();
        for (Reglage x : c.payaraReglages) {
            a.put(new JSONObject().put("cle", x.cle).put("libelle", x.libelle)
                    .put("actuel", x.actuel == null ? "" : x.actuel)
                    .put("conseille", x.conseille == null ? "" : x.conseille).put("niveau", x.niveau.name()));
            if (x.niveau != Niveau.OK) {
                p.aAjuster++;
            }
            if (x.niveau == Niveau.CRITIQUE) {
                p.critiques++;
            }
        }
        p.reglages = a.toString();
        return p;
    }

    /**
     * Un seul serveur par reseau (retour du 03/11) : un Payara configure en serveur lance les taches planifiees, sauf
     * s'il n'heberge pas la base alors que la machine qui l'heberge est connue comme serveur (c'est alors une caisse
     * mal configuree, qui les lancerait en double). Dans le doute (aucun serveur connu), rien ne change.
     */
    public static boolean tachesDuServeurIci(boolean declareServeur, boolean baseLocale, boolean autreServeurConnu) {
        return declareServeur && (baseLocale || !autreServeurConnu);
    }

    /**
     * Alertes d'ensemble sur les postes releves.
     *
     * @param postesDeclares
     *            nombre de postes saisi dans l'ecran (parametre commun SUPPORT_SERVEUR_POSTES)
     * @param maxConnexions
     *            max_connections de MariaDB, -1 s'il est inconnu
     */
    public static List<String> alertes(List<Poste> postes, int postesDeclares, int maxConnexions,
            LocalDateTime maintenant) {
        List<String> l = new ArrayList<>();
        int pools = 0;
        Set<String> machines = new LinkedHashSet<>(), configuresServeur = new LinkedHashSet<>(),
                machinesDeLaBase = new LinkedHashSet<>();
        for (Poste p : postes) {
            machines.add(p.hote);
            if (p.pool > 0) {
                pools += p.pool;
            }
            if (p.serveur) {
                configuresServeur.add(p.hote);
            }
            if (p.mariadbLocale) {
                machinesDeLaBase.add(p.hote);
            }
            if (p.releve != null && Duration.between(p.releve, maintenant).compareTo(SANS_NOUVELLES) > 0) {
                l.add("Pas de relevé de « " + p.hote + " » (" + p.domaine + ") depuis le " + p.releve.format(JOUR)
                        + " : poste éteint, retiré ou Payara arrêté.");
            }
        }
        /*
         * Un seul serveur par reseau (retour du 03/11) : c'est la machine qui heberge la base ; toutes les autres sont
         * des caisses (application.mode=client dans dicisms.properties).
         */
        if (!machinesDeLaBase.isEmpty()) {
            String serveur = String.join(", ", machinesDeLaBase);
            Set<String> dits = new LinkedHashSet<>();
            for (Poste p : postes) {
                if (p.serveur && !machinesDeLaBase.contains(p.hote) && dits.add(p.hote)) {
                    l.add("« " + p.hote + " » est configuré en serveur alors que la base est sur « " + serveur
                            + " » : c'est une caisse. Mettez application.mode=client dans son dicisms.properties,"
                            + " sinon il lance aussi les tâches du serveur (stock du jour, notifications, campagnes,"
                            + " réapprovisionnement) en double.");
                }
                if (!p.serveur && machinesDeLaBase.contains(p.hote) && dits.add(p.hote)) {
                    l.add("« " + p.hote + " » héberge la base mais est configuré en client : mettez"
                            + " application.mode=server dans son dicisms.properties, sinon les tâches planifiées ne"
                            + " tournent sur aucun poste.");
                }
            }
            if (machinesDeLaBase.size() > 1) {
                l.add("Plusieurs machines hébergent une base : " + serveur + ". Il n'y a qu'un serveur par réseau.");
            }
        } else if (!postes.isEmpty()) {
            l.add("Aucun relevé de la machine qui héberge la base (le serveur) : son Payara n'a pas encore cette"
                    + " version, ou il est arrêté.");
            if (configuresServeur.size() > 1) {
                l.add("Plusieurs machines sont configurées en serveur : " + String.join(", ", configuresServeur)
                        + ". Il n'y a qu'un serveur par réseau : les autres doivent avoir application.mode=client.");
            }
        }
        if (maxConnexions > 0 && pools + MARGE_OUTILS > maxConnexions) {
            l.add("Les pools des postes relevés totalisent " + pools + " connexions (plus " + MARGE_OUTILS
                    + " pour les outils) : MariaDB n'en accepte que " + maxConnexions
                    + ". Augmentez max_connections ou réduisez les pools.");
        }
        if (machines.size() > postesDeclares) {
            l.add(machines.size() + " machines relevées pour " + postesDeclares
                    + " poste(s) déclaré(s) : mettez à jour le nombre de postes, qui dimensionne MariaDB.");
        }
        return l;
    }
}
