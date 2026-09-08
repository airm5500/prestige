package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;

import commonTasks.dto.ReportFactureDTO;

/**
 * Releve des factures : toutes les assurances, puis tous les carnets.
 *
 * Le defaut signale est une alternance — assurance, carnet, assurance, carnet — au lieu de terminer un type avant de
 * passer au suivant. Un etat JasperReports ouvre une nouvelle section des que la valeur groupee change d'une ligne a la
 * suivante : si les types s'alternent dans la liste remise a l'edition, ils s'alternent dans le PDF, quel que soit le
 * modele installe. C'est donc ici, sur l'ordre de la liste, que le defaut se corrige.
 *
 * Ces tests partent volontairement d'une liste DEJA alternee, c'est-a-dire du pire cas.
 */
class OrdreReleveFacturesTest {

    private static ReportFactureDTO ligne(String type, String organisme) {
        ReportFactureDTO r = new ReportFactureDTO();
        r.setTypeTiersPayantLibelle(type);
        r.setTiersPayantLibelle(organisme);
        return r;
    }

    private static List<String> trie(List<ReportFactureDTO> lignes) {
        List<ReportFactureDTO> copie = new ArrayList<>(lignes);
        copie.sort(FacturationServiceImpl.ordreReleve());
        return copie.stream().map(r -> r.getTypeTiersPayantLibelle() + "/" + r.getTiersPayantLibelle())
                .collect(Collectors.toList());
    }

    /** Le cas signale : une liste alternee doit ressortir groupee. */
    @Test
    void uneListeAlterneeRessortGroupee() {
        List<ReportFactureDTO> lignes = Arrays.asList(ligne("Assurance", "SUNU"), ligne("Carnet", "MOKOIN"),
                ligne("Assurance", "MUGEFCI"), ligne("Carnet", "YORO"));
        assertEquals(Arrays.asList("Assurance/MUGEFCI", "Assurance/SUNU", "Carnet/MOKOIN", "Carnet/YORO"),
                trie(lignes));
    }

    /** Un type n'apparait qu'une fois : c'est ce qui garantit une seule section par type dans le PDF. */
    @Test
    void chaqueTypeNApparaitQueSurUnePlage() {
        List<ReportFactureDTO> lignes = Arrays.asList(ligne("Carnet", "B"), ligne("Assurance", "Z"),
                ligne("Carnet", "A"), ligne("Assurance", "M"), ligne("Carnet", "C"));
        List<String> types = trie(lignes).stream().map(s -> s.split("/")[0]).collect(Collectors.toList());
        assertEquals(Arrays.asList("Assurance", "Assurance", "Carnet", "Carnet", "Carnet"), types);
    }

    /** Deux ecritures du meme type ne doivent pas ouvrir deux sections. */
    @Test
    void deuxEcrituresDuMemeTypeSeRejoignent() {
        List<ReportFactureDTO> lignes = Arrays.asList(ligne("ASSURANCE", "SUNU"), ligne("Carnet", "MOKOIN"),
                ligne("Assurance", "MUGEFCI"), ligne(" assurance ", "ASCOMA"));
        List<String> types = trie(lignes).stream().map(s -> s.split("/")[0].trim().toUpperCase())
                .collect(Collectors.toList());
        assertEquals(Arrays.asList("ASSURANCE", "ASSURANCE", "ASSURANCE", "CARNET"), types);
    }

    @Test
    void lesOrganismesRestentAlphabetiquesDansLeurType() {
        List<ReportFactureDTO> lignes = Arrays.asList(ligne("Assurance", "ZURICH"), ligne("Assurance", "ÉTOILE"),
                ligne("Assurance", "ASCOMA"));
        assertEquals(Arrays.asList("Assurance/ASCOMA", "Assurance/ÉTOILE", "Assurance/ZURICH"), trie(lignes));
    }

    @Test
    void unLibelleAbsentNeCassePasLeTri() {
        List<ReportFactureDTO> lignes = Arrays.asList(ligne(null, null), ligne("Assurance", "SUNU"),
                ligne("Carnet", null));
        assertEquals(3, trie(lignes).size());
    }
}
