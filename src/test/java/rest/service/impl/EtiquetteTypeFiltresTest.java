package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/** Retours du 25/10 (point 7) : filtres a cases a cocher de la mise a jour selective des types d'etiquette. */
class EtiquetteTypeFiltresTest {

    @Test
    void uneValeurDonneLaMemeRequeteQuAvant() {
        List<Object> p = new ArrayList<>();
        String w = EtiquetteTypeService.clause(new JSONObject().put("zone", "Z1").put("famille", "F1"), p);
        assertEquals(" WHERE f.str_STATUT = 'enable' AND f.lg_ZONE_GEO_ID = ?1 AND f.lg_FAMILLEARTICLE_ID = ?2", w);
        assertEquals(Arrays.asList("Z1", "F1"), p);
    }

    @Test
    void plusieursValeursDonnentUneListe() {
        List<Object> p = new ArrayList<>();
        String w = EtiquetteTypeService.clause(new JSONObject().put("zone", "Z1,Z2, Z3").put("grossiste", "G1,G2"), p);
        assertEquals(
                " WHERE f.str_STATUT = 'enable' AND f.lg_ZONE_GEO_ID IN (?1, ?2, ?3) AND f.lg_GROSSISTE_ID IN (?4, ?5)",
                w);
        assertEquals(Arrays.asList("Z1", "Z2", "Z3", "G1", "G2"), p);
    }

    @Test
    void videToutOuDoublonsIgnores() {
        List<Object> p = new ArrayList<>();
        String w = EtiquetteTypeService
                .clause(new JSONObject().put("zone", "ALL").put("famille", ",").put("grossiste", "G1,G1"), p);
        assertEquals(" WHERE f.str_STATUT = 'enable' AND f.lg_GROSSISTE_ID = ?1", w);
        assertEquals(Arrays.asList("G1"), p);
    }
}
