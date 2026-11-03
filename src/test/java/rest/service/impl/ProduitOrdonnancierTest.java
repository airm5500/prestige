package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Collections;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import dal.TFamille;
import dal.TPreenregistrementDetail;

/**
 * La regle « produit de l'ordonnancier » a la cloture de vente (cas 3 du 03/11/2026).
 *
 * <p>
 * Defaut reproduit d'abord : un produit soumis a ordonnance SANS code tableau (int_T a NULL en base) faisait planter la
 * cloture d'une vente par une NullPointerException, parce que le controle appelait trim() sur le code tableau.
 * </p>
 */
class ProduitOrdonnancierTest {

    private static TFamille produit(boolean scheduled, String codeTableau, boolean sensible) {
        TFamille f = new TFamille();
        f.setLgFAMILLEID("P-" + scheduled + "-" + codeTableau + "-" + sensible);
        f.setScheduled(scheduled);
        f.setIntT(codeTableau);
        f.setSensible(sensible);
        return f;
    }

    private static TPreenregistrementDetail ligne(boolean scheduled, String codeTableau) {
        return ligne(scheduled, codeTableau, false);
    }

    private static TPreenregistrementDetail ligne(boolean scheduled, String codeTableau, boolean sensible) {
        TPreenregistrementDetail d = new TPreenregistrementDetail();
        d.setLgFAMILLEID(produit(scheduled, codeTableau, sensible));
        return d;
    }

    /** La regle d'avant le cas 3, telle qu'elle etait ecrite (sans sa NullPointerException). */
    private static boolean regleHistorique(TFamille f) {
        return f.isScheduled() && f.getIntT() != null && !f.getIntT().trim().isEmpty();
    }

    @Test
    @DisplayName("Soumis a ordonnance sans code tableau : pas de plantage, et pas dans l'ordonnancier")
    void scheduledSansCodeTableauNePlantePas() {
        assertFalse(SalesServiceImpl.checkOrdonnancier(Collections.singletonList(ligne(true, null))));
    }

    @Test
    @DisplayName("La regle actuelle est conservee : coche ET code tableau")
    void regleActuelleConservee() {
        assertTrue(SalesServiceImpl.checkOrdonnancier(Collections.singletonList(ligne(true, "A"))));
        assertFalse(SalesServiceImpl.checkOrdonnancier(Collections.singletonList(ligne(false, "A"))));
        assertFalse(SalesServiceImpl.checkOrdonnancier(Collections.singletonList(ligne(true, "  "))));
        assertFalse(SalesServiceImpl.checkOrdonnancier(Collections.singletonList(ligne(false, null))));
        assertTrue(SalesServiceImpl.checkOrdonnancier(Arrays.asList(ligne(false, null), ligne(true, "II"))));
    }

    @Test
    @DisplayName("Un produit sensible entre dans l'ordonnancier, avec ou sans code tableau")
    void produitSensibleAvecOuSansCodeTableau() {
        assertTrue(SalesServiceImpl.checkOrdonnancier(Collections.singletonList(ligne(false, null, true))));
        assertTrue(SalesServiceImpl.checkOrdonnancier(Collections.singletonList(ligne(false, "", true))));
        assertTrue(SalesServiceImpl.checkOrdonnancier(Collections.singletonList(ligne(true, "A", true))));
        assertTrue(SalesServiceImpl.checkOrdonnancier(Collections.singletonList(ligne(true, null, true))));
    }

    @Test
    @DisplayName("Non-regression : sans produit sensible, la regle unique rend exactement ce que rendait l'ancienne")
    void sansSensibleRienNeChange() {
        String[] codes = { null, "", "  ", "A", "II", " C " };
        for (boolean scheduled : new boolean[] { false, true }) {
            for (String code : codes) {
                TFamille f = produit(scheduled, code, false);
                assertEquals(regleHistorique(f), f.estProduitOrdonnancier(),
                        "scheduled=" + scheduled + " int_T=[" + code + "]");
            }
        }
    }

    @Test
    @DisplayName("Le motif : Sensible prime, Ordonnancier sinon, vide quand le produit n'entre pas")
    void motif() {
        assertEquals("Sensible", produit(true, "A", true).motifOrdonnancier());
        assertEquals("Sensible", produit(false, null, true).motifOrdonnancier());
        assertEquals("Ordonnancier", produit(true, "A", false).motifOrdonnancier());
        assertEquals("", produit(true, null, false).motifOrdonnancier());
        assertEquals("", produit(false, "A", false).motifOrdonnancier());
    }

    @Test
    @DisplayName("Une ligne sans produit n'entre pas et ne plante pas")
    void ligneSansProduit() {
        assertFalse(SalesServiceImpl.checkOrdonnancier(Collections.singletonList(new TPreenregistrementDetail())));
    }
}
