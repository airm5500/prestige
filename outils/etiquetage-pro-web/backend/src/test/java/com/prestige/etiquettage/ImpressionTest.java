package com.prestige.etiquettage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.itextpdf.text.pdf.PdfReader;
import com.itextpdf.text.pdf.parser.PdfTextExtractor;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@AutoConfigureMockMvc
class ImpressionTest extends BaseDeTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;

    void vider() {
        CatalogueTest.viderCatalogue(jdbc);
        jdbc.update("DELETE FROM reglage");
        jdbc.update("DELETE FROM code_etiquette");
        jdbc.update("DELETE FROM disposition");
    }

    @BeforeEach
    void preparer() {
        vider();
        jdbc.update("INSERT INTO produit (cip, designation, prix, lot, peremption, ean, grossiste, nombre) VALUES"
                + " ('3400930000014', 'DOLIPRANE 1000MG', 1250, 'A12', '2027-12-31', '3400930000014', 'UBIPHARM', 2),"
                + " ('3400930000021', 'EFFERALGAN 500', 900, NULL, '2020-01-31', NULL, NULL, 1),"
                + " ('3400930000038', 'SPASFON', NULL, NULL, NULL, NULL, NULL, 1)");
    }

    @AfterEach
    void nettoyer() {
        vider();
    }

    ResultActions json(MockHttpServletRequestBuilder r, String corps) throws Exception {
        return mvc.perform(r.with(user("admin")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(corps));
    }

    byte[] pdf(String url, String corps) throws Exception {
        return json(post(url), corps).andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andReturn().getResponse().getContentAsByteArray();
    }

    static String texte(byte[] pdf) throws Exception {
        PdfReader r = new PdfReader(pdf);
        StringBuilder b = new StringBuilder();
        for (int i = 1; i <= r.getNumberOfPages(); i++) {
            b.append(PdfTextExtractor.getTextFromPage(r, i)).append('\n');
        }
        return b.toString();
    }

    static int pages(byte[] pdf) throws Exception {
        return new PdfReader(pdf).getNumberOfPages();
    }

    void reglerPharmacie() throws Exception {
        json(put("/api/impression/reglages"), "{\"officine\":\"PHARMACIE DU LAC\",\"monnaie\":\"CFA\","
                + "\"code\":\"CODE128\",\"modele\":\"CARRE_38X21_2\",\"planche\":{}}").andExpect(status().isOk());
    }

    @Test
    void reglages() throws Exception {
        mvc.perform(get("/api/impression/reglages").with(user("admin"))).andExpect(jsonPath("$.monnaie").value("CFA"))
                .andExpect(jsonPath("$.code").value("CODE128")).andExpect(jsonPath("$.modele").value("CARRE_38X21_2"))
                .andExpect(jsonPath("$.codes.length()").value(5));
        json(put("/api/impression/reglages"), "{\"officine\":\" Pharmacie  du Lac \",\"monnaie\":\"F\",\"code\":\"qr\","
                + "\"modele\":\"PERSONNALISE\",\"planche\":{\"colonnes\":\"4\",\"lignes\":\"10\",\"largeur\":\"48,5\","
                + "\"hauteur\":\"25\",\"decalageX\":\"-1.5\"}}").andExpect(status().isOk())
                .andExpect(jsonPath("$.officine").value("Pharmacie du Lac")).andExpect(jsonPath("$.code").value("QR"))
                .andExpect(jsonPath("$.planche.largeur").value("48.5"))
                .andExpect(jsonPath("$.planche.decalageX").value("-1.5"));
        json(put("/api/impression/reglages"), "{\"modele\":\"PERSONNALISE\",\"planche\":{\"colonnes\":\"0\","
                + "\"echelle\":\"200\",\"inconnu\":\"1\"}}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erreurs.colonnes").value("Nombre entier de 1 à 20 attendu."))
                .andExpect(jsonPath("$.erreurs.echelle").value("Nombre de 50 à 150 attendu."))
                .andExpect(jsonPath("$.erreurs.inconnu").value("Réglage inconnu."));
        json(put("/api/impression/reglages"), "{\"modele\":\"A3\"}").andExpect(status().isBadRequest());
        /* le refus n'a rien change */
        mvc.perform(get("/api/impression/reglages").with(user("admin"))).andExpect(jsonPath("$.planche.colonnes").value("4"));
    }

    @Test
    void resumeAvantImpression() throws Exception {
        json(post("/api/impression/resume"), "{\"cips\":[\"3400930000014\",\"3400930000021\",\"3400930000099\"],"
                + "\"nombres\":{\"3400930000021\":9},\"position\":60}").andExpect(status().isOk())
                .andExpect(jsonPath("$.produits").value(2)).andExpect(jsonPath("$.etiquettes").value(11))
                .andExpect(jsonPath("$.parPage").value(65)).andExpect(jsonPath("$.pages").value(2))
                .andExpect(jsonPath("$.introuvables[0]").value("3400930000099"))
                .andExpect(jsonPath("$.alertes[0].cip").value("3400930000021"))
                .andExpect(jsonPath("$.alertes[0].avertissements[0]").value("Lot périmé (31/01/2020)"));
        json(post("/api/impression/resume"), "{\"cips\":[\"3400930000014\"],\"position\":66}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Case de départ : de 1 à 65 sur cette planche."));
        json(post("/api/impression/resume"), "{\"cips\":[]}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Cochez au moins un produit."));
    }

    @Test
    void impressionCodeBarres() throws Exception {
        reglerPharmacie();
        byte[] p = pdf("/api/impression/pdf", "{\"cips\":[\"3400930000014\",\"3400930000038\"],\"position\":64}");
        assertEquals(2, pages(p), "2 etiquettes du Doliprane + 1 Spasfon depuis la case 64 : 2 pages");
        String t = texte(p);
        assertTrue(t.contains("DOLIPRANE 1000MG"), t);
        assertTrue(t.contains("1 250 CFA"), t);
        assertTrue(t.contains("PHARMACIE DU LAC"), t);
        assertTrue(t.contains("SPASFON"), t);
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM code_etiquette", Integer.class),
                "code-barres : aucun code d'etiquette");
    }

    @Test
    void impressionDataMatrixPlusCodesUniques() throws Exception {
        reglerPharmacie();
        byte[] p = pdf("/api/impression/pdf", "{\"cips\":[\"3400930000014\",\"3400930000021\"],"
                + "\"nombres\":{\"3400930000014\":5},\"code\":\"DATAMATRIX_PLUS\"}");
        assertEquals(1, pages(p));
        List<String> codes = jdbc.queryForList("SELECT code FROM code_etiquette", String.class);
        assertEquals(6, codes.size(), "un code par etiquette 2D");
        String prefixe = jdbc.queryForObject("SELECT valeur FROM reglage WHERE cle = 'codes.prefixe'", String.class);
        assertTrue(codes.stream().allMatch(c -> c.length() == 5 && c.startsWith(prefixe)), codes.toString());
        assertEquals(6, codes.stream().distinct().count());
        assertTrue(texte(p).contains(codes.get(0)) || texte(p).contains(codes.get(5)), "code imprime");
        /* le prefixe reste le meme d'une impression a l'autre */
        pdf("/api/impression/pdf", "{\"cips\":[\"3400930000038\"],\"code\":\"QR_PLUS\"}");
        assertEquals(prefixe, jdbc.queryForObject("SELECT valeur FROM reglage WHERE cle = 'codes.prefixe'", String.class));
    }

    @Test
    void pageDeTestEtPlanchePersonnalisee() throws Exception {
        byte[] p = pdf("/api/impression/test", "{\"modele\":\"PERSONNALISE\",\"planche\":{\"colonnes\":\"3\","
                + "\"lignes\":\"8\",\"largeur\":\"63.5\",\"hauteur\":\"33.9\"}}");
        assertEquals(1, pages(p));
        assertTrue(texte(p).contains("24"), "positions numerotees jusqu'a 24");
        json(post("/api/impression/test"), "{\"modele\":\"PERSONNALISE\",\"planche\":{\"largeur\":\"5\"}}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erreurs.largeur").value("Nombre de 10 à 210 attendu."));
        json(post("/api/impression/resume"), "{\"cips\":[\"3400930000014\"],\"modele\":\"PERSONNALISE\","
                + "\"planche\":{\"colonnes\":\"3\",\"lignes\":\"8\",\"largeur\":\"63.5\",\"hauteur\":\"33.9\"}}")
                .andExpect(jsonPath("$.parPage").value(24)).andExpect(jsonPath("$.largeur").value(63.5));
    }

    @Test
    void personnalisation() throws Exception {
        reglerPharmacie();
        String c = json(post("/api/personnalisation/charger"), "{\"code\":\"QR_PLUS\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("proposee")).andExpect(jsonPath("$.largeur").value(38.0))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        JSONObject disp = new JSONObject(c).getJSONObject("disposition");
        /* apercu reel sur un produit du catalogue */
        json(post("/api/personnalisation/controler"), new JSONObject().put("disposition", disp)
                .put("exemple", new JSONObject().put("cip", "3400930000014")).toString()).andExpect(status().isOk())
                .andExpect(jsonPath("$.valeurs.DESIGNATION").value("DOLIPRANE 1000MG"))
                .andExpect(jsonPath("$.valeurs.PHARMACIE").value("PHARMACIE DU LAC"))
                .andExpect(jsonPath("$.controle.valide").value(true));
        /* code reduit a 3 mm : illisible, refuse */
        JSONObject petit = new JSONObject(disp.toString());
        JSONArray el = petit.getJSONArray("elements");
        for (int i = 0; i < el.length(); i++) {
            if ("CODE".equals(el.getJSONObject(i).getString("element"))) {
                el.getJSONObject(i).put("l", 3).put("h", 3);
            }
        }
        json(post("/api/personnalisation/enregistrer"), new JSONObject().put("disposition", petit).toString())
                .andExpect(status().isBadRequest());
        /* disposition valide : enregistree puis utilisee */
        json(post("/api/personnalisation/enregistrer"), new JSONObject().put("disposition", disp).toString())
                .andExpect(status().isOk()).andExpect(jsonPath("$.cle").value("QR_PLUS|38.0x21.2"));
        json(post("/api/personnalisation/charger"), "{\"code\":\"QR_PLUS\"}")
                .andExpect(jsonPath("$.source").value("enregistree"))
                .andExpect(jsonPath("$.enregistrees[0].modifiePar").value("admin"));
        /* autre planche, meme type : reportee a l'echelle */
        json(post("/api/personnalisation/charger"), "{\"code\":\"QR_PLUS\",\"modele\":\"PERSONNALISE\","
                + "\"planche\":{\"largeur\":\"50\",\"hauteur\":\"30\"}}").andExpect(jsonPath("$.source").value("echelle"))
                .andExpect(jsonPath("$.depuis").value("38.0 x 21.2 mm"));
        byte[] essai = pdf("/api/personnalisation/essai", new JSONObject().put("disposition", disp).put("position", 7)
                .toString());
        assertEquals(1, pages(essai));
        assertTrue(texte(pdf("/api/impression/pdf", "{\"cips\":[\"3400930000014\"],\"code\":\"QR_PLUS\"}"))
                .contains("DOLIPRANE"));
        json(post("/api/personnalisation/supprimer"), "{\"type\":\"QR_PLUS\",\"largeur\":38,\"hauteur\":21.2}")
                .andExpect(jsonPath("$.supprimee").value(true));
        json(post("/api/personnalisation/charger"), "{\"code\":\"QR_PLUS\"}")
                .andExpect(jsonPath("$.source").value("proposee"));
        json(post("/api/personnalisation/controler"), "{\"disposition\":\"x\"}").andExpect(status().isBadRequest());
    }

    @Test
    void volumeDeuxMilleEtiquettes2D() throws Exception {
        long t0 = System.currentTimeMillis();
        byte[] p = pdf("/api/impression/pdf", "{\"cips\":[\"3400930000014\",\"3400930000038\"],"
                + "\"nombres\":{\"3400930000014\":999,\"3400930000038\":999},\"code\":\"DATAMATRIX_PLUS\"}");
        long t = System.currentTimeMillis() - t0;
        System.out.println("IMPRESSION 1998 etiquettes DataMatrix+ : " + t + " ms, " + p.length / 1024 + " Ko");
        assertEquals(31, pages(p));
        assertEquals(1998, jdbc.queryForObject("SELECT COUNT(DISTINCT code) FROM code_etiquette", Integer.class));
        assertTrue(t < 60_000, "impression trop lente : " + t + " ms");
    }

    @Test
    void sansConnexion() throws Exception {
        mvc.perform(post("/api/impression/pdf").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"cips\":[\"3400930000014\"]}")).andExpect(status().isUnauthorized());
    }
}
