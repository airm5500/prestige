/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TCompteClient;
import dal.TEmplacement;
import dal.TTypedepot;
import java.io.Serializable;

/**
 *
 * @author DICI
 */
public class MagasinDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String lgEMPLACEMENTID, strNAME, lgCOMPTECLIENTID, lgTYPEDEPOTID, strFIRSTNAME, strLASTNAME, strLOCALITE,
            strPHONE;
    private String lgCLIENTID, desciptiontypedepot, gerantFullName;

    public String getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public String getDesciptiontypedepot() {
        return desciptiontypedepot;
    }

    public void setDesciptiontypedepot(String desciptiontypedepot) {
        this.desciptiontypedepot = desciptiontypedepot;
    }

    public String getGerantFullName() {
        return gerantFullName;
    }

    public void setGerantFullName(String gerantFullName) {
        this.gerantFullName = gerantFullName;
    }

    public String getLgCLIENTID() {
        return lgCLIENTID;
    }

    public void setLgCLIENTID(String lgCLIENTID) {
        this.lgCLIENTID = lgCLIENTID;
    }

    public void setLgEMPLACEMENTID(String lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getLgCOMPTECLIENTID() {
        return lgCOMPTECLIENTID;
    }

    public void setLgCOMPTECLIENTID(String lgCOMPTECLIENTID) {
        this.lgCOMPTECLIENTID = lgCOMPTECLIENTID;
    }

    public String getLgTYPEDEPOTID() {
        return lgTYPEDEPOTID;
    }

    public void setLgTYPEDEPOTID(String lgTYPEDEPOTID) {
        this.lgTYPEDEPOTID = lgTYPEDEPOTID;
    }

    public String getStrFIRSTNAME() {
        return strFIRSTNAME;
    }

    public void setStrFIRSTNAME(String strFIRSTNAME) {
        this.strFIRSTNAME = strFIRSTNAME;
    }

    public String getStrLASTNAME() {
        return strLASTNAME;
    }

    public void setStrLASTNAME(String strLASTNAME) {
        this.strLASTNAME = strLASTNAME;
    }

    public String getStrLOCALITE() {
        return strLOCALITE;
    }

    public void setStrLOCALITE(String strLOCALITE) {
        this.strLOCALITE = strLOCALITE;
    }

    public String getStrPHONE() {
        return strPHONE;
    }

    public void setStrPHONE(String strPHONE) {
        this.strPHONE = strPHONE;
    }

    public MagasinDTO() {
    }

    public MagasinDTO(TEmplacement e) {
        this.lgEMPLACEMENTID = e.getLgEMPLACEMENTID();
        this.strNAME = e.getStrNAME();
        try {
            TCompteClient compteClient = e.getLgCOMPTECLIENTID();
            this.lgCOMPTECLIENTID = compteClient.getLgCOMPTECLIENTID();
            this.lgCLIENTID = compteClient.getLgCLIENTID().getLgCLIENTID();
        } catch (Exception ex) {
        }
        TTypedepot typedepot = e.getLgTYPEDEPOTID();
        this.desciptiontypedepot = typedepot.getStrNAME();
        this.lgTYPEDEPOTID = typedepot.getLgTYPEDEPOTID();
        this.strFIRSTNAME = e.getStrFIRSTNAME();
        this.strLASTNAME = e.getStrLASTNAME();
        this.strLOCALITE = e.getStrLOCALITE();
        this.strPHONE = e.getStrPHONE();
        this.gerantFullName = e.getStrFIRSTNAME() + " " + e.getStrLASTNAME();
    }

}
