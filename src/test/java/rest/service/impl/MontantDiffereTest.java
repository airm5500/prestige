package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/**
 * Montant differe affiche dans la liste des ventes terminees.
 *
 * <p>
 * La somme SQL revient a null pour toute vente jamais mise au compte du client, et sous un type qui depend du pilote.
 * La colonne, elle, doit toujours afficher un nombre.
 */
class MontantDiffereTest {

    @Test
    void venteSansDiffere_afficheZeroEtNonUnVide() {
        assertEquals(0, SalesStatsServiceImpl.montantDiffere(null));
    }

    @Test
    void sommeMysqlEnBigDecimal() {
        assertEquals(2000, SalesStatsServiceImpl.montantDiffere(new BigDecimal("2000")));
    }

    @Test
    void sommeEnEntier() {
        assertEquals(1645, SalesStatsServiceImpl.montantDiffere(1645L));
    }

    @Test
    void differeEntierementSolde_afficheZero() {
        assertEquals(0, SalesStatsServiceImpl.montantDiffere(BigDecimal.ZERO));
    }
}
