package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Calendar;
import java.util.Date;
import org.junit.jupiter.api.Test;

/**
 * Refus d'ouverture de caisse : la caissiere doit lire ce qui bloque et ce qu'elle a a faire. Ces messages remontaient
 * auparavant en erreur 500, illisible a l'ecran.
 */
class OuvertureCaisseMessagesTest {

    private static Date leDeuxSeptembre() {
        Calendar c = Calendar.getInstance();
        c.set(2026, Calendar.SEPTEMBER, 2, 7, 53, 0);
        return c.getTime();
    }

    @Test
    void caisseDejaOuverteDitDepuisQuandEtQuoiFaire() {
        String message = CaisseServiceImpl.messageCaisseDejaOuverte(leDeuxSeptembre());
        assertTrue(message.contains("déjà ouverte"), message);
        assertTrue(message.contains("02/09/2026 07:53"), message);
        assertTrue(message.contains("ticket Z"), message);
    }

    @Test
    void fondDejaAttribueDitLeMontantEtLaDate() {
        String message = CaisseServiceImpl.messageFondDejaAttribue(20000d, leDeuxSeptembre());
        assertTrue(message.contains("fond de caisse"), message);
        assertTrue(message.contains("20"), message);
        assertTrue(message.contains("02/09/2026 07:53"), message);
    }

    @Test
    void dateAbsenteNeProduitPasDepuisLeNull() {
        assertFalse(CaisseServiceImpl.messageCaisseDejaOuverte(null).contains("null"));
        assertFalse(CaisseServiceImpl.messageFondDejaAttribue(null, null).contains("null"));
        assertTrue(CaisseServiceImpl.depuisLe(null).isEmpty());
    }
}
