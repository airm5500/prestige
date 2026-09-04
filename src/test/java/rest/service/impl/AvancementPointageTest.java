package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import rest.service.dto.StatutTraitement;
import org.junit.jupiter.api.Test;

/**
 * Avancement du pointage d'un bon ou d'une commande, calcule desormais a partir des totaux rendus par le SGBD pour
 * toute une page au lieu d'une requete par ligne affichee.
 */
class AvancementPointageTest {

    @Test
    void toutesLesLignesPointeesDonneTermine() {
        assertEquals(StatutTraitement.TERMINE, OrderServiceImpl.statutTraitement(37, 0));
    }

    @Test
    void aucuneLignePointeeDonneAFaire() {
        assertEquals(StatutTraitement.A_FAIRE, OrderServiceImpl.statutTraitement(0, 37));
    }

    @Test
    void pointageCommenceDonneEnCours() {
        assertEquals(StatutTraitement.EN_COURS, OrderServiceImpl.statutTraitement(12, 25));
    }

    @Test
    void dossierSansAucuneLigneNeFaitPlusEchouerLEcran() {
        // Le SGBD rend NULL sur un dossier vide ; les comptages arrivent alors a zero. Avant, la lecture directe du
        // NULL levait une exception qui vidait toute la page. L'officine a 500 commandes sans ligne de detail.
        assertEquals(StatutTraitement.TERMINE, OrderServiceImpl.statutTraitement(0, 0));
    }
}
