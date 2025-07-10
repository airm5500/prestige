/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TDossierReglement;
import dal.TFacture;
import dal.TReglement;
import dal.TTiersPayant;
import java.io.Serializable;
import java.text.SimpleDateFormat;

/**
 *
 * @author koben
 */
public class ErpReglementDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private String mvtDate, tiersPayantId, tiersPayantLibelle, numFacturation, modeReglement;
    String dateSaisie;
    private long montant;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyyMMdd");

    public String getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(String mvtDate) {
        this.mvtDate = mvtDate;
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

    public String getModeReglement() {
        return modeReglement;
    }

    public void setModeReglement(String modeReglement) {
        this.modeReglement = modeReglement;
    }

    public String getDateSaisie() {
        return dateSaisie;
    }

    public void setDateSaisie(String dateSaisie) {
        this.dateSaisie = dateSaisie;
    }

    public long getMontant() {
        return montant;
    }

    public void setMontant(long montant) {
        this.montant = montant;
    }

    public ErpReglementDTO(TDossierReglement d, TReglement r, TTiersPayant p) {
        this.mvtDate = dateFormat.format(d.getDtCREATED());
        TFacture facture = d.getLgFACTUREID();
        this.tiersPayantId = p.getLgTIERSPAYANTID();
        this.tiersPayantLibelle = p.getStrFULLNAME();
        if (facture != null) {
            this.numFacturation = facture.getStrCODEFACTURE();
        }
        try {
            this.modeReglement = r.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID().getStrNAME();
        } catch (Exception e) {
        }
        this.dateSaisie = dateFormat.format(d.getDtREGLEMENT());
        this.montant = d.getDblAMOUNT().longValue();
    }

    public ErpReglementDTO() {
    }

}
