package rest.service.impl;

import dal.TUser;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.PilotagePeriodes.Axe;
import rest.service.impl.PilotagePeriodes.Periode;

/**
 * Menu de pilotage (evolution 6, point 1) : les chiffres de l'officine, mois par mois, et comparables.
 *
 * <p>
 * Ce que ce menu apporte, et qui n'existait pas : <b>chaque mois est isole et comparable a un autre</b>. Jusqu'ici, il
 * fallait exporter le rapport d'activite mois par mois et rapprocher les classeurs a la main pour repondre a « est-ce
 * qu'on fait mieux que l'an dernier ». La donnee etait deja en base ; il manquait l'ecran.
 *
 * <p>
 * Le tableau de bord existant n'est pas touche : ce menu vit a cote de lui.
 *
 * <p>
 * Les definitions ne sont pas reinventees (voir {@link PilotageSql}) : chiffre d'affaires, marge et achats sont
 * calcules comme les ecrans existants les calculent. Un ecran de pilotage qui annonce un chiffre different de la
 * balance provoque une reunion sur le chiffre au lieu d'une reunion sur l'activite.
 *
 * <p>
 * Performance : tout est agrege par mois en une seule passe, et le resultat est garde en memoire par utilisateur et par
 * demande (axe + onglet) pendant quelques minutes. La requete de marge passe par le detail des ventes et coute
 * plusieurs secondes sur deux ans d'historique : sans ce cache, changer d'onglet la relancerait a chaque fois.
 */
@Stateless
/*
 * AUCUNE TRANSACTION EN LECTURE.
 *
 * Retour de l'officine du 19/09 : erreurs 500 « Client's transaction aborted ». Une requete qui echoue dans une
 * transaction CMT la condamne, meme si on attrape l'exception : l'appel suivant recoit alors ce refus. Ces services ne
 * font que lire ; ils n'ont aucun besoin de transaction, et sans transaction une requete qui echoue n'emporte plus que
 * sa propre grandeur.
 */
@javax.ejb.TransactionAttribute(javax.ejb.TransactionAttributeType.NOT_SUPPORTED)
public class PilotageService {

    private static final Logger LOG = Logger.getLogger(PilotageService.class.getName());

    /** Onglets servis par cette vague : les autres arrivent avec leurs propres donnees. */
    public static final String ONGLET_SYNTHESE = "synthese";
    public static final String ONGLET_VENTES = "ventes";
    public static final String ONGLET_MARGE = "marge";
    public static final String ONGLET_ACHATS = "achats";
    public static final String ONGLET_CAISSE = "caisse";
    public static final String ONGLET_STOCK = "stock";
    public static final String ONGLET_QUALITE = "qualite";
    public static final String ONGLET_KPI = "kpi";
    public static final String ONGLET_COMPARATEUR = "comparateur";
    public static final String ONGLET_ACHATS_VENTES = "achatsventes";

    /** Les trois decoupages de l'onglet Achats / Ventes. */
    public static final String DECOUPAGE_TRIMESTRE = "TRIMESTRE";
    public static final String DECOUPAGE_SEMESTRE = "SEMESTRE";
    public static final String DECOUPAGE_ANNEE = "ANNEE";

    /** Nombre d'annees comparees dans l'onglet Achats / Ventes : l'annee en cours et les deux precedentes. */
    private static final int ANNEES_COMPAREES = 3;

    private static final long CACHE_TTL_MS = 5L * 60L * 1000L;

    private static final Map<String, Entree> CACHE = new java.util.concurrent.ConcurrentHashMap<>();

    private static final class Entree {
        final long horodatage;
        final String json;

        Entree(String json) {
            this.horodatage = System.currentTimeMillis();
            this.json = json;
        }

        boolean frais() {
            return System.currentTimeMillis() - horodatage < CACHE_TTL_MS;
        }
    }

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @javax.ejb.EJB
    private PilotageAgregats agregats;

    @javax.ejb.EJB
    private rest.report.ReportUtil reportUtil;

    @javax.ejb.EJB
    private rest.service.utils.ReportExcelExportService excelService;

