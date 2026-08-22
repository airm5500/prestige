package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Date;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Bornes de periode et libelle d'etat de la liste des etiquettes.
 *
 * <p>
 * Deux regles que la page JSP portait implicitement et qu'il ne faut pas perdre : une date de fin couvre la JOURNEE
 * entiere, et une date absente ne doit pas vider la liste.
 */
class PeriodeEtiquetteTest {

    private static LocalDateTime enDateHeure(Date date) {
        return new java.sql.Timestamp(date.getTime()).toLocalDateTime();
    }

    @Test
    @DisplayName("La date de fin couvre la journee entiere")
    void laFinCouvreLaJournee() {
        LocalDateTime fin = enDateHeure(EtiquetteListeServiceImpl.finDePeriode("2026-08-22"));
        assertEquals(LocalDate.of(2026, 8, 22), fin.toLocalDate());
        assertEquals(23, fin.getHour());
        assertEquals(59, fin.getMinute());
    }

    @Test
    @DisplayName("La date de debut part du premier instant du jour")
    void leDebutPartDuMatin() {
        LocalDateTime debut = enDateHeure(EtiquetteListeServiceImpl.debutDePeriode("2026-08-22"));
        assertEquals(LocalDate.of(2026, 8, 22), debut.toLocalDate());
        assertEquals(0, debut.getHour());
        assertEquals(0, debut.getMinute());
    }

    @Test
    @DisplayName("Sans date de debut, on remonte a l'origine des temps plutot que de vider la liste")
    void debutAbsent() {
        for (String saisie : new String[] { null, "", "   ", "pas une date" }) {
            Date debut = EtiquetteListeServiceImpl.debutDePeriode(saisie);
            assertTrue(enDateHeure(debut).getYear() <= 1970, "saisie : " + saisie);
        }
    }

    @Test
    @DisplayName("Sans date de fin, on prend la fin de la journee en cours")
    void finAbsente() {
        LocalDateTime fin = enDateHeure(EtiquetteListeServiceImpl.finDePeriode(null));
        assertEquals(LocalDate.now(), fin.toLocalDate());
        assertEquals(23, fin.getHour());
    }

    @Test
    @DisplayName("L'etat affiche distingue une etiquette editee d'une etiquette a editer")
    void libelleDEtat() {
        assertEquals("Editée", EtiquetteListeServiceImpl.libelleEtat("Read"));
        assertEquals("Editée", EtiquetteListeServiceImpl.libelleEtat("  read  "));
        assertEquals("Non éditée", EtiquetteListeServiceImpl.libelleEtat("enable"));
        assertEquals("Non éditée", EtiquetteListeServiceImpl.libelleEtat(null));
    }
}
