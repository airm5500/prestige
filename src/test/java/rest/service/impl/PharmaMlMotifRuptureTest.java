package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;
import rest.service.pharmaMl.response.IndisponibiliteN;
import rest.service.pharmaMl.response.LigneNReponse;
import rest.service.pharmaMl.response.ProduitRemplacant;

/**
 * Retours du 08/10 : motif de rupture et remplacant lus dans la reponse du grossiste (liste des ruptures, vue reponse).
 */
class PharmaMlMotifRuptureTest {

    private static LigneNReponse ligne(String code, String additif, ProduitRemplacant r) {
        IndisponibiliteN i = new IndisponibiliteN();
        i.setCodeReponse(code);
        i.setAdditif(additif);
        i.setProduitRemplacant(r);
        LigneNReponse l = new LigneNReponse();
        l.setIndisponibilite(i);
        return l;
    }

    @Test
    void motifAdditifPuisCode() {
        assertEquals("Manque Rayon", PharmaMlServiceImpl.motifIndisponibilite(ligne("0005", " Manque Rayon ", null)));
        assertEquals("0005", PharmaMlServiceImpl.motifIndisponibilite(ligne("0005", "  ", null)));
        assertNull(PharmaMlServiceImpl.motifIndisponibilite(ligne("", "", null)));
        assertNull(PharmaMlServiceImpl.motifIndisponibilite(new LigneNReponse()));
        assertNull(PharmaMlServiceImpl.motifIndisponibilite(null));
    }

    @Test
    void motifLimiteA255() {
        String long300 = new String(new char[300]).replace('\0', 'x');
        assertEquals(255, PharmaMlServiceImpl.motifIndisponibilite(ligne("1", long300, null)).length());
    }

    @Test
    void remplacant() {
        ProduitRemplacant r = new ProduitRemplacant();
        r.setTypeRemplacement("EP");
        r.setCodeProduit("1234567");
        r.setDesignation("GENERIQUE");
        assertEquals("EP 1234567 GENERIQUE", PharmaMlServiceImpl.remplacant(ligne("4", "x", r)));
        r.setCodeProduit(" ");
        assertNull(PharmaMlServiceImpl.remplacant(ligne("4", "x", r)));
        assertNull(PharmaMlServiceImpl.remplacant(ligne("4", "x", null)));
    }
}
