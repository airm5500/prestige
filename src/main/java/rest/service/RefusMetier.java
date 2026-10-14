package rest.service;

import javax.ejb.ApplicationException;

/**
 * Refus d'une operation pour une raison metier (produit absent du BL, stock insuffisant...) : le message est destine a
 * l'utilisateur, la transaction est annulee (rien d'enregistre a moitie). Exception d'application : le conteneur la
 * transmet telle quelle a l'appelant, sans l'envelopper ni la journaliser comme une panne.
 */
@ApplicationException(rollback = true)
public class RefusMetier extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public RefusMetier(String message) {
        super(message);
    }
}
