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
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_dossier_reglement_detail")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TDossierReglementDetail.findAll", query = "SELECT t FROM TDossierReglementDetail t"),
        @NamedQuery(name = "TDossierReglementDetail.findByLgDOSSIERREGLEMENTDETAILID", query = "SELECT t FROM TDossierReglementDetail t WHERE t.lgDOSSIERREGLEMENTDETAILID = :lgDOSSIERREGLEMENTDETAILID"),
        @NamedQuery(name = "TDossierReglementDetail.findByStrREF", query = "SELECT t FROM TDossierReglementDetail t WHERE t.strREF = :strREF"),
        @NamedQuery(name = "TDossierReglementDetail.findByDblAMOUNT", query = "SELECT t FROM TDossierReglementDetail t WHERE t.dblAMOUNT = :dblAMOUNT"),
        @NamedQuery(name = "TDossierReglementDetail.findByStrSTATUT", query = "SELECT t FROM TDossierReglementDetail t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TDossierReglementDetail.findByDtUPDATED", query = "SELECT t FROM TDossierReglementDetail t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TDossierReglementDetail.findByDtCREATED", query = "SELECT t FROM TDossierReglementDetail t WHERE t.dtCREATED = :dtCREATED") })
public class TDossierReglementDetail implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_DOSSIER_REGLEMENT_DETAIL_ID", nullable = false, length = 40)
    private String lgDOSSIERREGLEMENTDETAILID;
    @Column(name = "str_REF", length = 40)
    private String strREF;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_AMOUNT", precision = 15, scale = 3)
    private Double dblAMOUNT;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @JoinColumn(name = "lg_FACTURE_DETAIL_ID", referencedColumnName = "lg_FACTURE_DETAIL_ID")
    @ManyToOne
    private TFactureDetail lgFACTUREDETAILID;
    @JoinColumn(name = "lg_DOSSIER_REGLEMENT_ID", referencedColumnName = "lg_DOSSIER_REGLEMENT_ID")
    @ManyToOne
    private TDossierReglement lgDOSSIERREGLEMENTID;

    public TDossierReglementDetail() {
    }

    public TDossierReglementDetail(String lgDOSSIERREGLEMENTDETAILID) {
        this.lgDOSSIERREGLEMENTDETAILID = lgDOSSIERREGLEMENTDETAILID;
    }

    public String getLgDOSSIERREGLEMENTDETAILID() {
        return lgDOSSIERREGLEMENTDETAILID;
    }

    public void setLgDOSSIERREGLEMENTDETAILID(String lgDOSSIERREGLEMENTDETAILID) {
        this.lgDOSSIERREGLEMENTDETAILID = lgDOSSIERREGLEMENTDETAILID;
    }

    public String getStrREF() {
        return strREF;
    }

    public void setStrREF(String strREF) {
        this.strREF = strREF;
    }

    public Double getDblAMOUNT() {
        return dblAMOUNT;
    }

    public void setDblAMOUNT(Double dblAMOUNT) {
        this.dblAMOUNT = dblAMOUNT;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public TFactureDetail getLgFACTUREDETAILID() {
        return lgFACTUREDETAILID;
    }

    public void setLgFACTUREDETAILID(TFactureDetail lgFACTUREDETAILID) {
        this.lgFACTUREDETAILID = lgFACTUREDETAILID;
    }

    public TDossierReglement getLgDOSSIERREGLEMENTID() {
        return lgDOSSIERREGLEMENTID;
    }

    public void setLgDOSSIERREGLEMENTID(TDossierReglement lgDOSSIERREGLEMENTID) {
        this.lgDOSSIERREGLEMENTID = lgDOSSIERREGLEMENTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgDOSSIERREGLEMENTDETAILID != null ? lgDOSSIERREGLEMENTDETAILID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TDossierReglementDetail)) {
            return false;
        }
        TDossierReglementDetail other = (TDossierReglementDetail) object;
        if ((this.lgDOSSIERREGLEMENTDETAILID == null && other.lgDOSSIERREGLEMENTDETAILID != null)
                || (this.lgDOSSIERREGLEMENTDETAILID != null
                        && !this.lgDOSSIERREGLEMENTDETAILID.equals(other.lgDOSSIERREGLEMENTDETAILID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TDossierReglementDetail[ lgDOSSIERREGLEMENTDETAILID=" + lgDOSSIERREGLEMENTDETAILID + " ]";
    }

}
