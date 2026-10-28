package util;

/**
 * Demande du 28/10 (point 20) : nom et prenoms d'un client, designation d'un produit. Ni espace en debut ou en fin, ni
 * deux espaces consecutifs (tabulations et retours a la ligne comptent comme des espaces). Null reste null.
 */
public final class NomSaisi {

    private NomSaisi() {
    }

    public static String normaliser(String s) {
        return s == null ? null : s.replaceAll("\\s+", " ").trim();
    }
}
