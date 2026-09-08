package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import org.junit.jupiter.api.Test;

/**
 * Releve des factures : cle de regroupement des types de tiers payant.
 *
 * L'etat ouvre une nouvelle section des que la valeur groupee change d'une ligne a la suivante. La cle doit donc rendre
 * la MEME valeur pour toutes les ecritures d'un meme type, sans quoi « Assurance » se referme et se rouvre au lieu de
 * tenir d'un seul tenant — c'est le defaut constate : six sections la ou il n'en fallait que deux.
 *
 * La meme cle sert au tri cote application et au regroupement dans l'etat : si les deux divergeaient, les sections ne
 * seraient plus contigues et le probleme reviendrait.
 */
class CleDeTriLibelleTest {

    @Test
    void laCasseNeSepareParDeuxTypes() {
        assertEquals(FacturationServiceImpl.cleDeTriLibelle("ASSURANCE"),
                FacturationServiceImpl.cleDeTriLibelle("Assurance"));
        assertEquals(FacturationServiceImpl.cleDeTriLibelle("assurance"),
                FacturationServiceImpl.cleDeTriLibelle("Assurance"));
    }

    @Test
    void lesEspacesDeBordNeSeparentPasDeuxTypes() {
        assertEquals(FacturationServiceImpl.cleDeTriLibelle("Assurance"),
                FacturationServiceImpl.cleDeTriLibelle("  Assurance  "));
    }

    @Test
    void lesAccentsNeSeparentPasDeuxTypes() {
        assertEquals(FacturationServiceImpl.cleDeTriLibelle("Prive"), FacturationServiceImpl.cleDeTriLibelle("Privé"));
    }

    /** Deux types reellement differents doivent le rester : la normalisation ne doit pas tout confondre. */
    @Test
    void deuxTypesDifferentsRestentDifferents() {
        assertNotEquals(FacturationServiceImpl.cleDeTriLibelle("Assurance"),
                FacturationServiceImpl.cleDeTriLibelle("Carnet"));
    }

    @Test
    void unLibelleAbsentOuVideNeCassePasLeTri() {
        assertEquals("", FacturationServiceImpl.cleDeTriLibelle(null));
        assertEquals("", FacturationServiceImpl.cleDeTriLibelle(""));
        assertEquals("", FacturationServiceImpl.cleDeTriLibelle("   "));
    }

    /** L'ordre alphabetique attendu : les assurances avant les carnets. */
    @Test
    void lesAssurancesPassentAvantLesCarnets() {
        assertEquals(-1, Integer.signum(FacturationServiceImpl.cleDeTriLibelle("Assurance")
                .compareTo(FacturationServiceImpl.cleDeTriLibelle("Carnet"))));
    }
}
