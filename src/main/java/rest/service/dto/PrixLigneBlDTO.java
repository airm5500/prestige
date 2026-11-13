package rest.service.dto;

/**
 * Plan du 12/11 : prix d'une ligne de bon de livraison saisis dans « Modifier Article » (detail d'un BL). Un prix
 * absent (null) est refuse ; la zone geographique est facultative.
 */
public class PrixLigneBlDTO {

    private Integer prixVente;
    private Integer prixTips;
    private Integer prixAchatFacture;
    private Integer prixAchatTarif;
    private String zoneId;

    public Integer getPrixVente() {
        return prixVente;
    }

    public void setPrixVente(Integer prixVente) {
        this.prixVente = prixVente;
    }

    public Integer getPrixTips() {
        return prixTips;
    }

    public void setPrixTips(Integer prixTips) {
        this.prixTips = prixTips;
    }

    public Integer getPrixAchatFacture() {
        return prixAchatFacture;
    }

    public void setPrixAchatFacture(Integer prixAchatFacture) {
        this.prixAchatFacture = prixAchatFacture;
    }

    public Integer getPrixAchatTarif() {
        return prixAchatTarif;
    }

    public void setPrixAchatTarif(Integer prixAchatTarif) {
        this.prixAchatTarif = prixAchatTarif;
    }

    public String getZoneId() {
        return zoneId;
    }

    public void setZoneId(String zoneId) {
        this.zoneId = zoneId;
    }
}
