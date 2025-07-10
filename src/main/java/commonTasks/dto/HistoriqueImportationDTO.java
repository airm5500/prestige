/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.HistoriqueImportValue;
import dal.HistoriqueImportation;
import dal.TUser;
import java.io.Serializable;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import util.DateConverter;

/**
 *
 * @author koben
 */
public class HistoriqueImportationDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private String user, id;
    // private List<HistoriqueImportValue> deatils = new ArrayList<>();
    private String createdAt;
    private Integer montantAchat;
    private Integer montantVente;
    private Integer nbreLigne;
    private final String pattern = "dd/MM/yyyy HH:mm";
    private String details = " ";

    public String getUser() {
        return user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public HistoriqueImportationDTO user(String user) {
        this.user = user;
        return this;
    }

    public HistoriqueImportationDTO createdAt(String createdAt) {
        this.createdAt = createdAt;
        return this;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public HistoriqueImportationDTO montantAchat(Integer montantAchat) {
        this.montantAchat = montantAchat;
        return this;
    }

    public Integer getMontantAchat() {
        return montantAchat;
    }

    public void setMontantAchat(Integer montantAchat) {
        this.montantAchat = montantAchat;
    }

    public HistoriqueImportationDTO montantVente(Integer montantVente) {
        this.montantVente = montantVente;
        return this;
    }

    public Integer getMontantVente() {
        return montantVente;
    }

    public void setMontantVente(Integer montantVente) {
        this.montantVente = montantVente;
    }

    public HistoriqueImportationDTO nbreLigne(Integer nbreLigne) {
        this.nbreLigne = nbreLigne;
        return this;
    }

    public Integer getNbreLigne() {
        return nbreLigne;
    }

    public void setNbreLigne(Integer nbreLigne) {
        this.nbreLigne = nbreLigne;
    }

    // public List<HistoriqueImportValue> getDeatils() {
    // if (this.deatils == null) {
    // this.deatils = new ArrayList<>();
    // }
    // return deatils;
    // }
    //
    // public void setDeatils(List<HistoriqueImportValue> deatils) {
    // if (this.deatils == null) {
    // this.deatils = new ArrayList<>();
    // }
    // this.deatils = deatils;
    // }
    //
    // public HistoriqueImportationDTO deatils(List<HistoriqueImportValue> deatils) {
    // this.deatils = deatils;
    // return this;
    // }

    // public HistoriqueImportationDTO addDetail(HistoriqueImportValue details) {
    // if (this.deatils == null) {
    // this.deatils = new ArrayList<>();
    //
    // }
    // getDeatils().add(details);
    // return this;
    // }

    public HistoriqueImportationDTO(HistoriqueImportation hi) {
        TUser u = hi.getUser();
        this.user = u.getStrFIRSTNAME() + " " + u.getStrLASTNAME();
        this.createdAt = hi.getCreatedAt().format(DateTimeFormatter.ofPattern(pattern));
        this.montantAchat = hi.getMontantAchat();
        this.montantVente = hi.getMontantVente();
        this.nbreLigne = hi.getNbreLigne();
        this.id = hi.getId();
        hi.getDeatils().sort(Comparator.comparing(HistoriqueImportValue::getLibelle));
        hi.getDeatils().forEach((tpd) -> {
            this.details = "<span style='display:inline-block;width: 7%; margin-right:10px;'>" + tpd.getCip()
                    + "</span><span style='display:inline-block;width: 20%;'>" + tpd.getLibelle()
                    + "</span><span style='display:inline-block;width: 7%;'>(" + tpd.getQty()
                    + ")</span><span style='display:inline-block;width: 10%;'>"
                    + DateConverter.amountFormat(tpd.getMontantAchat(), '.')
                    + " </span><span style='display:inline-block;width: 10%;'>"
                    + DateConverter.amountFormat(tpd.getMontantVente(), '.') + " </span><br> " + this.details;
        });
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

}
