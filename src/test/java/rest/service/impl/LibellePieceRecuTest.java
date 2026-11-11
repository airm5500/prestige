package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Random;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Plan du 10/11, point 1 : le recu de reglement d'un differe imprimait « Vente 4619ee89-d3a6-... » (identifiant interne
 * de la dette). Il imprime le numero de la vente et sa date ; jamais l'identifiant interne quand la vente est connue,
 * jamais une ligne vide quand elle ne l'est pas. Regles verifiees sur des milliers de cas (graine fixe).
 */
class LibellePieceRecuTest {

    @Test
    void exemples() {
        Date d = new Date(1794141120000L); // 2026-11-08
        String jour = new SimpleDateFormat("dd/MM/yyyy").format(d);
        assertEquals("Vente N° 1234 du " + jour, GenerateTicketServiceImpl.libellePiece("Vente ", "uuid", "1234", d));
        assertEquals("Vente N° 1234", GenerateTicketServiceImpl.libellePiece("Vente ", "uuid", " 1234 ", null));
        assertEquals("Vente uuid", GenerateTicketServiceImpl.libellePiece("Vente ", "uuid", null, d));
        assertEquals("Vente uuid", GenerateTicketServiceImpl.libellePiece("Vente ", "uuid", "  ", d));
        assertEquals("Vente ", GenerateTicketServiceImpl.libellePiece("Vente ", null, null, null));
    }

    @Test
    void reglesSurDesMilliersDeCas() {
        Random r = new Random(20261110L);
        SimpleDateFormat f = new SimpleDateFormat("dd/MM/yyyy");
        for (int i = 0; i < 5000; i++) {
            String ref = UUID.nameUUIDFromBytes(("dette" + i).getBytes()).toString();
            boolean connue = r.nextInt(5) > 0;
            String numero = connue ? String.valueOf(1 + r.nextInt(9_999_999)) : null;
            Date date = r.nextInt(6) == 0 ? null : new Date(1420070400000L + (long) (r.nextDouble() * 3.5e11));
            String l = GenerateTicketServiceImpl.libellePiece("Vente ", ref, numero, date);
            assertTrue(l.startsWith("Vente "), l);
            if (connue) {
                assertFalse(l.contains(ref), "identifiant interne imprime : " + l);
                assertTrue(l.contains("N° " + numero), l);
                assertEquals(date != null, l.endsWith(" du " + (date == null ? "" : f.format(date))), l);
                assertTrue(l.length() <= 40, "trop long pour le ticket : " + l);
            } else {
                assertEquals("Vente " + ref, l);
            }
        }
    }
}
