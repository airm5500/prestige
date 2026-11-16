package rest.service.impl.reserve;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import rest.service.impl.pointage.ReleveOrganisme;

/**
 * Import de codes CIP / EAN13 dans la liste reserve (16/11).
 * <p>
 * COHERENCE sur 5 000 fichiers tires au hasard (graine fixe ; 0 a 60 codes, CIP a 7 et 13 chiffres, EAN13, zeros de
 * tete perdus ou gardes, espaces, apostrophe, en-tete, quantites, doublons, EAN partages, CIP d'un produit = EAN d'un
 * autre, codes inconnus) :
 * </p>
 * <ul>
 * <li>partition : chaque code distinct est dans exactement une des listes reconnus, memeProduit, inconnus, ambigus ;
 * lectures = distincts + doublons ;</li>
 * <li>un reconnu designe le seul produit qui porte ce code (CIP prioritaire), « par » dit lequel ;</li>
 * <li>aucun produit reconnu deux fois ; un ambigu a au moins deux produits, un inconnu aucun ;</li>
 * <li>le rapprochement ne depend pas des zeros de tete ni des espaces.</li>
 * </ul>
 */
class ImportCodesReserveCoherenceTest {

    @Test
    void normalisation() {
        assertEquals("3400930000011", ImportCodesReserve.normaliser("3400930000011"));
        assertEquals("123456", ImportCodesReserve.normaliser("0123456"));
        assertEquals("123456", ImportCodesReserve.normaliser("'0123456"));
        assertEquals("3400930000011", ImportCodesReserve.normaliser(" 3 400 930 000 011 "));
        assertEquals("3400930000011", ImportCodesReserve.normaliser("3 400930000011"));
        assertNull(ImportCodesReserve.normaliser("CIP"));
        assertNull(ImportCodesReserve.normaliser("EAN13"));
        assertNull(ImportCodesReserve.normaliser("12"));
        assertNull(ImportCodesReserve.normaliser("0000"));
        assertNull(ImportCodesReserve.normaliser("3.4E12"));
        assertNull(ImportCodesReserve.normaliser("123456789012345"));
        assertNull(ImportCodesReserve.normaliser(""));
        assertNull(ImportCodesReserve.normaliser(null));
    }

    @Test
    void cipPrioritaireEtCasLimites() {
        List<ImportCodesReserve.Produit> p = Arrays.asList(
                new ImportCodesReserve.Produit("A", "1234567", "3400000000001"),
                new ImportCodesReserve.Produit("B", "7654321", "1234567"),
                new ImportCodesReserve.Produit("C", "2222222", "5555555555555"),
                new ImportCodesReserve.Produit("D", "3333333", "5555555555555"));
        ImportCodesReserve.Resultat r = ImportCodesReserve.rapprocher(
                Arrays.asList("1234567", "3400000000001", "5555555555555", "9999999", "1234567", "1234567"), p);
        assertEquals(1, r.reconnus.size());
        assertEquals("A", r.reconnus.get(0).id);
        assertEquals("CIP", r.reconnus.get(0).par);
        assertEquals(1, r.memeProduit.size());
        assertEquals("EAN13", r.memeProduit.get(0).par);
        assertEquals(Arrays.asList("C", "D"), r.ambigus.get("5555555555555"));
        assertEquals(Arrays.asList("9999999"), r.inconnus);
        assertEquals(Integer.valueOf(2), r.doublons.get("1234567"));
    }

