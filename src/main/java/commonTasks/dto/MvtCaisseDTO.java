/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TMvtCaisse;
import dal.TTypeMvtCaisse;
import dal.TTypeReglement;
import dal.TUser;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.util.Objects;

/**
 *
 * @author DICI
 */
public class MvtCaisseDTO implements Serializable {

    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
    private static final long serialVersionUID = 1L;
    private String idMvt, numCmp, numPieceComptable, commentaire;
    Integer amount = 0;
    private String dateMvt, codeMonnaie, banque, lieux, mvtDate, refTicket, idTypeRegl, libelleRegl, idTypeMvt,
            libelleTypeMvt, userFullName, idModeRegle;
    private double taux = 0.0;

    public String getCodeMonnaie() {
        return codeMonnaie;
    }

    public void setCodeMonnaie(String codeMonnaie) {
        this.codeMonnaie = codeMonnaie;
    }

    public String getBanque() {
        return banque;
    }

    public void setBanque(String banque) {
        this.banque = banque;
    }

    public String getLieux() {
        return lieux;
    }

    public void setLieux(String lieux) {
        this.lieux = lieux;
    }

    public String getMvtDate() {
        return mvtDate;
    }

    public void setMvtDate(String mvtDate) {
        this.mvtDate = mvtDate;
    }

    public double getTaux() {
        return taux;
    }

    public void setTaux(double taux) {
        this.taux = taux;
    }

    public String getIdModeRegle() {
        return idModeRegle;
    }

    public void setIdModeRegle(String idModeRegle) {
        this.idModeRegle = idModeRegle;
    }

    public String getIdMvt() {
        return idMvt;
    }

    public void setIdMvt(String idMvt) {
        this.idMvt = idMvt;
    }

    public String getNumCmp() {
        return numCmp;
    }

    public void setNumCmp(String numCmp) {
        this.numCmp = numCmp;
    }

    public String getNumPieceComptable() {
        return numPieceComptable;
    }

    public void setNumPieceComptable(String numPieceComptable) {
        this.numPieceComptable = numPieceComptable;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    public Integer getAmount() {
        return amount;
    }

    public void setAmount(Integer amount) {
        this.amount = amount;
    }

    public String getDateMvt() {
        return dateMvt;
    }

    public void setDateMvt(String dateMvt) {
        this.dateMvt = dateMvt;
    }

    public String getRefTicket() {
        return refTicket;
    }

    public void setRefTicket(String refTicket) {
        this.refTicket = refTicket;
    }

    public String getIdTypeRegl() {
        return idTypeRegl;
    }

    public void setIdTypeRegl(String idTypeRegl) {
        this.idTypeRegl = idTypeRegl;
    }

    public String getLibelleRegl() {
        return libelleRegl;
    }

    public void setLibelleRegl(String libelleRegl) {
        this.libelleRegl = libelleRegl;
    }

    public String getIdTypeMvt() {
        return idTypeMvt;
    }

    public void setIdTypeMvt(String idTypeMvt) {
        this.idTypeMvt = idTypeMvt;
    }

    public String getLibelleTypeMvt() {
        return libelleTypeMvt;
    }

    public void setLibelleTypeMvt(String libelleTypeMvt) {
        this.libelleTypeMvt = libelleTypeMvt;
    }

    public String getUserFullName() {
        return userFullName;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    @Override
    public int hashCode() {
        int hash = 3;
        hash = 31 * hash + Objects.hashCode(this.idMvt);
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
        final MvtCaisseDTO other = (MvtCaisseDTO) obj;
        return Objects.equals(this.idMvt, other.idMvt);
    }

    public MvtCaisseDTO(TMvtCaisse c) {
        this.idMvt = c.getLgMVTCAISSEID();
        this.numCmp = c.getStrNUMCOMPTE();
        this.numPieceComptable = c.getStrNUMPIECECOMPTABLE();
        this.commentaire = c.getStrCOMMENTAIRE();
        this.amount = c.getIntAMOUNT().intValue();
        try {
            this.dateMvt = dateFormat.format(c.getDtDATEMVT());
        } catch (Exception e) {
        }
        this.refTicket = c.getStrREFTICKET();
        try {
            TTypeReglement reglement = c.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID();
            this.idTypeRegl = reglement.getLgTYPEREGLEMENTID();
            this.libelleRegl = reglement.getStrNAME();
        } catch (Exception e) {
        }
        try {
            TTypeMvtCaisse caisse = c.getLgTYPEMVTCAISSEID();
            this.idTypeMvt = caisse.getLgTYPEMVTCAISSEID();
            this.libelleTypeMvt = caisse.getStrNAME();
        } catch (Exception e) {
        }
        try {
            TUser u = c.getStrCREATEDBY();
            this.userFullName = u.getStrFIRSTNAME() + " " + u.getStrLASTNAME();
        } catch (Exception e) {
        }

    }

    public MvtCaisseDTO(TMvtCaisse c, TUser u) {
        this.idMvt = c.getLgMVTCAISSEID();
        this.numCmp = c.getStrNUMCOMPTE();
        this.numPieceComptable = c.getStrNUMPIECECOMPTABLE();
        this.commentaire = c.getStrCOMMENTAIRE();
        try {
            this.dateMvt = dateFormat.format(c.getDtDATEMVT());
        } catch (Exception e) {
        }
        this.refTicket = c.getStrREFTICKET();
        try {
            TTypeReglement reglement = c.getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID();
            this.idTypeRegl = reglement.getLgTYPEREGLEMENTID();
            this.libelleRegl = reglement.getStrNAME();
        } catch (Exception e) {
        }
        try {
            TTypeMvtCaisse caisse = c.getLgTYPEMVTCAISSEID();
            this.idTypeMvt = caisse.getLgTYPEMVTCAISSEID();
            this.libelleTypeMvt = caisse.getStrNAME();
        } catch (Exception e) {
        }
        if (u != null) {
            this.userFullName = u.getStrFIRSTNAME() + " " + u.getStrLASTNAME();
        }
    }

    public MvtCaisseDTO() {
    }

}
