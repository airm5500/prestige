package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.logging.Handler;
import java.util.logging.LogRecord;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.FauxExtranet.Appel;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.TransportExtranet.Attendu;

/**
 * Connexion automatique avec identifiant et mot de passe (decision du 07/11), contre un faux extranet local : le
 * formulaire est lu sur la page (jeton cache compris), un seul POST vers son action, reconnexion unique a l'expiration,
 * identifiants refuses jamais retentes, captcha jamais contourne, aucun secret dans les journaux.
 */
class ConnexionExtranetTest {

    static final String IDENTIFIANT = "pharma.test@exemple.ci";
    /** Caracteres speciaux : le codage du formulaire est verifie. */
    static final String MOT_DE_PASSE = "Mdp&=é+ %ç#essai";
    static final String JETON = "jeton-formulaire-42";

    static String formulaire(String action, String extra) {
        return "<html><body><h1>Connexion</h1><form method='post' action='" + action + "'>"
                + "<input type='hidden' name='_token' value='" + JETON + "'>"
                + "<input type='email' name='email'><input type='password' name='password'>"
                + "<input type='checkbox' name='remember'><input type='checkbox' name='cgu' value='1' checked>" + extra
                + "<button>Entrer</button></form></body></html>";
    }

    static Map<String, String> champs(String corps) {
        Map<String, String> m = new LinkedHashMap<>();
        for (String p : corps.split("&")) {
            int eg = p.indexOf('=');
            m.put(URLDecoder.decode(p.substring(0, eg), StandardCharsets.UTF_8),
                    URLDecoder.decode(p.substring(eg + 1), StandardCharsets.UTF_8));
        }
        return m;
    }

    static Reponse redirection(String vers, String setCookie) {
        Map<String, String> e = new LinkedHashMap<>();
        e.put("Location", vers);
        if (setCookie != null) {
            e.put("Set-Cookie", setCookie);
        }
        return new Reponse(302, "text/html", new byte[0], e);
    }

    /** Extranet type : / redirige vers /login (cookie XSRF), le POST ouvre la session SESSIONID=ok-N. */
    static FauxExtranet extranet(AtomicInteger sessions, String motDePasseAttendu) throws Exception {
        FauxExtranet f = new FauxExtranet();
        f.route("/", redirection("/login", "XSRF-TOKEN=x1; Path=/"));
        f.routeAppel("/login", a -> {
            if ("GET".equals(a.methode)) {
                /* le jeton XSRF est pose par la page de connexion elle-meme (et deja par /) */
                return new Reponse(200, "text/html; charset=utf-8",
                        formulaire("/login", "").getBytes(StandardCharsets.UTF_8),
                        Map.of("Set-Cookie", "XSRF-TOKEN=x1; Path=/"));
            }
            Map<String, String> c = champs(a.corps);
            boolean bon = JETON.equals(c.get("_token")) && IDENTIFIANT.equals(c.get("email"))
                    && motDePasseAttendu.equals(c.get("password")) && a.cookie != null
                    && a.cookie.contains("XSRF-TOKEN=x1");
            if (!bon) {
                return Reponse.html(formulaire("/login", "<p>Identifiants incorrects</p>"));
            }
            return redirection("/accueil", "SESSIONID=ok-" + sessions.incrementAndGet() + "; Path=/; HttpOnly");
        });
        f.routeAppel("/accueil", a -> Reponse.html("<html><body>Bienvenue</body></html>"));
        f.routeAppel("/donnees",
                a -> a.cookie != null && a.cookie.contains("SESSIONID=ok-" + sessions.get()) && sessions.get() > 0
                        ? Reponse.json("{\"ok\":true}") : Reponse.html(formulaire("/login", "")));
        return f;
    }

    static ConnexionExtranet.Identifiants ids(String mdp, String empreinte) {
        return new ConnexionExtranet.Identifiants(IDENTIFIANT, mdp, empreinte);
    }

