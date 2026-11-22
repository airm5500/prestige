package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;
import rest.report.pdf.Gs1;

/**
 * Reponse du 22/11 sur le point 16.1 : un DataMatrix complet scanne dans le champ du lot ajoute la ligne tout de suite,
 * sauf si le code produit de la boite n'est pas celui du produit choisi. Le controle du produit ne doit jamais bloquer
 * a tort (rien a comparer : INCONNU) ni laisser passer une autre boite (DIFFERENT).
 */
class LotsCommandeScanCoherenceTest {

    private static final List<String> AUCUN = Collections.emptyList();

    private static Gs1.Contenu contenu(String gtin, String cip) {
        Gs1.Contenu c = new Gs1.Contenu();
        c.gtin = gtin;
        c.cip = cip;
        return c;
    }

    @Test
    void exemples() {
        /* l'EAN de la boite (GTIN 0 + EAN-13) est l'EAN du produit */
        assertEquals("CONFORME", LotsCommandeService.comparerProduit(contenu("03400930000106", null),
                Arrays.asList("3400930000106", null), Arrays.asList("1234567")));
        /* EAN fabricant */
        assertEquals("CONFORME", LotsCommandeService.comparerProduit(contenu("03400930000106", null),
                Arrays.asList("", "3400930000106"), AUCUN));
        /* CIP (240) = CIP du produit, ou code article d'un grossiste */
        assertEquals("CONFORME", LotsCommandeService.comparerProduit(contenu("03400930000106", "1234567"),
                Arrays.asList("9999999999999"), Arrays.asList("1234567")));
        assertEquals("CONFORME", LotsCommandeService.comparerProduit(contenu(null, "7654321"), AUCUN,
                Arrays.asList("1234567", "7654321")));
        /* zeros de tete et espaces ignores */
        assertEquals("CONFORME",
                LotsCommandeService.comparerProduit(contenu(null, "0012345"), AUCUN, Arrays.asList(" 12345")));
        /* autre CIP : DIFFERENT */
        assertEquals("DIFFERENT", LotsCommandeService.comparerProduit(contenu("03400930000106", "7654321"), AUCUN,
                Arrays.asList("1234567")));
        /* autre EAN face a un EAN connu : DIFFERENT */
        assertEquals("DIFFERENT", LotsCommandeService.comparerProduit(contenu("03400930000106", null),
                Arrays.asList("3400939999999"), Arrays.asList("1234567")));
        /* EAN lu, produit sans EAN connu (CIP local seulement) : rien a comparer, jamais de blocage a tort */
        assertEquals("INCONNU", LotsCommandeService.comparerProduit(contenu("03400930000106", null),
                Arrays.asList(null, ""), Arrays.asList("1234567")));
        /* produit sans aucun code */
        assertEquals("INCONNU",
                LotsCommandeService.comparerProduit(contenu("03400930000106", "7654321"), AUCUN, AUCUN));
        /* boite sans code produit (17 + 10 seulement) */
        assertEquals("INCONNU", LotsCommandeService.comparerProduit(contenu(null, null), Arrays.asList("3400930000106"),
                Arrays.asList("1234567")));
    }

    private static String chiffres(Random r, int n) {
        StringBuilder s = new StringBuilder();
        for (int i = 0; i < n; i++) {
            s.append(r.nextInt(10));
        }
        return s.toString();
    }

    private static String sansZeros(String s) {
        String t = s.trim().replaceFirst("^0+", "");
        return t.isEmpty() ? s.trim() : t;
    }

    /**
     * Regles sur des milliers de cas tires au hasard (graine fixe) : CONFORME si et seulement si un code lu est un code
     * connu ; sinon DIFFERENT si et seulement si un CIP est lu face a des codes connus, ou un EAN lu face a un EAN
     * connu ; sinon INCONNU.
     */
    @Test
    void reglesSurDesMilliersDeCas() {
        Random r = new Random(1612211L);
        int[] vus = new int[3];
        for (int i = 0; i < 20000; i++) {
            String ean = chiffres(r, 13), cip = chiffres(r, 7);
            List<String> eans = new ArrayList<>(), autres = new ArrayList<>();
            int ne = r.nextInt(3), na = r.nextInt(4);
            for (int k = 0; k < ne; k++) {
                eans.add(r.nextInt(3) == 0 ? ean : r.nextInt(5) == 0 ? "" : chiffres(r, 13));
            }
            for (int k = 0; k < na; k++) {
                autres.add(r.nextInt(3) == 0 ? cip : r.nextInt(5) == 0 ? null : chiffres(r, 7));
            }
            boolean avecGtin = r.nextBoolean(), avecCip = r.nextInt(3) == 0;
            Gs1.Contenu c = contenu(avecGtin ? "0" + ean : null, avecCip ? cip : null);
            List<String> connus = new ArrayList<>(), eansConnus = new ArrayList<>();
            for (String e : eans) {
                if (e != null && !e.trim().isEmpty()) {
                    connus.add(sansZeros(e));
                    eansConnus.add(sansZeros(e));
                }
            }
            for (String a : autres) {
                if (a != null && !a.trim().isEmpty()) {
                    connus.add(sansZeros(a));
                }
            }
            String attendu;
            if ((avecCip && connus.contains(sansZeros(cip))) || (avecGtin && connus.contains(sansZeros(ean)))) {
                attendu = "CONFORME";
            } else if ((avecCip && !connus.isEmpty()) || (avecGtin && !eansConnus.isEmpty())) {
                attendu = "DIFFERENT";
            } else {
                attendu = "INCONNU";
            }
            String obtenu = LotsCommandeService.comparerProduit(c, eans, autres);
            assertEquals(attendu, obtenu, c + " / " + eans + " / " + autres);
            vus["CONFORME".equals(obtenu) ? 0 : "DIFFERENT".equals(obtenu) ? 1 : 2]++;
        }
        /* les trois issues sont toutes largement couvertes */
        for (int v : vus) {
            org.junit.jupiter.api.Assertions.assertTrue(v > 2000, Arrays.toString(vus));
        }
    }

    /** Un code complet porte 01, 10 et 17 ; la lecture rend le lot et la date que l'ecran valide aussitot. */
    @Test
    void codeComplet() {
        Gs1.Contenu c = Gs1
                .lire("0103400930000106" + "17290331" + "21SER9X" + Gs1.GS + "10DM9" + Gs1.GS + "2401234567");
        assertEquals("03400930000106", c.gtin);
        assertEquals("DM9", c.lot);
        assertEquals("2029-03-31", String.valueOf(c.peremption));
        assertEquals("1234567", c.cip);
        Gs1.Contenu incomplet = Gs1.lire("17290331" + "10DM8");
        assertEquals(null, incomplet.gtin);
        assertEquals("DM8", incomplet.lot);
    }
}
