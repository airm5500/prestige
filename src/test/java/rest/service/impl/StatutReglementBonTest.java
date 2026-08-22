package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * L'etat de reglement ecrit sur un bon de livraison.
 *
 * <p>
 * La colonne STATUS est relue telle quelle par les listes et les etats : une valeur inattendue y resterait sans que
 * personne ne la voie. Ces essais fixent les trois seules valeurs qui peuvent y entrer, et le fait que tout le reste
 * retombe sur « non regle » plutot que d'etre recopie.
 */
class StatutReglementBonTest {

    @Test
    @DisplayName("Les trois etats attendus passent tels quels")
    void lesTroisEtats() {
        assertEquals("NON REGLE", EtatControlBonServiceImpl.statutDeReglement("NON REGLE"));
        assertEquals("REGLE EN PARTIE", EtatControlBonServiceImpl.statutDeReglement("REGLE EN PARTIE"));
        assertEquals("REGLE", EtatControlBonServiceImpl.statutDeReglement("REGLE"));
    }

    @Test
    @DisplayName("« REGLE TOTALEMENT », le libelle de l'ecran, devient « REGLE », le libelle de la table")
    void libelleDeLEcran() {
        assertEquals("REGLE", EtatControlBonServiceImpl.statutDeReglement("REGLE TOTALEMENT"));
    }

    @Test
    @DisplayName("La casse et les espaces autour ne changent rien")
    void casseEtEspaces() {
        assertEquals("REGLE EN PARTIE", EtatControlBonServiceImpl.statutDeReglement("  regle en partie  "));
        assertEquals("REGLE", EtatControlBonServiceImpl.statutDeReglement("Regle"));
    }

    @Test
    @DisplayName("Le vide et l'inconnu retombent sur « non regle », et ne sont jamais recopies")
    void videEtInconnu() {
        assertEquals("NON REGLE", EtatControlBonServiceImpl.statutDeReglement(null));
        assertEquals("NON REGLE", EtatControlBonServiceImpl.statutDeReglement(""));
        assertEquals("NON REGLE", EtatControlBonServiceImpl.statutDeReglement("PAYE"));
        assertEquals("NON REGLE", EtatControlBonServiceImpl.statutDeReglement("'; DROP TABLE t_bon_livraison; --"));
    }
}
