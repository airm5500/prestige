package util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;

class CodeProduitTest {

    @Test
    void ean13Francais34009DonneLeCip7() {
        // exemple de la demande 49 : 3400935955838 d'un produit au CIP7 3595583
        assertEquals(List.of("3400935955838", "3595583"), CodeProduit.formes("3400935955838"));
    }

    @Test
    void gtin14DonneEan13PuisCip7() {
        assertEquals(List.of("03400935955838", "3400935955838", "3595583"), CodeProduit.formes("03400935955838"));
    }

    @Test
    void gtin14EtrangerDonneSeulementEan13() {
        assertEquals(List.of("08050457123456", "8050457123456"), CodeProduit.formes("08050457123456"));
    }

    @Test
    void autresCodesInchanges() {
        assertEquals(List.of("8050457"), CodeProduit.formes(" 8050457 "));
        assertEquals(List.of("3595583"), CodeProduit.formes("3595583"));
        assertEquals(List.of("34009ABCDEFGH"), CodeProduit.formes("34009ABCDEFGH"));
        assertEquals(List.of("13400935955838"), CodeProduit.formes("13400935955838"));
    }

    @Test
    void videOuNul() {
        assertEquals(List.of(), CodeProduit.formes(null));
        assertEquals(List.of(), CodeProduit.formes("   "));
    }
}
