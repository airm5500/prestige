package rest.service.impl.stat;

import org.json.JSONObject;

/**
 * Retours du 10/10 (Q1) : ventes moyennes d'un article sur les 90 derniers jours (glissants, aujourd'hui compris). jour
 * = total / 90 ; semaine = total / (90 / 7) ; mois = total / 3. Arrondi a une decimale (deux pour le jour).
 */
public final class MoyennesVente {

    public static final int JOURS = 90;

    private MoyennesVente() {
    }

    public static double parJour(long total) {
        return arrondi(Math.max(0, total) / (double) JOURS, 100);
    }

    public static double parSemaine(long total) {
        return arrondi(Math.max(0, total) * 7.0 / JOURS, 10);
    }

    public static double parMois(long total) {
        return arrondi(Math.max(0, total) / 3.0, 10);
    }

    private static double arrondi(double v, int f) {
        return Math.round(v * f) / (double) f;
    }

    public static JSONObject json(long total) {
        return new JSONObject().put("jours", JOURS).put("total", Math.max(0, total)).put("jour", parJour(total))
                .put("semaine", parSemaine(total)).put("mois", parMois(total));
    }
}
