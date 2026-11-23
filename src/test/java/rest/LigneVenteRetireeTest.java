package rest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.SQLException;
import java.util.Random;
import javax.ejb.EJBException;
import javax.persistence.OptimisticLockException;
import javax.persistence.PersistenceException;
import javax.transaction.RollbackException;
import org.hibernate.StaleObjectStateException;
import org.hibernate.StaleStateException;
import org.junit.jupiter.api.Test;

/**
 * Journal d'appaul du 21/11 (N1) : la modification d'une ligne retiree au meme clic echouait en 500 (EJBException ->
 * RollbackException -> StaleObjectStateException). Le conflit doit etre reconnu a n'importe quelle profondeur, et
 * seulement lui : toute autre erreur reste une erreur.
 */
class LigneVenteRetireeTest {

    /** La chaine du journal : EJBException a la validation de la transaction, cause Hibernate en dessous. */
    @Test
    void chaineDuJournalReconnue() {
        RollbackException rb = new RollbackException("Transaction marked for rollback.");
        rb.initCause(
                new PersistenceException(new StaleObjectStateException("dal.TPreenregistrementDetail", "aac60082")));
        assertTrue(LigneVenteRetiree.estConflit(new EJBException(rb)));
    }

    @Test
    void variantesDuConflitReconnues() {
        assertTrue(LigneVenteRetiree.estConflit(new StaleStateException("Batch update returned unexpected row count")));
        assertTrue(LigneVenteRetiree.estConflit(new OptimisticLockException()));
        RuntimeException supprimee = new RuntimeException("commit");
        supprimee.addSuppressed(new StaleStateException("x"));
        assertTrue(LigneVenteRetiree.estConflit(supprimee));
    }

    @Test
    void autresErreursNonReconnues() {
        assertFalse(LigneVenteRetiree.estConflit(null));
        assertFalse(LigneVenteRetiree.estConflit(
                new EJBException(new PersistenceException(new SQLException("Communications link failure")))));
        assertFalse(LigneVenteRetiree.estConflit(new IllegalStateException("Stale")));
        assertFalse(LigneVenteRetiree.estConflit(new NullPointerException()));
    }

    /** Une chaine qui boucle sur elle-meme ne doit ni planter ni tourner sans fin. */
    @Test
    void chaineEnBoucle() {
        RuntimeException a = new RuntimeException("a");
        RuntimeException b = new RuntimeException("b", a);
        a.initCause(b);
        assertFalse(LigneVenteRetiree.estConflit(a));
    }

    /** 20 000 chaines tirees au hasard (graine fixe) : reconnu si et seulement si un conflit figure dans la chaine. */
    @Test
    void chainesAuHasard() {
        Random r = new Random(20261121L);
        int reconnues = 0;
        for (int i = 0; i < 20_000; i++) {
            int profondeur = 1 + r.nextInt(12);
            int place = r.nextInt(3) == 0 ? -1 : r.nextInt(profondeur);
            Throwable t = place == profondeur - 1 ? conflit(r) : autre(r, null);
            for (int k = profondeur - 2; k >= 0; k--) {
                t = k == place ? enveloppeConflit(r, t) : autre(r, t);
            }
            boolean attendu = place >= 0;
            assertEquals(attendu, LigneVenteRetiree.estConflit(t),
                    "cas " + i + " profondeur " + profondeur + " place " + place);
            if (attendu) {
                reconnues++;
            }
        }
        assertTrue(reconnues > 10_000 && reconnues < 16_000, "repartition : " + reconnues);
    }

    private static Throwable conflit(Random r) {
        switch (r.nextInt(3)) {
        case 0:
            return new StaleObjectStateException("dal.TPreenregistrementDetail", "id" + r.nextInt(1000));
        case 1:
            return new StaleStateException("row count");
        default:
            return new OptimisticLockException("version");
        }
    }

    /** Un conflit qui enveloppe la suite de la chaine (OptimisticLockException accepte une cause). */
    private static Throwable enveloppeConflit(Random r, Throwable cause) {
        return new OptimisticLockException("version", cause);
    }

    private static Throwable autre(Random r, Throwable cause) {
        switch (r.nextInt(4)) {
        case 0:
            return new EJBException(cause instanceof Exception ? (Exception) cause : new RuntimeException(cause));
        case 1:
            return new PersistenceException(cause);
        case 2:
            RollbackException rb = new RollbackException("rollback");
            rb.initCause(cause);
            return rb;
        default:
            return new RuntimeException("autre", cause);
        }
    }
}
