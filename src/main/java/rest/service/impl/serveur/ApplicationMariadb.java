package rest.service.impl.serveur;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import rest.service.impl.serveur.ReglagesServeur.Niveau;
import rest.service.impl.serveur.ReglagesServeur.Reglage;

/**
 * STABILITE DU SERVEUR : application des reglages conseilles de MariaDB depuis le Centre de support (super
 * administrateur). Regles pures (testees a part) : liste FERMEE des reglages, droits du compte de l'application,
 * valeurs bornees, innodb_flush_log_at_trx_commit bloque a 1, trace avant / apres pour le journal.
 * <p>
 * Une valeur n'est jamais recue de l'ecran : elle vient du calcul de {@link ReglagesServeur}, l'ecran ne choisit que
 * les cles, filtrees par la liste.
 */
public final class ApplicationMariadb {

    private static final long KO = 1024L, MO = ReglagesServeur.MO, GO = ReglagesServeur.GO;

    public enum Type {
        TAILLE, NOMBRE, INTERRUPTEUR
    }

    public enum Etat {
        A_FAIRE, APPLIQUE, ECHEC, MY_INI, REFUSE
    }

    /** Regle d'un reglage connu : type, modifiable a chaud (MariaDB 10.6), bornes de securite. */
    static final class Regle {
        final Type type;
        final boolean dynamique;
        final long min, max;

        Regle(Type type, boolean dynamique, long min, long max) {
            this.type = type;
            this.dynamique = dynamique;
            this.min = min;
            this.max = max;
        }
    }

    /** Reglages connus, dans l'ordre d'application. Rien d'autre n'est jamais ecrit. */
    static final Map<String, Regle> REGLES = new LinkedHashMap<>();
    static {
        REGLES.put("innodb_buffer_pool_size", new Regle(Type.TAILLE, true, 128 * MO, 512 * GO));
        /* fixe au demarrage jusqu'a MariaDB 11 : my.ini seulement */
        REGLES.put("innodb_log_buffer_size", new Regle(Type.TAILLE, false, MO, GO));
        REGLES.put("max_allowed_packet", new Regle(Type.TAILLE, true, MO, GO));
        REGLES.put("tmp_table_size", new Regle(Type.TAILLE, true, 16 * MO, GO));
        REGLES.put("max_heap_table_size", new Regle(Type.TAILLE, true, 16 * MO, GO));
        REGLES.put("max_connections", new Regle(Type.NOMBRE, true, 151, 5000));
        REGLES.put("thread_cache_size", new Regle(Type.NOMBRE, true, 8, 1000));
        REGLES.put("table_open_cache", new Regle(Type.NOMBRE, true, 400, 100000));
        /* le maximum avant la capacite : innodb_io_capacity ne peut pas le depasser */
        REGLES.put("innodb_io_capacity_max", new Regle(Type.NOMBRE, true, 200, 100000));
        REGLES.put("innodb_io_capacity", new Regle(Type.NOMBRE, true, 100, 100000));
        REGLES.put("innodb_flush_log_at_trx_commit", new Regle(Type.NOMBRE, true, 1, 1));
        REGLES.put("slow_query_log", new Regle(Type.INTERRUPTEUR, true, 0, 1));
        REGLES.put("long_query_time", new Regle(Type.NOMBRE, true, 1, 10));
        REGLES.put("innodb_print_all_deadlocks", new Regle(Type.INTERRUPTEUR, true, 0, 1));
    }

    /** Valeur ecrite pour innodb_io_capacity_max (ligne du bloc my.ini). */
    static final long CAPACITE_MAX = 4000;

    /** Une modification : cle, valeur a appliquer, valeur avant / apres, etat et message. */
    public static final class Action {
        public final String cle, libelle;
        public final long valeur;
        public final boolean dynamique;
        /** Redimensionnement long (tampon InnoDB, par morceaux). */
        public boolean long_;
        public String avant, apres, refus, avertissement, message;
        public Etat etat = Etat.A_FAIRE;

        Action(String cle, String libelle, long valeur, boolean dynamique) {
            this.cle = cle;
            this.libelle = libelle;
            this.valeur = valeur;
            this.dynamique = dynamique;
        }

        /** Valeur lisible de l'action (taille, nombre, activé / désactivé). */
        public String valeurLisible() {
            return lisible(cle, String.valueOf(valeur));
        }
    }

