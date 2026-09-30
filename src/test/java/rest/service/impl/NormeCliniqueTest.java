package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Fiche client (30/09) : analyse des mesures selon les normes de l'age, IMC, controles de saisie. */
public class NormeCliniqueTest {

    private static final List<NormeClinique.Norme> TENSION = Arrays.asList(
            new NormeClinique.Norme(1, 12, 90.0, 115.0, 55.0, 75.0, "Enfant"),
            new NormeClinique.Norme(13, 17, 100.0, 129.0, 60.0, 80.0, "Ado"),
            new NormeClinique.Norme(18, null, 90.0, 139.0, 60.0, 89.0, "Adulte"));
    private static final List<NormeClinique.Norme> GLYCEMIE = Arrays
            .asList(new NormeClinique.Norme(null, null, 0.70, 1.10, null, null, "Jeun"));

    @Test
    public void tensionSelonLAge() {
        assertEquals(NormeClinique.NORMAL, NormeClinique.evaluer(130, 85.0, 45, TENSION).etat);
        assertEquals(NormeClinique.HAUT, NormeClinique.evaluer(145, 85.0, 45, TENSION).etat);
        /* La diastolique seule suffit a classer « elevee ». */
        assertEquals(NormeClinique.HAUT, NormeClinique.evaluer(130, 95.0, 45, TENSION).etat);
        /* 125 / 80 : normale pour un adulte, elevee pour un enfant de 8 ans. */
        assertEquals(NormeClinique.HAUT, NormeClinique.evaluer(125, 80.0, 8, TENSION).etat);
        assertEquals(NormeClinique.BAS, NormeClinique.evaluer(85, 50.0, 45, TENSION).etat);
        /* Age inconnu : la norme de l'adulte. */
        assertEquals("Adulte", NormeClinique.evaluer(130, 85.0, null, TENSION).norme.getSource());
        /* Nourrisson : aucune tranche ne le couvre. */
        assertEquals(NormeClinique.INCONNU, NormeClinique.evaluer(80, 50.0, 0, TENSION).etat);
    }

    @Test
    public void glycemieSansAge() {
        assertEquals(NormeClinique.NORMAL, NormeClinique.evaluer(0.95, null, 30, GLYCEMIE).etat);
        assertEquals(NormeClinique.HAUT, NormeClinique.evaluer(1.30, null, null, GLYCEMIE).etat);
        assertEquals(NormeClinique.BAS, NormeClinique.evaluer(0.55, null, 70, GLYCEMIE).etat);
        assertEquals("0,7 - 1,1", GLYCEMIE.get(0).plage());
        assertEquals("90 - 139 / 60 - 89", TENSION.get(2).plage());
    }

    @Test
    public void imc() {
        assertEquals(24.2, NormeClinique.imc(70.0, 170.0));
        assertNull(NormeClinique.imc(70.0, null));
        assertEquals("Corpulence normale", NormeClinique.classerImc(24.2, 40).libelle);
        assertEquals("Surpoids", NormeClinique.classerImc(27.0, 40).libelle);
        assertEquals("Obésité", NormeClinique.classerImc(31.0, null).libelle);
        assertEquals("Maigreur", NormeClinique.classerImc(17.0, 20).libelle);
        assertEquals(NormeClinique.INCONNU, NormeClinique.classerImc(17.0, 10).etat);
    }

    @Test
    public void saisie() {
        assertNull(DossierClientService.MesureSaisie.hors(120, 40.0, 260.0, "Systolique"));
        assertTrue(DossierClientService.MesureSaisie.hors(1200, 40.0, 260.0, "Systolique").contains("hors"));
        assertTrue(DossierClientService.validerParametre("", null, null).contains("obligatoire"));
        assertTrue(DossierClientService.validerParametre("Cholestérol", 5.0, 1.0).contains("inférieure"));
        assertNull(DossierClientService.validerParametre("Cholestérol", 1.0, 5.0));
        assertNull(DossierClientService.dateMesure("2099-01-01"));
        assertNull(DossierClientService.dateMesure("pas une date"));
        assertEquals(LocalDateTime.of(2026, 9, 1, 8, 30), DossierClientService.dateMesure("2026-09-01T08:30"));
        assertTrue(DossierClientService.dateMesure("") != null);
    }
}