    private static String chiffres(Random h, int n) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < n; i++) {
            b.append((char) ('0' + h.nextInt(10)));
        }
        return b.toString();
    }

    /** Ecriture d'un code dans un fichier : zeros perdus (classeur numerique), espaces, apostrophe. */
    private static String deguiser(Random h, String code) {
        switch (h.nextInt(5)) {
        case 0:
            return code.replaceFirst("^0+", "");
        case 1:
            return " " + code + " ";
        case 2:
            return "'" + code;
        case 3:
            return code.length() > 6 ? code.substring(0, 3) + " " + code.substring(3) : code;
        default:
            return code;
        }
    }

    @Test
    void coherenceSurFichiersAuHasard() {
        Random h = new Random(16_11_2026L);
        for (int cas = 0; cas < 5_000; cas++) {
            int n = 1 + h.nextInt(40);
            List<ImportCodesReserve.Produit> produits = new ArrayList<>();
            List<String[]> brut = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                String cip = (h.nextInt(6) == 0 ? "0" : "") + chiffres(h, h.nextInt(3) == 0 ? 13 : 7);
                String ean = h.nextInt(3) == 0 ? null : (h.nextInt(6) == 0 ? "0" : "") + chiffres(h, 13);
                if (ean != null && i > 0 && h.nextInt(8) == 0) {
                    ean = brut.get(h.nextInt(i))[2];
                }
                if (ean != null && i > 0 && h.nextInt(15) == 0) {
                    ean = brut.get(h.nextInt(i))[1];
                }
                brut.add(new String[] { "P" + i, cip, ean });
                produits.add(new ImportCodesReserve.Produit("P" + i, ImportCodesReserve.normaliser(cip),
                        ean == null ? null : ImportCodesReserve.normaliser(ean)));
            }
            List<List<String>> fichier = new ArrayList<>();
            if (h.nextBoolean()) {
                fichier.add(Arrays.asList(h.nextBoolean() ? "CIP" : "Code EAN13"));
            }
            int k = h.nextInt(61);
            for (int i = 0; i < k; i++) {
                String[] b = brut.get(h.nextInt(n));
                String code = h.nextInt(6) == 0 ? chiffres(h, 7 + h.nextInt(7))
                        : h.nextBoolean() || b[2] == null ? b[1] : b[2];
                List<String> ligne = new ArrayList<>();
                ligne.add(deguiser(h, code));
                if (h.nextInt(10) == 0) {
                    ligne.add(String.valueOf(1 + h.nextInt(99)));
                }
                fichier.add(ligne);
            }
            ImportCodesReserve.Lecture l = ImportCodesReserve.lire(fichier);
            ImportCodesReserve.Resultat r = ImportCodesReserve.rapprocher(l.codes, produits);

            Set<String> distincts = new HashSet<>(l.codes);
            int doublons = r.doublons.values().stream().mapToInt(Integer::intValue).sum();
            assertEquals(l.codes.size(), distincts.size() + doublons, "lectures = distincts + doublons");
            List<String> partition = new ArrayList<>();
            r.reconnus.forEach(x -> partition.add(x.code));
            r.memeProduit.forEach(x -> partition.add(x.code));
            partition.addAll(r.inconnus);
            partition.addAll(r.ambigus.keySet());
            assertEquals(distincts.size(), partition.size(), "chaque code distinct dans une seule liste");
            assertEquals(distincts, new HashSet<>(partition));

            Map<String, Set<String>> cip = new HashMap<>();
            Map<String, Set<String>> ean = new HashMap<>();
            for (ImportCodesReserve.Produit p : produits) {
                cip.computeIfAbsent(p.cip, x -> new HashSet<>()).add(p.id);
                if (p.ean != null) {
                    ean.computeIfAbsent(p.ean, x -> new HashSet<>()).add(p.id);
                }
            }
            Set<String> ids = new HashSet<>();
            for (ImportCodesReserve.Reconnu x : r.reconnus) {
                assertTrue(ids.add(x.id), "produit reconnu une seule fois");
            }
            List<ImportCodesReserve.Reconnu> tous = new ArrayList<>(r.reconnus);
            tous.addAll(r.memeProduit);
            for (ImportCodesReserve.Reconnu x : tous) {
                Set<String> attendu = cip.containsKey(x.code) ? cip.get(x.code) : ean.get(x.code);
                assertEquals(cip.containsKey(x.code) ? "CIP" : "EAN13", x.par);
                assertEquals(1, attendu.size());
                assertTrue(attendu.contains(x.id));
            }
            for (ImportCodesReserve.Reconnu x : r.memeProduit) {
                assertTrue(ids.contains(x.id), "meme produit : deja reconnu");
            }
            for (String c : r.inconnus) {
                assertTrue(!cip.containsKey(c) && !ean.containsKey(c));
            }
            for (Map.Entry<String, List<String>> e : r.ambigus.entrySet()) {
                Set<String> attendu = cip.containsKey(e.getKey()) ? cip.get(e.getKey()) : ean.get(e.getKey());
                assertTrue(attendu.size() >= 2);
                assertEquals(attendu, new HashSet<>(e.getValue()));
            }
        }
    }

    @Test
    void lectureCsvEtClasseur() throws Exception {
        String csv = "﻿CIP\r\n0123456\r\n3400930000011\r\n\r\n 3 400 930 000 028 \r\n";
        ImportCodesReserve.Lecture c = ImportCodesReserve
                .lire(ReleveOrganisme.lignesBrutes(csv.getBytes(StandardCharsets.UTF_8)));
        assertEquals(Arrays.asList("123456", "3400930000011", "3400930000028"), c.codes);
        assertEquals(1, c.ignorees);

        ByteArrayOutputStream o = new ByteArrayOutputStream();
        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet s = wb.createSheet("codes");
            s.createRow(0).createCell(0).setCellValue("EAN13");
            Row r1 = s.createRow(1);
            r1.createCell(0).setCellValue(123456d);
            Row r2 = s.createRow(2);
            r2.createCell(0).setCellValue(3400930000011d);
            s.createRow(3).createCell(0).setCellValue("0123457");
            wb.write(o);
        }
        ImportCodesReserve.Lecture x = ImportCodesReserve.lire(ReleveOrganisme.lignesBrutes(o.toByteArray()));
        assertEquals(Arrays.asList("123456", "3400930000011", "123457"), x.codes);
        assertEquals(1, x.ignorees);
    }
}
