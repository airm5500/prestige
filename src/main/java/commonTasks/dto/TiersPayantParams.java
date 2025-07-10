/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TCompteClientTiersPayant;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TTiersPayant;
import java.io.Serializable;

/**
 *
 * @author Kobena
 */
public class TiersPayantParams implements Serializable {

    private String compteTp, message;
    private int taux;
    private String numBon;
    private String tpFullName;
    private String lgTIERSPAYANTID;
    private String lgCOMPTECLIENTID;
    private Integer tpnet = 0, discount = 0;
    private boolean principal, enabled, activeTiersPayant;
    private String numSecurity = "";
    private int order;
    private Integer dbPLAFONDENCOURS = 0;
    private Integer dbCONSOMMATIONMENSUELLE;
    private Integer dblPLAFOND = 0;
    private Integer dblQUOTACONSOMENSUELLE = 0;
    private boolean bIsAbsolute;
    private String ancienTierPayant;
    private String itemId;
    private boolean cmu;

    public String getCompteTp() {
        return compteTp;
    }

    public String getTpFullName() {
        return tpFullName;
    }

    public boolean isbIsAbsolute() {
        return bIsAbsolute;
    }

    public void setbIsAbsolute(boolean bIsAbsolute) {
        this.bIsAbsolute = bIsAbsolute;
    }

    public String getLgCOMPTECLIENTID() {
        return lgCOMPTECLIENTID;
    }

    public void setLgCOMPTECLIENTID(String lgCOMPTECLIENTID) {
        this.lgCOMPTECLIENTID = lgCOMPTECLIENTID;
    }

    public Integer getDbPLAFONDENCOURS() {
        return dbPLAFONDENCOURS;
    }

    public void setDbPLAFONDENCOURS(Integer dbPLAFONDENCOURS) {
        this.dbPLAFONDENCOURS = dbPLAFONDENCOURS;
    }

    public Integer getDbCONSOMMATIONMENSUELLE() {
        return dbCONSOMMATIONMENSUELLE;
    }

    public void setDbCONSOMMATIONMENSUELLE(Integer dbCONSOMMATIONMENSUELLE) {
        this.dbCONSOMMATIONMENSUELLE = dbCONSOMMATIONMENSUELLE;
    }

    public Integer getDblPLAFOND() {
        return dblPLAFOND;
    }

    public void setDblPLAFOND(Integer dblPLAFOND) {
        this.dblPLAFOND = dblPLAFOND;
    }

    public String getLgTIERSPAYANTID() {
        return lgTIERSPAYANTID;
    }

    public void setLgTIERSPAYANTID(String lgTIERSPAYANTID) {
        this.lgTIERSPAYANTID = lgTIERSPAYANTID;
    }

    public void setTpFullName(String tpFullName) {
        this.tpFullName = tpFullName;
    }

    public String getMessage() {
        return message;
    }

    public int getOrder() {
        return order;
    }

    public void setOrder(int order) {
        this.order = order;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Integer getDiscount() {
        return discount;
    }

    public boolean isPrincipal() {
        return principal;
    }

    public void setPrincipal(boolean principal) {
        this.principal = principal;
    }

    public void setDiscount(Integer discount) {
        this.discount = discount;
    }

    public Integer getTpnet() {
        return tpnet;
    }

    public void setTpnet(Integer tpnet) {
        this.tpnet = tpnet;
    }

    public String getNumBon() {
        return numBon;
    }

    public void setNumBon(String numBon) {
        this.numBon = numBon;
    }

    public void setCompteTp(String compteTp) {
        this.compteTp = compteTp;
    }

    public int getTaux() {
        return taux;
    }

    public void setTaux(int taux) {
        this.taux = taux;
    }

    public TiersPayantParams(String compteTp, int taux, String numBon) {
        this.compteTp = compteTp;
        this.taux = taux;
        this.numBon = numBon;
    }

    public TiersPayantParams() {
    }

    @Override
    public String toString() {
        return "TiersPayantParams{" + "compteTp=" + compteTp + ", taux=" + taux + '}';
    }

    public TiersPayantParams(TPreenregistrementCompteClientTiersPayent c) {
        try {
            TCompteClientTiersPayant cp = c.getLgCOMPTECLIENTTIERSPAYANTID();
            TTiersPayant payant = cp.getLgTIERSPAYANTID();
            this.compteTp = cp.getLgCOMPTECLIENTTIERSPAYANTID();
            this.ancienTierPayant = cp.getLgCOMPTECLIENTTIERSPAYANTID();
            this.itemId = c.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID();
            this.tpFullName = payant.getStrNAME();
            this.principal = cp.getIntPRIORITY() == 1;
            this.lgTIERSPAYANTID = payant.getLgTIERSPAYANTID();
            this.numSecurity = cp.getStrNUMEROSECURITESOCIAL();
            this.order = cp.getIntPRIORITY();

        } catch (Exception e) {
        }
        this.tpnet = c.getIntPRICE();
        this.taux = c.getIntPERCENT();
        this.numBon = c.getStrREFBON();

    }

    public String getNumSecurity() {
        return numSecurity;
    }

    public void setNumSecurity(String numSecurity) {
        this.numSecurity = numSecurity;
    }

    public Integer getDblQUOTACONSOMENSUELLE() {
        return dblQUOTACONSOMENSUELLE;
    }

    public void setDblQUOTACONSOMENSUELLE(Integer dblQUOTACONSOMENSUELLE) {
        this.dblQUOTACONSOMENSUELLE = dblQUOTACONSOMENSUELLE;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public boolean isActiveTiersPayant() {
        return activeTiersPayant;
    }

    public void setActiveTiersPayant(boolean activeTiersPayant) {
        this.activeTiersPayant = activeTiersPayant;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public TiersPayantParams(TCompteClientTiersPayant cp) {
        try {
            TTiersPayant payant = cp.getLgTIERSPAYANTID();
            this.compteTp = cp.getLgCOMPTECLIENTTIERSPAYANTID();
            this.tpFullName = payant.getStrNAME();
            this.principal = cp.getIntPRIORITY() == 1;
            this.lgTIERSPAYANTID = payant.getLgTIERSPAYANTID();
            this.numSecurity = cp.getStrNUMEROSECURITESOCIAL();
            this.order = cp.getIntPRIORITY();
            this.dbCONSOMMATIONMENSUELLE = cp.getDbCONSOMMATIONMENSUELLE();
            this.dbPLAFONDENCOURS = cp.getDbPLAFONDENCOURS();
            this.taux = cp.getIntPOURCENTAGE();
            this.lgCOMPTECLIENTID = cp.getLgCOMPTECLIENTID().getLgCOMPTECLIENTID();
            this.bIsAbsolute = cp.getBIsAbsolute();
            this.enabled = cp.getBCANBEUSE();
            this.dblQUOTACONSOMENSUELLE = cp.getDblPLAFOND().intValue();
            this.activeTiersPayant = payant.getBCANBEUSE();
            this.dblPLAFOND = cp.getDblPLAFOND().intValue();

        } catch (Exception e) {
        }

    }

    public String getAncienTierPayant() {
        return ancienTierPayant;
    }

    public void setAncienTierPayant(String ancienTierPayant) {
        this.ancienTierPayant = ancienTierPayant;
    }

    public String getItemId() {
        return itemId;
    }

    public void setItemId(String itemId) {
        this.itemId = itemId;
    }

    public boolean isCmu() {
        return cmu;
    }

    public void setCmu(boolean cmu) {
        this.cmu = cmu;
    }

}
