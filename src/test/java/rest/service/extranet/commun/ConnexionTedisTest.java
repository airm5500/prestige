package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.FauxExtranet.Appel;
import rest.service.extranet.commun.FauxExtranet.Reponse;

/**
 * Connexion TEDIS (cas du 08/11 : 405 sur /login). La page /login porte un formulaire SANS adresse d'envoi : le site
 * l'envoie en AJAX (jQuery) a la racine « / » et recoit du JSON : {error, msg} refus ; {errorServer} ou
 * {erreurServeurIndisponible} panne ; {succes, data.PremierePageApresConnexion} connecte. Formulaire et reponses
 * reproduits d'apres la page relevee le 08/11 (sans aucune valeur reelle).
 */
class ConnexionTedisTest {

    static final String IDENTIFIANT = "PHARMA-ESSAI";
    static final String MOT_DE_PASSE = "Mdp&=é+ %essai";
    static final String JETON = "jeton-tedis-40-caracteres-0000000000000";

    /** Formulaire tel que releve : method=post, pas d'action, _token cache, champs email et password. */
    static String pageLogin() {
        return "<html><head><title>TEDIS PHARMA CI - Bienvenue sur notre Extranet !</title></head><body>"
                + "<form method=\"post\" id=\"loginForm\" class=\"signup-form\">"
                + "<input type=\"hidden\" name=\"_token\" value=\"" + JETON + "\">"
                + "<div id=\"mailOrPasswordError\"></div>"
                + "<input type=\"text\" class=\"form-control\" placeholder=\"Login\" name=\"email\" id=\"username\" required>"
                + "<input type=\"password\" class=\"form-control\" name=\"password\" required id=\"password\">"
                + "<button id=\"btnSubmit\" type=\"submit\"><span id=\"checktext\"> Connexion </span></button>"
                + "</form></body></html>";
    }

    /**
     * Faux TEDIS : GET /login pose XSRF-TOKEN et laravel_session ; POST /login refuse (405, comme le vrai) ; POST /
     * repond en JSON selon {@code reponse} (null : identifiants verifies).
     */
    static FauxExtranet tedis(AtomicInteger sessions, String reponseForcee) throws Exception {
        FauxExtranet f = new FauxExtranet();
        f.routeAppel("/login", a -> {
            if (!"GET".equals(a.methode)) {
                return new Reponse(405, "text/html", "Method Not Allowed".getBytes(StandardCharsets.UTF_8), null);
            }
            return new Reponse(200, "text/html; charset=utf-8", pageLogin().getBytes(StandardCharsets.UTF_8),
                    Map.of("Set-Cookie", "XSRF-TOKEN=x-tedis; Path=/"));
        });
        f.routeAppel("/", a -> {
            if ("GET".equals(a.methode)) {
                return Reponse.html(pageLogin());
            }
            if (reponseForcee != null) {
                return Reponse.json(reponseForcee);
            }
            Map<String, String> c = ConnexionExtranetTest.champs(a.corps);
            boolean bon = JETON.equals(c.get("_token")) && IDENTIFIANT.equals(c.get("email"))
                    && MOT_DE_PASSE.equals(c.get("password")) && a.cookie != null
                    && a.cookie.contains("XSRF-TOKEN=x-tedis") && "XMLHttpRequest".equals(a.ajax);
            if (!bon) {
                return Reponse.json("{\"error\":true,\"msg\":\"Login ou mot de passe incorrect\"}");
            }
            return new Reponse(200, "application/json",
                    "{\"succes\":true,\"data\":{\"PremierePageApresConnexion\":1}}".getBytes(StandardCharsets.UTF_8),
                    Map.of("Set-Cookie", "laravel_session=ok-" + sessions.incrementAndGet() + "; Path=/; HttpOnly"));
        });
        /* page protegee : lisible avec la session ouverte par la connexion, sinon retour a la page de connexion */
        f.routeAppel("/dashboard",
                a -> a.cookie != null && n(sessions) > 0 && a.cookie.contains("laravel_session=ok-" + sessions.get())
                        ? Reponse.html("<html><body><h1>Tableau de bord</h1></body></html>")
                        : Reponse.html(pageLogin()));
        return f;
    }

    private static int n(AtomicInteger a) {
        return a.get();
    }

    static ConnexionExtranet connexion(FauxExtranet f, SessionExtranet session, String mdp, String empreinte) {
        ExtranetConfiguration conf = ExtranetConfiguration
                .de(Map.of("EXTRANET_TEDIS_URL", f.adresse(), "EXTRANET_TEDIS_PAUSE_MS", "0"));
        ConnexionExtranet c = new ConnexionExtranet(session, conf);
        c.identifiants(new ConnexionExtranet.Identifiants(IDENTIFIANT, mdp, empreinte, "/login", null));
        return c;
    }

    static List<Appel> posts(FauxExtranet f) {
        return f.appels().stream().filter(a -> !"GET".equals(a.methode)).collect(Collectors.toList());
    }

