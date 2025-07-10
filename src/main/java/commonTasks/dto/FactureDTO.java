/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TFacture;
import dal.TTiersPayant;
import java.io.Serializable;
import java.text.SimpleDateFormat;

/**
 *
 * @author kkoffi
 */
public class FactureDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String lgFACTUREID, strLIBELLETYPETIERSPAYANT, strCODECOMPTABLE, dtDATEFACTURE, dtDEBUTFACTURE,
            dtFINFACTURE, strCUSTOMER, strFULLNAME, periode;
    private Integer nbDossier, dblMONTANTBrut, dblMONTANTFOFETAIRE, dblMONTANTREMISE, dblMONTANTCMDE;
    private String strCODEFACTURE;
    private final SimpleDateFormat df = new SimpleDateFormat("dd/MM/yyyy");

    public String getLgFACTUREID() {
        return lgFACTUREID;
    }

    public String getStrCODEFACTURE() {
        return strCODEFACTURE;
    }

    public void setStrCODEFACTURE(String strCODEFACTURE) {
        this.strCODEFACTURE = strCODEFACTURE;
    }

    public void setLgFACTUREID(String lgFACTUREID) {
        this.lgFACTUREID = lgFACTUREID;
    }

    public String getPeriode() {
        return periode;
    }

    public void setPeriode(String periode) {
        this.periode = periode;
    }

    public String getStrLIBELLETYPETIERSPAYANT() {
        return strLIBELLETYPETIERSPAYANT;
    }

    public void setStrLIBELLETYPETIERSPAYANT(String strLIBELLETYPETIERSPAYANT) {
        this.strLIBELLETYPETIERSPAYANT = strLIBELLETYPETIERSPAYANT;
    }

    public String getStrCODECOMPTABLE() {
        return strCODECOMPTABLE;
    }

    public void setStrCODECOMPTABLE(String strCODECOMPTABLE) {
        this.strCODECOMPTABLE = strCODECOMPTABLE;
    }

    public String getDtDATEFACTURE() {
        return dtDATEFACTURE;
    }

    public void setDtDATEFACTURE(String dtDATEFACTURE) {
        this.dtDATEFACTURE = dtDATEFACTURE;
    }

    public String getDtDEBUTFACTURE() {
        return dtDEBUTFACTURE;
    }

    public void setDtDEBUTFACTURE(String dtDEBUTFACTURE) {
        this.dtDEBUTFACTURE = dtDEBUTFACTURE;
    }

    public String getDtFINFACTURE() {
        return dtFINFACTURE;
    }

    public void setDtFINFACTURE(String dtFINFACTURE) {
        this.dtFINFACTURE = dtFINFACTURE;
    }

    public String getStrCUSTOMER() {
        return strCUSTOMER;
    }

    public void setStrCUSTOMER(String strCUSTOMER) {
        this.strCUSTOMER = strCUSTOMER;
    }

    public String getStrFULLNAME() {
        return strFULLNAME;
    }

    public void setStrFULLNAME(String strFULLNAME) {
        this.strFULLNAME = strFULLNAME;
    }

    public Integer getNbDossier() {
        return nbDossier;
    }

    public void setNbDossier(Integer nbDossier) {
        this.nbDossier = nbDossier;
    }

    public Integer getDblMONTANTBrut() {
        return dblMONTANTBrut;
    }

    public void setDblMONTANTBrut(Integer dblMONTANTBrut) {
        this.dblMONTANTBrut = dblMONTANTBrut;
    }

    public Integer getDblMONTANTFOFETAIRE() {
        return dblMONTANTFOFETAIRE;
    }

    public void setDblMONTANTFOFETAIRE(Integer dblMONTANTFOFETAIRE) {
        this.dblMONTANTFOFETAIRE = dblMONTANTFOFETAIRE;
    }

    public Integer getDblMONTANTREMISE() {
        return dblMONTANTREMISE;
    }

    public void setDblMONTANTREMISE(Integer dblMONTANTREMISE) {
        this.dblMONTANTREMISE = dblMONTANTREMISE;
    }

    public Integer getDblMONTANTCMDE() {
        return dblMONTANTCMDE;
    }

    public void setDblMONTANTCMDE(Integer dblMONTANTCMDE) {
        this.dblMONTANTCMDE = dblMONTANTCMDE;
    }

    private Integer montantVente = 0;
    private Integer montantTvaVente = 0;
    private Integer montantRemiseVente = 0;
    private String strCODEORGANISME;

    public void setMontantRemiseVente(Integer montantRemiseVente) {
        this.montantRemiseVente = montantRemiseVente;
    }

    public void setMontantTvaVente(Integer montantTvaVente) {
        this.montantTvaVente = montantTvaVente;
    }

    public void setMontantVente(Integer montantVente) {
        this.montantVente = montantVente;
    }

    public Integer getMontantRemiseVente() {
        return montantRemiseVente;
    }

    public Integer getMontantVente() {
        return montantVente;
    }

    public Integer getMontantTvaVente() {
        return montantTvaVente;
    }

    public String getStrCODEORGANISME() {
        return strCODEORGANISME;
    }

    public void setStrCODEORGANISME(String strCODEORGANISME) {
        this.strCODEORGANISME = strCODEORGANISME;
    }

    public FactureDTO(TFacture facture) {
        this.lgFACTUREID = facture.getLgFACTUREID();
        TTiersPayant payant = facture.getTiersPayant();
        this.strLIBELLETYPETIERSPAYANT = facture.getLgTYPEFACTUREID().getStrLIBELLE();
        this.strCODECOMPTABLE = facture.getStrCODECOMPTABLE();
        this.dtDATEFACTURE = df.format(facture.getDtDATEFACTURE());
        this.dtDEBUTFACTURE = df.format(facture.getDtDEBUTFACTURE());
        this.dtFINFACTURE = df.format(facture.getDtFINFACTURE());
        this.strCUSTOMER = facture.getStrCUSTOMER();
        this.strFULLNAME = payant.getStrFULLNAME();
        this.strCODEORGANISME = payant.getStrCODEORGANISME();
        this.nbDossier = facture.getIntNBDOSSIER();
        this.dblMONTANTBrut = facture.getDblMONTANTBrut().intValue();
        this.dblMONTANTFOFETAIRE = facture.getDblMONTANTFOFETAIRE().intValue();
        this.dblMONTANTREMISE = facture.getDblMONTANTREMISE().intValue();
        this.dblMONTANTCMDE = facture.getDblMONTANTCMDE().intValue();
        this.periode = "DU " + df.format(facture.getDtDEBUTFACTURE()) + " AU " + df.format(facture.getDtFINFACTURE());
        this.montantTvaVente = facture.getMontantTvaVente();
        this.montantVente = facture.getMontantVente();
        this.montantRemiseVente = facture.getMontantRemiseVente();
        this.strCODEFACTURE = facture.getStrCODEFACTURE();
        this.strTELEPHONE = payant.getStrTELEPHONE();
        this.strADRESSE = payant.getStrADRESSE();
        this.strMOBILE = payant.getStrMOBILE();
        this.strCODEOFFICINE = payant.getStrCODEOFFICINE();
        this.strREGISTRECOMMERCE = payant.getStrREGISTRECOMMERCE();
        this.strCOMPTECONTRIBUABLE = payant.getStrCOMPTECONTRIBUABLE();
    }

    private String strTELEPHONE;
    private String strADRESSE;
    private String strMOBILE, strCODEOFFICINE, strREGISTRECOMMERCE, strCOMPTECONTRIBUABLE;

    public String getStrTELEPHONE() {
        return strTELEPHONE;
    }

    public void setStrTELEPHONE(String strTELEPHONE) {
        this.strTELEPHONE = strTELEPHONE;
    }

    public String getStrADRESSE() {
        return strADRESSE;
    }

    public void setStrADRESSE(String strADRESSE) {
        this.strADRESSE = strADRESSE;
    }

    public String getStrMOBILE() {
        return strMOBILE;
    }

    public void setStrMOBILE(String strMOBILE) {
        this.strMOBILE = strMOBILE;
    }

    public String getStrCODEOFFICINE() {
        return strCODEOFFICINE;
    }

    public void setStrCODEOFFICINE(String strCODEOFFICINE) {
        this.strCODEOFFICINE = strCODEOFFICINE;
    }

    public String getStrREGISTRECOMMERCE() {
        return strREGISTRECOMMERCE;
    }

    public void setStrREGISTRECOMMERCE(String strREGISTRECOMMERCE) {
        this.strREGISTRECOMMERCE = strREGISTRECOMMERCE;
    }

    public String getStrCOMPTECONTRIBUABLE() {
        return strCOMPTECONTRIBUABLE;
    }

    public void setStrCOMPTECONTRIBUABLE(String strCOMPTECONTRIBUABLE) {
        this.strCOMPTECONTRIBUABLE = strCOMPTECONTRIBUABLE;
    }

}
