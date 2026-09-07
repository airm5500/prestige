package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/**
 * Liste des bons : la colonne de date ne porte plus l'heure.
 *
 * Le champ rendu par l'application vaut "jj/mm/aaaa hh:mm:ss" ; l'etat n'en garde que la date. La regle doit tenir
 * quand l'heure manque, quand la valeur est vide, et quand elle est absente.
 */
class DateSeuleBonsTest {

    @Test
    void lHeureEstRetiree() {
        assertEquals("04/09/2026", ListDesBonServiceImpl.dateSeule("04/09/2026 14:55:29"));
        assertEquals("04/09/2026", ListDesBonServiceImpl.dateSeule("04/09/2026 14:55"));
    }

    @Test
    void uneDateDejaSeuleEstRendueTelleQuelle() {
        assertEquals("04/09/2026", ListDesBonServiceImpl.dateSeule("04/09/2026"));
    }

    @Test
    void lesEspacesDeBordNeLaissentPasPasserLHeure() {
        assertEquals("04/09/2026", ListDesBonServiceImpl.dateSeule("  04/09/2026 14:55:29  "));
    }

    @Test
    void uneValeurAbsenteOuVideNeCassePasLEdition() {
        assertEquals("", ListDesBonServiceImpl.dateSeule(null));
        assertEquals("", ListDesBonServiceImpl.dateSeule(""));
        assertEquals("", ListDesBonServiceImpl.dateSeule("   "));
    }

    /** Une valeur tronquee est rendue telle quelle plutot que de lever une exception. */
    @Test
    void uneValeurTropCourteEstRendueTelleQuelle() {
        assertEquals("04/09", ListDesBonServiceImpl.dateSeule("04/09"));
    }
}
