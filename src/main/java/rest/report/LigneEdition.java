package rest.report;

/**
 * Retours du 10/10 : ligne d'une edition generique (modeles rh_liste et suivants) : neuf colonnes de texte, c1 a c9,
 * lues par les modeles .jrxml (JRBeanCollectionDataSource).
 */
public class LigneEdition {

    private final String[] c = new String[9];

    public LigneEdition(String... valeurs) {
        for (int i = 0; i < c.length && valeurs != null && i < valeurs.length; i++) {
            c[i] = valeurs[i] == null ? "" : valeurs[i];
        }
    }

    public String getC1() {
        return c[0];
    }

    public String getC2() {
        return c[1];
    }

    public String getC3() {
        return c[2];
    }

    public String getC4() {
        return c[3];
    }

    public String getC5() {
        return c[4];
    }

    public String getC6() {
        return c[5];
    }

    public String getC7() {
        return c[6];
    }

    public String getC8() {
        return c[7];
    }

    public String getC9() {
        return c[8];
    }
}
