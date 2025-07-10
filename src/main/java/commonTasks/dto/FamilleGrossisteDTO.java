/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TGrossiste;
import java.util.Date;

/**
 *
 * @author koben
 */
public class FamilleGrossisteDTO {

    private String lgFAMILLEGROSSISTEID;

    private String strCODEARTICLE;

    private Integer intPRICE;

    private Boolean blRUPTURE;

    private Date dtRUPTURE;

    private Integer intNBRERUPTURE;

    private Integer intPAF;

    private String strSTATUT;

    private Date dtCREATED;
    private Date dtUPDATED = new Date();

    private String lgGROSSISTEID;

    private String lgFAMILLEID;

    public String getLgFAMILLEGROSSISTEID() {
        return lgFAMILLEGROSSISTEID;
    }

    public void setLgFAMILLEGROSSISTEID(String lgFAMILLEGROSSISTEID) {
        this.lgFAMILLEGROSSISTEID = lgFAMILLEGROSSISTEID;
    }

    public String getStrCODEARTICLE() {
        return strCODEARTICLE;
    }

    public void setStrCODEARTICLE(String strCODEARTICLE) {
        this.strCODEARTICLE = strCODEARTICLE;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public Boolean getBlRUPTURE() {
        return blRUPTURE;
    }

    public void setBlRUPTURE(Boolean blRUPTURE) {
        this.blRUPTURE = blRUPTURE;
    }

    public Date getDtRUPTURE() {
        return dtRUPTURE;
    }

    public void setDtRUPTURE(Date dtRUPTURE) {
        this.dtRUPTURE = dtRUPTURE;
    }

    public Integer getIntNBRERUPTURE() {
        return intNBRERUPTURE;
    }

    public void setIntNBRERUPTURE(Integer intNBRERUPTURE) {
        this.intNBRERUPTURE = intNBRERUPTURE;
    }

    public Integer getIntPAF() {
        return intPAF;
    }

    public void setIntPAF(Integer intPAF) {
        this.intPAF = intPAF;
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

    public String getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public void setLgGROSSISTEID(String lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    public String getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(String lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public FamilleGrossisteDTO() {
    }

    public FamilleGrossisteDTO(TFamilleGrossiste o) {
        this.lgFAMILLEGROSSISTEID = o.getLgFAMILLEGROSSISTEID();
        this.strCODEARTICLE = o.getStrCODEARTICLE();
        this.intPRICE = o.getIntPRICE();
        this.blRUPTURE = o.getBlRUPTURE();
        this.dtRUPTURE = o.getDtRUPTURE();
        this.intNBRERUPTURE = o.getIntNBRERUPTURE();
        this.intPAF = o.getIntPAF();
        this.strSTATUT = o.getStrSTATUT();
        this.dtCREATED = o.getDtCREATED();
        TGrossiste grossiste = o.getLgGROSSISTEID();
        this.lgGROSSISTEID = grossiste.getLgGROSSISTEID();
        TFamille famille = o.getLgFAMILLEID();
        this.lgFAMILLEID = famille.getLgFAMILLEID();
    }

    public static TFamilleGrossiste build(FamilleGrossisteDTO o) {
        TFamilleGrossiste t = new TFamilleGrossiste();
        t.setLgFAMILLEGROSSISTEID(o.getLgFAMILLEGROSSISTEID());
        t.setStrCODEARTICLE(o.getStrCODEARTICLE());
        t.setIntPRICE(o.getIntPRICE());
        t.setBlRUPTURE(o.getBlRUPTURE());
        t.setDtRUPTURE(o.getDtRUPTURE());
        t.setIntNBRERUPTURE(o.getIntNBRERUPTURE());
        t.setIntPAF(o.getIntPAF());
        t.setStrSTATUT(o.getStrSTATUT());
        t.setDtCREATED(new Date());
        t.setLgGROSSISTEID(fromId(o.getLgGROSSISTEID()));

        return t;
    }

    private static TGrossiste fromId(String id) {
        return new TGrossiste(id);
    }

    private TFamille familleFromId(String id) {
        return new TFamille(id);
    }

    public static TFamilleGrossiste build(FamilleGrossisteDTO o, TFamilleGrossiste t) {
        t.setStrCODEARTICLE(o.getStrCODEARTICLE());
        t.setIntPRICE(o.getIntPRICE());
        t.setBlRUPTURE(o.getBlRUPTURE());
        t.setDtRUPTURE(o.getDtRUPTURE());
        t.setIntNBRERUPTURE(o.getIntNBRERUPTURE());
        t.setIntPAF(o.getIntPAF());
        t.setStrSTATUT(o.getStrSTATUT());
        return t;
    }

}
