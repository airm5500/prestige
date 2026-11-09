package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

/** Session saisie par l'administrateur : format, refus des injections, secret jamais expose. */
class SessionExtranetTest {

    @Test
    void lectureDesCookiesColles() {
        assertEquals("abc", SessionExtranet.analyser("SESSIONID=abc").get("SESSIONID"));
        assertEquals(2, SessionExtranet.analyser("Cookie: a=1; b=2;").size());
        assertEquals("", SessionExtranet.analyser("XSRF-TOKEN=").get("XSRF-TOKEN"));
    }

    @Test
    void formatsRefuses() {
        for (String s : new String[] { null, "", "   ", "abc", "=abc", "a b=1", "a=1\r\nX-Inj: 2", "a=1\nb=2",
                "a=\"x\"", "a=x y", "a=x,y", "a=x\\y" }) {
            assertNull(SessionExtranet.analyser(s), String.valueOf(s));
        }
        SessionExtranet s = new SessionExtranet(SourceExtranet.UBIPHARM);
        assertNotNull(s.definir("pas un cookie", "admin"));
        assertEquals(SessionExtranet.Etat.NON_CONFIGUREE, s.etat());
    }

    @Test
    void laValeurNeSortJamais() {
        SessionExtranet s = new SessionExtranet(SourceExtranet.UBIPHARM);
        assertNull(s.definir("SESSIONID=valeur-secrete-123", "admin"));
        String vu = s.publique().toString() + s.toString();
        assertFalse(vu.contains("valeur-secrete-123"));
        assertFalse(vu.contains("SESSIONID"));
        assertTrue(s.publique().getBoolean("definie"));
        assertEquals("A_VERIFIER", s.publique().getString("etat"));
        assertEquals("SESSIONID=valeur-secrete-123", s.enTeteCookie());
    }

    @Test
    void expirationEffaceLaValeur() {
        SessionExtranet s = new SessionExtranet(SourceExtranet.TEDIS);
        s.definir("laravel_session=x; XSRF-TOKEN=y", "admin");
        s.expiree();
        assertEquals("", s.enTeteCookie());
        assertFalse(s.utilisable());
        assertEquals("EXPIREE", s.publique().getString("etat"));
        s.definir("laravel_session=z", "admin");
        assertTrue(s.utilisable());
        s.effacer();
        assertFalse(s.utilisable());
        assertEquals("NON_CONFIGUREE", s.publique().getString("etat"));
    }

    @Test
    void setCookieRemplaceOuRetire() {
        SessionExtranet s = new SessionExtranet(SourceExtranet.UBIPHARM);
        s.definir("SESSIONID=a; autre=b", "admin");
        s.recevoir(List.of("SESSIONID=c; Path=/; HttpOnly", "autre=; Max-Age=0", "mauvais nom=1"));
        assertEquals("SESSIONID=c", s.enTeteCookie());
    }

    @Test
    void sessionsSepareesParExtranet() {
        CoffreSessions.session(SourceExtranet.UBIPHARM).definir("SESSIONID=u", "admin");
        try {
            assertFalse(CoffreSessions.session(SourceExtranet.TEDIS).utilisable());
        } finally {
            CoffreSessions.session(SourceExtranet.UBIPHARM).effacer();
        }
    }
}
