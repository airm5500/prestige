package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;

import rest.service.dto.BonsDTO;

/**
 * Liste des bons : ordre des lignes remis a l'etat.
 *
 * Un groupe JasperReports ouvre une nouvelle section des que la valeur de groupe change d'une ligne a la suivante. Une
 * liste mal triee ne provoque donc pas un desordre discret : elle fait reapparaitre le meme organisme — ou le meme
 * groupe — plusieurs fois dans le document, chacun avec son propre total partiel. Le tri est ce qui garantit qu'un
 * organisme n'a qu'un seul bloc et qu'un total.
 */
class OrdreEditionBonsTest {

    private static BonsDTO bon(String groupe, String tp, String date, String heure) {
        BonsDTO b = BonsDTO.builder().build();
        b.setGroupeLibelle(groupe);
        b.setTiersPayantLibelle(tp);
        b.setDtUPDATED(date);
        b.setHeure(heure);
        return b;
    }

    private static List<String> trie(List<BonsDTO> bons, boolean parGroupe) {
        List<BonsDTO> copie = new ArrayList<>(bons);
        copie.sort(ListDesBonServiceImpl.ordreEdition(parGroupe));
        return copie.stream().map(b -> b.getTiersPayantLibelle() + "/" + b.getDtUPDATED() + " " + b.getHeure())
                .collect(Collectors.toList());
    }

    @Test
    void lesOrganismesSontRegroupesEtClassesParOrdreAlphabetique() {
        List<BonsDTO> bons = Arrays.asList(bon(null, "MUGEFCI", "02/01/2026", "09:00"),
                bon(null, "CNAM", "03/01/2026", "10:00"), bon(null, "MUGEFCI", "01/01/2026", "08:00"));
        assertEquals(Arrays.asList("CNAM/03/01/2026 10:00", "MUGEFCI/01/01/2026 08:00", "MUGEFCI/02/01/2026 09:00"),
                trie(bons, false));
    }

    @Test
    void lAccentNeRejettePasUnOrganismeEnFinDeListe() {
        List<BonsDTO> bons = Arrays.asList(bon(null, "ZURICH", "01/01/2026", "08:00"),
                bon(null, "ÉTOILE", "01/01/2026", "08:00"), bon(null, "ASCOMA", "01/01/2026", "08:00"));
        assertEquals(Arrays.asList("ASCOMA", "ÉTOILE", "ZURICH"),
                trie(bons, false).stream().map(s -> s.split("/")[0]).collect(Collectors.toList()));
    }

    /** Sans regroupement demande, le libelle de groupe ne doit pas peser sur l'ordre. */
    @Test
    void sansRegroupementLeGroupeNIntervientPas() {
        List<BonsDTO> bons = Arrays.asList(bon("ZZZ", "ASCOMA", "01/01/2026", "08:00"),
                bon("AAA", "MUGEFCI", "01/01/2026", "08:00"));
        assertEquals(Arrays.asList("ASCOMA", "MUGEFCI"),
                trie(bons, false).stream().map(s -> s.split("/")[0]).collect(Collectors.toList()));
    }

    /** Avec regroupement, le groupe passe devant : ses organismes doivent se suivre sans interruption. */
    @Test
    void avecRegroupementLeGroupePasseDevantLOrganisme() {
        List<BonsDTO> bons = Arrays.asList(bon("ZZZ", "ASCOMA", "01/01/2026", "08:00"),
                bon("AAA", "MUGEFCI", "01/01/2026", "08:00"), bon("ZZZ", "BELIFE", "01/01/2026", "08:00"));
        assertEquals(Arrays.asList("MUGEFCI", "ASCOMA", "BELIFE"),
                trie(bons, true).stream().map(s -> s.split("/")[0]).collect(Collectors.toList()));
    }

    /** Un tiers payant sans groupe ne doit pas faire echouer le tri. */
    @Test
    void unLibelleAbsentNeCassePasLeTri() {
        List<BonsDTO> bons = Arrays.asList(bon(null, null, null, null), bon("AAA", "MUGEFCI", "01/01/2026", "08:00"));
        assertEquals(2, trie(bons, true).size());
    }

    @Test
    void lesBonsDUnMemeOrganismeSontClassesParDatePuisHeure() {
        List<BonsDTO> bons = Arrays.asList(bon(null, "CNAM", "01/01/2026", "18:00"),
                bon(null, "CNAM", "01/01/2026", "08:00"), bon(null, "CNAM", "01/01/2026", "12:00"));
        assertEquals(Arrays.asList("CNAM/01/01/2026 08:00", "CNAM/01/01/2026 12:00", "CNAM/01/01/2026 18:00"),
                trie(bons, false));
    }
}
