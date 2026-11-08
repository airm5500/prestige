package rest.service.impl;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Plan du 08/11, point 2 : etat de controle d'achat d'un grossiste (fiche grossiste, « Detail »), en REST.
 *
 * Remplace l'appel a webservices/commandemanagement/etats/ws_data.jsp (laissee en place, plus appelee). Memes lignes,
 * memes colonnes, meme ordre que WarehouseManager.listeEtatControleAchat (plus l'identifiant du BL pour departager les
 * BL livres le meme jour : sans lui, une page pouvait reprendre une ligne de la precedente) : BL clotures ou supprimes
 * du grossiste, livres entre les deux dates, dont la reference BL ou commande commence par la recherche, ou dont un
 * produit a la recherche dans son nom ou son CIP. Requetes parametrees ; le total est compte en SQL avec LE MEME filtre
 * que la page (la JSP le comptait sans le filtre produit : total faux des qu'on cherchait un produit).
 */
@Stateless
public class EtatControleAchatService {

    private static final Logger LOG = Logger.getLogger(EtatControleAchatService.class.getName());
    static final String STATUT_CLOTURE = "is_Closed";
    static final String STATUT_SUPPRIME = "delete";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private static final String FROM = " FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID"
            + " JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID JOIN t_user u ON u.lg_USER_ID = b.lg_USER_ID"
            + " WHERE o.lg_GROSSISTE_ID LIKE ?1 AND DATE(b.dt_DATE_LIVRAISON) >= ?2 AND DATE(b.dt_DATE_LIVRAISON) <= ?3"
            + " AND (b.str_REF_LIVRAISON LIKE ?4 OR o.str_REF_ORDER LIKE ?4 OR b.lg_BON_LIVRAISON_ID IN ("
            + "   SELECT d.lg_BON_LIVRAISON_ID FROM t_bon_livraison_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
            + "   WHERE f.str_NAME LIKE ?5 OR f.int_CIP LIKE ?5))" + " AND b.str_STATUT IN ('" + STATUT_CLOTURE + "', '"
            + STATUT_SUPPRIME + "')";

    /**
     * @param retourComplet
     *            droit ACTION_RETURN_FULL_BL de l'utilisateur (bouton de retour complet du BL)
     */
    public JSONObject lister(String grossisteId, String debut, String fin, String recherche, int start, int limit,
            boolean retourComplet) {
        String jour = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
        String d1 = vide(debut) ? jour : debut, d2 = vide(fin) ? jour : fin;
        String r = recherche == null ? "" : recherche.trim();
        JSONObject res = new JSONObject();
        JSONArray lignes = new JSONArray();
        try {
            Query compte = em.createNativeQuery("SELECT COUNT(*)" + FROM);
            parametrer(compte, grossisteId, d1, d2, r);
            long total = ((Number) compte.getSingleResult()).longValue();
            Query q = em.createNativeQuery(
                    "SELECT b.str_REF_LIVRAISON, b.dt_DATE_LIVRAISON, b.int_MHT, b.int_TVA, b.int_HTTC,"
                            + " o.str_REF_ORDER, g.str_LIBELLE, b.dt_UPDATED, u.str_FIRST_NAME, u.str_LAST_NAME, b.lg_BON_LIVRAISON_ID,"
                            + " (SELECT IFNULL(SUM(x.int_QTE_RETURN * x.int_PAF), 0) FROM t_bon_livraison_detail x"
                            + "   WHERE x.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID), g.lg_GROSSISTE_ID, b.str_STATUT"
                            + FROM
                            + " ORDER BY g.str_LIBELLE ASC, b.dt_DATE_LIVRAISON DESC, b.lg_BON_LIVRAISON_ID DESC");
            parametrer(q, grossisteId, d1, d2, r);
            @SuppressWarnings("unchecked")
            List<Object[]> l = q.setFirstResult(Math.max(0, start)).setMaxResults(limit > 0 ? limit : 20)
                    .getResultList();
            Map<String, String> produits = produits(l);
            SimpleDateFormat court = new SimpleDateFormat("dd/MM/yyyy");
            for (Object[] o : l) {
                int ttc = entier(o[4]);
                JSONObject j = new JSONObject();
                j.put("RETURN_FULL_BL", retourComplet && !STATUT_SUPPRIME.equals(String.valueOf(o[13])) && ttc >= 0);
                j.put("str_ORDER_REF", o[5]);
                j.put("str_BL_REF", o[0]);
                j.put("int_ORDER_PRICE", entier(o[2]));
                j.put("int_BL_PRICE", ttc);
                j.put("int_AMOUNT_AVOIR", entier(o[11]));
                j.put("IDGROSSISTE", String.valueOf(o[12]));
                j.put("dt_DATE_LIVRAISON", o[1] instanceof Date ? court.format((Date) o[1]) : "");
                j.put("int_TVA", entier(o[3]));
                j.put("dt_UPDATED", o[7] instanceof Date ? court.format((Date) o[7]) : "");
                j.put("str_LIBELLE", o[6]);
                j.put("lg_USER_ID", o[8] + " " + o[9]);
                j.put("lg_BON_LIVRAISON_ID", o[10]);
                j.put("str_FAMILLE_ITEM", produits.getOrDefault(String.valueOf(o[10]), ""));
                lignes.put(j);
            }
            res.put("total", total);
        } catch (RuntimeException e) {
            LOG.log(Level.SEVERE, "etat de controle d'achat du grossiste", e);
            res.put("total", 0);
            res.put("erreur", "Lecture de l'état de contrôle impossible");
        }
        return res.put("results", lignes);
    }

    private static void parametrer(Query q, String grossisteId, String d1, String d2, String r) {
        q.setParameter(1, vide(grossisteId) ? "%" : grossisteId).setParameter(2, d1).setParameter(3, d2)
                .setParameter(4, echapper(r) + "%").setParameter(5, "%" + echapper(r) + "%");
    }

    /** Lignes cloturees de chaque BL de la page, une requete pour toute la page (la JSP en faisait une par BL). */
    private Map<String, String> produits(List<Object[]> bls) {
        Map<String, List<Object[]>> parBl = new LinkedHashMap<>();
        if (bls.isEmpty()) {
            return new LinkedHashMap<>();
        }
        List<String> ids = new ArrayList<>();
        for (Object[] o : bls) {
            ids.add(String.valueOf(o[10]));
        }
        StringBuilder marques = new StringBuilder();
        for (int i = 0; i < ids.size(); i++) {
            marques.append(i == 0 ? "?" : ", ?").append(i + 2);
        }
        Query q = em
                .createNativeQuery("SELECT d.lg_BON_LIVRAISON_ID, f.int_CIP, f.str_DESCRIPTION, d.int_QTE_CMDE,"
                        + " d.int_QTE_RECUE, d.int_QTE_UG, d.int_QTE_RETURN FROM t_bon_livraison_detail d"
                        + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                        + " WHERE d.str_STATUT = ?1 AND d.lg_BON_LIVRAISON_ID IN (" + marques + ")"
                        + " ORDER BY d.dt_CREATED DESC, d.lg_BON_LIVRAISON_DETAIL DESC")
                .setParameter(1, STATUT_CLOTURE);
        for (int i = 0; i < ids.size(); i++) {
            q.setParameter(i + 2, ids.get(i));
        }
        @SuppressWarnings("unchecked")
        List<Object[]> l = q.getResultList();
        for (Object[] o : l) {
            parBl.computeIfAbsent(String.valueOf(o[0]), k -> new ArrayList<>()).add(o);
        }
        Map<String, String> res = new LinkedHashMap<>();
        parBl.forEach((bl, lignes) -> {
            StringBuilder s = new StringBuilder();
            for (Object[] o : lignes) {
                int ug = entier(o[5]);
                s.append("<b><span style='display:inline-block;width: 7%;'>").append(html(o[1]))
                        .append("</span><span style='display:inline-block;width: 25%;'>").append(html(o[2]))
                        .append("</span><span style='display:inline-block;width: 15%;'>Qte Cmdée: (")
                        .append(entier(o[3]))
                        .append(")</span><span style='display:inline-block;width: 15%;'>Qte Livrée: (")
                        .append(entier(o[4]) - ug)
                        .append(")</span><span style='display:inline-block;width: 15%;'>Unité gratuite: (").append(ug)
                        .append(")</span><span style='display:inline-block;width: 15%;'>Avoir (").append(entier(o[6]))
                        .append(")</span></b><br> ");
            }
            res.put(bl, s.toString());
        });
        return res;
    }

    static boolean vide(String s) {
        return s == null || s.trim().isEmpty();
    }

    static int entier(Object o) {
        if (o == null) {
            return 0;
        }
        if (o instanceof Number) {
            return ((Number) o).intValue();
        }
        try {
            return new BigDecimal(o.toString().trim()).intValue();
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /** % et _ de la recherche pris a la lettre */
    static String echapper(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    static String html(Object o) {
        return o == null ? "" : o.toString().replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("'", "&#39;").replace("\"", "&quot;");
    }
}
