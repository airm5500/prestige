package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import rest.service.impl.PilotagePeriodes.Axe;

/**
 * Axes de comparaison du menu de pilotage (evolution 6, point 1).
 *
 * <p>
 * Ce qui est verrouille ici : deux periodes comparees couvrent la MEME DUREE ECOULEE. Comparer un mois en cours au 18
 * septembre avec un mois d'aout entier annoncerait une chute de chiffre d'affaires qui n'existe pas - et c'est le genre
 * d'erreur qu'un pharmacien decouvre en reunion, pas en recette.
 */
public class PilotagePeriodesTest {

    private static final LocalDate LE_18_SEPTEMBRE = LocalDate.of(2026, 9, 18);

    @Test
    public void leMoisEnCoursNeSeCompareARien() {
        Axe axe = PilotagePeriodes.calculer(PilotagePeriodes.MOIS_EN_COURS, LE_18_SEPTEMBRE, null, null);
        assertEquals(LocalDate.of(2026, 9, 1), axe.courante.debut);
        // fin exclue au lendemain : la journee en cours est comptee
        assertEquals(LocalDate.of(2026, 9, 19), axe.courante.fin);
        assertNull(axe.reference, "aucune comparaison n'est demandee");
    }

    @Test
    public void unAxeInconnuRetombeSurLeMoisEnCoursSansEchouer() {
        Axe axe = PilotagePeriodes.calculer("N_IMPORTE_QUOI", LE_18_SEPTEMBRE, null, null);
        assertEquals(PilotagePeriodes.MOIS_EN_COURS, axe.code);
        assertFalse(PilotagePeriodes.connu("N_IMPORTE_QUOI"));
    }

    @Test
    public void leMoisPrecedentEstTronqueAuMemeJour() {
        Axe axe = PilotagePeriodes.calculer(PilotagePeriodes.VS_MOIS_PRECEDENT, LE_18_SEPTEMBRE, null, null);
        assertEquals(LocalDate.of(2026, 9, 1), axe.courante.debut);
        assertEquals(LocalDate.of(2026, 9, 19), axe.courante.fin);
        assertEquals(LocalDate.of(2026, 8, 1), axe.reference.debut);
        /* Le 18 aout inclus, et pas le mois d'aout entier : c'est toute la difference. */
        assertEquals(LocalDate.of(2026, 8, 19), axe.reference.fin);
        assertEquals(axe.courante.jours(), axe.reference.jours(), "les deux periodes doivent durer autant");
    }

    @Test
    public void lAnDernierEstTronqueAuMemeJour() {
        Axe axe = PilotagePeriodes.calculer(PilotagePeriodes.VS_MEME_MOIS_AN_DERNIER, LE_18_SEPTEMBRE, null, null);
        assertEquals(LocalDate.of(2025, 9, 1), axe.reference.debut);
        assertEquals(LocalDate.of(2025, 9, 19), axe.reference.fin);
        assertEquals(axe.courante.jours(), axe.reference.jours());
    }

    @Test
    public void unJourQuiNExistePasDansLeMoisDeReferenceEstRamenALaFinDuMois() {
        /*
         * 31 mars compare a fevrier : le 31 fevrier n'existe pas. Sans cette precaution, la borne deborderait sur mars
         * et compterait des ventes qui n'appartiennent pas a la periode comparee.
         */
        Axe axe = PilotagePeriodes.calculer(PilotagePeriodes.VS_MOIS_PRECEDENT, LocalDate.of(2026, 3, 31), null, null);
        assertEquals(LocalDate.of(2026, 2, 1), axe.reference.debut);
        assertEquals(LocalDate.of(2026, 3, 1), axe.reference.fin, "fin de fevrier, jamais mars");
    }

    @Test
    public void leCumulAnnuelSarreteAuMemeJourDesDeuxAnnees() {
        Axe axe = PilotagePeriodes.calculer(PilotagePeriodes.CUMUL_ANNUEL, LE_18_SEPTEMBRE, null, null);
        assertEquals(LocalDate.of(2026, 1, 1), axe.courante.debut);
        assertEquals(LocalDate.of(2026, 9, 19), axe.courante.fin);
        assertEquals(LocalDate.of(2025, 1, 1), axe.reference.debut);
        assertEquals(LocalDate.of(2025, 9, 19), axe.reference.fin);
        assertEquals(axe.courante.jours(), axe.reference.jours());
    }

    @Test
    public void leGlissantPorteSurDouzeMoisCompletsEtExclutLeMoisEnCours() {
        Axe axe = PilotagePeriodes.calculer(PilotagePeriodes.GLISSANT_12_MOIS, LE_18_SEPTEMBRE, null, null);
        assertEquals(LocalDate.of(2025, 9, 1), axe.courante.debut);
        /* Fin au 1er septembre 2026 EXCLU : le mois commence n'entre pas dans le glissant. */
        assertEquals(LocalDate.of(2026, 9, 1), axe.courante.fin);
        assertEquals(365, axe.courante.jours());
        assertEquals(LocalDate.of(2024, 9, 1), axe.reference.debut);
        assertEquals(LocalDate.of(2025, 9, 1), axe.reference.fin);
    }

