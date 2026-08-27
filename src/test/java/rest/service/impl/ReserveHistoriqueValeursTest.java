package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import org.junit.jupiter.api.Test;

/**
 * Valeurs particulieres du parametre qui date l'activation du suivi de la reserve.
 *
 * <p>
 * La reserve n'est historisee nulle part : avant son activation, la seule valeur exacte est zero. La date d'activation
 * differe d'une officine a l'autre, elle est donc detectee dans la base. Trois issues possibles, et elles ne doivent
 * surtout pas se confondre : une date, une officine qui n'a jamais active la reserve, et une activation non datable ou
 * l'on s'interdit de toucher a l'historique.
 * </p>
 */
public class ReserveHistoriqueValeursTest {

    /** Les deux sentinelles doivent rester distinctes : elles commandent des comportements opposes. */
    @Test
    public void lesSentinellesSontDistinctes() {
        assertNotEquals(ReserveHistoriqueService.JAMAIS_ACTIVEE, ReserveHistoriqueService.INDETERMINEE);
    }

    /**
     * Une sentinelle ne doit jamais pouvoir passer pour une date : le code qui lit ce parametre teste les sentinelles
     * avant de convertir en entier, et une valeur numerique les rendrait indiscernables d'une vraie journee.
     */
    @Test
    public void lesSentinellesNeSontPasNumeriques() {
        for (String valeur : new String[] { ReserveHistoriqueService.JAMAIS_ACTIVEE,
                ReserveHistoriqueService.INDETERMINEE }) {
            boolean numerique = true;
            try {
                Integer.parseInt(valeur);
            } catch (NumberFormatException e) {
                numerique = false;
            }
            org.junit.jupiter.api.Assertions.assertFalse(numerique,
                    "la sentinelle " + valeur + " ne doit pas etre confondue avec une journee");
        }
    }

    /** La cle du parametre est lue par le support et par les migrations : elle ne doit pas deriver. */
    @Test
    public void laCleDuParametreEstStable() {
        assertEquals("KEY_VALORISATION_RESERVE_DEPUIS", ReserveHistoriqueService.CLE_RESERVE_DEPUIS);
    }
}
