package com.prestige.etiquettage;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@AutoConfigureMockMvc
class ImportTest extends BaseDeTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;

    static final String CSV = String.join("\r\n", "Code CIP;Libellé;Prix public;Péremption;Lot;Famille",
            "3400930000014;DOLIPRANE 1000;1 300;12/2027;;Antalgique", // existant : prix et peremption changent, lot garde
            "3400930000021;doliprane 500;900;;;", // existant, rien ne change
            "3400930000038;Efferalgan;1 500 F;31/12/2027;L9;Antalgique", // nouveau
            "3400930000045;Spasfon;=1+1;;;", // prix en erreur (formule)
            "3400930000052;;800;;;", // nouveau sans designation
            "340093;Court;100;;;", // CIP invalide
            "3400930000069;Smecta;700;31/02/2027;;", // date impossible
            "3400930000076;Vogalene;400;;;", // doublon...
            "3400930000076;Vogalene lyoc;450;;;Antiemetique"); // ...derniere ligne gardee

    @BeforeEach
    void vider() {
        CatalogueTest.viderCatalogue(jdbc);
        jdbc.update("INSERT INTO produit (cip, designation, prix, lot, peremption) VALUES"
                + " ('3400930000014', 'DOLIPRANE 1000', 1250, 'A12', '2026-06-30'),"
                + " ('3400930000021', 'DOLIPRANE 500', 900, NULL, NULL)");
    }

    @AfterEach
    void nettoyer() {
        CatalogueTest.viderCatalogue(jdbc);
    }

    String envoyer(String nom, byte[] contenu, String... params) throws Exception {
        var r = multipart("/api/imports").file(new MockMultipartFile("fichier", nom, "text/csv", contenu));
        for (int i = 0; i < params.length; i += 2) {
            r.param(params[i], params[i + 1]);
        }
        return mvc.perform(r.with(user("admin")).with(csrf())).andExpect(status().isOk()).andReturn().getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
    }

    /** Correspondance proposee, telle quelle (ce que l'ecran renvoie si l'utilisateur ne change rien). */
    static String propositions(String analyse) {
        List<Map<String, Object>> l = JsonPath.read(analyse, "$.colonnes[*].proposition");
        StringBuilder b = new StringBuilder("{\"colonnes\":[");
        for (int i = 0; i < l.size(); i++) {
            Map<String, Object> c = l.get(i);
            b.append(i > 0 ? "," : "").append("{\"index\":").append(c.get("index")).append(",\"action\":\"")
                    .append(c.get("action")).append('"');
            for (String k : List.of("champ", "libelle", "type")) {
                if (c.get(k) != null) {
                    b.append(",\"").append(k).append("\":\"").append(c.get(k)).append('"');
                }
            }
            b.append('}');
        }
        return b.append("]}").toString();
    }

    ResultActions etape(String id, String etape, String corps) throws Exception {
        return mvc.perform(post("/api/imports/" + id + "/" + etape).with(user("admin")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(corps));
    }

    @Test
    void analysePropositions() throws Exception {
        String a = envoyer("tarif.csv", CSV.getBytes(StandardCharsets.UTF_8));
        assertEquals(9, (int) JsonPath.read(a, "$.lignes"));
        assertEquals(";", JsonPath.read(a, "$.separateur"));
        assertEquals(false, JsonPath.read(a, "$.modeleReconnu"));
        List<String> champs = JsonPath.read(a, "$.colonnes[*].proposition.champ");
        assertEquals(List.of("cip", "designation", "prix", "peremption", "lot"), champs.subList(0, 5));
        assertEquals("nouveau", JsonPath.read(a, "$.colonnes[5].proposition.action"));
        assertEquals("Famille", JsonPath.read(a, "$.colonnes[5].proposition.libelle"));
        assertEquals("TEXTE", JsonPath.read(a, "$.colonnes[5].proposition.type"));
        assertEquals(List.of("3400930000014", "3400930000021", "3400930000038"),
                JsonPath.read(a, "$.colonnes[0].exemples"));
    }

    @Test
    void controleSansEcrire() throws Exception {
        String a = envoyer("tarif.csv", CSV.getBytes(StandardCharsets.UTF_8));
        String id = JsonPath.read(a, "$.id");
        etape(id, "controle", propositions(a)).andExpect(status().isOk()).andExpect(jsonPath("$.lignes").value(9))
                .andExpect(jsonPath("$.nouveaux").value(2)).andExpect(jsonPath("$.misAJour").value(1))
                .andExpect(jsonPath("$.inchanges").value(1)).andExpect(jsonPath("$.lignesEnErreur").value(4))
                .andExpect(jsonPath("$.doublons").value(1))
                .andExpect(jsonPath("$.detailDoublons[0].lignes", contains(9, 10)))
                .andExpect(jsonPath("$.detailDoublons[0].gardee").value(10))
                .andExpect(jsonPath("$.champsAjoutes", contains("Famille")))
                .andExpect(jsonPath("$.erreurs[*].ligne", contains(5, 6, 7, 8)))
                .andExpect(jsonPath("$.erreurs[1].message").value("Désignation obligatoire pour un nouveau produit."))
                .andExpect(jsonPath("$.erreurs[2].message").value("CIP 340093 : 6 chiffres (7 ou 13 attendus)."))
                .andExpect(jsonPath("$.erreurs[3].message")
                        .value("Date invalide : février n'a pas de 31. Format jj/mm/aaaa."));
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM produit", Integer.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM champ WHERE systeme = 0", Integer.class));
        /* erreurs en CSV : cellules entre guillemets, formule neutralisee */
        String csv = mvc.perform(get("/api/imports/" + id + "/erreurs.csv").with(user("admin")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertTrue(csv.startsWith("﻿Ligne;CIP;Colonne;Valeur;Erreur\r\n"), csv);
        assertTrue(csv.contains("5;\"3400930000045\";\"Prix public\";\"'=1+1\";"), csv);
        assertEquals(5, csv.split("\r\n").length);
    }

    @Test
    void applicationMiseAJourParCipSansEffacer() throws Exception {
        String a = envoyer("tarif.csv", CSV.getBytes(StandardCharsets.UTF_8));
        String id = JsonPath.read(a, "$.id");
        etape(id, "appliquer", propositions(a)).andExpect(status().isOk()).andExpect(jsonPath("$.crees").value(2))
                .andExpect(jsonPath("$.misAJour").value(1)).andExpect(jsonPath("$.inchanges").value(1))
                .andExpect(jsonPath("$.champsAjoutes", contains("Famille")));
        Map<String, Object> doli = jdbc.queryForMap("SELECT * FROM produit WHERE cip = '3400930000014'");
        assertEquals(1300L, ((Number) doli.get("prix")).longValue());
        assertEquals("A12", doli.get("lot"), "cellule vide : le lot existant est garde");
        assertEquals("2027-12-31", doli.get("peremption").toString());
        assertEquals("admin", doli.get("modifie_par"));
        assertTrue(doli.get("champs_libres").toString().contains("\"x_famille\":\"Antalgique\""));
        Map<String, Object> vog = jdbc.queryForMap("SELECT * FROM produit WHERE cip = '3400930000076'");
        assertEquals("VOGALENE LYOC", vog.get("designation"));
        assertEquals(450L, ((Number) vog.get("prix")).longValue());
        assertNull(jdbc.queryForObject("SELECT modifie_le FROM produit WHERE cip = '3400930000021'", Object.class),
                "ligne inchangee : pas reecrite");
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM produit WHERE cip IN ('3400930000045',"
                + "'3400930000052','3400930000069')", Integer.class), "lignes en erreur non importees");
        /* champ ajoute, journal, historique, filtre dernier import (crees, mis a jour et inchanges) */
        mvc.perform(get("/api/champs").with(user("admin"))).andExpect(jsonPath("$[10].libelle").value("Famille"))
                .andExpect(jsonPath("$[10].systeme").value(false));
        mvc.perform(get("/api/imports/journal").with(user("admin"))).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].fichier").value("tarif.csv")).andExpect(jsonPath("$[0].crees").value(2))
                .andExpect(jsonPath("$[0].lignesEnErreur").value(4)).andExpect(jsonPath("$[0].doublons").value(1))
                .andExpect(jsonPath("$[0].champsAjoutes").value("Famille"));
        mvc.perform(get("/api/produits/3400930000014/historique").with(user("admin")))
                .andExpect(jsonPath("$[0].source").value("Import tarif.csv"))
                .andExpect(jsonPath("$[0].ecarts[*].champ", contains("prix", "peremption", "x_famille")));
        mvc.perform(get("/api/produits?dernierImport=true").with(user("admin"))).andExpect(jsonPath("$.produits[*].cip",
                containsInAnyOrder("3400930000014", "3400930000021", "3400930000038", "3400930000076")));
        mvc.perform(get("/api/produits/3400930000038").with(user("admin")))
                .andExpect(jsonPath("$.valeurs.x_famille").value("Antalgique"))
                .andExpect(jsonPath("$.valeurs.prix").value("1500"));
        /* tri sur le champ ajoute */
        mvc.perform(get("/api/produits?tri=x_famille&sens=desc&q=vogalene").with(user("admin")))
                .andExpect(jsonPath("$.total").value(1));
        /* deux fois : refuse */
        etape(id, "appliquer", propositions(a)).andExpect(status().isConflict());
    }

    @Test
    void correspondanceMemoriseeParFormat() throws Exception {
        String a = envoyer("tarif.csv", CSV.getBytes(StandardCharsets.UTF_8));
        String corps = propositions(a).replace("{\"index\":4,\"action\":\"champ\",\"champ\":\"lot\"}",
                "{\"index\":4,\"action\":\"ignorer\"}");
        etape(JsonPath.read(a, "$.id"), "appliquer", corps).andExpect(status().isOk());
        String b = envoyer("tarif-juin.csv", CSV.replace("Efferalgan", "Efferalgan 1g").getBytes(StandardCharsets.UTF_8));
        assertEquals(true, JsonPath.read(b, "$.modeleReconnu"));
        assertEquals("ignorer", JsonPath.read(b, "$.colonnes[4].proposition.action"));
        assertEquals("x_famille", JsonPath.read(b, "$.colonnes[5].proposition.champ"));
    }

    @Test
    void refus() throws Exception {
        String a = envoyer("tarif.csv", CSV.getBytes(StandardCharsets.UTF_8));
        String id = JsonPath.read(a, "$.id");
        etape(id, "controle", "{\"colonnes\":[{\"index\":1,\"action\":\"champ\",\"champ\":\"designation\"}]}")
                .andExpect(status().isBadRequest()).andExpect(
                        jsonPath("$.message").value("Associez une colonne au CIP : c'est lui qui identifie le produit."));
        etape(id, "controle", "{\"colonnes\":[{\"index\":0,\"action\":\"champ\",\"champ\":\"cip\"},"
                + "{\"index\":1,\"action\":\"champ\",\"champ\":\"cip\"}]}").andExpect(status().isBadRequest());
        etape(id, "controle", "{\"colonnes\":[{\"index\":0,\"action\":\"champ\",\"champ\":\"cip\"},"
                + "{\"index\":5,\"action\":\"nouveau\",\"libelle\":\"Prix\",\"type\":\"TEXTE\"}]}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Le champ « Prix » existe déjà : associez la colonne à ce champ."));
        etape("inconnu", "controle", propositions(a)).andExpect(status().isGone());
        /* un autre utilisateur ne reprend pas cet import */
        mvc.perform(post("/api/imports/" + id + "/controle").with(user("autre")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(propositions(a))).andExpect(status().isGone());
        mvc.perform(multipart("/api/imports")
                .file(new MockMultipartFile("fichier", "vide.csv", "text/csv", "CIP;Désignation\r\n".getBytes()))
                .with(user("admin")).with(csrf())).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Le fichier ne contient aucune ligne de produit."));
        mvc.perform(multipart("/api/imports").with(user("admin"))).andExpect(status().isForbidden());
    }

    @Test
    void classeurExcelSansTitres() throws Exception {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        try (XSSFWorkbook w = new XSSFWorkbook()) {
            Sheet s = w.createSheet("Tarif");
            CellStyle date = w.createCellStyle();
            date.setDataFormat(w.getCreationHelper().createDataFormat().getFormat("dd/mm/yyyy"));
            Object[][] lignes = { { 3400930000083d, "Gaviscon", 2100d }, { 3400930000090d, "Maalox", 1800d } };
            for (int i = 0; i < lignes.length; i++) {
                Row r = s.createRow(i);
                r.createCell(0).setCellValue((Double) lignes[i][0]);
                r.createCell(1).setCellValue((String) lignes[i][1]);
                r.createCell(2).setCellValue((Double) lignes[i][2]);
            }
            w.write(o);
        }
        String a = envoyer("tarif.xlsx", o.toByteArray(), "avecTitres", "false");
        assertEquals(List.of("Tarif"), JsonPath.read(a, "$.feuilles"));
        assertEquals("cip", JsonPath.read(a, "$.colonnes[0].proposition.champ"));
        assertEquals("designation", JsonPath.read(a, "$.colonnes[1].proposition.champ"));
        assertEquals("ignorer", JsonPath.read(a, "$.colonnes[2].proposition.action"));
        String corps = "{\"colonnes\":[{\"index\":0,\"action\":\"champ\",\"champ\":\"cip\"},"
                + "{\"index\":1,\"action\":\"champ\",\"champ\":\"designation\"},"
                + "{\"index\":2,\"action\":\"champ\",\"champ\":\"prix\"}]}";
        etape(JsonPath.read(a, "$.id"), "appliquer", corps).andExpect(status().isOk())
                .andExpect(jsonPath("$.crees").value(2));
        assertEquals(2100L, jdbc.queryForObject("SELECT prix FROM produit WHERE cip = '3400930000083'", Long.class));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM modele_import", Integer.class),
                "sans titres : rien a memoriser");
    }

    @Test
    void vingtMilleLignes() throws Exception {
        StringBuilder b = new StringBuilder("CIP;Désignation;Prix;Rayon\r\n");
        for (int i = 0; i < 20000; i++) {
            b.append(String.format("34%011d;PRODUIT %d;%d;R%d\r\n", i, i, 100 + i, i % 40));
        }
        long t0 = System.currentTimeMillis();
        String a = envoyer("gros.csv", b.toString().getBytes(StandardCharsets.UTF_8));
        String id = JsonPath.read(a, "$.id");
        etape(id, "controle", propositions(a)).andExpect(jsonPath("$.nouveaux").value(20000));
        etape(id, "appliquer", propositions(a)).andExpect(jsonPath("$.crees").value(20000));
        long t1 = System.currentTimeMillis();
        /* second passage : 20 000 mises a jour */
        String a2 = envoyer("gros.csv", b.toString().replace(";R", ";S").getBytes(StandardCharsets.UTF_8));
        etape(JsonPath.read(a2, "$.id"), "appliquer", propositions(a2)).andExpect(jsonPath("$.misAJour").value(20000));
        long t2 = System.currentTimeMillis();
        System.out.println("IMPORT 20000 : creation " + (t1 - t0) + " ms, mise a jour " + (t2 - t1) + " ms");
        assertTrue(t2 - t0 < 120_000, "import trop lent : " + (t2 - t0) + " ms");
        mvc.perform(get("/api/produits").param("q", "produit 1999").param("taille", "500").with(user("admin")))
                .andExpect(jsonPath("$.total").value(12)); // 1999, 11999, 19990 a 19999
    }
}
