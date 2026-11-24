package filter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Cahier des charges du 24/11, point 3 (« personne ne passe outre ») : tant que l'heure du serveur est fausse, le
 * serveur refuse toute écriture par l'API, même si la fenêtre de blocage a été retirée du navigateur. Restent permis :
 * les lectures, la connexion et la déconnexion, et les routes de l'horloge (mise à jour, trace de l'affichage).
 */
class HorlogeBlocageFilterTest {

    @Test
    void lesLecturesRestentPermises() {
        for (String m : new String[] { "GET", "HEAD", "OPTIONS", "get" }) {
            assertTrue(HorlogeBlocageFilter.permis(m, "v1/vente/add/vno"), m);
        }
    }

    @Test
    void lesRoutesDeSortieRestentPermises() {
        for (String c : new String[] { "v1/horloge/synchroniser", "/v1/horloge/affichage", "v1/user/auth",
                "v1/user/auth-badge", "v1/user/logout", "/v1/user/logout" }) {
            assertTrue(HorlogeBlocageFilter.permis("POST", c), c);
        }
    }

    @Test
    void lesEcrituresSontRefusees() {
        for (String c : new String[] { "v1/vente/add/vno", "v1/vente/add/item", "v1/reglement/reglementdiffere",
                "v1/vente/update-created-date", "v1/caisse/cloture", "v1/horlogex/synchroniser",
                "v1/user/authentifier-autre", "v1/horloge-public" }) {
            for (String m : new String[] { "POST", "PUT", "DELETE", "PATCH" }) {
                assertFalse(HorlogeBlocageFilter.permis(m, c), m + " " + c);
            }
        }
    }

    @Test
    void refusSeulementSiBloque() {
        assertNull(HorlogeBlocageFilter.refus(false, "POST", "v1/vente/add/vno"));
        assertNull(HorlogeBlocageFilter.refus(true, "GET", "v1/vente/add/vno"));
        assertNull(HorlogeBlocageFilter.refus(true, "POST", "v1/horloge/synchroniser"));
        JSONObject o = new JSONObject(HorlogeBlocageFilter.refus(true, "POST", "v1/vente/add/vno"));
        assertFalse(o.getBoolean("success"));
        assertTrue(o.getBoolean("horlogeBloquee"));
        assertTrue(o.getString("msg").contains("heure du serveur"));
        assertEquals(423, HorlogeBlocageFilter.VERROUILLE);
    }
}
