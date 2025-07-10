
package rest.service.dto;

import java.io.Serializable;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 *
 * @author Hermann N'ZI
 */

@Getter
@Setter
@Builder
public class MouchardStockDTO implements Serializable {

    private String intCip;

    private String strName;

    private Integer intPaf;

    private Integer intPrice;

    private Integer qteDebut;

    private Integer qteMvt;

    private Integer qteFinale;

    private String dtCreated;

    private String mvType;

    private String lgUserId;

    public String getIntCip() {
        return intCip;
    }

    public void setIntCip(String intCip) {
        this.intCip = intCip;
    }

    public String getStrName() {
        return strName;
    }

    public void setStrName(String strName) {
        this.strName = strName;
    }

    public Integer getIntPaf() {
        return intPaf;
    }

    public void setIntPaf(Integer intPaf) {
        this.intPaf = intPaf;
    }

    public Integer getIntPrice() {
        return intPrice;
    }

    public void setIntPrice(Integer intPrice) {
        this.intPrice = intPrice;
    }

    public Integer getQteDebut() {
        return qteDebut;
    }

    public void setQteDebut(Integer qteDebut) {
        this.qteDebut = qteDebut;
    }

    public Integer getQteMvt() {
        return qteMvt;
    }

    public void setQteMvt(Integer qteMvt) {
        this.qteMvt = qteMvt;
    }

    public Integer getQteFinale() {
        return qteFinale;
    }

    public void setQteFinale(Integer qteFinale) {
        this.qteFinale = qteFinale;
    }

    public String getDtCreated() {
        return dtCreated;
    }

    public void setDtCreated(String dtCreated) {
        this.dtCreated = dtCreated;
    }

    public String getMvType() {
        return mvType;
    }

    public void setMvType(String mvType) {
        this.mvType = mvType;
    }

    public String getLgUserId() {
        return lgUserId;
    }

    public void setLgUserId(String lgUserId) {
        this.lgUserId = lgUserId;
    }

}