    static List<Appel> posts(FauxExtranet f) {
        return f.appels().stream().filter(a -> !"GET".equals(a.methode)).collect(Collectors.toList());
    }

    @Test
    void sansSessionLeServeurSeConnecteSeulPuisLit() throws Exception {
        AtomicInteger n = new AtomicInteger();
        try (FauxExtranet f = extranet(n, MOT_DE_PASSE)) {
            TransportExtranet t = f.transportAvecConnexion(SourceExtranet.UBIPHARM, null, ids(MOT_DE_PASSE, "e1"));
            assertTrue(t.lire("/donnees", null, Attendu.JSON, null).texte().contains("ok"));
            List<Appel> p = posts(f);
            assertEquals(1, p.size());
            assertEquals("POST", p.get(0).methode);
            assertEquals("/login", p.get(0).chemin);
            Map<String, String> c = champs(p.get(0).corps);
            /* jeton cache repris, case cochee gardee, case non cochee absente, valeurs codees correctement */
            assertEquals(JETON, c.get("_token"));
            assertEquals(IDENTIFIANT, c.get("email"));
            assertEquals(MOT_DE_PASSE, c.get("password"));
            assertEquals("1", c.get("cgu"));
            assertFalse(c.containsKey("remember"));
            assertEquals(4, c.size());
            assertEquals(SessionExtranet.Etat.VALIDE, t.session().etat());
            assertEquals("CONNEXION", t.session().publique().getString("mode"));
            assertTrue(t.session().publique().isNull("echecConnexion"));
            /* la lecture suivante reutilise la session : aucun nouveau POST */
            t.lire("/donnees", null, Attendu.JSON, null);
            assertEquals(1, posts(f).size());
        }
    }

    @Test
    void sessionExpireeUneSeuleReconnexionPuisLeMemeAppel() throws Exception {
        AtomicInteger n = new AtomicInteger();
        try (FauxExtranet f = extranet(n, MOT_DE_PASSE)) {
            TransportExtranet t = f.transportAvecConnexion(SourceExtranet.UBIPHARM, null, ids(MOT_DE_PASSE, "e1"));
            t.lire("/donnees", null, Attendu.JSON, null);
            /* l'extranet invalide la session ok-1 : seule la suivante, ok-2, est acceptee */
            f.routeAppel("/donnees", a -> a.cookie != null && a.cookie.contains("SESSIONID=ok-2")
                    ? Reponse.json("{\"ok\":2}") : Reponse.html(formulaire("/login", "")));
            assertTrue(t.lire("/donnees", null, Attendu.JSON, null).texte().contains("2"));
            assertEquals(2, posts(f).size());
            assertEquals(SessionExtranet.Etat.VALIDE, t.session().etat());
        }
    }

