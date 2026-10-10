package dal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.Arrays;
import java.util.Collections;
import org.junit.jupiter.api.Test;

/** Retours du 10/10 (lecture GS1, mode B) : lots des boites scannees notes sur la ligne, sortis a la cloture. */
class TPreenregistrementDetailLotsScannesTest {

    @Test
    void unLotParBoiteDansLOrdre() {
        TPreenregistrementDetail d = new TPreenregistrementDetail();
        d.noterLotScanne("LOT-A");
        d.noterLotScanne(" LOT-B ");
        d.noterLotScanne("LOT-A");
        assertEquals("LOT-A|LOT-B|LOT-A", d.getStrLOTSSCANNES());
    }

    @Test
    void videEtSeparateurIgnores() {
        TPreenregistrementDetail d = new TPreenregistrementDetail();
        d.noterLotScanne(null);
        d.noterLotScanne("  ");
        d.noterLotScanne("|");
        assertNull(d.getStrLOTSSCANNES());
        d.noterLotScanne("AB|CD");
        assertEquals("ABCD", d.getStrLOTSSCANNES());
    }

    @Test
    void longueurBornee() {
        TPreenregistrementDetail d = new TPreenregistrementDetail();
        String trente = "123456789012345678901234567890";
        d.noterLotScanne(trente + "XYZ");
        assertEquals(trente, d.getStrLOTSSCANNES()); // 30 caracteres au plus par lot
        for (int i = 0; i < 40; i++) {
            d.noterLotScanne(trente);
        }
        /* 500 caracteres au plus : les boites en trop ne sont plus notees (elles sortiront au lot le plus proche) */
        assertEquals(16, d.getStrLOTSSCANNES().split("\\|").length);
        assertEquals(true, d.getStrLOTSSCANNES().length() <= 500);
    }

    @Test
    void lotsASortirBornesALaQuantite() {
        assertEquals(Arrays.asList("A", "B"), TPreenregistrementDetail.lotsASortir("A|B|C", 2));
        assertEquals(Arrays.asList("A", "B", "C"), TPreenregistrementDetail.lotsASortir("A|B|C", 5));
        assertEquals(Collections.emptyList(), TPreenregistrementDetail.lotsASortir(null, 3));
        assertEquals(Collections.emptyList(), TPreenregistrementDetail.lotsASortir("A", 0));
        assertEquals(Arrays.asList("A", "B"), TPreenregistrementDetail.lotsASortir("A||B|", 4));
    }
}
