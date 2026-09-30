package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** Terrains cliniques parametrables (30/09) : libelle obligatoire et borne ; TINYINT(1) lu dans ses deux formes. */
public class TerrainCliniqueServiceTest {

    @Test
    public void libelle() {
        assertNull(TerrainCliniqueService.valider("Drépanocytose"));
        assertTrue(TerrainCliniqueService.valider("  ").contains("obligatoire"));
        assertTrue(TerrainCliniqueService.valider(org.apache.commons.lang3.StringUtils.repeat("x", 81)).contains("80"));
    }

    @Test
    public void actifLuCommeBooleenOuNombre() {
        assertTrue(TerrainCliniqueService.vrai(Boolean.TRUE));
        assertTrue(TerrainCliniqueService.vrai(1));
        assertFalse(TerrainCliniqueService.vrai(0));
        assertFalse(TerrainCliniqueService.vrai(Boolean.FALSE));
        assertFalse(TerrainCliniqueService.vrai(null));
    }
}
