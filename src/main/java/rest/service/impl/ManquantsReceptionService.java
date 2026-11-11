package rest.service.impl;

import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TMotifRetour;
import dal.TRetourFournisseur;
import dal.TRetourFournisseurDetail;
import dal.TUser;
import dal.enumeration.TypeLog;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.LogService;
import util.DateConverter;

/**
 * Demande 59 (plan du 08/11) : ecarts d'un BL entre « au reçu » et retour fournisseur des manquants.
 * <ul>
 * <li>{@code GET v1/reception/{blId}/ecarts} : lignes ou reçu &lt; commande. BL clos au reçu : quantites ecrites a la
 * cloture ; BL ouvert : calcul provisoire sur les lots saisis (meme regle que la cloture) ; BL clos par les modes
 * actuels : aucun ecart (tout est entre).</li>
 * <li>{@code POST v1/reception/{blId}/retour-manquants} : un retour en attente de validation, motif « Manquant »,
 * marque {@code bool_SANS_SORTIE_STOCK} : sa validation ne sort rien du stock (les boites ne sont jamais entrees). Un
 * seul par BL : un second appel renvoie le retour deja cree.</li>
 * </ul>
 * Chaque reponse porte « status » (code HTTP) que la ressource retire.
 */
@Stateless
public class ManquantsReceptionService {

    /** Motif des lignes d'un retour des manquants (migration V7.2.60). */
    public static final String MOTIF_MANQUANT = "MANQUANT";
    static final String ROUTE_RETOUR = "POST v1/reception/{blId}/retour-manquants";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private LogService logService;

    /* ------------------------------------------------------------------ ecarts */

