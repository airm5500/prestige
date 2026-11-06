package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * Retour du 06/11 : pour ne pas surcharger le ticket, une ligne qui a un prix de reference ET un taux imprime une seule
 * ligne de credit « P[2 235] * T[70%] : 1 565 » (precedee du nom de l'organisme quand la vente en a plusieurs), au lieu
 * de « P.REF 2 235 » puis « Taux 70 % : 1 565 ». Sans prix de reference, rien ne change : « Taux 70 % : 700 ».
 */
class CreditLigneFormatCompactTest {

    private static final Pattern COMPACT = Pattern
            .compile("^(?:(.+) · )?P\\[([\\d ]+)\\] \\* T\\[(\\d+)%\\] : ([\\d ]+)$");
    private static final Pattern TAUX = Pattern.compile("^(?:(.+) · )?Taux (\\d+) % : ([\\d ]+)$");

    @Test
    void prixDeReferenceEtTauxSurUneSeuleLigne() {
        assertEquals("P[2 235] * T[70%] : 1 565", CreditLigne.libelle(null, 2235, 70, 1565));
        assertEquals("CNAM · P[2 335] * T[60%] : 1 401", CreditLigne.libelle("CNAM", 2335, 60, 1401));
        assertEquals("MUPEMENET · P[1 835] * T[30%] : 551", CreditLigne.libelle("MUPEMENET", 1835, 30, 551));
    }

    @Test
    void sansPrixDeReferenceLeLibelleNeChangePas() {
        assertEquals("Taux 70 % : 700", CreditLigne.libelle(null, null, 70, 700));
        assertEquals("CNAM · Taux 70 % : 700", CreditLigne.libelle("CNAM", null, 70, 700));
        assertEquals("Taux 80 % : 0", CreditLigne.libelle(null, 0, 80, 0));
    }

    /**
     * Coherence sur 20 000 tirages (graine fixe) : le libelle se relit exactement (nom, prix de reference, taux, part),
     * le format compact n'apparait qu'avec un prix de reference, et il est toujours plus court que les deux lignes
     * qu'il remplace.
     */
    @Test
    void leLibelleSeRelitExactementEtNeSurchargePasLeTicket() {
        Random r = new Random(20261106L);
        String[] noms = { null, "CNAM", "MUGEF-CI", "MUPEMENET", "ASCOMA ASSURANCES" };
        for (int i = 0; i < 20_000; i++) {
            String nom = noms[r.nextInt(noms.length)];
            Integer pref = r.nextInt(4) == 0 ? null : 5 + r.nextInt(250_000);
            int taux = r.nextInt(101);
            int part = r.nextInt(2_000_000);
            String l = CreditLigne.libelle(nom, pref, taux, part);
            if (pref == null) {
                Matcher m = TAUX.matcher(l);
                assertTrue(m.matches(), l);
                assertEquals(nom, m.group(1), l);
                assertEquals(taux, Integer.parseInt(m.group(2)), l);
                assertEquals(part, Integer.parseInt(m.group(3).replace(" ", "")), l);
            } else {
                Matcher m = COMPACT.matcher(l);
                assertTrue(m.matches(), l);
                assertEquals(nom, m.group(1), l);
                assertEquals(pref.intValue(), Integer.parseInt(m.group(2).replace(" ", "")), l);
                assertEquals(taux, Integer.parseInt(m.group(3)), l);
                assertEquals(part, Integer.parseInt(m.group(4).replace(" ", "")), l);
                String avant = "P.REF " + ConversionTicket.nombre(pref) + CreditLigne.libelle(nom, null, taux, part);
                assertTrue(l.length() < avant.length(), l + " / " + avant);
            }
        }
    }
}
