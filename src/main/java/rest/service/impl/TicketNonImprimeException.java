package rest.service.impl;

import javax.ejb.ApplicationException;

/**
 * Ticket non imprime (rapport d'exploitation du 13/11, point 1) : le mouvement est enregistre, seul son ticket manque.
 * Exception d'application, SANS annulation de la transaction : elle remonte telle quelle a la ressource, qui la rend a
 * l'ecran (« Ticket non imprime », a reimprimer depuis la liste des mouvements).
 */
@ApplicationException(rollback = false)
public class TicketNonImprimeException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /**
     * Vrai quand le serveur n'a pas d'imprimante a tickets (aucune, ou seulement une imprimante virtuelle) : c'est
     * normal pour un serveur isole (precision de l'utilisateur du 14/11), l'ecran ne signale rien.
     */
    private final boolean sansImprimante;

    public TicketNonImprimeException(String message) {
        this(message, false);
    }

    public TicketNonImprimeException(String message, boolean sansImprimante) {
        super(message);
        this.sansImprimante = sansImprimante;
    }

    public boolean isSansImprimante() {
        return sansImprimante;
    }
}
