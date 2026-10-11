package avisclients;

import javax.ejb.ApplicationException;

/**
 * Refus motive (saisie invalide, action impossible) leve par le service des avis. Exception d'application : le
 * conteneur EJB la transmet telle quelle (au lieu de l'envelopper dans une erreur 500) et annule la transaction ; le
 * message est montre a l'utilisateur.
 */
@ApplicationException(rollback = true)
public class AvisRefus extends IllegalArgumentException {

    private static final long serialVersionUID = 1L;

    public AvisRefus(String message) {
        super(message);
    }
}
