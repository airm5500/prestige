package rest.service.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * Filtres de l'écran « Point détaillé entrée/sortie » (API v1/stock-movements). Les mêmes filtres servent à la liste,
 * aux exports et aux créations d'inventaire/suggestion ; selectedProductIds n'est utilisé que par les créations quand
 * l'utilisateur agit sur une sélection au lieu de tout le résultat filtré.
 */
public class StockMovementFilterDTO {

    private String transactionType;
    private String searchValue;
    private String dateDebut;
    private String dateFin;
    private String grossisteId;
    private String familleArticleId;
    private String zoneGeoId;
    private List<String> selectedProductIds = new ArrayList<>();

    public String getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(String transactionType) {
        this.transactionType = transactionType;
    }

    public String getSearchValue() {
        return searchValue;
    }

    public void setSearchValue(String searchValue) {
        this.searchValue = searchValue;
    }

    public String getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(String dateDebut) {
        this.dateDebut = dateDebut;
    }

    public String getDateFin() {
        return dateFin;
    }

    public void setDateFin(String dateFin) {
        this.dateFin = dateFin;
    }

    public String getGrossisteId() {
        return grossisteId;
    }

    public void setGrossisteId(String grossisteId) {
        this.grossisteId = grossisteId;
    }

    public String getFamilleArticleId() {
        return familleArticleId;
    }

    public void setFamilleArticleId(String familleArticleId) {
        this.familleArticleId = familleArticleId;
    }

    public String getZoneGeoId() {
        return zoneGeoId;
    }

    public void setZoneGeoId(String zoneGeoId) {
        this.zoneGeoId = zoneGeoId;
    }

    public List<String> getSelectedProductIds() {
        return selectedProductIds;
    }

    public void setSelectedProductIds(List<String> selectedProductIds) {
        this.selectedProductIds = selectedProductIds != null ? selectedProductIds : new ArrayList<>();
    }
}
