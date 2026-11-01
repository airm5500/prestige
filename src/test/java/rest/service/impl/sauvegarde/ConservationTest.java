package rest.service.impl.sauvegarde;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class ConservationTest {

    private static final LocalDateTime MAINTENANT = LocalDateTime.of(2026, 11, 1, 20, 5);

    private static String n(int jour, int mois, int heure) {
        return Conservation.nom("labo", LocalDateTime.of(2026, mois, jour, heure, 5));
    }

    @Test
    void nomEtDate() {
        assertEquals("prestige_labo_20261101_2005.sql.gz", Conservation.nom("labo", MAINTENANT));
        assertEquals(MAINTENANT, Conservation.date("labo", "prestige_labo_20261101_2005.sql.gz"));
        assertNull(Conservation.date("labo", "prestige_autre_20261101_2005.sql.gz"));
        assertNull(Conservation.date("labo", "notes.txt"));
        assertNull(Conservation.date("labo", "prestige_labo_20261101_2005.sql.gz.partiel"));
    }

    @Test
    void toutesLesHeuresRecentesPuisUneParJourPuisRien() {
        List<String> fichiers = Arrays.asList(n(1, 11, 19), n(1, 11, 3), n(31, 10, 23), n(31, 10, 22), // moins de 48 h
                                                                                                       // : gardees
                n(29, 10, 18), n(29, 10, 9), // au-dela : la plus recente du jour seulement
                n(2, 10, 12), // 30 jours pile : gardee
                n(1, 10, 12), // 31 jours : retiree
                "prestige_autre_20250101_0105.sql.gz", "notes.txt"); // jamais touches
        assertEquals(Arrays.asList(n(29, 10, 9), n(1, 10, 12)),
                Conservation.aRetirer("labo", fichiers, MAINTENANT, 48, 30));
    }

    @Test
    void zeroJourNeGardeQueLesHeuresRecentes() {
        List<String> fichiers = Arrays.asList(n(1, 11, 19), n(28, 10, 19));
        assertEquals(Arrays.asList(n(28, 10, 19)), Conservation.aRetirer("labo", fichiers, MAINTENANT, 48, 0));
    }
}
