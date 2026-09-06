package rest.service.filtre;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/** Filtres du recapitulatif par compte organisme (point 10). */
class FiltresRecapOrganismeTest {

    private LigneRecapOrganisme ligne(String organisme, String type, String groupe, String solde) {
        LigneRecapOrganisme l = new LigneRecapOrganisme();
        l.setOrganisme(organisme);
        l.setTypeOrganisme(type);
        l.setGroupe(groupe);
        l.setSolde(solde);
        return l;
    }

    private List<LigneRecapOrganisme> jeu() {
        return Arrays.asList(ligne("MUGEFCI", "Assurance", "PUBLIC", "150000"),
                ligne("CNPS", "Assurance", "PUBLIC", "0"), ligne("PERSONNEL", "Carnet", "INTERNE", "-25000"),
                ligne("SANS GROUPE", "Carnet", "", "500"));
    }

    private List<String> noms(List<LigneRecapOrganisme> lignes) {
        return lignes.stream().map(LigneRecapOrganisme::getOrganisme).collect(Collectors.toList());
    }

    @Test
    void sansCritereToutesLesLignesSontConservees() {
        FiltresRecapOrganisme filtres = new FiltresRecapOrganisme("", "", "", "");
        assertTrue(filtres.inactif());
        assertEquals(4, filtres.appliquer(jeu()).size());
    }

    @Test
    void leFiltreDeMontantPorteSurLeSolde() {
        assertEquals(Arrays.asList("MUGEFCI", "SANS GROUPE"),
                noms(new FiltresRecapOrganisme("gt", "0", "", "").appliquer(jeu())));
        assertEquals(Arrays.asList("CNPS"), noms(new FiltresRecapOrganisme("eq", "0", "", "").appliquer(jeu())));
        assertEquals(Arrays.asList("PERSONNEL"), noms(new FiltresRecapOrganisme("lt", "0", "", "").appliquer(jeu())));
    }

    @Test
    void leFiltreDeTypeEstInsensibleALaCasse() {
        assertEquals(Arrays.asList("MUGEFCI", "CNPS"),
                noms(new FiltresRecapOrganisme("", "", "assurance", "").appliquer(jeu())));
    }

    @Test
    void leFiltreDeGroupeEstApplique() {
        assertEquals(Arrays.asList("PERSONNEL"),
                noms(new FiltresRecapOrganisme("", "", "", "INTERNE").appliquer(jeu())));
    }

    @Test
    void lesCriteresSeCombinent() {
        assertEquals(Arrays.asList("MUGEFCI"),
                noms(new FiltresRecapOrganisme("gt", "0", "Assurance", "PUBLIC").appliquer(jeu())));
    }

    @Test
    void lOrdreDeLaListeEstConserve() {
        List<LigneRecapOrganisme> retenues = new FiltresRecapOrganisme("gte", "0", "", "").appliquer(jeu());
        assertEquals(Arrays.asList("MUGEFCI", "CNPS", "SANS GROUPE"), noms(retenues));
    }

    @Test
    void lesCriteresRetenusSontRappelesEnClair() {
        List<String> libelles = new FiltresRecapOrganisme("gte", "1000", "Assurance", "PUBLIC").libelles();
        assertEquals(3, libelles.size());
        assertEquals("Solde supérieur ou égal à 1000", libelles.get(0));
        assertEquals("Type de tiers payant : ASSURANCE", libelles.get(1));
        assertEquals("Groupe de tiers payants : PUBLIC", libelles.get(2));
    }

    @Test
    void uneListeAbsenteNeFaitPasEchouerLeFiltrage() {
        assertTrue(new FiltresRecapOrganisme("gt", "0", "", "").appliquer(null).isEmpty());
    }
}
