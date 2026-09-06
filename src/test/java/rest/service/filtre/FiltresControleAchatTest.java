package rest.service.filtre;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import rest.service.dto.BonLivraisonDetail;
import rest.service.dto.EtatControlBon;

/** Filtres de l'etat de controle des achats (point 17). */
class FiltresControleAchatTest {

    private BonLivraisonDetail ligne(Integer compte, Integer recue) {
        return BonLivraisonDetail.builder().quantiteControle(compte).intQTERECUE(recue).build();
    }

    private EtatControlBon bon(String ref, String statut, BonLivraisonDetail... details) {
        return EtatControlBon.builder().strREFLIVRAISON(ref).checked(statut).bonLivraisonDetails(Arrays.asList(details))
                .build();
    }

    private List<EtatControlBon> jeu() {
        return Arrays.asList(bon("BL-TERMINE-CONFORME", "TERMINE", ligne(10, 10)),
                bon("BL-TERMINE-ECART", "TERMINE", ligne(8, 10)),
                bon("BL-ENCOURS", "EN_COURS", ligne(5, 10), ligne(null, 4)),
                bon("BL-A-FAIRE", "NON_TRAITE", ligne(null, 10)));
    }

    private List<String> refs(List<EtatControlBon> bons) {
        return bons.stream().map(EtatControlBon::getStrREFLIVRAISON).collect(Collectors.toList());
    }

    @Test
    void sansCritereToutEstConserve() {
        assertTrue(new FiltresControleAchat("", "").inactif());
        assertEquals(4, new FiltresControleAchat("TOUS", "TOUS").appliquer(jeu()).size());
    }

    @Test
    void leFiltreDeStatutSepareControlesEtNonControles() {
        assertEquals(Arrays.asList("BL-TERMINE-CONFORME", "BL-TERMINE-ECART"),
                refs(new FiltresControleAchat("CONTROLE", "").appliquer(jeu())));
        assertEquals(Arrays.asList("BL-ENCOURS", "BL-A-FAIRE"),
                refs(new FiltresControleAchat("NON_CONTROLE", "").appliquer(jeu())));
    }

    @Test
    void leFiltreDEcartRetientLesBonsDontUnComptageDiffere() {
        assertEquals(Arrays.asList("BL-TERMINE-ECART", "BL-ENCOURS"),
                refs(new FiltresControleAchat("", "AVEC_ECART").appliquer(jeu())));
    }

    @Test
    void uneLigneJamaisCompteeNEstPasUnEcart() {
        assertFalse(FiltresControleAchat.presenteUnEcart(bon("X", "NON_TRAITE", ligne(null, 10))));
        assertFalse(FiltresControleAchat.presenteUnEcart(bon("X", "NON_TRAITE", ligne(0, 10))));
    }

    @Test
    void lesCriteresSeCombinent() {
        assertEquals(Arrays.asList("BL-TERMINE-ECART"),
                refs(new FiltresControleAchat("CONTROLE", "AVEC_ECART").appliquer(jeu())));
        assertEquals(Arrays.asList("BL-TERMINE-CONFORME"),
                refs(new FiltresControleAchat("CONTROLE", "SANS_ECART").appliquer(jeu())));
    }

    @Test
    void uneValeurInconnueNeFiltrePas() {
        assertTrue(new FiltresControleAchat("PEUT-ETRE", "BOF").inactif());
    }

    @Test
    void unBonSansLigneNePresentePasDEcart() {
        assertFalse(FiltresControleAchat.presenteUnEcart(bon("VIDE", "NON_TRAITE")));
        assertFalse(FiltresControleAchat.presenteUnEcart(null));
    }

    @Test
    void lesCriteresRetenusSontRappelesEnClair() {
        assertEquals(Arrays.asList("Contrôle : contrôlés", "Écarts : avec écarts"),
                new FiltresControleAchat("CONTROLE", "AVEC_ECART").libelles());
        assertTrue(new FiltresControleAchat("", "").libelles().isEmpty());
    }

    @Test
    void uneListeAbsenteNeFaitPasEchouerLeFiltrage() {
        assertTrue(new FiltresControleAchat("CONTROLE", "").appliquer(null).isEmpty());
    }
}
