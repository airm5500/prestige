/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TAyantDroit;
import dal.TClient;
import dal.TFacture;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TTiersPayant;
import java.io.Serializable;
import java.text.SimpleDateFormat;

/**
 *
 * @author koben
 */
public class ErpTiersPayantDTO implements Serializable {
    private static final long serialVersionUID = 1L;
    private String mvtDate, tiersPayantId, tiersPayantLibelle, numFacturation, clientId, clientName, ayantDroitId,
            ayantDroitName;
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

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientName() {
        return clientName;
    }

    public void setClientName(String clientName) {
        this.clientName = clientName;
    }

    public String getAyantDroitId() {
        return ayantDroitId;
    }

    public void setAyantDroitId(String ayantDroitId) {
        this.ayantDroitId = ayantDroitId;
    }

    public String getAyantDroitName() {
        return ayantDroitName;
    }

    public void setAyantDroitName(String ayantDroitName) {
        this.ayantDroitName = ayantDroitName;
    }

    public long getMontant() {
        return montant;
    }

    public void setMontant(long montant) {
        this.montant = montant;
    }

    public ErpTiersPayantDTO(TPreenregistrementCompteClientTiersPayent p) {
        TPreenregistrement tp = p.getLgPREENREGISTREMENTID();
        TClient client = tp.getClient();
        TAyantDroit ayantDroit = tp.getAyantDroit();
        TTiersPayant payant = p.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID();
        this.mvtDate = dateFormat.format(tp.getDtUPDATED());
        if (payant != null) {
            this.tiersPayantId = payant.getLgTIERSPAYANTID();
            this.tiersPayantLibelle = payant.getStrFULLNAME();
        }
        if (client != null) {
            this.clientId = client.getLgCLIENTID();
            this.clientName = client.getStrFIRSTNAME().concat(" ").concat(client.getStrLASTNAME());
        }
        if (ayantDroit != null) {
            this.ayantDroitId = ayantDroit.getLgAYANTSDROITSID();
            this.ayantDroitName = ayantDroit.getStrFIRSTNAME().concat(" ").concat(ayantDroit.getStrLASTNAME());
        }
        this.montant = p.getIntPRICE();
        this.numFacturation = "0";
    }

    public String getNumFacturation() {
        return numFacturation;
    }

    public void setNumFacturation(String numFacturation) {
        this.numFacturation = numFacturation;
    }

    public ErpTiersPayantDTO(TPreenregistrementCompteClientTiersPayent p, TFacture facture) {
        TPreenregistrement tp = p.getLgPREENREGISTREMENTID();
        TClient client = tp.getClient();
        TAyantDroit ayantDroit = tp.getAyantDroit();
        TTiersPayant payant = p.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID();
        this.mvtDate = dateFormat.format(tp.getDtUPDATED());
        if (payant != null) {
            this.tiersPayantId = payant.getLgTIERSPAYANTID();
            this.tiersPayantLibelle = payant.getStrFULLNAME();
        }
        if (client != null) {
            this.clientId = client.getLgCLIENTID();
            this.clientName = client.getStrFIRSTNAME().concat(" ").concat(client.getStrLASTNAME());
        }
        if (ayantDroit != null) {
            this.ayantDroitId = ayantDroit.getLgAYANTSDROITSID();
            this.ayantDroitName = ayantDroit.getStrFIRSTNAME().concat(" ").concat(ayantDroit.getStrLASTNAME());
        }
        this.montant = p.getIntPRICE();
        this.numFacturation = facture.getStrCODEFACTURE();
    }

    public ErpTiersPayantDTO() {
    }

}
