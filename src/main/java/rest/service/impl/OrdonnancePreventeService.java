package rest.service.impl;

import commonTasks.dto.SalesParams;
import commonTasks.dto.TiersPayantParams;
import dal.TUser;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.SalesService;
import util.Constant;

/**
 * PREVENTE creee depuis une ordonnance client (retour du 30/09).
 *
 * <p>
 * La prevente est une vente ordinaire, en attente, creee par les MEMES services que l'ecran de vente
 * ({@link SalesService#createPreVente}, {@link SalesService#createPreVenteVo},
 * {@link SalesService#addPreenregistrementItem}) : memes controles de stock, memes prix, memes tiers payants. Elle se
 * reprend ensuite a la caisse, dans la liste des preventes, et s'y cloture comme n'importe quelle autre. L'ecran de
 * vente n'est pas modifie.
 *
 * <p>
 * Ce service ne change rien a l'ordonnance : il ecrit seulement le LIEN ordonnance - prevente
 * (t_ordonnance_client_prevente). Les regles (type de vente, quantites, lignes ecartees) sont dans
 * {@link PreventeOrdonnance}.
 */
@Stateless
public class OrdonnancePreventeService {

    private static final Logger LOG = Logger.getLogger(OrdonnancePreventeService.class.getName());

    /** Nature de vente « PRESCRIPTION », celle que l'ecran de vente pose par defaut. */
    private static final String NATURE_PRESCRIPTION = "1";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private SalesService salesService;

