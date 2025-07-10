/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.Objects;
import org.json.JSONPropertyName;
import util.DateConverter;

/**
 *
 * @author DICI
 */
public class TableauBaordPhDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private boolean vente;
    private String dateOperation;
    private Integer montantTTC = 0;
    private Integer montantNet = 0;
    private Integer montantRemise = 0;
    private Integer montantEsp = 0;
    private Integer montantCredit = 0;
    private Integer nbreVente = 0;
    private Integer montantAchatOne = 0;
    private Integer montantAchatTwo = 0;
    private Integer montantAchatThree = 0;
    private Integer montantAchatFour = 0;
    private Integer montantAchatFive = 0;
    private Integer montantAchat = 0;
    private Integer montantAchatNet = 0;
    private Integer montantAvoir = 0;
    private double ratioVA = 0.0;
    private double rationAV = 0.0;
    private LocalDate mvtDate;
    private Integer mvtDateInt;
    private YearMonth yearMonth;
    private int totalModeReglement;

    public Integer getMvtDateInt() {
        return mvtDateInt;
    }

    public void setMvtDateInt(Integer mvtDateInt) {
        this.mvtDateInt = mvtDateInt;
    }

    public String getDateOperation() {
        try {
            if (dateOperation == null) {
                this.dateOperation = mvtDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            }

        } catch (Exception e) {
        }
        return dateOperation;
    }

    public YearMonth getYearMonth() {
        if (mvtDate != null) {
            yearMonth = YearMonth.from(mvtDate);
        }
        return yearMonth;
    }

    public void setYearMonth(YearMonth yearMonth) {
        this.yearMonth = yearMonth;
    }

    public void setDateOperation(String dateOperation) {
        this.dateOperation = dateOperation;
    }

    @JSONPropertyName("AVOIR")
    public Integer getMontantAvoir() {
        return montantAvoir;
    }

    public void setMontantAvoir(Integer montantAvoir) {
        this.montantAvoir = montantAvoir;
    }

    public LocalDate getMvtDate() {
        return mvtDate;
    }

    public boolean isVente() {
        return vente;
    }

    public void setVente(boolean vente) {
        this.vente = vente;
    }

    public void setMvtDate(LocalDate mvtDate) {

        this.mvtDate = mvtDate;
    }

    @JSONPropertyName("RATIOVA")
    public double getRatioVA() {
        return ratioVA;
    }

    public void setRatioVA(double ratioVA) {
        this.ratioVA = ratioVA;
    }

    @JSONPropertyName("RATIOACHV")
    public double getRationAV() {
        return rationAV;
    }

    public void setRationAV(double rationAV) {
        this.rationAV = rationAV;
    }

    @JSONPropertyName("Achat net")
    public Integer getMontantAchat() {
        return montantAchat;
    }

    public void setMontantAchat(Integer montantAchat) {
        this.montantAchat = montantAchat;
    }

    public Integer getMontantAchatNet() {
        return montantAchatNet;
    }

    public void setMontantAchatNet(Integer montantAchatNet) {
        this.montantAchatNet = montantAchatNet;
    }

    public Integer getMontantTTC() {
        return montantTTC;
    }

    public void setMontantTTC(Integer montantTTC) {
        this.montantTTC = montantTTC;
    }

    @JSONPropertyName("Ca net")
    public Integer getMontantNet() {
        return montantNet;
    }

    public void setMontantNet(Integer montantNet) {
        this.montantNet = montantNet;
    }

    @JSONPropertyName("Remise")
    public Integer getMontantRemise() {
        return montantRemise;
    }

    public void setMontantRemise(Integer montantRemise) {
        this.montantRemise = montantRemise;
    }

    @JSONPropertyName("ComptantOld")
    public Integer getMontantEsp() {
        return montantEsp;
    }

    public void setMontantEsp(Integer montantEsp) {
        this.montantEsp = montantEsp;
    }

    @JSONPropertyName("Nbre Clients")
    public Integer getNbreVente() {
        return nbreVente;
    }

    public void setNbreVente(Integer nbreVente) {
        this.nbreVente = nbreVente;
    }

    @JSONPropertyName("LABOREX")
    public Integer getMontantAchatOne() {
        return montantAchatOne;
    }

    public void setMontantAchatOne(Integer montantAchatOne) {
        this.montantAchatOne = montantAchatOne;
    }

    @JSONPropertyName("DPCI")
    public Integer getMontantAchatTwo() {
        return montantAchatTwo;
    }

    public void setMontantAchatTwo(Integer montantAchatTwo) {
        this.montantAchatTwo = montantAchatTwo;
    }

    @JSONPropertyName("COPHARMED")
    public Integer getMontantAchatThree() {
        return montantAchatThree;
    }

    public void setMontantAchatThree(Integer montantAchatThree) {
        this.montantAchatThree = montantAchatThree;
    }

    @JSONPropertyName("TEDIS PHARMA")
    public Integer getMontantAchatFour() {
        return montantAchatFour;
    }

    public void setMontantAchatFour(Integer montantAchatFour) {
        this.montantAchatFour = montantAchatFour;
    }

    @JSONPropertyName("AUTRES")
    public Integer getMontantAchatFive() {
        return montantAchatFive;
    }

    public void setMontantAchatFive(Integer montantAchatFive) {
        this.montantAchatFive = montantAchatFive;
    }

    @Override
    public String toString() {
        return "TableauBaordPhDTO{" + "dateOperation=" + dateOperation + ", mvtDate=" + mvtDate + '}';
    }

    @Override
    public int hashCode() {
        int hash = 3;
        hash = 13 * hash + Objects.hashCode(this.mvtDate);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final TableauBaordPhDTO other = (TableauBaordPhDTO) obj;
        return Objects.equals(this.mvtDate, other.mvtDate);
    }

    @JSONPropertyName("Credit")
    public Integer getMontantCredit() {
        return montantCredit;
    }

    @JSONPropertyName("Comptant")
    public int getTotalModeReglement() {
        return totalModeReglement;
    }

    public void setTotalModeReglement(int totalModeReglement) {
        this.totalModeReglement = totalModeReglement;
    }

    public void setMontantCredit(Integer montantCredit) {
        this.montantCredit = montantCredit;
    }

    public TableauBaordPhDTO() {

    }

    public TableauBaordPhDTO(long montantTTC, long montantRemise, Date dateOp, long nbreVente, long customPart,
            String typeVente) {
        this.montantRemise = (int) montantRemise;
        this.montantTTC = (int) montantTTC;
        this.nbreVente = (int) nbreVente;
        this.mvtDate = DateConverter.convertDateToLocalDate(dateOp);
        this.montantNet = (int) (montantTTC - montantRemise);
        if (typeVente.contains(DateConverter.VENTE_ASSURANCE)) {
            this.montantCredit = (int) (montantTTC - customPart);
        }
        this.vente = true;
    }

    public TableauBaordPhDTO(long montantEsp, Date dateOp) {
        this.montantEsp = (int) montantEsp;
        this.mvtDate = DateConverter.convertDateToLocalDate(dateOp);
    }

    public TableauBaordPhDTO(Date dateOp, long montantEsp) {
        this.montantEsp -= (int) montantEsp;
        this.mvtDate = DateConverter.convertDateToLocalDate(dateOp);
        this.vente = true;
    }

    public TableauBaordPhDTO(Date dateOp, long montantTTC, long montantRemise, long montantEsp, long montantCredit,
            long montantDiff) {
        this.montantRemise -= (int) montantRemise;
        this.montantTTC -= (int) montantTTC;
        this.montantCredit -= (int) (montantCredit + montantDiff);
        this.montantEsp = -(int) montantEsp;
        this.mvtDate = DateConverter.convertDateToLocalDate(dateOp);
        this.montantNet -= (int) (montantTTC - montantRemise);
        this.vente = false;
    }

}
