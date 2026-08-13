package dal.enumeration;

/**
 * Mode de suivi des accusés de réception (DLR) d'un fournisseur SMS.
 *
 * @author koben
 */
public enum DlrMode {
    /** Rafraîchissement des statuts à la demande via l'API de statut du fournisseur. */
    POLLING,
    /** Le fournisseur notifie Prestige sur une URL de callback publique. */
    CALLBACK
}
