package util.sms;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import util.TelephoneCi;
import util.TelephonePaysCoherenceTest;

/**
 * Retour du 22/11 sur le point 8.3 du plan du 21/11 : un SMS vers un client au numero etranger part avec l'indicatif de
 * ce numero (et non plus « 225 » colle devant) ; un numero ivoirien part comme avant.
 */
public class LeTextoNumeroEtrangerTest {

    @Test
    void smsVersLIndicatifDuNumero() {
        assertEquals("2250708473750", LeTextoSmsProvider.toInternational("0708473750"));
        assertEquals("2250708473750", LeTextoSmsProvider.toInternational("+2250708473750"));
        assertEquals("32470123456", LeTextoSmsProvider.toInternational("+32470123456"));
        assertEquals("33612345678", LeTextoSmsProvider.toInternational("+33612345678"));
        /* non reconnu : regle d'avant (225 devant) */
        assertEquals("22512345", LeTextoSmsProvider.toInternational("12345"));
        /* tout numero garde par TelephoneCi part vers son international */
        for (int i = 0; i < 3000; i++) {
            String s = TelephonePaysCoherenceTest.saisie();
            TelephoneCi.Resultat r = TelephoneCi.controler(s);
            if (r.isValide()) {
                assertEquals(r.getInternational(), LeTextoSmsProvider.toInternational(r.getLocal()), s);
            }
        }
    }
}
