package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import rest.service.impl.RisqueRupture.Calcul;
import rest.service.impl.RisqueRupture.Reglages;
import rest.service.impl.RisqueRupture.Statut;

/** Risque de rupture par la couverture : exemples de l'echange du 09/10 et cas limites. */
class RisqueRuptureTest {

    private static final LocalDate J = LocalDate.of(2026, 10, 9);

    private static Reglages reglages(int securite) {
        Reglages r = new Reglages();
        r.securite = securite;
        r.surveillance = 3;
        r.surstock = 90;
        r.couvertureCible = 15;
        r.delaiDefaut = 3;
        return r;
    }

    @Test
    void exempleSansRisque() {
        // stock 30, VMJ 5 -> 6 jours ; delai 2 + securite 1 = 3 jours : pas de risque (a surveiller : 6 <= 3 + 3)
        Calcul c = RisqueRupture.evaluer(5, 30, 0, 2, 100, reglages(1), J);
        assertEquals(6.0, c.couverture);
        assertEquals(3, c.horizon);
        assertEquals(Statut.A_SURVEILLER, c.statut);
        Calcul c2 = RisqueRupture.evaluer(5, 50, 0, 2, 100, reglages(1), J);
        assertEquals(Statut.CORRECT, c2.statut);
    }

    @Test
    void exempleAvecRisque() {
        // stock 10, VMJ 5 -> 2 jours ; delai 3 : epuise avant la livraison -> CRITIQUE
        Calcul c = RisqueRupture.evaluer(5, 10, 0, 3, 100, reglages(1), J);
        assertEquals(2.0, c.couverture);
        assertEquals(Statut.CRITIQUE, c.statut);
        assertEquals(J.plusDays(2), c.epuisement);
    }

    @Test
    void exempleDoliprane() {
        // vendable 26, VMJ 5 -> 5,2 jours ; delai 4 + securite 3 = 7 : RISQUE, seuil 35 unites
        Calcul c = RisqueRupture.evaluer(5, 26, 0, 4, 150, reglages(3), J);
        assertEquals(5.2, c.couverture);
        assertEquals(7, c.horizon);
        assertEquals(35, c.seuil);
        assertEquals(Statut.RISQUE, c.statut);
        // a commander : 5 x (7 + 15) - 26 = 84
        assertEquals(84, c.aCommander);
    }

    @Test
    void couvertParCommandeEnCours() {
        // vendable 26, commande 40, delai 4, VMJ 5 : 26 + 40 - 20 = 46 >= 15 -> COUVERT, rien a commander
        Calcul c = RisqueRupture.evaluer(5, 26, 40, 4, 150, reglages(3), J);
        assertEquals(Statut.COUVERT, c.statut);
        assertEquals(0, c.aCommander);
        // commande insuffisante : 26 + 2 - 20 = 8 < 15 -> reste RISQUE, a commander deduit de l'en cours
        Calcul d = RisqueRupture.evaluer(5, 26, 2, 4, 150, reglages(3), J);
        assertEquals(Statut.RISQUE, d.statut);
        assertEquals(82, d.aCommander);
    }

    @Test
    void ruptureEtStockNegatif() {
        Calcul c = RisqueRupture.evaluer(2, -3, 0, null, 50, reglages(2), J);
        assertEquals(Statut.RUPTURE, c.statut);
        assertEquals(0.0, c.couverture);
        assertEquals(3, c.delai); // delai par defaut sans delai grossiste
        assertEquals(J, c.epuisement);
    }

    @Test
    void surstock() {
        Calcul c = RisqueRupture.evaluer(1, 200, 0, 3, 300, reglages(2), J);
        assertEquals(Statut.SURSTOCK, c.statut);
        assertEquals(0, c.aCommander);
    }

    @Test
    void vmjNulle() {
        Calcul dormant = RisqueRupture.evaluer(0, 5, 0, 3, 0, reglages(2), J);
        assertEquals(Statut.DORMANT, dormant.statut);
        assertNull(dormant.couverture);
        Calcul sansStock = RisqueRupture.evaluer(0, 0, 0, 3, 0, reglages(2), J);
        assertEquals(Statut.CORRECT, sansStock.statut);
        Calcul rare = RisqueRupture.evaluer(0, 5, 0, 3, 2, reglages(2), J);
        assertEquals(Statut.CORRECT, rare.statut);
    }
}
