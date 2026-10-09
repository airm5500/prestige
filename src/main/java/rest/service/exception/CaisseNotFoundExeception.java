
package rest.service.exception;

/**
 *
 * @author koben
 *
 *         Exception applicative : levee par un EJB, elle arrive telle quelle a l'appelant (sinon le conteneur
 *         l'enveloppe dans une EJBException et « aucune caisse ouverte » devient une erreur 500 au Centre de support).
 *         La transaction est annulee comme avant.
 */
@javax.ejb.ApplicationException(rollback = true)
public class CaisseNotFoundExeception extends RuntimeException {

    public CaisseNotFoundExeception(String message) {
        super(message);
    }

}
