package commonTasks.dto;

import java.io.Serializable;

/**
 * Plan du 08/11, points 7 et 8 : une ligne d'une edition « par sections » (rp_edition_sections.jrxml). Chaque section
 * d'un ecran d'analyse (tableau de produits, de grossistes, de mois...) devient un bloc : une ligne d'en-tete
 * ({@link #getEntete()}) puis ses lignes. Les valeurs sont deja mises en forme comme a l'ecran, pour que le PDF et
 * l'ecran se comparent texte a texte.
 *
 * <p>
 * Deux dispositions : « A » (libelle large puis six colonnes chiffrees) et « B » (trois colonnes de texte : code,
 * libelle, complement, puis quatre colonnes chiffrees).
 */
public class LigneEditionSectionDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    public static final String A = "A";
    public static final String B = "B";

    private final String section;
    private final boolean entete;
    private final String disposition;
    private final String[] c = new String[7];

    public LigneEditionSectionDTO(String section, boolean entete, String disposition, String... colonnes) {
        this.section = section;
        this.entete = entete;
        this.disposition = B.equals(disposition) ? B : A;
        for (int i = 0; i < c.length; i++) {
            c[i] = colonnes != null && i < colonnes.length && colonnes[i] != null ? colonnes[i] : "";
        }
    }

    public String getSection() {
        return section;
    }

    public Boolean getEntete() {
        return entete;
    }

    public String getDisposition() {
        return disposition;
    }

    public String getC0() {
        return c[0];
    }

    public String getC1() {
        return c[1];
    }

    public String getC2() {
        return c[2];
    }

    public String getC3() {
        return c[3];
    }

    public String getC4() {
        return c[4];
    }

    public String getC5() {
        return c[5];
    }

    public String getC6() {
        return c[6];
    }

    /** Les sept colonnes, dans l'ordre (tests). */
    public String[] colonnes() {
        return c.clone();
    }
}
