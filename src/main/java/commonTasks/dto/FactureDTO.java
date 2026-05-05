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
import java.util.Objects;

/**
 *
 * @author kkoffi
 */
public class FactureDTO implements Serializable {

    private final SimpleDateFormat df = new SimpleDateFormat("dd/MM/yyyy");
    private final SimpleDateFormat dfFull = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");
    private static final long serialVersionUID = 1L;
    private String lgFACTUREID;
    private String strLIBELLETYPETIERSPAYANT;
    private String strCODECOMPTABLE;
    private String dtDATEFACTURE;
    private String dtDEBUTFACTURE;
    private String dtFINFACTURE;
    private String strCUSTOMER;
    private String strFULLNAME;
    private String periode;
    private Integer nbDossier;
    private Integer dblMONTANTBrut;
    private Integer dblMONTANTFOFETAIRE;
    private Integer dblMONTANTPAYE;
    private Integer dblMONTANTRESTANT;
    private Integer dblMONTANTREMISE;
    private Integer dblMONTANTCMDE;
    private String strCODEFACTURE;
    private String tiersPayantId;

    private String strTELEPHONE;
    private String strADRESSE;
    private String strMOBILE;
    private String strCODEOFFICINE;
    private String strREGISTRECOMMERCE;
    private String strCOMPTECONTRIBUABLE;
    private Integer montantVente = 0;
    private Integer montantTvaVente = 0;
    private Integer montantRemiseVente = 0;
    private String strCODEORGANISME;
    private String dtCREATED;
    private String dtUPDATED;
    private String heure;

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

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public Integer getDblMONTANTRESTANT() {
        return dblMONTANTRESTANT;
    }

    public void setDblMONTANTRESTANT(Integer dblMONTANTRESTANT) {
        this.dblMONTANTRESTANT = dblMONTANTRESTANT;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
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
        this.strCUSTOMER = payant.getLgTIERSPAYANTID();
        this.strFULLNAME = payant.getStrFULLNAME();
        this.strCODEORGANISME = payant.getStrCODEORGANISME();
        this.nbDossier = facture.getIntNBDOSSIER();
        this.dblMONTANTBrut = facture.getDblMONTANTBrut().intValue();
        this.dblMONTANTFOFETAIRE = facture.getDblMONTANTFOFETAIRE().intValue();
        this.dblMONTANTREMISE = facture.getDblMONTANTREMISE().intValue();
        this.dblMONTANTCMDE = facture.getDblMONTANTCMDE().intValue();
        this.dblMONTANTPAYE = Objects.requireNonNullElse(facture.getDblMONTANTPAYE(), 0.0).intValue();
        this.dblMONTANTRESTANT = Objects.nonNull(facture.getDblMONTANTRESTANT())
                ? facture.getDblMONTANTRESTANT().intValue() : null;
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
        this.tiersPayantId = payant.getLgTIERSPAYANTID();
        this.dtCREATED = dfFull.format(facture.getDtCREATED());
    }

    public String getStrTELEPHONE() {
        return strTELEPHONE;
    }

    public Integer getDblMONTANTPAYE() {
        return dblMONTANTPAYE;
    }

    public void setDblMONTANTPAYE(Integer dblMONTANTPAYE) {
        this.dblMONTANTPAYE = dblMONTANTPAYE;
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

    public String getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(String dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(String dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public String getHeure() {
        return heure;
    }

    public void setHeure(String heure) {
        this.heure = heure;
    }

    public void setStrCOMPTECONTRIBUABLE(String strCOMPTECONTRIBUABLE) {
        this.strCOMPTECONTRIBUABLE = strCOMPTECONTRIBUABLE;
    }

}
