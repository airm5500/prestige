package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.FauxExtranet.Appel;
import rest.service.extranet.commun.FauxExtranet.Reponse;

/**
 * Entree dans Mayite par Ubipharm (releve du 08/11) : Ubipharm sert /themes/boo/html/extranet/stats/statsexternal.jsp
 * ?opt=mayite, page qui porte un formulaire cache (domaine, e-mail du compte) envoye seul a Mayite /external_api/ ;
 * Mayite repond par une redirection et un cookie de session. Prestige refait ce passage avec la session Ubipharm : le
 * formulaire est envoye tel quel, une seule fois, et seulement s'il vise Mayite. Valeurs inventees.
 */
class ConnexionMayiteTest {

    static final String DOMAINE = "domaine-essai.mayite-service.com";
    static final String EMAIL = "essai+pharma@exemple.ci";

    static String passerelle(String action) {
        return "<html><body onload=\"document.forms[0].submit()\"><form method=\"post\" action=\"" + action + "\">"
                + "<input type=\"hidden\" name=\"mayite_domaine\" value=\"" + DOMAINE + "\">"
                + "<input type=\"hidden\" name=\"email_ubipharm_connect\" value=\"" + EMAIL + "\">"
                + "<input type=\"hidden\" name=\"email_ubipharm\" value=\"" + EMAIL + "\">" + "</form></body></html>";
    }

    static String pageConnexionMayite() {
        return "<html><body><form method=\"post\" action=\"/login/\"><input name=\"username\">"
                + "<input type=\"password\" name=\"password\"></form></body></html>";
    }

    /** Faux Ubipharm : la passerelle, seulement avec la session Ubipharm. */
    static FauxExtranet ubipharm(String action) throws Exception {
        FauxExtranet u = new FauxExtranet();
        u.routeAppel(SourceExtranet.PASSERELLE_MAYITE, a -> a.cookie != null && a.cookie.contains(
                "SESSIONID=ubi") && "opt=mayite".equals(a.requete) ? Reponse.html(passerelle(action)) : Reponse.html(
                        "<html><body><form><input name=\"login\"><input type=\"password\" name=\"pwd\"></form></body></html>"));
        return u;
    }

    /**
     * Faux Mayite : /external_api/ ouvre une session (redirection + cookie) si les trois champs sont exacts ; pages
     * protegees lisibles avec la derniere session ouverte, sinon page de connexion. {@code refuser} : toujours refuser.
     */
    static FauxExtranet mayite(AtomicInteger sessions, boolean refuser) throws Exception {
        FauxExtranet m = new FauxExtranet();
        m.routeAppel("/external_api/", a -> {
            Map<String, String> c = ConnexionExtranetTest.champs(a.corps);
            boolean bon = !refuser && "POST".equals(a.methode) && c.size() == 3
                    && DOMAINE.equals(c.get("mayite_domaine")) && EMAIL.equals(c.get("email_ubipharm_connect"))
                    && EMAIL.equals(c.get("email_ubipharm"));
            if (!bon) {
                return Reponse.html(pageConnexionMayite());
            }
            return new Reponse(302, "text/html", new byte[0], Map.of("Location", "/pro/", "Set-Cookie",
                    "sessionid=may-" + sessions.incrementAndGet() + "; Path=/; HttpOnly"));
        });
        m.routeAppel("/pro/", a -> ouverte(a, sessions) ? Reponse.html("<html><body><h1>Bienvenue</h1></body></html>")
                : Reponse.html(pageConnexionMayite()));
        m.routeAppel("/ajax/user/medicaments/liste/prix/",
                a -> ouverte(a, sessions)
                        ? new Reponse(200, "application/json",
                                "{\"recordsTotal\":1,\"recordsFiltered\":0,\"data\":[],\"result\":\"ok\"}"
                                        .getBytes(StandardCharsets.UTF_8),
                                null)
                        : new Reponse(302, "text/html", new byte[0], Map.of("Location", "/login/")));
        return m;
    }

    static boolean ouverte(Appel a, AtomicInteger sessions) {
        return a.cookie != null && sessions.get() > 0 && a.cookie.contains("sessionid=may-" + sessions.get());
    }

    /** Transport Mayite sans session, entree par le transport Ubipharm donne. */
    static TransportExtranet mayiteParUbipharm(FauxExtranet m, TransportExtranet ubi) {
        ExtranetConfiguration conf = ExtranetConfiguration
                .de(Map.of("EXTRANET_MAYITE_URL", m.adresse(), "EXTRANET_MAYITE_PAUSE_MS", "0"));
        SessionExtranet s = new SessionExtranet(SourceExtranet.MAYITE);
        TransportExtranet t = new TransportExtranet(s, conf);
        ConnexionExtranet c = new ConnexionExtranet(s, conf);
        c.passerelle(() -> ubi.lire(SourceExtranet.PASSERELLE_MAYITE, Collections.singletonMap("opt", "mayite"),
                TransportExtranet.Attendu.HTML, null).texte());
        t.connexion(c);
        return t;
    }

    static List<Appel> posts(FauxExtranet f) {
        return f.appels().stream().filter(a -> !"GET".equals(a.methode)).collect(Collectors.toList());
    }

