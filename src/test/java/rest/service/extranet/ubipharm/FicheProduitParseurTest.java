package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ExtranetException;

/**
 * Lecture de /SavoirPlusJSON sur des jeux d'essai reconstitues a partir du plan du 07/11 (§4) : ils seront remplaces
 * par des captures reelles.
 */
class FicheProduitParseurTest {

    static String ressource(String nom) throws IOException {
        try (InputStream in = FicheProduitParseurTest.class.getResourceAsStream("/extranet/ubipharm/fiche/" + nom)) {
            assertNotNull(in, nom);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Test
    void exempleFair248DuPlanReluChampParChamp() throws Exception {
        FicheProduitUbipharm f = FicheProduitParseur.lire(ressource("reconstitue-FAIR248.json"));
        assertEquals("FAIR248", f.pscode());
        assertEquals("FAIR&W GLUTAT GEL DCHE ECLAT E", f.pslib());
        assertEquals("XTRA1000ML", f.pslibc());
        assertEquals("3000001262862", f.picode());
        assertEquals("Normal", f.stlib());
        assertEquals("6431", f.pspvenBrut());
        assertEquals(0, new BigDecimal("6431").compareTo(f.pspven()));
        assertEquals("9110", f.psppubBrut());
        assertEquals(0, new BigDecimal("9110").compareTo(f.psppub()));
        assertEquals("18", f.tvtauxBrut());
        assertEquals(0, new BigDecimal("18").compareTo(f.tvtaux()));
        assertEquals(Integer.valueOf(31), f.psstkSoc());
        /* champs sans valeur dans l'exemple : absents, pas nuls */
        for (String c : new String[] { "cmcode", "falib", "nalib", "fslib", "psdtcr", "pspvig",
                "nbProduitsSubstitution" }) {
            assertTrue(f.absent(c), c);
        }
        assertNull(f.pspvig());
        assertNull(f.nbProduitsSubstitution());

        List<StockAgenceUbipharm> a = f.agences();
        assertEquals(4, a.size());
        String[][] attendu = { { "BKE", "UBIPHARM BOUAKE", "6" }, { "GNA", "UBIPHARM GAGNOA", "0" },
                { "VRI", "UBIPHARM ZONE 4", "0" }, { "YOP", "YOPOUGON CLIENT", "25" } };
        for (int i = 0; i < 4; i++) {
            assertEquals(attendu[i][0], a.get(i).etcode());
            assertEquals(attendu[i][1], a.get(i).etlib());
            assertEquals(Integer.valueOf(attendu[i][2]), a.get(i).psstk());
            assertEquals(attendu[i][2], a.get(i).psstkBrut());
        }
        assertEquals(List.of(12), a.get(3).colisages());
        assertEquals("[12]", a.get(3).colisagesBrut());
        /* colisages non donnes pour BKE, GNA, VRI : inconnus (null), pas une liste vide */
        for (int i = 0; i < 3; i++) {
            assertNull(a.get(i).colisages());
            assertTrue(a.get(i).absent("colisages"));
        }
        /* 6 + 0 + 0 + 25 = 31 ici ; les deux valeurs sont exposees, l'egalite n'est pas une regle */
        assertEquals(Integer.valueOf(31), f.sommeStockAgences());

        JSONObject j = f.toJson();
        assertEquals("UBIPHARM", j.getString("source"));
        assertEquals("3000001262862", j.getString("picode"));
        assertEquals(31, j.getInt("psstkSoc"));
        assertEquals(31, j.getInt("sommeStockAgences"));
        assertFalse(j.has("cmcode"), "un champ absent n'est pas ecrit");
        assertTrue(j.isNull("devise"));
        assertFalse(j.toString().contains("json_brut"));
        assertEquals(4, j.getJSONArray("agences").length());
    }

    @Test
    void listesVidesGardeesVidesEtSubstitutionNullDistincteDeListeVide() throws Exception {
        FicheProduitUbipharm f = FicheProduitParseur.lire(ressource("reconstitue-FAIR248.json"));
        for (String n : new String[] { "reappro", "promos", "arrivage", "substitu", "qttcde" }) {
            assertEquals("[]", f.listesBrutes().get(n), n);
        }
        assertEquals("null", f.listesBrutes().get("produitsSubstitution"));
        assertEquals(List.of(), f.cips());

        FicheProduitUbipharm v = FicheProduitParseur.lire(ressource("reconstitue-variantes.json"));
        assertEquals("[]", v.listesBrutes().get("produitsSubstitution"));
        assertEquals("null", v.listesBrutes().get("arrivage"));
        assertFalse(v.listesBrutes().containsKey("substitu"), "liste absente : pas d'entree");
        assertTrue(v.absent("substitu"));
        assertFalse(v.absent("arrivage"));

        JSONObject l = f.toJson().getJSONObject("listesBrutes");
        assertTrue(l.isNull("produitsSubstitution"));
        assertEquals(0, l.getJSONArray("promos").length());
        JSONObject lv = v.toJson().getJSONObject("listesBrutes");
        assertTrue(lv.get("produitsSubstitution") instanceof JSONArray);
        assertFalse(lv.has("substitu"));
    }

    @Test
    void cipEtPicodeGardesEnChainesAvecLeursZerosDeTete() throws Exception {
        FicheProduitUbipharm v = FicheProduitParseur.lire(ressource("reconstitue-variantes.json"));
        assertEquals("0001234567890", v.picode());
        assertEquals(List.of("0012345678901", "3400930000000", "00042"), v.cips());
        JSONArray c = v.toJson().getJSONArray("cips");
        assertEquals("0012345678901", c.getString(0));
        assertEquals("3400930000000", c.getString(1));
        assertEquals("00042", c.getString(2));
        /* une liste cips d'une forme inconnue n'est pas devinee : brut garde, liste inconnue */
        FicheProduitUbipharm o = FicheProduitParseur
                .lire("{\"produit\":{\"pscode\":\"X1\"},\"cips\":[{\"code\":\"001\"}]}");
        assertNull(o.cips());
        assertEquals("[{\"code\":\"001\"}]", o.cipsBrut());
        FicheProduitUbipharm s = FicheProduitParseur.lire("{\"produit\":{\"pscode\":\"X1\"}}");
        assertTrue(s.absent("cips"));
        assertFalse(s.toJson().has("cips"));
    }

    @Test
    void variantesNullVideZeroInconnuDistincts() throws Exception {
        FicheProduitUbipharm v = FicheProduitParseur.lire(ressource("reconstitue-variantes.json"));
        assertEquals("PRODUIT D'ESSAI RECONSTITUE", v.pslib());
        assertEquals("", v.pslibc());
        assertFalse(v.absent("pslibc"));
        assertNull(v.cmcode());
        assertFalse(v.absent("cmcode"));
        assertTrue(v.toJson().isNull("cmcode"));
        assertEquals("", v.falib());
        assertEquals("07/11/2026", v.psdtcrBrut());
        assertEquals("1 234,50", v.pspvenBrut());
        assertEquals(0, new BigDecimal("1234.50").compareTo(v.pspven()));
        assertNull(v.psppub());
        assertNull(v.psppubBrut());
        assertFalse(v.absent("psppub"));
        assertTrue(v.absent("pspvig"));
        assertEquals(0, BigDecimal.ZERO.compareTo(v.tvtaux()));
        assertNull(v.psstkSoc(), "N/A n'est pas 0");
        assertEquals("N/A", v.psstkSocBrut());
        assertEquals(Integer.valueOf(0), v.nbProduitsSubstitution());

        List<StockAgenceUbipharm> a = v.agences();
        assertEquals(5, a.size());
        assertEquals(Integer.valueOf(0), a.get(0).psstk());
        assertEquals(List.of(), a.get(0).colisages());
        assertNull(a.get(1).psstk());
        assertEquals("N/A", a.get(1).psstkBrut());
        assertNull(a.get(1).colisages());
        assertEquals("\"N/A\"", a.get(1).colisagesBrut());
        assertEquals(List.of(120, 140), a.get(2).colisages());
        assertNull(a.get(3).psstk());
        assertFalse(a.get(3).absent("psstk"));
        assertNull(a.get(3).colisages());
        assertEquals("null", a.get(3).colisagesBrut());
        assertNull(a.get(4).psstk());
        assertTrue(a.get(4).absent("psstk"));
        assertEquals(List.of(120, 140), a.get(4).colisages());
        /* deux lignes YOP : gardees telles quelles, sans dedoublonnage */
        assertEquals("YOP", a.get(3).etcode());
        assertEquals("YOP", a.get(4).etcode());
        /* un stock d'agence inconnu rend la somme inconnue, jamais une somme partielle */
        assertNull(v.sommeStockAgences());
        JSONObject j = v.toJson();
        assertTrue(j.isNull("sommeStockAgences"));
        assertTrue(j.isNull("psstkSoc"));
        JSONObject a3 = j.getJSONArray("agences").getJSONObject(3);
        assertTrue(a3.isNull("psstk") && a3.has("psstk"));
        assertFalse(j.getJSONArray("agences").getJSONObject(4).has("psstk"));
    }

    @Test
    void infosParEtablissementAbsentNullOuIllisible() throws Exception {
        FicheProduitUbipharm abs = FicheProduitParseur.lire("{\"produit\":{\"pscode\":\"X1\"}}");
        assertNull(abs.agences());
        assertTrue(abs.absent("infosParEtablissement"));
        assertFalse(abs.toJson().has("agences"));
        FicheProduitUbipharm nul = FicheProduitParseur
                .lire("{\"produit\":{\"pscode\":\"X1\",\"infosParEtablissement\":null}}");
        assertNull(nul.agences());
        assertTrue(nul.toJson().isNull("agences"));
        FicheProduitUbipharm vide = FicheProduitParseur
                .lire("{\"produit\":{\"pscode\":\"X1\",\"infosParEtablissement\":[]}}");
        assertEquals(0, vide.agences().size());
        assertEquals(Integer.valueOf(0), vide.sommeStockAgences());
        FicheProduitUbipharm ill = FicheProduitParseur
                .lire("{\"produit\":{\"pscode\":\"X1\",\"infosParEtablissement\":[{\"etcode\":\"A\"},\"x\"]}}");
        assertNull(ill.agences());
        assertEquals("[{\"etcode\":\"A\"},\"x\"]", ill.infosParEtablissementBrut());
    }

    @Test
    void racineInvalideRefusee() throws Exception {
        for (String t : new String[] { ressource("reconstitue-sans-produit.json"),
                ressource("reconstitue-sans-pscode.json"), "{\"produit\":null}", "{\"produit\":[]}",
                "{\"produit\":{\"pscode\":null}}", "{\"produit\":{\"pscode\":\"  \"}}",
                "{\"produit\":{\"pscode\":{\"a\":1}}}", "[{\"produit\":{\"pscode\":\"X\"}}]", "pas du json", "",
                null }) {
            ExtranetException e = assertThrows(ExtranetException.class, () -> FicheProduitParseur.lire(t), t);
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE, e.nature());
        }
        assertThrows(ExtranetException.class, () -> FicheProduitParseur.lire((JSONObject) null));
    }

    @Test
    void jsonBrutGardePourLaBaseMaisJamaisRenvoye() throws Exception {
        String brut = ressource("reconstitue-FAIR248.json");
        FicheProduitUbipharm f = FicheProduitParseur.lire(brut);
        assertEquals(brut, f.jsonBrut());
        assertFalse(f.toJson().has("jsonBrut"));
    }

    @Test
    void htmlDesLibellesNeSortJamaisDansLApi() throws Exception {
        FicheProduitUbipharm f = FicheProduitParseur.lire("{\"produit\":{\"pscode\":\"X1\","
                + "\"pslib\":\"<b>CREME</b> &lt;script&gt;alert(1)&lt;/script&gt; &amp; GEL\","
                + "\"infosParEtablissement\":[{\"etcode\":\"<i>A</i>\",\"etlib\":\"<img src=x onerror=1>\"}]},"
                + "\"promos\":[{\"<p>t</p>\":\"<a href='x'>lien</a>\"}]}");
        String j = f.toJson().toString();
        assertFalse(j.matches("(?s).*<\\s*[a-zA-Z/!?].*"), j);
        String lib = f.toJson().getString("pslib");
        assertTrue(lib.startsWith("CREME ") && lib.endsWith(" & GEL"), lib);
        assertFalse(lib.contains("<") || lib.contains(">"), lib);
        assertEquals("A", f.toJson().getJSONArray("agences").getJSONObject(0).getString("etcode"));
    }
}
