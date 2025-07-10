/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author DICI
 */
public class ValorisationDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    String typeId, libelle, code;
    Integer montantPu = 0, montantFacture = 0, montantTarif = 0, montantPmd = 0;
    List<ValorisationDTO> datas = new ArrayList<>();
    ValorisationDTO tvas;

    public String getTypeId() {
        return typeId;
    }

    public ValorisationDTO getTvas() {
        return tvas;
    }

    public void setTvas(ValorisationDTO tvas) {
        this.tvas = tvas;
    }

    public void setTypeId(String typeId) {
        this.typeId = typeId;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Integer getMontantPu() {
        return montantPu;
    }

    public void setMontantPu(Integer montantPu) {
        this.montantPu = montantPu;
    }

    public Integer getMontantFacture() {
        return montantFacture;
    }

    public void setMontantFacture(Integer montantFacture) {
        this.montantFacture = montantFacture;
    }

    public Integer getMontantTarif() {
        return montantTarif;
    }

    public void setMontantTarif(Integer montantTarif) {
        this.montantTarif = montantTarif;
    }

    public Integer getMontantPmd() {
        return montantPmd;
    }

    public void setMontantPmd(Integer montantPmd) {
        this.montantPmd = montantPmd;
    }

    public List<ValorisationDTO> getDatas() {
        return datas;
    }

    public void setDatas(List<ValorisationDTO> datas) {
        this.datas = datas;
    }

    @Override
    public String toString() {
        return "ValorisationDTO{" + "libelle=" + libelle + ", code=" + code + ", montantPu=" + montantPu
                + ", montantFacture=" + montantFacture + ", montantTarif=" + montantTarif + ", montantPmd=" + montantPmd
                + '}';
    }

}
