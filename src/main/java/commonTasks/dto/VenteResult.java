/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/**
 *
 * @author Kobena
 */
public class VenteResult implements Serializable {

    private String id = UUID.randomUUID().toString();
    private Integer columnOne = 0;
    private Integer columnTwo = 0;
    private Integer columnthree = 0;
    private Integer columnFour = 0;
    private Integer columnFive = 0;
    @JsonIgnore(value = true)
    private LocalDate dateOperation;
    private String dateOperationToString;
    private Integer montantCredit = 0;
    private Integer remise = 0;
    private Integer totalVente = 0;
    private String typeVente;
    private Integer montantDiff = 0;
    private Long nbreClient = 0l;
    private Integer montantComptant = 0;
    private Double rationVenteAchat = 0.0;
    private Double rationAchatVente = 0.0;
    @JsonIgnore(value = true)
    private String groupeLibelle;
    private Integer avoir = 0;
    private Integer montantAchat = 0;
    @JsonIgnore(value = true)
    private String type;
    private Integer netVente = 0;

    public Integer getNetVente() {
        return netVente;
    }

    public void setNetVente(Integer netVente) {
        this.netVente = netVente;
    }

    public LocalDate getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(LocalDate dateOperation) {
        this.dateOperation = dateOperation;
    }

    public String getDateOperationToString() {
        return dateOperationToString;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setDateOperationToString(String dateOperationToString) {
        this.dateOperationToString = dateOperationToString;
    }

    public Integer getMontantCredit() {
        return montantCredit;
    }

    public void setMontantCredit(Integer montantCredit) {
        this.montantCredit = montantCredit;
    }

    public Integer getMontantComptant() {
        return montantComptant;
    }

    public Integer getRemise() {
        return remise;
    }

    public void setRemise(Integer remise) {
        this.remise = remise;
    }

    public Integer getTotalVente() {
        return totalVente;
    }

    public void setTotalVente(Integer totalVente) {
        this.totalVente = totalVente;
    }

    public String getTypeVente() {
        return typeVente;
    }

    public void setTypeVente(String typeVente) {
        this.typeVente = typeVente;
    }

    public Integer getMontantDiff() {
        return montantDiff;
    }

    public void setMontantDiff(Integer montantDiff) {
        this.montantDiff = montantDiff;
    }

    public Long getNbreClient() {
        return nbreClient;
    }

    public void setNbreClient(Long nbreClient) {
        this.nbreClient = nbreClient;
    }

    public VenteResult(String dateOperationToString, String typeVente, Integer montantComptant, Integer remise,
            Long nbreClient) {
        this.dateOperationToString = dateOperationToString;
        this.nbreClient = nbreClient;
        this.remise = remise;
        this.montantComptant = montantComptant;
        try {
            this.dateOperation = LocalDate.parse(dateOperationToString);
        } catch (Exception e) {
        }

        this.typeVente = typeVente;
        this.type = "VNO";
    }

    public void setMontantComptant(Integer montantComptant) {
        this.montantComptant = montantComptant;
    }

    public VenteResult(String dateOperationToString, String typeVente, Integer totalVente, Integer montantComptant,
            Integer montantCredit, Integer remise, Long nbreClient) {
        this.dateOperationToString = dateOperationToString;
        this.nbreClient = nbreClient;
        this.remise = remise;
        this.montantCredit = montantCredit;
        this.totalVente = totalVente;
        this.montantComptant = montantComptant;
        try {
            this.dateOperation = LocalDate.parse(dateOperationToString);
        } catch (Exception e) {
        }

        this.typeVente = typeVente;
        this.type = "VO";
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 61 * hash + Objects.hashCode(this.id);
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
        final VenteResult other = (VenteResult) obj;
        if (!Objects.equals(this.id, other.id)) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "VenteResult{" + "dateOperation=" + dateOperation + ", dateOperationToString=" + dateOperationToString
                + ", montantCredit=" + montantCredit + ", remise=" + remise + ", totalVente=" + totalVente
                + ", typeVente=" + typeVente + ", montantDiff=" + montantDiff + ", nbreClient=" + nbreClient
                + ", montantComptant=" + montantComptant + '}';
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Double getRationVenteAchat() {
        return rationVenteAchat;
    }

    public void setRationVenteAchat(Double rationVenteAchat) {
        this.rationVenteAchat = rationVenteAchat;
    }

    public Double getRationAchatVente() {
        return rationAchatVente;
    }

    public void setRationAchatVente(Double rationAchatVente) {
        this.rationAchatVente = rationAchatVente;
    }

    public Integer getAvoir() {
        return avoir;
    }

    public void setAvoir(Integer avoir) {
        this.avoir = avoir;
    }

    public VenteResult() {
    }

    public VenteResult(String dateOperationToString, String groupeLibelle, Integer montantAchat) {
        this.dateOperationToString = dateOperationToString;
        this.groupeLibelle = groupeLibelle;
        this.montantAchat = montantAchat;
        this.type = "ORDER";
        try {
            this.dateOperation = LocalDate.parse(dateOperationToString);
        } catch (Exception e) {
        }
    }

    public String getGroupeLibelle() {
        return groupeLibelle;
    }

    public void setGroupeLibelle(String groupeLibelle) {
        this.groupeLibelle = groupeLibelle;
    }

    public Integer getMontantAchat() {
        return montantAchat;
    }

    public void setMontantAchat(Integer montantAchat) {
        this.montantAchat = montantAchat;
    }

    public Integer getColumnOne() {
        return columnOne;
    }

    public void setColumnOne(Integer columnOne) {
        this.columnOne = columnOne;
    }

    public Integer getColumnTwo() {
        return columnTwo;
    }

    public void setColumnTwo(Integer columnTwo) {
        this.columnTwo = columnTwo;
    }

    public Integer getColumnthree() {
        return columnthree;
    }

    public void setColumnthree(Integer columnthree) {
        this.columnthree = columnthree;
    }

    public Integer getColumnFour() {
        return columnFour;
    }

    public void setColumnFour(Integer columnFour) {
        this.columnFour = columnFour;
    }

    public Integer getColumnFive() {
        return columnFive;
    }

    public void setColumnFive(Integer columnFive) {
        this.columnFive = columnFive;
    }

}
