package rest.service.extranet.ubipharm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.FauxExtranet;
import rest.service.extranet.commun.FauxExtranet.Reponse;
import rest.service.extranet.commun.SessionExtranet;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.commun.TransportExtranet;

/** Collecte de /SavoirPlusJSON contre un faux extranet local (127.0.0.1) : jamais le vrai. */
class FicheProduitCollecteurTest {

    private static final String CONNEXION = "<html><body><form action='/Login' method='post'>"
            + "<input name='login'><input type='password' name='pwd'></form></body></html>";

    @Test
    void requeteEnvoyeeEtFicheLue() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/SavoirPlusJSON", Reponse.json(FicheProduitParseurTest.ressource("reconstitue-FAIR248.json")));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=essai-local");
            FicheProduitUbipharm fiche = new FicheProduitCollecteur().lire(t, "FAIR248");
            assertEquals("FAIR248", fiche.pscode());
            assertEquals(4, fiche.agences().size());
            assertEquals(1, f.appels().size());
            FauxExtranet.Appel a = f.appels().get(0);
            assertEquals("GET", a.methode);
            assertEquals("/SavoirPlusJSON", a.chemin);
            assertEquals("pscode=FAIR248", a.requete, "pas de parametre _ ni d'autre parametre");
            assertEquals("XMLHttpRequest", a.ajax);
            assertEquals("SESSIONID=essai-local", a.cookie);
            assertNull(a.referer);
        }
    }

    @Test
    void pageDeConnexionEn200DonneSessionExpiree() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/SavoirPlusJSON", Reponse.html(CONNEXION));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=essai-local");
            ExtranetException e = assertThrows(ExtranetException.class,
                    () -> new FicheProduitCollecteur().lire(t, "FAIR248"));
            assertEquals(ExtranetException.Nature.SESSION_EXPIREE, e.nature());
            assertEquals(SessionExtranet.Etat.EXPIREE, t.session().etat());
            assertFalse(e.getMessage().contains("essai-local"));
        }
    }

    @Test
    void jsonSansProduitOuDUnAutreProduitRefuse() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/SavoirPlusJSON",
                    q -> q != null && q.contains("AUTRE1") ? Reponse.json("{\"produit\":{\"pscode\":\"FAIR248\"}}")
                            : Reponse.json("{\"reappro\":[],\"cips\":[]}"));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=essai-local");
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                    assertThrows(ExtranetException.class, () -> new FicheProduitCollecteur().lire(t, "FAIR248"))
                            .nature());
            assertEquals(ExtranetException.Nature.REPONSE_INATTENDUE,
                    assertThrows(ExtranetException.class, () -> new FicheProduitCollecteur().lire(t, "AUTRE1"))
                            .nature());
            assertEquals(2, f.appels().size());
        }
    }

    @Test
    void pscodeInvalideAucunAppel() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            f.route("/SavoirPlusJSON", Reponse.json("{\"produit\":{\"pscode\":\"X\"}}"));
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, "SESSIONID=essai-local");
            for (String p : new String[] { null, "", " ", "FAIR 248", "FAIR248&x=1", "../Login", "A/B", "é1",
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ12345", "A%20B", "A_B" }) {
                assertThrows(IllegalArgumentException.class, () -> new FicheProduitCollecteur().lire(t, p),
                        String.valueOf(p));
            }
            assertEquals(0, f.appels().size());
            assertEquals(0, t.appels());
            assertTrue(FicheProduitCollecteur.pscodeValide("ABCDEFGHIJKLMNOPQRSTUVWXYZ1234"));
            assertTrue(FicheProduitCollecteur.pscodeValide("FORT-256"));
        }
    }

    @Test
    void sansSessionAucunAppel() throws Exception {
        try (FauxExtranet f = new FauxExtranet()) {
            TransportExtranet t = f.transport(SourceExtranet.UBIPHARM, 0, null);
            assertEquals(ExtranetException.Nature.SESSION_ABSENTE,
                    assertThrows(ExtranetException.class, () -> new FicheProduitCollecteur().lire(t, "FAIR248"))
                            .nature());
            assertEquals(0, f.appels().size());
        }
    }
}
