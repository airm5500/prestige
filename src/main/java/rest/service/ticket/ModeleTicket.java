package rest.service.ticket;

/**
 * Tickets de caisse parametrables dans le menu « Modeles de ticket » (demande du 02/11) : chacun a son modele (ancien ou
 * nouveau), ses options et sa disposition, par largeur de papier.
 */
public enum ModeleTicket {
    PREVENTE("Prévente", "Ventes"),
    VENTE("Vente comptant", "Ventes"),
    VENTE_ASSURANCE("Vente assurance", "Ventes"),
    VENTE_CARNET("Vente carnet", "Ventes"),
    VENTE_DEPOT("Vente dépôt", "Ventes"),
    REGLEMENT_DIFFERE("Règlement différé", "Règlements"),
    REGLEMENT_FACTURE("Règlement facture", "Règlements"),
    REGLEMENT_CARNET_DEPOT("Règlement carnet / dépôt", "Règlements"),
    MOUVEMENT_CAISSE("Mouvement de caisse", "Caisse"),
    TICKET_Z("Ticket Z", "Caisse");

    private final String libelle;
    private final String groupe;

    ModeleTicket(String libelle, String groupe) {
        this.libelle = libelle;
        this.groupe = groupe;
    }

    public String libelle() {
        return libelle;
    }

    public String groupe() {
        return groupe;
    }

    /** Le nouveau modele existe-t-il deja pour ce ticket ? Sinon seul l'ancien est propose. */
    public boolean nouveauDisponible() {
        return this != TICKET_Z;
    }

    public boolean estVente() {
        return this == VENTE || this == VENTE_ASSURANCE || this == VENTE_CARNET || this == VENTE_DEPOT;
    }

    public static ModeleTicket depuis(String code) {
        if (code == null) {
            return null;
        }
        try {
            return valueOf(code.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