    @Test
    void reconnexionSansEffetPasDeBoucle() throws Exception {
        AtomicInteger n = new AtomicInteger();
        try (FauxExtranet f = extranet(n, MOT_DE_PASSE)) {
            f.routeAppel("/donnees", a -> Reponse.html(formulaire("/login", "")));
            TransportExtranet t = f.transportAvecConnexion(SourceExtranet.UBIPHARM, null, ids(MOT_DE_PASSE, "e1"));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> t.lire("/donnees", null, Attendu.JSON, null));
            assertEquals(ExtranetException.Nature.SESSION_EXPIREE, e.nature());
            /* une connexion avant l'appel, aucune autre pour cet appel */
            assertEquals(1, posts(f).size());
        }
    }

    @Test
    void identifiantsRefusesJamaisRetentesAvantModification() throws Exception {
        AtomicInteger n = new AtomicInteger();
        try (FauxExtranet f = extranet(n, MOT_DE_PASSE)) {
            TransportExtranet t = f.transportAvecConnexion(SourceExtranet.UBIPHARM, null, ids("mauvais", "e1"));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> t.lire("/donnees", null, Attendu.JSON, null));
            assertEquals(ExtranetException.Nature.CONNEXION_REFUSEE, e.nature());
            assertEquals("Identifiant ou mot de passe refusé par l'extranet", e.getMessage());
            assertEquals(1, posts(f).size());
            assertFalse(t.session().publique().isNull("echecConnexion"));
            /* deuxieme essai avec les memes identifiants : aucun POST (le compte n'est pas bloque) */
            ExtranetException e2 = assertThrows(ExtranetException.class,
                    () -> t.lire("/donnees", null, Attendu.JSON, null));
            assertEquals(ExtranetException.Nature.CONNEXION_REFUSEE, e2.nature());
            assertEquals(1, posts(f).size());
            /* identifiants corriges : nouvel essai, reussi */
            connexion(t).identifiants(ids(MOT_DE_PASSE, "e2"));
            t.lire("/donnees", null, Attendu.JSON, null);
            assertEquals(2, posts(f).size());
            assertTrue(t.session().publique().isNull("echecConnexion"));
        }
    }

    private static ConnexionExtranet connexion(TransportExtranet t) throws Exception {
        java.lang.reflect.Field fc = TransportExtranet.class.getDeclaredField("connexion");
        fc.setAccessible(true);
        return (ConnexionExtranet) fc.get(t);
    }

    @Test
    void captchaJamaisContourne() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/", Reponse.html(formulaire("/login", "<div class='g-recaptcha' data-sitekey='k'></div>")));
            TransportExtranet t = f.transportAvecConnexion(SourceExtranet.UBIPHARM, null, ids(MOT_DE_PASSE, "e1"));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> t.lire("/donnees", null, Attendu.JSON, null));
            assertEquals(ExtranetException.Nature.CONNEXION_REFUSEE, e.nature());
            assertTrue(e.getMessage().contains("captcha"));
            assertEquals(0, posts(f).size());
        }
    }

    @Test
    void formulaireVersUnAutreSiteRefuse() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/", Reponse.html(formulaire("https://ailleurs.exemple/vol", "")));
            TransportExtranet t = f.transportAvecConnexion(SourceExtranet.UBIPHARM, null, ids(MOT_DE_PASSE, "e1"));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> t.lire("/donnees", null, Attendu.JSON, null));
            assertEquals(ExtranetException.Nature.CONNEXION_REFUSEE, e.nature());
            assertEquals(0, posts(f).size());
            /* redirection vers un autre site : pas suivie non plus */
            f.route("/", redirection("https://ailleurs.exemple/login", null));
            connexion(t).identifiants(ids(MOT_DE_PASSE, "e2"));
            assertThrows(ExtranetException.class, () -> t.lire("/donnees", null, Attendu.JSON, null));
            assertEquals(0, posts(f).size());
        }
    }

    @Test
    void formulaireIntrouvableEtCheminRegle() throws Exception {
        AtomicInteger n = new AtomicInteger();
        try (FauxExtranet f = extranet(n, MOT_DE_PASSE)) {
            f.route("/", Reponse.html("<html><body>Accueil public</body></html>"));
            TransportExtranet t = f.transportAvecConnexion(SourceExtranet.UBIPHARM, null, ids(MOT_DE_PASSE, "e1"));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> t.lire("/donnees", null, Attendu.JSON, null));
            assertTrue(e.getMessage().contains("onglet Sessions"), e.getMessage());
            assertEquals(0, posts(f).size());
            /* page de connexion saisie avec les identifiants (onglet Sessions), champ identifiant impose */
            TransportExtranet t2 = f.transportAvecConnexion(SourceExtranet.UBIPHARM, null,
                    new ConnexionExtranet.Identifiants(IDENTIFIANT, MOT_DE_PASSE, "e1", "/login", "email"));
            t2.lire("/donnees", null, Attendu.JSON, null);
            assertEquals(1, posts(f).size());
        }
    }

    /**
     * Connexion unique facon Ubipharm (serveur d'authentification OpenID) : page saisie en adresse complete avec
     * parametres, formulaire a action absolue, puis retour /CallbackSSO?code=... qui ouvre la session de l'extranet.
     * Les cookies du serveur d'authentification (chemin /realms) ne deviennent pas la session de l'extranet.
     */
    @Test
    void connexionUniqueOpenIdPageCompleteEtRetour() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            String auth = "/realms/TIC-SSO/protocol/openid-connect/auth";
            String page = f.adresse() + auth + "?scope=openid&response_type=code&client_id=ExtranetClientGrossiste02"
                    + "&redirect_uri="
                    + java.net.URLEncoder.encode(f.adresse() + "/CallbackSSO", StandardCharsets.UTF_8)
                    + "&state=L0lkZW50aWZpY2F0aW9u";
            f.routeAppel(auth, a -> a.requete != null && a.requete.contains("client_id=ExtranetClientGrossiste02")
                    ? new Reponse(200, "text/html; charset=utf-8", ("<html><body><form id='kc-form-login' method='post'"
                            + " action='" + f.adresse() + "/realms/TIC-SSO/login-actions/authenticate?session_code=sc1"
                            + "&amp;execution=e1&amp;tab_id=t1'><input id='username' name='username' type='text'>"
                            + "<input id='password' name='password' type='password'>"
                            + "<input type='hidden' id='id-hidden-input' name='credentialId'>"
                            + "<input type='checkbox' id='rememberMe' name='rememberMe'></form></body></html>")
                                    .getBytes(StandardCharsets.UTF_8),
                            Map.of("Set-Cookie", "AUTH_SESSION_ID=a1; Path=/realms/TIC-SSO/"))
                    : Reponse.html("<html>mauvaise requete</html>"));
            f.routeAppel("/realms/TIC-SSO/login-actions/authenticate", a -> {
                Map<String, String> c = champs(a.corps);
                boolean bon = "sc1"
                        .equals(a.requete == null ? null : a.requete.replaceAll(".*session_code=([^&]*).*", "$1"))
                        && IDENTIFIANT.equals(c.get("username")) && MOT_DE_PASSE.equals(c.get("password"))
                        && a.cookie != null && a.cookie.contains("AUTH_SESSION_ID=a1");
                return bon ? redirection(f.adresse() + "/CallbackSSO?code=c42&state=L0lkZW50aWZpY2F0aW9u", null)
                        : Reponse.html(
                                "<html><form><input name='username'><input type='password' name='password'></form>");
            });
            f.routeAppel("/CallbackSSO",
                    a -> a.requete != null && a.requete.startsWith("code=c42")
                            ? redirection("/Identification", "SESSIONID=sso-1; Path=/; HttpOnly")
                            : Reponse.html("<html>refus</html>"));
            f.routeAppel("/Identification", a -> Reponse.html("<html><body>Accueil</body></html>"));
            f.routeAppel("/donnees", a -> a.cookie != null && a.cookie.contains("SESSIONID=sso-1")
                    ? Reponse.json("{\"ok\":1}") : Reponse.html(formulaire("/login", "")));
            TransportExtranet t = f.transportAvecConnexion(SourceExtranet.UBIPHARM, null,
                    new ConnexionExtranet.Identifiants(IDENTIFIANT, MOT_DE_PASSE, "e1", page, null));
            assertTrue(t.lire("/donnees", null, Attendu.JSON, null).texte().contains("ok"));
            List<Appel> p = posts(f);
            assertEquals(1, p.size());
            assertEquals("/realms/TIC-SSO/login-actions/authenticate", p.get(0).chemin);
            assertEquals("session_code=sc1&execution=e1&tab_id=t1", p.get(0).requete);
            assertEquals(Map.of("username", IDENTIFIANT, "password", MOT_DE_PASSE, "credentialId", ""),
                    champs(p.get(0).corps));
            /* meme machine dans le test : le cookie du serveur d authentification est aussi garde (chemins ignores) */
            assertEquals(2, t.session().publique().getInt("nombreCookies"));
        }
    }

    @Test
    void sansIdentifiantsRienNePart() throws Exception {
        AtomicInteger n = new AtomicInteger();
        try (FauxExtranet f = extranet(n, MOT_DE_PASSE)) {
            TransportExtranet t = f.transportAvecConnexion(SourceExtranet.UBIPHARM, null, null);
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> t.lire("/donnees", null, Attendu.JSON, null));
            assertEquals(ExtranetException.Nature.SESSION_ABSENTE, e.nature());
            assertEquals(0, f.appels().size());
        }
    }

    @Test
    void aucunSecretDansLesJournauxNiLesMessages() throws Exception {
        List<String> lignes = new ArrayList<>();
        Handler h = new Handler() {
            @Override
            public void publish(LogRecord r) {
                lignes.add(new java.util.logging.SimpleFormatter().formatMessage(r));
            }

            @Override
            public void flush() {
            }

            @Override
            public void close() {
            }
        };
        Logger lc = Logger.getLogger(ConnexionExtranet.class.getName());
        Logger lt = Logger.getLogger(TransportExtranet.class.getName());
        lc.addHandler(h);
        lt.addHandler(h);
        AtomicInteger n = new AtomicInteger();
        try (FauxExtranet f = extranet(n, MOT_DE_PASSE)) {
            TransportExtranet t = f.transportAvecConnexion(SourceExtranet.UBIPHARM, null, ids(MOT_DE_PASSE, "e1"));
            t.lire("/donnees", null, Attendu.JSON, null);
            TransportExtranet t2 = f.transportAvecConnexion(SourceExtranet.UBIPHARM, null,
                    ids("faux-" + MOT_DE_PASSE, "e9"));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> t2.lire("/donnees", null, Attendu.JSON, null));
            String tout = String.join("\n", lignes) + "\n" + e.getMessage() + "\n" + t.session().publique() + "\n"
                    + t2.session().publique() + "\n" + ids(MOT_DE_PASSE, "e1");
            assertFalse(lignes.isEmpty());
            for (String secret : new String[] { MOT_DE_PASSE, IDENTIFIANT, "ok-1", JETON, "x1" }) {
                assertFalse(tout.contains(secret), secret);
            }
        } finally {
            lc.removeHandler(h);
            lt.removeHandler(h);
        }
    }

    @Test
    void lectureDuFormulaire() {
        ConnexionExtranet.Formulaire f = ConnexionExtranet.lireFormulaire(formulaire("/login", ""), null);
        assertNotNull(f);
        assertEquals("/login", f.action);
        assertEquals("email", f.champIdentifiant);
        assertEquals("password", f.champMotDePasse);
        assertEquals(JETON, f.autres.get("_token"));
        assertFalse(f.captcha);
        /* champ identifiant impose par reglage */
        String html = "<form action='/Login'><input name='societe' value='CI'><input name='login'>"
                + "<input type='password' name='pwd'></form>";
        ConnexionExtranet.Formulaire g = ConnexionExtranet.lireFormulaire(html, "login");
        assertEquals("login", g.champIdentifiant);
        assertEquals("pwd", g.champMotDePasse);
        assertEquals("CI", g.autres.get("societe"));
        assertEquals("societe", ConnexionExtranet.lireFormulaire(html, null).champIdentifiant);
        /* pas de mot de passe, ou pas de champ identifiant : pas un formulaire de connexion */
        assertNull(ConnexionExtranet.lireFormulaire("<form><input name='q'></form>", null));
        assertNull(ConnexionExtranet.lireFormulaire("<form><input type='password' name='p'></form>", null));
        assertNull(ConnexionExtranet.lireFormulaire(null, null));
    }
}
