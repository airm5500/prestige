package rest.service.impl.activite;

import util.Constant;

/**
 * Critere de duree d'une vente pour « Activite des equipes » (retour du 24/10) : operateur (plus de, au moins, moins
 * de, au plus) et nombre de minutes. Par defaut : plus de 10 minutes. Une valeur inconnue ou hors bornes reprend le
 * defaut.
 */
public final class SeuilDuree {

    private final String operateur;
    private final int minutes;

    private SeuilDuree(String operateur, int minutes) {
        this.operateur = operateur;
        this.minutes = minutes;
    }

    public static SeuilDuree defaut() {
        return new SeuilDuree(Constant.ACTIVITE_SEUIL_OPERATEUR_DEFAUT, Constant.ACTIVITE_SEUIL_MINUTES_DEFAUT);
    }

    public static SeuilDuree de(String operateur, Integer minutes) {
        String op = operateur == null ? "" : operateur.trim().toUpperCase();
        if (!op.matches("GT|GE|LT|LE")) {
            op = Constant.ACTIVITE_SEUIL_OPERATEUR_DEFAUT;
        }
        int m = minutes == null || minutes < 1 || minutes > Constant.ACTIVITE_SEUIL_MINUTES_MAX
                ? Constant.ACTIVITE_SEUIL_MINUTES_DEFAUT : minutes;
        return new SeuilDuree(op, m);
    }

    public String getOperateur() {
        return operateur;
    }

    public int getMinutes() {
        return minutes;
    }

    /** La vente de cette duree (en secondes) est-elle retenue ? */
    public boolean retient(long secondes) {
        long s = minutes * 60L;
        switch (operateur) {
        case "GE":
            return secondes >= s;
        case "LT":
            return secondes < s;
        case "LE":
            return secondes <= s;
        default:
            return secondes > s;
        }
    }

    /** Ventes trop longues (plus de, au moins) plutot que trop courtes. */
    public boolean versLeHaut() {
        return "GT".equals(operateur) || "GE".equals(operateur);
    }

    public String libelle() {
        switch (operateur) {
        case "GE":
            return "Ventes de " + minutes + " min ou plus";
        case "LT":
            return "Ventes de moins de " + minutes + " min";
        case "LE":
            return "Ventes de " + minutes + " min ou moins";
        default:
            return "Ventes de plus de " + minutes + " min";
        }
    }
}
