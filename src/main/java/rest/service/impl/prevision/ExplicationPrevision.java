package rest.service.impl.prevision;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Plan du 21/11, point 15 (reponse du 22/11 : « le calcul pour la valeur prevue doit etre clairement explique ») :
 * explication, en mots simples et avec les chiffres du produit, de la prevision du mois a venir. Les chiffres sont ceux
 * du calcul du serveur (Prevision.termes), pas une reconstitution : la valeur expliquee est la prevision enregistree.
 * Regles verifiees par ExplicationPrevisionCoherenceTest.
 */
public final class ExplicationPrevision {

    private static final DateTimeFormatter MOIS = DateTimeFormatter.ofPattern("MMM yy", Locale.FRANCE);

    /** Methode dont viennent les chiffres (celle retenue, ou la moyenne quand elle ne s'applique pas). */
    public final String methode;
    /** Prevision, arrondie au dixieme comme celle enregistree. */
    public final double valeur;
    /** Une ligne : le calcul en raccourci. */
    public final String formule;
    /** Etapes : {libelle, valeur affichee}. */
    public final List<String[]> etapes = new ArrayList<>();
    /** Termes bruts du calcul (Prevision.termes), pour les controles. */
    final double[] termes;

    private ExplicationPrevision(String methode, double[] termes, String formule) {
        this.methode = methode;
        this.termes = termes;
        this.valeur = termes == null ? 0 : Math.round(termes[termes.length - 1] * 10) / 10.0;
        this.formule = formule;
    }

    /** Nombre a la francaise : virgule, au plus {@code decimales} chiffres apres elle, sans zeros inutiles. */
    static String nombre(double v, int decimales) {
        double p = Math.pow(10, decimales);
        double r = Math.round(v * p) / p;
        if (r == 0) {
            r = 0;
        }
        return java.math.BigDecimal.valueOf(r).stripTrailingZeros().toPlainString().replace('.', ',');
    }

    private static String mois(YearMonth m) {
        return m.format(MOIS);
    }

