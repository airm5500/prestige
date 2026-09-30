package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

/** Recherche du client des ordonnances (30/09) : telephone en « contient », affichage du numero. */
public class RechercheClientOrdonnanceTest {

    @Test
    public void chiffresCherchesDansLesTelephones() {
        assertEquals("98082", RechercheClientOrdonnance.chiffres("98082"));
        assertEquals("0759808208", RechercheClientOrdonnance.chiffres("07 59 80 82 08"));
        assertEquals("225070", RechercheClientOrdonnance.chiffres("+225 07.0"));
        /* Trop court, ou un nom : pas de recherche dans les telephones. */
        assertNull(RechercheClientOrdonnance.chiffres("07"));
        assertNull(RechercheClientOrdonnance.chiffres("KONAN 07"));
        assertNull(RechercheClientOrdonnance.chiffres(""));
        assertNull(RechercheClientOrdonnance.chiffres(null));
    }

    @Test
    public void nom() {
        assertEquals("KONAN AWA", RechercheClientOrdonnance.nom("  KONAN   AWA "));
        assertEquals("", RechercheClientOrdonnance.nom(null));
    }

    @Test
    public void telephoneAffiche() {
        assertEquals("0707070707", RechercheClientOrdonnance.telephone("0707070707", "Cocody"));
        assertEquals("07 59 80 82 08", RechercheClientOrdonnance.telephone(null, "07 59 80 82 08"));
        /* Une vraie adresse n'est pas montree comme un numero. */
        assertEquals("", RechercheClientOrdonnance.telephone("", "Cocody rue 12"));
        assertEquals("", RechercheClientOrdonnance.telephone(null, "12"));
    }
}
