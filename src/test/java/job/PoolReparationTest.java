package job;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

import job.PoolReparation.Action;
import org.junit.jupiter.api.Test;

class PoolReparationTest {

    @Test
    void decisions() {
        assertEquals(Action.RIEN, PoolReparation.decider(true, true, 0, 0, true));
        /* MariaDB arretee : vider le pool ne servirait a rien */
        assertEquals(Action.ATTENDRE_LA_BASE, PoolReparation.decider(false, false, 5, 0, true));
        /* un echec isole : on surveille */
        assertEquals(Action.SURVEILLER, PoolReparation.decider(false, true, 1, 0, true));
        /* deux minutes d'echec, base joignable : connexions mortes -> vider */
        assertEquals(Action.VIDER_LE_POOL, PoolReparation.decider(false, true, 2, 0, true));
        /* reparation desactivee par parametre */
        assertEquals(Action.SURVEILLER, PoolReparation.decider(false, true, 2, 0, false));
        /* pas plus de 3 reparations par heure */
        assertEquals(Action.TROP_DE_REPARATIONS, PoolReparation.decider(false, true, 2, 3, true));
    }

    @Test
    void hoteEtPortDeLaBase() {
        assertArrayEquals(new String[] { "localhost", "3306" },
                PoolReparation.hotePort("jdbc:mariadb://localhost:3306/capitale?useUnicode=true"));
        assertArrayEquals(new String[] { "PC-OFFICINE", "3307" },
                PoolReparation.hotePort("jdbc:mysql://PC-OFFICINE:3307/capitale"));
        assertArrayEquals(new String[] { "127.0.0.1", "3306" },
                PoolReparation.hotePort("jdbc:mariadb://127.0.0.1/capitale"));
        assertArrayEquals(new String[] { "127.0.0.1", "3306" }, PoolReparation.hotePort(null));
    }
}
