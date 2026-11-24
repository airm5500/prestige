package rest.report.pdf;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 21/11, point 16.1 : la lecture du DataMatrix s'arretait au premier identifiant qu'elle ne connaissait pas (21
 * numero de serie, 11 date de fabrication, 710 code national...). Sur les boites serialisees (directive falsification :
 * 01, 17, 10 et 21 dans un ordre libre), le lot ou la date etaient perdus. Desormais les identifiants non utilises sont
 * sautes selon leur longueur GS1 (fixe, ou jusqu'au separateur GS).
 *
 * <p>
 * Coherence : des milliers de codes tires au hasard (graine fixe), champs dans un ordre quelconque, avec ou sans champs
 * inutiles ; le produit, la date et le lot lus sont toujours ceux ecrits.
 */
class Gs1ChampsInconnusTest {

    private static final char GS = Gs1.GS;

    @Test
    void codesReelsDeBoitesSerialisees() {
        /* 01 + 17 + 21 (serie) + GS + 10 : forme courante des boites serialisees */
        Gs1.Contenu c = Gs1.lire("0103400930000106" + "17280131" + "21ABC123XYZ" + GS + "10LOT77");
        assertEquals("03400930000106", c.gtin);
        assertEquals(LocalDate.of(2028, 1, 31), c.peremption);
        assertEquals("LOT77", c.lot);
        /* 01 + 21 + GS + 17 + 10 */
        c = Gs1.lire("0103400930000106" + "21S3R1E" + GS + "17270600" + "10B-9");
        assertEquals(LocalDate.of(2027, 6, 30), c.peremption);
        assertEquals("B-9", c.lot);
        /* date de fabrication (11) avant la peremption, code national 710 */
        c = Gs1.lire("0103400930000106" + "11250101" + "17290228" + "710123456" + GS + "10X1");
        assertEquals(LocalDate.of(2029, 2, 28), c.peremption);
        assertEquals("X1", c.lot);
        /* 4 chiffres (3103 = poids net) : longueur fixe 6 */
        c = Gs1.lire("0103400930000106" + "3103001250" + "17300101" + "10P");
        assertEquals(LocalDate.of(2030, 1, 1), c.peremption);
        assertEquals("P", c.lot);
    }

    @Test
    void ordreQuelconqueEtChampsInutilesTiresAuHasard() {
        Random r = new Random(1612211L);
        String alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789-";
        for (int i = 0; i < 5000; i++) {
            LocalDate d = LocalDate.of(2026 + r.nextInt(10), 1 + r.nextInt(12), 1 + r.nextInt(28));
            StringBuilder lot = new StringBuilder();
            for (int k = 0, n = 1 + r.nextInt(12); k < n; k++) {
                lot.append(alpha.charAt(r.nextInt(alpha.length())));
            }
            StringBuilder serie = new StringBuilder();
            for (int k = 0, n = 1 + r.nextInt(20); k < n; k++) {
                serie.append(alpha.charAt(r.nextInt(alpha.length())));
            }
            String gtin = String.format("0340093%07d", r.nextInt(10_000_000));
            /* champs : [texte, longueur variable ?] */
            List<String[]> champs = new ArrayList<>();
            champs.add(new String[] { "01" + gtin, "fixe" });
            champs.add(new String[] {
                    "17" + String.format("%02d%02d%02d", d.getYear() - 2000, d.getMonthValue(), d.getDayOfMonth()),
                    "fixe" });
            champs.add(new String[] { "10" + lot, "var" });
            if (r.nextBoolean()) {
                champs.add(new String[] { "21" + serie, "var" });
            }
            if (r.nextBoolean()) {
                champs.add(new String[] { "11" + "250315", "fixe" });
            }
            if (r.nextInt(4) == 0) {
                champs.add(new String[] { "710" + "1234567", "var" });
            }
            Collections.shuffle(champs, r);
            StringBuilder code = new StringBuilder();
            for (int k = 0; k < champs.size(); k++) {
                code.append(champs.get(k)[0]);
                if ("var".equals(champs.get(k)[1]) && k < champs.size() - 1) {
                    code.append(GS);
                }
            }
            Gs1.Contenu c = Gs1.lire(code.toString());
            String vu = code.toString().replace(GS, '|');
            assertEquals(gtin, c.gtin, vu);
            assertEquals(d, c.peremption, vu);
            assertEquals(lot.toString(), c.lot, vu);
        }
    }
}