    @Test
    void entreeParUbipharmPuisLecture() throws Exception {
        AtomicInteger n = new AtomicInteger();
        try (FauxExtranet m = mayite(n, false); FauxExtranet u = ubipharm(m.adresse() + "/external_api/")) {
            TransportExtranet t = mayiteParUbipharm(m, u.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=ubi"));
            String json = t.lire("/ajax/user/medicaments/liste/prix/", null, TransportExtranet.Attendu.JSON, null)
                    .texte();
            assertTrue(json.contains("\"result\":\"ok\""));
            List<Appel> p = posts(m);
            assertEquals(1, p.size(), "un seul envoi du formulaire");
            Map<String, String> c = ConnexionExtranetTest.champs(p.get(0).corps);
            assertEquals(3, c.size(), "formulaire envoye tel quel, rien d'ajoute");
            assertEquals(EMAIL, c.get("email_ubipharm"));
            assertEquals(DOMAINE, c.get("mayite_domaine"));
            assertEquals(SessionExtranet.Etat.VALIDE, t.session().etat());
            assertEquals("CONNEXION", t.session().publique().getString("mode"));
            assertEquals(0, posts(u).size(), "aucun envoi a Ubipharm");
            /* une seconde lecture reutilise la session */
            t.lire("/ajax/user/medicaments/liste/prix/", null, TransportExtranet.Attendu.JSON, null);
            assertEquals(1, posts(m).size());
        }
    }

    @Test
    void sessionExpireeUneSeuleReentree() throws Exception {
        AtomicInteger n = new AtomicInteger();
        try (FauxExtranet m = mayite(n, false); FauxExtranet u = ubipharm(m.adresse() + "/external_api/")) {
            TransportExtranet t = mayiteParUbipharm(m, u.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=ubi"));
            t.lire("/ajax/user/medicaments/liste/prix/", null, TransportExtranet.Attendu.JSON, null);
            n.incrementAndGet(); /* Mayite oublie la session : la suivante sera « may-3 » */
            t.lire("/ajax/user/medicaments/liste/prix/", null, TransportExtranet.Attendu.JSON, null);
            assertEquals(2, posts(m).size(), "une reentree apres expiration");
            assertEquals(SessionExtranet.Etat.VALIDE, t.session().etat());
        }
    }

    @Test
    void formulaireVersUnAutreSiteRefuse() throws Exception {
        AtomicInteger n = new AtomicInteger();
        try (FauxExtranet m = mayite(n, false); FauxExtranet autre = new FauxExtranet();
                FauxExtranet u = ubipharm(autre.adresse() + "/external_api/")) {
            TransportExtranet t = mayiteParUbipharm(m, u.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=ubi"));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> t.lire("/pro/", null, TransportExtranet.Attendu.HTML, null));
            assertEquals(ExtranetException.Nature.CONNEXION_REFUSEE, e.nature());
            assertTrue(e.getMessage().contains("autre site"), e.getMessage());
            assertEquals(0, autre.appels().size(), "rien envoye a l'autre site");
            assertEquals(0, posts(m).size());
            assertTrue(t.session().publique().getString("echecConnexion").contains("autre site"));
        }
        /* adresse relative ou illisible : refusee aussi */
        try (FauxExtranet m = mayite(n, false); FauxExtranet u = ubipharm("/external_api/")) {
            TransportExtranet t = mayiteParUbipharm(m, u.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=ubi"));
            assertThrows(ExtranetException.class, () -> t.lire("/pro/", null, TransportExtranet.Attendu.HTML, null));
            assertEquals(0, posts(m).size());
        }
    }

    @Test
    void mayiteRefuseOuUbipharmSansSession() throws Exception {
        AtomicInteger n = new AtomicInteger();
        try (FauxExtranet m = mayite(n, true); FauxExtranet u = ubipharm(m.adresse() + "/external_api/")) {
            TransportExtranet t = mayiteParUbipharm(m, u.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=ubi"));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> t.lire("/pro/", null, TransportExtranet.Attendu.HTML, null));
            assertEquals(ExtranetException.Nature.CONNEXION_REFUSEE, e.nature());
            assertTrue(e.getMessage().contains("refusé l'entrée"), e.getMessage());
            assertTrue(!e.getMessage().contains(EMAIL), "l'e-mail n'apparait pas dans le message");
        }
        /* Ubipharm sans session ni identifiants : aucune page passerelle, aucun envoi a Mayite */
        try (FauxExtranet m = mayite(n, false); FauxExtranet u = ubipharm(m.adresse() + "/external_api/")) {
            TransportExtranet t = mayiteParUbipharm(m, u.transport(SourceExtranet.UBIPHARM, 0, null));
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> t.lire("/pro/", null, TransportExtranet.Attendu.HTML, null));
            assertEquals(ExtranetException.Nature.SESSION_ABSENTE, e.nature());
            assertEquals(0, m.appels().size());
            assertEquals(0, u.appels().size());
        }
    }

    @Test
    void sourceMayite() {
        assertEquals(SourceExtranet.UBIPHARM, SourceExtranet.MAYITE.passerelle());
        assertNull(SourceExtranet.UBIPHARM.passerelle());
        assertNull(SourceExtranet.TEDIS.passerelle());
        assertEquals(SourceExtranet.MAYITE, SourceExtranet.lire("mayite"));
    }
}
