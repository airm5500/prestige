package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.dto.AnomalieDTO;

/** Enregistrement d'une anomalie (retour du 24/10) : famille, textes nettoyes et bornes, fil limite. */
class AnomalieReglesTest {

    @Test
    void familleConnueSeulement() {
        assertNull(AnomalieRegles.nettoyer(AnomalieDTO.builder().famille("AUTRE").message("x").build()));
        assertNull(AnomalieRegles.nettoyer(AnomalieDTO.builder().famille("REFUS").message("  ").build()),
                "sans message");
        assertEquals("REFUS",
                AnomalieRegles.nettoyer(AnomalieDTO.builder().famille("refus").message("x").build()).getFamille());
        assertNull(AnomalieRegles.nettoyer(null));
    }

    @Test
    void textesSansBalisesEtBornes() {
        AnomalieDTO d = AnomalieRegles.nettoyer(AnomalieDTO.builder().famille("REFUS").code("Étiquette GS1")
                .message("Ce lot est <b>périmé</b><br>(lot A1)").ecran("Ventes").build());
        assertEquals("Ce lot est périmé (lot A1)", d.getMessage());
        char[] long1 = new char[1000];
        Arrays.fill(long1, 'a');
        assertTrue(AnomalieRegles.nettoyer(AnomalieDTO.builder().famille("LOGICIEL").message(new String(long1)).build())
                .getMessage().length() <= 300);
    }

    @Test
    void filLimiteAuxDernieresActions() {
        List<String> fil = new ArrayList<>();
        for (int i = 1; i <= 40; i++) {
            fil.add("action " + i);
        }
        AnomalieDTO d = AnomalieRegles.nettoyer(AnomalieDTO.builder().famille("REFUS").message("x").fil(fil).build());
        assertEquals(25, d.getFil().size());
        assertEquals("action 40", d.getFil().get(24), "les plus recentes sont gardees");
        assertEquals("action 16", d.getFil().get(0));
    }
}
