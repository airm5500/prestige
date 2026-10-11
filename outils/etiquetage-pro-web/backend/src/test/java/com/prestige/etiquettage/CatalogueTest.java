package com.prestige.etiquettage;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class CatalogueTest extends BaseDeTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;

    static void viderCatalogue(JdbcTemplate jdbc) {
        jdbc.update("DELETE FROM produit");
        jdbc.update("DELETE FROM historique");
        jdbc.update("DELETE FROM journal_import");
        jdbc.update("DELETE FROM modele_import");
        jdbc.update("DELETE FROM champ WHERE systeme = 0");
    }

    @BeforeEach
    void vider() {
        viderCatalogue(jdbc);
    }

    @AfterEach
    void nettoyer() {
        viderCatalogue(jdbc);
    }

    ResultActions json(MockHttpServletRequestBuilder r, String corps) throws Exception {
        return mvc.perform(r.with(user("admin")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(corps));
    }

    ResultActions lire(String url) throws Exception {
        return mvc.perform(get(java.net.URI.create(url)).with(user("admin")));
    }

    void creer(String cip, String des, String prix, String per) throws Exception {
        json(post("/api/produits"), "{\"cip\":\"" + cip + "\",\"designation\":\"" + des + "\",\"prix\":\"" + prix
                + "\",\"peremption\":\"" + per + "\"}").andExpect(status().isCreated());
    }

    @Test
    void sansConnexion() throws Exception {
        mvc.perform(get("/api/produits")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/champs")).andExpect(status().isUnauthorized());
    }

    @Test
    void champsDansLOrdre() throws Exception {
        lire("/api/champs").andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(10)))
                .andExpect(jsonPath("$[0].nom").value("cip")).andExpect(jsonPath("$[1].nom").value("designation"))
                .andExpect(jsonPath("$[0].obligatoire").value(true));
    }

    @Test
    void creationMiseEnForme() throws Exception {
        json(post("/api/produits"), "{\"cip\":\"3400930000014\",\"designation\":\" doliprane  1000mg \","
                + "\"prix\":\"1 250 F\",\"peremption\":\"12/2027\",\"lot\":\"A12\"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.valeurs.designation").value("DOLIPRANE 1000MG"))
                .andExpect(jsonPath("$.valeurs.prix").value("1250"))
                .andExpect(jsonPath("$.valeurs.peremption").value("31/12/2027"))
                .andExpect(jsonPath("$.valeurs.nombre").value("1")).andExpect(jsonPath("$.creePar").value("admin"));
        lire("/api/produits/3400930000014/historique").andExpect(jsonPath("$[0].source").value("Création (fiche)"));
    }

    @Test
    void creationRefuseeAvecErreursParChamp() throws Exception {
        json(post("/api/produits"), "{\"cip\":\"340093\",\"designation\":\"\",\"peremption\":\"31/02/2027\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Fiche incomplète : corrigez les champs signalés."))
                .andExpect(jsonPath("$.erreurs.cip").value("CIP 340093 : 6 chiffres (7 ou 13 attendus)."))
                .andExpect(jsonPath("$.erreurs.designation").value("Désignation obligatoire."))
                .andExpect(jsonPath("$.erreurs.peremption")
                        .value("Date invalide : février n'a pas de 31. Format jj/mm/aaaa."));
        json(post("/api/produits"), "{\"cip\":\"3400930000014\",\"designation\":\"X\",\"inconnu\":\"1\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.erreurs.inconnu").value("Champ inconnu."));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM produit", Integer.class));
    }

    @Test
    void cipEnDouble() throws Exception {
        creer("3400930000014", "A", "100", "");
        json(post("/api/produits"), "{\"cip\":\"3400930000014\",\"designation\":\"B\"}").andExpect(status().isConflict())
                .andExpect(jsonPath("$.erreurs.cip").value("Ce CIP existe déjà."));
    }

    @Test
    void controleSansEnregistrer() throws Exception {
        json(post("/api/produits/controle"), "{\"cip\":\"3400930000014\",\"designation\":\"a\",\"prix\":\"12,5\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.valeurs.designation").value("A"))
                .andExpect(jsonPath("$.erreurs.prix").value(containsString("entier")));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM produit", Integer.class));
    }

    @Test
    void modificationEtHistorique() throws Exception {
        creer("3400930000014", "DOLIPRANE", "1250", "31/12/2027");
        String fiche = "{\"cip\":\"3400930000014\",\"designation\":\"DOLIPRANE\",\"prix\":\"1300\","
                + "\"peremption\":\"31/12/2027\"}";
        json(put("/api/produits/3400930000014"), fiche.replace("3400930000014", "3400930000021"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erreurs.cip").value("Le CIP n'est pas modifiable."));
        json(put("/api/produits/3400930000014"), fiche).andExpect(status().isOk())
                .andExpect(jsonPath("$.valeurs.prix").value("1300")).andExpect(jsonPath("$.modifiePar").value("admin"));
        /* meme fiche : rien a historiser */
        json(put("/api/produits/3400930000014"), fiche).andExpect(status().isOk());
        lire("/api/produits/3400930000014/historique").andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].source").value("Fiche")).andExpect(jsonPath("$[0].qui").value("admin"))
                .andExpect(jsonPath("$[0].ecarts[0].libelle").value("Prix"))
                .andExpect(jsonPath("$[0].ecarts[0].avant").value("1250"))
                .andExpect(jsonPath("$[0].ecarts[0].apres").value("1300"));
        /* fiche : un champ vide est efface */
        json(put("/api/produits/3400930000014"), "{\"designation\":\"DOLIPRANE\",\"prix\":\"1300\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.valeurs.peremption").doesNotExist());
        json(put("/api/produits/3400930000099"), fiche).andExpect(status().isNotFound());
    }

    @Test
    void listeRechercheFiltresTriPages() throws Exception {
        creer("3400930000014", "DOLIPRANE 1000MG CPR", "1250", "31/12/2020");
        creer("3400930000021", "DOLIPRANE 500MG GEL", "900", "");
        creer("3400935294227", "EFFERALGAN 500", "1500", "");
        jdbc.update("UPDATE produit SET ean = '3400935294227' WHERE cip = '3400935294227'");
        jdbc.update("UPDATE produit SET peremption = DATE_ADD(CURDATE(), INTERVAL 2 MONTH) WHERE cip = '3400930000021'");
        lire("/api/produits?q=doli%20gel").andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.produits[0].cip").value("3400930000021"));
        lire("/api/produits?q=%25").andExpect(jsonPath("$.total").value(0));
        lire("/api/produits?q=0000014").andExpect(jsonPath("$.produits[*].cip", contains("3400930000014")));
        /* code GS1 d'une boite : (01) GTIN puis date et lot */
        lire("/api/produits?q=" + "0103400935294227172712311" + "0LOT").andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.produits[0].cip").value("3400935294227"));
        lire("/api/produits?peremption=depassee").andExpect(jsonPath("$.produits[*].cip", contains("3400930000014")));
        lire("/api/produits?peremption=3").andExpect(jsonPath("$.produits[*].cip", contains("3400930000021")));
        lire("/api/produits?tri=prix&sens=desc").andExpect(
                jsonPath("$.produits[*].cip", contains("3400935294227", "3400930000014", "3400930000021")));
        lire("/api/produits?tri=designation&taille=2&page=1").andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.produits[*].cip", contains("3400935294227")));
        lire("/api/produits/cips?q=doliprane&tri=prix")
                .andExpect(jsonPath("$", contains("3400930000021", "3400930000014")));
        lire("/api/produits?tri=inexistant").andExpect(status().isBadRequest());
        lire("/api/produits?peremption=demain").andExpect(status().isBadRequest());
    }

    @Test
    void lotDansLOrdre() throws Exception {
        creer("3400930000014", "A", "1", "");
        creer("3400930000021", "B", "2", "");
        json(post("/api/produits/lot"), "{\"cips\":[\"3400930000021\",\"9999999\",\"3400930000014\",\"3400930000021\"]}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].cip", contains("3400930000021", "3400930000014")));
    }

    @Test
    void suppression() throws Exception {
        creer("3400930000014", "A", "1", "");
        creer("3400930000021", "B", "2", "");
        json(post("/api/produits/suppression"), "{\"cips\":[\"3400930000014\",\"3400930000021\",\"9\"]}")
                .andExpect(jsonPath("$.supprimes").value(2));
        mvc.perform(delete("/api/produits/3400930000014").with(user("admin")).with(csrf()))
                .andExpect(status().isNotFound());
        lire("/api/produits/3400930000014").andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Produit 3400930000014 introuvable."));
        assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM historique WHERE source = 'Suppression'",
                Integer.class));
    }
}
