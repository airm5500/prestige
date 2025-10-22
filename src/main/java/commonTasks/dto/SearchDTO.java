/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
import java.util.Date;
import java.util.Objects;
import util.DateConverter;

/**
 *
 * @author Kobena
 */
public class SearchDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String lgFAMILLEID, strDESCRIPTION, intCIP, strNAME, strLIBELLEE, lgFAMILLEPARENTID;
    private Integer intPRICE, intNUMBERAVAILABLE, intNUMBERDETAIL, intPAF, intNUMBER;
    private Date dtUPDATED;
    private String displayDate;
    private String codeEanFabriquant;

    public String getDisplayDate() {
        if (Objects.nonNull(dtUPDATED)) {
            this.displayDate = DateConverter.convertDateToDD_MM_YYYY_HH_mm(dtUPDATED);
        }
        return displayDate;
    }

    public String getCodeEanFabriquant() {
        return codeEanFabriquant;
    }

    public void setCodeEanFabriquant(String codeEanFabriquant) {
        this.codeEanFabriquant = codeEanFabriquant;
    }

    public void setDisplayDate(String displayDate) {
        this.displayDate = displayDate;
    }

    public Date getDtUPDATED() {

        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    private Short boolDECONDITIONNE;

    public String getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public Integer getIntNUMBERDETAIL() {
        return intNUMBERDETAIL;
    }

    public void setIntNUMBERDETAIL(Integer intNUMBERDETAIL) {
        this.intNUMBERDETAIL = intNUMBERDETAIL;
    }

    public String getLgFAMILLEPARENTID() {
        return lgFAMILLEPARENTID;
    }

    public void setLgFAMILLEPARENTID(String lgFAMILLEPARENTID) {
        this.lgFAMILLEPARENTID = lgFAMILLEPARENTID;
    }

    public void setLgFAMILLEID(String lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getIntCIP() {
        return intCIP;
    }

    public void setIntCIP(String intCIP) {
        this.intCIP = intCIP;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrLIBELLEE() {
        return strLIBELLEE;
    }

    public void setStrLIBELLEE(String strLIBELLEE) {
        this.strLIBELLEE = strLIBELLEE;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public Integer getIntNUMBERAVAILABLE() {
        return intNUMBERAVAILABLE;
    }

    public void setIntNUMBERAVAILABLE(Integer intNUMBERAVAILABLE) {
        this.intNUMBERAVAILABLE = intNUMBERAVAILABLE;
    }

    public Integer getIntPAF() {
        return intPAF;
    }

    public void setIntPAF(Integer intPAF) {
        this.intPAF = intPAF;
    }

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 97 * hash + Objects.hashCode(this.lgFAMILLEID);
        return hash;
    }

    public Short getBoolDECONDITIONNE() {
        return boolDECONDITIONNE;
    }

    public void setBoolDECONDITIONNE(Short boolDECONDITIONNE) {
        this.boolDECONDITIONNE = boolDECONDITIONNE;
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
        final SearchDTO other = (SearchDTO) obj;
        return Objects.equals(this.lgFAMILLEID, other.lgFAMILLEID);
    }

    public SearchDTO(String lgFAMILLEID, String intCIP, String strNAME, String strLIBELLEE, Integer intPRICE,
            Integer intNUMBERAVAILABLE, Integer intPAF, Integer intNUMBER, Short boolDECONDITIONNE,
            String lgFAMILLEPARENTID, String codeEanFabriquant) {
        this.lgFAMILLEID = lgFAMILLEID;
        this.strDESCRIPTION = strNAME;
        this.intCIP = intCIP;
        this.strNAME = strNAME;
        this.strLIBELLEE = strLIBELLEE;
        this.intPRICE = intPRICE;
        this.intNUMBERAVAILABLE = intNUMBERAVAILABLE;
        this.intPAF = intPAF;
        this.intNUMBER = intNUMBER;
        this.boolDECONDITIONNE = boolDECONDITIONNE;
        this.lgFAMILLEPARENTID = lgFAMILLEPARENTID;
        this.codeEanFabriquant = codeEanFabriquant;
    }

    public SearchDTO(String lgFAMILLEID, String intCIP, String strNAME, String strLIBELLEE, Integer intPRICE,
            Integer intNUMBERAVAILABLE, Integer intPAF, Integer intNUMBER, Integer intNUMBERDETAIL,
            String codeEanFabriquant) {
        this.lgFAMILLEID = lgFAMILLEID;
        this.strDESCRIPTION = strNAME;
        this.intCIP = intCIP;
        this.strNAME = strNAME;
        this.strLIBELLEE = strLIBELLEE;
        this.intPRICE = intPRICE;
        this.intNUMBERAVAILABLE = intNUMBERAVAILABLE;
        this.intPAF = intPAF;
        this.intNUMBER = intNUMBER;
        this.intNUMBERDETAIL = intNUMBERDETAIL;
        this.codeEanFabriquant = codeEanFabriquant;

    }

    public SearchDTO() {
    }

    public SearchDTO(String lgFAMILLEID, String intCIP, String strNAME, Integer intPRICE, Integer intNUMBERAVAILABLE,
            Integer intPAF, Integer intNUMBER, Date dtUPDATED) {
        this.lgFAMILLEID = lgFAMILLEID;
        this.strDESCRIPTION = strNAME;
        this.intCIP = intCIP;
        this.strNAME = strNAME;
        this.intPRICE = intPRICE;
        this.intNUMBERAVAILABLE = intNUMBERAVAILABLE;
        this.intPAF = intPAF;
        this.intNUMBER = intNUMBER;
        this.dtUPDATED = dtUPDATED;

    }

}
