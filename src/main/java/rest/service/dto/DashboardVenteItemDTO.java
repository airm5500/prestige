package rest.service.dto;

import java.math.BigDecimal;

/**
 *
 * @author koben
 */
public class DashboardVenteItemDTO {

    private final String mvtDate;
    private final String typeVente;
    private final String typeReglment;
    private final BigDecimal montantVenteDetail;
    private final BigDecimal montantAchat;
    private final BigDecimal montantTva;
    private final BigDecimal montantUG;

    public DashboardVenteItemDTO(String mvtDate, String typeVente, String typeReglment, BigDecimal montantVenteDetail,
            BigDecimal montantAchat, BigDecimal montantTva, BigDecimal montantUG) {
        this.mvtDate = mvtDate;
        this.typeVente = typeVente;
        this.typeReglment = typeReglment;
        this.montantVenteDetail = montantVenteDetail;
        this.montantAchat = montantAchat;
        this.montantTva = montantTva;
        this.montantUG = montantUG;

    }

    public String getTypeVente() {
        return typeVente;
    }

    public String getMvtDate() {
        return mvtDate;
    }

    public String getTypeReglment() {
        return typeReglment;
    }

    public BigDecimal getMontantVenteDetail() {
        return montantVenteDetail;
    }

    public BigDecimal getMontantAchat() {
        return montantAchat;
    }

    public BigDecimal getMontantTva() {
        return montantTva;
    }

    public BigDecimal getMontantUG() {
        return montantUG;
    }

}
