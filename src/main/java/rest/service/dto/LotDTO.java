/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
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
public class LotDTO implements Serializable {

    public String getLgFamilleId() {
        return lgFamilleId;
    }

    public void setLgFamilleId(String lgFamilleId) {
        this.lgFamilleId = lgFamilleId;
    }

    public String getStrName() {
        return strName;
    }

    public void setStrName(String strName) {
        this.strName = strName;
    }

    public Integer getIntPrice() {
        return intPrice;
    }

    public void setIntPrice(Integer intPrice) {
        this.intPrice = intPrice;
    }

    public Integer getIntPaf() {
        return intPaf;
    }

    public void setIntPaf(Integer intPaf) {
        this.intPaf = intPaf;
    }

    public String getIntNumLot() {
        return intNumLot;
    }

    public void setIntNumLot(String intNumLot) {
        this.intNumLot = intNumLot;
    }

    public Integer getIntNumber() {
        return intNumber;
    }

    public void setIntNumber(Integer intNumber) {
        this.intNumber = intNumber;
    }

    public String getDtCreated() {
        return dtCreated;
    }

    public void setDtCreated(String dtCreated) {
        this.dtCreated = dtCreated;
    }

    public String getDtUpdated() {
        return dtUpdated;
    }

    public void setDtUpdated(String dtUpdated) {
        this.dtUpdated = dtUpdated;
    }

    public String getLgGrossisteId() {
        return lgGrossisteId;
    }

    public void setLgGrossisteId(String lgGrossisteId) {
        this.lgGrossisteId = lgGrossisteId;
    }

    public String getStrRefLivraison() {
        return strRefLivraison;
    }

    public void setStrRefLivraison(String strRefLivraison) {
        this.strRefLivraison = strRefLivraison;
    }

    public String getDtSortieUsine() {
        return dtSortieUsine;
    }

    public void setDtSortieUsine(String dtSortieUsine) {
        this.dtSortieUsine = dtSortieUsine;
    }

    public String getDtPeremption() {
        return dtPeremption;
    }

    public void setDtPeremption(String dtPeremption) {
        this.dtPeremption = dtPeremption;
    }

    public Integer getIntNumberGratuit() {
        return intNumberGratuit;
    }

    public void setIntNumberGratuit(Integer intNumberGratuit) {
        this.intNumberGratuit = intNumberGratuit;
    }

    public Integer getIntQtyVendue() {
        return intQtyVendue;
    }

    public void setIntQtyVendue(Integer intQtyVendue) {
        this.intQtyVendue = intQtyVendue;
    }

    public String getLgUserId() {
        return lgUserId;
    }

    public void setLgUserId(String lgUserId) {
        this.lgUserId = lgUserId;
    }

    public String getIntCip() {
        return intCip;
    }

    public void setIntCip(String intCip) {
        this.intCip = intCip;
    }

    private String intCip;

    private Integer intPrice;

    private Integer intPaf;

    private String intNumLot;

    private Integer intNumber;

    private String dtCreated;

    private String dtUpdated;

    private String lgGrossisteId;

    private String strRefLivraison;

    private String dtSortieUsine;

    private String dtPeremption;

    private Integer intNumberGratuit;

    private Integer intQtyVendue;

    private String lgUserId;

    private String lgFamilleId;

    private String strName;

}
