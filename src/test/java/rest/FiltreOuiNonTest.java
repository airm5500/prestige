package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Conversion du filtre a trois etats des ecrans.
 *
 * <p>
 * Le piege est « Non » : c'est un filtre a part entiere, il ne doit surtout pas etre confondu avec « Tous », sans quoi
 * l'ecran montrerait toutes les lignes au lieu des seules non concernees.
 */
class FiltreOuiNonTest {

    @Test
    @DisplayName("Oui et Non sont deux filtres distincts")
    void ouiEtNon() {
        assertEquals(Boolean.TRUE, FiltreOuiNon.lire("oui"));
        assertEquals(Boolean.FALSE, FiltreOuiNon.lire("non"));
        assertEquals(Boolean.TRUE, FiltreOuiNon.lire("Oui"));
        assertEquals(Boolean.FALSE, FiltreOuiNon.lire("NON"));
    }

    @Test
    @DisplayName("Les formes techniques sont acceptees telles quelles")
    void formesTechniques() {
        assertEquals(Boolean.TRUE, FiltreOuiNon.lire("true"));
        assertEquals(Boolean.TRUE, FiltreOuiNon.lire("1"));
        assertEquals(Boolean.FALSE, FiltreOuiNon.lire("false"));
        assertEquals(Boolean.FALSE, FiltreOuiNon.lire("0"));
    }

    @Test
    @DisplayName("Absence de filtre : rien n'est restreint")
    void aucunFiltre() {
        assertNull(FiltreOuiNon.lire(null));
        assertNull(FiltreOuiNon.lire(""));
        assertNull(FiltreOuiNon.lire("   "));
        assertNull(FiltreOuiNon.lire("tous"));
        assertNull(FiltreOuiNon.lire("Tous"));
        assertNull(FiltreOuiNon.lire("null"));
    }

    @Test
    @DisplayName("Une valeur inattendue ne masque aucune ligne")
    void valeurInattendue() {
        assertNull(FiltreOuiNon.lire("peut-etre"));
        assertNull(FiltreOuiNon.lire("2"));
    }

    @Test
    @DisplayName("Les espaces autour de la valeur ne changent rien")
    void espaces() {
        assertEquals(Boolean.TRUE, FiltreOuiNon.lire("  oui  "));
        assertEquals(Boolean.FALSE, FiltreOuiNon.lire(" non "));
    }
}