    /** Les axes de comparaison proposes par l'ecran, avec leur libelle : la liste vient du serveur, pas du JS. */
    public JSONObject axes() {
        JSONArray data = new JSONArray();
        data.put(axe(PilotagePeriodes.MOIS_EN_COURS, "Mois en cours"));
        data.put(axe(PilotagePeriodes.VS_MOIS_PRECEDENT, "Vs mois précédent"));
        data.put(axe(PilotagePeriodes.VS_MEME_MOIS_AN_DERNIER, "Vs même mois l'an dernier"));
        data.put(axe(PilotagePeriodes.CUMUL_ANNUEL, "Cumul annuel vs an dernier"));
        data.put(axe(PilotagePeriodes.GLISSANT_12_MOIS, "Glissant 12 mois"));
        data.put(axe(PilotagePeriodes.PERSONNALISE, "Période personnalisée"));
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data);
    }

    private static JSONObject axe(String code, String libelle) {
        return new JSONObject().put("code", code).put("libelle", libelle);
    }

    /**
     * Donnees d'un onglet pour l'axe demande.
     *
     * @param onglet
     *            synthese, ventes ou marge
     */
    public JSONObject donnees(TUser operateur, String onglet, String codeAxe, String debutPerso, String finPerso) {
        return donnees(operateur, onglet, codeAxe, debutPerso, finPerso, new Filtres(null, null, null));
    }

    /** Variante avec les filtres de l'onglet Achats. */
    public JSONObject donnees(TUser operateur, String onglet, String codeAxe, String debutPerso, String finPerso,
            Filtres filtres) {
        return donnees(operateur, onglet, codeAxe, debutPerso, finPerso, filtres, null);
    }

    /**
     * Variante complete : les filtres des achats, et le choix des KPI ou du comparateur.
     *
     * @param choix
     *            pour l'onglet KPI, la liste des indicateurs coches ; pour le comparateur, son type et ses deux objets
     */
    public JSONObject donnees(TUser operateur, String onglet, String codeAxe, String debutPerso, String finPerso,
            Filtres filtres, Choix choix) {
        Axe axe = PilotagePeriodes.calculer(codeAxe, LocalDate.now(), OrdonnanceClientSaisie.date(debutPerso),
                OrdonnanceClientSaisie.date(finPerso));
        String cle = (operateur == null ? "?" : operateur.getLgUSERID()) + "|" + onglet + "|" + axe.code + "|"
                + StringUtils.defaultString(debutPerso) + "|" + StringUtils.defaultString(finPerso) + "|"
                + filtres.cle() + "|" + (choix == null ? "" : choix.cle());
        /*
         * LA PHOTO DU STOCK A L'OUVERTURE A ETE ABANDONNEE le 19/09.
         *
         * Elle demandait qu'un operateur vienne ouvrir cet onglet pour qu'un mois soit enregistre - « le pharmacien ne
         * va pas passer ses jours a venir cliquer dans ce menu », et l'officine avait raison. Le logiciel releve deja
         * la valeur du stock chaque nuit (stock_daily_value, travail planifie du stock) : l'onglet Stock lit desormais
         * ce releve, qui se complete tout seul.
         */
        Entree cache = CACHE.get(cle);
        if (cache != null && cache.frais()) {
            return new JSONObject(cache.json);
        }
        JSONObject reponse;
        try {
            switch (StringUtils.defaultString(onglet)) {
            case ONGLET_VENTES:
                reponse = ventes(axe);
                break;
            case ONGLET_MARGE:
                reponse = marge(axe);
                break;
            case ONGLET_ACHATS:
                reponse = achats(axe, filtres);
                break;
            case ONGLET_CAISSE:
                reponse = caisse(axe);
                break;
            case ONGLET_STOCK:
                reponse = stock(axe);
                break;
            case ONGLET_QUALITE:
                reponse = qualite(axe);
                break;
            case ONGLET_KPI:
                reponse = kpiAnalyse(axe, choix == null ? null : choix.kpis);
                break;
            case ONGLET_COMPARATEUR:
                reponse = comparateur(axe, choix == null ? null : choix.type, choix == null ? null : choix.objetA,
                        choix == null ? null : choix.objetB, choix == null ? null : choix.grandeur);
                break;
            case ONGLET_ACHATS_VENTES:
                reponse = achatsVentes(choix == null ? DECOUPAGE_TRIMESTRE : choix.decoupage);
                break;
            default:
                reponse = synthese(axe);
                break;
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : onglet " + onglet, e);
            return new JSONObject().put("success", false).put("message", "Les chiffres n'ont pas pu être rassemblés.");
        }
        /*
         * Chaque tuile porte le NOM de la periode a laquelle elle se compare : « -18,9 % » ne dit pas a quoi on se
         * compare, et l'officine voulait voir les deux valeurs des la bande du haut.
         */
        if (axe.reference != null) {
            JSONArray tuiles = reponse.optJSONArray("tuiles");
            for (int i = 0; tuiles != null && i < tuiles.length(); i++) {
                tuiles.getJSONObject(i).put("libelleReference", axe.reference.libelle);
            }
        }
        reponse.put("success", true).put("axe", enteteAxe(axe));
        CACHE.put(cle, new Entree(reponse.toString()));
        return reponse;
    }

    private static JSONObject enteteAxe(Axe axe) {
        JSONObject json = new JSONObject().put("code", axe.code).put("libelle", axe.courante.libelle)
                .put("periode", axe.courante.toString()).put("explication", axe.explication)
                .put("comparaison", axe.reference != null);
        if (axe.reference != null) {
            json.put("libelleReference", axe.reference.libelle).put("periodeReference", axe.reference.toString());
        }
        return json;
    }

    /* ============================================================================== onglet Synthese */

    private JSONObject synthese(Axe axe) {
        Totaux courant = totaux(axe.courante);
        Totaux reference = axe.reference == null ? null : totaux(axe.reference);
        JSONArray tuiles = new JSONArray();
        tuiles.put(tuile("caTTC", "Chiffre d'affaires TTC", courant.caTTC, reference == null ? null : reference.caTTC,
                "FCFA", null));
        tuiles.put(tuile("marge", "Marge", courant.marge, reference == null ? null : reference.marge, "FCFA",
                "taux : " + pourcent(courant.tauxMarge())));
        tuiles.put(tuile("achats", "Achats TTC", courant.achatTTC, reference == null ? null : reference.achatTTC,
                "FCFA", courant.nbBons + " bon(s) de livraison"));
        tuiles.put(tuile("ratioVA", "Ratio ventes / achats", courant.ratioVA(),
                reference == null ? null : reference.ratioVA(), "", "CA TTC rapporté aux achats TTC de la période"));
        tuiles.put(tuile("tiersPayant", "Part tiers payant", courant.partTiersPayant,
                reference == null ? null : reference.partTiersPayant, "FCFA",
                "ce que les clients n'ont pas payé au comptoir"));
        tuiles.put(tuile("nbVentes", "Nombre de ventes", courant.nbVentes,
                reference == null ? null : (double) reference.nbVentes, "",
                "panier moyen : " + Math.round(courant.panierMoyen()) + " FCFA"));
        return new JSONObject().put("tuiles", tuiles).put("mois", moisSynthese(axe));
    }

    /** Une ligne par mois de la fenetre : ventes, achats et marge cote a cote. */
    private JSONArray moisSynthese(Axe axe) {
        return moisAgreges(axe);
    }

    /* ================================================================================ onglet Ventes */

    private JSONObject ventes(Axe axe) {
        Totaux courant = totaux(axe.courante);
        Totaux reference = axe.reference == null ? null : totaux(axe.reference);
        JSONArray tuiles = new JSONArray();
        tuiles.put(tuile("caTTC", "Chiffre d'affaires TTC", courant.caTTC, reference == null ? null : reference.caTTC,
                "FCFA", null));
        tuiles.put(tuile("nbVentes", "Nombre de ventes", courant.nbVentes,
                reference == null ? null : (double) reference.nbVentes, "", null));
        tuiles.put(tuile("panier", "Panier moyen", courant.panierMoyen(),
                reference == null ? null : reference.panierMoyen(), "FCFA", null));
        tuiles.put(tuile("remises", "Remises accordées", courant.remises, reference == null ? null : reference.remises,
                "FCFA", courant.caTTC == 0 ? null : pourcent(courant.remises / courant.caTTC * 100d) + " du CA"));
        tuiles.put(tuile("tiersPayant", "Part tiers payant", courant.partTiersPayant,
                reference == null ? null : reference.partTiersPayant, "FCFA", null));

        /*
         * Le mix de reglement : une colonne par mode REELLEMENT rencontre sur la periode, et non une liste ecrite en
         * dur. Une officine qui active un nouveau mode le voit apparaitre sans qu'on touche au code.
         */
        Map<String, JSONObject> lignes = moisDeLaFenetre(axe.graphique);
        Set<String> modes = new LinkedHashSet<>();
        agregatsDeLaFenetre(axe.graphique).forEach((mois, a) -> poser(ligne(lignes, mois), a));
        /*
         * Le mix de reglement ne tient pas dans des colonnes fixes - les modes dependent de ce que l'officine encaisse
         * - mais il est agrege lui aussi, dans sa propre table : une ligne par mois et par mode. C'etait la derniere
         * lecture de cet onglet qui parcourait toute la fenetre de detail.
         */
        for (Tuple t : agregats.reglements(moisDeLaPeriode(axe.graphique))) {
            String mode = StringUtils.defaultIfBlank(t.get("mode", String.class), "Autre");
            modes.add(mode);
            ligne(lignes, t.get("mois", String.class)).put("mode_" + cle(mode), nombre(t.get("montant")));
        }
        JSONArray colonnes = new JSONArray();
        for (String mode : modes) {
            colonnes.put(new JSONObject().put("cle", "mode_" + cle(mode)).put("libelle", mode));
        }
        poserReference(axe, lignes);
        return new JSONObject().put("tuiles", tuiles).put("mois", finaliser(lignes)).put("modes", colonnes);
    }

    /* ================================================================================= onglet Marge */

    private JSONObject marge(Axe axe) {
        Totaux courant = totaux(axe.courante);
        Totaux reference = axe.reference == null ? null : totaux(axe.reference);
        JSONArray tuiles = new JSONArray();
        tuiles.put(tuile("marge", "Marge", courant.marge, reference == null ? null : reference.marge, "FCFA", null));
        tuiles.put(tuile("tauxMarge", "Taux de marge", courant.tauxMarge(),
                reference == null ? null : reference.tauxMarge(), "%", "marge rapportée au CA hors taxes"));
        tuiles.put(tuile("caHT", "Chiffre d'affaires HT", courant.caHT, reference == null ? null : reference.caHT,
                "FCFA", null));
        tuiles.put(tuile("coutAchat", "Coût d'achat des ventes", courant.coutAchat,
                reference == null ? null : reference.coutAchat, "FCFA",
                "prix d'achat du référentiel × quantités vendues"));
        tuiles.put(tuile("ratioVA", "Ratio ventes / achats", courant.ratioVA(),
                reference == null ? null : reference.ratioVA(), "", null));

        return new JSONObject().put("tuiles", tuiles).put("mois", moisAgreges(axe));
    }

    /* ================================================================================ onglet Achats */

    /**
     * Achats : evolution mensuelle, part de chaque grossiste, et filtres grossiste / famille / emplacement.
     *
     * <p>
     * La base de calcul change avec les filtres (voir {@link PilotageSql}) : en-tete des bons sans filtre de famille ni
     * d'emplacement, lignes retenues sinon. La reponse porte {@code base} et {@code note} pour que l'ecran le DISE -
     * sans quoi l'officine croirait avoir perdu 4 % de ses achats en posant un filtre.
     */
    private JSONObject achats(Axe axe, Filtres filtres) {
        boolean surLignes = filtres.surLignes();
        Totaux courant = totaux(axe.courante);
        Totaux reference = axe.reference == null ? null : totaux(axe.reference);
        /*
         * LES TUILES SUIVENT LE FILTRE, Y COMPRIS LE FILTRE GROSSISTE.
         *
         * Elles lisaient le total de la periode - celui de l'agregat, qui ne connait aucun filtre - des lors qu'aucune
         * famille ni aucun emplacement n'etait choisi. Choisir un grossiste filtrait donc bien le tableau et la
         * repartition, mais la tuile « Achats » juste au-dessus continuait d'afficher le total de TOUS les fournisseurs
         * : deux lectures cote a cote, deux perimetres differents, et rien qui le dise. Defaut anterieur a ce chantier,
         * revele par un controle ajoute le 20/09.
         */
        boolean filtre = filtres.actif();
        double achatsCourant = filtre ? sommeAchats(axe.courante, filtres) : courant.achatTTC;
        Double achatsReference = axe.reference == null ? null
                : (filtre ? sommeAchats(axe.reference, filtres) : reference.achatTTC);
        int bonsCourant = filtre ? nombreDeBons(axe.courante, filtres) : courant.nbBons;
        Integer bonsReference = axe.reference == null ? null
                : (filtre ? nombreDeBons(axe.reference, filtres) : reference.nbBons);

        JSONArray tuiles = new JSONArray();
        tuiles.put(tuile("achats", "Achats", achatsCourant, achatsReference, "FCFA",
                surLignes ? "montant des lignes retenues" : "montant TTC des bons clôturés"));
        tuiles.put(tuile("nbBons", "Bons de livraison", bonsCourant,
                bonsReference == null ? null : (double) bonsReference, "", null));
        tuiles.put(tuile("achatMoyen", "Achat moyen par bon", bonsCourant == 0 ? 0 : achatsCourant / bonsCourant,
                bonsReference == null || bonsReference == 0 ? null : achatsReference / bonsReference, "FCFA", null));
        tuiles.put(tuile("ratioVA", "Ratio ventes / achats", courant.ratioVA(),
                reference == null ? null : reference.ratioVA(), "", "CA TTC rapporté aux achats TTC de la période"));
        tuiles.put(tuile("caTTC", "Chiffre d'affaires TTC", courant.caTTC, reference == null ? null : reference.caTTC,
                "FCFA", null));

        /* Une colonne par grossiste REELLEMENT rencontre sur la fenetre, plus le total du mois. */
        /*
         * UNE COLONNE PAR GROUPE DE FOURNISSEURS, plus une par agence.
         *
         * Le referentiel rattache les fournisseurs a un groupe : les cinq agences LABOREX sont un seul fournisseur pour
         * l'officine, et elles prenaient cinq colonnes. La requete rend desormais la cle du GROUPE quand il y en a un,
         * celle du grossiste sinon - « ceux qui sont sans groupe restent affiches tels quels, on ne les regroupe pas »
         * (20/09). La cle vient de la base et non du libelle : deux agences renommees restent dans le meme groupe.
         */
        Map<String, JSONObject> lignes = moisDeLaFenetre(axe.graphique);
        Map<String, String> libelles = new LinkedHashMap<>();
        Map<String, Double> parts = new LinkedHashMap<>();
        for (Tuple t : listeAchats(axe.graphique, filtres)) {
            String mois = t.get("mois", String.class);
            String grossiste = StringUtils.defaultIfBlank(t.get("grossiste", String.class), "Sans grossiste");
            String cleGroupe = cle(StringUtils.defaultIfBlank(t.get("grossisteId", String.class), grossiste));
            double montant = nombre(t.get("montant"));
            libelles.put(cleGroupe, grossiste);
            parts.merge(cleGroupe, montant, Double::sum);
            JSONObject ligne = ligne(lignes, mois);
            ligne.put("gros_" + cleGroupe, ligne.optDouble("gros_" + cleGroupe, 0d) + montant);
            ligne.put("achatTTC", ligne.optDouble("achatTTC", 0d) + montant);
            ligne.put("nbBons", ligne.optInt("nbBons", 0) + entier(t.get("nbBons")));
        }
        JSONArray colonnes = new JSONArray();
        for (Map.Entry<String, String> e : libelles.entrySet()) {
            colonnes.put(new JSONObject().put("cle", "gros_" + e.getKey()).put("libelle", e.getValue()));
        }
        /*
         * LA PART DE CHAQUE GROSSISTE PORTE SUR LA PERIODE CHOISIE, pas sur la fenetre du graphique.
         *
         * Elle etait calculee sur les treize ou vingt-cinq mois du graphique, pendant que les tuiles juste au-dessus
         * parlaient du mois en cours : deux lectures cote a cote, deux periodes differentes, et rien qui le dise. « La
         * part de chaque grossiste sur la fenetre correspond a quelle periode ? » - la question de l'officine du 19/09
         * etait la bonne, et la reponse etait mauvaise. Le titre du tableau nomme desormais la periode.
         */
        Map<String, Double> partsPeriode = new LinkedHashMap<>();
        Map<String, String> libellesPeriode = new LinkedHashMap<>();
        /* De qui le groupe est fait : regrouper ne doit pas faire PERDRE le nom des agences. */
        Map<String, java.util.Set<String>> membres = new LinkedHashMap<>();
        for (Tuple t : listeAchats(axe.courante, filtres)) {
            String grossiste = StringUtils.defaultIfBlank(t.get("grossiste", String.class), "Sans grossiste");
            String cleGroupe = cle(StringUtils.defaultIfBlank(t.get("grossisteId", String.class), grossiste));
            libellesPeriode.put(cleGroupe, grossiste);
            partsPeriode.merge(cleGroupe, nombre(t.get("montant")), Double::sum);
            String liste = t.get("membres", String.class);
            if (StringUtils.isNotBlank(liste)) {
                membres.computeIfAbsent(cleGroupe, k -> new java.util.LinkedHashSet<>())
                        .addAll(java.util.Arrays.asList(liste.split(",\\s*")));
            }
        }
        double total = partsPeriode.values().stream().mapToDouble(Double::doubleValue).sum();
        JSONArray repartition = new JSONArray();
        partsPeriode.entrySet().stream().sorted((a, b) -> Double.compare(b.getValue(), a.getValue())).forEach(e -> {
            java.util.Set<String> detail = membres.getOrDefault(e.getKey(), java.util.Collections.emptySet());
            repartition.put(new JSONObject().put("grossiste", libellesPeriode.get(e.getKey()))
                    .put("montant", arrondi(e.getValue()))
                    /*
                     * Le detail n'est affiche que s'il APPREND quelque chose : un groupe d'un seul membre n'a pas
                     * besoin de repeter son propre nom.
                     */
                    .put("membres", detail.size() > 1 ? String.join(", ", detail) : "")
                    .put("part", total == 0 ? 0 : arrondi(e.getValue() / total * 100d)));
        });

        poserReference(axe, lignes);
        return new JSONObject().put("tuiles", tuiles).put("mois", finaliser(lignes)).put("grossistesColonnes", colonnes)
                .put("repartition", repartition).put("libelleRepartition", axe.courante.libelle)
                .put("base", surLignes ? "lignes" : "entete").put("note",
                        surLignes
                                ? "Filtre de famille ou d'emplacement actif : le montant est la somme des LIGNES "
                                        + "retenues (prix d'achat × quantité reçue), et non le total TTC des bons."
                                : "Montant TTC des bons de livraison clôturés, comme la tuile Achats de la synthèse.");
    }

    /**
     * Les achats par mois et par grossiste.
     *
     * <p>
     * Sans filtre de famille ni d'emplacement - le cas courant - la lecture se fait dans les agregats. Avec un tel
     * filtre, elle repasse par les LIGNES de bons de livraison : un agregat ne peut pas porter toutes les combinaisons
     * de filtres possibles, et l'ecran dit deja, par sa note, que la base de calcul change alors.
     */
    private List<Tuple> listeAchats(Periode periode, Filtres filtres) {
        if (!filtres.surLignes()) {
            return agregats.grossistes(moisDeLaPeriode(periode), filtres.grossisteId);
        }
        String sql = PilotageSql.achatsLignesParMois(filtres.grossisteId, filtres.familleId, filtres.emplacementId);
        Query q = em.createNativeQuery(sql, Tuple.class);
        bornes(q, sql, periode);
        lierFiltres(q, sql, filtres);
        return q.getResultList();
    }

    private double sommeAchats(Periode periode, Filtres filtres) {
        double total = 0;
        for (Tuple t : listeAchats(periode, filtres)) {
            total += nombre(t.get("montant"));
        }
        return total;
    }

    /** Nombre de bons retenus par les filtres : la tuile doit compter ce que le tableau montre. */
    private int nombreDeBons(Periode periode, Filtres filtres) {
        int total = 0;
        for (Tuple t : listeAchats(periode, filtres)) {
            total += entier(t.get("nbBons"));
        }
        return total;
    }

    /** Grossistes qui ont reellement livre sur la fenetre : le filtre ne propose pas des fournisseurs muets. */
    public JSONObject grossistes(String codeAxe, String debutPerso, String finPerso) {
        Axe axe = PilotagePeriodes.calculer(codeAxe, LocalDate.now(), OrdonnanceClientSaisie.date(debutPerso),
                OrdonnanceClientSaisie.date(finPerso));
        JSONArray data = new JSONArray();
        try {
            String sql = PilotageSql.grossistesDeLaPeriode();
            Query q = em.createNativeQuery(sql, Tuple.class);
            bornes(q, sql, axe.graphique);
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                data.put(new JSONObject().put("id", t.get("id", String.class)).put("libelle",
                        StringUtils.trimToEmpty(t.get("libelle", String.class))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : liste des grossistes", e);
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data);
    }

    /* ==================================================================== onglet Caisse & tiers-payant */

    /**
     * Caisse et tiers payant : ce qui est entre dans la caisse, ce qui reste porte par les organismes.
     *
     * <p>
     * Le CREDIT du mois est le chiffre d'affaires moins l'encaisse : ce qui n'a pas ete paye au comptoir, quelle qu'en
     * soit la raison. Le tiers payant facture et le tiers payant regle sont donnes a cote, parce qu'ils ne decrivent
     * pas la meme chose - l'un est une creance qui nait, l'autre un virement qui arrive, et ils ne tombent pas le meme
     * mois.
     */
    private JSONObject caisse(Axe axe) {
        Totaux courant = totaux(axe.courante);
        Totaux reference = axe.reference == null ? null : totaux(axe.reference);
        double encaisseCourant = courant.encaisse;
        Double encaisseReference = reference == null ? null : reference.encaisse;
        double regleCourant = valeur(axe.courante, PilotageSql.totalTiersPayantRegle(), "regle");
        Double regleReference = axe.reference == null ? null
                : valeur(axe.reference, PilotageSql.totalTiersPayantRegle(), "regle");
        double creditCourant = courant.caTTC - encaisseCourant;

        JSONArray tuiles = new JSONArray();
        tuiles.put(tuile("encaisse", "Encaissé au comptoir", encaisseCourant, encaisseReference, "FCFA",
                courant.caTTC == 0 ? null : pourcent(encaisseCourant / courant.caTTC * 100d) + " du CA"));
        tuiles.put(tuile("credit", "Porté à crédit", creditCourant,
                reference == null || encaisseReference == null ? null : reference.caTTC - encaisseReference, "FCFA",
                courant.caTTC == 0 ? null : pourcent(creditCourant / courant.caTTC * 100d) + " du CA"));
        tuiles.put(tuile("tpFacture", "Tiers payant facturé", courant.partTiersPayant,
                reference == null ? null : reference.partTiersPayant, "FCFA",
                "part non payée au comptoir sur les ventes de la période"));
        tuiles.put(tuile("tpRegle", "Tiers payant réglé", regleCourant, regleReference, "FCFA",
                "versements des organismes reçus sur la période"));
        tuiles.put(tuile("caTTC", "Chiffre d'affaires TTC", courant.caTTC, reference == null ? null : reference.caTTC,
                "FCFA", null));

        Map<String, JSONObject> lignes = moisDeLaFenetre(axe.graphique);
        agregatsDeLaFenetre(axe.graphique).forEach((mois, a) -> poser(ligne(lignes, mois), a));
        /* Le tiers payant regle vient d'une autre chaine que les ventes : il garde sa requete, qui est legere. */
        for (Tuple t : liste(PilotageSql.tiersPayantRegleParMois(), axe.graphique)) {
            ligne(lignes, t.get("mois", String.class)).put("tpRegle", nombre(t.get("regle")));
        }
        /* Le credit et les parts se deduisent des deux precedents : aucune quatrieme requete. */
        poserReference(axe, lignes);
        JSONArray mois = finaliser(lignes);
        for (int i = 0; i < mois.length(); i++) {
            JSONObject m = mois.getJSONObject(i);
            double ca = m.optDouble("caTTC", 0d);
            double encaisse = m.optDouble("encaisse", 0d);
            m.put("credit", arrondi(ca - encaisse));
            m.put("partComptant", ca == 0 ? 0 : arrondi(encaisse / ca * 100d));
            m.put("partCredit", ca == 0 ? 0 : arrondi((ca - encaisse) / ca * 100d));
        }
        return new JSONObject().put("tuiles", tuiles).put("mois", mois);
    }

    /** Une valeur unique lue sur une periode (les requetes de totaux ne rendent qu'une ligne). */
    private double valeur(Periode periode, String sql, String colonne) {
        for (Tuple t : liste(sql, periode)) {
            return nombre(t.get(colonne));
        }
        return 0d;
    }

    /**
     * Ce que l'operateur a choisi dans les onglets KPI et Comparateur.
     *
     * <p>
     * Rassemble dans un seul objet plutot que passe en six parametres : la signature du service resterait lisible
     * aujourd'hui, mais pas au troisieme onglet qui aura ses propres choix.
     */
    public static final class Choix {

        public final List<String> kpis;
        public final String type;
        public final String objetA;
        public final String objetB;
        public final String grandeur;
        /** Decoupage de l'onglet Achats / Ventes : TRIMESTRE (par defaut), SEMESTRE ou ANNEE. */
        public final String decoupage;

        public Choix(List<String> kpis, String type, String objetA, String objetB, String grandeur) {
            this(kpis, type, objetA, objetB, grandeur, null);
        }

        public Choix(List<String> kpis, String type, String objetA, String objetB, String grandeur, String decoupage) {
            this.kpis = kpis;
            this.type = StringUtils.trimToNull(type);
            this.objetA = StringUtils.trimToNull(objetA);
            this.objetB = StringUtils.trimToNull(objetB);
            this.grandeur = StringUtils.trimToNull(grandeur);
            this.decoupage = StringUtils.defaultIfBlank(decoupage, DECOUPAGE_TRIMESTRE);
        }

        String cle() {
            return (kpis == null ? "" : String.join(",", kpis)) + "/" + StringUtils.defaultString(type) + "/"
                    + StringUtils.defaultString(objetA) + "/" + StringUtils.defaultString(objetB) + "/"
                    + StringUtils.defaultString(grandeur) + "/" + StringUtils.defaultString(decoupage);
        }
    }

    /** Filtres de l'onglet Achats. */
    public static final class Filtres {

        public final String grossisteId;
        public final String familleId;
        public final String emplacementId;

        public Filtres(String grossisteId, String familleId, String emplacementId) {
            this.grossisteId = StringUtils.trimToNull(grossisteId);
            this.familleId = StringUtils.trimToNull(familleId);
            this.emplacementId = StringUtils.trimToNull(emplacementId);
        }

        /**
         * Vrai des qu'un filtre de famille ou d'emplacement est pose : l'en-tete du bon ne peut plus servir, il porte
         * le bon entier.
         */
        boolean surLignes() {
            return familleId != null || emplacementId != null;
        }

        /** Vrai des qu'un filtre QUELCONQUE est pose, grossiste compris. */
        boolean actif() {
            return grossisteId != null || surLignes();
        }

        String cle() {
            return StringUtils.defaultString(grossisteId) + "/" + StringUtils.defaultString(familleId) + "/"
                    + StringUtils.defaultString(emplacementId);
        }
    }

    /* ================================================================================= onglet Stock */

    /**
     * Stock : ce qu'il vaut aujourd'hui, et son evolution.
     *
     * <p>
     * L'evolution vient de la PHOTO du mois quand elle existe, et de la RECONSTITUTION a rebours sinon. La reponse
     * porte {@code sourceEvolution} et {@code note} pour que l'ecran le dise : une valeur reconstituee et une valeur
     * mesuree ne se lisent pas de la meme facon, et cacher la difference serait malhonnete.
     */
    private JSONObject stock(Axe axe) {
        Etat etat = etatDuStock();
        JSONArray tuiles = new JSONArray();
        tuiles.put(tuile("valeurAchat", "Valeur du stock (achat)", etat.valeurAchat, null, "FCFA",
                etat.lignes + " références, " + Math.round(etat.unites) + " unités"));
        tuiles.put(tuile("valeurVente", "Valeur du stock (vente)", etat.valeurVente, null, "FCFA",
                etat.valeurAchat == 0 ? null : "coefficient "
                        + String.format(java.util.Locale.FRANCE, "%.2f", etat.valeurVente / etat.valeurAchat)));
        tuiles.put(tuile("ruptures", "Références en rupture", etat.ruptures, null, "",
                etat.lignes == 0 ? null : pourcent(etat.ruptures / (double) etat.lignes * 100d) + " du stock"));
        tuiles.put(tuile("sousSeuil", "Sous le seuil de réappro", etat.sousSeuil, null, "",
                etat.sansSeuil + " article(s) sans seuil paramétré"));
        tuiles.put(tuile("negatifs", "Stock négatif (anomalie)", etat.negatifs, null, "",
                "à corriger côté saisie : un stock négatif n'existe pas"));
        Dormant dormant = stockDormant(LocalDate.now().minusMonths(12));
        tuiles.put(tuile("dormant", "Stock dormant (12 mois)", dormant.valeurAchat, null, "FCFA",
                dormant.lignes + " référence(s) en stock sans une seule vente"));
        /*
         * LES PEREMPTIONS PROCHES, JUSTE APRES LE STOCK DORMANT. Les deux disent la meme chose sous deux angles :
         * l'argent qui ne tourne pas, et celui qui va se perdre. Cette tuile-ci s'ALERTE - fond rouge et clignotement -
         * des qu'un produit est concerne : c'est la seule de l'ecran qui appelle un geste dans le mois, et un chiffre
         * gris parmi douze autres ne l'aurait pas appele.
         */
        Peremptions peremptions = peremptionsProches();
        tuiles.put(alerter(
                tuile("peremption", "Péremptions < 6 mois", peremptions.produits, null, "", peremptions.lots
                        + " lot(s) concerné(s), " + montant(peremptions.valeurAchat) + " au prix d'achat"),
                peremptions.produits > 0));

        Map<String, JSONObject> lignes = moisDeLaFenetre(axe.graphique);
        agregatsDeLaFenetre(axe.graphique).forEach((mois, a) -> poser(ligne(lignes, mois), a));
        poserReference(axe, lignes);
        JSONArray mois = finaliser(lignes);

        /*
         * LA VALEUR DU STOCK EST MESUREE, PLUS RECONSTITUEE - du moins tant que le releve du logiciel remonte assez
         * loin. Le logiciel releve la valeur du stock chaque nuit ; l'onglet garde, pour chaque mois, la derniere
         * journee relevee. Les mois anterieurs a ce releve restent reconstitues a rebours, et l'ecran le dit.
         */
        Map<String, JSONObject> photos = valorisationsMensuelles(axe.graphique);

        /*
         * RECONSTITUTION A REBOURS. On part de la valeur d'aujourd'hui et on remonte le temps : la valeur a la fin du
         * mois precedent est celle d'aujourd'hui, moins les entrees du mois, plus les sorties du mois. On parcourt donc
         * les mois du plus recent au plus ancien.
         */
        double valeur = etat.valeurAchat;
        boolean reconstitue = false;
        for (int i = mois.length() - 1; i >= 0; i--) {
            JSONObject m = mois.getJSONObject(i);
            JSONObject photo = photos.get(m.getString("mois"));
            if (photo != null) {
                m.put("valeurAchat", photo.optDouble("valeurAchat", 0d))
                        .put("valeurVente", photo.optDouble("valeurVente", 0d))
                        .put("unites", photo.optDouble("unites", 0d)).put("mesure", true);
                valeur = photo.optDouble("valeurAchat", 0d);
            } else {
                m.put("valeurAchat", arrondi(valeur)).put("mesure", false);
                reconstitue = true;
            }
            m.put("variationStock", arrondi(m.optDouble("entrees", 0d) - m.optDouble("sorties", 0d)));
            valeur = valeur - m.optDouble("entrees", 0d) + m.optDouble("sorties", 0d);
        }

        /*
         * La valeur du stock n'est pas un agregat : elle est reconstituee ci-dessus. Sa courbe de reference se prend
         * donc dans la serie elle-meme, decalee du nombre de mois qui separe les deux periodes comparees.
         */
        int decalage = decalageReference(axe);
        if (decalage > 0) {
            for (int i = mois.length() - 1; i >= 0; i--) {
                if (i - decalage >= 0) {
                    mois.getJSONObject(i).put("valeurAchatRef",
                            mois.getJSONObject(i - decalage).optDouble("valeurAchat", 0d));
                }
            }
        }

        return new JSONObject().put("tuiles", tuiles).put("mois", mois)
                .put("sourceEvolution", reconstitue ? (photos.isEmpty() ? "reconstitution" : "mixte") : "photos")
                .put("photos", photos.size()).put("note",
                        reconstitue
                                ? "Valeur du stock MESURÉE pour les mois relevés par la valorisation quotidienne du "
                                        + "logiciel (relevé automatique chaque nuit), et RECONSTITUÉE à rebours pour "
                                        + "les mois antérieurs à ce relevé — avec les entrées (bons de livraison) et "
                                        + "les sorties (ventes) de chaque mois, les régularisations d'inventaire "
                                        + "n'y figurant pas. Plus aucune manipulation n'est nécessaire : l'historique "
                                        + "se complète tout seul, mois après mois."
                                : "Valeur du stock MESURÉE : chaque mois affiché vient du relevé automatique de fin "
                                        + "de mois (valorisation quotidienne du logiciel, écrite chaque nuit).");
    }

    /** Etat du stock de l'officine, aujourd'hui. */
    Etat etatDuStock() {
        Etat etat = new Etat();
        try {
            Query q = em.createNativeQuery(PilotageSql.etatStock(), Tuple.class);
            q.setParameter("emplacement", PilotageSql.EMPLACEMENT_OFFICINE);
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                etat.lignes = entier(t.get("lignes"));
                etat.unites = nombre(t.get("unites"));
                etat.valeurAchat = nombre(t.get("valeurAchat"));
                etat.valeurVente = nombre(t.get("valeurVente"));
                etat.ruptures = entier(t.get("ruptures"));
                etat.negatifs = entier(t.get("negatifs"));
                etat.sousSeuil = entier(t.get("sousSeuil"));
                etat.sansSeuil = entier(t.get("sansSeuil"));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : etat du stock", e);
        }
        return etat;
    }

    /** Etat du stock a un instant : ce que le logiciel sait aujourd'hui, et ce qu'une photo enregistre. */
    static final class Etat {
        int lignes;
        double unites;
        double valeurAchat;
        double valeurVente;
        int ruptures;
        int negatifs;
        int sousSeuil;
        int sansSeuil;
    }

    static final class Dormant {
        int lignes;
        double valeurAchat;
    }

    static final class Peremptions {
        int produits;
        int lots;
        double valeurAchat;
    }

    /** Produits dont un lot en stock perime dans les six mois : la lecture de la cloche, en un nombre. */
    private Peremptions peremptionsProches() {
        Peremptions p = new Peremptions();
        try {
            Query q = em.createNativeQuery(PilotageSql.peremptionsProches(), Tuple.class);
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                p.produits = entier(t.get("produits"));
                p.lots = entier(t.get("lots"));
                p.valeurAchat = nombre(t.get("valeurAchat"));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : peremptions proches", e);
        }
        return p;
    }

    private Dormant stockDormant(LocalDate depuis) {
        Dormant dormant = new Dormant();
        try {
            Query q = em.createNativeQuery(PilotageSql.stockDormant(), Tuple.class);
            q.setParameter("emplacement", PilotageSql.EMPLACEMENT_OFFICINE);
            q.setParameter("depuis", java.sql.Timestamp.valueOf(depuis.atStartOfDay()));
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                dormant.lignes = entier(t.get("lignes"));
                dormant.valeurAchat = nombre(t.get("valeurAchat"));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : stock dormant", e);
        }
        return dormant;
    }

    /**
     * La valeur du stock a la fin de chaque mois, lue dans la VALORISATION QUOTIDIENNE du logiciel.
     *
     * <p>
     * {@code stock_daily_value} est ecrite chaque nuit a 00h05 par le travail planifie du stock, avec rattrapage au
     * demarrage du serveur : l'historique existe donc sans que personne n'ait a ouvrir un ecran. On garde, pour chaque
     * mois, la derniere journee relevee.
     */
    @SuppressWarnings("unchecked")
    private Map<String, JSONObject> valorisationsMensuelles(Periode fenetre) {
        Map<String, JSONObject> out = new LinkedHashMap<>();
        String sql = PilotageSql.valeurStockParMois();
        try {
            Query q = em.createNativeQuery(sql, Tuple.class);
            q.setParameter("jourDebut", Integer.parseInt(fenetre.debut.toString().replace("-", "")));
            q.setParameter("jourFin", Integer.parseInt(fenetre.fin.toString().replace("-", "")));
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                out.put(t.get("mois", String.class), new JSONObject().put("valeurAchat", nombre(t.get("valeurAchat")))
                        .put("valeurVente", nombre(t.get("valeurVente"))).put("jour", String.valueOf(t.get("jour"))));
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "pilotage : valorisation quotidienne indisponible", e);
        }
        return out;
    }

    /* ================================================================ onglet Qualite-Exploitation */

    /**
     * Qualite d'exploitation : ce qui salit les chiffres, et qu'on peut corriger.
     *
     * <p>
     * Chaque indicateur est un CHANTIER, pas une statistique : un article en stock sans prix d'achat fausse toute
     * valorisation, un stock negatif n'existe pas, un article sans rayon echappe aux inventaires tournants, un article
     * sans seuil n'entre dans aucune suggestion de reappro.
     */
    private JSONObject qualite(Axe axe) {
        Etat etat = etatDuStock();
        Anomalies anomalies = anomalies();
        Totaux courant = totaux(axe.courante);
        Totaux reference = axe.reference == null ? null : totaux(axe.reference);
        double annuleesCourant = courant.nbAnnulees;
        double montantAnnuleCourant = courant.montantAnnule;
        Double annuleesReference = reference == null ? null : reference.nbAnnulees;

        JSONArray tuiles = new JSONArray();
        tuiles.put(tuile("negatifs", "Stock négatif", etat.negatifs, null, "", "lignes à corriger côté saisie"));
        tuiles.put(tuile("sansPrix", "En stock sans prix", anomalies.sansPrixAchat + anomalies.sansPrixVente, null, "",
                "fausse toute valorisation"));
        tuiles.put(tuile("sansRayon", "En stock sans rayon", anomalies.sansRayon, null, "",
                "échappe aux inventaires tournants"));
        tuiles.put(tuile("sansSeuil", "En stock sans seuil", anomalies.sansSeuil, null, "",
                "n'entre dans aucune suggestion de réappro"));
        tuiles.put(tuile("annulees", "Ventes annulées", annuleesCourant, annuleesReference, "",
                Math.round(montantAnnuleCourant) + " FCFA annulés, dont " + Math.round(courant.annuleEspece)
                        + " FCFA rendus en espèces"));
        tuiles.put(tuile("remises", "Remises accordées", courant.remises, reference == null ? null : reference.remises,
                "FCFA", courant.caTTC == 0 ? null : pourcent(courant.remises / courant.caTTC * 100d) + " du CA"));

        JSONArray mois = moisAgreges(axe);

        return new JSONObject().put("tuiles", tuiles).put("mois", mois).put("note",
                "Les indicateurs de référentiel (prix, rayon, seuil) décrivent l'ÉTAT DU JOUR et ne dépendent "
                        + "pas de la période ; les annulations et les remises, elles, suivent la période "
                        + "choisie. Une annulation compte dans le mois de SON ANNULATION et non dans celui de la "
                        + "vente, et seules les ventes clôturées sont comptées : ce sont les règles de l'état "
                        + "« Liste des ventes annulées », pour que les deux se rapprochent. Le montant annulé est "
                        + "celui des ventes (part tiers payant comprise) ; le montant rendu en espèces, donné à "
                        + "côté, est ce qui est réellement ressorti du tiroir.");
    }

    static final class Anomalies {
        int sansPrixAchat;
        int sansPrixVente;
        int sansRayon;
        int sansSeuil;
        int enStock;
    }

    private Anomalies anomalies() {
        Anomalies a = new Anomalies();
        try {
            Query q = em.createNativeQuery(PilotageSql.anomaliesReferentiel(), Tuple.class);
            q.setParameter("emplacement", PilotageSql.EMPLACEMENT_OFFICINE);
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                a.sansPrixAchat = entier(t.get("sansPrixAchat"));
                a.sansPrixVente = entier(t.get("sansPrixVente"));
                a.sansRayon = entier(t.get("sansRayon"));
                a.sansSeuil = entier(t.get("sansSeuil"));
                a.enStock = entier(t.get("enStock"));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : anomalies de referentiel", e);
        }
        return a;
    }

    /* ============================================================================ onglet KPI Analyse */

    /**
     * Catalogue des KPI cochables.
     *
     * <p>
     * La liste vient du SERVEUR : l'ecran ne connait pas les indicateurs, il affiche ceux qu'on lui donne. Un
     * indicateur ajoute ici apparait dans l'ecran sans qu'on touche au JavaScript, et surtout il ne peut pas exister
     * dans la liste sans exister dans le calcul.
     */
    public JSONObject catalogueKpi() {
        JSONArray data = new JSONArray();
        data.put(kpi("caTTC", "Chiffre d'affaires TTC", "FCFA", "Activité", true));
        data.put(kpi("caHT", "Chiffre d'affaires HT", "FCFA", "Activité", true));
        data.put(kpi("nbVentes", "Nombre de clients servis", "", "Activité", true));
        data.put(kpi("panier", "Panier moyen", "FCFA", "Activité", false));
        data.put(kpi("marge", "Marge", "FCFA", "Rentabilité", true));
        data.put(kpi("tauxMarge", "Taux de marge", "%", "Rentabilité", false));
        data.put(kpi("remises", "Remises accordées", "FCFA", "Rentabilité", true));
        data.put(kpi("tauxRemise", "Taux de remise", "%", "Rentabilité", false));
        data.put(kpi("partTiersPayant", "Part tiers payant", "FCFA", "Encaissement", true));
        data.put(kpi("encaisse", "Encaissé au comptoir", "FCFA", "Encaissement", true));
        data.put(kpi("credit", "Porté à crédit", "FCFA", "Encaissement", true));
        data.put(kpi("achatTTC", "Achats TTC", "FCFA", "Achats", true));
        data.put(kpi("nbBons", "Bons de livraison", "", "Achats", true));
        data.put(kpi("ratioVA", "Ratio ventes / achats", "", "Achats", false));
        data.put(kpi("frequentation", "Fréquentation horaire", "", "Activité", true));
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data);
    }

    /**
     * Un indicateur du catalogue.
     *
     * <p>
     * {@code cumul} dit si le pied du tableau doit ADDITIONNER les mois ou en faire la MOYENNE. La ligne de total du
     * detail des KPI etait vide (20/09) ; la remplir ne suffisait pas, encore fallait-il ne pas ecrire de betise :
     * additionner douze paniers moyens, douze taux de marge ou douze ratios donnerait un nombre qui ne veut rien dire.
     * Ces indicateurs-la se moyennent, les autres s'additionnent.
     */
    private static JSONObject kpi(String cle, String libelle, String unite, String famille, boolean cumul) {
        return new JSONObject().put("cle", cle).put("libelle", libelle).put("unite", unite).put("famille", famille)
                .put("cumul", cumul)
                /* La frequentation horaire ne se lit pas par mois : l'ecran la presente a part. */
                .put("mensuel", !"frequentation".equals(cle));
    }

    /**
     * Analyse des KPI coches.
     *
     * <p>
     * « Si je coche panier moyen et nombre de clients, l'analyse sera sur les 2 selon la periode et la courbe
     * d'evolution. » Les KPI coches donnent donc : une tuile chacun avec sa variation sur l'axe choisi, une ligne par
     * mois avec une colonne chacun, et la courbe.
     *
     * <p>
     * Tous les indicateurs sont calcules, coches ou non - ils viennent des memes quatre requetes que les autres
     * onglets, et en calculer trois de moins ne ferait rien gagner. Ce sont les TUILES et les COLONNES qui suivent la
     * coche.
     */
    private JSONObject kpiAnalyse(Axe axe, List<String> coches) {
        List<String> retenus = coches == null || coches.isEmpty()
                ? java.util.Arrays.asList("caTTC", "nbVentes", "panier") : coches;
        Totaux courant = totaux(axe.courante);
        Totaux reference = axe.reference == null ? null : totaux(axe.reference);
        double encaisseCourant = courant.encaisse;
        Double encaisseReference = reference == null ? null : reference.encaisse;

        JSONArray tuiles = new JSONArray();
        for (String cle : retenus) {
            if ("frequentation".equals(cle)) {
                continue;
            }
            tuiles.put(tuile(cle, libelleKpi(cle), valeurKpi(cle, courant, encaisseCourant),
                    reference == null ? null
                            : valeurKpi(cle, reference, encaisseReference == null ? 0 : encaisseReference),
                    uniteKpi(cle), null));
        }

        /*
         * Toutes les grandeurs de cet onglet sont portees par les agregats mensuels : une seule lecture d'agregats
         * remplace les quatre requetes de detail qui parcouraient la fenetre entiere.
         */
        JSONArray mois = moisAgreges(axe);

        JSONObject reponse = new JSONObject().put("tuiles", tuiles).put("mois", mois).put("coches",
                new JSONArray(retenus));
        /* La frequentation horaire, seulement si elle est cochee : c'est une requete de plus. */
        if (retenus.contains("frequentation")) {
            reponse.put("horaire", frequentation(axe.courante));
        }
        return reponse;
    }

    private JSONArray frequentation(Periode periode) {
        JSONArray data = new JSONArray();
        for (Tuple t : liste(PilotageSql.frequentationHoraire(), periode)) {
            int heure = entier(t.get("heure"));
            data.put(new JSONObject().put("heure", heure).put("libelle", String.format("%02dh", heure))
                    .put("nbVentes", entier(t.get("nbVentes"))).put("caTTC", nombre(t.get("caTTC"))));
        }
        return data;
    }

    private static double valeurKpi(String cle, Totaux t, double encaisse) {
        switch (cle) {
        case "caTTC":
            return t.caTTC;
        case "caHT":
            return t.caHT;
        case "nbVentes":
            return t.nbVentes;
        case "panier":
            return t.panierMoyen();
        case "marge":
            return t.marge;
        case "tauxMarge":
            return t.tauxMarge();
        case "remises":
            return t.remises;
        case "tauxRemise":
            return t.caTTC == 0 ? 0 : t.remises / t.caTTC * 100d;
        case "partTiersPayant":
            return t.partTiersPayant;
        case "encaisse":
            return encaisse;
        case "credit":
            return t.caTTC - encaisse;
        case "achatTTC":
            return t.achatTTC;
        case "nbBons":
            return t.nbBons;
        case "ratioVA":
            return t.ratioVA();
        default:
            return 0d;
        }
    }

    private String libelleKpi(String cle) {
        JSONArray catalogue = catalogueKpi().getJSONArray("data");
        for (int i = 0; i < catalogue.length(); i++) {
            if (cle.equals(catalogue.getJSONObject(i).optString("cle"))) {
                return catalogue.getJSONObject(i).optString("libelle");
            }
        }
        return cle;
    }

    private String uniteKpi(String cle) {
        JSONArray catalogue = catalogueKpi().getJSONArray("data");
        for (int i = 0; i < catalogue.length(); i++) {
            if (cle.equals(catalogue.getJSONObject(i).optString("cle"))) {
                return catalogue.getJSONObject(i).optString("unite");
            }
        }
        return "";
    }

    /* ============================================================================ onglet Comparateur */

    /** Types d'objets comparables. */
    public static final String COMPARER_GRANDEURS = "GRANDEUR";
    public static final String COMPARER_FAMILLES = "FAMILLE";
    public static final String COMPARER_RAYONS = "RAYON";
    public static final String COMPARER_GROSSISTES = "GROSSISTE";

    /**
     * Comparateur : deux objets, la meme grandeur, la meme periode.
     *
     * <p>
     * Deux usages demandes le 18/09, et les deux sont servis ici :
     *
     * <ul>
     * <li>comparer deux OBJETS de meme nature - deux familles, deux rayons, deux grossistes - sur une meme grandeur
     * ;</li>
     * <li>comparer deux GRANDEURS entre elles, « par exemple les achats aux ventes sur une periode ».</li>
     * </ul>
     *
     * <p>
     * Dans les deux cas, les deux series passent par la MEME requete parametree : comparer deux chiffres obtenus par
     * deux requetes differentes est le meilleur moyen de conclure a un ecart qui n'existe pas.
     */
    private JSONObject comparateur(Axe axe, String type, String a, String b, String grandeur) {
        String genre = StringUtils.defaultIfBlank(type, COMPARER_GRANDEURS);
        String mesure = StringUtils.defaultIfBlank(grandeur, "caTTC");
        Serie serieA;
        Serie serieB;
        if (COMPARER_GRANDEURS.equals(genre)) {
            /* Deux grandeurs de l'officine entiere : « les achats aux ventes ». */
            serieA = serieGrandeur(axe, StringUtils.defaultIfBlank(a, "caTTC"));
            serieB = serieGrandeur(axe, StringUtils.defaultIfBlank(b, "achatTTC"));
        } else if (COMPARER_GROSSISTES.equals(genre)) {
            /*
             * Un grossiste ne vend rien : la seule grandeur qui a un sens pour lui est ce qu'on lui achete. On force
             * donc la mesure plutot que de rendre un tableau de zeros sans explication.
             */
            serieA = serieAchats(axe, a);
            serieB = serieAchats(axe, b);
            mesure = "achatTTC";
        } else {
            boolean rayon = COMPARER_RAYONS.equals(genre);
            serieA = serieVentes(axe, rayon ? null : a, rayon ? a : null, mesure);
            serieB = serieVentes(axe, rayon ? null : b, rayon ? b : null, mesure);
        }

        JSONArray tuiles = new JSONArray();
        tuiles.put(tuile("a", serieA.libelle, serieA.total, null, uniteKpi(mesure), null));
        tuiles.put(tuile("b", serieB.libelle, serieB.total, null, uniteKpi(mesure), null));
        Double variation = PilotagePeriodes.variation(serieA.total, serieB.total);
        JSONObject ecart = new JSONObject().put("cle", "ecart").put("libelle", "Écart A - B")
                .put("valeur", arrondi(serieA.total - serieB.total)).put("unite", uniteKpi(mesure));
        if (variation != null) {
            ecart.put("sousTitre",
                    "A vaut " + String.format(java.util.Locale.FRANCE, "%+.1f", variation) + " % de plus que B");
        }
        tuiles.put(ecart);

        /* Une ligne par mois : A, B, leur ecart et leur rapport. */
        Map<String, JSONObject> lignes = moisDeLaFenetre(axe.graphique);
        serieA.parMois.forEach((mois, valeur) -> ligne(lignes, mois).put("a", arrondi(valeur)));
        serieB.parMois.forEach((mois, valeur) -> ligne(lignes, mois).put("b", arrondi(valeur)));
        JSONArray mois = finaliser(lignes);
        for (int i = 0; i < mois.length(); i++) {
            JSONObject m = mois.getJSONObject(i);
            double va = m.optDouble("a", 0d);
            double vb = m.optDouble("b", 0d);
            m.put("a", arrondi(va)).put("b", arrondi(vb)).put("ecart", arrondi(va - vb)).put("rapport",
                    vb == 0 ? 0 : arrondi(va / vb));
        }
        return new JSONObject().put("tuiles", tuiles).put("mois", mois)
                .put("comparaison",
                        new JSONObject().put("type", genre).put("grandeur", mesure).put("libelleA", serieA.libelle)
                                .put("libelleB", serieB.libelle).put("libelleGrandeur", libelleKpi(mesure)))
                .put("note",
                        COMPARER_GROSSISTES.equals(genre)
                                ? "Deux grossistes se comparent sur ce qu'on leur achète : un grossiste ne vend rien."
                                : "Les deux séries sont calculées par la même requête, sur la même période.");
    }

    /** Une serie comparee : son libelle, son total sur la periode, et sa valeur par mois. */
    private static final class Serie {
        final String libelle;
        double total;
        final Map<String, Double> parMois = new LinkedHashMap<>();

        Serie(String libelle) {
            this.libelle = libelle;
        }
    }

    /** Serie d'une grandeur de l'officine entiere. */
    private Serie serieGrandeur(Axe axe, String grandeur) {
        Serie serie = new Serie(libelleKpi(grandeur));
        Totaux total = totaux(axe.courante);
        serie.total = valeurKpi(grandeur, total, total.encaisse);
        JSONArray mois = moisAgreges(axe.graphique);
        for (int i = 0; i < mois.length(); i++) {
            JSONObject m = mois.getJSONObject(i);
            serie.parMois.put(m.getString("mois"), m.optDouble(grandeur, 0d));
        }
        return serie;
    }

    /** Serie de ventes restreinte a une famille ou a un rayon. */
    private Serie serieVentes(Axe axe, String familleId, String rayonId, String grandeur) {
        Serie serie = new Serie(libelleObjet(familleId, rayonId));
        String sql = PilotageSql.ventesLignesParMois(familleId, rayonId);
        for (Tuple t : lignesFiltrees(sql, axe.graphique, new Filtres(null, familleId, rayonId))) {
            double valeur = "unites".equals(grandeur) ? nombre(t.get("unites"))
                    : "marge".equals(grandeur) ? nombre(t.get("marge")) : nombre(t.get("caTTC"));
            serie.parMois.put(t.get("mois", String.class), valeur);
        }
        for (Tuple t : lignesFiltrees(sql, axe.courante, new Filtres(null, familleId, rayonId))) {
            serie.total += "unites".equals(grandeur) ? nombre(t.get("unites"))
                    : "marge".equals(grandeur) ? nombre(t.get("marge")) : nombre(t.get("caTTC"));
        }
        return serie;
    }

    /** Serie d'achats restreinte a un grossiste. */
    private Serie serieAchats(Axe axe, String grossisteId) {
        Serie serie = new Serie(libelleGrossiste(grossisteId));
        Filtres filtres = new Filtres(grossisteId, null, null);
        for (Tuple t : listeAchats(axe.graphique, filtres)) {
            serie.parMois.merge(t.get("mois", String.class), nombre(t.get("montant")), Double::sum);
        }
        serie.total = sommeAchats(axe.courante, filtres);
        return serie;
    }

    @SuppressWarnings("unchecked")
    private List<Tuple> lignesFiltrees(String sql, Periode periode, Filtres filtres) {
        Query q = em.createNativeQuery(sql, Tuple.class);
        bornes(q, sql, periode);
        lierFiltres(q, sql, filtres);
        return q.getResultList();
    }

    private String libelleObjet(String familleId, String rayonId) {
        if (StringUtils.isNotBlank(familleId)) {
            return libelleSimple("SELECT str_LIBELLE FROM t_famillearticle WHERE lg_FAMILLEARTICLE_ID = ?1", familleId,
                    "Famille");
        }
        if (StringUtils.isNotBlank(rayonId)) {
            return libelleSimple("SELECT str_LIBELLEE FROM t_zone_geographique WHERE lg_ZONE_GEO_ID = ?1", rayonId,
                    "Rayon");
        }
        return "Toute l'officine";
    }

    private String libelleGrossiste(String grossisteId) {
        return libelleSimple("SELECT str_LIBELLE FROM t_grossiste WHERE lg_GROSSISTE_ID = ?1", grossisteId,
                "Grossiste");
    }

    private String libelleSimple(String sql, String id, String defaut) {
        if (StringUtils.isBlank(id)) {
            return defaut + " (non choisi)";
        }
        try {
            Object libelle = em.createNativeQuery(sql).setParameter(1, id).getSingleResult();
            return libelle == null ? defaut : String.valueOf(libelle);
        } catch (Exception e) {
            LOG.log(Level.FINE, "libelle introuvable", e);
            return defaut;
        }
    }

    /*
     * EDITIONS
     *
     * Un seul modele, aux colonnes parametrables (voir pilotage_mensuel.jrxml) : les en-tetes arrivent en parametres et
     * une colonne sans en-tete ne s'imprime pas. C'est ce qui permet d'imprimer l'onglet Ventes avec ses modes de
     * reglement - qui dependent de ce que l'officine encaisse reellement - sans ecrire un modele par combinaison de
     * modes.
     */

    /** Modele embarque : aucun fichier a poser sur les sites. */
    public static final String MODELE = "pilotage_mensuel";

    /** Colonnes imprimees et exportees pour un onglet, dans l'ordre de l'ecran. */
    static List<String[]> colonnes(String onglet, JSONObject donnees) {
        List<String[]> colonnes = new ArrayList<>();
        JSONArray modes = donnees == null ? null : donnees.optJSONArray("modes");
        JSONArray grossistes = donnees == null ? null : donnees.optJSONArray("grossistesColonnes");
        switch (StringUtils.defaultString(onglet)) {
        case ONGLET_ACHATS:
            colonnes.add(new String[] { "achatTTC", "ACHATS" });
            colonnes.add(new String[] { "nbBons", "BONS" });
            for (int i = 0; grossistes != null && i < grossistes.length(); i++) {
                JSONObject g = grossistes.getJSONObject(i);
                colonnes.add(new String[] { g.getString("cle"), g.getString("libelle").toUpperCase() });
            }
            break;
        case ONGLET_KPI: {
            /* Les colonnes imprimees sont EXACTEMENT les KPI coches : l'edition suit l'ecran. */
            JSONArray coches = donnees == null ? null : donnees.optJSONArray("coches");
            for (int i = 0; coches != null && i < coches.length(); i++) {
                String cle = coches.getString(i);
                if (!"frequentation".equals(cle)) {
                    colonnes.add(new String[] { cle, cle.toUpperCase() });
                }
            }
            break;
        }
        case ONGLET_COMPARATEUR: {
            JSONObject comparaison = donnees == null ? null : donnees.optJSONObject("comparaison");
            String a = comparaison == null ? "A" : comparaison.optString("libelleA", "A");
            String bb = comparaison == null ? "B" : comparaison.optString("libelleB", "B");
            colonnes.add(new String[] { "a", a.toUpperCase() });
            colonnes.add(new String[] { "b", bb.toUpperCase() });
            colonnes.add(new String[] { "ecart", "ÉCART" });
            colonnes.add(new String[] { "rapport", "RAPPORT" });
            break;
        }
        case ONGLET_STOCK:
            colonnes.add(new String[] { "valeurAchat", "VALEUR STOCK" });
            colonnes.add(new String[] { "entrees", "ENTRÉES" });
            colonnes.add(new String[] { "sorties", "SORTIES" });
            colonnes.add(new String[] { "variationStock", "VARIATION" });
            break;
        case ONGLET_QUALITE:
            colonnes.add(new String[] { "caTTC", "CA TTC" });
            colonnes.add(new String[] { "nbVentes", "VENTES" });
            colonnes.add(new String[] { "nbAnnulees", "ANNULÉES" });
            colonnes.add(new String[] { "tauxAnnulation", "% ANNUL." });
            colonnes.add(new String[] { "remises", "REMISES" });
            colonnes.add(new String[] { "tauxRemise", "% REMISE" });
            break;
        case ONGLET_CAISSE:
            colonnes.add(new String[] { "caTTC", "CA TTC" });
            colonnes.add(new String[] { "encaisse", "ENCAISSÉ" });
            colonnes.add(new String[] { "credit", "CRÉDIT" });
            colonnes.add(new String[] { "partComptant", "% COMPTANT" });
            colonnes.add(new String[] { "partTiersPayant", "TP FACTURÉ" });
            colonnes.add(new String[] { "tpRegle", "TP RÉGLÉ" });
            break;
        case ONGLET_MARGE:
            colonnes.add(new String[] { "caHT", "CA HT" });
            colonnes.add(new String[] { "coutAchat", "COÛT D'ACHAT" });
            colonnes.add(new String[] { "marge", "MARGE" });
            colonnes.add(new String[] { "tauxMarge", "TAUX %" });
            colonnes.add(new String[] { "caTTC", "CA TTC" });
            colonnes.add(new String[] { "achatTTC", "ACHATS TTC" });
            break;
        case ONGLET_ACHATS_VENTES: {
            /*
             * L'ORDRE DES COLONNES EST CHOISI POUR LA PAGE A4, qui n'en porte que sept : les trois annees de ventes,
             * puis les trois d'achats, puis le ratio de l'annee en cours. Le tableur, lui, n'a pas cette limite et
             * recoit en plus les ratios des annees precedentes.
             */
            JSONArray annees = donnees == null ? null : donnees.optJSONArray("annees");
            int nbAnnees = annees == null ? 0 : annees.length();
            for (int i = 0; i < nbAnnees; i++) {
                colonnes.add(new String[] { "an" + annees.getInt(i) + "_ca", "VENTES " + annees.getInt(i) });
            }
            for (int i = 0; i < nbAnnees; i++) {
                colonnes.add(new String[] { "an" + annees.getInt(i) + "_achat", "ACHATS " + annees.getInt(i) });
            }
            for (int i = nbAnnees - 1; i >= 0; i--) {
                colonnes.add(new String[] { "an" + annees.getInt(i) + "_ratio", "RATIO " + annees.getInt(i) });
            }
            break;
        }
        case ONGLET_VENTES:
            colonnes.add(new String[] { "caTTC", "CA TTC" });
            colonnes.add(new String[] { "nbVentes", "VENTES" });
            colonnes.add(new String[] { "panier", "PANIER MOYEN" });
            colonnes.add(new String[] { "remises", "REMISES" });
            for (int i = 0; modes != null && i < modes.length(); i++) {
                JSONObject mode = modes.getJSONObject(i);
                colonnes.add(new String[] { mode.getString("cle"), mode.getString("libelle").toUpperCase() });
            }
            break;
        default:
            colonnes.add(new String[] { "caTTC", "CA TTC" });
            colonnes.add(new String[] { "marge", "MARGE" });
            colonnes.add(new String[] { "tauxMarge", "TAUX %" });
            colonnes.add(new String[] { "achatTTC", "ACHATS TTC" });
            colonnes.add(new String[] { "nbVentes", "VENTES" });
            colonnes.add(new String[] { "panier", "PANIER MOYEN" });
            colonnes.add(new String[] { "partTiersPayant", "PART TIERS PAYANT" });
            break;
        }
        return colonnes;
    }

    /** Titre lisible d'un onglet, tel qu'il s'imprime en tete. */
    static String titreOnglet(String onglet) {
        switch (StringUtils.defaultString(onglet)) {
        case ONGLET_MARGE:
            return "PILOTAGE - MARGE";
        case ONGLET_VENTES:
            return "PILOTAGE - VENTES";
        case ONGLET_ACHATS:
            return "PILOTAGE - ACHATS";
        case ONGLET_CAISSE:
            return "PILOTAGE - CAISSE ET TIERS-PAYANT";
        case ONGLET_STOCK:
            return "PILOTAGE - STOCK";
        case ONGLET_QUALITE:
            return "PILOTAGE - QUALITÉ D'EXPLOITATION";
        case ONGLET_KPI:
            return "PILOTAGE - ANALYSE DES KPI";
        case ONGLET_COMPARATEUR:
            return "PILOTAGE - COMPARATEUR";
        case ONGLET_ACHATS_VENTES:
            return "PILOTAGE - ACHATS ET VENTES COMPARÉS";
        default:
            return "PILOTAGE - SYNTHÈSE";
        }
    }

    /**
     * Rappel imprime de l'axe : ce qui est regarde, ce a quoi c'est compare, et pourquoi les deux periodes ont la meme
     * duree. Un ecart de -3 % sans savoir ce qui est compare a quoi ne veut rien dire.
     */
    static String rappelAxe(JSONObject axe) {
        StringBuilder sb = new StringBuilder(axe.optString("libelle")).append(" (").append(axe.optString("periode"))
                .append(")");
        if (axe.optBoolean("comparaison")) {
            sb.append("  comparé à  ").append(axe.optString("libelleReference")).append(" (")
                    .append(axe.optString("periodeReference")).append(")");
        }
        String explication = axe.optString("explication", "");
        if (StringUtils.isNotBlank(explication)) {
            sb.append("\n").append(explication);
        }
        return sb.toString();
    }

    /** Les tuiles, mises a plat pour l'entete de l'edition : le detail mensuel seul obligerait a refaire l'addition. */
    static String rappelTuiles(JSONArray tuiles) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; tuiles != null && i < tuiles.length(); i++) {
            JSONObject t = tuiles.getJSONObject(i);
            if (sb.length() > 0) {
                sb.append("   |   ");
            }
            sb.append(t.optString("libelle")).append(" : ")
                    .append(String.format(java.util.Locale.FRANCE, "%,.0f", t.optDouble("valeur", 0d)));
            if (StringUtils.isNotBlank(t.optString("unite"))) {
                sb.append(' ').append(t.optString("unite"));
            }
            if (t.has("variation")) {
                sb.append(String.format(java.util.Locale.FRANCE, " (%+.1f %%)", t.optDouble("variation", 0d)));
            }
        }
        return sb.toString();
    }

    /** PDF de l'onglet, rendu en memoire : servi en flux dans l'onglet ouvert par le clic. */
    public byte[] pdf(TUser operateur, String onglet, String codeAxe, String debutPerso, String finPerso,
            Filtres filtres, Choix choix) throws net.sf.jasperreports.engine.JRException {
        JSONObject donnees = donnees(operateur, onglet, codeAxe, debutPerso, finPerso, filtres, choix);
        List<String[]> colonnes = colonnes(onglet, donnees);
        JSONArray mois = donnees.optJSONArray("mois");
        List<LignePilotage> lignes = new ArrayList<>();
        /*
         * DU MOIS ACTUEL AU PLUS ANCIEN, comme a l'ecran. Les series sont construites dans le sens du temps parce que
         * c'est ainsi qu'une courbe se lit ; un TABLEAU, lui, se lit en partant du mois qu'on vient de finir. L'ecran
         * le faisait deja, l'edition etait restee a l'envers (20/09).
         */
        boolean naturel = donnees.optBoolean("ordreNaturel");
        int nb = mois == null ? 0 : mois.length();
        for (int rang = 0; rang < nb; rang++) {
            JSONObject m = mois.getJSONObject(naturel ? rang : nb - 1 - rang);
            LignePilotage ligne = new LignePilotage(m.optString("libelle"));
            for (int c = 0; c < colonnes.size() && c < LignePilotage.COLONNES; c++) {
                ligne.set(c, m.optDouble(colonnes.get(c)[0], 0d));
            }
            lignes.add(ligne);
        }
        Map<String, Object> parametres = new java.util.HashMap<>();
        try {
            parametres.putAll(reportUtil.officineData(operateur));
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "en-tete de l'officine indisponible pour l'edition du pilotage", e);
        }
        parametres.put("P_TITRE", titreOnglet(onglet));
        parametres.put("P_CRITERES", rappelAxe(donnees.optJSONObject("axe")));
        parametres.put("P_TUILES", rappelTuiles(donnees.optJSONArray("tuiles")));
        for (int c = 0; c < LignePilotage.COLONNES; c++) {
            parametres.put("P_C" + (c + 1), c < colonnes.size() ? colonnes.get(c)[1] : "");
        }
        net.sf.jasperreports.engine.JasperReport modele = reportUtil.compileFromClasspath(MODELE);
        if (modele == null) {
            throw new net.sf.jasperreports.engine.JRException("Modele embarque " + MODELE + ".jrxml introuvable");
        }
        net.sf.jasperreports.engine.JasperPrint print = net.sf.jasperreports.engine.JasperFillManager.fillReport(modele,
                parametres, new net.sf.jasperreports.engine.data.JRBeanCollectionDataSource(lignes));
        try (java.io.ByteArrayOutputStream sortie = new java.io.ByteArrayOutputStream()) {
            net.sf.jasperreports.engine.export.JRPdfExporter exporteur = new net.sf.jasperreports.engine.export.JRPdfExporter();
            exporteur.setExporterInput(new net.sf.jasperreports.export.SimpleExporterInput(print));
            exporteur.setExporterOutput(new net.sf.jasperreports.export.SimpleOutputStreamExporterOutput(sortie));
            exporteur.exportReport();
            return sortie.toByteArray();
        } catch (java.io.IOException e) {
            throw new net.sf.jasperreports.engine.JRException(e);
        }
    }

    /**
     * Export Excel de l'onglet.
     *
     * <p>
     * L'export n'a pas la limite de sept colonnes de la page A4 : tous les modes de reglement y figurent, meme quand
     * l'officine en encaisse une douzaine.
     */
    public byte[] excel(TUser operateur, String onglet, String codeAxe, String debutPerso, String finPerso,
            Filtres filtres, Choix choix) throws java.io.IOException {
        JSONObject donnees = donnees(operateur, onglet, codeAxe, debutPerso, finPerso, filtres, choix);
        List<String[]> colonnes = colonnes(onglet, donnees);
        String[] entetes = new String[colonnes.size() + 1];
        entetes[0] = "MOIS";
        for (int c = 0; c < colonnes.size(); c++) {
            entetes[c + 1] = colonnes.get(c)[1];
        }
        JSONArray mois = donnees.optJSONArray("mois");
        List<JSONObject> lignes = new ArrayList<>();
        /*
         * Le meme ordre que l'ecran et que le PDF : deux editions du meme onglet ne se lisent pas a l'envers l'une de
         * l'autre.
         */
        boolean naturel = donnees.optBoolean("ordreNaturel");
        int nb = mois == null ? 0 : mois.length();
        for (int rang = 0; rang < nb; rang++) {
            lignes.add(mois.getJSONObject(naturel ? rang : nb - 1 - rang));
        }
        return excelService.createLandscapeExcelReport(titreOnglet(onglet), entetes, lignes, (ligne, m) -> {
            ligne.createCell(0).setCellValue(m.optString("libelle"));
            for (int c = 0; c < colonnes.size(); c++) {
                ligne.createCell(c + 1).setCellValue(m.optDouble(colonnes.get(c)[0], 0d));
            }
        });
    }

    /** Une ligne du modele imprime : un libelle et sept valeurs, dont seules les colonnes nommees s'impriment. */
    public static final class LignePilotage {

        static final int COLONNES = 7;

        private final String libelle;
        private final String court;
        private final Double[] valeurs = new Double[COLONNES];

        LignePilotage(String libelle) {
            this.libelle = libelle;
            this.court = moisCourt(libelle);
        }

        void set(int index, double valeur) {
            valeurs[index] = valeur;
        }

        public String getLibelle() {
            return libelle;
        }

        /** Le mois abrege, pour l'axe de la courbe : douze mois en toutes lettres s'y tronquent. */
        public String getCourt() {
            return court;
        }

        public Double getV1() {
            return valeurs[0];
        }

        public Double getV2() {
            return valeurs[1];
        }

        public Double getV3() {
            return valeurs[2];
        }

        public Double getV4() {
            return valeurs[3];
        }

        public Double getV5() {
            return valeurs[4];
        }

        public Double getV6() {
            return valeurs[5];
        }

        public Double getV7() {
            return valeurs[6];
        }
    }

    /* =================================================================================== mecanique */

    /**
     * Totaux d'une periode.
     *
     * <p>
     * Les MOIS ENTIERS sont pris dans les agregats deja calcules ; seuls les bords - un mois commence, un mois tronque
     * - sont interroges directement. Une periode de douze mois, qui demandait auparavant de relire un an de detail de
     * ventes, ne coute donc plus qu'une lecture d'agregats et au plus deux requetes bornees.
     *
     * <p>
     * C'est le coeur de la correction du 19/09 : l'officine mesurait 17 a 71 secondes par onglet.
     */
    Totaux totaux(Periode periode) {
        LocalDate premierMoisEntier = periode.debut.getDayOfMonth() == 1 ? periode.debut
                : periode.debut.withDayOfMonth(1).plusMonths(1);
        LocalDate finMoisEntiers = periode.fin.withDayOfMonth(1);
        if (!finMoisEntiers.isAfter(premierMoisEntier)) {
            /* Periode trop courte pour contenir un mois entier : une seule lecture directe, deja bornee. */
            return totauxDirects(periode);
        }
        Totaux t = new Totaux();
        List<String> mois = new ArrayList<>();
        for (LocalDate curseur = premierMoisEntier; curseur.isBefore(finMoisEntiers); curseur = curseur.plusMonths(1)) {
            mois.add(curseur.toString().substring(0, 7));
        }
        for (PilotageAgregats.Agregat a : agregats.agregats(mois).values()) {
            t.caTTC += a.caTTC;
            t.nbVentes += a.nbVentes;
            t.remises += a.remises;
            t.partTiersPayant += a.partTiersPayant;
            t.caHT += a.caHT;
            t.coutAchat += a.coutAchat;
            t.achatTTC += a.achatTTC;
            t.nbBons += a.nbBons;
            t.encaisse += a.encaisse;
            t.nbAnnulees += a.nbAnnulees;
            t.montantAnnule += a.montantAnnule;
            t.annuleEspece += a.annuleEspece;
        }
        if (periode.debut.isBefore(premierMoisEntier)) {
            t.ajouter(totauxDirects(new Periode(periode.debut, premierMoisEntier, "")));
        }
        if (finMoisEntiers.isBefore(periode.fin)) {
            t.ajouter(totauxDirects(new Periode(finMoisEntiers, periode.fin, "")));
        }
        t.marge = t.caHT - t.coutAchat;
        return t;
    }

    /** Totaux calcules directement, pour une periode bornee : un bord de periode, ou une periode courte. */
    private Totaux totauxDirects(Periode periode) {
        Totaux t = new Totaux();
        for (Tuple l : liste(PilotageSql.totauxVentes(), periode)) {
            t.caTTC = nombre(l.get("caTTC"));
            t.nbVentes = entier(l.get("nbVentes"));
            t.remises = nombre(l.get("remises"));
            t.partTiersPayant = nombre(l.get("partTiersPayant"));
        }
        for (Tuple l : liste(PilotageSql.totauxMarge(), periode)) {
            t.caHT = nombre(l.get("caHT"));
            t.coutAchat = nombre(l.get("coutAchat"));
            t.marge = t.caHT - t.coutAchat;
        }
        for (Tuple l : liste(PilotageSql.totauxAchats(), periode)) {
            t.achatTTC = nombre(l.get("achatTTC"));
            t.nbBons = entier(l.get("nbBons"));
        }
        for (Tuple l : liste(PilotageSql.totalEncaisse(), periode)) {
            t.encaisse = nombre(l.get("encaisse"));
        }
        for (Tuple l : liste(PilotageSql.totalAnnulations(), periode)) {
            t.nbAnnulees = nombre(l.get("nbAnnulees"));
            t.montantAnnule = nombre(l.get("montantAnnule"));
        }
        for (Tuple l : liste(PilotageSql.totalAnnulationsEspece(), periode)) {
            t.annuleEspece = nombre(l.get("montantEspece"));
        }
        return t;
    }

    /** Totaux d'une periode, tels que les tuiles les affichent. */
    static final class Totaux {

        double caTTC;
        double caHT;
        double coutAchat;
        double marge;
        double remises;
        double partTiersPayant;
        double achatTTC;
        double encaisse;
        double nbAnnulees;
        double montantAnnule;
        double annuleEspece;
        int nbVentes;
        int nbBons;

        /** Ajoute les grandeurs d'un bord de periode a celles deja accumulees. */
        void ajouter(Totaux autre) {
            caTTC += autre.caTTC;
            caHT += autre.caHT;
            coutAchat += autre.coutAchat;
            remises += autre.remises;
            partTiersPayant += autre.partTiersPayant;
            achatTTC += autre.achatTTC;
            encaisse += autre.encaisse;
            nbAnnulees += autre.nbAnnulees;
            montantAnnule += autre.montantAnnule;
            annuleEspece += autre.annuleEspece;
            nbVentes += autre.nbVentes;
            nbBons += autre.nbBons;
            marge = caHT - coutAchat;
        }

        double tauxMarge() {
            return caHT == 0 ? 0 : marge / caHT * 100d;
        }

        double panierMoyen() {
            return nbVentes == 0 ? 0 : caTTC / nbVentes;
        }

        /**
         * Ratio ventes / achats.
         *
         * <p>
         * Ce que l'officine appelle le « flux » : un ratio inferieur a 1 sur plusieurs mois signifie qu'on achete plus
         * qu'on ne vend, donc que le stock gonfle.
         */
        double ratioVA() {
            return achatTTC == 0 ? 0 : caTTC / achatTTC;
        }
    }

    @SuppressWarnings("unchecked")
    private List<Tuple> liste(String sql, Periode periode) {
        Query q = em.createNativeQuery(sql, Tuple.class);
        bornes(q, sql, periode);
        return q.getResultList();
    }

    /**
     * Pose les bornes de la periode, et le type de vente exclu quand la requete en parle.
     *
     * <p>
     * Le parametre n'est lie que si la requete le contient : en lier un de trop leverait une erreur a l'execution, et
     * toutes les requetes de cet ecran ne parlent pas des ventes.
     */
    private static void bornes(Query q, String sql, Periode periode) {
        q.setParameter("debut", java.sql.Timestamp.valueOf(periode.debut.atStartOfDay()));
        q.setParameter("fin", java.sql.Timestamp.valueOf(periode.fin.atStartOfDay()));
        if (sql.contains(":typeExclu")) {
            q.setParameter("typeExclu", PilotageSql.TYPE_VENTE_EXCLU);
        }
    }

    private static void lierFiltres(Query q, String sql, Filtres filtres) {
        if (sql.contains(":grossiste")) {
            q.setParameter("grossiste", filtres.grossisteId);
        }
        if (sql.contains(":famille")) {
            q.setParameter("famille", filtres.familleId);
        }
        if (sql.contains(":emplacement")) {
            q.setParameter("emplacement", filtres.emplacementId);
        }
    }

    /**
     * Une tuile : la valeur, la reference et la variation.
     *
     * <p>
     * La variation n'est calculee que s'il y a une reference, et vaut null si celle-ci est nulle : afficher « +100 % »
     * la ou il n'y avait rien tromperait le lecteur.
     */
    private static JSONObject tuile(String cle, String libelle, double valeur, Double reference, String unite,
            String sousTitre) {
        JSONObject json = new JSONObject().put("cle", cle).put("libelle", libelle).put("valeur", arrondi(valeur))
                .put("unite", StringUtils.defaultString(unite));
        if (sousTitre != null) {
            json.put("sousTitre", sousTitre);
        }
        if (reference != null) {
            json.put("reference", arrondi(reference));
            Double variation = PilotagePeriodes.variation(valeur, reference);
            if (variation != null) {
                json.put("variation", arrondi(variation)).put("ecart", arrondi(valeur - reference));
            }
        }
        return json;
    }

    /**
     * ONGLET ACHATS / VENTES : trois annees face a face, decoupees en trimestres, semestres ou annees.
     *
     * <p>
     * <b>Ce qu'il repond.</b> « Ce trimestre, ai-je achete plus que je n'ai vendu, et ou en suis-je par rapport a l'an
     * dernier ? » C'est la question du reapprovisionnement, et elle demandait jusqu'ici d'ouvrir deux ecrans et de
     * poser les chiffres cote a cote. Ventes, achats et leur RATIO sont ici sur la meme ligne.
     *
     * <p>
     * <b>Pourquoi il est instantane.</b> Il ne calcule rien : le chiffre d'affaires et les achats de chaque mois sont
     * deja enregistres dans les agregats. Un trimestre est la somme de trois mois deja calcules, un semestre six, une
     * annee douze. L'onglet lit UNE fois les trente-sept mois de la fenetre et additionne en memoire - aucune requete
     * sur les ventes ni sur les bons de livraison.
     *
     * <p>
     * <b>Les quatre lectures de chaque case.</b> Le montant ; le POIDS de la periode dans son annee ; la variation par
     * rapport a la MEME periode de l'annee precedente, en francs et en taux ; et la variation par rapport a la periode
     * PRECEDENTE de la meme annee. Les trois dernieres sont ce qui transforme un tableau de chiffres en aide a la
     * decision.
     */
    private JSONObject achatsVentes(String decoupage) {
        String type = StringUtils.defaultIfBlank(decoupage, DECOUPAGE_TRIMESTRE);
        int parAn = DECOUPAGE_ANNEE.equals(type) ? 1 : (DECOUPAGE_SEMESTRE.equals(type) ? 2 : 4);
        int moisParPeriode = 12 / parAn;
        int anneeCourante = LocalDate.now().getYear();
        int premiereAnnee = anneeCourante - ANNEES_COMPAREES + 1;

        /* Les agregats des trois annees civiles, en UNE lecture. */
        List<String> mois = new ArrayList<>();
        for (int an = premiereAnnee; an <= anneeCourante; an++) {
            for (int m = 1; m <= 12; m++) {
                mois.add(String.format("%04d-%02d", an, m));
            }
        }
        Map<String, PilotageAgregats.Agregat> connus = agregats.agregats(mois);

        /* Cumul par annee et par periode : ventes, achats. */
        double[][] ventes = new double[ANNEES_COMPAREES][parAn];
        double[][] achats = new double[ANNEES_COMPAREES][parAn];
        for (int i = 0; i < ANNEES_COMPAREES; i++) {
            int an = premiereAnnee + i;
            for (int m = 1; m <= 12; m++) {
                PilotageAgregats.Agregat a = connus.get(String.format("%04d-%02d", an, m));
                if (a == null) {
                    continue;
                }
                int periode = (m - 1) / moisParPeriode;
                ventes[i][periode] += a.caTTC;
                achats[i][periode] += a.achatTTC;
            }
        }

        JSONArray annees = new JSONArray();
        for (int i = 0; i < ANNEES_COMPAREES; i++) {
            annees.put(premiereAnnee + i);
        }

        JSONArray lignes = new JSONArray();
        for (int p = 0; p < parAn; p++) {
            JSONObject ligne = new JSONObject().put("periode", p).put("libelle", libellePeriode(type, p));
            for (int i = 0; i < ANNEES_COMPAREES; i++) {
                int an = premiereAnnee + i;
                String prefixe = "an" + an + "_";
                double ca = ventes[i][p];
                double achat = achats[i][p];
                ligne.put(prefixe + "ca", arrondi(ca));
                ligne.put(prefixe + "achat", arrondi(achat));
                /* Le ratio ne se calcule pas quand on n'a rien achete : il serait infini, pas eleve. */
                ligne.put(prefixe + "ratio", achat == 0 ? 0d : arrondi(ca / achat));
                ligne.put(prefixe + "poidsCa", part(ca, somme(ventes[i])));
                ligne.put(prefixe + "poidsAchat", part(achat, somme(achats[i])));
                if (i > 0) {
                    double caN1 = ventes[i - 1][p];
                    double achatN1 = achats[i - 1][p];
                    /* Deux zeros n'ont pas d'ecart a montrer : la case reste vide plutot que d'afficher « 0 ». */
                    if (ca != 0 || caN1 != 0) {
                        ligne.put(prefixe + "varCa", arrondi(ca - caN1));
                    }
                    if (achat != 0 || achatN1 != 0) {
                        ligne.put(prefixe + "varAchat", arrondi(achat - achatN1));
                    }
                    Double tauxCa = PilotagePeriodes.variation(ca, caN1);
                    Double tauxAchat = PilotagePeriodes.variation(achat, achatN1);
                    if (tauxCa != null) {
                        ligne.put(prefixe + "varCaTaux", arrondi(tauxCa));
                    }
                    if (tauxAchat != null) {
                        ligne.put(prefixe + "varAchatTaux", arrondi(tauxAchat));
                    }
                    double ratio = achat == 0 ? 0d : ca / achat;
                    double ratioN1 = achatN1 == 0 ? 0d : caN1 / achatN1;
                    if (achat != 0 && achatN1 != 0) {
                        ligne.put(prefixe + "varRatio", arrondi(ratio - ratioN1));
                    }
                }
                if (p > 0) {
                    /* La periode precedente de la MEME annee : « suis-je au-dessus du trimestre d'avant ? » */
                    Double tauxCa = PilotagePeriodes.variation(ca, ventes[i][p - 1]);
                    Double tauxAchat = PilotagePeriodes.variation(achat, achats[i][p - 1]);
                    if (tauxCa != null) {
                        ligne.put(prefixe + "varCaPrec", arrondi(tauxCa));
                    }
                    if (tauxAchat != null) {
                        ligne.put(prefixe + "varAchatPrec", arrondi(tauxAchat));
                    }
                }
            }
            lignes.put(ligne);
        }

        /*
         * LES TUILES PORTENT LE CUMUL DE L'ANNEE EN COURS, compare au MEME cumul de l'an dernier : autant de mois
         * ecoules de part et d'autre. Comparer une annee commencee a une annee entiere annoncerait une chute qui
         * n'existe pas - c'est la regle deja retenue pour le cumul annuel du selecteur de periode.
         */
        int moisEcoules = LocalDate.now().getMonthValue();
        double caCourant = cumul(connus, anneeCourante, moisEcoules, true);
        double achatCourant = cumul(connus, anneeCourante, moisEcoules, false);
        double caPrecedent = cumul(connus, anneeCourante - 1, moisEcoules, true);
        double achatPrecedent = cumul(connus, anneeCourante - 1, moisEcoules, false);
        String libelleReference = "Cumul " + (anneeCourante - 1) + " au même mois";
        JSONArray tuiles = new JSONArray();
        tuiles.put(tuile("ca", "Ventes " + anneeCourante + " (cumul)", caCourant, caPrecedent, "FCFA",
                moisEcoules + " mois écoulés, comparés aux " + moisEcoules + " mêmes mois de " + (anneeCourante - 1)));
        tuiles.put(tuile("achat", "Achats " + anneeCourante + " (cumul)", achatCourant, achatPrecedent, "FCFA",
                "montant TTC des bons clôturés"));
        tuiles.put(tuile("ratio", "Ratio ventes / achats", achatCourant == 0 ? 0d : caCourant / achatCourant,
                achatPrecedent == 0 ? null : caPrecedent / achatPrecedent, "",
                "au-dessus de 1, on vend plus qu'on n'achète sur la période"));
        tuiles.put(tuile("ecart", "Écart ventes − achats", caCourant - achatCourant, caPrecedent - achatPrecedent,
                "FCFA", "ce que l'activité dégage avant charges"));
        for (int i = 0; i < tuiles.length(); i++) {
            tuiles.getJSONObject(i).put("libelleReference", libelleReference);
        }

        return new JSONObject().put("tuiles", tuiles).put("annees", annees).put("lignes", lignes)
                /*
                 * Les editions lisent « mois » : on leur donne les memes lignes. Et « ordreNaturel » leur dit de NE PAS
                 * les retourner - le premier trimestre se lit avant le quatrieme, alors qu'une serie mensuelle se lit
                 * en partant du mois qu'on vient de finir.
                 */
                .put("mois", lignes).put("ordreNaturel", true).put("decoupage", type)
                .put("libelleDecoupage", libelleDecoupage(type)).put("note",
                        "Ventes et achats viennent des mêmes agrégats mensuels que les autres onglets : "
                                + "cet onglet ne relit ni les ventes ni les bons de livraison, il additionne des mois "
                                + "déjà calculés.");
    }

    private static double somme(double[] valeurs) {
        double total = 0;
        for (double v : valeurs) {
            total += v;
        }
        return total;
    }

    private static double part(double valeur, double total) {
        return total == 0 ? 0d : arrondi(valeur / total * 100d);
    }

    /** Cumul des {@code nbMois} premiers mois d'une annee, en ventes ou en achats. */
    private static double cumul(Map<String, PilotageAgregats.Agregat> connus, int annee, int nbMois, boolean enVentes) {
        double total = 0;
        for (int m = 1; m <= nbMois && m <= 12; m++) {
            PilotageAgregats.Agregat a = connus.get(String.format("%04d-%02d", annee, m));
            if (a != null) {
                total += enVentes ? a.caTTC : a.achatTTC;
            }
        }
        return total;
    }

    private static String libellePeriode(String decoupage, int index) {
        if (DECOUPAGE_ANNEE.equals(decoupage)) {
            return "Année entière";
        }
        return (DECOUPAGE_SEMESTRE.equals(decoupage) ? "Semestre " : "Trimestre ") + (index + 1);
    }

    private static String libelleDecoupage(String decoupage) {
        if (DECOUPAGE_ANNEE.equals(decoupage)) {
            return "par année";
        }
        return DECOUPAGE_SEMESTRE.equals(decoupage) ? "par semestre" : "par trimestre";
    }

    /**
     * Amorce une ligne pour CHAQUE mois de la fenetre, avant tout remplissage.
     *
     * <p>
     * Sans cela, un mois sans aucun mouvement disparaissait purement et simplement de la serie : la courbe sautait le
     * mois et le detail ne le montrait pas. Vu au banc sur le mois en cours, dont la photo de stock n'avait aucune
     * ligne a laquelle se rattacher. Un mois sans activite est une information - il vaut zero, il ne vaut pas rien.
     */
    private static Map<String, JSONObject> moisDeLaFenetre(Periode fenetre) {
        Map<String, JSONObject> lignes = new LinkedHashMap<>();
        LocalDate curseur = fenetre.debut.withDayOfMonth(1);
        LocalDate fin = fenetre.fin;
        while (curseur.isBefore(fin)) {
            ligne(lignes, curseur.toString().substring(0, 7));
            curseur = curseur.plusMonths(1);
        }
        return lignes;
    }

    /**
     * Recalcule les agregats de tous les mois de la fenetre affichee, et vide le cache d'ecran.
     *
     * @return le nombre de mois repris
     */
    public int recalculer(String codeAxe, String debutPerso, String finPerso) {
        Axe axe = PilotagePeriodes.calculer(codeAxe, LocalDate.now(), OrdonnanceClientSaisie.date(debutPerso),
                OrdonnanceClientSaisie.date(finPerso));
        int faits = agregats.recalculer(moisDeLaPeriode(axe.graphique));
        /* Les chiffres ont change : l'ecran ne doit pas continuer a servir la version d'avant. */
        CACHE.clear();
        return faits;
    }

    /**
     * CONTROLE DES CORRECTIONS TARDIVES, demande explicitement.
     *
     * <p>
     * Il relit le nombre de ventes et le chiffre d'affaires de tous les mois regardes pour les comparer aux agregats
     * enregistres : c'est lui qui fait voir une vente annulee apres coup sur un mois deja clos. Trois secondes et demie
     * sur treize mois chez l'officine.
     *
     * <p>
     * Il est appele a l'OUVERTURE de l'ecran et par le bouton « Actualiser », jamais a chaque changement d'onglet : les
     * chiffres ne bougent pas pendant qu'on les consulte, et l'officine ne fait pas ses annulations depuis ce menu -
     * elle vient y analyser ce qu'elle a corrige ailleurs.
     */
    public JSONObject controler(String codeAxe, String debutPerso, String finPerso) {
        Axe axe = PilotagePeriodes.calculer(codeAxe, LocalDate.now(), OrdonnanceClientSaisie.date(debutPerso),
                OrdonnanceClientSaisie.date(finPerso));
        int repris = agregats.controler(moisDeLaPeriode(axe.graphique));
        if (repris > 0) {
            /* Des mois ont change : l'ecran ne doit pas continuer a servir la version d'avant. */
            CACHE.clear();
        }
        return new JSONObject().put("success", true).put("repris", repris);
    }

    /** Les mois couverts par une periode, du plus ancien au plus recent. */
    private static List<String> moisDeLaPeriode(Periode fenetre) {
        List<String> mois = new ArrayList<>();
        LocalDate curseur = fenetre.debut.withDayOfMonth(1);
        while (curseur.isBefore(fenetre.fin)) {
            mois.add(curseur.toString().substring(0, 7));
            curseur = curseur.plusMonths(1);
        }
        return mois;
    }

    /**
     * Les agregats de la fenetre, indexes par mois : UNE lecture pour toute la serie mensuelle, la ou chaque onglet
     * lancait auparavant trois a cinq requetes sur douze a vingt-quatre mois de detail.
     */
    private Map<String, PilotageAgregats.Agregat> agregatsDeLaFenetre(Periode fenetre) {
        return agregats.agregats(moisDeLaPeriode(fenetre));
    }

    /** Pose sur une ligne de mois toutes les grandeurs d'un agregat : les onglets y puisent ce qui les concerne. */
    private static void poser(JSONObject ligne, PilotageAgregats.Agregat a) {
        double marge = a.marge();
        ligne.put("caTTC", a.caTTC).put("nbVentes", a.nbVentes).put("remises", a.remises)
                .put("partTiersPayant", a.partTiersPayant).put("caHT", Math.round(a.caHT))
                .put("coutAchat", Math.round(a.coutAchat)).put("marge", Math.round(marge))
                .put("tauxMarge", a.caHT == 0 ? 0 : arrondi(marge / a.caHT * 100d)).put("achatTTC", a.achatTTC)
                .put("nbBons", a.nbBons).put("encaisse", a.encaisse).put("nbAnnulees", a.nbAnnulees)
                .put("montantAnnule", a.montantAnnule).put("annuleEspece", a.annuleEspece)
                .put("entrees", a.entreesStock).put("sorties", a.sortiesStock)
                .put("panier", a.nbVentes == 0 ? 0 : Math.round(a.caTTC / a.nbVentes))
                .put("tauxRemise", a.caTTC == 0 ? 0 : arrondi(a.remises / a.caTTC * 100d))
                .put("tauxAnnulation", a.nbVentes == 0 ? 0 : arrondi(a.nbAnnulees / (double) a.nbVentes * 100d))
                .put("credit", arrondi(a.caTTC - a.encaisse))
                .put("partComptant", a.caTTC == 0 ? 0 : arrondi(a.encaisse / a.caTTC * 100d))
                .put("partCredit", a.caTTC == 0 ? 0 : arrondi((a.caTTC - a.encaisse) / a.caTTC * 100d))
                .put("ratioVA", a.achatTTC == 0 ? 0 : arrondi(a.caTTC / a.achatTTC));
    }

    /** Une ligne par mois de la fenetre, alimentee par les agregats. */
    private JSONArray moisAgreges(Periode fenetre) {
        Map<String, JSONObject> lignes = moisDeLaFenetre(fenetre);
        agregatsDeLaFenetre(fenetre).forEach((mois, a) -> poser(ligne(lignes, mois), a));
        return finaliser(lignes);
    }

    /**
     * Une ligne par mois, avec EN PLUS le meme mois de la periode de reference.
     *
     * <p>
     * « Si je compare 2 valeurs les 2 doivent se retrouver sur les courbes » (19/09). Choisir « Vs mois precedent » ou
     * « Vs meme mois l'an dernier » ne changeait que les tuiles : le graphique, lui, ne montrait qu'une seule courbe.
     * Chaque mois porte donc aussi la valeur du mois correspondant de la periode comparee - decalee d'un mois ou de
     * douze selon l'axe - et le graphique trace les deux.
     */
    private JSONArray moisAgreges(Axe axe) {
        Map<String, JSONObject> lignes = moisDeLaFenetre(axe.graphique);
        agregatsDeLaFenetre(axe.graphique).forEach((mois, a) -> poser(ligne(lignes, mois), a));
        poserReference(axe, lignes);
        return finaliser(lignes);
    }

    /** Le decalage, en mois, entre la periode regardee et celle a laquelle on la compare. Zero s'il n'y en a pas. */
    private static int decalageReference(Axe axe) {
        if (axe.reference == null) {
            return 0;
        }
        long mois = java.time.temporal.ChronoUnit.MONTHS.between(axe.reference.debut.withDayOfMonth(1),
                axe.courante.debut.withDayOfMonth(1));
        return (int) Math.max(0, mois);
    }

    /** Pose sur chaque mois la valeur du mois correspondant de la periode de reference. */
    private void poserReference(Axe axe, Map<String, JSONObject> lignes) {
        int decalage = decalageReference(axe);
        if (decalage == 0) {
            return;
        }
        Periode decalee = new Periode(axe.graphique.debut.minusMonths(decalage),
                axe.graphique.fin.minusMonths(decalage), "");
        Map<String, PilotageAgregats.Agregat> passe = agregats.agregats(moisDeLaPeriode(decalee));
        for (Map.Entry<String, JSONObject> entree : lignes.entrySet()) {
            String moisReference = java.time.YearMonth.parse(entree.getKey()).minusMonths(decalage).toString();
            PilotageAgregats.Agregat a = passe.get(moisReference);
            JSONObject ligne = entree.getValue();
            ligne.put("libelleReference", libelleMois(moisReference));
            if (a == null) {
                continue;
            }
            ligne.put("caTTCRef", a.caTTC).put("margeRef", Math.round(a.marge())).put("achatTTCRef", a.achatTTC)
                    .put("encaisseRef", a.encaisse).put("nbVentesRef", a.nbVentes).put("nbAnnuleesRef", a.nbAnnulees)
                    .put("caHTRef", Math.round(a.caHT))
                    .put("panierRef", a.nbVentes == 0 ? 0 : Math.round(a.caTTC / a.nbVentes));
        }
    }

    private static JSONObject ligne(Map<String, JSONObject> lignes, String mois) {
        return lignes.computeIfAbsent(mois,
                m -> new JSONObject().put("mois", m).put("libelle", libelleMois(m)).put("caTTC", 0).put("achatTTC", 0)
                        .put("marge", 0).put("caHT", 0).put("nbVentes", 0).put("panier", 0).put("remises", 0)
                        .put("partTiersPayant", 0).put("tauxMarge", 0).put("nbBons", 0).put("coutAchat", 0));
    }

    /**
     * Les mois du plus ANCIEN au plus recent : une courbe d'evolution se lit de gauche a droite dans le sens du temps.
     * C'est l'inverse de l'historique des ordonnances, et c'est voulu.
     */
    private static JSONArray finaliser(Map<String, JSONObject> lignes) {
        List<String> mois = new ArrayList<>(lignes.keySet());
        java.util.Collections.sort(mois);
        JSONArray data = new JSONArray();
        for (String m : mois) {
            data.put(lignes.get(m));
        }
        return data;
    }

    /** « 2026-09 » devient « Septembre 2026 » : un axe de graphique se lit, il ne se decode pas. */
    static String libelleMois(String mois) {
        try {
            String[] parts = mois.split("-");
            return PilotagePeriodes.mois(LocalDate.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), 1));
        } catch (RuntimeException e) {
            return mois;
        }
    }

    /**
     * « Septembre 2026 » devient « sept. 26 ».
     *
     * <p>
     * L'axe d'une courbe de douze mois ne peut pas porter des mois ecrits en toutes lettres : JasperReports les tronque
     * par la fin, et l'axe affichait « bre 2024 ». Le tableau, lui, garde le libelle entier.
     */
    static String moisCourt(String libelle) {
        if (StringUtils.isBlank(libelle)) {
            return "";
        }
        String[] parts = libelle.trim().split(" ");
        if (parts.length < 2) {
            return libelle;
        }
        String mois = parts[0].toLowerCase(java.util.Locale.FRANCE);
        String abrege;
        switch (mois) {
        case "janvier":
            abrege = "janv.";
            break;
        case "février":
            abrege = "févr.";
            break;
        case "avril":
            abrege = "avr.";
            break;
        case "juillet":
            abrege = "juil.";
            break;
        case "septembre":
            abrege = "sept.";
            break;
        case "octobre":
            abrege = "oct.";
            break;
        case "novembre":
            abrege = "nov.";
            break;
        case "décembre":
            abrege = "déc.";
            break;
        default:
            /* mars, mai, juin et aout s'ecrivent deja en entier. */
            abrege = mois;
            break;
        }
        String annee = parts[1];
        return abrege + " " + (annee.length() > 2 ? annee.substring(annee.length() - 2) : annee);
    }

    /** Cle technique d'un mode de reglement : le libelle sans accent ni espace, pour servir de nom de colonne. */
    static String cle(String libelle) {
        return java.text.Normalizer.normalize(StringUtils.defaultString(libelle), java.text.Normalizer.Form.NFD)
                .replaceAll("[^A-Za-z0-9]", "").toUpperCase(java.util.Locale.ROOT);
    }

    /** Marque une tuile comme ALERTE : l'ecran la met alors en rouge et la fait clignoter. */
    private static JSONObject alerter(JSONObject tuile, boolean alerte) {
        return alerte ? tuile.put("alerte", true) : tuile;
    }

    private static String montant(double valeur) {
        return String.format(java.util.Locale.FRANCE, "%,.0f", valeur).replace('\u00a0', '.');
    }

    private static String pourcent(double valeur) {
        return String.format(java.util.Locale.FRANCE, "%.1f %%", valeur);
    }

    private static double arrondi(double valeur) {
        return Math.round(valeur * 100d) / 100d;
    }

    private static double nombre(Object valeur) {
        return valeur instanceof Number ? ((Number) valeur).doubleValue() : 0d;
    }

    private static int entier(Object valeur) {
        return valeur instanceof Number ? ((Number) valeur).intValue() : 0;
    }
}
