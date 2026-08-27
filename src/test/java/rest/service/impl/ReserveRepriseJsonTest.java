package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/**
 * Borne d'activation de la reserve appliquee a la phase JSON de la reprise.
 *
 * <p>
 * Le document JSON porte, pour les journees anterieures a l'activation, une reserve fabriquee par l'ancien vidage — la
 * reserve du jour de la migration appliquee a une date ancienne. Sans borne, la reprise reintroduirait cette fausse
 * reserve immediatement apres que l'assainissement l'a retiree.
 * </p>
 */
public class ReserveRepriseJsonTest {

    private static final int ACTIVATION = 20260719;

    /** Avant l'activation, la valeur du document est une fabrication : zero est la seule valeur exacte. */
    @Test
    public void avantActivationLaReserveEstIgnoree() {
        assertEquals(0, StockSnapshotBackfillService.reserveReprise(20240102, ACTIVATION, 347));
        assertEquals(0, StockSnapshotBackfillService.reserveReprise(20260718, ACTIVATION, 18));
    }

    /** A partir de l'activation, le document a ete ecrit par le releve quotidien : la valeur est reelle. */
    @Test
    public void apresActivationLaReserveDuDocumentEstReprise() {
        assertEquals(42, StockSnapshotBackfillService.reserveReprise(20260719, ACTIVATION, 42));
        assertEquals(5, StockSnapshotBackfillService.reserveReprise(20260801, ACTIVATION, 5));
    }

    /** Reserve jamais activee : la borne infinie ecarte toutes les valeurs du document. */
    @Test
    public void reserveJamaisActiveeToutEstAZero() {
        assertEquals(0, StockSnapshotBackfillService.reserveReprise(20260823, 99999999, 99));
    }

    /** Activation indeterminee : borne a zero, on ne modifie aucune valeur — meme regle que l'assainissement. */
    @Test
    public void activationIndetermineeConserveLesValeurs() {
        assertEquals(347, StockSnapshotBackfillService.reserveReprise(20240102, 0, 347));
    }
}
