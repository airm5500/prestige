/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.GammeProduit;
import dal.Laboratoire;
import dal.TCodeActe;
import dal.TCodeGestion;
import dal.TCodeTva;
import dal.TFabriquant;
import dal.TFamille;
import dal.TFamillearticle;
import dal.TFormeArticle;
import dal.TGrossiste;
import dal.TRemise;
import dal.TTypeetiquette;
import dal.TZoneGeographique;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.apache.commons.lang3.StringUtils;

/**
 *
 * @author koben
 */
public class FamilleDTO {

    private Short intORERSTATUS;

    private boolean boolACCOUNT = true;

    private Short bCODEINDICATEUR;

    private String lgFAMILLEID;

    private String lgFAMILLEPARENTID;

    private String strNAME;

    private String strDESCRIPTION;

    private String strCODEREMISE;

    private String strCODETAUXREMBOURSEMENT;

    private Integer intPRICE;

    private Integer intPRICETIPS;

    private Integer intTAUXMARQUE;

    private String intCIP;

    private String intEAN13;

    private Integer intS;

    private String intT;

    private Integer intPAF;

    private Integer intPAT;

    private String strSTATUT;

    private Date dtCREATED;
    private Date dtUPDATED;

    private Integer intSEUILMIN;

    private Integer intSTOCKREAPROVISONEMENT;

    private Integer intSEUILMAX;

    private Integer intDAYHISTORY;

    private Double dblLASTPRIXACHAT;

    private Double dblMARGE;

    private Double dblMARGEBRUTE;

    private Double dblTAUXMARGE;

    private Double dblPRIXMOYENPONDERE;

    private String strCODETABLEAU;
    private Boolean boolRESERVE;

    private Short boolETIQUETTE;

    private Short boolDECONDITIONNE;

    private Short boolDECONDITIONNEEXIST;

    private Date dtPEREMPTION;

    private Date dtDATELASTENTREE;

    private Date dtDATELASTSORTIE;

    private Integer intSEUILRESERVE;

    private Integer intNOMBREVENTES;

    private Integer intQTERESERVEE;

    private Integer intNUMBERDETAIL;

    private Integer intSEUILDETAIL;

    private Integer intQTEREAPPROVISIONNEMENT;

    private Integer intDATEBUTOIR;

    private Integer intDELAIREAPPRO;

    private Integer intNBRESORTIE = 0;

    private Integer intQTESORTIE = 0;

    private Integer intMOYVENTE = 0;

    private Date dtLASTINVENTAIRE;

    private Date dtLASTMOUVEMENT;

    private Boolean blPROMOTED = false;

    private Boolean boolCHECKEXPIRATIONDATE;

    private Date dtLASTUPDATESEUILREAPPRO;

    private String lgREMISEID;

    private String lgTYPEETIQUETTEID;

    private String lgFABRIQUANTID;

    private String lgFORMEID;

    private String lgZONEGEOID;

    private String lgCODEGESTIONID;

    private String lgFAMILLEARTICLEID;

    private String lgGROSSISTEID;

    private String lgCODEACTEID;

    private String lgCODETVAID;

    private String laboratoire;
    private String gamme;
    private boolean scheduled;
    private int stock;

    public int getStock() {
        return stock;
    }

    public void setStock(int stock) {
        this.stock = stock;
    }

    private List<FamilleGrossisteDTO> familleGrosiste = new ArrayList<>();
    private List<FamilleStockDTO> familleStock = new ArrayList<>();
    private FamilleDTO parent;

    public FamilleDTO getParent() {
        return parent;
    }

    public void setParent(FamilleDTO parent) {
        this.parent = parent;
    }

    public FamilleDTO parent(FamilleDTO parent) {
        this.parent = parent;
        return this;
    }

    public Short getIntORERSTATUS() {
        return intORERSTATUS;
    }

    public void setIntORERSTATUS(Short intORERSTATUS) {
        this.intORERSTATUS = intORERSTATUS;
    }

    public boolean getBoolACCOUNT() {
        return boolACCOUNT;
    }

    public void setBoolACCOUNT(boolean boolACCOUNT) {
        this.boolACCOUNT = boolACCOUNT;
    }

