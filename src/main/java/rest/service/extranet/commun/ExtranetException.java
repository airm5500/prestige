package rest.service.extranet.commun;

/** Echec d'un appel ou d'une lecture d'extranet. Le message est montrable : jamais de cookie ni de corps. */
public class ExtranetException extends Exception {

    private static final long serialVersionUID = 1L;

    public enum Nature {
        /** Pas de session saisie, ou session deja expiree. */
        SESSION_ABSENTE,
        /** Redirection ou page de connexion recue a la place des donnees. */
        SESSION_EXPIREE,
        /** Statut HTTP d'erreur, delai depasse, reseau. */
        TRANSPORT,
        /** Reponse recue mais pas du type ou du schema attendu. */
        REPONSE_INATTENDUE,
        /** Pagination incoherente : page vide, repetee, total qui change, limite atteinte. */
        PAGINATION
    }

    private final Nature nature;

    public ExtranetException(Nature nature, String message) {
        super(message);
        this.nature = nature;
    }

    public ExtranetException(Nature nature, String message, Throwable cause) {
        super(message, cause);
        this.nature = nature;
    }

    public Nature nature() {
        return nature;
    }
}
