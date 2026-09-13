package commonTasks.dto;

import java.io.Serializable;

/** Une vente de la garde, au grain du ticket (H2) : client, type de vente, montant et part restant au client. */
public class GardeVenteDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private final String venteId;
    private final String clientId;
    private final String typeVenteId;
    private final long montant;
    private final long partClient;

    public GardeVenteDTO(String venteId, String clientId, String typeVenteId, long montant, long partClient) {
        this.venteId = venteId == null ? "" : venteId;
        this.clientId = clientId == null ? "" : clientId;
        this.typeVenteId = typeVenteId == null ? "" : typeVenteId;
        this.montant = montant;
        this.partClient = partClient;
    }

    public String getVenteId() {
        return venteId;
    }

    public String getClientId() {
        return clientId;
    }

    public String getTypeVenteId() {
        return typeVenteId;
    }

    public long getMontant() {
        return montant;
    }

    public long getPartClient() {
        return partClient;
    }

    /** Le client rattache, ou la vente elle-meme quand elle est anonyme. */
    public String getCleClient() {
        return clientId.isEmpty() ? "vente:" + venteId : "client:" + clientId;
    }

    /** Vente au comptant : type de vente 1. Tout autre type porte une part prise en charge, donc a credit. */
    public boolean estAuComptant() {
        return "1".equals(typeVenteId);
    }

    /** La part prise en charge par un tiers : ce que le client n'a pas paye au comptoir. */
    public long getPartPriseEnCharge() {
        if (estAuComptant()) {
            return 0L;
        }
        return Math.max(0L, montant - partClient);
    }
}
