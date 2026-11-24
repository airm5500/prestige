package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.math.BigDecimal;
import java.math.BigInteger;
import org.junit.jupiter.api.Test;

/**
 * Déploiement du 24/11 sur domain3 : la route publique de l'horloge rendait une erreur interne. horloge_repere a des
 * colonnes vides (pas de régularisation ouverte, première installation) et leur lecture levait une NullPointerException
 * (conversion d'une valeur vide en nombre).
 */
class HorlogeVeilleTest {

    @Test
    void uneValeurVideDeLaBaseResteVide() {
        assertNull(HorlogeVeille.long_(null));
        assertNull(HorlogeVeille.long_("texte"));
    }

    @Test
    void lesNombresDeLaBaseSontLus() {
        assertEquals(Long.valueOf(1795503722355L), HorlogeVeille.long_(1795503722355L));
        assertEquals(Long.valueOf(1), HorlogeVeille.long_(1));
        assertEquals(Long.valueOf(0), HorlogeVeille.long_((byte) 0));
        assertEquals(Long.valueOf(42), HorlogeVeille.long_(BigInteger.valueOf(42)));
        assertEquals(Long.valueOf(7), HorlogeVeille.long_(BigDecimal.valueOf(7)));
        assertEquals(Long.valueOf(1), HorlogeVeille.long_(Boolean.TRUE));
        assertEquals(Long.valueOf(0), HorlogeVeille.long_(Boolean.FALSE));
    }
}
