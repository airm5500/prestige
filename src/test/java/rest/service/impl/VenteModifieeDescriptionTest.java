package rest.service.impl;

import java.util.List;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import rest.service.v2.dto.VenteModification;

public class VenteModifieeDescriptionTest {

    @Test
    public void sansIdRetireIdentifiantTechnique() {
        Assertions.assertEquals("KOUAME JEAN 12345", VenteModifieeServiceImpl.sansId("abc-1;KOUAME;JEAN;12345"));
        Assertions.assertEquals("KOUAME JEAN", VenteModifieeServiceImpl.sansId("abc-1;KOUAME JEAN;null"));
        Assertions.assertEquals("B123", VenteModifieeServiceImpl.sansId("B123"));
        Assertions.assertEquals("", VenteModifieeServiceImpl.sansId(null));
    }

    @Test
    public void descriptionInfosListeLesChangements() {
        VenteModification v = new VenteModification();
        v.setOldClient("1;KOUAME;JEAN;111");
        v.setFinalClient("2;YAO;PAUL;222");
        v.setOldBon("B1");
        v.setFinalBon("B2");
        v.setOldMontantClient("1 000");
        v.setNouveauMontantClient("1 000");
        v.setOldTiersPayant(List.of("t1;MCI/111/B1;80;4 000"));
        v.setFinalTiersPayant(List.of("t2;ASCOMA/222/B2;80;4 000"));
        String d = VenteModifieeServiceImpl.descriptionInfos(v);
        Assertions.assertTrue(d.contains("Client : KOUAME JEAN 111 → YAO PAUL 222"), d);
        Assertions.assertTrue(d.contains("N° bon : B1 → B2"), d);
        Assertions.assertFalse(d.contains("Part client"), d);
        Assertions.assertTrue(d.contains("Tiers payant : MCI/111/B1 80 4 000 → ASCOMA/222/B2 80 4 000"), d);
    }

    @Test
    public void descriptionInfosSansChangement() {
        VenteModification v = new VenteModification();
        v.setOldClient("1;KOUAME;JEAN;111");
        v.setFinalClient("1;KOUAME;JEAN;111");
        Assertions.assertEquals("Informations client / tiers payant enregistrées sans changement détecté",
                VenteModifieeServiceImpl.descriptionInfos(v));
        Assertions.assertEquals("Informations client / tiers payant enregistrées sans changement détecté",
                VenteModifieeServiceImpl.descriptionInfos(null));
    }
}
