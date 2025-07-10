/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_retour_fournisseur_detail")
@XmlRootElement

public class TRetourFournisseurDetail implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_RETOUR_FRS_DETAIL", nullable = false, length = 40)
    private String lgRETOURFRSDETAIL;
    @Column(name = "int_NUMBER_RETURN")
    private Integer intNUMBERRETURN;
    @Column(name = "int_NUMBER_ANSWER")
    private Integer intNUMBERANSWER;
    @Column(name = "int_PAF")
    private Integer intPAF;
    @Column(name = "str_RPSE_FRS", length = 20)
    private String strRPSEFRS;
    @Column(name = "int_STOCK")
    private Integer intSTOCK;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_RETOUR_FRS_ID", referencedColumnName = "lg_RETOUR_FRS_ID", nullable = false)
    @ManyToOne
    private TRetourFournisseur lgRETOURFRSID;
    @JoinColumn(name = "lg_MOTIF_RETOUR", referencedColumnName = "lg_MOTIF_RETOUR")
    @ManyToOne(optional = false)
    private TMotifRetour lgMOTIFRETOUR;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TFamille lgFAMILLEID;
    @ManyToOne
    @JoinColumn(name = "bonLivraisonDetail_id", referencedColumnName = "lg_BON_LIVRAISON_DETAIL")
    private TBonLivraisonDetail bonLivraisonDetail;

    public TRetourFournisseurDetail() {
    }

    public TRetourFournisseurDetail(String lgRETOURFRSDETAIL) {
        this.lgRETOURFRSDETAIL = lgRETOURFRSDETAIL;
    }

    public String getLgRETOURFRSDETAIL() {
        return lgRETOURFRSDETAIL;
    }

    public void setLgRETOURFRSDETAIL(String lgRETOURFRSDETAIL) {
        this.lgRETOURFRSDETAIL = lgRETOURFRSDETAIL;
    }

    public Integer getIntNUMBERANSWER() {
        return intNUMBERANSWER;
    }

    public void setIntNUMBERANSWER(Integer intNUMBERANSWER) {
        this.intNUMBERANSWER = intNUMBERANSWER;
    }

    public Integer getIntNUMBERRETURN() {
        return intNUMBERRETURN;
    }

    public void setIntNUMBERRETURN(Integer intNUMBERRETURN) {
        this.intNUMBERRETURN = intNUMBERRETURN;
    }

    public String getStrRPSEFRS() {
        return strRPSEFRS;
    }

    public void setStrRPSEFRS(String strRPSEFRS) {
        this.strRPSEFRS = strRPSEFRS;
    }

    public Integer getIntSTOCK() {
        return intSTOCK;
    }

    public void setIntSTOCK(Integer intSTOCK) {
        this.intSTOCK = intSTOCK;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public Integer getIntPAF() {
        return intPAF;
    }

    public void setIntPAF(Integer intPAF) {
        this.intPAF = intPAF;
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

    public TRetourFournisseur getLgRETOURFRSID() {
        return lgRETOURFRSID;
    }

    public void setLgRETOURFRSID(TRetourFournisseur lgRETOURFRSID) {
        this.lgRETOURFRSID = lgRETOURFRSID;
    }

    public TMotifRetour getLgMOTIFRETOUR() {
        return lgMOTIFRETOUR;

    }

    public void setLgMOTIFRETOUR(TMotifRetour lgMOTIFRETOUR) {
        this.lgMOTIFRETOUR = lgMOTIFRETOUR;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgRETOURFRSDETAIL != null ? lgRETOURFRSDETAIL.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TRetourFournisseurDetail)) {
            return false;
        }
        TRetourFournisseurDetail other = (TRetourFournisseurDetail) object;
        if ((this.lgRETOURFRSDETAIL == null && other.lgRETOURFRSDETAIL != null)
                || (this.lgRETOURFRSDETAIL != null && !this.lgRETOURFRSDETAIL.equals(other.lgRETOURFRSDETAIL))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TRetourFournisseurDetail[ lgRETOURFRSDETAIL=" + lgRETOURFRSDETAIL + " ]";
    }

    public TBonLivraisonDetail getBonLivraisonDetail() {
        return bonLivraisonDetail;
    }

    public void setBonLivraisonDetail(TBonLivraisonDetail bonLivraisonDetail) {
        this.bonLivraisonDetail = bonLivraisonDetail;
    }

}