    /** Droits du compte de l'application pour SET GLOBAL. */
    public static final class Droits {
        public final boolean ok;
        public final String message;

        Droits(boolean ok, String message) {
            this.ok = ok;
            this.message = message;
        }
    }

    private ApplicationMariadb() {
    }

    public static boolean connu(String cle) {
        return cle != null && REGLES.containsKey(cle);
    }

    /** Liste fermee (pour l'ecriture de my.ini). */
    public static java.util.Set<String> cles() {
        return java.util.Collections.unmodifiableSet(REGLES.keySet());
    }

    static boolean dynamique(String cle) {
        return connu(cle) && REGLES.get(cle).dynamique;
    }

    /** « 10.6.12-MariaDB-log » -> {10, 6, 12}. */
    static int[] version(String v) {
        int[] r = new int[3];
        Matcher m = Pattern.compile("(\\d+)\\.(\\d+)(?:\\.(\\d+))?").matcher(v == null ? "" : v);
        if (m.find()) {
            r[0] = Integer.parseInt(m.group(1));
            r[1] = Integer.parseInt(m.group(2));
            r[2] = m.group(3) == null ? 0 : Integer.parseInt(m.group(3));
        }
        return r;
    }

    static boolean auMoins(String v, int a, int b, int c) {
        int[] x = version(v);
        return x[0] != a ? x[0] > a : x[1] != b ? x[1] > b : x[2] >= c;
    }

    /**
     * Le compte peut-il faire SET GLOBAL ? SUPER (ou tous les droits) sur *.* ; a partir de MariaDB 10.5.2, SYSTEM
     * VARIABLES ADMIN suffit aussi.
     *
     * @param grants
     *            lignes de SHOW GRANTS FOR CURRENT_USER()
     * @param compte
     *            CURRENT_USER() (« nom@hote »)
     */
    public static Droits droits(Collection<String> grants, String version, String compte) {
        boolean recent = auMoins(version, 10, 5, 2);
        for (String g : grants) {
            Matcher m = Pattern.compile("^\\s*GRANT\\s+(.+?)\\s+ON\\s+\\*\\.\\*\\s+TO", Pattern.CASE_INSENSITIVE)
                    .matcher(g == null ? "" : g);
            if (!m.find()) {
                continue;
            }
            for (String d : m.group(1).split(",")) {
                String p = d.trim().toUpperCase(Locale.ROOT).replace('_', ' ');
                if (p.equals("ALL PRIVILEGES") || p.equals("ALL") || p.equals("SUPER")
                        || (recent && p.equals("SYSTEM VARIABLES ADMIN"))) {
                    return new Droits(true, "");
                }
            }
        }
        String nom = compte == null ? "" : compte, hote = "%";
        int a = nom.lastIndexOf('@');
        if (a >= 0) {
            hote = nom.substring(a + 1);
            nom = nom.substring(0, a);
        }
        return new Droits(false,
                "Le compte de l'application (" + compte + ") n'a pas le droit SUPER"
                        + (recent ? " ni SYSTEM_VARIABLES_ADMIN" : "")
                        + " : MariaDB refuse de changer ses réglages en marche. À faire une fois par l'administrateur"
                        + " de MariaDB : GRANT SUPER ON *.* TO '" + nom + "'@'" + hote
                        + "'; (ou passer par my.ini, puis redémarrer MariaDB).");
    }