    @Test
    public void lesDouzeMoisGlissantsEtLeurReferenceNeSeChevauchentPas() {
        Axe axe = PilotagePeriodes.calculer(PilotagePeriodes.GLISSANT_12_MOIS, LE_18_SEPTEMBRE, null, null);
        assertEquals(axe.reference.fin, axe.courante.debut, "les deux fenetres se touchent sans se recouvrir");
    }

    @Test
    public void lePersonnaliseSeCompareALaPeriodeQuiPrecede() {
        Axe axe = PilotagePeriodes.calculer(PilotagePeriodes.PERSONNALISE, LE_18_SEPTEMBRE, LocalDate.of(2026, 6, 1),
                LocalDate.of(2026, 6, 30));
        assertEquals(LocalDate.of(2026, 6, 1), axe.courante.debut);
        assertEquals(LocalDate.of(2026, 7, 1), axe.courante.fin);
        assertEquals(30, axe.courante.jours());
        assertEquals(LocalDate.of(2026, 5, 2), axe.reference.debut);
        assertEquals(LocalDate.of(2026, 6, 1), axe.reference.fin);
        assertEquals(axe.courante.jours(), axe.reference.jours());
    }

    @Test
    public void unePeriodePersonnaliseeALEnversEstRemiseDansLOrdre() {
        // L'operateur saisit parfois la fin avant le debut : on ne rend pas une periode vide
        Axe axe = PilotagePeriodes.calculer(PilotagePeriodes.PERSONNALISE, LE_18_SEPTEMBRE, LocalDate.of(2026, 6, 30),
                LocalDate.of(2026, 6, 1));
        assertEquals(LocalDate.of(2026, 6, 1), axe.courante.debut);
        assertEquals(LocalDate.of(2026, 7, 1), axe.courante.fin);
    }

    @Test
    public void lePersonnaliseSansDateRetombeSurLeMoisEnCours() {
        Axe axe = PilotagePeriodes.calculer(PilotagePeriodes.PERSONNALISE, LE_18_SEPTEMBRE, null, null);
        assertEquals(LocalDate.of(2026, 9, 1), axe.courante.debut);
        assertEquals(LocalDate.of(2026, 9, 19), axe.courante.fin);
    }

    @Test
    public void laFenetreDuGraphiqueEstToujoursPlusLargeQueLaPeriodeRegardee() {
        for (String code : new String[] { PilotagePeriodes.MOIS_EN_COURS, PilotagePeriodes.VS_MOIS_PRECEDENT,
                PilotagePeriodes.VS_MEME_MOIS_AN_DERNIER, PilotagePeriodes.CUMUL_ANNUEL,
                PilotagePeriodes.GLISSANT_12_MOIS }) {
            Axe axe = PilotagePeriodes.calculer(code, LE_18_SEPTEMBRE, null, null);
            assertNotNull(axe.graphique, code);
            assertTrue(
                    axe.graphique.debut.isBefore(axe.courante.debut) || axe.graphique.debut.equals(axe.courante.debut),
                    code);
            assertTrue(axe.graphique.fin.isAfter(LE_18_SEPTEMBRE), code);
        }
    }

    @Test
    public void laComparaisonAnnuelleRemonteADeuxAnsDeGraphique() {
        // Superposer n et n-1 demande deux ans de serie : une seule annee ne montrerait qu'une courbe
        Axe axe = PilotagePeriodes.calculer(PilotagePeriodes.VS_MEME_MOIS_AN_DERNIER, LE_18_SEPTEMBRE, null, null);
        assertEquals(LocalDate.of(2024, 9, 1), axe.graphique.debut);
    }

    @Test
    public void lesLibellesDisentCeQuiEstCompare() {
        Axe axe = PilotagePeriodes.calculer(PilotagePeriodes.VS_MOIS_PRECEDENT, LE_18_SEPTEMBRE, null, null);
        assertEquals("Septembre 2026 (au 18)", axe.courante.libelle);
        assertEquals("Août 2026 (au 18)", axe.reference.libelle);
        assertTrue(axe.explication.length() > 20, "l'ecran doit pouvoir expliquer l'axe a l'operateur");
    }

    @Test
    public void unMoisEntierNAffichePasDeJourDArret() {
        /* Le 30 septembre, le mois est complet : le libelle n'a pas a porter « (au 30) ». */
        Axe axe = PilotagePeriodes.calculer(PilotagePeriodes.MOIS_EN_COURS, LocalDate.of(2026, 9, 30), null, null);
        assertEquals("Septembre 2026", axe.courante.libelle);
    }

    @Test
    public void laVariationEstEnPourcentageEtRefuseDeDiviserParZero() {
        assertEquals(10d, PilotagePeriodes.variation(110, 100), 0.001);
        assertEquals(-50d, PilotagePeriodes.variation(50, 100), 0.001);
        /*
         * Partir de zero n'est pas une progression : afficher « +100 % » la ou il n'y avait rien tromperait le lecteur.
         * L'ecran affiche alors la valeur seule.
         */
        assertNull(PilotagePeriodes.variation(1000, 0));
        assertEquals(0d, PilotagePeriodes.variation(100, 100), 0.001);
    }

    @Test
    public void tousLesAxesAnnoncesSontReconnus() {
        for (String code : new String[] { "MOIS", "VS_M1", "VS_N1", "YTD", "G12", "PERSO" }) {
            assertTrue(PilotagePeriodes.connu(code), code);
        }
    }
}
