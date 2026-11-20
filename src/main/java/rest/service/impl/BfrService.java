package rest.service.impl;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ProduitService;
import rest.service.ReglementFournisseurService;

/**
 * Plan du 19/11 : besoin en fonds de roulement (carte du tableau de bord et menu « BFR » d'ANALYSE DE GESTION, memes
 * chiffres : une seule lecture). Lecture seule.
 *
 * Sources : stock valorise au prix d'achat (valorisationStock, rayon + reserve) ; creances clients : differes (solde
 * global du releve des differes), factures tiers payant non reglees (reste des factures), parts tiers payant non
 * facturees (memes ventes que la carte « Encours tiers payants », toutes dates) ; dettes fournisseurs : « A regler » de
 * l'onglet « Reglements fournisseurs » (BL depuis la date de depart du suivi). CA HT des 360 derniers jours : regle de
 * l'Analyse des marges. Calcul : {@link BfrRegles}.
 */
@Stateless
public class BfrService {

    private static final Logger LOG = Logger.getLogger(BfrService.class.getName());
    private static final DateTimeFormatter JJ = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    static final String NON_SUIVI = "non suivi dans Prestige";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private ProduitService produitService;
    @EJB
    private ReglementFournisseurService reglementsFournisseurs;
    @EJB
    private AnalyseMargesService analyseMarges;

    private static long n(Object o) {
        return o == null ? 0 : Math.round(((Number) o).doubleValue());
    }

    /** Lignes (organisme, nombre, montant) et leur total. */
    @SuppressWarnings("unchecked")
    private JSONObject parOrganisme(String sql) {
        JSONArray l = new JSONArray();
        long total = 0, nombre = 0;
        for (Object[] r : (List<Object[]>) em.createNativeQuery(sql).getResultList()) {
            long m = n(r[2]), c = n(r[1]);
            l.put(new JSONObject().put("organisme", StringUtils.defaultIfBlank((String) r[0], "(sans organisme)"))
                    .put("nombre", c).put("montant", m));
            total += m;
            nombre += c;
        }
        return new JSONObject().put("total", total).put("nombre", nombre).put("data", l);
    }

    /** Factures tiers payant non reglees : reste des factures, par organisme. */
    JSONObject factures() {
        return parOrganisme("SELECT tp.str_FULLNAME AS organisme, COUNT(*) AS nombre,"
                + " SUM(f.dbl_MONTANT_RESTANT) AS montant FROM t_facture f"
                + " LEFT JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = f.str_CUSTOMER"
                + " WHERE f.dbl_MONTANT_RESTANT > 0 GROUP BY f.str_CUSTOMER, tp.str_FULLNAME ORDER BY montant DESC");
    }

    /**
     * Parts tiers payant non facturees : memes ventes que la carte « Encours tiers payants » (vente close, non annulee,
     * part « unpaid », organisme d'un type connu), toutes dates, par organisme.
     */
    JSONObject parts() {
        return parOrganisme("SELECT tp.str_FULLNAME AS organisme, COUNT(*) AS nombre, SUM(c.int_PRICE) AS montant"
                + " FROM t_tiers_payant tp"
                + " JOIN t_compte_client_tiers_payant cc ON tp.lg_TIERS_PAYANT_ID = cc.lg_TIERS_PAYANT_ID"
                + " JOIN t_preenregistrement_compte_client_tiers_payent c"
                + " ON cc.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
                + " JOIN t_preenregistrement p ON c.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
                + " JOIN t_type_tiers_payant ty ON ty.lg_TYPE_TIERS_PAYANT_ID = tp.lg_TYPE_TIERS_PAYANT_ID"
                + " WHERE p.str_STATUT = 'is_Closed' AND c.str_STATUT_FACTURE = 'unpaid' AND p.b_IS_CANCEL = 0"
                + " AND p.int_PRICE > 0 GROUP BY tp.lg_TIERS_PAYANT_ID, tp.str_FULLNAME ORDER BY montant DESC");
    }

    public JSONObject calculer(String emplacement) {
        long t0 = System.currentTimeMillis();
        try {
            LocalDate jour = LocalDate.now();
            JSONObject v = produitService.valorisationStock(0, jour, null, null, null, null, null, emplacement)
                    .getJSONObject("data");
            long rayon = v.optLong("value"), reserve = v.optLong("reserveValue"), stock = v.optLong("totalValue");
            long differes = ReglementServiceImpl.soldeDifferes(em, emplacement);
            JSONObject factures = factures(), parts = parts();
            long creances = BfrRegles.creances(differes, factures.getLong("total"), parts.getLong("total"));
            JSONObject aRegler = reglementsFournisseurs.aRegler();
            long dettes = aRegler.optLong("total");
            JSONArray grossistes = new JSONArray();
            JSONArray g = aRegler.optJSONArray("data");
            for (int i = 0; g != null && i < g.length(); i++) {
                JSONObject x = g.getJSONObject(i);
                grossistes.put(new JSONObject().put("grossiste", x.optString("grossiste"))
                        .put("nombre", x.optLong("nombre")).put("montant", x.optLong("total")));
            }
            LocalDate debutCa = BfrRegles.debutCa(jour);
            long caHt = analyseMarges.caHt(debutCa, jour, emplacement);
            long bfr = BfrRegles.bfr(stock, creances, dettes);
            Double jours = BfrRegles.jours(bfr, caHt);
            String depart = aRegler.optString("depart");
            return new JSONObject().put("success", true).put("date", jour.format(JJ)).put("dateIso", jour.toString())
                    .put("stock", new JSONObject().put("total", stock).put("rayon", rayon).put("reserve", reserve))
                    .put("creances",
                            new JSONObject().put("total", creances).put("differes", differes)
                                    .put("factures", factures.getLong("total"))
                                    .put("nombreFactures", factures.getLong("nombre"))
                                    .put("parts", parts.getLong("total")).put("nombreParts", parts.getLong("nombre"))
                                    .put("autres", 0).put("autresLibelle", NON_SUIVI))
                    .put("dettes",
                            new JSONObject().put("total", dettes).put("fournisseurs", dettes)
                                    .put("nombreBl", aRegler.optLong("nombre")).put("fiscalesSociales", 0)
                                    .put("autres", 0).put("nonSuivi", NON_SUIVI))
                    .put("bfr", bfr).put("caHt", caHt).put("caDebut", debutCa.format(JJ)).put("caFin", jour.format(JJ))
                    .put("caDebutIso", debutCa.toString()).put("baseJours", BfrRegles.BASE_JOURS)
                    .put("jours", jours == null ? JSONObject.NULL : jours).put("joursCalculable", jours != null)
                    .put("depart", depart).put("departIso", aRegler.optString("departIso"))
                    .put("mention", "Dettes fournisseurs suivies depuis le " + depart)
                    .put("detail",
                            new JSONObject().put("factures", factures.getJSONArray("data"))
                                    .put("parts", parts.getJSONArray("data")).put("grossistes", grossistes))
                    .put("dureeMs", System.currentTimeMillis() - t0);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "BFR", e);
            return new JSONObject().put("success", false).put("erreur", true).put("msg",
                    "Le BFR n'a pas pu être calculé.");
        }
    }
}
