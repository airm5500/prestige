package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;

import javax.ejb.EJBException;
import javax.persistence.PersistenceException;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Message affiche quand le releve des factures de groupe n'aboutit pas.
 *
 * L'officine recevait une page de pile Java. Elle doit lire une phrase qu'elle peut transmettre au support ; le detail
 * technique, lui, part au journal du serveur.
 */
class MessageEchecTest {

    /** Reproduit l'empilement reel : EJBException -> PersistenceException -> cause du moteur. */
    private static Throwable empile(String message) {
        return new EJBException(new PersistenceException(message, new IllegalStateException(message)));
    }

    @Test
    @DisplayName("Deux colonnes de meme nom : la cause est nommee, pas le nom de la classe Java")
    void aliasEnDouble() {
        assertEquals("deux colonnes de la requête portent le même nom, la base ne sait pas les distinguer",
                MessageEchec.pour(empile(
                        "Encountered a duplicated sql alias [str_CODE_FACTURE] during auto-discovery of a native-sql query")));
    }

    @Test
    @DisplayName("Colonne absente de la base")
    void colonneInconnue() {
        assertEquals("une colonne ou une table attendue est absente de la base de données",
                MessageEchec.pour(empile("Unknown column 'str_TRUC' in 'field list'")));
    }

    @Test
    @DisplayName("Valeur trop longue pour la base")
    void valeurTropLongue() {
        assertEquals("une valeur dépasse la taille prévue en base",
                MessageEchec.pour(empile("Data too long for column 'CODEORGANISME' at row 1")));
    }

    @Test
    @DisplayName("Base injoignable")
    void baseInjoignable() {
        assertEquals("la base de données n'a pas répondu", MessageEchec.pour(empile("Communications link failure")));
    }

    @Test
    @DisplayName("Cause inconnue : on le dit, sans inventer")
    void causeInconnue() {
        assertEquals("une erreur technique est survenue", MessageEchec.pour(empile("quelque chose d'inattendu")));
    }

    @Test
    @DisplayName("Une exception sans message ne fait pas planter la traduction")
    void sansMessage() {
        assertEquals("une erreur technique est survenue", MessageEchec.pour(new RuntimeException()));
    }
}
