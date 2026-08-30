package util;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.SQLException;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Troncature de donnee : l'evenement du Centre de Support doit nommer la COLONNE en cause.
 *
 * Sans elle, l'officine ne lisait qu'un « erreur technique non repertoriee » et le diagnostic demandait un aller-retour
 * avec l'editeur - c'est ce qui s'est passe sur la vente differee refusee par la colonne lg_COMPTE_CLIENT_ID.
 */
public class ErreurExplicationTroncatureTest {

    /** Reproduit le message tel que MySQL le remonte, sans dependre du pilote. */
    private static class MysqlDataTruncation extends SQLException {
        private static final long serialVersionUID = 1L;

        MysqlDataTruncation(String message) {
            super(message);
        }
    }

    @Test
    @DisplayName("la colonne en cause est nommee dans l'explication")
    public void colonneNommee() {
        String explication = ErreurExplication.expliquer(
                new MysqlDataTruncation("Data truncation: Data too long for column 'lg_COMPTE_CLIENT_ID' at row 1"));
        assertTrue(explication.contains("lg_COMPTE_CLIENT_ID"), explication);
        assertTrue(explication.contains("plus longue"), explication);
        assertFalse(explication.contains("non répertoriée"), explication);
    }

    @Test
    @DisplayName("message « Data truncated » egalement reconnu")
    public void donneeTronquee() {
        String explication = ErreurExplication
                .expliquer(new SQLException("Data truncated for column 'str_REF_BON' at row 1"));
        assertTrue(explication.contains("str_REF_BON"), explication);
    }

    @Test
    @DisplayName("sans nom de colonne, l'explication reste comprehensible")
    public void sansNomDeColonne() {
        String explication = ErreurExplication.expliquer(new MysqlDataTruncation("Data truncation"));
        assertTrue(explication.contains("concernée"), explication);
        assertFalse(explication.contains("non répertoriée"), explication);
    }

    @Test
    @DisplayName("extraction du nom de colonne entre apostrophes")
    public void extractionNomColonne() {
        assertTrue("lg_COMPTE_CLIENT_ID"
                .equals(ErreurExplication.colonneCitee("Data too long for column 'lg_COMPTE_CLIENT_ID' at row 1")));
        assertTrue("".equals(ErreurExplication.colonneCitee("Data truncation")));
        assertTrue("".equals(ErreurExplication.colonneCitee(null)));
    }
}
