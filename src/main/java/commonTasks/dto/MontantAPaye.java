/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.PrixReferenceType;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author Kobena
 */
public class MontantAPaye implements Serializable {

    private static final long serialVersionUID = 1L;
    private Integer remise = 0;
    private Integer marge = 0;
    private Integer montantTva = 0;
    private Integer montantNet = 0;
    private Integer montant = 0;
    private Integer montantTp = 0;
    private Integer montantAccount = 0;
    private int montantNetUg = 0;
    private int montantTtcUg = 0;
    private int margeUg = 0;
    private List<TiersPayantParams> tierspayants = new ArrayList<>();
    private boolean restructuring;
    private String message;
    private int montantTvaUg = 0;
    private int cmuAmount = 0;
    private List<MontantTp> montantTierspayants = new ArrayList<>();

    private PrixReferenceType type;
    private int tiersPayantBaseAmount;// montant de reference + montant de produit sans prix de reference

    public boolean isRestructuring() {
        return restructuring;
    }

    public int getTiersPayantBaseAmount() {
        return tiersPayantBaseAmount;
    }

    public void setTiersPayantBaseAmount(int tiersPayantBaseAmount) {
        this.tiersPayantBaseAmount = tiersPayantBaseAmount;
    }

    public PrixReferenceType getType() {
        return type;
    }

    public void setType(PrixReferenceType type) {
        this.type = type;
    }

    public int getCmuAmount() {
        return cmuAmount;
    }

    public void setCmuAmount(int cmuAmount) {
        this.cmuAmount = cmuAmount;
    }

    public MontantAPaye cmuAmount(int cmuAmount) {
        this.cmuAmount = cmuAmount;
        return this;
    }

    public void setRestructuring(boolean restructuring) {
        this.restructuring = restructuring;
    }

    public Integer getMontantTva() {
        return montantTva;
    }

    public void setMontantTva(Integer montantTva) {
        this.montantTva = montantTva;
    }

    public Integer getRemise() {
        return remise;
    }

    public Integer getMarge() {
        return marge;
    }

    public void setMarge(Integer marge) {
        this.marge = marge;
    }

    public MontantAPaye() {
    }

    public MontantAPaye montantAccount(Integer montantAccount) {
        this.montantAccount = montantAccount;
        return this;
    }

    public String getMessage() {
        return message;
    }

    public Integer getMontantAccount() {
        return montantAccount;
    }

    public void setMontantAccount(Integer montantAccount) {
        this.montantAccount = montantAccount;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<MontantTp> getMontantTierspayants() {
        return montantTierspayants;
    }

    public MontantAPaye setMontantTierspayants(List<MontantTp> montantTierspayants) {
        this.montantTierspayants = montantTierspayants;
        return this;
    }

    public MontantAPaye(Integer montantNet, Integer montant, Integer montantTp, Integer remise, Integer marge,
            Integer montantTva) {
        this.montant = montant;
        this.montantNet = montantNet;
        this.montantTp = montantTp;
        this.remise = remise;
        this.marge = marge;
        this.montantTva = montantTva;
    }

    public List<TiersPayantParams> getTierspayants() {
        return tierspayants;
    }

    public void setTierspayants(List<TiersPayantParams> tierspayants) {
        this.tierspayants = tierspayants;
    }

    public void setRemise(Integer remise) {
        this.remise = remise;
    }

    public Integer getMontantNet() {
        return montantNet;
    }

    public void setMontantNet(Integer montantNet) {
        this.montantNet = montantNet;
    }

    public Integer getMontant() {
        return montant;
    }

    public void setMontant(Integer montant) {
        this.montant = montant;
    }

    public Integer getMontantTp() {
        return montantTp;
    }

    public void setMontantTp(Integer montantTp) {
        this.montantTp = montantTp;
    }

    @Override
    public String toString() {
        return "MontantAPaye{" + "remise=" + remise + ", marge=" + marge + ", montantTva=" + montantTva
                + ", montantNet=" + montantNet + ", montant=" + montant + ", montantTp=" + montantTp
                + ", montantAccount=" + montantAccount + ", montantNetUg=" + montantNetUg + ", montantTtcUg="
                + montantTtcUg + ", margeUg=" + margeUg + ", tierspayants=" + tierspayants + ", restructuring="
                + restructuring + ", message=" + message + ", montantTvaUg=" + montantTvaUg + ", cmuAmount=" + cmuAmount
                + '}';
    }

    public int getMontantNetUg() {
        return montantNetUg;
    }

    public void setMontantNetUg(int montantNetUg) {
        this.montantNetUg = montantNetUg;
    }

    public int getMontantTtcUg() {
        return montantTtcUg;
    }

    public void setMontantTtcUg(int montantTtcUg) {
        this.montantTtcUg = montantTtcUg;
    }

    public int getMargeUg() {
        return margeUg;
    }

    public MontantAPaye margeUg(int margeUg) {
        this.margeUg = margeUg;
        return this;
    }

    public void setMargeUg(int margeUg) {
        this.margeUg = margeUg;
    }

    public MontantAPaye montantTtcUg(int montantTtcUg) {
        this.montantTtcUg = montantTtcUg;
        return this;
    }

    public MontantAPaye montantNetUg(int montantNetUg) {
        this.montantNetUg = montantNetUg;
        return this;
    }

    public int getMontantTvaUg() {
        return montantTvaUg;
    }

    public void setMontantTvaUg(int montantTvaUg) {
        this.montantTvaUg = montantTvaUg;
    }

    public MontantAPaye montantTvaUg(int montantTvaUg) {
        this.montantTvaUg = montantTvaUg;
        return this;
    }

}
