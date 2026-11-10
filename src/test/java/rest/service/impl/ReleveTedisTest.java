package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.itextpdf.text.Document;
import com.itextpdf.text.PageSize;
import com.itextpdf.text.pdf.BaseFont;
import com.itextpdf.text.pdf.PdfContentByte;
import com.itextpdf.text.pdf.PdfWriter;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.impl.ReleveModele.Cellule;
import rest.service.impl.ReleveModele.LigneBrute;

/**
 * Plan du 09/11, pointage BL : releve TEDIS (facture-releve imprimee caractere par caractere, chiffres serres). Le
 * lecteur perdait un chiffre double (« 2626011868 » lu « 262601868 ») : le second chiffre commence un peu avant la fin
 * du premier et etait pris pour un caractere repeint (gras simule).
 */
class ReleveTedisTest {

    /** Helvetica 7 pt : un chiffre fait 3,89 pt de large mais l'editeur avance de 3,36 pt (chiffres serres). */
    static final float TAILLE = 7f, AVANCE_CHIFFRE = 3.36f;

    /** Ecrit chaque caractere a sa position, comme l'editeur de TEDIS ; un caractere repeint simule le gras. */
    static final class Page {

        final List<Object[]> textes = new ArrayList<>();

        Page texte(float x, float y, String s, boolean grasSimule) {
            textes.add(new Object[] { x, y, s, grasSimule });
            return this;
        }

        byte[] pdf() throws Exception {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document d = new Document(PageSize.A4);
            PdfWriter w = PdfWriter.getInstance(d, out);
            d.open();
            BaseFont f = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, false);
            PdfContentByte cb = w.getDirectContent();
            for (Object[] t : textes) {
                float x = (Float) t[0], y = (Float) t[1];
                String s = (String) t[2];
                for (char c : s.toCharArray()) {
                    if (c != ' ') {
                        poser(cb, f, x, y, c);
                        if ((Boolean) t[3]) {
                            poser(cb, f, x + 0.4f, y, c);
                        }
                    }
                    x += Character.isDigit(c) ? AVANCE_CHIFFRE : f.getWidthPoint(c, TAILLE);
                }
            }
            d.close();
            return out.toByteArray();
        }

        private static void poser(PdfContentByte cb, BaseFont f, float x, float y, char c) {
            cb.beginText();
            cb.setFontAndSize(f, TAILLE);
            cb.setTextMatrix(x, y);
            cb.showText(String.valueOf(c));
            cb.endText();
        }
    }

    static List<String> textes(byte[] pdf) throws Exception {
        List<String> sortie = new ArrayList<>();
        for (LigneBrute l : ReleveGrossistePdf.lignes(new ByteArrayInputStream(pdf))) {
            StringBuilder b = new StringBuilder();
            for (Cellule c : l.cellules) {
                b.append(b.length() == 0 ? "" : " | ").append(c.texte);
            }
            sortie.add(b.toString());
        }
        return sortie;
    }

    @Test
    void chiffresDoublesSerresGardes() throws Exception {
        String[] numeros = { "2626011868", "2626115106", "2626222101", "1100", "9999999999", "2611" };
        Page p = new Page();
        float y = 700;
        for (String n : numeros) {
            p.texte(51, y, "BL", false).texte(95, y, n + "-VRI", false);
            y -= 11.3f;
        }
        List<String> lignes = textes(p.pdf());
        for (int i = 0; i < numeros.length; i++) {
            assertEquals("BL | " + numeros[i] + "-VRI", lignes.get(i), "ligne " + (i + 1));
        }
    }

    @Test
    void caractereRepeintGardeUneFois() throws Exception {
        Page p = new Page().texte(51, 700, "BL", true).texte(95, 700, "2626011868-BKE", true).texte(51, 680, "TOTAL",
                true);
        List<String> lignes = textes(p.pdf());
        assertEquals("BL | 2626011868-BKE", lignes.get(0));
        assertEquals("TOTAL", lignes.get(1));
        assertTrue(lignes.size() == 2);
    }

    /**
     * Releve facon TEDIS du test d'ecran (repris de la branche plan/09112026) : Type | N° BL | Date | HT Brut |
     * Ristourne | HT Net | TVA | Montant TTC, montants alignes a droite.
     */
    static final String[][] RELEVE = {
            { "BL", "2625920370-BKE", "16/03/2027", "24 534", "0", "24 534", "3 067", "27 601" },
            { "BL", "2625910091-VRI", "16/03/2027", "34 705", "0", "34 705", "0", "34 705" },
            { "BL", "2626011868-VRI", "17/03/2027", "7 718", "0", "7 718", "0", "7 718" },
            { "BL", "2626115106-VRI", "18/03/2027", "7 478", "0", "7 478", "1 346", "8 824" },
            { "AV", "AV-2627127450-BKE", "28/03/2027", "-347 050", "0", "-347 050", "0", "-347 050" },
            { "AV", "AV-2627127451-BKE", "29/03/2027", "-1 180", "0", "-1 180", "0", "-1 180" },
            { "PR-ABO", "2627337319-BKE", "30/03/2027", "6 356", "0", "6 356", "1 144", "7 500" } };

    static final float[] DEBUTS = { 51.4f, 94f, 182.4f }, FINS = { 297f, 351f, 410f, 470f, 530f };

    static byte[] releve() throws Exception {
        BaseFont f = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, false);
        Page p = new Page().texte(19.8f, 760, "FACTURE N° 2604088513-04", false).texte(300, 750,
                "Période du : 16/09/2026 au 30/03/2027", false);
        String[] entetes = { "Type", "N° BL", "Date", "HT Brut", "Ristourne", "HT Net", "TVA", "Montant TTC" };
        float y = 640;
        for (int ligne = -1; ligne < RELEVE.length; ligne++) {
            String[] v = ligne < 0 ? entetes : RELEVE[ligne];
            for (int i = 0; i < 3; i++) {
                p.texte(DEBUTS[i], y, v[i], false);
            }
            for (int i = 3; i < 8; i++) {
                float l = 0;
                for (char c : v[i].toCharArray()) {
                    l += Character.isDigit(c) ? AVANCE_CHIFFRE : f.getWidthPoint(c, TAILLE);
                }
                p.texte(FINS[i - 3] - l, y, v[i], false);
            }
            y -= 11.3f;
        }
        return p.pdf();
    }

    /** Fixture du test d'ecran, colonnes proposees comme sur le vrai releve TEDIS (HT Net), abonnement ignore. */
    @Test
    void releveTedisLu() throws Exception {
        List<LigneBrute> lb = ReleveGrossistePdf.lignes(new ByteArrayInputStream(releve()));
        List<ReleveModele.Colonne> cols = ReleveModele.colonnes(lb);
        java.util.Map<ReleveModele.Champ, Integer> r = ReleveModele.deviner(lb, cols);
        assertEquals("HT Net", ReleveModele.entetes(lb, cols)[r.get(ReleveModele.Champ.MONTANT)].trim());
        ReleveModele.Modele m = ReleveModele.modele(r, cols, "AV");
        List<ReleveGrossiste.Ligne> l = ReleveModele.lire(lb, m);
        assertEquals(6, l.size());
        assertEquals("2626011868", l.get(2).numeroBl);
        assertEquals(-347050, l.get(4).montantHt);
        assertEquals(ReleveGrossiste.Type.AVOIR, l.get(5).type);
        /* PR-ABO ignoree : 6 lignes sur 7 */
    }
}