    @Test
    void connexionAjaxALaRacineEtReponseJson() throws Exception {
        AtomicInteger n = new AtomicInteger();
        try (FauxExtranet f = tedis(n, null)) {
            SessionExtranet s = new SessionExtranet(SourceExtranet.TEDIS);
            connexion(f, s, MOT_DE_PASSE, "e1").connecter();
            List<Appel> p = posts(f);
            assertEquals(1, p.size(), "un seul POST");
            assertEquals("/", p.get(0).chemin, "envoi a la racine, comme le site (jamais /login : 405)");
            assertEquals("XMLHttpRequest", p.get(0).ajax);
            Map<String, String> c = ConnexionExtranetTest.champs(p.get(0).corps);
            assertEquals(JETON, c.get("_token"));
            assertEquals(IDENTIFIANT, c.get("email"));
            assertEquals(MOT_DE_PASSE, c.get("password"));
            assertEquals(3, c.size());
            assertEquals(SessionExtranet.Etat.A_VERIFIER, s.etat(), "session ouverte, pas encore lue");
            assertEquals("CONNEXION", s.publique().getString("mode"));
            assertTrue(s.publique().isNull("echecConnexion"));
            assertEquals(1, n.get());
        }
        /* bout en bout : sans session, le transport se connecte seul puis lit une page protegee avec le cookie recu */
        AtomicInteger m = new AtomicInteger();
        try (FauxExtranet f = tedis(m, null)) {
            TransportExtranet t = f.transportAvecConnexion(SourceExtranet.TEDIS, null,
                    new ConnexionExtranet.Identifiants(IDENTIFIANT, MOT_DE_PASSE, "e1", "/login", null));
            assertTrue(t.lire("/dashboard", null, TransportExtranet.Attendu.HTML, null).texte()
                    .contains("Tableau de bord"));
            assertEquals(SessionExtranet.Etat.VALIDE, t.session().etat());
            assertEquals(1, posts(f).size());
        }
    }

    @Test
    void refusJsonNonRetenteAvantModification() throws Exception {
        AtomicInteger n = new AtomicInteger();
        try (FauxExtranet f = tedis(n, null)) {
            SessionExtranet s = new SessionExtranet(SourceExtranet.TEDIS);
            ConnexionExtranet c = connexion(f, s, "mauvais", "e1");
            ExtranetException e = assertThrows(ExtranetException.class, c::connecter);
            assertEquals(ExtranetException.Nature.CONNEXION_REFUSEE, e.nature());
            assertTrue(e.getMessage().contains("refusé"), e.getMessage());
            assertFalse(e.getMessage().contains("mauvais"));
            /* memes identifiants : aucun nouvel envoi */
            assertThrows(ExtranetException.class, c::connecter);
            assertEquals(1, posts(f).size());
            /* corriges : connexion */
            c.identifiants(new ConnexionExtranet.Identifiants(IDENTIFIANT, MOT_DE_PASSE, "e2", "/login", null));
            c.connecter();
            assertEquals(2, posts(f).size());
            assertEquals(SessionExtranet.Etat.A_VERIFIER, s.etat());
            assertTrue(s.publique().isNull("echecConnexion"));
        }
    }

    @Test
    void panneServeurNiRefusNiBlocage() throws Exception {
        for (String r : new String[] { "{\"errorServer\":true,\"msg\":\"Erreur serveur\"}",
                "{\"erreurServeurIndisponible\":true,\"msg\":\"Serveur indisponible\"}", "{\"autre\":1}",
                "pas du json" }) {
            try (FauxExtranet f = tedis(new AtomicInteger(), r)) {
                SessionExtranet s = new SessionExtranet(SourceExtranet.TEDIS);
                ConnexionExtranet c = connexion(f, s, MOT_DE_PASSE, "e1");
                ExtranetException e = assertThrows(ExtranetException.class, c::connecter, r);
                if (r.contains("rreur") || r.contains("errorServer")) {
                    assertEquals(ExtranetException.Nature.TRANSPORT, e.nature(), r);
                    /* une panne ne bloque pas les identifiants : nouvel essai permis */
                    assertThrows(ExtranetException.class, c::connecter);
                    assertEquals(2, posts(f).size(), r);
                } else {
                    assertEquals(ExtranetException.Nature.CONNEXION_REFUSEE, e.nature(), r);
                }
                assertFalse(s.etat() == SessionExtranet.Etat.VALIDE, r);
            }
        }
    }

    @Test
    void pageParDefautTedis() {
        assertEquals("https://www.tedispharma-ci.com/login",
                SourceExtranet.TEDIS.pageConnexionParDefaut("https://www.tedispharma-ci.com"));
        assertNull(SourceExtranet.TEDIS.pageConnexionParDefaut("http://127.0.0.1:18765"));
        assertEquals("/", SourceExtranet.TEDIS.actionConnexionAjax());
        assertNull(SourceExtranet.UBIPHARM.actionConnexionAjax(), "Ubipharm : formulaire classique");
    }
}
