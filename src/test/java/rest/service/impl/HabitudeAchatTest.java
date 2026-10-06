package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Plan d'octobre, 4.1 : habitudes d'achat regulieres (au moins 3 achats, ecarts stables) et date du rappel. */
public class HabitudeAchatTest {

    private static final LocalDate J = LocalDate.of(2026, 10, 6);

    private static List<LocalDate> d(String... s) {
        return Arrays.asList(Arrays.stream(s).map(LocalDate::parse).toArray(LocalDate[]::new));
    }

    @Test
    public void mensuelRegulier() {
        HabitudeAchat.Resultat r = HabitudeAchat.analyser(d("2026-06-10", "2026-07-09", "2026-08-10", "2026-09-08"), J);
        assertTrue(r.reguliere, r.raison);
        assertEquals(30, r.frequenceJours);
        assertEquals(LocalDate.of(2026, 10, 8), r.prochainAchat);
        assertTrue(r.aRappeler(J, 3), "prochain achat dans 2 jours, rappel 3 jours avant");
        assertFalse(r.aRappeler(J, 1));
    }

    @Test
    public void tropPeuDAchatsOuMemeJour() {
        assertFalse(HabitudeAchat.analyser(d("2026-08-01", "2026-09-01"), J).reguliere);
        HabitudeAchat.Resultat r = HabitudeAchat.analyser(d("2026-08-01", "2026-08-01", "2026-09-01"), J);
        assertFalse(r.reguliere, "deux achats le meme jour comptent pour un");
        assertEquals(2, r.achats);
    }

    @Test
    public void irregulier() {
        HabitudeAchat.Resultat r = HabitudeAchat.analyser(d("2026-05-01", "2026-05-05", "2026-07-20", "2026-08-01"), J);
        assertFalse(r.reguliere);
        assertTrue(r.raison.contains("irréguliers"), r.raison);
    }

    @Test
    public void horsPlageEtInterrompu() {
        assertFalse(HabitudeAchat.analyser(d("2026-09-01", "2026-09-03", "2026-09-05"), J).reguliere,
                "tous les 2 jours");
        HabitudeAchat.Resultat r = HabitudeAchat.analyser(d("2026-03-01", "2026-03-31", "2026-04-30"), J);
        assertFalse(r.reguliere);
        assertEquals("habitude interrompue", r.raison);
    }

    @Test
    public void retardRepriSeulementDansLaFenetre() {
        HabitudeAchat.Resultat r = HabitudeAchat.analyser(d("2026-07-01", "2026-07-31", "2026-08-30"), J);
        assertTrue(r.reguliere);
        assertEquals(LocalDate.of(2026, 9, 29), r.prochainAchat);
        assertFalse(r.aRappeler(J, 2), "7 jours de retard, fenetre de 2 jours : deja passe");
        assertTrue(r.aRappeler(LocalDate.of(2026, 10, 1), 2), "2 jours de retard : repris");
        assertTrue(r.aRappeler(LocalDate.of(2026, 9, 27), 2), "2 jours avant");
        assertFalse(r.aRappeler(LocalDate.of(2026, 9, 26), 2), "3 jours avant : pas encore");
    }

    @Test
    public void seuilsParametrables() {
        List<LocalDate> l = d("2026-07-01", "2026-07-21", "2026-08-25", "2026-09-20");
        assertFalse(HabitudeAchat.analyser(l, J, 3, 20).reguliere);
        assertTrue(HabitudeAchat.analyser(l, J, 3, 40).reguliere);
        assertFalse(HabitudeAchat.analyser(l, J, 5, 40).reguliere, "5 achats exiges");
    }
}
