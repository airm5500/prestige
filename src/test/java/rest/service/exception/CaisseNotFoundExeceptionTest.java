package rest.service.exception;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import javax.ejb.ApplicationException;
import org.junit.jupiter.api.Test;

/** « Aucune caisse ouverte » doit arriver telle quelle a la ressource (pas d'EJBException ni d'erreur 500). */
class CaisseNotFoundExeceptionTest {

    @Test
    void exceptionApplicativeAvecAnnulation() {
        ApplicationException a = CaisseNotFoundExeception.class.getAnnotation(ApplicationException.class);
        assertNotNull(a);
        assertTrue(a.rollback());
    }
}
