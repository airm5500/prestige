/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TAyantDroit;
import dal.TClient;
import dal.TFactureDetail;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import util.DateConverter;

/**
 *
 * @author kkoffi
 */
public class FactureDetailDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
    private LocalDateTime dateOperation;
    private String lgFACTUREDETAILID, lgFACTUREID, ayantDroitId, clientId, clientFirstName, clientLastName,
            clientNumAssurance, ayantDroitFirstName, ayantDroitLastName, ayantDroitNumAssurance;
    private String strREF;
    private Integer dblMONTANT, dblMONTANTPAYE, dblMONTANTRESTANT, dblMONTANTREMISE, montantRemiseVente,
            montantTvaVente, montantVente, dblMONTANTBrut;
    private String dateVente;
    List<VenteDetailsDTO> ventes = new ArrayList<>();

    public List<VenteDetailsDTO> getVentes() {
        return ventes;
    }

    public Integer getDblMONTANTBrut() {
        return dblMONTANTBrut;
    }

    public void setDblMONTANTBrut(Integer dblMONTANTBrut) {
        this.dblMONTANTBrut = dblMONTANTBrut;
    }

    public void setVentes(List<VenteDetailsDTO> ventes) {
        this.ventes = ventes;
    }

    public LocalDateTime getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(LocalDateTime dateOperation) {
        this.dateOperation = dateOperation;
    }

    public String getLgFACTUREDETAILID() {
        return lgFACTUREDETAILID;
    }

    public void setLgFACTUREDETAILID(String lgFACTUREDETAILID) {
        this.lgFACTUREDETAILID = lgFACTUREDETAILID;
    }

    public String getLgFACTUREID() {
        return lgFACTUREID;
    }

    public void setLgFACTUREID(String lgFACTUREID) {
        this.lgFACTUREID = lgFACTUREID;
    }

    public String getAyantDroitId() {
        return ayantDroitId;
    }

    public void setAyantDroitId(String ayantDroitId) {
        this.ayantDroitId = ayantDroitId;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientFirstName() {
        return clientFirstName;
    }

    public void setClientFirstName(String clientFirstName) {
        this.clientFirstName = clientFirstName;
    }

    public String getClientLastName() {
        return clientLastName;
    }

    public void setClientLastName(String clientLastName) {
        this.clientLastName = clientLastName;
    }

    public String getClientNumAssurance() {
        return clientNumAssurance;
    }

    public void setClientNumAssurance(String clientNumAssurance) {
        this.clientNumAssurance = clientNumAssurance;
    }

    public String getAyantDroitFirstName() {
        return ayantDroitFirstName;
    }

    public void setAyantDroitFirstName(String ayantDroitFirstName) {
        this.ayantDroitFirstName = ayantDroitFirstName;
    }

    public String getAyantDroitLastName() {
        return ayantDroitLastName;
    }

    public void setAyantDroitLastName(String ayantDroitLastName) {
        this.ayantDroitLastName = ayantDroitLastName;
    }

    public String getAyantDroitNumAssurance() {
        return ayantDroitNumAssurance;
    }

    public void setAyantDroitNumAssurance(String ayantDroitNumAssurance) {
        this.ayantDroitNumAssurance = ayantDroitNumAssurance;
    }

    public String getStrREF() {
        return strREF;
    }

    public void setStrREF(String strREF) {
        this.strREF = strREF;
    }

    public Integer getDblMONTANT() {
        return dblMONTANT;
    }

    public void setDblMONTANT(Integer dblMONTANT) {
        this.dblMONTANT = dblMONTANT;
    }

    public Integer getDblMONTANTPAYE() {
        return dblMONTANTPAYE;
    }

    public void setDblMONTANTPAYE(Integer dblMONTANTPAYE) {
        this.dblMONTANTPAYE = dblMONTANTPAYE;
    }

    public Integer getDblMONTANTRESTANT() {
        return dblMONTANTRESTANT;
    }

    public void setDblMONTANTRESTANT(Integer dblMONTANTRESTANT) {
        this.dblMONTANTRESTANT = dblMONTANTRESTANT;
    }

    public Integer getDblMONTANTREMISE() {
        return dblMONTANTREMISE;
    }

    public void setDblMONTANTREMISE(Integer dblMONTANTREMISE) {
        this.dblMONTANTREMISE = dblMONTANTREMISE;
    }

    public Integer getMontantRemiseVente() {
        return montantRemiseVente;
    }

    public void setMontantRemiseVente(Integer montantRemiseVente) {
        this.montantRemiseVente = montantRemiseVente;
    }

    public Integer getMontantTvaVente() {
        return montantTvaVente;
    }

    public void setMontantTvaVente(Integer montantTvaVente) {
        this.montantTvaVente = montantTvaVente;
    }

    public Integer getMontantVente() {
        return montantVente;
    }

    public void setMontantVente(Integer montantVente) {
        this.montantVente = montantVente;
    }

    public String getDateVente() {
        return dateVente;
    }

    public void setDateVente(String dateVente) {
        this.dateVente = dateVente;
    }

    private String strREFDESCRIPTION;

    public String getStrREFDESCRIPTION() {
        return strREFDESCRIPTION;
    }

    public void setStrREFDESCRIPTION(String strREFDESCRIPTION) {
        this.strREFDESCRIPTION = strREFDESCRIPTION;
    }

    private String pKey;

    public FactureDetailDTO(TFactureDetail factureDetail) {
        this.dateOperation = DateConverter.convertDateToLocalDateTime(factureDetail.getDateOperation());
        this.lgFACTUREDETAILID = factureDetail.getLgFACTUREDETAILID();
        TAyantDroit ayant = factureDetail.getAyantDroit();
        if (ayant != null) {
            this.ayantDroitId = ayant.getLgAYANTSDROITSID();
            this.ayantDroitFirstName = ayant.getStrFIRSTNAME();
            this.ayantDroitLastName = ayant.getStrLASTNAME();
            this.ayantDroitNumAssurance = ayant.getStrNUMEROSECURITESOCIAL();
        }
        TClient client = factureDetail.getClient();
        if (client != null) {
            this.clientId = client.getLgCLIENTID();
            this.clientFirstName = client.getStrFIRSTNAME();
            this.clientLastName = client.getStrLASTNAME();
            this.clientNumAssurance = client.getStrNUMEROSECURITESOCIAL();
        }
        this.strREFDESCRIPTION = factureDetail.getStrREFDESCRIPTION();

        this.dblMONTANT = factureDetail.getDblMONTANT().intValue();
        this.dblMONTANTPAYE = factureDetail.getDblMONTANTPAYE().intValue();
        this.dblMONTANTRESTANT = factureDetail.getDblMONTANTRESTANT().intValue();
        this.dblMONTANTREMISE = factureDetail.getDblMONTANTREMISE().intValue();
        this.montantRemiseVente = factureDetail.getMontantRemiseVente();
        this.dblMONTANTBrut = factureDetail.getDblMONTANTBrut().intValue();
        this.montantTvaVente = factureDetail.getMontantTvaVente();
        this.montantVente = factureDetail.getMontantVente();
        this.dateVente = dateFormat.format(factureDetail.getDateOperation());
        this.strREF = factureDetail.getStrREF();
        this.pKey = factureDetail.getPKey();
    }

    public String getpKey() {
        return pKey;
    }

    public void setpKey(String pKey) {
        this.pKey = pKey;
    }

}
