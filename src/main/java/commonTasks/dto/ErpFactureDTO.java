/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
import java.text.SimpleDateFormat;

/**
 *
 * @author koben
 */
public class ErpFactureDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private String dateFacture, tiersPayantId, tiersPayantLibelle, numFacturation;
    private long montant;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyyMMdd");

    public String getDateFacture() {
        return dateFacture;
    }

    public void setDateFacture(String dateFacture) {
        this.dateFacture = dateFacture;
    }

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
    }

    public String getTiersPayantLibelle() {
        return tiersPayantLibelle;
    }

    public void setTiersPayantLibelle(String tiersPayantLibelle) {
        this.tiersPayantLibelle = tiersPayantLibelle;
    }

    public String getNumFacturation() {
        return numFacturation;
    }

    public void setNumFacturation(String numFacturation) {
        this.numFacturation = numFacturation;
    }

    public long getMontant() {
        return montant;
    }

    public void setMontant(long montant) {
        this.montant = montant;
    }

    public ErpFactureDTO() {
    }

    public ErpFactureDTO(dal.TFacture f, dal.TTiersPayant p) {
        try {
            this.dateFacture = dateFormat.format(f.getDtDATEFACTURE());
        } catch (Exception e) {
        }

        this.tiersPayantId = p.getLgTIERSPAYANTID();
        this.tiersPayantLibelle = p.getStrFULLNAME();
        this.numFacturation = f.getStrCODEFACTURE();
        this.montant = f.getDblMONTANTCMDE().longValue();
    }

}
