package rest;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Natures d'operation retenues par le journal de caisse.
 *
 * <p>
 * La reconnaissance se fait sur le libelle et non sur l'identifiant, qui n'est pas garanti d'une officine a l'autre. Le
 * piege est « Reglements differes », dont le libelle contient aussi le mot « reglement » : seul « 1/3 » distingue les
 * reglements tiers payant. Se tromper ici ne fait pas planter l'ecran, il montre simplement les mauvaises lignes - d'ou
 * ce test.
 */
class TypesJournalCaisseTest {

    @Test
    @DisplayName("Les trois natures du journal sont retenues")
    void troisNaturesRetenues() {
        assertTrue(TypesJournalCaisse.estTypeDuJournal("Entrees de caisse"));
        assertTrue(TypesJournalCaisse.estTypeDuJournal("Sorties de caisse"));
        assertTrue(TypesJournalCaisse.estTypeDuJournal("Reglements 1/3 pay."));
    }

    @Test
    @DisplayName("Les accents ne changent rien : c'est le libelle de l'officine qui arrive")
    void accentsIndifferents() {
        assertTrue(TypesJournalCaisse.estTypeDuJournal("Entrées de caisse"));
        assertTrue(TypesJournalCaisse.estTypeDuJournal("ENTRÉES DE CAISSE"));
        assertTrue(TypesJournalCaisse.estTypeDuJournal("sorties de Caisse"));
    }

    @Test
    @DisplayName("Tout le reste est ecarte, y compris les reglements differes")
    void resteEcarte() {
        // Le piege : « Reglements differes » contient « reglement », mais pas « 1/3 ».
        assertFalse(TypesJournalCaisse.estTypeDuJournal("Reglements differes"));
        assertFalse(TypesJournalCaisse.estTypeDuJournal("Règlements différés"));
        assertFalse(TypesJournalCaisse.estTypeDuJournal("Fonds de caisse"));
        assertFalse(TypesJournalCaisse.estTypeDuJournal("Acomptes"));
        assertFalse(TypesJournalCaisse.estTypeDuJournal("Avoirs clients"));
        assertFalse(TypesJournalCaisse.estTypeDuJournal("ventes ordonnancees"));
        assertFalse(TypesJournalCaisse.estTypeDuJournal("ventes N.O."));
        assertFalse(TypesJournalCaisse.estTypeDuJournal("Versement caution"));
    }

    @Test
    @DisplayName("Un libelle absent n'est pas retenu et ne fait pas tomber l'ecran")
    void libelleAbsent() {
        assertFalse(TypesJournalCaisse.estTypeDuJournal(null));
        assertFalse(TypesJournalCaisse.estTypeDuJournal(""));
        assertFalse(TypesJournalCaisse.estTypeDuJournal("   "));
    }

    @Test
    @DisplayName("« Caisse » seul ne suffit pas : il faut une entree ou une sortie")
    void caisseSeuleNeSuffitPas() {
        assertFalse(TypesJournalCaisse.estTypeDuJournal("Caisse"));
        assertFalse(TypesJournalCaisse.estTypeDuJournal("Ouverture de caisse"));
    }
}
