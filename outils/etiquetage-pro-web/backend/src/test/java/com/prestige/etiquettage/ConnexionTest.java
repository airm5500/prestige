package com.prestige.etiquettage;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class ConnexionTest extends BaseDeTest {

    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    PasswordEncoder chiffrement;

    @BeforeEach
    void compteAdminInitial() {
        jdbc.update("DELETE FROM utilisateur");
        jdbc.update("INSERT INTO utilisateur (login, mot_de_passe, mdp_par_defaut) VALUES ('admin', ?, 1)",
                chiffrement.encode("admin"));
    }

    MockHttpSession connecter(String login, String mdp, int attendu) throws Exception {
        MockHttpSession s = new MockHttpSession();
        mvc.perform(post("/api/connexion").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"" + login + "\",\"motDePasse\":\"" + mdp + "\"}")).andExpect(status().is(attendu));
        return s;
    }

    @Test
    void apiProtegeeSansConnexion() throws Exception {
        mvc.perform(get("/api/moi")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Session expirée : reconnectez-vous."));
        mvc.perform(get("/api/etat")).andExpect(status().isOk()).andExpect(jsonPath("$.premierLancement").value(true));
    }

    @Test
    void connexionAdminParDefaut() throws Exception {
        MockHttpSession s = connecter("admin", "admin", 200);
        mvc.perform(get("/api/moi").session(s)).andExpect(status().isOk()).andExpect(jsonPath("$.login").value("admin"))
                .andExpect(jsonPath("$.motDePasseParDefaut").value(true));
    }

    @Test
    void connexionSansSessionPrealable() throws Exception {
        /* premiere visite du navigateur : aucune session n'existe encore */
        var r = mvc.perform(post("/api/connexion").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"admin\",\"motDePasse\":\"admin\"}")).andExpect(status().isOk()).andReturn();
        MockHttpSession s = (MockHttpSession) r.getRequest().getSession(false);
        mvc.perform(get("/api/moi").session(s)).andExpect(status().isOk()).andExpect(jsonPath("$.login").value("admin"));
    }

    @Test
    void mauvaisMotDePasse() throws Exception {
        MockHttpSession s = connecter("admin", "faux", 401);
        mvc.perform(get("/api/moi").session(s)).andExpect(status().isUnauthorized());
        connecter("inconnu", "admin", 401);
    }

    @Test
    void sansJetonCsrfRefuse() throws Exception {
        mvc.perform(post("/api/connexion").contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"admin\",\"motDePasse\":\"admin\"}")).andExpect(status().isForbidden());
    }

    @Test
    void changerMotDePasse() throws Exception {
        MockHttpSession s = connecter("admin", "admin", 200);
        mvc.perform(post("/api/mot-de-passe").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"actuel\":\"faux\",\"nouveau\":\"secret12\"}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/mot-de-passe").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"actuel\":\"admin\",\"nouveau\":\"abc\"}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/mot-de-passe").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"actuel\":\"admin\",\"nouveau\":\"secret12\"}")).andExpect(status().isOk());
        connecter("admin", "admin", 401);
        MockHttpSession s2 = connecter("admin", "secret12", 200);
        mvc.perform(get("/api/moi").session(s2)).andExpect(jsonPath("$.motDePasseParDefaut").value(false));
        mvc.perform(get("/api/etat")).andExpect(jsonPath("$.premierLancement").value(false));
    }

    @Autowired
    com.prestige.etiquettage.securite.CompteParDefaut compteParDefaut;

    @Test
    void motDePasseOublieParFichier() throws Exception {
        java.nio.file.Path dossier = java.nio.file.Paths.get("target", "donnees-essai").toAbsolutePath();
        java.nio.file.Files.createDirectories(dossier);
        MockHttpSession s = connecter("admin", "admin", 200);
        mvc.perform(post("/api/mot-de-passe").session(s).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"actuel\":\"admin\",\"nouveau\":\"oublie123\"}")).andExpect(status().isOk());
        jdbc.update("UPDATE utilisateur SET actif = 0 WHERE login = 'admin'");
        connecter("admin", "oublie123", 401);
        org.junit.jupiter.api.Assertions.assertFalse(compteParDefaut.reinitialiserSiDemande(dossier), "sans fichier : rien");
        java.nio.file.Path f = dossier.resolve(com.prestige.etiquettage.securite.CompteParDefaut.REINITIALISER);
        java.nio.file.Files.writeString(f, "");
        org.junit.jupiter.api.Assertions.assertTrue(compteParDefaut.reinitialiserSiDemande(dossier));
        org.junit.jupiter.api.Assertions.assertFalse(java.nio.file.Files.exists(f), "fichier retire");
        MockHttpSession s2 = connecter("admin", "admin", 200);
        mvc.perform(get("/api/moi").session(s2)).andExpect(jsonPath("$.motDePasseParDefaut").value(true));
        java.nio.file.Files.deleteIfExists(dossier);
    }

    @Test
    void deconnexion() throws Exception {
        MockHttpSession s = connecter("admin", "admin", 200);
        mvc.perform(post("/api/deconnexion").session(s).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/api/moi").session(s)).andExpect(status().isUnauthorized());
    }
}
