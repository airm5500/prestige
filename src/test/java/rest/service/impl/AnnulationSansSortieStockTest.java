package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;

import org.junit.jupiter.api.Test;

/**
 * Refus de l'annulation d'une vente cloturee dont les produits ne sont jamais sortis du stock.
 *
 * La sortie de stock et le passage de la ligne a « is_Closed » sont faits ensemble par updateVenteStock : une ligne
 * restee a « is_Process » sous une vente cloturee prouve que le stock n'a pas ete diminue. La recrediter a l'annulation
 * ferait monter le stock affiche au-dessus du stock reel.
 */
class AnnulationSansSortieStockTest {

    private static Date le(int annee, int mois, int jour, int heure, int minute) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(annee, mois - 1, jour, heure, minute);
        return c.getTime();
    }

    @Test
    void venteNormaleToutesLignesSorties() {
        assertEquals(0, SalesServiceImpl.lignesSansSortieDeStock("is_Closed",
                Arrays.asList("is_Closed", "is_Closed", "is_Closed")));
    }

    @Test
    void venteClotureeAvecLignesJamaisSorties() {
        assertEquals(2, SalesServiceImpl.lignesSansSortieDeStock("is_Closed",
                Arrays.asList("is_Closed", "is_Process", "is_Process")));
    }

    /** Sur une vente encore au comptoir, « is_Process » est l'etat normal : le garde ne doit pas se declencher. */
    @Test
    void venteEnCoursNestPasConcernee() {
        assertEquals(0,
                SalesServiceImpl.lignesSansSortieDeStock("is_Process", Arrays.asList("is_Process", "is_Process")));
    }

    @Test
    void venteSansLigneNeDeclencheRien() {
        assertEquals(0, SalesServiceImpl.lignesSansSortieDeStock("is_Closed", Collections.<String> emptyList()));
        assertEquals(0, SalesServiceImpl.lignesSansSortieDeStock("is_Closed", null));
    }

    @Test
    void messageQuandAucuneLigneNestSortie() {
        String msg = SalesServiceImpl.messageAnnulationSansSortieStock("260831_00581", le(2026, 8, 31, 20, 11), 2, 2);
        assertTrue(msg.startsWith("Annulation refusée"), msg);
        assertTrue(msg.contains("N° 260831_00581"), msg);
        assertTrue(msg.contains("clôturée le 31/08/2026 20:11"), msg);
        assertTrue(msg.contains("aucun de ses 2 produits n'est jamais sorti du stock"), msg);
        assertTrue(msg.contains("Centre de Support"), msg);
    }

    @Test
    void messageQuandUneSeuleLigneSurPlusieurs() {
        String msg = SalesServiceImpl.messageAnnulationSansSortieStock("260903_00004", le(2026, 9, 3, 8, 5), 1, 3);
        assertTrue(msg.contains("1 de ses 3 produits n'est jamais sorti du stock"), msg);
    }

    /** Un seul produit dans la vente : pas de « aucun de ses 1 produits ». */
    @Test
    void messageAuSingulier() {
        String msg = SalesServiceImpl.messageAnnulationSansSortieStock("260820_00622", le(2026, 8, 20, 17, 42), 1, 1);
        assertTrue(msg.contains("son produit n'est jamais sorti du stock"), msg);
    }

    /** Reference ou date absentes : le message reste lisible, sans « N° null » ni virgule orpheline. */
    @Test
    void messageSansReferenceNiDate() {
        String msg = SalesServiceImpl.messageAnnulationSansSortieStock(null, null, 1, 1);
        assertEquals("Annulation refusée : cette vente n'a pas diminué le stock — son produit n'est jamais sorti"
                + " du stock. L'annuler remettrait en stock des produits qui n'en sont jamais sortis, et le stock"
                + " affiché passerait au-dessus du stock réel. L'incident est signalé au Centre de Support.", msg);
    }
}
