package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

/** Scan d'ordonnance (30/09) : fichiers acceptes, mots cherches dans le catalogue. */
public class OrdonnanceScanServiceTest {

    @Test
    public void fichiersAcceptes() {
        assertNull(OrdonnanceScanService.refus("ordo.jpg", 1000));
        assertNull(OrdonnanceScanService.refus("ordo.PDF", 1000));
        assertTrue(OrdonnanceScanService.refus("ordo.docx", 1000).contains("photo"));
        assertTrue(OrdonnanceScanService.refus("ordo.tif", 1000).contains("photo"));
    }

    @Test
    public void motsDuTexteLu() {
        assertEquals(Arrays.asList("AMOXICILLINE", "250"), OrdonnanceScanService.mots("Amoxicilline 250 mg"));
        assertEquals(Arrays.asList("DOLIPRANE", "2,4", "SUSP"), OrdonnanceScanService.mots("Doliprane 2,4 % susp."));
        assertEquals(Arrays.asList("EFFERALGAN", "PEDIATRIQUE"), OrdonnanceScanService.mots("Efferalgan pédiatrique"));
        assertTrue(OrdonnanceScanService.mots("  ").isEmpty());
    }
}
