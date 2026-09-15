package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.time.LocalDate;
import java.time.YearMonth;
import org.junit.jupiter.api.Test;

/**
 * Evolution 5, point 2 : la valorisation du stock est archivee en PDF les jours de fin et de debut de mois, dans le
 * dossier « valorisations », sous un nom qui porte l'officine et la date.
 */
public class ValorisationPdfArchiveTest {

    @Test
    public void huitJoursDArchivageParMoisDeTrenteEtUn() {
        // 27, 28, 29, 30, 31 puis 1, 2, 3 : huit editions par mois.
        assertEquals(8, joursDArchivage(2026, 1));
    }

    @Test
    public void unMoisPlusCourtNeProduitPasDEditionSansJournee() {
        // La fenetre compte huit jours (27 a 31, puis 1 a 3) mais un mois plus court n'a pas tous ces
        // jours : fevrier 2026 (28 jours) donne cinq editions, fevrier 2028 (29 jours) six, un mois de
        // trente jours sept. On ne produit jamais une edition qui ne corresponde a aucune journee reelle.
        assertEquals(5, joursDArchivage(2026, 2));
        assertEquals(6, joursDArchivage(2028, 2));
        assertEquals(7, joursDArchivage(2026, 4));
        assertEquals(8, joursDArchivage(2026, 1));
    }

    private static int joursDArchivage(int annee, int mois) {
        int total = 0;
        for (int j = 1; j <= YearMonth.of(annee, mois).lengthOfMonth(); j++) {
            if (ValorisationPdfArchiveService.jourDArchivage(LocalDate.of(annee, mois, j))) {
                total++;
            }
        }
        return total;
    }

    @Test
    public void lesJoursDeMilieuDeMoisNeSontPasDesJoursDArchivage() {
        for (int j = 4; j <= 26; j++) {
            assertFalse(ValorisationPdfArchiveService.jourDArchivage(LocalDate.of(2026, 5, j)), "jour " + j);
        }
    }

    @Test
    public void lesBornesDeLaFenetreSontIncluses() {
        assertTrue(ValorisationPdfArchiveService.jourDArchivage(LocalDate.of(2026, 5, 27)));
        assertTrue(ValorisationPdfArchiveService.jourDArchivage(LocalDate.of(2026, 5, 31)));
        assertTrue(ValorisationPdfArchiveService.jourDArchivage(LocalDate.of(2026, 5, 1)));
        assertTrue(ValorisationPdfArchiveService.jourDArchivage(LocalDate.of(2026, 5, 3)));
    }

    @Test
    public void douzeMoisDArchivesTiennentDansUneCentaineDeFichiers() {
        // Sept mois de 31 jours (8 editions), quatre de 30 (7) et fevrier (5) : la conservation sur
        // douze mois reste de l'ordre de la centaine de PDF, ce que le dossier encaisse sans probleme.
        int total = 0;
        for (int mois = 1; mois <= 12; mois++) {
            total += joursDArchivage(2027, mois);
        }
        assertEquals(7 * 8 + 4 * 7 + 5, total);
        assertEquals(89, total);
    }

    @Test
    public void leNomPorteLOfficineEtLaDate() {
        ValorisationPdfArchiveService service = new ValorisationPdfArchiveService();
        assertEquals("valorisation_pharmacie_de_la_paix_du_2026-09-27.pdf",
                service.nomFichier("PHARMACIE DE LA PAIX", LocalDate.of(2026, 9, 27)));
    }

    @Test
    public void leNomResteUtilisableQuelQueSoitLeNomDeLOfficine() {
        // Accents, apostrophes, barres obliques : le fichier doit rester nommable sur tous les systemes.
        assertEquals("pharmacie_st_michel_cote_d_ivoire",
                ValorisationPdfArchiveService.assainir("Pharmacie St-Michel / Côte d'Ivoire"));
        assertEquals("officine", ValorisationPdfArchiveService.assainir("   "));
        assertEquals("officine", ValorisationPdfArchiveService.assainir(null));
    }

    @Test
    public void deuxArchivagesDuMemeJourRetombentSurLeMemeNom() {
        // Sans quoi un redemarrage du serveur empilerait plusieurs documents pour la meme journee.
        ValorisationPdfArchiveService service = new ValorisationPdfArchiveService();
        assertEquals(service.nomFichier("OFFICINE X", LocalDate.of(2026, 3, 1)),
                service.nomFichier("OFFICINE X", LocalDate.of(2026, 3, 1)));
    }

    @Test
    public void laDateSeRelitDepuisLeNomDuFichier() {
        // C'est la seule source fiable : la date du systeme de fichiers est perdue a la moindre recopie.
        assertEquals(LocalDate.of(2026, 9, 27),
                ValorisationPdfArchiveService.jourDuNom("valorisation_pharmacie_du_2026-09-27.pdf"));
        // Un nom d'officine qui contient « _du_ » ne doit pas tromper la lecture : on lit le dernier.
        assertEquals(LocalDate.of(2026, 1, 3),
                ValorisationPdfArchiveService.jourDuNom("valorisation_pharmacie_du_plateau_du_2026-01-03.pdf"));
        assertNull(ValorisationPdfArchiveService.jourDuNom("valorisation_pharmacie.pdf"));
        assertNull(ValorisationPdfArchiveService.jourDuNom("valorisation_pharmacie_du_pas-une-date.pdf"));
    }

    @Test
    public void lesMontantsManquantsValentZero() {
        // L'edition de l'ecran leve une exception de conversion quand un taux de TVA ne ressort pas ;
        // l'archivage, lui, ne doit pas echouer pour autant.
        assertEquals(0d, ValorisationPdfArchiveService.nombre(null));
        assertEquals(0d, ValorisationPdfArchiveService.nombre(""));
        assertEquals(0d, ValorisationPdfArchiveService.nombre("null"));
        assertEquals(1234.5d, ValorisationPdfArchiveService.nombre(" 1234.5 "));
    }
}