    public Short getbCODEINDICATEUR() {
        return bCODEINDICATEUR;
    }

    public void setbCODEINDICATEUR(Short bCODEINDICATEUR) {
        this.bCODEINDICATEUR = bCODEINDICATEUR;
    }

    public String getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(String lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public String getLgFAMILLEPARENTID() {
        return lgFAMILLEPARENTID;
    }

    public void setLgFAMILLEPARENTID(String lgFAMILLEPARENTID) {
        this.lgFAMILLEPARENTID = lgFAMILLEPARENTID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getStrCODEREMISE() {
        return strCODEREMISE;
    }

    public void setStrCODEREMISE(String strCODEREMISE) {
        this.strCODEREMISE = strCODEREMISE;
    }

    public String getStrCODETAUXREMBOURSEMENT() {
        return strCODETAUXREMBOURSEMENT;
    }

    public void setStrCODETAUXREMBOURSEMENT(String strCODETAUXREMBOURSEMENT) {
        this.strCODETAUXREMBOURSEMENT = strCODETAUXREMBOURSEMENT;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public Integer getIntPRICETIPS() {
        return intPRICETIPS;
    }

    public void setIntPRICETIPS(Integer intPRICETIPS) {
        this.intPRICETIPS = intPRICETIPS;
    }

    public Integer getIntTAUXMARQUE() {
        return intTAUXMARQUE;
    }

    public void setIntTAUXMARQUE(Integer intTAUXMARQUE) {
        this.intTAUXMARQUE = intTAUXMARQUE;
    }

    public String getIntCIP() {
        return intCIP;
    }

    public void setIntCIP(String intCIP) {
        this.intCIP = intCIP;
    }

    public String getIntEAN13() {
        return intEAN13;
    }

    public void setIntEAN13(String intEAN13) {
        this.intEAN13 = intEAN13;
    }

    public Integer getIntS() {
        return intS;
    }

    public void setIntS(Integer intS) {
        this.intS = intS;
    }

    public String getIntT() {
        return intT;
    }

    public void setIntT(String intT) {
        this.intT = intT;
    }

    public Integer getIntPAF() {
        return intPAF;
    }

    public void setIntPAF(Integer intPAF) {
        this.intPAF = intPAF;
    }

    public Integer getIntPAT() {
        return intPAT;
    }

    public void setIntPAT(Integer intPAT) {
        this.intPAT = intPAT;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public Integer getIntSEUILMIN() {
        return intSEUILMIN;
    }

    public void setIntSEUILMIN(Integer intSEUILMIN) {
        this.intSEUILMIN = intSEUILMIN;
    }

    public Integer getIntSTOCKREAPROVISONEMENT() {
        return intSTOCKREAPROVISONEMENT;
    }

    public void setIntSTOCKREAPROVISONEMENT(Integer intSTOCKREAPROVISONEMENT) {
        this.intSTOCKREAPROVISONEMENT = intSTOCKREAPROVISONEMENT;
    }

    public Integer getIntSEUILMAX() {
        return intSEUILMAX;
    }

    public void setIntSEUILMAX(Integer intSEUILMAX) {
        this.intSEUILMAX = intSEUILMAX;
    }

    public Integer getIntDAYHISTORY() {
        return intDAYHISTORY;
    }

    public void setIntDAYHISTORY(Integer intDAYHISTORY) {
        this.intDAYHISTORY = intDAYHISTORY;
    }

    public Double getDblLASTPRIXACHAT() {
        return dblLASTPRIXACHAT;
    }

    public void setDblLASTPRIXACHAT(Double dblLASTPRIXACHAT) {
        this.dblLASTPRIXACHAT = dblLASTPRIXACHAT;
    }

    public Double getDblMARGE() {
        return dblMARGE;
    }

    public void setDblMARGE(Double dblMARGE) {
        this.dblMARGE = dblMARGE;
    }

    public Double getDblMARGEBRUTE() {
        return dblMARGEBRUTE;
    }

    public void setDblMARGEBRUTE(Double dblMARGEBRUTE) {
        this.dblMARGEBRUTE = dblMARGEBRUTE;
    }

    public Double getDblTAUXMARGE() {
        return dblTAUXMARGE;
    }

    public void setDblTAUXMARGE(Double dblTAUXMARGE) {
        this.dblTAUXMARGE = dblTAUXMARGE;
    }

    public Double getDblPRIXMOYENPONDERE() {
        return dblPRIXMOYENPONDERE;
    }

    public void setDblPRIXMOYENPONDERE(Double dblPRIXMOYENPONDERE) {
        this.dblPRIXMOYENPONDERE = dblPRIXMOYENPONDERE;
    }

    public String getStrCODETABLEAU() {
        return strCODETABLEAU;
    }

    public void setStrCODETABLEAU(String strCODETABLEAU) {
        this.strCODETABLEAU = strCODETABLEAU;
    }

    public Boolean getBoolRESERVE() {
        return boolRESERVE;
    }

    public void setBoolRESERVE(Boolean boolRESERVE) {
        this.boolRESERVE = boolRESERVE;
    }

    public Short getBoolETIQUETTE() {
        return boolETIQUETTE;
    }

    public void setBoolETIQUETTE(Short boolETIQUETTE) {
        this.boolETIQUETTE = boolETIQUETTE;
    }

    public Short getBoolDECONDITIONNE() {
        return boolDECONDITIONNE;
    }

    public void setBoolDECONDITIONNE(Short boolDECONDITIONNE) {
        this.boolDECONDITIONNE = boolDECONDITIONNE;
    }

    public Short getBoolDECONDITIONNEEXIST() {
        return boolDECONDITIONNEEXIST;
    }

    public void setBoolDECONDITIONNEEXIST(Short boolDECONDITIONNEEXIST) {
        this.boolDECONDITIONNEEXIST = boolDECONDITIONNEEXIST;
    }

    public Date getDtPEREMPTION() {
        return dtPEREMPTION;
    }

    public void setDtPEREMPTION(Date dtPEREMPTION) {
        this.dtPEREMPTION = dtPEREMPTION;
    }

    public Date getDtDATELASTENTREE() {
        return dtDATELASTENTREE;
    }

    public void setDtDATELASTENTREE(Date dtDATELASTENTREE) {
        this.dtDATELASTENTREE = dtDATELASTENTREE;
    }

    public Date getDtDATELASTSORTIE() {
        return dtDATELASTSORTIE;
    }

    public void setDtDATELASTSORTIE(Date dtDATELASTSORTIE) {
        this.dtDATELASTSORTIE = dtDATELASTSORTIE;
    }

    public Integer getIntSEUILRESERVE() {
        return intSEUILRESERVE;
    }

    public void setIntSEUILRESERVE(Integer intSEUILRESERVE) {
        this.intSEUILRESERVE = intSEUILRESERVE;
    }

    public Integer getIntNOMBREVENTES() {
        return intNOMBREVENTES;
    }

    public void setIntNOMBREVENTES(Integer intNOMBREVENTES) {
        this.intNOMBREVENTES = intNOMBREVENTES;
    }

    public Integer getIntQTERESERVEE() {
        return intQTERESERVEE;
    }

    public void setIntQTERESERVEE(Integer intQTERESERVEE) {
        this.intQTERESERVEE = intQTERESERVEE;
    }

    public Integer getIntNUMBERDETAIL() {
        return intNUMBERDETAIL;
    }

    public void setIntNUMBERDETAIL(Integer intNUMBERDETAIL) {
        this.intNUMBERDETAIL = intNUMBERDETAIL;
    }

    public Integer getIntSEUILDETAIL() {
        return intSEUILDETAIL;
    }

    public void setIntSEUILDETAIL(Integer intSEUILDETAIL) {
        this.intSEUILDETAIL = intSEUILDETAIL;
    }

    public Integer getIntQTEREAPPROVISIONNEMENT() {
        return intQTEREAPPROVISIONNEMENT;
    }

    public void setIntQTEREAPPROVISIONNEMENT(Integer intQTEREAPPROVISIONNEMENT) {
        this.intQTEREAPPROVISIONNEMENT = intQTEREAPPROVISIONNEMENT;
    }

    public Integer getIntDATEBUTOIR() {
        return intDATEBUTOIR;
    }

    public void setIntDATEBUTOIR(Integer intDATEBUTOIR) {
        this.intDATEBUTOIR = intDATEBUTOIR;
    }

    public Integer getIntDELAIREAPPRO() {
        return intDELAIREAPPRO;
    }

    public void setIntDELAIREAPPRO(Integer intDELAIREAPPRO) {
        this.intDELAIREAPPRO = intDELAIREAPPRO;
    }

    public Integer getIntNBRESORTIE() {
        return intNBRESORTIE;
    }

    public void setIntNBRESORTIE(Integer intNBRESORTIE) {
        this.intNBRESORTIE = intNBRESORTIE;
    }

    public Integer getIntQTESORTIE() {
        return intQTESORTIE;
    }

    public void setIntQTESORTIE(Integer intQTESORTIE) {
        this.intQTESORTIE = intQTESORTIE;
    }

    public Integer getIntMOYVENTE() {
        return intMOYVENTE;
    }

    public void setIntMOYVENTE(Integer intMOYVENTE) {
        this.intMOYVENTE = intMOYVENTE;
    }

    public Date getDtLASTINVENTAIRE() {
        return dtLASTINVENTAIRE;
    }

    public void setDtLASTINVENTAIRE(Date dtLASTINVENTAIRE) {
        this.dtLASTINVENTAIRE = dtLASTINVENTAIRE;
    }

    public Date getDtLASTMOUVEMENT() {
        return dtLASTMOUVEMENT;
    }

    public void setDtLASTMOUVEMENT(Date dtLASTMOUVEMENT) {
        this.dtLASTMOUVEMENT = dtLASTMOUVEMENT;
    }

    public Boolean getBlPROMOTED() {
        return blPROMOTED;
    }

    public void setBlPROMOTED(Boolean blPROMOTED) {
        this.blPROMOTED = blPROMOTED;
    }

    public Boolean getBoolCHECKEXPIRATIONDATE() {
        return boolCHECKEXPIRATIONDATE;
    }

    public void setBoolCHECKEXPIRATIONDATE(Boolean boolCHECKEXPIRATIONDATE) {
        this.boolCHECKEXPIRATIONDATE = boolCHECKEXPIRATIONDATE;
    }

    public Date getDtLASTUPDATESEUILREAPPRO() {
        return dtLASTUPDATESEUILREAPPRO;
    }

    public void setDtLASTUPDATESEUILREAPPRO(Date dtLASTUPDATESEUILREAPPRO) {
        this.dtLASTUPDATESEUILREAPPRO = dtLASTUPDATESEUILREAPPRO;
    }

    public String getLgREMISEID() {
        return lgREMISEID;
    }

    public void setLgREMISEID(String lgREMISEID) {
        this.lgREMISEID = lgREMISEID;
    }

    public String getLgTYPEETIQUETTEID() {
        return lgTYPEETIQUETTEID;
    }

    public void setLgTYPEETIQUETTEID(String lgTYPEETIQUETTEID) {
        this.lgTYPEETIQUETTEID = lgTYPEETIQUETTEID;
    }

    public String getLgFABRIQUANTID() {
        return lgFABRIQUANTID;
    }

    public void setLgFABRIQUANTID(String lgFABRIQUANTID) {
        this.lgFABRIQUANTID = lgFABRIQUANTID;
    }

    public String getLgFORMEID() {
        return lgFORMEID;
    }

    public void setLgFORMEID(String lgFORMEID) {
        this.lgFORMEID = lgFORMEID;
    }

    public String getLgZONEGEOID() {
        return lgZONEGEOID;
    }

    public void setLgZONEGEOID(String lgZONEGEOID) {
        this.lgZONEGEOID = lgZONEGEOID;
    }

    public String getLgCODEGESTIONID() {
        return lgCODEGESTIONID;
    }

    public void setLgCODEGESTIONID(String lgCODEGESTIONID) {
        this.lgCODEGESTIONID = lgCODEGESTIONID;
    }

    public String getLgFAMILLEARTICLEID() {
        return lgFAMILLEARTICLEID;
    }

    public void setLgFAMILLEARTICLEID(String lgFAMILLEARTICLEID) {
        this.lgFAMILLEARTICLEID = lgFAMILLEARTICLEID;
    }

    public String getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public void setLgGROSSISTEID(String lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    public String getLgCODEACTEID() {
        return lgCODEACTEID;
    }

    public void setLgCODEACTEID(String lgCODEACTEID) {
        this.lgCODEACTEID = lgCODEACTEID;
    }

    public String getLgCODETVAID() {
        return lgCODETVAID;
    }

    public void setLgCODETVAID(String lgCODETVAID) {
        this.lgCODETVAID = lgCODETVAID;
    }

    public String getLaboratoire() {
        return laboratoire;
    }

    public void setLaboratoire(String laboratoire) {
        this.laboratoire = laboratoire;
    }

    public String getGamme() {
        return gamme;
    }

    public void setGamme(String gamme) {
        this.gamme = gamme;
    }

    public boolean isScheduled() {
        return scheduled;
    }

    public void setScheduled(boolean scheduled) {
        this.scheduled = scheduled;
    }

    public List<FamilleGrossisteDTO> getFamilleGrosiste() {
        return familleGrosiste;
    }

    public void setFamilleGrosiste(List<FamilleGrossisteDTO> familleGrosiste) {
        this.familleGrosiste = familleGrosiste;
    }

    public List<FamilleStockDTO> getFamilleStock() {
        return familleStock;
    }

    public void setFamilleStock(List<FamilleStockDTO> familleStock) {
        this.familleStock = familleStock;
    }

    public FamilleDTO() {
    }

    public FamilleDTO(String id, String cip, String libelle, int prixAchat, int prixUni, int stock, boolean chiffre) {
        this.lgFAMILLEID = id;
        this.intCIP = cip;
        this.strNAME = libelle;
        this.intPAF = prixAchat;
        this.intPRICE = prixUni;
        this.stock = stock;
        this.boolACCOUNT = !chiffre;
    }

    public FamilleDTO(TFamille o, List<FamilleGrossisteDTO> familleGrossiste, List<FamilleStockDTO> stocks) {
        this.familleGrosiste = familleGrossiste;
        this.familleStock = stocks;
        this.intORERSTATUS = 0;
        this.boolACCOUNT = o.getBoolACCOUNT();
        this.bCODEINDICATEUR = 0;
        this.lgFAMILLEID = o.getLgFAMILLEID();
        this.lgFAMILLEPARENTID = o.getLgFAMILLEPARENTID();
        this.strNAME = o.getStrNAME();
        this.strDESCRIPTION = o.getStrDESCRIPTION();
        this.strCODEREMISE = o.getStrCODEREMISE();
        this.strCODETAUXREMBOURSEMENT = o.getStrCODETAUXREMBOURSEMENT();
        this.intPRICE = o.getIntPRICE();
        this.intPRICETIPS = o.getIntPRICETIPS();
        this.intTAUXMARQUE = o.getIntTAUXMARQUE();
        this.intCIP = o.getIntCIP();
        this.intEAN13 = o.getIntEAN13();
        this.intS = o.getIntS();
        this.intT = o.getIntT();
        this.intPAF = o.getIntPAF();
        this.intPAT = o.getIntPAF();
        this.strSTATUT = o.getStrSTATUT();
        this.intSEUILMIN = o.getIntSEUILMIN();
        this.intSTOCKREAPROVISONEMENT = o.getIntSTOCKREAPROVISONEMENT();
        this.intSEUILMAX = o.getIntSEUILMAX();
        this.intDAYHISTORY = o.getIntDAYHISTORY();
        this.dblLASTPRIXACHAT = o.getDblLASTPRIXACHAT();
        this.dblMARGE = o.getDblMARGE();
        this.dblMARGEBRUTE = o.getDblMARGEBRUTE();
        this.dblTAUXMARGE = o.getDblTAUXMARGE();
        this.dblPRIXMOYENPONDERE = o.getDblPRIXMOYENPONDERE();
        this.strCODETABLEAU = o.getStrCODETABLEAU();
        this.boolRESERVE = o.getBoolRESERVE();
        this.boolETIQUETTE = o.getBoolETIQUETTE();
        this.boolDECONDITIONNE = o.getBoolDECONDITIONNE();
        this.boolDECONDITIONNEEXIST = o.getBoolDECONDITIONNEEXIST();
        this.dtPEREMPTION = o.getDtPEREMPTION();
        this.dtDATELASTENTREE = o.getDtDATELASTENTREE();
        this.dtDATELASTSORTIE = o.getDtDATELASTSORTIE();
        this.intSEUILRESERVE = o.getIntSEUILRESERVE();
        this.intNOMBREVENTES = o.getIntNOMBREVENTES();
        this.intQTERESERVEE = o.getIntQTERESERVEE();
        this.intNUMBERDETAIL = o.getIntNUMBERDETAIL();
        this.intSEUILDETAIL = o.getIntSEUILDETAIL();
        this.intQTEREAPPROVISIONNEMENT = o.getIntQTEREAPPROVISIONNEMENT();
        this.intDATEBUTOIR = o.getIntDATEBUTOIR();
        this.intDELAIREAPPRO = o.getIntDELAIREAPPRO();
        this.dtLASTINVENTAIRE = o.getDtLASTINVENTAIRE();
        this.dtLASTMOUVEMENT = o.getDtLASTMOUVEMENT();
        this.boolCHECKEXPIRATIONDATE = o.getBoolCHECKEXPIRATIONDATE();
        this.dtLASTUPDATESEUILREAPPRO = o.getDtLASTUPDATESEUILREAPPRO();
        this.scheduled = o.isScheduled();
        TRemise remise = o.getLgREMISEID();
        if (remise != null) {
            this.lgREMISEID = remise.getLgREMISEID();
        }
        TTypeetiquette e = o.getLgTYPEETIQUETTEID();
        if (e != null) {
            this.lgTYPEETIQUETTEID = e.getLgTYPEETIQUETTEID();
        }
        TFabriquant f = o.getLgFABRIQUANTID();
        if (f != null) {
            this.lgFABRIQUANTID = f.getLgFABRIQUANTID();
        }
        TFormeArticle fm = o.getLgFORMEID();
        if (fm != null) {
            this.lgFORMEID = fm.getLgFORMEARTICLEID();
        }
        TZoneGeographique z = o.getLgZONEGEOID();
        if (z != null) {
            this.lgZONEGEOID = z.getLgZONEGEOID();
        }
        TCodeGestion co = o.getLgCODEGESTIONID();
        if (co != null) {
            this.lgCODEGESTIONID = co.getLgCODEGESTIONID();
        }
        TFamillearticle tf = o.getLgFAMILLEARTICLEID();
        if (tf != null) {
            this.lgFAMILLEARTICLEID = tf.getLgFAMILLEARTICLEID();
        }
        TGrossiste g = o.getLgGROSSISTEID();
        if (g != null) {
            this.lgGROSSISTEID = g.getLgGROSSISTEID();
        }
        TCodeActe a = o.getLgCODEACTEID();
        if (a != null) {
            this.lgCODEACTEID = a.getLgCODEACTEID();
        }
        TCodeTva tva = o.getLgCODETVAID();
        if (tva != null) {
            this.lgCODETVAID = tva.getLgCODETVAID();
        }
        Laboratoire l = o.getLaboratoire();
        if (l != null) {
            this.laboratoire = l.getId();
        }
        GammeProduit ga = o.getGamme();
        if (ga != null) {
            this.gamme = ga.getId();
        }

    }

    public static TFamille build(FamilleDTO o) {
        TFamille t = new TFamille();
        t.setLgFAMILLEID(o.getLgFAMILLEID());
        t.setIntORERSTATUS(o.getIntORERSTATUS());
        t.setBoolACCOUNT(o.getBoolACCOUNT());
        t.setBCODEINDICATEUR(o.getbCODEINDICATEUR());
        t.setLgFAMILLEPARENTID(o.getLgFAMILLEPARENTID());
        t.setStrNAME(o.getStrNAME());
        t.setStrDESCRIPTION(o.getStrDESCRIPTION());
        t.setStrCODEREMISE(o.getStrCODEREMISE());
        t.setStrCODETAUXREMBOURSEMENT(o.getStrCODETAUXREMBOURSEMENT());
        t.setIntPRICE(o.getIntPRICE());
        t.setIntPRICETIPS(o.getIntPRICETIPS());
        t.setIntTAUXMARQUE(o.getIntTAUXMARQUE());
        t.setIntCIP(o.getIntCIP());
        t.setIntEAN13(o.getIntEAN13());
        t.setIntS(o.getIntS());
        t.setIntT(o.getIntT());
        t.setIntPAF(o.getIntPAF());
        t.setIntPAT(o.getIntPAF());
        t.setStrSTATUT(o.getStrSTATUT());
        t.setIntSEUILMIN(o.getIntSEUILMIN());
        t.setIntSTOCKREAPROVISONEMENT(o.getIntSTOCKREAPROVISONEMENT());
        t.setIntSEUILMAX(o.getIntSEUILMAX());
        t.setIntDAYHISTORY(o.getIntDAYHISTORY());
        t.setDblLASTPRIXACHAT(o.getDblLASTPRIXACHAT());
        t.setDblMARGE(o.getDblMARGE());
        t.setDblMARGEBRUTE(o.getDblMARGEBRUTE());
        t.setDblTAUXMARGE(o.getDblTAUXMARGE());
        t.setDblPRIXMOYENPONDERE(o.getDblPRIXMOYENPONDERE());
        t.setStrCODETABLEAU(o.getStrCODETABLEAU());
        t.setBoolRESERVE(o.getBoolRESERVE());
        t.setBoolETIQUETTE(o.getBoolETIQUETTE());
        t.setBoolDECONDITIONNE(o.getBoolDECONDITIONNE());
        t.setBoolDECONDITIONNEEXIST(o.getBoolDECONDITIONNEEXIST());
        t.setDtPEREMPTION(o.getDtPEREMPTION());
        t.setDtDATELASTENTREE(o.getDtDATELASTENTREE());
        t.setDtDATELASTSORTIE(o.getDtDATELASTSORTIE());
        t.setIntSEUILRESERVE(o.getIntSEUILRESERVE());
        t.setIntNOMBREVENTES(o.getIntNOMBREVENTES());
        t.setIntQTERESERVEE(o.getIntQTERESERVEE());
        t.setIntNUMBERDETAIL(o.getIntNUMBERDETAIL());
        t.setIntSEUILDETAIL(o.getIntSEUILDETAIL());
        t.setIntQTEREAPPROVISIONNEMENT(o.getIntQTEREAPPROVISIONNEMENT());
        t.setIntDATEBUTOIR(o.getIntDATEBUTOIR());
        t.setIntDELAIREAPPRO(o.getIntDELAIREAPPRO());
        t.setDtLASTINVENTAIRE(o.getDtLASTINVENTAIRE());
        t.setDtLASTMOUVEMENT(o.getDtLASTMOUVEMENT());
        t.setBoolCHECKEXPIRATIONDATE(o.getBoolCHECKEXPIRATIONDATE());
        t.setDtLASTUPDATESEUILREAPPRO(o.getDtLASTUPDATESEUILREAPPRO());
        t.setScheduled(o.isScheduled());
        t.setLgTYPEETIQUETTEID(etiquetteFromId(o.getLgTYPEETIQUETTEID()));
        t.setLgFORMEID(formeFromId(o.getLgFORMEID()));
        t.setLgCODETVAID(tvaFromId(o.getLgCODETVAID()));
        t.setLgCODEACTEID(acteFromId(o.getLgCODEACTEID()));
        t.setLgGROSSISTEID(grossisteFromId(o.getLgGROSSISTEID()));
        t.setLgFAMILLEARTICLEID(familleFromId(o.getLgFAMILLEARTICLEID()));
        t.setLgCODEGESTIONID(gestionFromId(o.getLgCODEGESTIONID()));
        return t;
    }

    private static TTypeetiquette etiquetteFromId(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        return new TTypeetiquette(id);
    }

    private static TFormeArticle formeFromId(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        return new TFormeArticle(id);
    }

    private static TCodeTva tvaFromId(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        return new TCodeTva(id);
    }

    private static TCodeActe acteFromId(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        return new TCodeActe(id);
    }

    private static TGrossiste grossisteFromId(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        return new TGrossiste(id);
    }

    private static TFamillearticle familleFromId(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        return new TFamillearticle(id);
    }

    private static TCodeGestion gestionFromId(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        return new TCodeGestion(id);
    }

    public static TFamille build(FamilleDTO o, TFamille t) {
        t.setBoolACCOUNT(o.getBoolACCOUNT());
        t.setBCODEINDICATEUR(o.getbCODEINDICATEUR());
        t.setStrNAME(o.getStrNAME());
        t.setStrDESCRIPTION(o.getStrDESCRIPTION());
        t.setStrCODEREMISE(o.getStrCODEREMISE());
        t.setStrCODETAUXREMBOURSEMENT(o.getStrCODETAUXREMBOURSEMENT());
        t.setIntPRICE(o.getIntPRICE());
        t.setIntPRICETIPS(o.getIntPRICETIPS());
        t.setIntTAUXMARQUE(o.getIntTAUXMARQUE());
        t.setIntCIP(o.getIntCIP());
        t.setIntEAN13(o.getIntEAN13());
        t.setIntS(o.getIntS());
        t.setIntT(o.getIntT());
        t.setIntPAF(o.getIntPAF());
        t.setIntPAT(o.getIntPAF());
        t.setStrSTATUT(o.getStrSTATUT());
        t.setIntSEUILMIN(o.getIntSEUILMIN());
        t.setIntSTOCKREAPROVISONEMENT(o.getIntSTOCKREAPROVISONEMENT());
        t.setIntSEUILMAX(o.getIntSEUILMAX());
        t.setIntDAYHISTORY(o.getIntDAYHISTORY());
        t.setDblLASTPRIXACHAT(o.getDblLASTPRIXACHAT());
        t.setDblMARGE(o.getDblMARGE());
        t.setDblMARGEBRUTE(o.getDblMARGEBRUTE());
        t.setDblTAUXMARGE(o.getDblTAUXMARGE());
        t.setStrCODETABLEAU(o.getStrCODETABLEAU());
        t.setBoolRESERVE(o.getBoolRESERVE());
        t.setBoolETIQUETTE(o.getBoolETIQUETTE());
        t.setBoolDECONDITIONNE(o.getBoolDECONDITIONNE());
        t.setBoolDECONDITIONNEEXIST(o.getBoolDECONDITIONNEEXIST());
        t.setDtPEREMPTION(o.getDtPEREMPTION());
        t.setDtDATELASTENTREE(o.getDtDATELASTENTREE());
        t.setDtDATELASTSORTIE(o.getDtDATELASTSORTIE());
        t.setIntSEUILRESERVE(o.getIntSEUILRESERVE());
        t.setIntNOMBREVENTES(o.getIntNOMBREVENTES());
        t.setIntQTERESERVEE(o.getIntQTERESERVEE());
        t.setIntNUMBERDETAIL(o.getIntNUMBERDETAIL());
        t.setIntSEUILDETAIL(o.getIntSEUILDETAIL());
        t.setIntQTEREAPPROVISIONNEMENT(o.getIntQTEREAPPROVISIONNEMENT());
        t.setIntDATEBUTOIR(o.getIntDATEBUTOIR());
        t.setIntDELAIREAPPRO(o.getIntDELAIREAPPRO());
        t.setDtLASTINVENTAIRE(o.getDtLASTINVENTAIRE());
        t.setDtLASTMOUVEMENT(o.getDtLASTMOUVEMENT());
        t.setBoolCHECKEXPIRATIONDATE(o.getBoolCHECKEXPIRATIONDATE());
        t.setDtLASTUPDATESEUILREAPPRO(o.getDtLASTUPDATESEUILREAPPRO());
        t.setScheduled(o.isScheduled());
        return t;
    }
}
