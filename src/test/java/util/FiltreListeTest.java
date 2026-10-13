package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class FiltreListeTest {

    @Test
    void unSeulIdentifiantCommeAvant() {
        StringBuilder sql = new StringBuilder("WHERE 1=1");
        List<Object> p = new ArrayList<>();
        FiltreListe.ajouter(sql, "f.lg_ZONE_GEO_ID", "12", p, 6);
        assertEquals("WHERE 1=1 AND f.lg_ZONE_GEO_ID IN (?6)", sql.toString());
        assertEquals(Arrays.asList("12"), p);
    }

    @Test
    void plusieursIdentifiantsNumerotesALaSuite() {
        StringBuilder sql = new StringBuilder();
        List<Object> p = new ArrayList<>(Arrays.asList("deja"));
        FiltreListe.ajouter(sql, "z", " a, b ,a,,ALL ", p, 6);
        assertEquals(" AND z IN (?7, ?8)", sql.toString());
        assertEquals(Arrays.asList("deja", "a", "b"), p);
    }

    @Test
    void videOuAllSansFiltre() {
        StringBuilder sql = new StringBuilder();
        List<Object> p = new ArrayList<>();
        FiltreListe.ajouter(sql, "z", "", p, 1);
        FiltreListe.ajouter(sql, "z", "ALL", p, 1);
        FiltreListe.ajouter(sql, "z", null, p, 1);
        assertEquals("", sql.toString());
        assertFalse(FiltreListe.actif(" , "));
    }
}
