/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.Rupture;
import dal.TGrossiste;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.LongAdder;
import util.DateConverter;

/**
 *
 * @author koben
 */
public class RuptureDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String id, details = " ", libelleGrossiste, reference, grossisteId;
    private Integer prixAchat = 0;
    private Integer prixVente = 0;
    private Integer qty = 0;
    private Integer nbreProduit = 0;
    private LocalDate dtCreated;
    private String commandeDate;

    public String getGrossisteId() {
        return grossisteId;
    }

    public void setGrossisteId(String grossisteId) {
        this.grossisteId = grossisteId;
    }

    public String getId() {
        return id;
    }

    public Integer getNbreProduit() {
        return nbreProduit;
    }

    public void setNbreProduit(Integer nbreProduit) {
        this.nbreProduit = nbreProduit;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public String getLibelleGrossiste() {
        return libelleGrossiste;
    }

    public void setLibelleGrossiste(String libelleGrossiste) {
        this.libelleGrossiste = libelleGrossiste;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public Integer getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(Integer prixAchat) {
        this.prixAchat = prixAchat;
    }

    public Integer getPrixVente() {
        return prixVente;
    }

    public void setPrixVente(Integer prixVente) {
        this.prixVente = prixVente;
    }

    public Integer getQty() {
        return qty;
    }

    public void setQty(Integer qty) {
        this.qty = qty;
    }

    @Override
    public int hashCode() {
        int hash = 5;
        hash = 73 * hash + Objects.hashCode(this.id);
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
        final RuptureDTO other = (RuptureDTO) obj;
        return Objects.equals(this.id, other.id);
    }

    public LocalDate getDtCreated() {
        return dtCreated;
    }

    public void setDtCreated(LocalDate dtCreated) {
        this.dtCreated = dtCreated;
    }

    public String getCommandeDate() {
        return commandeDate;
    }

    public void setCommandeDate(String commandeDate) {
        this.commandeDate = commandeDate;
    }

    public RuptureDTO(Rupture r, List<RuptureDetailDTO> tpds) {
        this.id = r.getId();
        TGrossiste g = r.getGrossiste();
        this.libelleGrossiste = g.getStrLIBELLE();
        this.grossisteId = g.getLgGROSSISTEID();
        this.reference = r.getReference();
        this.dtCreated = r.getDtCreated();
        this.commandeDate = r.getDtCreated().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        LongAdder prixAchat0 = new LongAdder();
        LongAdder prixVente0 = new LongAdder();
        LongAdder qty0 = new LongAdder();
        LongAdder nbreProduit0 = new LongAdder();
        tpds.forEach((tpd) -> {
            nbreProduit0.increment();
            prixAchat0.add(tpd.getPrixAchat());
            qty0.add(tpd.getQty());
            prixVente0.add(tpd.getPrixVente());
            this.details = "<b><span style='display:inline-block;width: 7%;'>" + tpd.getCodeCip()
                    + "</span><span style='display:inline-block;width: 25%;'>" + tpd.getLibelle()
                    + "</span><span style='display:inline-block;width: 10%;'>(" + tpd.getQty()
                    + ")</span><span style='display:inline-block;width: 15%;'>"
                    + DateConverter.amountFormat(tpd.getPrixAchat(), '.') + " F CFA " + "</span></b><br> "
                    + this.details;
        });
        this.qty = qty0.intValue();
        this.prixAchat = prixAchat0.intValue();
        this.prixVente = prixVente0.intValue();
        this.nbreProduit = nbreProduit0.intValue();
    }

}
