package rest.service.impl.serveur;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.SQLException;
import java.sql.SQLTransactionRollbackException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Random;
import javax.ejb.EJBException;
import javax.persistence.PersistenceException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Exploitation du 14/11, S2 : releve de sante et purge de t_serveur_mesure.
 * <p>
 * COHERENCE sur 2 000 jours tires au hasard (graine fixe), battement toutes les 2 min, decale de 0 a 1 min au hasard
 * (un battement peut glisser) : la purge du poste a lieu exactement une fois par heure (24 par jour), la purge generale
 * exactement une fois par jour, a 3 h ; jamais deux purges du poste dans la meme heure. L'interblocage est reconnu a
 * travers les enveloppes du conteneur (code 1213, etat 40001, message de MariaDB), et seulement lui.
 * </p>
 */
class ReleveSanteCoherenceTest {

    @Test
    @DisplayName("Purges : une par heure pour le poste, une par jour (3 h) pour toute la table")
    void purgesParHeureEtParJour() {
        Random r = new Random(20261115L);
        for (int j = 0; j < 2000; j++) {
            LocalDate jour = LocalDate.of(2026, 1, 1).plusDays(r.nextInt(3650));
            int[] parHeure = new int[24];
            int generales = 0;
            int heureGenerale = -1;
            for (int min = 0; min < 24 * 60; min += 2) {
                int decalage = r.nextInt(60);
                LocalDateTime t = jour.atStartOfDay().plusMinutes(min).plusSeconds(decalage);
                if (ServeurVieService.purgeDuPoste(t)) {
                    parHeure[t.getHour()]++;
                }
                if (ServeurVieService.purgeGenerale(t)) {
                    generales++;
                    heureGenerale = t.getHour();
                }
            }
            for (int h = 0; h < 24; h++) {
                assertEquals(1, parHeure[h], jour + " " + h + " h : purges du poste");
            }
            assertEquals(1, generales, jour + " : purges generales");
            assertEquals(3, heureGenerale, jour + " : heure de la purge generale");
        }
    }

    @Test
    @DisplayName("Interblocage reconnu a travers les enveloppes, et seulement lui")
    void interblocageReconnu() {
        SQLException mariadb = new SQLException("Deadlock found when trying to get lock; try restarting transaction",
                "40001", 1213);
        assertTrue(ServeurVieService.estInterblocage(mariadb));
        assertTrue(ServeurVieService.estInterblocage(new EJBException(
                new PersistenceException("could not execute statement", new RuntimeException("x", mariadb)))));
        assertTrue(ServeurVieService
                .estInterblocage(new PersistenceException(new SQLTransactionRollbackException("r", "40001"))));
        assertTrue(ServeurVieService.estInterblocage(new SQLException("autre", "HY000", 1213)));
        assertFalse(ServeurVieService
                .estInterblocage(new PersistenceException(new SQLException("Duplicate entry", "23000", 1062))));
        assertFalse(ServeurVieService.estInterblocage(new PersistenceException("Communications link failure")));
        assertFalse(ServeurVieService.estInterblocage(new SQLException("Lock wait timeout exceeded", "HY000", 1205)));
        assertFalse(ServeurVieService.estInterblocage(null));
        Exception boucle = new Exception("a");
        Exception b = new Exception("b", boucle);
        boucle.initCause(b);
        assertFalse(ServeurVieService.estInterblocage(boucle));
    }

    @Test
    @DisplayName("Purge du poste limitee a ses lignes ; purge generale sans filtre de poste")
    void requetesDePurge() {
        assertTrue(ServeurVieService.SQL_PURGE_POSTE.contains("hote = ?1"));
        assertTrue(ServeurVieService.SQL_PURGE_POSTE.contains("mesure_at < ?2"));
        assertFalse(ServeurVieService.SQL_PURGE_GENERALE.contains("hote"));
    }
}
