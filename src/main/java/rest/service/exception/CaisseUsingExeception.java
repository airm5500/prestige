
package rest.service.exception;

import javax.ejb.ApplicationException;

/**
 * Marquee @ApplicationException pour traverser la frontiere EJB sans etre enveloppee dans une EJBException : la
 * ressource REST peut ainsi afficher le message fonctionnel a l'utilisateur (caisse deja ouverte, fond deja attribue)
 * au lieu d'une erreur technique.
 *
 * @author koben
 */
@ApplicationException(rollback = true)
public class CaisseUsingExeception extends RuntimeException {

    public CaisseUsingExeception(String message) {
        super(message);
    }

}
