package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.TSuggestionReserve;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import org.junit.jupiter.api.Test;

/**
 * Retour du 04/11 : une suggestion de reserve par bon. Son commentaire porte le numero du bon, et la suggestion
 * automatique commune des ventes ne la choisit jamais.
 */
class SuggestionDuBonTest {

    @Test
    void numeroDuBonLuDansLeCommentaire() {
        assertEquals("BL-88412",
                SuggestionReserveServiceImpl.numeroDuBon(TSuggestionReserve.COMMENTAIRE_BON + "BL-88412"));
        assertEquals("",
                SuggestionReserveServiceImpl.numeroDuBon("Generee automatiquement par les mouvements de stock"));
        assertEquals("", SuggestionReserveServiceImpl.numeroDuBon(null));
    }

    @Test
    void laSuggestionDesVentesEcarteCellesDesBons() {
        String jpql = null;
        for (NamedQuery q : TSuggestionReserve.class.getAnnotation(NamedQueries.class).value()) {
            if ("TSuggestionReserve.findOuverteAuto".equals(q.name())) {
                jpql = q.query();
            }
        }
        assertTrue(jpql != null && jpql.contains("NOT LIKE '" + TSuggestionReserve.COMMENTAIRE_BON + "%'"), jpql);
    }
}
