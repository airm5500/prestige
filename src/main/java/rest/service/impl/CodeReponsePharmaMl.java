package rest.service.impl;

import org.apache.commons.lang3.StringUtils;

/**
 * Retours du 08/10 (4) : codes reponse produit PharmaML (specification CSRP v4.8, tableau 9), communs a la reponse a la
 * commande et a la reponse d'information produit (disponibilite).
 * <ul>
 * <li>0 : produit disponible (code envoye par TEDIS, « Produit disponible ») ;</li>
 * <li>1 a 7 : motifs normes (produit inconnu, ne tenons pas, ne se fait plus, manque fabricant, manque rayon, retrait,
 * non autorise) ;</li>
 * <li>8 a 999 : reserve CSRP ; 1000 a 9999 : codes propres au grossiste (son libelle est alors repris s'il en envoie
 * un).</li>
 * </ul>
 */
public final class CodeReponsePharmaMl {

    private static final String[] NORMES = { "Produit disponible", "Produit inconnu", "Pas en stock (ne tenons pas)",
            "Ne se fait plus", "Manque fabricant", "Manque rayon", "Retrait de produit", "Non autorisé" };

    private CodeReponsePharmaMl() {
    }

    /** Valeur numerique du code, ou null si absent ou illisible. */
    public static Integer valeur(String code) {
        String c = StringUtils.trimToEmpty(code);
        if (c.isEmpty() || !c.matches("\\d{1,4}")) {
            return null;
        }
        return Integer.valueOf(c);
    }

    /** Le code dit « disponible » (0 / 0000). */
    public static boolean disponible(String code) {
        Integer v = valeur(code);
        return v != null && v == 0;
    }

    /** Libelle du code selon la specification ; vide si code absent. */
    public static String libelle(String code) {
        Integer v = valeur(code);
        if (v == null) {
            return StringUtils.trimToEmpty(code);
        }
        if (v < NORMES.length) {
            return NORMES[v];
        }
        if (v < 1000) {
            return "Code CSRP " + v;
        }
        return "Code propre au grossiste (" + v + ")";
    }

    /** Motif lisible : le texte du grossiste s'il en donne un, sinon le libelle du code. */
    public static String motif(String code, String texteGrossiste) {
        String t = StringUtils.trimToNull(texteGrossiste);
        if (t != null) {
            return t;
        }
        String l = libelle(code);
        return l.isEmpty() ? null : l;
    }
}
