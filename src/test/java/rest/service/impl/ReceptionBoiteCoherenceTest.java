package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.report.pdf.ContenuEtendu;
import rest.report.pdf.Gs1;

/**
 * Reponse du 22/11 sur le point 16.1 : « 1 boite par scan » du DataMatrix d'une boite en commande en cours. La boite
 * est lue (EAN, CIP, lot, peremption) quels que soient l'ordre des champs, le prefixe de la douchette, le numero de
 * serie et la forme du separateur ; il faut le produit, le lot et la date ; une boite perimee est refusee.
 */
class ReceptionBoiteCoherenceTest {

    private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 11, 22);
    private static final String[] SEPARATEURS = { String.valueOf(Gs1.GS), "<GS>", "^]", "~1" };
    private static final String[] PREFIXES = { "", "]d2", "]C1" };

    private static String chiffres(Random r, int n) {
        StringBuilder s = new StringBuilder();
        for (int i = 0; i < n; i++) {
            s.append(r.nextInt(10));
        }
        return s.toString();
    }

    private static String lot(Random r) {
        String a = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
        StringBuilder s = new StringBuilder();
        for (int i = 0, n = 1 + r.nextInt(12); i < n; i++) {
            s.append(a.charAt(r.nextInt(a.length())));
        }
        return s.toString();
    }

    @Test
    void laBoiteEstLueQuelleQueSoitSaForme() {
        Random r = new Random(1612211L);
        int perimees = 0, valides = 0;
        for (int i = 0; i < 20000; i++) {
            String ean = "3" + chiffres(r, 12);
            String lot = lot(r);
            int an = 2020 + r.nextInt(15), mois = 1 + r.nextInt(12);
            boolean finDeMois = r.nextInt(4) == 0;
            int jour = finDeMois ? 0 : 1 + r.nextInt(YearMonth.of(an, mois).lengthOfMonth());
            LocalDate per = finDeMois ? YearMonth.of(an, mois).atEndOfMonth() : LocalDate.of(an, mois, jour);
            String date = String.format("17%02d%02d%02d", an % 100, mois, jour);
            String sep = SEPARATEURS[r.nextInt(SEPARATEURS.length)];
            String cip = r.nextBoolean() ? chiffres(r, 7) : null;
            String serie = r.nextBoolean() ? "21" + lot(r) + sep : "";
            /* le lot (longueur variable) est suivi d'un separateur s'il n'est pas le dernier champ */
            String code;
            if (cip != null) {
                code = "010" + ean + date + serie + "10" + lot + sep + "240" + cip;
            } else if (r.nextBoolean()) {
                code = "010" + ean + date + serie + "10" + lot;
            } else {
                code = "010" + ean + "10" + lot + sep + date;
            }
            code = PREFIXES[r.nextInt(PREFIXES.length)] + code;
            Map<String, String> m = ReceptionEtiquetteService.boite(code);
            assertNotNull(m, code);
            assertEquals(ean, m.get(ContenuEtendu.EAN), code);
            assertEquals(lot, m.get(ContenuEtendu.LOT), code);
            assertEquals(String.format("%02d/%02d/%04d", per.getDayOfMonth(), per.getMonthValue(), per.getYear()),
                    m.get(ContenuEtendu.PER), code);
            assertEquals(cip, m.get(ContenuEtendu.CIP), code);
            assertEquals("GS1", m.get("TYPE"));
            String motif = ReceptionEtiquetteService.motifBoite(m, AUJOURDHUI);
            if (per.isBefore(AUJOURDHUI)) {
                perimees++;
                assertNotNull(motif, code);
                assertTrue(motif.startsWith("Boîte périmée (péremption " + m.get(ContenuEtendu.PER)), motif);
            } else {
                valides++;
                assertNull(motif, code);
            }
        }
        assertTrue(perimees > 3000 && valides > 3000, perimees + " / " + valides);
    }

    @Test
    void ilFautLeProduitLeLotEtLaDate() {
        assertNull(ReceptionEtiquetteService.boite("010340093000010617290331"), "sans lot");
        assertNull(ReceptionEtiquetteService.boite("0103400930000106" + "10LOT1"), "sans date");
        assertNull(ReceptionEtiquetteService.boite("17290331" + "10LOT1"), "sans produit");
        assertNull(ReceptionEtiquetteService.boite("3400930000106"), "EAN seul");
        assertNull(ReceptionEtiquetteService.boite("PARACETAMOL"), "texte");
        assertNull(ReceptionEtiquetteService.boite(""), "vide");
        assertNull(ReceptionEtiquetteService.boite(null), "null");
        /* le jour de peremption pile n'est pas perime */
        Map<String, String> m = ReceptionEtiquetteService.boite("0103400930000106" + "17261122" + "10L1");
        assertNull(ReceptionEtiquetteService.motifBoite(m, AUJOURDHUI));
        m = ReceptionEtiquetteService.boite("0103400930000106" + "17261121" + "10L1");
        assertEquals("Boîte périmée (péremption 21/11/2026, lot L1) : non ajoutée.",
                ReceptionEtiquetteService.motifBoite(m, AUJOURDHUI));
    }

    /**
     * Code de boite incomplet : message dit ce qui manque ; tout autre code (texte, EAN seul, boite complete) : rien.
     */
    @Test
    void codeDeBoiteIncomplet() {
        assertEquals(
                "Code de la boîte incomplet (lot manquant) : cherchez le produit par son nom, le lot et la"
                        + " péremption vous seront demandés.",
                ReceptionEtiquetteService.motifIncomplet("010340093000010617290331"));
        assertTrue(ReceptionEtiquetteService.motifIncomplet("0103400930000106" + "10LOT1")
                .startsWith("Code de la boîte incomplet (péremption manquante ou date impossible)"));
        assertTrue(ReceptionEtiquetteService.motifIncomplet("0103400930000106" + "17280000" + "10LOT1")
                .contains("date impossible"));
        assertTrue(ReceptionEtiquetteService.motifIncomplet("0103400930000106")
                .startsWith("Code de la boîte incomplet (lot et péremption manquants)"));
        assertNull(ReceptionEtiquetteService.motifIncomplet("0103400930000106" + "17290331" + "10LOT1"));
        assertNull(ReceptionEtiquetteService.motifIncomplet("3400930000106"));
        assertNull(ReceptionEtiquetteService.motifIncomplet("PARACETAMOL"));
        assertNull(ReceptionEtiquetteService.motifIncomplet("17290331" + "10LOT1"));
        /* regle sur des milliers de codes : message si et seulement si le produit est lu sans lot ou sans date */
        Random r = new Random(22112026L);
        for (int i = 0; i < 5000; i++) {
            boolean produit = r.nextBoolean(), avecLot = r.nextBoolean(), avecDate = r.nextBoolean();
            String code = (produit ? "010" + "3" + chiffres(r, 12) : "")
                    + (avecDate ? "17" + (27 + r.nextInt(5)) + "0615" : "") + (avecLot ? "10" + lot(r) : "");
            String motif = ReceptionEtiquetteService.motifIncomplet(code);
            boolean attendu = produit && (!avecLot || !avecDate);
            assertEquals(attendu, motif != null, code + " -> " + motif);
            assertEquals(produit && avecLot && avecDate, ReceptionEtiquetteService.boite(code) != null, code);
        }
    }

    /** Une etiquette etendue d'un grossiste (DataMatrix+) reste lue comme avant, pas comme une boite. */
    @Test
    void lEtiquetteEtendueResteLueCommeAvant() {
        String dm = "0103400930000106" + "17271130" + "10E2EB7<GS>91EPLUS1<GS>92NOM<GS>931500";
        assertNotNull(ContenuEtendu.lire(dm));
        assertNull(ContenuEtendu.lire("0103400930000106" + "17271130" + "10E2EB7"));
    }
}
