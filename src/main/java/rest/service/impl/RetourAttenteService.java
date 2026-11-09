package rest.service.impl;

import dal.TUser;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONArray;
import org.json.JSONObject;
import org.apache.commons.lang3.StringUtils;

/**
 * Transmission du 07/11 : retours fournisseurs en attente — refus (motif obligatoire, verrou sur la ligne), correction
 * et remise en attente par l'auteur ou un valideur, abandon d'un retour refuse, nombre en attente pour le valideur,
 * historique (qui, quand, action, motif). Aucune de ces operations ne touche le stock ni les mouvements.
 * <p>
 * Chaque reponse porte « status » (code HTTP) que la ressource retire.
 */
@Stateless
public class RetourAttenteService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Etat du retour, verrouille jusqu'a la fin de la transaction : {statut, auteur, auteurAttente} ou null. */
    @SuppressWarnings("unchecked")
    private Object[] verrouiller(String id) {
        List<Object[]> l = em.createNativeQuery("SELECT str_STATUT, lg_USER_ID, lg_USER_ATTENTE, str_REF_RETOUR_FRS"
                + " FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = ?1 FOR UPDATE").setParameter(1, id)
                .getResultList();
        return l.isEmpty() ? null : l.get(0);
    }

    /**
     * Ajout, correction ou suppression d'une ligne : refuse (409 ETAT) sur un retour valide ou abandonne, rien n'est
     * modifie. Le retour est donne par son identifiant, ou par celui d'une de ses lignes. Null : la modification peut
     * se faire (retour introuvable compris : la suite repond comme avant).
     */
    @SuppressWarnings("unchecked")
    public JSONObject controlerLignes(String retourId, String ligneId) {
        List<Object> l;
        if (StringUtils.isNotBlank(retourId)) {
            l = em.createNativeQuery("SELECT str_STATUT FROM t_retour_fournisseur WHERE lg_RETOUR_FRS_ID = ?1")
                    .setParameter(1, retourId).getResultList();
        } else if (StringUtils.isNotBlank(ligneId)) {
            l = em.createNativeQuery("SELECT r.str_STATUT FROM t_retour_fournisseur r JOIN t_retour_fournisseur_detail d"
                    + " ON d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID WHERE d.lg_RETOUR_FRS_DETAIL = ?1")
                    .setParameter(1, ligneId).getResultList();
        } else {
            return null;
        }
        if (l.isEmpty()) {
            return null;
        }
        String etat = texte(l.get(0));
        if (RetourEtats.peutModifierLignes(etat)) {
            return null;
        }
        return statut(409, "ETAT", "Les lignes d'un retour " + RetourEtats.libelle(etat).toLowerCase()
                + " ne se modifient plus ; rien n'a été modifié.");
    }

    public JSONObject refuser(String id, String motifBrut, TUser user) {
        String motif = RetourEtats.motif(motifBrut);
        if (motif == null) {
            return statut(400, "MOTIF_OBLIGATOIRE", "Le motif du refus est obligatoire.");
        }
        Object[] r = verrouiller(id);
        if (r == null) {
            return statut(404, "INTROUVABLE", "Retour introuvable.");
        }
        String etat = texte(r[0]);
        if (!RetourEtats.peutRefuser(etat)) {
            return statut(409, "ETAT", "Seul un retour en attente de validation peut être refusé (état : "
                    + RetourEtats.libelle(etat) + ") ; rien n'a été modifié.");
        }
        em.createNativeQuery("UPDATE t_retour_fournisseur SET str_STATUT = ?1, str_MOTIF_REFUS = ?2, dt_REFUS = NOW(),"
                + " lg_USER_REFUS = ?3, dt_UPDATED = NOW() WHERE lg_RETOUR_FRS_ID = ?4")
                .setParameter(1, RetourEtats.REFUSE).setParameter(2, motif).setParameter(3, user.getLgUSERID())
                .setParameter(4, id).executeUpdate();
        RetourEtats.tracer(em, id, RetourEtats.REFUS, motif, user.getLgUSERID());
        return ok(id, RetourEtats.REFUSE, "Retour " + texte(r[3]) + " refusé : rien n'est sorti du stock.");
    }

    public JSONObject remettreEnAttente(String id, TUser user, boolean valideur) {
        Object[] r = verrouiller(id);
        if (r == null) {
            return statut(404, "INTROUVABLE", "Retour introuvable.");
        }
        String etat = texte(r[0]);
        if (!RetourEtats.peutRemettreEnAttente(etat)) {
            return statut(409, "ETAT", "Seul un retour refusé peut être remis en attente (état : "
                    + RetourEtats.libelle(etat) + ") ; rien n'a été modifié.");
        }
        if (!RetourEtats.peutCorriger(user.getLgUSERID(), texte(r[1]), texte(r[2]), valideur)) {
            return interdit("Seul l'auteur du retour, ou un profil qui valide les retours, peut le remettre en attente.");
        }
        Number lignes = (Number) em.createNativeQuery("SELECT COUNT(*) FROM t_retour_fournisseur_detail"
                + " WHERE lg_RETOUR_FRS_ID = ?1 AND str_STATUT <> 'enable' AND str_STATUT <> 'delete'")
                .setParameter(1, id).getSingleResult();
        if (lignes.intValue() == 0) {
            return statut(409, "VIDE", "Le retour ne contient aucun produit.");
        }
        em.createNativeQuery("UPDATE t_retour_fournisseur SET str_STATUT = ?1, str_MOTIF_REFUS = NULL, dt_REFUS = NULL,"
                + " lg_USER_REFUS = NULL, dt_ATTENTE = NOW(), lg_USER_ATTENTE = ?2, dt_UPDATED = NOW()"
                + " WHERE lg_RETOUR_FRS_ID = ?3").setParameter(1, RetourEtats.EN_ATTENTE)
                .setParameter(2, user.getLgUSERID()).setParameter(3, id).executeUpdate();
        RetourEtats.tracer(em, id, RetourEtats.REMISE_EN_ATTENTE, null, user.getLgUSERID());
        return ok(id, RetourEtats.EN_ATTENTE,
                "Retour " + texte(r[3]) + " remis en attente de validation : rien n'est sorti du stock.");
    }

    public JSONObject abandonner(String id, TUser user, boolean valideur) {
        Object[] r = verrouiller(id);
        if (r == null) {
            return statut(404, "INTROUVABLE", "Retour introuvable.");
        }
        String etat = texte(r[0]);
        if (!RetourEtats.peutAbandonner(etat)) {
            return statut(409, "ETAT", "Seul un retour refusé peut être abandonné (état : " + RetourEtats.libelle(etat)
                    + ") ; rien n'a été modifié.");
        }
        if (!RetourEtats.peutCorriger(user.getLgUSERID(), texte(r[1]), texte(r[2]), valideur)) {
            return interdit("Seul l'auteur du retour, ou un profil qui valide les retours, peut l'abandonner.");
        }
        em.createNativeQuery("UPDATE t_retour_fournisseur SET str_STATUT = ?1, dt_UPDATED = NOW()"
                + " WHERE lg_RETOUR_FRS_ID = ?2").setParameter(1, RetourEtats.ABANDONNE).setParameter(2, id)
                .executeUpdate();
        RetourEtats.tracer(em, id, RetourEtats.ABANDON, null, user.getLgUSERID());
        return ok(id, RetourEtats.ABANDONNE, "Retour " + texte(r[3]) + " abandonné : rien n'est sorti du stock.");
    }

    /** Nombre de retours en attente de validation (compteur et pastille du valideur). */
    public int nombreEnAttente() {
        return ((Number) em.createNativeQuery("SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_STATUT = ?1")
                .setParameter(1, RetourEtats.EN_ATTENTE).getSingleResult()).intValue();
    }

    /** Retours refuses dont l'utilisateur est l'auteur (a corriger). */
    public int nombreRefusesDe(String userId) {
        return ((Number) em.createNativeQuery("SELECT COUNT(*) FROM t_retour_fournisseur WHERE str_STATUT = ?1"
                + " AND (lg_USER_ID = ?2 OR lg_USER_ATTENTE = ?2)").setParameter(1, RetourEtats.REFUSE)
                .setParameter(2, userId).getSingleResult()).intValue();
    }

    @SuppressWarnings("unchecked")
    public JSONObject historique(String id) {
        JSONArray data = new JSONArray();
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT h.action, h.motif,"
                + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, ''))), h.lg_USER_ID,"
                + " DATE_FORMAT(h.dt_ACTION, '%Y-%m-%dT%H:%i:%s') FROM t_retour_fournisseur_historique h"
                + " LEFT JOIN t_user u ON u.lg_USER_ID = h.lg_USER_ID WHERE h.lg_RETOUR_FRS_ID = ?1"
                + " ORDER BY h.dt_ACTION, h.id").setParameter(1, id).getResultList()) {
            data.put(new JSONObject().put("action", texte(r[0])).put("motif", r[1] == null ? JSONObject.NULL : r[1])
                    .put("par", texte(r[2])).put("parId", texte(r[3])).put("le", texte(r[4])));
        }
        return new JSONObject().put("status", 200).put("success", true).put("data", data);
    }

    /**
     * Etat de refus et d'attente des retours de la liste : identifiant → {motifRefus, refusPar, refusLe, attentePar,
     * attenteLe, sansSortieStock}.
     */
    @SuppressWarnings("unchecked")
    public Map<String, JSONObject> infos(Collection<String> ids) {
        Map<String, JSONObject> m = new HashMap<>();
        List<String> l = new ArrayList<>(ids);
        for (int i = 0; i < l.size(); i += 500) {
            List<String> paquet = l.subList(i, Math.min(l.size(), i + 500));
            for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT r.lg_RETOUR_FRS_ID, r.str_MOTIF_REFUS,"
                    + " TRIM(CONCAT(COALESCE(ur.str_FIRST_NAME, ''), ' ', COALESCE(ur.str_LAST_NAME, ''))),"
                    + " DATE_FORMAT(r.dt_REFUS, '%d/%m/%Y %H:%i'),"
                    + " TRIM(CONCAT(COALESCE(ua.str_FIRST_NAME, ''), ' ', COALESCE(ua.str_LAST_NAME, ''))),"
                    + " DATE_FORMAT(r.dt_ATTENTE, '%d/%m/%Y %H:%i'), r.bool_SANS_SORTIE_STOCK, r.lg_USER_ATTENTE,"
                    + " (SELECT COUNT(*) FROM t_retour_fournisseur_historique h"
                    + "   WHERE h.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID AND h.action = 'REFUS'),"
                    + " r.str_STATUT, TRIM(CONCAT(COALESCE(uo.str_FIRST_NAME, ''), ' ', COALESCE(uo.str_LAST_NAME, ''))),"
                    + " DATE_FORMAT(r.dt_UPDATED, '%d/%m/%Y %H:%i'), " + derniere("ABANDON") + " AS abandon_etat, "
                    + derniere("VALIDATION") + " AS validation_etat"
                    + " FROM t_retour_fournisseur r LEFT JOIN t_user ur ON ur.lg_USER_ID = r.lg_USER_REFUS"
                    + " LEFT JOIN t_user ua ON ua.lg_USER_ID = r.lg_USER_ATTENTE"
                    + " LEFT JOIN t_user uo ON uo.lg_USER_ID = r.lg_USER_ID WHERE r.lg_RETOUR_FRS_ID IN (?1)")
                    .setParameter(1, paquet).getResultList()) {
                m.put(texte(r[0]),
                        new JSONObject().put("motifRefus", texte(r[1])).put("refusPar", texte(r[2]))
                                .put("refusLe", texte(r[3])).put("attentePar", texte(r[4]))
                                .put("attenteLe", texte(r[5])).put("sansSortieStock", nombre(r[6]) == 1)
                                .put("auteurAttenteId", texte(r[7])).put("nombreRefus", nombre(r[8])));
                /* partie 2 de la demande 59 : etat, auteur et date de l'etat, memes regles partout */
                String statut = texte(r[9]);
                String[] abandon = StringUtils.split(texte(r[12]), '|'), validation = StringUtils.split(texte(r[13]), '|');
                String abandonPar = partie(abandon, 0), abandonLe = partie(abandon, 1);
                String validePar = partie(validation, 0), valideLe = partie(validation, 1);
                String date = RetourEtats.REFUSE.equals(statut) ? texte(r[3])
                        : RetourEtats.EN_ATTENTE.equals(statut) ? texte(r[5])
                        : RetourEtats.ABANDONNE.equals(statut) ? abandonLe
                        : RetourEtats.VALIDE.equals(statut) ? valideLe : "";
                m.get(texte(r[0])).put("etat", RetourEtats.libelle(statut))
                        .put("auteur", RetourEtats.auteur(statut, texte(r[2]), texte(r[4]), abandonPar, validePar,
                                texte(r[10])))
                        .put("dateEtat", StringUtils.isNotBlank(date) ? date : texte(r[11]));
            }
        }
        return m;
    }

    private static JSONObject ok(String id, String etat, String msg) {
        return new JSONObject().put("status", 200).put("success", true).put("retourId", id).put("statut", etat)
                .put("etat", RetourEtats.libelle(etat)).put("msg", msg);
    }

    private static JSONObject interdit(String msg) {
        return new JSONObject().put("status", 403).put("success", false).put("interdit", true).put("msg", msg);
    }

    private static JSONObject statut(int status, String code, String msg) {
        return new JSONObject().put("status", status).put("success", false).put("code", code).put("msg", msg);
    }

    private static int nombre(Object o) {
        if (o instanceof Boolean) {
            return ((Boolean) o) ? 1 : 0;
        }
        return o instanceof Number ? ((Number) o).intValue() : 0;
    }

    /** Auteur et date de la derniere action donnee de l'historique, sous la forme « nom|jj/mm/aaaa hh:mm ». */
    private static String derniere(String action) {
        return "(SELECT CONCAT(TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, ''))), '|',"
                + " DATE_FORMAT(h.dt_ACTION, '%d/%m/%Y %H:%i')) FROM t_retour_fournisseur_historique h"
                + " LEFT JOIN t_user u ON u.lg_USER_ID = h.lg_USER_ID WHERE h.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID"
                + " AND h.action = '" + action + "' ORDER BY h.dt_ACTION DESC LIMIT 1)";
    }

    private static String partie(String[] t, int i) {
        return t != null && t.length > i ? t[i].trim() : "";
    }

    private static String texte(Object o) {
        return o == null ? "" : String.valueOf(o);
    }
}
