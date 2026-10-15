/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.io.Serializable;

/**
 *
 * @author koben
 */
public class ErpCaComptant implements Serializable {
    private static final long serialVersionUID = 1L;
    private long totEsp, totCB, totVirement, totTVA, totMobile;
    private long totChq, remiseSurCA;
    private String mvtDate, mode;
    private long montantCredit;
    /** Retours du 09/10 (6) : part payee avec des points de fidelite. */
    private long totPointsFidelite;
    /**
     * Demandes des applications mobiles (25) : detail du Mobile Money par operateur ; la somme des montants est egale a
     * totMobile par construction (memes lignes). Vide pour un jour sans Mobile Money.
     */
    private java.util.List<DetailMobile> detailMobile = new java.util.ArrayList<>();

    public java.util.List<DetailMobile> getDetailMobile() {
        return detailMobile;
    }

    public void setDetailMobile(java.util.List<DetailMobile> detailMobile) {
        this.detailMobile = detailMobile;
    }

    /** Ajoute au total Mobile Money et a la ligne de l'operateur. */
    public void ajouterMobile(String modeId, String libelle, long montant) {
        this.totMobile += montant;
        for (DetailMobile d : detailMobile) {
            if (d.getModeId().equals(modeId)) {
                d.setMontant(d.getMontant() + montant);
                return;
            }
        }
        DetailMobile d = new DetailMobile();
        d.setModeId(modeId);
        d.setLibelle(libelle);
        d.setMontant(montant);
        detailMobile.add(d);
    }

    public static class DetailMobile implements Serializable {
        private static final long serialVersionUID = 1L;
        private String modeId, libelle;
        private long montant;

        public String getModeId() {
            return modeId;
        }

        public void setModeId(String modeId) {
            this.modeId = modeId;
        }

        public String getLibelle() {
            return libelle;
        }

        public void setLibelle(String libelle) {
            this.libelle = libelle;
        }

        public long getMontant() {
            return montant;
        }

        public void setMontant(long montant) {
            this.montant = montant;
        }
    }

    public long getTotEsp() {
        return totEsp;
    }

    public void setTotEsp(long totEsp) {
        this.totEsp = totEsp;
    }

    public long getTotCB() {
        return totCB;
    }

    public void setTotCB(long totCB) {
        this.totCB = totCB;
    }

    public long getTotVirement() {
        return totVirement;
    }

    public void setTotVirement(long totVirement) {
        this.totVirement = totVirement;
    }

    public long getTotTVA() {
        return totTVA;
    }

    public void setTotTVA(long totTVA) {
        this.totTVA = totTVA;
    }

    public long getTotMobile() {
        return totMobile;
    }

    public void setTotMobile(long totMobile) {
        this.totMobile = totMobile;
    }

    public long getTotChq() {
        return totChq;
    }

    public void setTotChq(long totChq) {
        this.totChq = totChq;
    }

    public long getRemiseSurCA() {
        return remiseSurCA;
    }

    public void setRemiseSurCA(long remiseSurCA) {
        this.remiseSurCA = remiseSurCA;
    }

    public String getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(String mvtDate) {
        this.mvtDate = mvtDate;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public long getMontantCredit() {
        return montantCredit;
    }

    public void setMontantCredit(long montantCredit) {
        this.montantCredit = montantCredit;
    }

    public long getTotPointsFidelite() {
        return totPointsFidelite;
    }

    public void setTotPointsFidelite(long totPointsFidelite) {
        this.totPointsFidelite = totPointsFidelite;
    }
}
