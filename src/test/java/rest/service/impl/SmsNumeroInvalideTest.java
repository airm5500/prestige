package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import util.sms.SmsSendResult;

/**
 * Rapport du centre de support du 26/10, M4 (journal de leana) : un numero qui n'est pas un mobile ivoirien partait tel
 * quel au fournisseur, qui le refusait (« No valid addresses »), et l'evenement du support ecrivait le numero en clair.
 * Il est maintenant refuse avant l'envoi, sans appel au fournisseur.
 */
public class SmsNumeroInvalideTest {

    @Test
    public void unMobileIvoirienPartAuFournisseur() {
        assertNull(SmsImpl.refusAvantEnvoi("0708473750"));
        assertNull(SmsImpl.refusAvantEnvoi("+225 07 08 47 37 50"));
        assertNull(SmsImpl.refusAvantEnvoi("002250508473750"));
    }

    /** Depuis le 22/11 (plan du 21/11, point 8.3) : un numero etranger ecrit avec son indicatif part au fournisseur. */
    @Test
    public void unNumeroEtrangerAvecSonIndicatifPartAuFournisseur() {
        assertNull(SmsImpl.refusAvantEnvoi("0033612345678"));
        assertNull(SmsImpl.refusAvantEnvoi("+32 470 12 34 56"));
    }

    @Test
    public void unNumeroEtrangerTropCourtOuFixeEstRefuseSansLeFournisseur() {
        for (String numero : new String[] { "+33 61 23", "2721345678", "08473750", "07 08 47" }) {
            SmsSendResult r = SmsImpl.refusAvantEnvoi(numero);
            assertTrue(r != null && !r.isAccepted(), numero);
            assertEquals("NUMERO_INVALIDE", r.getErrorCode(), numero);
            assertEquals(0, r.getHttpStatus(), "aucun appel HTTP");
            assertFalse(r.getErrorMessage().contains(numero.replaceAll("[^0-9]", "").substring(0, 4)),
                    "le motif ne recopie pas le numero : " + r.getErrorMessage());
        }
    }
}
