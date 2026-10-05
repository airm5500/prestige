package rest.service.impl;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * PRODUITS EN AVOIR D'UN BON DE LIVRAISON (demande de l'officine du 05/10) : apres l'entree en stock, ou plus tard
 * depuis l'etat de controle des achats, les produits de ce bon que des clients attendent (ventes cloturees avec un
 * avoir pas encore servi), avec le nom et le telephone du client, pour pouvoir les sortir.
 *
 * <p>
 * Lecture seule. Meme definition d'un avoir en attente que l'entree en stock, qui envoie deja la notification au client
 * (TPreenregistrementDetail.findAvoir) : ligne d'avoir, vente cloturee, quantite servie inferieure a la quantite vendue
 * ; les ventes annulees sont en plus ecartees.
 */
@Stateless
public class AvoirsBonLivraisonService {

    private static final Logger LOG = Logger.getLogger(AvoirsBonLivraisonService.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Une ligne : un produit du bon attendu par un client, pour une vente. Proprietes lues par l'edition PDF. */
    public static class Ligne {

        private final String cip, produit, client, telephone, reference, date;
        private final Integer quantiteDue, quantiteRecue;

        Ligne(String cip, String produit, String client, String telephone, String reference, String date,
                Integer quantiteDue, Integer quantiteRecue) {
            this.cip = cip;
            this.produit = produit;
            this.client = client;
            this.telephone = telephone;
            this.reference = reference;
            this.date = date;
            this.quantiteDue = quantiteDue;
            this.quantiteRecue = quantiteRecue;
        }

        public String getCip() {
            return cip;
        }

        public String getProduit() {
            return produit;
        }

        public String getClient() {
            return client;
        }

        public String getTelephone() {
            return telephone;
        }

        public String getReference() {
            return reference;
        }

        public String getDate() {
            return date;
        }

        public Integer getQuantiteDue() {
            return quantiteDue;
        }

        public Integer getQuantiteRecue() {
            return quantiteRecue;
        }

        JSONObject json() {
            return new JSONObject().put("cip", StringUtils.defaultString(cip))
                    .put("produit", StringUtils.defaultString(produit)).put("client", client)
                    .put("telephone", telephone).put("reference", reference).put("date", date)
                    .put("quantiteDue", quantiteDue).put("quantiteRecue", quantiteRecue);
        }
    }

    /** La reference du bon, ou null s'il n'existe pas. */
    public String referenceBon(String bonId) {
        @SuppressWarnings("unchecked")
        List<Object> r = em
                .createNativeQuery("SELECT str_REF_LIVRAISON FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = ?1")
                .setParameter(1, StringUtils.defaultString(bonId)).getResultList();
        return r.isEmpty() ? null : StringUtils.defaultString((String) r.get(0));
    }

    /** Les produits du bon attendus par des clients, par produit puis par date de vente. */
    @SuppressWarnings("unchecked")
    public List<Ligne> lignes(String bonId) {
        List<Ligne> sortie = new ArrayList<>();
        try {
            List<Tuple> l = em.createNativeQuery("SELECT f.int_CIP AS cip, f.str_NAME AS produit,"
                    + " TRIM(CONCAT(COALESCE(c.str_FIRST_NAME, ''), ' ', COALESCE(c.str_LAST_NAME, ''))) AS client,"
                    + " c.str_TELEPHONE AS tel, c.str_ADRESSE AS adresse,"
                    + " COALESCE(NULLIF(p.str_REF_TICKET, ''), p.str_REF) AS reference, p.dt_UPDATED AS jour,"
                    + " CASE WHEN d.int_AVOIR > 0 THEN d.int_AVOIR ELSE d.int_QUANTITY - d.int_QUANTITY_SERVED END AS due,"
                    + " r.recue AS recue"
                    + " FROM (SELECT lg_FAMILLE_ID, SUM(int_QTE_RECUE) AS recue FROM t_bon_livraison_detail"
                    + "       WHERE lg_BON_LIVRAISON_ID = ?1 GROUP BY lg_FAMILLE_ID) r"
                    + " JOIN t_preenregistrement_detail d ON d.lg_FAMILLE_ID = r.lg_FAMILLE_ID"
                    + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                    + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                    + " LEFT JOIN t_client c ON c.lg_CLIENT_ID = p.lg_CLIENT_ID"
                    + " WHERE d.b_IS_AVOIR = 1 AND d.str_STATUT = 'is_Closed' AND d.int_QUANTITY > 0"
                    + " AND d.int_QUANTITY <> d.int_QUANTITY_SERVED AND COALESCE(p.b_IS_CANCEL, 0) = 0"
                    + " ORDER BY f.str_NAME, p.dt_UPDATED", Tuple.class)
                    .setParameter(1, StringUtils.defaultString(bonId)).getResultList();
            SimpleDateFormat format = new SimpleDateFormat("dd/MM/yyyy HH:mm");
            for (Tuple t : l) {
                Object jour = t.get("jour");
                sortie.add(new Ligne(str(t.get("cip")), str(t.get("produit")), str(t.get("client")),
                        RechercheClientOrdonnance.telephone(str(t.get("tel")), str(t.get("adresse"))),
                        str(t.get("reference")), jour instanceof Date ? format.format((Date) jour) : "",
                        entier(t.get("due")), entier(t.get("recue"))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "produits en avoir du bon " + bonId, e);
        }
        return sortie;
    }

    /** La liste pour l'ecran : {success, reference, total, data[]}. */
    public JSONObject liste(String bonId) {
        String reference = referenceBon(bonId);
        if (reference == null) {
            return new JSONObject().put("success", false).put("message", "Bon de livraison introuvable.");
        }
        JSONArray data = new JSONArray();
        for (Ligne l : lignes(bonId)) {
            data.put(l.json());
        }
        return new JSONObject().put("success", true).put("reference", reference).put("total", data.length()).put("data",
                data);
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o).trim();
    }

    private static Integer entier(Object o) {
        return o == null ? 0 : ((Number) o).intValue();
    }
}