    /** Ce qui serait cree, sans rien creer : l'ecran le montre avant de demander confirmation. */
    public JSONObject apercu(String ordonnanceId) {
        try {
            Plan plan = plan(ordonnanceId);
            return plan.enJson().put("success", plan.refus == null).put("message", plan.refus == null ? "" : plan.refus)
                    .put("preventes", preventes(ordonnanceId));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "apercu de la prevente d'une ordonnance", e);
            return new JSONObject().put("success", false).put("message", "La prévente n'a pas pu être préparée.");
        }
    }

    /** Cree la prevente et garde son lien avec l'ordonnance. */
    public JSONObject creer(String ordonnanceId, TUser operateur) {
        Plan plan;
        try {
            plan = plan(ordonnanceId);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "prevente d'une ordonnance : preparation", e);
            return new JSONObject().put("success", false).put("message", "La prévente n'a pas pu être préparée.");
        }
        if (plan.refus != null) {
            return plan.enJson().put("success", false).put("message", plan.refus);
        }
        String venteId = null;
        String ref = null;
        List<JSONObject> ajoutees = new ArrayList<>();
        List<JSONObject> ecartees = new ArrayList<>(plan.ecartees());
        for (PreventeOrdonnance.Decision d : plan.decisions) {
            if (!d.retenue()) {
                continue;
            }
            SalesParams p = parametres(plan, d, venteId, operateur);
            JSONObject r;
            if (venteId == null) {
                r = PreventeOrdonnance.VENTE_COMPTANT.equals(plan.typeVente) ? salesService.createPreVente(p)
                        : salesService.createPreVenteVo(p);
            } else {
                String motif = salesService.controleAjoutProduit(p);
                r = motif != null ? new JSONObject().put("success", false).put("msg", motif)
                        : salesService.addPreenregistrementItem(p);
            }
            if (r != null && r.optBoolean("success", false)) {
                JSONObject data = r.optJSONObject("data");
                if (venteId == null && data != null) {
                    venteId = data.optString("lgPREENREGISTREMENTID", null);
                    ref = data.optString("strREF", "");
                }
                ajoutees.add(new JSONObject().put("libelle", d.ligne.libelle).put("quantite", d.quantite));
            } else {
                /* Le motif de la caisse elle-meme : stock a forcer, detail invendable... */
                ecartees.add(new JSONObject().put("libelle", d.ligne.libelle).put("motif",
                        r == null ? "refusé par la caisse" : r.optString("msg", "refusé par la caisse")));
            }
        }
        if (venteId == null) {
            return plan.enJson().put("success", false).put("ecartees", new JSONArray(ecartees)).put("message",
                    "Aucun produit n'a pu être mis en prévente.");
        }
        em.createNativeQuery("INSERT INTO t_ordonnance_client_prevente (lg_LIEN_ID, lg_ORDONNANCE_ID,"
                + " lg_PREENREGISTREMENT_ID, str_REF, str_TYPE_VENTE, int_NB_LIGNES, lg_USER_ID, dt_CREATED)"
                + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)").setParameter(1, UUID.randomUUID().toString())
                .setParameter(2, ordonnanceId).setParameter(3, venteId).setParameter(4, ref)
                .setParameter(5, plan.typeVente).setParameter(6, ajoutees.size())
                .setParameter(7, operateur == null ? null : operateur.getLgUSERID()).setParameter(8, new Date())
                .executeUpdate();
        return plan.enJson().put("success", true).put("venteId", venteId).put("ref", ref)
                .put("ajoutees", new JSONArray(ajoutees)).put("ecartees", new JSONArray(ecartees))
                .put("message", "Prévente " + ref + " créée : reprenez-la à la caisse, dans la liste des préventes.");
    }

    /** Les preventes deja nees de cette ordonnance, avec leur etat actuel a la caisse. */
    @SuppressWarnings("unchecked")
    public JSONArray preventes(String ordonnanceId) {
        JSONArray sortie = new JSONArray();
        List<Tuple> lignes = em.createNativeQuery("SELECT l.lg_PREENREGISTREMENT_ID AS venteId, l.str_REF AS ref,"
                + " l.str_TYPE_VENTE AS typeVente, l.int_NB_LIGNES AS nb, l.dt_CREATED AS creeLe,"
                + " p.str_STATUT AS statut, p.str_REF AS refVente, p.int_PRICE AS montant,"
                + " COALESCE(p.b_IS_CANCEL, 0) AS annulee, l.dt_REPORT_SERVICE AS reporte, l.int_QTE_REPORTEE AS qteReportee"
                + " FROM t_ordonnance_client_prevente l"
                + " LEFT JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = l.lg_PREENREGISTREMENT_ID"
                + " WHERE l.lg_ORDONNANCE_ID = ?1 ORDER BY l.dt_CREATED DESC", Tuple.class)
                .setParameter(1, ordonnanceId).getResultList();
        for (Tuple t : lignes) {
            String statut = t.get("statut", String.class);
            sortie.put(new JSONObject().put("venteId", t.get("venteId", String.class))
                    .put("ref", StringUtils.defaultIfBlank(t.get("refVente", String.class), t.get("ref", String.class)))
                    .put("typeVente", PreventeOrdonnance.libelleTypeVente(t.get("typeVente", String.class)))
                    .put("lignes", entier(t.get("nb"))).put("montant", entier(t.get("montant")))
                    .put("creeLe", t.get("creeLe") == null ? "" : String.valueOf(t.get("creeLe")))
                    .put("etat",
                            entier(t.get("annulee")) == 1 ? "Annulée à la caisse"
                                    : etat(statut) + (t.get("reporte") != null
                                            ? " — " + entier(t.get("qteReportee")) + " servi(s) reporté(s)" : ""))
                    .put("enAttente", Constant.STATUT_PENDING.equals(statut)));
        }
        return sortie;
    }

    /**
     * Report du SERVICE (retour du 30/09) : une prevente nee d'une ordonnance et CLOTUREE a la caisse met a jour la
     * quantite servie des lignes de l'ordonnance, avec ce qui a ete reellement vendu. Une vente reportee puis ANNULEE
     * voit son report defait.
     *
     * <p>
     * Appele a la lecture (fiche, historique, analyse, editions) : la cloture de la caisse n'est pas modifiee. Chaque
     * prevente n'est reportee qu'UNE fois : la ligne de lien est marquee dans la meme transaction, et l'UPDATE
     * conditionnel empeche deux lectures simultanees de reporter deux fois.
     *
     * @param ordonnanceId
     *            une ordonnance, ou null pour toutes
     *
     * @return le nombre de preventes reportees ou defaites
     */
    @SuppressWarnings("unchecked")
    public int reporterServices(String ordonnanceId) {
        int traitees = 0;
        try {
            String filtre = StringUtils.isBlank(ordonnanceId) ? "" : " AND l.lg_ORDONNANCE_ID = :ordonnance";
            javax.persistence.Query aReporter = em.createNativeQuery("SELECT l.lg_LIEN_ID AS lien,"
                    + " l.lg_ORDONNANCE_ID AS ordonnance, l.lg_PREENREGISTREMENT_ID AS vente"
                    + " FROM t_ordonnance_client_prevente l JOIN t_preenregistrement p"
                    + " ON p.lg_PREENREGISTREMENT_ID = l.lg_PREENREGISTREMENT_ID"
                    + " WHERE l.dt_REPORT_SERVICE IS NULL AND p.str_STATUT = :cloturee AND COALESCE(p.b_IS_CANCEL, 0) = 0"
                    + filtre, Tuple.class).setParameter("cloturee", Constant.STATUT_IS_CLOSED);
            javax.persistence.Query aDefaire = em.createNativeQuery(
                    "SELECT l.lg_LIEN_ID AS lien," + " l.lg_ORDONNANCE_ID AS ordonnance, l.str_REPORT AS report"
                            + " FROM t_ordonnance_client_prevente l JOIN t_preenregistrement p"
                            + " ON p.lg_PREENREGISTREMENT_ID = l.lg_PREENREGISTREMENT_ID"
                            + " WHERE l.dt_REPORT_SERVICE IS NOT NULL AND l.dt_ANNULATION_REPORT IS NULL"
                            + " AND COALESCE(p.b_IS_CANCEL, 0) = 1" + filtre,
                    Tuple.class);
            if (!filtre.isEmpty()) {
                aReporter.setParameter("ordonnance", ordonnanceId);
                aDefaire.setParameter("ordonnance", ordonnanceId);
            }
            for (Tuple t : (List<Tuple>) aReporter.getResultList()) {
                if (reporter(t.get("lien", String.class), t.get("ordonnance", String.class),
                        t.get("vente", String.class))) {
                    traitees++;
                }
            }
            for (Tuple t : (List<Tuple>) aDefaire.getResultList()) {
                if (defaire(t.get("lien", String.class), t.get("report", String.class))) {
                    traitees++;
                }
            }
        } catch (Exception e) {
            /*
             * Un report manque ne doit jamais empecher de lire les ordonnances : il sera refait a la lecture suivante.
             */
            LOG.log(Level.SEVERE, "report du service des preventes cloturees", e);
        }
        return traitees;
    }

    @SuppressWarnings("unchecked")
    private boolean reporter(String lienId, String ordonnanceId, String venteId) {
        /* On prend la ligne de lien : si une autre lecture l'a deja fait, on s'arrete. */
        int pris = em
                .createNativeQuery("UPDATE t_ordonnance_client_prevente SET dt_REPORT_SERVICE = ?1"
                        + " WHERE lg_LIEN_ID = ?2 AND dt_REPORT_SERVICE IS NULL")
                .setParameter(1, new Date()).setParameter(2, lienId).executeUpdate();
        if (pris != 1) {
            return false;
        }
        java.util.Map<String, Integer> vendus = new java.util.HashMap<>();
        for (Tuple t : (List<Tuple>) em
                .createNativeQuery("SELECT d.lg_FAMILLE_ID AS article,"
                        + " SUM(d.int_QUANTITY) AS qte FROM t_preenregistrement_detail d"
                        + " WHERE d.lg_PREENREGISTREMENT_ID = ?1 GROUP BY d.lg_FAMILLE_ID", Tuple.class)
                .setParameter(1, venteId).getResultList()) {
            vendus.put(t.get("article", String.class), entier(t.get("qte")));
        }
        List<PreventeOrdonnance.LigneService> lignes = new ArrayList<>();
        for (Tuple t : (List<Tuple>) em
                .createNativeQuery("SELECT d.lg_DETAIL_ID AS id, d.lg_FAMILLE_ID AS article,"
                        + " d.int_QUANTITE AS prescrite, d.int_QTE_SERVIE AS servie FROM t_ordonnance_client_detail d"
                        + " WHERE d.lg_ORDONNANCE_ID = ?1 ORDER BY d.int_ORDRE", Tuple.class)
                .setParameter(1, ordonnanceId).getResultList()) {
            Object servie = t.get("servie");
            lignes.add(new PreventeOrdonnance.LigneService(t.get("id", String.class), t.get("article", String.class),
                    entier(t.get("prescrite")), servie == null ? null : entier(servie)));
        }
        List<PreventeOrdonnance.Report> reports = PreventeOrdonnance.repartir(lignes, vendus);
        JSONArray trace = new JSONArray();
        int total = 0;
        for (PreventeOrdonnance.Report r : reports) {
            em.createNativeQuery("UPDATE t_ordonnance_client_detail SET int_QTE_SERVIE = ?1 WHERE lg_DETAIL_ID = ?2")
                    .setParameter(1, r.apres).setParameter(2, r.detailId).executeUpdate();
            trace.put(new JSONObject().put("d", r.detailId).put("a", r.avant == null ? JSONObject.NULL : r.avant)
                    .put("p", r.apres));
            total += r.ajoute();
        }
        em.createNativeQuery("UPDATE t_ordonnance_client_prevente SET int_QTE_REPORTEE = ?1, str_REPORT = ?2"
                + " WHERE lg_LIEN_ID = ?3").setParameter(1, total).setParameter(2, trace.toString())
                .setParameter(3, lienId).executeUpdate();
        return true;
    }

    private boolean defaire(String lienId, String report) {
        int pris = em
                .createNativeQuery("UPDATE t_ordonnance_client_prevente SET dt_ANNULATION_REPORT = ?1"
                        + " WHERE lg_LIEN_ID = ?2 AND dt_ANNULATION_REPORT IS NULL")
                .setParameter(1, new Date()).setParameter(2, lienId).executeUpdate();
        if (pris != 1) {
            return false;
        }
        JSONArray trace = new JSONArray(StringUtils.defaultIfBlank(report, "[]"));
        for (int i = 0; i < trace.length(); i++) {
            JSONObject o = trace.getJSONObject(i);
            PreventeOrdonnance.Report r = new PreventeOrdonnance.Report(o.getString("d"),
                    o.isNull("a") ? null : o.getInt("a"), o.getInt("p"));
            Object actuelle = em
                    .createNativeQuery(
                            "SELECT int_QTE_SERVIE FROM t_ordonnance_client_detail" + " WHERE lg_DETAIL_ID = ?1")
                    .setParameter(1, r.detailId).getResultList().stream().findFirst().orElse(null);
            Integer nouvelle = PreventeOrdonnance.defaire(r, actuelle == null ? null : entier(actuelle));
            em.createNativeQuery("UPDATE t_ordonnance_client_detail SET int_QTE_SERVIE = ?1 WHERE lg_DETAIL_ID = ?2")
                    .setParameter(1, nouvelle).setParameter(2, r.detailId).executeUpdate();
        }
        return true;
    }

    static String etat(String statut) {
        if (statut == null) {
            return "Supprimée";
        }
        if (Constant.STATUT_PENDING.equals(statut)) {
            return "En attente à la caisse";
        }
        if (Constant.STATUT_IS_CLOSED.equals(statut)) {
            return "Clôturée";
        }
        if (Constant.STATUT_IS_PROGRESS.equals(statut)) {
            return "En cours à la caisse";
        }
        return statut;
    }

    /* ------------------------------------------------------------------------------------------------ plan */

    /** Ce que la prevente contiendra : type de vente, tiers payant, decision par ligne ; ou le refus. */
    static final class Plan {
        String refus;
        String typeVente;
        String clientId;
        String client;
        String typeClient;
        String ayantDroitId;
        TiersPayantParams tiersPayant;
        String tiersPayantNom = "";
        List<PreventeOrdonnance.Decision> decisions = new ArrayList<>();

        List<JSONObject> ecartees() {
            List<JSONObject> l = new ArrayList<>();
            for (PreventeOrdonnance.Decision d : decisions) {
                if (!d.retenue()) {
                    l.add(new JSONObject().put("libelle", d.ligne.libelle).put("motif", d.motif));
                }
            }
            return l;
        }

        JSONObject enJson() {
            JSONArray retenues = new JSONArray();
            for (PreventeOrdonnance.Decision d : decisions) {
                if (d.retenue()) {
                    retenues.put(new JSONObject().put("libelle", d.ligne.libelle).put("quantite", d.quantite)
                            .put("prix", d.ligne.prix));
                }
            }
            return new JSONObject().put("typeVente", typeVente == null ? "" : typeVente)
                    .put("typeVenteLibelle", typeVente == null ? "" : PreventeOrdonnance.libelleTypeVente(typeVente))
                    .put("client", StringUtils.defaultString(client))
                    .put("typeClient", StringUtils.defaultString(typeClient)).put("tiersPayant", tiersPayantNom)
                    .put("retenues", retenues).put("ecartees", new JSONArray(ecartees()));
        }
    }

    @SuppressWarnings("unchecked")
    private Plan plan(String ordonnanceId) {
        Plan plan = new Plan();
        List<Tuple> tetes = em
                .createNativeQuery("SELECT o.str_STATUT AS statut, o.lg_CLIENT_ID AS clientId,"
                        + " TRIM(CONCAT(COALESCE(c.str_FIRST_NAME, ''), ' ', COALESCE(c.str_LAST_NAME, ''))) AS client,"
                        + " c.lg_TYPE_CLIENT_ID AS typeClientId, t.str_NAME AS typeClient,"
                        + " c.str_NUMERO_SECURITE_SOCIAL AS nss, c.str_CODE_INTERNE AS codeInterne"
                        + " FROM t_ordonnance_client o JOIN t_client c ON c.lg_CLIENT_ID = o.lg_CLIENT_ID"
                        + " LEFT JOIN t_type_client t ON t.lg_TYPE_CLIENT_ID = c.lg_TYPE_CLIENT_ID"
                        + " WHERE o.lg_ORDONNANCE_ID = ?1", Tuple.class)
                .setParameter(1, StringUtils.defaultString(ordonnanceId)).getResultList();
        if (tetes.isEmpty()) {
            plan.refus = "Ordonnance introuvable : enregistrez-la d'abord.";
            return plan;
        }
        Tuple o = tetes.get(0);
        if ("annulee".equals(o.get("statut", String.class))) {
            plan.refus = "Cette ordonnance est annulée : elle ne peut plus donner lieu à une prévente.";
            return plan;
        }
        plan.clientId = o.get("clientId", String.class);
        plan.client = o.get("client", String.class);
        plan.typeClient = o.get("typeClient", String.class);
        String typeClientId = o.get("typeClientId", String.class);
        tiersPayantPrincipal(plan);
        plan.refus = PreventeOrdonnance.refusClient(typeClientId, plan.typeClient, plan.tiersPayant != null);
        if (plan.refus != null) {
            return plan;
        }
        plan.typeVente = PreventeOrdonnance.typeVente(typeClientId, plan.tiersPayant != null);
        if (PreventeOrdonnance.VENTE_ASSURANCE.equals(plan.typeVente)) {
            plan.ayantDroitId = ayantDroit(plan.clientId, plan.client, o.get("nss", String.class),
                    o.get("codeInterne", String.class));
        }
        List<Tuple> details = em.createNativeQuery("SELECT d.lg_FAMILLE_ID AS articleId, d.str_LIBELLE AS libelle,"
                + " d.int_QUANTITE AS prescrite, d.int_QTE_SERVIE AS servie, f.int_PRICE AS prix, f.str_STATUT AS statut"
                + " FROM t_ordonnance_client_detail d LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                + " WHERE d.lg_ORDONNANCE_ID = ?1 ORDER BY d.int_ORDRE", Tuple.class).setParameter(1, ordonnanceId)
                .getResultList();
        List<PreventeOrdonnance.Ligne> lignes = new ArrayList<>();
        for (Tuple d : details) {
            String articleId = d.get("articleId", String.class);
            Object servie = d.get("servie");
            lignes.add(new PreventeOrdonnance.Ligne(articleId, d.get("libelle", String.class),
                    entier(d.get("prescrite")), servie == null ? null : entier(servie), stockVendable(articleId),
                    entier(d.get("prix")), Constant.STATUT_ENABLE.equals(d.get("statut", String.class))));
        }
        plan.decisions = PreventeOrdonnance.decider(lignes);
        if (plan.decisions.isEmpty()) {
            plan.refus = "L'ordonnance n'a aucun produit.";
        } else if (plan.decisions.stream().noneMatch(PreventeOrdonnance.Decision::retenue)) {
            plan.refus = "Aucun produit de l'ordonnance ne peut être mis en prévente : voir les motifs.";
        }
        return plan;
    }

    /** Stock vendable a la caisse de l'operateur : le MEME calcul que l'ecran de vente. */
    private int stockVendable(String articleId) {
        if (StringUtils.isBlank(articleId)) {
            return 0;
        }
        try {
            JSONObject r = salesService.stockVendableProduit(articleId, null);
            return r.optBoolean("success", false) ? r.optInt("stockVendable", 0) : 0;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "stock vendable pour la prevente", e);
            return 0;
        }
    }

    /**
     * Tiers payant PRINCIPAL : le lien actif de plus petite priorite, sur un tiers payant actif - celui que l'ecran de
     * vente propose en premier.
     */
    @SuppressWarnings("unchecked")
    private void tiersPayantPrincipal(Plan plan) {
        List<Tuple> tps = em
                .createNativeQuery("SELECT l.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AS compteTp,"
                        + " COALESCE(l.int_POURCENTAGE, 0) AS taux,"
                        + " COALESCE(NULLIF(TRIM(tp.str_FULLNAME), ''), tp.str_NAME) AS nom"
                        + " FROM t_compte_client_tiers_payant l"
                        + " JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID"
                        + " JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = l.lg_TIERS_PAYANT_ID"
                        + " WHERE cc.lg_CLIENT_ID = ?1 AND l.str_STATUT = 'enable' AND tp.str_STATUT = 'enable'"
                        + " ORDER BY COALESCE(l.int_PRIORITY, 2147483646), l.dt_CREATED", Tuple.class)
                .setParameter(1, plan.clientId).setMaxResults(1).getResultList();
        if (tps.isEmpty()) {
            return;
        }
        TiersPayantParams tp = new TiersPayantParams();
        tp.setCompteTp(tps.get(0).get("compteTp", String.class));
        tp.setTaux(entier(tps.get(0).get("taux")));
        tp.setNumBon("");
        tp.setCmu(false);
        plan.tiersPayant = tp;
        plan.tiersPayantNom = StringUtils.defaultString(tps.get(0).get("nom", String.class));
    }

    /**
     * Ayant droit de la vente assurance, choisi comme l'ecran de vente : le seul s'il n'y en a qu'un, sinon celui qui
     * est le client lui-meme (meme numero de securite sociale, meme code interne ou meme nom).
     */
    @SuppressWarnings("unchecked")
    private String ayantDroit(String clientId, String nomClient, String nss, String codeInterne) {
        List<Tuple> ads = em.createNativeQuery(
                "SELECT a.lg_AYANTS_DROITS_ID AS id, a.str_NUMERO_SECURITE_SOCIAL AS nss,"
                        + " a.str_CODE_INTERNE AS code,"
                        + " TRIM(CONCAT(COALESCE(a.str_FIRST_NAME, ''), ' ', COALESCE(a.str_LAST_NAME, ''))) AS nom"
                        + " FROM t_ayant_droit a WHERE a.lg_CLIENT_ID = ?1 AND (a.str_STATUT IS NULL OR a.str_STATUT = 'enable')",
                Tuple.class).setParameter(1, clientId).getResultList();
        if (ads.size() == 1) {
            return ads.get(0).get("id", String.class);
        }
        for (Tuple a : ads) {
            if ((StringUtils.isNotBlank(nss) && nss.equals(a.get("nss", String.class)))
                    || (StringUtils.isNotBlank(codeInterne) && codeInterne.equals(a.get("code", String.class)))
                    || (StringUtils.isNotBlank(nomClient) && nomClient.equalsIgnoreCase(a.get("nom", String.class)))) {
                return a.get("id", String.class);
            }
        }
        return null;
    }

    private static SalesParams parametres(Plan plan, PreventeOrdonnance.Decision d, String venteId, TUser operateur) {
        SalesParams p = new SalesParams();
        p.setTypeVenteId(plan.typeVente);
        p.setNatureVenteId(NATURE_PRESCRIPTION);
        p.setProduitId(d.ligne.articleId);
        p.setItemPu(d.ligne.prix);
        p.setQte(d.quantite);
        p.setQteServie(d.quantite);
        p.setDevis(false);
        p.setPrevente(true);
        p.setStatut(Constant.STATUT_PENDING);
        p.setVenteId(venteId);
        p.setClientId(plan.clientId);
        if (operateur != null) {
            p.setUserVendeurId(operateur.getLgUSERID());
        }
        if (!PreventeOrdonnance.VENTE_COMPTANT.equals(plan.typeVente)) {
            List<TiersPayantParams> tps = new ArrayList<>();
            tps.add(plan.tiersPayant);
            p.setTierspayants(tps);
            p.setAyantDroitId(plan.ayantDroitId);
        }
        return p;
    }

    private static int entier(Object v) {
        return v instanceof Number ? ((Number) v).intValue() : 0;
    }
}
