package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/**
 * Bornes de dates de l'ecran des surstocks.
 *
 * Contexte : l'officine a signale le 18/09 un produit dont la fiche article donnait juin 11, juillet 15 et aout 9, soit
 * 35, quand l'ecran des surstocks affichait 34 sur la meme ligne que ces trois mois. La quantite vendue courait sur une
 * fenetre GLISSANTE (du 18 juin au 18 septembre : un juin tronque et un septembre partiel) alors que les colonnes de
 * mois etaient calendaires. Ces tests verrouillent la regle retenue : des MOIS COMPLETS, mois en cours exclu de
 * l'historique.
 */
public class SurstockBornesTest {

    private static final LocalDate LE_18_SEPTEMBRE = LocalDate.of(2026, 9, 18);

    @Test
    public void historiqueEnMoisCompletsDepuisLePremierDuMoisLePlusAncien() {
        SurstockServiceImpl.Bornes b = SurstockServiceImpl.bornes(LE_18_SEPTEMBRE, 3);

        // trois mois complets : juin, juillet, aout
        assertEquals(LocalDate.of(2026, 6, 1), b.debut);
        assertEquals(LocalDate.of(2026, 9, 1), b.histFin);
    }

    @Test
    public void leMoisEnCoursEstExcluDeLHistorique() {
        SurstockServiceImpl.Bornes b = SurstockServiceImpl.bornes(LE_18_SEPTEMBRE, 3);

        // histFin est exclusive et vaut le 1er du mois en cours : aucune vente de septembre n'entre dans la moyenne
        assertEquals(b.m0, b.histFin);
        assertTrue(b.histFin.isAfter(b.debut));
        assertFalse(LE_18_SEPTEMBRE.isBefore(b.histFin));
    }

    @Test
    public void lesQuatreColonnesSontDesMoisCalendairesConsecutifs() {
        SurstockServiceImpl.Bornes b = SurstockServiceImpl.bornes(LE_18_SEPTEMBRE, 3);

        assertEquals(LocalDate.of(2026, 9, 1), b.m0);
        assertEquals(LocalDate.of(2026, 8, 1), b.m1);
        assertEquals(LocalDate.of(2026, 7, 1), b.m2);
        assertEquals(LocalDate.of(2026, 6, 1), b.m3);
    }

    @Test
    public void laQuantiteVendueEstExactementLaSommeDesColonnesAffichees() {
        // c'est le coeur du defaut signale : avec un historique de 3 mois, la periode d'historique doit couvrir
        // exactement les trois colonnes m1, m2 et m3 (juin + juillet + aout = 35, et non 34)
        SurstockServiceImpl.Bornes b = SurstockServiceImpl.bornes(LE_18_SEPTEMBRE, 3);

        assertEquals(b.m3, b.debut);
        assertEquals(b.m0, b.histFin);
    }

    @Test
    public void laPeriodeScanneeCouvreALaFoisLHistoriqueEtLesQuatreMoisAffiches() {
        // historique court : les colonnes vont plus loin en arriere que l'historique, le scan doit suivre les colonnes
        SurstockServiceImpl.Bornes court = SurstockServiceImpl.bornes(LE_18_SEPTEMBRE, 1);
        assertEquals(LocalDate.of(2026, 8, 1), court.debut);
        assertEquals(LocalDate.of(2026, 6, 1), court.scanDebut);

        // historique long : le scan doit remonter jusqu'au debut de l'historique
        SurstockServiceImpl.Bornes lg = SurstockServiceImpl.bornes(LE_18_SEPTEMBRE, 12);
        assertEquals(LocalDate.of(2025, 9, 1), lg.debut);
        assertEquals(LocalDate.of(2025, 9, 1), lg.scanDebut);
    }

    @Test
    public void laBorneDeFinInclutLaJourneeEnCours() {
        SurstockServiceImpl.Bornes b = SurstockServiceImpl.bornes(LE_18_SEPTEMBRE, 3);

        // fin est exclusive : les ventes du jour meme sont comptees dans la colonne du mois en cours
        assertEquals(LocalDate.of(2026, 9, 19), b.fin);
    }

    @Test
    public void lePremierDuMoisNeRemonteJamaisSurLeMoisPrecedent() {
        SurstockServiceImpl.Bornes b = SurstockServiceImpl.bornes(LocalDate.of(2026, 1, 1), 3);

        assertEquals(LocalDate.of(2026, 1, 1), b.m0);
        assertEquals(LocalDate.of(2025, 10, 1), b.debut);
        assertEquals(LocalDate.of(2026, 1, 1), b.histFin);
        // un 1er du mois : l'historique est complet et le mois en cours est vide, la moyenne reste juste
        assertEquals(b.debut, b.scanDebut);
    }

    @Test
    public void leFranchissementDAnneeEstCorrect() {
        SurstockServiceImpl.Bornes b = SurstockServiceImpl.bornes(LocalDate.of(2026, 2, 10), 3);

        assertEquals(LocalDate.of(2026, 2, 1), b.m0);
        assertEquals(LocalDate.of(2026, 1, 1), b.m1);
        assertEquals(LocalDate.of(2025, 12, 1), b.m2);
        assertEquals(LocalDate.of(2025, 11, 1), b.m3);
        assertEquals(LocalDate.of(2025, 11, 1), b.debut);
    }

    @Test
    public void unMoisDeTrenteUnJoursNeDecaleRien() {
        // 31 mars : withDayOfMonth(1) puis minusMonths ne doit pas produire un 28 ou un 30 fevrier
        SurstockServiceImpl.Bornes b = SurstockServiceImpl.bornes(LocalDate.of(2026, 3, 31), 3);

        assertEquals(LocalDate.of(2026, 3, 1), b.m0);
        assertEquals(LocalDate.of(2026, 2, 1), b.m1);
        assertEquals(LocalDate.of(2025, 12, 1), b.debut);
        assertEquals(LocalDate.of(2026, 4, 1), b.fin);
    }
}
