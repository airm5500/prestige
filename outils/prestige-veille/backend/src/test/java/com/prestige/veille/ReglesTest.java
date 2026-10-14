package com.prestige.veille;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.prestige.veille.regles.Regles;
import com.prestige.veille.regles.Regles.Decision;
import com.prestige.veille.regles.Regles.Transition;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class ReglesTest {

    private static final LocalDateTime T = LocalDateTime.of(2026, 10, 14, 10, 0);

    @Test
    void incidents() {
        assertEquals(Transition.AUCUNE, Regles.transition(false, 1, 2, false), "un échec isolé");
        assertEquals(Transition.OUVRIR, Regles.transition(false, 2, 2, false));
        assertEquals(Transition.AUCUNE, Regles.transition(false, 5, 2, true), "déjà ouvert");
        assertEquals(Transition.FERMER, Regles.transition(true, 0, 2, true));
        assertEquals(Transition.AUCUNE, Regles.transition(true, 0, 2, false));
    }

    @Test
    void seuils() {
        assertTrue(Regles.seuil(93.0, 90, 50_000L, 2048, 4000L, 12000L).startsWith("Mémoire du serveur Java à 93 %"));
        assertTrue(Regles.seuil(50.0, 90, 1000L, 2048, 4000L, 12000L).startsWith("Espace disque libre : 1000 Mo"));
        assertTrue(Regles.seuil(50.0, 90, 50_000L, 2048, 400L, 12000L).startsWith("Mémoire de la machine"));
        assertNull(Regles.seuil(50.0, 90, 50_000L, 2048, 4000L, 12000L));
        assertNull(Regles.seuil(null, 90, null, 2048, null, null));
    }

    @Test
    void redemarrageAutomatique() {
        LocalDateTime panne = T.minusMinutes(6);
        assertEquals(Decision.RIEN, Regles.redemarrage(true, null, true, 5, List.of(), 2, T));
        assertEquals(Decision.DESACTIVE, Regles.redemarrage(false, panne, true, 5, List.of(), 2, T), "désactivé par défaut");
        assertEquals(Decision.ATTENDRE, Regles.redemarrage(true, T.minusMinutes(2), true, 5, List.of(), 2, T));
        assertEquals(Decision.BASE_ARRETEE, Regles.redemarrage(true, panne, false, 5, List.of(), 2, T),
                "redémarrer Payara ne sert à rien si MariaDB est arrêtée");
        assertEquals(Decision.REDEMARRER, Regles.redemarrage(true, panne, true, 5, List.of(T.minusHours(2)), 2, T));
        assertEquals(Decision.LIMITE_ATTEINTE,
                Regles.redemarrage(true, panne, true, 5, List.of(T.minusMinutes(20), T.minusMinutes(40)), 2, T));
    }

    @Test
    void etatDuService() {
        assertEquals("RUNNING", Regles.etatService("SERVICE_NAME: domain1\n        TYPE               : 10  WIN32_OWN_PROCESS\n"
                + "        STATE              : 4  RUNNING\n                                (STOPPABLE, NOT_PAUSABLE)\n"));
        assertEquals("STOPPED", Regles.etatService("NOM_SERVICE : MariaDB\n        ÉTAT               : 1  STOPPED\n"));
        assertNull(Regles.etatService("[SC] OpenService a échoué 1060 :"));
    }
}
