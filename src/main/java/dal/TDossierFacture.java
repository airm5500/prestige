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
@Table(name = "t_dossier_facture")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TDossierFacture.findAll", query = "SELECT t FROM TDossierFacture t"),
        @NamedQuery(name = "TDossierFacture.findByLgDOSSIERFACTUREID", query = "SELECT t FROM TDossierFacture t WHERE t.lgDOSSIERFACTUREID = :lgDOSSIERFACTUREID"),
        @NamedQuery(name = "TDossierFacture.findByStrNUMDOSSIER", query = "SELECT t FROM TDossierFacture t WHERE t.strNUMDOSSIER = :strNUMDOSSIER"),
        @NamedQuery(name = "TDossierFacture.findByDblMONTANT", query = "SELECT t FROM TDossierFacture t WHERE t.dblMONTANT = :dblMONTANT"),
        @NamedQuery(name = "TDossierFacture.findByDblMONTANTREGLE", query = "SELECT t FROM TDossierFacture t WHERE t.dblMONTANTREGLE = :dblMONTANTREGLE"),
        @NamedQuery(name = "TDossierFacture.findByDblMONTANTRESTANT", query = "SELECT t FROM TDossierFacture t WHERE t.dblMONTANTRESTANT = :dblMONTANTRESTANT"),
        @NamedQuery(name = "TDossierFacture.findByStrTIERSPAYANT", query = "SELECT t FROM TDossierFacture t WHERE t.strTIERSPAYANT = :strTIERSPAYANT"),
        @NamedQuery(name = "TDossierFacture.findByIntNBTRANSACT", query = "SELECT t FROM TDossierFacture t WHERE t.intNBTRANSACT = :intNBTRANSACT"),
        @NamedQuery(name = "TDossierFacture.findByStrCUSTOMER", query = "SELECT t FROM TDossierFacture t WHERE t.strCUSTOMER = :strCUSTOMER"),
        @NamedQuery(name = "TDossierFacture.findByStrLASTREFREGLEMENTDOSSIER", query = "SELECT t FROM TDossierFacture t WHERE t.strLASTREFREGLEMENTDOSSIER = :strLASTREFREGLEMENTDOSSIER"),
        @NamedQuery(name = "TDossierFacture.findByStrSTATUT", query = "SELECT t FROM TDossierFacture t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TDossierFacture.findByDtCREATED", query = "SELECT t FROM TDossierFacture t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TDossierFacture.findByDtUPDATED", query = "SELECT t FROM TDossierFacture t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TDossierFacture.findByDtDATE", query = "SELECT t FROM TDossierFacture t WHERE t.dtDATE = :dtDATE"),
        @NamedQuery(name = "TDossierFacture.findByBISCONFLIT", query = "SELECT t FROM TDossierFacture t WHERE t.bISCONFLIT = :bISCONFLIT") })
public class TDossierFacture implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_DOSSIER_FACTURE_ID", nullable = false, length = 40)
    private String lgDOSSIERFACTUREID;
    @Column(name = "str_NUM_DOSSIER", length = 40)
    private String strNUMDOSSIER;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_MONTANT", precision = 15, scale = 3)
    private Double dblMONTANT;
    @Column(name = "dbl_MONTANT_REGLE", precision = 15, scale = 3)
    private Double dblMONTANTREGLE;
    @Column(name = "dbl_MONTANT_RESTANT", precision = 15, scale = 3)
    private Double dblMONTANTRESTANT;
    @Column(name = "str_TIERS_PAYANT", length = 40)
    private String strTIERSPAYANT;
    @Column(name = "int_NB_TRANSACT")
    private Integer intNBTRANSACT;
    @Column(name = "str_CUSTOMER", length = 40)
    private String strCUSTOMER;
    @Column(name = "str_LAST_REF_REGLEMENT_DOSSIER", length = 40)
    private String strLASTREFREGLEMENTDOSSIER;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "dt_DATE")
    @Temporal(TemporalType.DATE)
    private Date dtDATE;
    @Column(name = "b_IS_CONFLIT")
    private Short bISCONFLIT;

    public TDossierFacture() {
    }

    public TDossierFacture(String lgDOSSIERFACTUREID) {
        this.lgDOSSIERFACTUREID = lgDOSSIERFACTUREID;
    }

    public String getLgDOSSIERFACTUREID() {
        return lgDOSSIERFACTUREID;
    }

    public void setLgDOSSIERFACTUREID(String lgDOSSIERFACTUREID) {
        this.lgDOSSIERFACTUREID = lgDOSSIERFACTUREID;
    }

    public String getStrNUMDOSSIER() {
        return strNUMDOSSIER;
    }

    public void setStrNUMDOSSIER(String strNUMDOSSIER) {
        this.strNUMDOSSIER = strNUMDOSSIER;
    }

    public Double getDblMONTANT() {
        return dblMONTANT;
    }

    public void setDblMONTANT(Double dblMONTANT) {
        this.dblMONTANT = dblMONTANT;
    }

    public Double getDblMONTANTREGLE() {
        return dblMONTANTREGLE;
    }

    public void setDblMONTANTREGLE(Double dblMONTANTREGLE) {
        this.dblMONTANTREGLE = dblMONTANTREGLE;
    }

    public Double getDblMONTANTRESTANT() {
        return dblMONTANTRESTANT;
    }

    public void setDblMONTANTRESTANT(Double dblMONTANTRESTANT) {
        this.dblMONTANTRESTANT = dblMONTANTRESTANT;
    }

    public String getStrTIERSPAYANT() {
        return strTIERSPAYANT;
    }

    public void setStrTIERSPAYANT(String strTIERSPAYANT) {
        this.strTIERSPAYANT = strTIERSPAYANT;
    }

    public Integer getIntNBTRANSACT() {
        return intNBTRANSACT;
    }

    public void setIntNBTRANSACT(Integer intNBTRANSACT) {
        this.intNBTRANSACT = intNBTRANSACT;
    }

    public String getStrCUSTOMER() {
        return strCUSTOMER;
    }

    public void setStrCUSTOMER(String strCUSTOMER) {
        this.strCUSTOMER = strCUSTOMER;
    }

    public String getStrLASTREFREGLEMENTDOSSIER() {
        return strLASTREFREGLEMENTDOSSIER;
    }

    public void setStrLASTREFREGLEMENTDOSSIER(String strLASTREFREGLEMENTDOSSIER) {
        this.strLASTREFREGLEMENTDOSSIER = strLASTREFREGLEMENTDOSSIER;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
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

    public Date getDtDATE() {
        return dtDATE;
    }

    public void setDtDATE(Date dtDATE) {
        this.dtDATE = dtDATE;
    }

    public Short getBISCONFLIT() {
        return bISCONFLIT;
    }

    public void setBISCONFLIT(Short bISCONFLIT) {
        this.bISCONFLIT = bISCONFLIT;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgDOSSIERFACTUREID != null ? lgDOSSIERFACTUREID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TDossierFacture)) {
            return false;
        }
        TDossierFacture other = (TDossierFacture) object;
        if ((this.lgDOSSIERFACTUREID == null && other.lgDOSSIERFACTUREID != null)
                || (this.lgDOSSIERFACTUREID != null && !this.lgDOSSIERFACTUREID.equals(other.lgDOSSIERFACTUREID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TDossierFacture[ lgDOSSIERFACTUREID=" + lgDOSSIERFACTUREID + " ]";
    }

}