    /** Valeur d'une ligne « cle=valeur » du calcul, en nombre pour SET GLOBAL ; -1 si illisible. */
    static long valeur(String cle, String texte) {
        if (texte == null) {
            return -1;
        }
        String v = texte.trim();
        Regle r = REGLES.get(cle);
        if (r == null) {
            return -1;
        }
        if (r.type == Type.INTERRUPTEUR) {
            String u = v.toUpperCase(Locale.ROOT);
            return "1".equals(u) || "ON".equals(u) ? 1 : "0".equals(u) || "OFF".equals(u) ? 0 : -1;
        }
        if (r.type == Type.TAILLE) {
            return ReglagesServeur.octets(v);
        }
        try {
            return (long) Double.parseDouble(v);
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    /** Valeur lisible d'une variable (taille en Mo / Go, activé / désactivé, nombre). */
    public static String lisible(String cle, String brut) {
        if (brut == null) {
            return "?";
        }
        Regle r = REGLES.get(cle);
        if (r == null) {
            return brut;
        }
        long v = valeur(cle, brut);
        if (v < 0) {
            return brut;
        }
        return r.type == Type.TAILLE ? ReglagesServeur.taille(v)
                : r.type == Type.INTERRUPTEUR ? (v == 1 ? "activé" : "désactivé") : String.valueOf(v);
    }

    /** innodb_flush_log_at_trx_commit n'est jamais ecrit autrement qu'a 1. */
    public static String ligneSure(String ligne) {
        return ligne != null && ligne.trim().startsWith("innodb_flush_log_at_trx_commit")
                ? "innodb_flush_log_at_trx_commit=1" : ligne;
    }

    /**
     * Modifications a faire : reglages de MariaDB a ajuster, de la liste fermee, parmi les cles choisies (toutes si
     * null).
     *
     * @param reglages
     *            resultat de {@link ReglagesServeur#comparer}
     * @param variables
     *            SHOW GLOBAL VARIABLES (noms en minuscules) : valeurs avant
     */
    public static List<Action> preparer(List<Reglage> reglages, Map<String, String> variables,
            Collection<String> choix) {
        List<Action> l = new ArrayList<>();
        for (Reglage r : reglages) {
            if (!"MARIADB".equals(r.domaine) || r.niveau == Niveau.OK || !connu(r.cle)
                    || (choix != null && !choix.contains(r.cle))) {
                continue;
            }
            String ligne = r.ligne == null ? "" : r.ligne;
            int egal = ligne.indexOf('=');
            long v = egal < 0 || !ligne.substring(0, egal).trim().equals(r.cle) ? -1
                    : valeur(r.cle, ligne.substring(egal + 1));
            Regle regle = REGLES.get(r.cle);
            Action a = new Action(r.cle, r.libelle, v, regle.dynamique);
            a.avant = lisible(r.cle, variables.get(r.cle));
            if ("innodb_flush_log_at_trx_commit".equals(r.cle) && v != 1) {
                a.refus = "Bloqué à 1 : aucune vente perdue en cas de coupure de courant.";
            } else if (v < regle.min || v > regle.max) {
                a.refus = "Valeur hors des bornes prévues (" + lisible(r.cle, String.valueOf(regle.min)) + " à "
                        + lisible(r.cle, String.valueOf(regle.max)) + ").";
            }
            if (a.refus != null) {
                a.etat = Etat.REFUSE;
            } else if (!a.dynamique) {
                a.etat = Etat.MY_INI;
                a.message = "Pris en compte au prochain redémarrage de MariaDB (my.ini).";
            }
            if ("innodb_buffer_pool_size".equals(r.cle)) {
                a.long_ = true;
                a.avertissement = "Le tampon InnoDB se redimensionne par morceaux pendant plusieurs minutes ;"
                        + " les requêtes peuvent ralentir pendant ce temps. À faire hors des heures de vente.";
            }
            if ("innodb_io_capacity".equals(r.cle) && a.refus == null && (choix == null || choix.contains(r.cle))
                    && valeur("innodb_io_capacity_max", variables.get("innodb_io_capacity_max")) < Math
                            .max(CAPACITE_MAX, v)) {
                Action m = new Action("innodb_io_capacity_max", "Capacité d'écriture maximale du disque",
                        Math.max(CAPACITE_MAX, v), true);
                m.avant = lisible(m.cle, variables.get(m.cle));
                l.add(m);
            }
            l.add(a);
        }
        /* ordre d'application de la liste (le maximum avant la capacite) */
        List<String> ordre = new ArrayList<>(REGLES.keySet());
        l.sort((x, y) -> Integer.compare(ordre.indexOf(x.cle), ordre.indexOf(y.cle)));
        return l;
    }

    /** Detail du journal des evenements : chaque reglage avant puis apres. */
    public static String journal(List<Action> actions) {
        StringBuilder sb = new StringBuilder();
        for (Action a : actions) {
            sb.append(a.cle).append(" : ").append(a.avant).append(" -> ");
            switch (a.etat) {
            case APPLIQUE:
                sb.append(a.apres == null ? a.valeurLisible() : a.apres);
                break;
            case MY_INI:
                sb.append(a.valeurLisible()).append(" (au prochain redémarrage de MariaDB)");
                break;
            case REFUSE:
                sb.append("refusé : ").append(a.refus);
                break;
            case ECHEC:
                sb.append("échec : ").append(a.message);
                break;
            default:
                sb.append("non appliqué");
            }
            sb.append('\n');
        }
        return sb.toString();
    }
}