    @SuppressWarnings("unchecked")
    public JSONObject ecarts(String blId) {
        List<Object[]> bl = em
                .createNativeQuery("SELECT b.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON, b.str_STATUT,"
                        + " b.int_MANQUANT_RECEPTION FROM t_bon_livraison b WHERE b.lg_BON_LIVRAISON_ID = ?1")
                .setParameter(1, blId).getResultList();
        if (bl.isEmpty()) {
            return ReceptionMobileService.statut(404, "BL_INCONNU", "Ce BL n'existe pas.");
        }
        Object[] b = bl.get(0);
        String ref = texte(b[1]);
        boolean clos = ReceptionMobileService.STATUT_CLOS.equals(texte(b[2]));
        boolean auRecu = b[3] != null;
        JSONArray ecarts = new JSONArray();
        int total = 0;
        String mode;
        if (clos && auRecu) {
            mode = "RECU";
            for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT d.lg_BON_LIVRAISON_DETAIL, f.int_CIP,"
                    + " f.str_NAME, COALESCE(d.int_QTE_CMDE, 0), COALESCE(d.int_QTE_RECUE, 0), COALESCE(d.int_QTE_UG, 0),"
                    + " COALESCE(d.int_QTE_MANQUANT, 0) FROM t_bon_livraison_detail d"
                    + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                    + " WHERE d.lg_BON_LIVRAISON_ID = ?1 AND COALESCE(d.int_QTE_RECUE, 0) < COALESCE(d.int_QTE_CMDE, 0)"
                    + " ORDER BY f.str_NAME, d.lg_BON_LIVRAISON_DETAIL").setParameter(1, blId).getResultList()) {
                ecarts.put(ligne(r[0], r[1], r[2], nombre(r[3]), nombre(r[4]), nombre(r[5]), nombre(r[6])));
                total += nombre(r[6]);
            }
        } else if (clos) {
            mode = "COMPLET";
        } else {
            mode = "PROVISOIRE";
            for (Object[] r : (List<Object[]>) em
                    .createNativeQuery("SELECT d.lg_BON_LIVRAISON_DETAIL, f.int_CIP,"
                            + " f.str_NAME, COALESCE(d.int_QTE_CMDE, 0), COALESCE(d.int_QTE_UG, 0), d.lg_FAMILLE_ID"
                            + " FROM t_bon_livraison_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                            + " WHERE d.lg_BON_LIVRAISON_ID = ?1 ORDER BY f.str_NAME, d.lg_BON_LIVRAISON_DETAIL")
                    .setParameter(1, blId).getResultList()) {
                List<int[]> lots = new ArrayList<>();
                for (Object[] l : (List<Object[]>) em
                        .createNativeQuery("SELECT COALESCE(int_NUMBER, 0), COALESCE(int_NUMBER_GRATUIT, 0) FROM t_lot"
                                + " WHERE str_REF_LIVRAISON = ?1 AND lg_FAMILLE_ID = ?2")
                        .setParameter(1, ref).setParameter(2, r[5]).getResultList()) {
                    lots.add(new int[] { nombre(l[0]), nombre(l[1]) });
                }
                ReceptionEcart.Ligne x = ReceptionEcart.calculer(nombre(r[3]), nombre(r[4]), lots);
                if (x.enEcart()) {
                    ecarts.put(ligne(r[0], r[1], r[2], x.commande, x.recu, x.ug, x.manquant));
                    total += x.manquant;
                }
            }
        }
        JSONObject out = new JSONObject().put("status", 200).put("success", true).put("blId", blId).put("ref", ref)
                .put("mode", mode).put("provisoire", !clos).put("ecarts", ecarts).put("totalManquant", total);
        JSONObject retour = retourExistant(blId);
        out.put("retourManquants", retour == null ? JSONObject.NULL : retour);
        return out;
    }

    private static JSONObject ligne(Object detailId, Object cip, Object nom, int commande, int recu, int ug,
            int manquant) {
        return new JSONObject().put("detailId", texte(detailId)).put("cip", texte(cip)).put("nom", texte(nom))
                .put("commande", commande).put("recu", recu).put("ug", ug).put("manquant", manquant);
    }

    /**
     * Retour des manquants du BL qui compte encore : ni supprime, ni abandonne (demande 61 : un retour abandonne est
     * clos sans suite, les manquants peuvent etre reclames a nouveau ; un retour refuse, lui, se corrige et compte). Le
     * plus recent s'il y en a plusieurs. Meme forme que la creation : lignes et boites du retour.
     */
    @SuppressWarnings("unchecked")
    private JSONObject retourExistant(String blId) {
        List<Object[]> l = em.createNativeQuery("SELECT r.lg_RETOUR_FRS_ID, r.str_REF_RETOUR_FRS, r.str_STATUT,"
                + " (SELECT COUNT(*) FROM t_retour_fournisseur_detail d WHERE d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID),"
                + " (SELECT COALESCE(SUM(d.int_NUMBER_RETURN), 0) FROM t_retour_fournisseur_detail d"
                + " WHERE d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID)"
                + " FROM t_retour_fournisseur r WHERE r.lg_BON_LIVRAISON_ID = ?1 AND r.bool_SANS_SORTIE_STOCK = 1"
                + " AND r.str_STATUT NOT IN ('delete', ?2) ORDER BY r.dt_CREATED DESC LIMIT 1").setParameter(1, blId)
                .setParameter(2, RetourEtats.ABANDONNE).getResultList();
        if (l.isEmpty()) {
            return null;
        }
        Object[] r = l.get(0);
        return new JSONObject().put("retourId", texte(r[0])).put("ref", texte(r[1])).put("statut", texte(r[2]))
                .put("lignes", nombre(r[3])).put("totalManquant", nombre(r[4]));
    }

    /* ------------------------------------------------------------------ retour des manquants */

    @SuppressWarnings("unchecked")
    public JSONObject creerRetourManquants(String blId, TUser user) {
        // verrou sur le BL : deux appels simultanes ne creent pas deux retours
        List<Object[]> bl = em.createNativeQuery("SELECT str_STATUT, int_MANQUANT_RECEPTION FROM t_bon_livraison"
                + " WHERE lg_BON_LIVRAISON_ID = ?1 FOR UPDATE").setParameter(1, blId).getResultList();
        if (bl.isEmpty()) {
            return ReceptionMobileService.statut(404, "BL_INCONNU", "Ce BL n'existe pas.");
        }
        JSONObject deja = retourExistant(blId);
        if (deja != null) {
            return deja.put("status", 200).put("success", true).put("deja", true).put("route", ROUTE_RETOUR).put("msg",
                    "Le retour des manquants de ce BL existe déjà : " + deja.optString("ref"));
        }
        if (!ReceptionMobileService.STATUT_CLOS.equals(texte(bl.get(0)[0])) || bl.get(0)[1] == null) {
            return ReceptionMobileService.statut(409, "BL_NON_ENTRE_AU_RECU",
                    "Ce BL n'a pas été entré au reçu : il n'a pas de manquants enregistrés.");
        }
        TBonLivraison bon = em.find(TBonLivraison.class, blId);
        List<TBonLivraisonDetail> lignes = em.createQuery(
                "SELECT d FROM TBonLivraisonDetail d"
                        + " WHERE d.lgBONLIVRAISONID.lgBONLIVRAISONID = ?1 AND d.intQTEMANQUANT > 0"
                        + " AND COALESCE(d.intQTERECUE, 0) < d.intQTECMDE ORDER BY d.lgFAMILLEID.strNAME",
                TBonLivraisonDetail.class).setParameter(1, blId).getResultList();
        if (lignes.isEmpty()) {
            return ReceptionMobileService.statut(409, "AUCUN_MANQUANT", "Ce BL n'a aucun manquant.");
        }
        Date maintenant = new Date();
        TRetourFournisseur retour = new TRetourFournisseur(UUID.randomUUID().toString());
        retour.setDtCREATED(maintenant);
        retour.setDtDATE(maintenant);
        retour.setDtUPDATED(maintenant);
        retour.setLgUSERID(user);
        retour.setDlAMOUNT(0.0);
        retour.setStrREFRETOURFRS(DateConverter.getShortId(8));
        retour.setStrCOMMENTAIRE("Manquants du BL " + bon.getStrREFLIVRAISON());
        retour.setStrREPONSEFRS("");
        retour.setLgBONLIVRAISONID(bon);
        retour.setLgGROSSISTEID(bon.getLgORDERID().getLgGROSSISTEID());
        retour.setStrSTATUT(MvtProduitServiceImpl.RETOUR_EN_ATTENTE);
        em.persist(retour);
        int total = 0;
        Map<String, Integer> stocks = stocks(lignes, user);
        for (TBonLivraisonDetail bn : lignes) {
            TRetourFournisseurDetail d = new TRetourFournisseurDetail(UUID.randomUUID().toString());
            d.setIntNUMBERRETURN(bn.getIntQTEMANQUANT());
            d.setIntNUMBERANSWER(0);
            d.setIntPAF(bn.getIntPAF());
            d.setBonLivraisonDetail(bn);
            d.setDtCREATED(maintenant);
            d.setDtUPDATED(maintenant);
            d.setStrSTATUT(DateConverter.STATUT_PROCESS);
            d.setLgFAMILLEID(bn.getLgFAMILLEID());
            d.setIntSTOCK(stocks.getOrDefault(bn.getLgFAMILLEID().getLgFAMILLEID(), 0));
            d.setLgMOTIFRETOUR(em.getReference(TMotifRetour.class, MOTIF_MANQUANT));
            d.setLgRETOURFRSID(retour);
            em.persist(d);
            total += bn.getIntQTEMANQUANT();
        }
        em.flush();
        em.createNativeQuery("UPDATE t_retour_fournisseur SET bool_SANS_SORTIE_STOCK = 1, dt_ATTENTE = NOW(),"
                + " lg_USER_ATTENTE = ?1 WHERE lg_RETOUR_FRS_ID = ?2").setParameter(1, user.getLgUSERID())
                .setParameter(2, retour.getLgRETOURFRSID()).executeUpdate();
        logService.updateItem(user, bon.getStrREFLIVRAISON(),
                "Retour des manquants " + retour.getStrREFRETOURFRS() + " du BL " + bon.getStrREFLIVRAISON() + " : "
                        + lignes.size() + " ligne(s), " + total + " boîte(s), en attente, sans sortie de stock, par "
                        + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME(),
                TypeLog.RETOUR_FOURNISSEUR, bon);
        return new JSONObject().put("status", 200).put("success", true).put("deja", false)
                .put("retourId", retour.getLgRETOURFRSID()).put("ref", retour.getStrREFRETOURFRS())
                .put("statut", retour.getStrSTATUT()).put("lignes", lignes.size()).put("totalManquant", total)
                .put("route", ROUTE_RETOUR).put("msg", "Retour des manquants " + retour.getStrREFRETOURFRS()
                        + " créé, en attente de validation ; rien ne sort du stock");
    }

    /** Stock du rayon de l'utilisateur, pour information sur la ligne du retour (int_STOCK). */
    @SuppressWarnings("unchecked")
    private Map<String, Integer> stocks(List<TBonLivraisonDetail> lignes, TUser user) {
        Map<String, Integer> m = new HashMap<>();
        List<String> ids = new ArrayList<>();
        lignes.forEach(l -> ids.add(l.getLgFAMILLEID().getLgFAMILLEID()));
        String empl = user.getLgEMPLACEMENTID() == null ? "1" : user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        for (Object[] r : (List<Object[]>) em
                .createNativeQuery("SELECT lg_FAMILLE_ID, int_NUMBER_AVAILABLE"
                        + " FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = ?1 AND lg_FAMILLE_ID IN (?2)")
                .setParameter(1, empl).setParameter(2, ids).getResultList()) {
            m.put(texte(r[0]), nombre(r[1]));
        }
        return m;
    }

    /** Vrai si ce retour est un retour des manquants (sa validation ne sort rien du stock). */
    public static boolean sansSortieStock(EntityManager em, String retourId) {
        List<?> l = em
                .createNativeQuery(
                        "SELECT bool_SANS_SORTIE_STOCK FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = ?1")
                .setParameter(1, retourId).getResultList();
        return !l.isEmpty() && l.get(0) != null && nombre(l.get(0)) == 1;
    }

    private static int nombre(Object o) {
        if (o instanceof Boolean) {
            return ((Boolean) o) ? 1 : 0;
        }
        return o instanceof Number ? ((Number) o).intValue() : 0;
    }

    private static String texte(Object o) {
        return o == null ? "" : String.valueOf(o);
    }
}
