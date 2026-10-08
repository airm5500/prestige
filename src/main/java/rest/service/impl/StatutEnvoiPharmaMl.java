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
