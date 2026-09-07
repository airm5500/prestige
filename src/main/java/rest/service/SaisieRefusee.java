package rest.service;

import javax.ejb.ApplicationException;

/**
 * Une saisie que le service refuse, avec un message deja redige pour l'utilisateur.
 *
 * <p>
 * L'annotation {@code @ApplicationException} est ce qui compte ici : sans elle, le conteneur traite l'exception comme
 * une panne technique et la remplace par une {@code EJBException}. Le message explicite -- « la fin doit etre
 * posterieure au debut », « une garde couvre deja cette periode » -- serait alors perdu, et l'utilisateur ne verrait
 * qu'un « l'enregistrement a echoue » qui ne lui dit pas quoi corriger.
 * </p>
 */
@ApplicationException(rollback = true)
public class SaisieRefusee extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public SaisieRefusee(String message) {
        super(message);
    }
}
