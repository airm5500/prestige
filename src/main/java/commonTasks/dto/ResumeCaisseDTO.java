/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TResumeCaisse;
import dal.TUser;
import dal.enumeration.TypeLigneResume;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import rest.service.dto.LigneResumeCaisseDTO;
import util.CommonUtils;
import util.Constant;

/**
 *
 * @author DICI
 */
public class ResumeCaisseDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm");
    private String ldCAISSEID;
    private String dtCREATED;
    private String statut;
    private String dtUPDATED;
    private String strSTATUT;
    private String userFullName;
    private int intSOLDEMATIN;
    private int soldeTotal;
    private int intSOLDESOIR;
    private int billetage;
    private int ecart;
    private int montantAnnule;
    private boolean cancel = false;
    private List<LigneResumeCaisseDTO> ligneResumeCaisses = new ArrayList<>();
    private List<LigneResumeCaisseDTO> ligneReglements = new ArrayList<>();
    private int montantMobile;

    private int computeMobileAmount() {
        return (int) this.ligneResumeCaisses.stream()
                .filter(ligne -> CommonUtils.isMobileTypeReglement(ligne.getIdRegelement())
                        && ligne.getTypeLigne() == TypeLigneResume.VENTE)
                .mapToLong(LigneResumeCaisseDTO::getMontant).reduce(0, Long::sum);
    }

    public int getMontantMobile() {

        return montantMobile;
    }

    public void setMontantMobile(int montantMobile) {
        this.montantMobile = montantMobile;
    }

    public String getLdCAISSEID() {
        return ldCAISSEID;
    }

    public int getSoldeTotal() {
        return soldeTotal;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public void setSoldeTotal(int soldeTotal) {
        this.soldeTotal = soldeTotal;
    }

    public void setLdCAISSEID(String ldCAISSEID) {
        this.ldCAISSEID = ldCAISSEID;
    }

    public String getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(String dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(String dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public String getUserFullName() {
        return userFullName;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    public int getIntSOLDEMATIN() {
        return intSOLDEMATIN;
    }

    public void setIntSOLDEMATIN(int intSOLDEMATIN) {
        this.intSOLDEMATIN = intSOLDEMATIN;
    }

    public int getIntSOLDESOIR() {
        return intSOLDESOIR;
    }

    public void setIntSOLDESOIR(Integer intSOLDESOIR) {
        this.intSOLDESOIR = intSOLDESOIR;
    }

    public int getBilletage() {
        return billetage;
    }

    public void setBilletage(int billetage) {
        this.billetage = billetage;
    }

    public int getEcart() {
        return ecart;
    }

    public void setEcart(int ecart) {
        this.ecart = ecart;
    }

    public int getMontantAnnule() {
        return montantAnnule;
    }

    public void setMontantAnnule(int montantAnnule) {
        this.montantAnnule = montantAnnule;
    }

    public boolean isCancel() {
        return cancel;
    }

    public void setCancel(boolean cancel) {
        this.cancel = cancel;
    }

    public List<LigneResumeCaisseDTO> getLigneResumeCaisses() {
        return ligneResumeCaisses;
    }

    public void setLigneResumeCaisses(List<LigneResumeCaisseDTO> ligneResumeCaisses) {
        this.ligneResumeCaisses = ligneResumeCaisses;
    }

    @Override
    public int hashCode() {
        int hash = 5;
        hash = 41 * hash + Objects.hashCode(this.ldCAISSEID);
        return hash;
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
        final ResumeCaisseDTO other = (ResumeCaisseDTO) obj;
        return Objects.equals(this.ldCAISSEID, other.ldCAISSEID);
    }

    public ResumeCaisseDTO(TResumeCaisse caisse, int montantBilletage, int montantAnnule, boolean cancel) {

        this.ldCAISSEID = caisse.getLdCAISSEID();
        this.dtCREATED = dateFormat.format(caisse.getDtCREATED());
        try {
            this.dtUPDATED = dateFormat.format(caisse.getDtUPDATED());
        } catch (Exception e) {
            this.dtUPDATED = "PAS ENCORE FERMEE";
        }
        TUser u = caisse.getLgUSERID();
        this.userFullName = u.getStrFIRSTNAME() + " " + u.getStrLASTNAME();
        this.billetage = montantBilletage;
        this.montantAnnule = Math.abs(montantAnnule);
        this.intSOLDEMATIN = caisse.getIntSOLDEMATIN();
        this.ligneResumeCaisses = buildLigneResumeCaisse(caisse);
        this.ligneReglements = buildReglements(caisse);
        this.cancel = cancel;
        this.montantMobile = this.computeMobileAmount();
        this.soldeTotal = caisse.getIntSOLDESOIR() + this.montantMobile;
        this.statut = caisse.getStrSTATUT();
        if (caisse.getStrSTATUT().equals(Constant.STATUT_IS_USING)) {
            this.intSOLDESOIR = caisse.getIntSOLDESOIR();
            this.strSTATUT = "En cours d'utilisation ";
        } else {
            this.ecart = montantBilletage - (Math.abs(caisse.getIntSOLDESOIR())/* - montantAnnule */);
            this.intSOLDESOIR = caisse.getIntSOLDESOIR();
            if (caisse.getStrSTATUT().equals(Constant.STATUT_IS_PROGRESS)) {
                this.strSTATUT = "Fermée ";

            }
        }

    }

    // constructeur pour les officines qui prennent en compte le fond de caisse dans la recette
    public ResumeCaisseDTO(TResumeCaisse caisse, int montantBilletage, int montantAnnule, boolean cancel,
            boolean prendreEnCompteFondCaisse) {

        this.ldCAISSEID = caisse.getLdCAISSEID();
        this.dtCREATED = dateFormat.format(caisse.getDtCREATED());
        try {
            this.dtUPDATED = dateFormat.format(caisse.getDtUPDATED());
        } catch (Exception e) {
            this.dtUPDATED = "PAS ENCORE FERMEE";
        }
        TUser u = caisse.getLgUSERID();
        this.userFullName = u.getStrFIRSTNAME() + " " + u.getStrLASTNAME();
        this.billetage = montantBilletage;
        this.montantAnnule = Math.abs(montantAnnule);
        this.intSOLDEMATIN = caisse.getIntSOLDEMATIN();
        this.ligneResumeCaisses = buildLigneResumeCaisse(caisse);
        this.ligneReglements = buildReglements(caisse);
        this.cancel = cancel;
        this.montantMobile = this.computeMobileAmount();
        this.soldeTotal = caisse.getIntSOLDESOIR() + this.montantMobile;
        this.statut = caisse.getStrSTATUT();
        if (caisse.getStrSTATUT().equals(Constant.STATUT_IS_USING)) {
            this.intSOLDESOIR = caisse.getIntSOLDESOIR();
            this.strSTATUT = "En cours d'utilisation ";
        } else {
            this.ecart = montantBilletage - (Math.abs(caisse.getIntSOLDESOIR()) /*- montantAnnule*/);
            this.intSOLDESOIR = caisse.getIntSOLDESOIR();
            if (caisse.getStrSTATUT().equals(Constant.STATUT_IS_PROGRESS)) {
                this.strSTATUT = "Fermée ";

            }
        }

    }

    public List<LigneResumeCaisseDTO> getLigneReglements() {
        return ligneReglements;
    }

    public void setLigneReglements(List<LigneResumeCaisseDTO> ligneReglements) {
        this.ligneReglements = ligneReglements;
    }

    private List<LigneResumeCaisseDTO> buildLigneResumeCaisse(TResumeCaisse caisse) {
        return caisse.getLigneResumeCaisses().stream().filter(e -> e.getTypeLigne() == TypeLigneResume.VENTE)
                .map(LigneResumeCaisseDTO::new).collect(Collectors.toList());
    }

    private List<LigneResumeCaisseDTO> buildReglements(TResumeCaisse caisse) {
        return caisse.getLigneResumeCaisses().stream().filter(e -> e.getTypeLigne() == TypeLigneResume.REGLEMENT)
                .map(LigneResumeCaisseDTO::new).collect(Collectors.toList());
    }
}
