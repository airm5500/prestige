package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Set;
import java.util.TreeSet;

import org.junit.jupiter.api.Test;

/**
 * Regle de retention du releve journalier de valorisation : fenetre glissante recente, plus la premiere et la derniere
 * journee effectivement relevee de chaque mois.
 *
 * <p>
 * L'enjeu metier est la valorisation de fin de mois. La pharmacie ferme, le poste reste parfois eteint : le dernier
 * jour du mois n'est pas toujours releve. La regle doit alors conserver la derniere journee reellement enregistree, et
 * non chercher un 30 ou un 31 qui n'existe pas.
 * </p>
 */
public class RetentionReleveJournalierTest {

    /** Ajoute au calendrier les journees {@code debut} a {@code fin} du mois donne (format yyyyMM). */
    private static void mois(Set<Integer> calendrier, int mois, int debut, int fin) {
        for (int jour = debut; jour <= fin; jour++) {
            calendrier.add(mois * 100 + jour);
        }
    }

    private static Set<Integer> calendrierType() {
        Set<Integer> calendrier = new TreeSet<>();
        mois(calendrier, 202511, 1, 30); // novembre complet
        mois(calendrier, 202512, 1, 29); // fermeture les 30 et 31 decembre
        mois(calendrier, 202602, 1, 28); // fevrier
        mois(calendrier, 202608, 15, 17); // releves recents
        return calendrier;
    }

    /** Fenetre glissante : tout releve recent est conserve, sans consideration de mois. */
    @Test
    public void conserveLaFenetreGlissante() {
        Set<Integer> retenues = StockSnapshotBackfillService.journeesConservees(calendrierType(), 20260519);

        assertTrue(retenues.contains(20260815));
        assertTrue(retenues.contains(20260816));
        assertTrue(retenues.contains(20260817));
    }

    /**
     * Cas central : la pharmacie a ferme les 30 et 31 decembre. La cloture du mois est le 29, dernier jour ou le releve
     * a tourne.
     */
    @Test
    public void conserveLeDernierReleveDuMoisMemeSiLeMoisEstIncomplet() {
        Set<Integer> retenues = StockSnapshotBackfillService.journeesConservees(calendrierType(), 20260519);

        assertTrue(retenues.contains(20251229), "la cloture de decembre est le dernier jour releve");
        assertFalse(retenues.contains(20251215), "un jour ordinaire de decembre n'est pas conserve");
    }

    /** Fevrier n'a pas le meme dernier jour que les autres mois : aucun numero de jour n'est ecrit en dur. */
    @Test
    public void conserveLaClotureDeFevrier() {
        Set<Integer> retenues = StockSnapshotBackfillService.journeesConservees(calendrierType(), 20260519);

        assertTrue(retenues.contains(20260228));
        assertFalse(retenues.contains(20260214));
    }

    /**
     * Le releve de 00:05 decrit le stock a la fermeture de la veille : la premiere journee relevee d'un mois porte la
     * cloture exacte du mois precedent, elle est donc conservee elle aussi.
     */
    @Test
    public void conserveLaPremiereJourneeDeChaqueMois() {
        Set<Integer> retenues = StockSnapshotBackfillService.journeesConservees(calendrierType(), 20260519);

        assertTrue(retenues.contains(20251101));
        assertTrue(retenues.contains(20251201));
        assertTrue(retenues.contains(20260201));
    }

    /** Le mois complet garde bien son 30, sans que le 30 soit une valeur particuliere pour autant. */
    @Test
    public void conserveLaClotureDunMoisComplet() {
        Set<Integer> retenues = StockSnapshotBackfillService.journeesConservees(calendrierType(), 20260519);

        assertTrue(retenues.contains(20251130));
    }

    /** Volumetrie : sur ce calendrier, 90 journees se reduisent aux 6 clotures et aux 3 journees recentes. */
    @Test
    public void reduitLeVolumeAuxClotureEtAuxJourneesRecentes() {
        Set<Integer> calendrier = calendrierType();
        Set<Integer> retenues = StockSnapshotBackfillService.journeesConservees(calendrier, 20260519);

        org.junit.jupiter.api.Assertions.assertEquals(90, calendrier.size());
        org.junit.jupiter.api.Assertions.assertEquals(9, retenues.size());
    }

    /** Un mois d'une seule journee : elle est a la fois premiere et derniere, et n'est comptee qu'une fois. */
    @Test
    public void gereUnMoisDuneSeuleJournee() {
        Set<Integer> calendrier = new TreeSet<>();
        calendrier.add(20260701);

        Set<Integer> retenues = StockSnapshotBackfillService.journeesConservees(calendrier, 20260519);

        org.junit.jupiter.api.Assertions.assertEquals(1, retenues.size());
        assertTrue(retenues.contains(20260701));
    }

    /** Calendrier vide : aucune journee retenue, et surtout aucune exception. */
    @Test
    public void supporteUnCalendrierVide() {
        Set<Integer> retenues = StockSnapshotBackfillService.journeesConservees(new TreeSet<>(), 20260519);

        assertTrue(retenues.isEmpty());
    }
}
