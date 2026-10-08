package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PharmaMlRefCdeClientTest {

    @Test
    void commandeGardeSaReference() {
        assertEquals("7102026_00002", PharmaMlServiceImpl.refCdeClient("7102026_00002", null));
        assertEquals(PharmaMlServiceImpl.refCdeClient("7102026_00002", null),
                PharmaMlServiceImpl.refCdeClient("7102026_00002", null), "stable d'un envoi a l'autre");
    }

    @Test
    void nmtokenEtVingtCaracteresAuPlus() {
        String r = PharmaMlServiceImpl.refCdeClient("CMD 2026/10 n°123456789012345", null);
        assertTrue(r.matches("[A-Za-z0-9._:-]{1,20}"), r);
        assertEquals("CDE", PharmaMlServiceImpl.refCdeClient(" / ", null));
    }

    @Test
    void ruptureDistincteDeLaCommandeEtStable() {
        String id = "3f2a9c41-0000-4000-8000-000000000000";
        String r = PharmaMlServiceImpl.refCdeClient("7102026_00002_LONGUE_REF", "R" + id);
        assertTrue(r.length() <= 20 && r.endsWith("R3f2a9"), r);
        assertNotEquals(PharmaMlServiceImpl.refCdeClient("7102026_00002", null),
                PharmaMlServiceImpl.refCdeClient("7102026_00002", "R" + id));
        assertEquals(r, PharmaMlServiceImpl.refCdeClient("7102026_00002_LONGUE_REF", "R" + id));
    }
}
