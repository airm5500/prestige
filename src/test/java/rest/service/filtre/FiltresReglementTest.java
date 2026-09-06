package rest.service.filtre;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/** Filtres de la liste des reglements (point 21). */
class FiltresReglementTest {

    private LigneReglement ligne(String organisme, String type, String groupe) {
        LigneReglement l = new LigneReglement();
        l.setOrganisme(organisme);
        l.setTypeTiersPayant(type);
        l.setGroupe(groupe);
        return l;
    }

    private List<LigneReglement> jeu() {
        return Arrays.asList(ligne("MUGEFCI", "Assurance", "PUBLIC"), ligne("CNPS", "Assurance", "PUBLIC"),
                ligne("PERSONNEL", "Carnet", "INTERNE"), ligne("SANS GROUPE", "Carnet", ""));
    }

    private List<String> noms(List<LigneReglement> lignes) {
        return lignes.stream().map(LigneReglement::getOrganisme).collect(Collectors.toList());
    }

    @Test
    void sansCritereToutesLesLignesSontConservees() {
        assertTrue(new FiltresReglement("", "").inactif());
        assertEquals(4, new FiltresReglement("", "").appliquer(jeu()).size());
    }

    @Test
    void leFiltreDeTypeEstInsensibleALaCasse() {
        assertEquals(Arrays.asList("PERSONNEL", "SANS GROUPE"),
                noms(new FiltresReglement("carnet", "").appliquer(jeu())));
    }

    @Test
    void leFiltreDeGroupeEstApplique() {
        assertEquals(Arrays.asList("MUGEFCI", "CNPS"), noms(new FiltresReglement("", "PUBLIC").appliquer(jeu())));
    }

    @Test
    void lesCriteresSeCombinent() {
        assertEquals(Arrays.asList("PERSONNEL"), noms(new FiltresReglement("Carnet", "INTERNE").appliquer(jeu())));
    }

    @Test
    void lOrdreDeLaListeEstConserve() {
        assertEquals(Arrays.asList("MUGEFCI", "CNPS"), noms(new FiltresReglement("Assurance", "").appliquer(jeu())));
    }

    @Test
    void lesCriteresRetenusSontRappelesEnClair() {
        List<String> libelles = new FiltresReglement("Assurance", "PUBLIC").libelles();
        assertEquals(Arrays.asList("Type de tiers payant : ASSURANCE", "Groupe de tiers payants : PUBLIC"), libelles);
    }

    @Test
    void uneListeAbsenteNeFaitPasEchouerLeFiltrage() {
        assertTrue(new FiltresReglement("Carnet", "").appliquer(null).isEmpty());
    }

    @Test
    void lesMontantsSontLisiblesEnNombresPourLEdition() {
        LigneReglement l = new LigneReglement();
        l.setMontantRegle("12500");
        l.setMontantAttente("illisible");
        assertEquals(0, l.getMontantRegleNombre().compareTo(new java.math.BigDecimal("12500")));
        assertEquals(0, l.getMontantAttenteNombre().signum());
        assertEquals("Sans groupe", l.getGroupeLibelle());
    }
}