    /**
     * Explique la prevision du mois suivant {@code dernierMois} (dernier mois complet de la serie) par la methode
     * donnee ; si elle ne s'applique pas, par la moyenne, comme le calcul.
     */
    public static ExplicationPrevision expliquer(double[] serie, String methode, YearMonth dernierMois) {
        int n = serie.length;
        YearMonth prevu = dernierMois.plusMonths(1);
        String m = methode;
        double[] t = Prevision.termes(serie, m);
        if (t == null) {
            m = Prevision.MOYENNE;
            t = Prevision.termes(serie, m);
        }
        if (t == null) {
            ExplicationPrevision e = new ExplicationPrevision(m, null,
                    "Aucune vente connue : prévision de " + mois(prevu) + " = 0");
            e.etapes.add(new String[] { "Aucune vente connue pour ce produit", "0" });
            return e;
        }
        String v = nombre(Math.round(t[t.length - 1] * 10) / 10.0, 1);
        switch (m) {
        case Prevision.MOYENNE: {
            int k = (int) t[0];
            StringBuilder somme = new StringBuilder();
            List<String[]> lignes = new ArrayList<>();
            for (int i = n - k; i < n; i++) {
                String q = nombre(serie[i], 1);
                somme.append(i > n - k ? " + " : "").append(q);
                lignes.add(new String[] { "Ventes de " + mois(dernierMois.minusMonths(n - 1L - i)), q });
            }
            String calcul = k > 1 ? "(" + somme + ") ÷ " + k : somme.toString();
            ExplicationPrevision e = new ExplicationPrevision(m, t,
                    "Moyenne des " + (k > 1 ? k + " " : "") + "derniers mois : " + calcul + " = " + v);
            e.etapes.addAll(lignes);
            e.etapes.add(new String[] { "Prévu en " + mois(prevu) + " : moyenne " + calcul, v });
            return e;
        }
        case Prevision.SAISON: {
            YearMonth anDernier = prevu.minusMonths(12);
            String base = nombre(t[0], 1), tendance = nombre(t[3], 2);
            ExplicationPrevision e;
            if (Double.isNaN(t[1])) {
                e = new ExplicationPrevision(m, t, "Même mois l'an dernier (" + mois(anDernier) + ") : " + base
                        + " ; moins de 24 mois d'historique, pas de correction de tendance = " + v);
                e.etapes.add(new String[] { "Ventes de " + mois(anDernier) + " (même mois l'an dernier)", base });
                e.etapes.add(new String[] { "Moins de 24 mois d'historique : pas de correction de tendance", "× 1" });
            } else {
                double brute = t[2] > 0 ? t[1] / t[2] : 1;
                String borne = t[2] <= 0 ? " (rien vendu l'année d'avant : tendance 1)"
                        : brute > 2 ? " (" + nombre(brute, 2) + " ramené à 2 au plus)"
                                : brute < 0.5 ? " (" + nombre(brute, 2) + " ramené à 0,5 au moins)" : "";
                e = new ExplicationPrevision(m, t, "Même mois l'an dernier (" + mois(anDernier) + ") " + base
                        + " × tendance " + tendance + " = " + v);
                e.etapes.add(new String[] { "Ventes de " + mois(anDernier) + " (même mois l'an dernier)", base });
                e.etapes.add(new String[] { "× tendance : 12 derniers mois (" + nombre(t[1], 1)
                        + ") ÷ 12 mois d'avant (" + nombre(t[2], 1) + ")" + borne, "× " + tendance });
            }
            e.etapes.add(new String[] { "Prévu en " + mois(prevu), v });
            return e;
        }
        case Prevision.HOLT: {
            String niveau = nombre(t[0], 2), pente = (t[1] >= 0 ? "+ " : "− ") + nombre(Math.abs(t[1]), 2);
            ExplicationPrevision e = new ExplicationPrevision(m, t,
                    "Niveau actuel " + niveau + " " + pente + " de tendance = " + v);
            e.etapes.add(
                    new String[] { "Niveau actuel des ventes par mois (moyenne où le dernier mois compte pour 40 %,"
                            + " l'avant-dernier pour 24 %, puis de moins en moins)", niveau });
            e.etapes.add(new String[] { "Tendance : les ventes " + (t[1] >= 0 ? "montent" : "baissent") + " de "
                    + nombre(Math.abs(t[1]), 2) + " par mois", pente });
            e.etapes.add(new String[] { "Prévu en " + mois(prevu) + " : niveau + tendance"
                    + (t[0] + t[1] < 0 ? " (jamais en dessous de 0)" : ""), v });
            return e;
        }
        default: {
            String niveau = nombre(t[0], 2), pente = (t[1] >= 0 ? "+ " : "− ") + nombre(Math.abs(t[1]), 2),
                    saison = (t[2] >= 0 ? "+ " : "− ") + nombre(Math.abs(t[2]), 2);
            ExplicationPrevision e = new ExplicationPrevision(m, t, "Niveau " + niveau + " " + pente + " de tendance "
                    + saison + " d'effet saisonnier de " + mois(prevu) + " = " + v);
            e.etapes.add(new String[] {
                    "Niveau actuel des ventes par mois, hors saison (le dernier mois compte pour 40 %)", niveau });
            e.etapes.add(new String[] { "Tendance : les ventes " + (t[1] >= 0 ? "montent" : "baissent") + " de "
                    + nombre(Math.abs(t[1]), 2) + " par mois", pente });
            e.etapes.add(
                    new String[] { "Effet saisonnier de " + mois(prevu) + " : on y vend " + nombre(Math.abs(t[2]), 2)
                            + (t[2] >= 0 ? " de plus" : " de moins") + " qu'un mois moyen", saison });
            e.etapes.add(new String[] { "Prévu en " + mois(prevu) + " : niveau + tendance + saison"
                    + (t[0] + t[1] + t[2] < 0 ? " (jamais en dessous de 0)" : ""), v });
            return e;
        }
        }
    }

    public JSONObject json() {
        JSONArray a = new JSONArray();
        for (String[] e : etapes) {
            a.put(new JSONArray().put(e[0]).put(e[1]));
        }
        return new JSONObject().put("methode", methode).put("valeur", valeur).put("formule", formule).put("etapes", a);
    }
}
