package util;

import java.util.ArrayList;
import java.util.List;

/**
 * Formes d'un code scanne sous lesquelles un produit peut etre enregistre (demandes serveur des applications mobiles,
 * 46 et 49). Le code tel quel d'abord, puis :
 * <ul>
 * <li>GTIN-14 commencant par 0 : l'EAN-13 qu'il contient (« 0 » + EAN-13) ;</li>
 * <li>EAN-13 francais « 34009 + CIP7 + cle » : le CIP7.</li>
 * </ul>
 * Aucun calcul de cle : un code mal forme reste simplement sans autre forme.
 */
public final class CodeProduit {

    private CodeProduit() {
    }

    public static List<String> formes(String code) {
        List<String> formes = new ArrayList<>();
        String c = code == null ? "" : code.trim();
        if (c.isEmpty()) {
            return formes;
        }
        formes.add(c);
        if (c.length() == 14 && c.charAt(0) == '0' && chiffres(c)) {
            c = c.substring(1);
            formes.add(c);
        }
        if (c.length() == 13 && c.startsWith("34009") && chiffres(c)) {
            formes.add(c.substring(5, 12));
        }
        return formes;
    }

    private static boolean chiffres(String s) {
        for (int i = 0; i < s.length(); i++) {
            if (!Character.isDigit(s.charAt(i))) {
                return false;
            }
        }
        return true;
    }
}
