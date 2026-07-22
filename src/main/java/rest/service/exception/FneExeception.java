
package rest.service.exception;

import javax.ejb.ApplicationException;

/**
 * Marquee @ApplicationException pour traverser la frontiere EJB sans etre enveloppee dans une EJBException : la
 * ressource REST peut ainsi afficher le message fonctionnel a l'utilisateur.
 *
 * @author koben
 */
@ApplicationException(rollback = true)
public class FneExeception extends RuntimeException {

    public FneExeception(String message) {
        super(message);
    }

}
