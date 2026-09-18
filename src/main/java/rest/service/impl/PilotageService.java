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
        Axe axe = PilotagePeriodes.calculer(codeAxe, LocalDate.now(), OrdonnanceClientSaisie.date(debutPerso),
                OrdonnanceClientSaisie.date(finPerso));
        String cle = (operateur == null ? "?" : operateur.getLgUSERID()) + "|" + onglet + "|" + axe.code + "|"
                + StringUtils.defaultString(debutPerso) + "|" + StringUtils.defaultString(finPerso) + "|"
                + filtres.cle();
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
                /*
                 * La photo du mois est prise a l'ouverture de l'onglet : c'est ce qui fait que l'historique se
                 * constitue sans que l'officine ait a y penser. Idempotent, une ligne par mois.
                 */
                photographierStock();
                reponse = stock(axe);
                break;
            case ONGLET_QUALITE:
                reponse = qualite(axe);
                break;
            default:
                reponse = synthese(axe);
                break;
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : onglet " + onglet, e);
            return new JSONObject().put("success", false).put("message", "Les chiffres n'ont pas pu être rassemblés.");
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
        return new JSONObject().put("tuiles", tuiles).put("mois", moisSynthese(axe.graphique));
    }

    /** Une ligne par mois de la fenetre : ventes, achats et marge cote a cote. */
    private JSONArray moisSynthese(Periode fenetre) {
        Map<String, JSONObject> lignes = moisDeLaFenetre(fenetre);
        for (Tuple t : liste(PilotageSql.ventesParMois(), fenetre)) {
            String mois = t.get("mois", String.class);
            ligne(lignes, mois).put("caTTC", nombre(t.get("caTTC"))).put("nbVentes", entier(t.get("nbVentes")))
                    .put("remises", nombre(t.get("remises"))).put("partTiersPayant", nombre(t.get("partTiersPayant")))
                    .put("panier", entier(t.get("nbVentes")) == 0 ? 0
                            : Math.round(nombre(t.get("caTTC")) / entier(t.get("nbVentes"))));
        }
        for (Tuple t : liste(PilotageSql.achatsParMois(), fenetre)) {
            ligne(lignes, t.get("mois", String.class)).put("achatTTC", nombre(t.get("achatTTC"))).put("nbBons",
                    entier(t.get("nbBons")));
        }
        for (Tuple t : liste(PilotageSql.margeParMois(), fenetre)) {
            double caHT = nombre(t.get("caHT"));
            double cout = nombre(t.get("coutAchat"));
            ligne(lignes, t.get("mois", String.class)).put("caHT", Math.round(caHT))
                    .put("marge", Math.round(caHT - cout))
                    .put("tauxMarge", caHT == 0 ? 0 : arrondi((caHT - cout) / caHT * 100d));
        }
        return finaliser(lignes);
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
        for (Tuple t : liste(PilotageSql.ventesParMois(), axe.graphique)) {
            String mois = t.get("mois", String.class);
            ligne(lignes, mois).put("caTTC", nombre(t.get("caTTC"))).put("nbVentes", entier(t.get("nbVentes")))
                    .put("remises", nombre(t.get("remises"))).put("panier", entier(t.get("nbVentes")) == 0 ? 0
                            : Math.round(nombre(t.get("caTTC")) / entier(t.get("nbVentes"))));
        }
        for (Tuple t : liste(PilotageSql.reglementsParMois(), axe.graphique)) {
            String mode = StringUtils.defaultIfBlank(t.get("mode", String.class), "Autre");
            modes.add(mode);
            ligne(lignes, t.get("mois", String.class)).put("mode_" + cle(mode), nombre(t.get("montant")));
        }
        JSONArray colonnes = new JSONArray();
        for (String mode : modes) {
            colonnes.put(new JSONObject().put("cle", "mode_" + cle(mode)).put("libelle", mode));
        }
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

        Map<String, JSONObject> lignes = moisDeLaFenetre(axe.graphique);
        for (Tuple t : liste(PilotageSql.margeParMois(), axe.graphique)) {
            double caHT = nombre(t.get("caHT"));
            double cout = nombre(t.get("coutAchat"));
            ligne(lignes, t.get("mois", String.class)).put("caHT", Math.round(caHT)).put("coutAchat", Math.round(cout))
                    .put("marge", Math.round(caHT - cout))
                    .put("tauxMarge", caHT == 0 ? 0 : arrondi((caHT - cout) / caHT * 100d));
        }
        for (Tuple t : liste(PilotageSql.ventesParMois(), axe.graphique)) {
            ligne(lignes, t.get("mois", String.class)).put("caTTC", nombre(t.get("caTTC")));
        }
        for (Tuple t : liste(PilotageSql.achatsParMois(), axe.graphique)) {
            ligne(lignes, t.get("mois", String.class)).put("achatTTC", nombre(t.get("achatTTC")));
        }
        return new JSONObject().put("tuiles", tuiles).put("mois", finaliser(lignes));
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
        double achatsCourant = surLignes ? sommeAchats(axe.courante, filtres) : courant.achatTTC;
        Double achatsReference = axe.reference == null ? null
                : (surLignes ? sommeAchats(axe.reference, filtres) : reference.achatTTC);

        JSONArray tuiles = new JSONArray();
        tuiles.put(tuile("achats", "Achats", achatsCourant, achatsReference, "FCFA",
                surLignes ? "montant des lignes retenues" : "montant TTC des bons clôturés"));
        tuiles.put(tuile("nbBons", "Bons de livraison", courant.nbBons,
                reference == null ? null : (double) reference.nbBons, "", null));
        tuiles.put(tuile("achatMoyen", "Achat moyen par bon", courant.nbBons == 0 ? 0 : achatsCourant / courant.nbBons,
                reference == null || reference.nbBons == 0 ? null : achatsReference / reference.nbBons, "FCFA", null));
        tuiles.put(tuile("ratioVA", "Ratio ventes / achats", courant.ratioVA(),
                reference == null ? null : reference.ratioVA(), "", "CA TTC rapporté aux achats TTC de la période"));
        tuiles.put(tuile("caTTC", "Chiffre d'affaires TTC", courant.caTTC, reference == null ? null : reference.caTTC,
                "FCFA", null));

        /* Une colonne par grossiste REELLEMENT rencontre sur la fenetre, plus le total du mois. */
        Map<String, JSONObject> lignes = moisDeLaFenetre(axe.graphique);
        Map<String, String> libelles = new LinkedHashMap<>();
        Map<String, Double> parts = new LinkedHashMap<>();
        for (Tuple t : listeAchats(axe.graphique, filtres)) {
            String mois = t.get("mois", String.class);
            String grossiste = StringUtils.defaultIfBlank(t.get("grossiste", String.class), "Sans grossiste");
            double montant = nombre(t.get("montant"));
            libelles.put(cle(grossiste), grossiste);
            parts.merge(cle(grossiste), montant, Double::sum);
            JSONObject ligne = ligne(lignes, mois);
            ligne.put("gros_" + cle(grossiste), montant);
            ligne.put("achatTTC", ligne.optDouble("achatTTC", 0d) + montant);
            ligne.put("nbBons", ligne.optInt("nbBons", 0) + entier(t.get("nbBons")));
        }
        JSONArray colonnes = new JSONArray();
        for (Map.Entry<String, String> e : libelles.entrySet()) {
            colonnes.put(new JSONObject().put("cle", "gros_" + e.getKey()).put("libelle", e.getValue()));
        }
        /* La part de chaque grossiste sur la fenetre : c'est la lecture que l'officine fait en premier. */
        double total = parts.values().stream().mapToDouble(Double::doubleValue).sum();
        JSONArray repartition = new JSONArray();
        parts.entrySet().stream().sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                .forEach(e -> repartition.put(new JSONObject().put("grossiste", libelles.get(e.getKey()))
                        .put("montant", arrondi(e.getValue()))
                        .put("part", total == 0 ? 0 : arrondi(e.getValue() / total * 100d))));

        return new JSONObject().put("tuiles", tuiles).put("mois", finaliser(lignes)).put("grossistesColonnes", colonnes)
                .put("repartition", repartition).put("base", surLignes ? "lignes" : "entete").put("note",
                        surLignes
                                ? "Filtre de famille ou d'emplacement actif : le montant est la somme des LIGNES "
                                        + "retenues (prix d'achat × quantité reçue), et non le total TTC des bons."
                                : "Montant TTC des bons de livraison clôturés, comme la tuile Achats de la synthèse.");
    }

    private List<Tuple> listeAchats(Periode periode, Filtres filtres) {
        String sql = filtres.surLignes()
                ? PilotageSql.achatsLignesParMois(filtres.grossisteId, filtres.familleId, filtres.emplacementId)
                : PilotageSql.achatsParMoisEtGrossiste(filtres.grossisteId);
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
        double encaisseCourant = valeur(axe.courante, PilotageSql.totalEncaisse(), "encaisse");
        Double encaisseReference = axe.reference == null ? null
                : valeur(axe.reference, PilotageSql.totalEncaisse(), "encaisse");
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
        for (Tuple t : liste(PilotageSql.ventesParMois(), axe.graphique)) {
            ligne(lignes, t.get("mois", String.class)).put("caTTC", nombre(t.get("caTTC"))).put("partTiersPayant",
                    nombre(t.get("partTiersPayant")));
        }
        for (Tuple t : liste(PilotageSql.encaisseParMois(), axe.graphique)) {
            ligne(lignes, t.get("mois", String.class)).put("encaisse", nombre(t.get("encaisse")));
        }
        for (Tuple t : liste(PilotageSql.tiersPayantRegleParMois(), axe.graphique)) {
            ligne(lignes, t.get("mois", String.class)).put("tpRegle", nombre(t.get("regle")));
        }
        /* Le credit et les parts se deduisent des deux precedents : aucune quatrieme requete. */
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

        Map<String, JSONObject> lignes = moisDeLaFenetre(axe.graphique);
        for (Tuple t : liste(PilotageSql.entreesStockParMois(), axe.graphique)) {
            ligne(lignes, t.get("mois", String.class)).put("entrees", nombre(t.get("montant"))).put("unitesEntrees",
                    nombre(t.get("unites")));
        }
        for (Tuple t : liste(PilotageSql.sortiesStockParMois(), axe.graphique)) {
            ligne(lignes, t.get("mois", String.class)).put("sorties", nombre(t.get("montant"))).put("unitesSorties",
                    nombre(t.get("unites")));
        }
        JSONArray mois = finaliser(lignes);

        /* Les photos deja prises, indexees par mois : elles l'emportent sur la reconstitution. */
        Map<String, JSONObject> photos = photos(axe.graphique);

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

        return new JSONObject().put("tuiles", tuiles).put("mois", mois)
                .put("sourceEvolution", reconstitue ? (photos.isEmpty() ? "reconstitution" : "mixte") : "photos")
                .put("photos", photos.size()).put("note",
                        reconstitue
                                ? "Valeur du stock RECONSTITUÉE à rebours depuis l'état du jour, avec les entrées "
                                        + "(bons de livraison) et les sorties (ventes) de chaque mois. Les "
                                        + "régularisations d'inventaire n'y figurent pas. Une photo mensuelle est "
                                        + "enregistrée à chaque ouverture de cet onglet : à partir du mois prochain, "
                                        + "l'évolution sera mesurée et non plus reconstituée."
                                : "Valeur du stock MESURÉE : chaque mois affiché vient d'une photo enregistrée.");
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

    private Map<String, JSONObject> photos(Periode fenetre) {
        Map<String, JSONObject> photos = new LinkedHashMap<>();
        try {
            Query q = em.createNativeQuery(PilotageSql.photosStock(), Tuple.class);
            q.setParameter("emplacement", PilotageSql.EMPLACEMENT_OFFICINE);
            q.setParameter("moisDebut", fenetre.debut.toString().substring(0, 7));
            q.setParameter("moisFin", fenetre.fin.toString().substring(0, 7));
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                photos.put(t.get("mois", String.class),
                        new JSONObject().put("unites", nombre(t.get("unites")))
                                .put("valeurAchat", nombre(t.get("valeurAchat")))
                                .put("valeurVente", nombre(t.get("valeurVente"))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : photos du stock", e);
        }
        return photos;
    }

    /**
     * Enregistre la photo du stock pour le mois en cours, si elle n'existe pas deja.
     *
     * <p>
     * Appelee a l'ouverture de l'onglet Stock. Ecrire a la lecture n'est pas anodin, et c'est assume : sans cela,
     * l'officine devrait penser a declencher la photo elle-meme, et l'historique ne se constituerait jamais. L'ecriture
     * est idempotente - le mois est la cle - donc ouvrir l'ecran dix fois dans la journee n'ecrit qu'une ligne.
     *
     * <p>
     * La photo du mois est ECRASEE tant que le mois est en cours, pour qu'elle reflete le dernier etat connu ; une fois
     * le mois passe, elle ne bouge plus.
     */
    public JSONObject photographierStock() {
        try {
            Etat etat = etatDuStock();
            String mois = LocalDate.now().toString().substring(0, 7);
            em.createNativeQuery(
                    "DELETE FROM pilotage_stock_mensuel WHERE str_MOIS = ?1" + " AND lg_EMPLACEMENT_ID = ?2")
                    .setParameter(1, mois).setParameter(2, PilotageSql.EMPLACEMENT_OFFICINE).executeUpdate();
            em.createNativeQuery("INSERT INTO pilotage_stock_mensuel (str_MOIS, int_UNITES, int_VALEUR_ACHAT,"
                    + " int_VALEUR_VENTE, int_REFERENCES, int_RUPTURES, int_NEGATIFS, int_SOUS_SEUIL,"
                    + " lg_EMPLACEMENT_ID, dt_CREATED) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NOW())")
                    .setParameter(1, mois).setParameter(2, Math.round(etat.unites))
                    .setParameter(3, Math.round(etat.valeurAchat)).setParameter(4, Math.round(etat.valeurVente))
                    .setParameter(5, etat.lignes).setParameter(6, etat.ruptures).setParameter(7, etat.negatifs)
                    .setParameter(8, etat.sousSeuil).setParameter(9, PilotageSql.EMPLACEMENT_OFFICINE).executeUpdate();
            return new JSONObject().put("success", true).put("mois", mois).put("message",
                    "Photo du stock enregistrée pour " + libelleMois(mois) + ".");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pilotage : photo du stock", e);
            return new JSONObject().put("success", false).put("message",
                    "La photo du stock n'a pas pu être enregistrée.");
        }
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
        double annuleesCourant = valeur(axe.courante, PilotageSql.totalAnnulations(), "nbAnnulees");
        double montantAnnuleCourant = valeur(axe.courante, PilotageSql.totalAnnulations(), "montantAnnule");
        Double annuleesReference = axe.reference == null ? null
                : valeur(axe.reference, PilotageSql.totalAnnulations(), "nbAnnulees");
        Totaux courant = totaux(axe.courante);
        Totaux reference = axe.reference == null ? null : totaux(axe.reference);

        JSONArray tuiles = new JSONArray();
        tuiles.put(tuile("negatifs", "Stock négatif", etat.negatifs, null, "", "lignes à corriger côté saisie"));
        tuiles.put(tuile("sansPrix", "En stock sans prix", anomalies.sansPrixAchat + anomalies.sansPrixVente, null, "",
                "fausse toute valorisation"));
        tuiles.put(tuile("sansRayon", "En stock sans rayon", anomalies.sansRayon, null, "",
                "échappe aux inventaires tournants"));
        tuiles.put(tuile("sansSeuil", "En stock sans seuil", anomalies.sansSeuil, null, "",
                "n'entre dans aucune suggestion de réappro"));
        tuiles.put(tuile("annulees", "Ventes annulées", annuleesCourant, annuleesReference, "",
                Math.round(montantAnnuleCourant) + " FCFA annulés sur la période"));
        tuiles.put(tuile("remises", "Remises accordées", courant.remises, reference == null ? null : reference.remises,
                "FCFA", courant.caTTC == 0 ? null : pourcent(courant.remises / courant.caTTC * 100d) + " du CA"));

        Map<String, JSONObject> lignes = moisDeLaFenetre(axe.graphique);
        for (Tuple t : liste(PilotageSql.ventesParMois(), axe.graphique)) {
            ligne(lignes, t.get("mois", String.class)).put("caTTC", nombre(t.get("caTTC")))
                    .put("nbVentes", entier(t.get("nbVentes"))).put("remises", nombre(t.get("remises")));
        }
        for (Tuple t : liste(PilotageSql.annulationsParMois(), axe.graphique)) {
            ligne(lignes, t.get("mois", String.class)).put("nbAnnulees", entier(t.get("nbAnnulees")))
                    .put("montantAnnule", nombre(t.get("montantAnnule")));
        }
        JSONArray mois = finaliser(lignes);
        for (int i = 0; i < mois.length(); i++) {
            JSONObject m = mois.getJSONObject(i);
            double ca = m.optDouble("caTTC", 0d);
            int ventes = m.optInt("nbVentes", 0);
            m.put("tauxRemise", ca == 0 ? 0 : arrondi(m.optDouble("remises", 0d) / ca * 100d));
            m.put("tauxAnnulation", ventes == 0 ? 0 : arrondi(m.optInt("nbAnnulees", 0) / (double) ventes * 100d));
        }
        return new JSONObject().put("tuiles", tuiles).put("mois", mois).put("note",
                "Les indicateurs de référentiel (prix, rayon, seuil) décrivent l'ÉTAT DU JOUR et ne dépendent "
                        + "pas de la période ; les annulations et les remises, elles, suivent la période "
                        + "choisie.");
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
            Filtres filtres) throws net.sf.jasperreports.engine.JRException {
        JSONObject donnees = donnees(operateur, onglet, codeAxe, debutPerso, finPerso, filtres);
        List<String[]> colonnes = colonnes(onglet, donnees);
        JSONArray mois = donnees.optJSONArray("mois");
        List<LignePilotage> lignes = new ArrayList<>();
        for (int i = 0; mois != null && i < mois.length(); i++) {
            JSONObject m = mois.getJSONObject(i);
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
            Filtres filtres) throws java.io.IOException {
        JSONObject donnees = donnees(operateur, onglet, codeAxe, debutPerso, finPerso, filtres);
        List<String[]> colonnes = colonnes(onglet, donnees);
        String[] entetes = new String[colonnes.size() + 1];
        entetes[0] = "MOIS";
        for (int c = 0; c < colonnes.size(); c++) {
            entetes[c + 1] = colonnes.get(c)[1];
        }
        JSONArray mois = donnees.optJSONArray("mois");
        List<JSONObject> lignes = new ArrayList<>();
        for (int i = 0; mois != null && i < mois.length(); i++) {
            lignes.add(mois.getJSONObject(i));
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
        private final Double[] valeurs = new Double[COLONNES];

        LignePilotage(String libelle) {
            this.libelle = libelle;
        }

        void set(int index, double valeur) {
            valeurs[index] = valeur;
        }

        public String getLibelle() {
            return libelle;
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

    /** Totaux d'une periode : trois requetes, et aucune addition de mois entiers. */
    Totaux totaux(Periode periode) {
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
        int nbVentes;
        int nbBons;

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

    /** Cle technique d'un mode de reglement : le libelle sans accent ni espace, pour servir de nom de colonne. */
    static String cle(String libelle) {
        return java.text.Normalizer.normalize(StringUtils.defaultString(libelle), java.text.Normalizer.Form.NFD)
                .replaceAll("[^A-Za-z0-9]", "").toUpperCase(java.util.Locale.ROOT);
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
