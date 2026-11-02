package rest.service.utils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.concurrent.atomic.AtomicInteger;
import org.json.JSONObject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Cache court des etats (demande du 02/11) : l'impression reprend ce que l'ecran vient de charger, sans refaire le
 * calcul ; mais jamais d'une autre session, d'autres filtres, ni apres l'expiration.
 */
class CacheEtatsTest {

    private final AtomicInteger calculs = new AtomicInteger();
    private long maintenant = 1_000_000L;

    @BeforeEach
    void vider() {
        CacheEtats.vider();
        CacheEtats.horloge = () -> maintenant;
    }

    private JSONObject calcul(int valeur) {
        calculs.incrementAndGet();
        return new JSONObject().put("total", valeur);
    }

    @Test
    void lEditionRepriseCeQueLEcranAVu() {
        JSONObject ecran = CacheEtats.ecran("S1", "balance", () -> calcul(10), "2026-10-01", "2026-10-31");
        JSONObject edition = CacheEtats.edition("S1", "balance", () -> calcul(99), "2026-10-01", "2026-10-31");
        assertEquals(1, calculs.get(), "l'edition ne recalcule pas");
        assertEquals(10, edition.getInt("total"));
        assertNotSame(ecran, edition, "copie : l'edition ne peut pas modifier ce que garde le cache");
    }

    @Test
    void lEcranRecalculeToujours() {
        CacheEtats.ecran("S1", "balance", () -> calcul(10), "a");
        JSONObject r = CacheEtats.ecran("S1", "balance", () -> calcul(20), "a");
        assertEquals(2, calculs.get());
        assertEquals(20, CacheEtats.edition("S1", "balance", () -> calcul(99), "a").getInt("total"),
                "l'edition suit le dernier affichage");
        assertEquals(20, r.getInt("total"));
    }

    @Test
    void autreSessionAutresFiltresAutreEtatRecalculent() {
        CacheEtats.ecran("S1", "balance", () -> calcul(10), "a", "b");
        assertEquals(99, CacheEtats.edition("S2", "balance", () -> calcul(99), "a", "b").getInt("total"));
        assertEquals(99, CacheEtats.edition("S1", "balance", () -> calcul(99), "a", "c").getInt("total"));
        assertEquals(99, CacheEtats.edition("S1", "valorisation", () -> calcul(99), "a", "b").getInt("total"));
        /* « a|b » et « a », « b| » ne se confondent pas */
        assertEquals(99, CacheEtats.edition("S1", "balance", () -> calcul(99), "a|b").getInt("total"));
        assertEquals(5, calculs.get());
    }

    @Test
    void expireApresCinqMinutes() {
        CacheEtats.ecran("S1", "balance", () -> calcul(10), "a");
        maintenant += CacheEtats.DUREE_MS - 1;
        assertEquals(10, CacheEtats.edition("S1", "balance", () -> calcul(99), "a").getInt("total"));
        maintenant += 2;
        assertEquals(99, CacheEtats.edition("S1", "balance", () -> calcul(99), "a").getInt("total"));
    }

    @Test
    void sansSessionRienNestGarde() {
        CacheEtats.ecran(null, "balance", () -> calcul(10), "a");
        assertEquals(99, CacheEtats.edition(null, "balance", () -> calcul(99), "a").getInt("total"));
    }

    @Test
    void echecDuCalculNestPasGarde() {
        JSONObject echec = CacheEtats.ecran("S1", "balance", () -> new JSONObject().put("success", false), "a");
        assertFalse(echec.getBoolean("success"));
        assertEquals(99, CacheEtats.edition("S1", "balance", () -> calcul(99), "a").getInt("total"));
    }

    @Test
    void filtreAbsentEtFiltreVideSontLeMeme() {
        CacheEtats.ecran("S1", "balance", () -> calcul(10), null, "b");
        assertEquals(10, CacheEtats.edition("S1", "balance", () -> calcul(99), "", "b").getInt("total"));
    }

    @Test
    void objetRepriseParLEdition() {
        java.util.List<String> lignes = java.util.Arrays.asList("x", "y");
        assertSame(lignes, CacheEtats.ecranObjet("S1", "surstock", () -> lignes, "a"));
        assertSame(lignes, CacheEtats.editionObjet("S1", "surstock", () -> java.util.Collections.emptyList(), "a"));
        assertTrue(CacheEtats.repris());
        assertTrue(CacheEtats.editionObjet("S2", "surstock", () -> java.util.Collections.emptyList(), "a").isEmpty());
        assertFalse(CacheEtats.repris());
        maintenant += CacheEtats.DUREE_MS;
        assertTrue(CacheEtats.editionObjet("S1", "surstock", () -> java.util.Collections.emptyList(), "a").isEmpty(),
                "expire apres cinq minutes");
    }

    @Test
    void objetsBornes() {
        for (int i = 0; i < CacheEtats.OBJETS_MAX + 10; i++) {
            final int k = i;
            maintenant++;
            CacheEtats.ecranObjet("S" + k, "surstock", () -> "v" + k, "a");
        }
        assertEquals("calcul", CacheEtats.editionObjet("S0", "surstock", () -> "calcul", "a"),
                "le plus ancien est sorti");
        assertEquals("v" + (CacheEtats.OBJETS_MAX + 9),
                CacheEtats.editionObjet("S" + (CacheEtats.OBJETS_MAX + 9), "surstock", () -> "calcul", "a"));
    }

    @Test
    void tailleBornee() {
        StringBuilder gros = new StringBuilder();
        for (int i = 0; i < 1000; i++) {
            gros.append("0123456789");
        }
        for (int i = 0; i < 2000; i++) {
            final int k = i;
            CacheEtats.ecran("S" + k, "balance", () -> new JSONObject().put("t", gros.toString()), "a");
        }
        assertTrue(CacheEtats.taille() <= CacheEtats.TAILLE_MAX_CARACTERES, "taille " + CacheEtats.taille());
        /* le plus recent est garde */
        assertTrue(CacheEtats.edition("S1999", "balance", () -> calcul(99), "a").has("t"));
    }
}
