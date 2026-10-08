package rest.service.impl;

import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;

/**
 * Retours du 08/10 : statut d'envoi PharmaML d'une commande, lu dans t_pharmaml_attente (dernier envoi) et affiche sur
 * la liste des commandes. Codes : EN_ATTENTE (recue par le grossiste, reponse differee), REPONDUE, PARTIELLE (une
 * partie en rupture), REFUSEE (refus du grossiste), NON_ENVOYEE (serveur injoignable), ERREUR (reponse inexploitable).
 */
public final class StatutEnvoiPharmaMl {

    private StatutEnvoiPharmaMl() {
    }

    /**
     * Dernier envoi PharmaML d'une commande : { code, date, detail } ou null. Commun a la liste des commandes et a
     * celle des suggestions (commande liee).
     */
    @SuppressWarnings("unchecked")
    public static String[] dernierEnvoi(javax.persistence.EntityManager em, String commandeId) {
        if (StringUtils.isBlank(commandeId)) {
            return null;
        }
        java.util.List<Object[]> r = em.createNativeQuery("SELECT str_STATUT, str_DETAIL,"
                + " DATE_FORMAT(COALESCE(dt_REPONSE, dt_ENVOI), '%d/%m/%Y %H:%i') FROM t_pharmaml_attente"
                + " WHERE lg_SOURCE_ID = ?1 AND str_SOURCE = 'COMMANDE' ORDER BY dt_ENVOI DESC, dt_REPONSE DESC")
                .setParameter(1, commandeId).setMaxResults(1).getResultList();
        if (r.isEmpty()) {
            return null;
        }
        String statut = (String) r.get(0)[0], detail = (String) r.get(0)[1];
        return new String[] { code(statut, detail), (String) r.get(0)[2], detail(statut, detail) };
    }

    public static String code(String statut, String detail) {
        if (statut == null) {
            return "";
        }
        switch (statut) {
        case PharmaMlServiceImpl.TRAITEE:
            JSONObject d = lire(detail);
            return d != null && d.optInt("nbrerupture", 0) > 0 ? "PARTIELLE" : "REPONDUE";
        case PharmaMlServiceImpl.EN_ATTENTE:
        case PharmaMlServiceImpl.REFUSEE:
        case PharmaMlServiceImpl.NON_ENVOYEE:
        case PharmaMlServiceImpl.ERREUR:
            return statut;
        default:
            return "";
        }
    }

    /** Texte de l'info-bulle : produits livres / en rupture, ou le motif du refus. */
    public static String detail(String statut, String detail) {
        JSONObject d = lire(detail);
        if (PharmaMlServiceImpl.TRAITEE.equals(statut)) {
            if (d == null || !d.has("totalProduit")) {
                return "Réponse du grossiste traitée";
            }
            return d.optInt("nbreproduit") + " produit(s) pris en compte, " + d.optInt("nbrerupture")
                    + " en rupture sur " + d.optInt("totalProduit");
        }
        if (PharmaMlServiceImpl.EN_ATTENTE.equals(statut)) {
            return "Reçue par le grossiste, réponse en attente";
        }
        if (d != null) {
            return StringUtils.defaultString(d.optString("msg", null), "");
        }
        return StringUtils.defaultString(detail);
    }

    private static JSONObject lire(String detail) {
        if (detail == null || !detail.trim().startsWith("{")) {
            return null;
        }
        try {
            return new JSONObject(detail);
        } catch (RuntimeException e) {
            return null;
        }
    }
}
