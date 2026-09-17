package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import rest.service.dto.StockReserveLigneDTO;

/**
 * Retour du 17/09, points 6 et 7 : les deux editions « imprimer reserve » - etat de stock et comparaison d'articles -
 * doivent trier les produits PAR EMPLACEMENT.
 *
 * <p>
 * Un releve de stock se fait rayon par rayon, en marchant devant les etageres. Une liste dans l'ordre alphabetique des
 * medicaments oblige a traverser l'officine a chaque ligne : c'est la difference entre une feuille utilisable et une
 * feuille qu'on recopie a la main avant de s'en servir.
 */
public class StockReserveTriTest {

    private static StockReserveLigneDTO ligne(String emplacement, String libelle) {
        return new StockReserveLigneDTO("CIP", libelle, emplacement, "FAM", 1, 0, 100, 200);
    }

    private static List<String> ordre(List<StockReserveLigneDTO> lignes) {
        StockReserveEditionService.trierParEmplacement(lignes);
        return lignes.stream().map(l -> l.getEmplacement() + "/" + l.getLibelle()).collect(Collectors.toList());
    }

    @Test
    public void lesLignesSontGroupeesParEmplacement() {
        List<StockReserveLigneDTO> lignes = new ArrayList<>(Arrays.asList(ligne("POMMADES", "ZOVIRAX"),
                ligne("COMPRIMES", "PARACETAMOL"), ligne("POMMADES", "ASPIVENIN"), ligne("COMPRIMES", "ASPIRINE")));

        assertEquals(
                Arrays.asList("COMPRIMES/ASPIRINE", "COMPRIMES/PARACETAMOL", "POMMADES/ASPIVENIN", "POMMADES/ZOVIRAX"),
                ordre(lignes));
    }

    @Test
    public void aEmplacementEgalLOrdreEstCeluiDesDesignations() {
        List<StockReserveLigneDTO> lignes = new ArrayList<>(
                Arrays.asList(ligne("T3", "ZYRTEC"), ligne("T3", "ADVIL"), ligne("T3", "MOPRAL")));

        assertEquals(Arrays.asList("T3/ADVIL", "T3/MOPRAL", "T3/ZYRTEC"), ordre(lignes));
    }

    /**
     * Les articles sans emplacement passent EN DERNIER : leur libelle vide les placerait en tete, la ou l'on commence a
     * compter, et le releve demarrerait par les articles qu'on ne sait pas ou trouver.
     */
    @Test
    public void lesArticlesSansEmplacementPassentEnDernier() {
        List<StockReserveLigneDTO> lignes = new ArrayList<>(Arrays.asList(ligne("", "SANS RAYON"),
                ligne("T3", "AVEC RAYON"), ligne(null, "RAYON NULL"), ligne("   ", "RAYON ESPACES")));

        List<String> resultat = ordre(lignes);
        assertEquals("T3/AVEC RAYON", resultat.get(0), resultat.toString());
        assertEquals(3, resultat.size() - 1, resultat.toString());
    }

    /** « T3 » et « t3 » sont le meme rayon : les separer en ferait deux, et le releve passerait deux fois. */
    @Test
    public void laCasseEtLesEspacesDeBordNeCreentPasDeuxRayons() {
        List<StockReserveLigneDTO> lignes = new ArrayList<>(
                Arrays.asList(ligne("t3", "B"), ligne(" T3 ", "A"), ligne("T3", "C")));

        assertEquals(Arrays.asList(" T3 /A", "t3/B", "T3/C"), ordre(lignes));
    }

    @Test
    public void unTriSurUneListeVideOuNulleNeCassePas() {
        List<StockReserveLigneDTO> vide = new ArrayList<>();
        StockReserveEditionService.trierParEmplacement(vide);
        StockReserveEditionService.trierParEmplacement(null);

        assertEquals(0, vide.size());
    }

    /** Le tri ne perd ni ne duplique aucune ligne : une edition de stock doit porter exactement ce qu'on lui donne. */
    @Test
    public void aucuneLigneNEstPerdueNiDupliquee() {
        List<StockReserveLigneDTO> lignes = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            lignes.add(ligne("RAYON" + (i % 7), "ARTICLE" + i));
        }

        StockReserveEditionService.trierParEmplacement(lignes);

        assertEquals(50, lignes.size());
        assertEquals(50, lignes.stream().map(StockReserveLigneDTO::getLibelle).distinct().count());
    }
}
