/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package dal;

import java.io.Serializable;
import java.util.Collection;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_retour_fournisseur")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TRetourFournisseur.findAll", query = "SELECT t FROM TRetourFournisseur t"),
        @NamedQuery(name = "TRetourFournisseur.findByLgRETOURFRSID", query = "SELECT t FROM TRetourFournisseur t WHERE t.lgRETOURFRSID = :lgRETOURFRSID"),
        @NamedQuery(name = "TRetourFournisseur.findByStrREFRETOURFRS", query = "SELECT t FROM TRetourFournisseur t WHERE t.strREFRETOURFRS = :strREFRETOURFRS"),
        @NamedQuery(name = "TRetourFournisseur.findByDtDATE", query = "SELECT t FROM TRetourFournisseur t WHERE t.dtDATE = :dtDATE"),
        @NamedQuery(name = "TRetourFournisseur.findByStrCOMMENTAIRE", query = "SELECT t FROM TRetourFournisseur t WHERE t.strCOMMENTAIRE = :strCOMMENTAIRE"),
        @NamedQuery(name = "TRetourFournisseur.findByStrSTATUT", query = "SELECT t FROM TRetourFournisseur t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TRetourFournisseur.findByDtUPDATED", query = "SELECT t FROM TRetourFournisseur t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TRetourFournisseur.findByDtCREATED", query = "SELECT t FROM TRetourFournisseur t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TRetourFournisseur.findByDlAMOUNT", query = "SELECT t FROM TRetourFournisseur t WHERE t.dlAMOUNT = :dlAMOUNT") })
public class TRetourFournisseur implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_RETOUR_FRS_ID", nullable = false, length = 40)
    private String lgRETOURFRSID;
    @Column(name = "str_REF_RETOUR_FRS", length = 20)
    private String strREFRETOURFRS;
    @Column(name = "dt_DATE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtDATE;
    @Column(name = "str_REPONSE_FRS", length = 255)
    private String strREPONSEFRS;
    @Column(name = "str_COMMENTAIRE", length = 50)
    private String strCOMMENTAIRE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dl_AMOUNT", precision = 15, scale = 0)
    private Double dlAMOUNT;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @JoinColumn(name = "lg_GROSSISTE_ID", referencedColumnName = "lg_GROSSISTE_ID")
    @ManyToOne
    private TGrossiste lgGROSSISTEID;
    @JoinColumn(name = "lg_BON_LIVRAISON_ID", referencedColumnName = "lg_BON_LIVRAISON_ID")
    @ManyToOne
    private TBonLivraison lgBONLIVRAISONID;
    @OneToMany(mappedBy = "lgRETOURFRSID")
    private Collection<TRetourFournisseurDetail> tRetourFournisseurDetailCollection;

    public TRetourFournisseur() {
    }

    public TRetourFournisseur(String lgRETOURFRSID) {
        this.lgRETOURFRSID = lgRETOURFRSID;
    }

    public String getLgRETOURFRSID() {
        return lgRETOURFRSID;
    }

    public void setLgRETOURFRSID(String lgRETOURFRSID) {
        this.lgRETOURFRSID = lgRETOURFRSID;
    }

    public String getStrREFRETOURFRS() {
        return strREFRETOURFRS;
    }

    public void setStrREFRETOURFRS(String strREFRETOURFRS) {
        this.strREFRETOURFRS = strREFRETOURFRS;
    }

    public Date getDtDATE() {
        return dtDATE;
    }

    public void setDtDATE(Date dtDATE) {
        this.dtDATE = dtDATE;
    }

    public String getStrREPONSEFRS() {
        return strREPONSEFRS;
    }

    public void setStrREPONSEFRS(String strREPONSEFRS) {
        this.strREPONSEFRS = strREPONSEFRS;
    }

    public String getStrCOMMENTAIRE() {
        return strCOMMENTAIRE;
    }

    public void setStrCOMMENTAIRE(String strCOMMENTAIRE) {
        this.strCOMMENTAIRE = strCOMMENTAIRE;
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

    public Double getDlAMOUNT() {
        return dlAMOUNT;
    }

    public void setDlAMOUNT(Double dlAMOUNT) {
        this.dlAMOUNT = dlAMOUNT;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TGrossiste getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public void setLgGROSSISTEID(TGrossiste lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    public TBonLivraison getLgBONLIVRAISONID() {
        return lgBONLIVRAISONID;
    }

    public void setLgBONLIVRAISONID(TBonLivraison lgBONLIVRAISONID) {
        this.lgBONLIVRAISONID = lgBONLIVRAISONID;
    }

    @XmlTransient
    public Collection<TRetourFournisseurDetail> getTRetourFournisseurDetailCollection() {
        return tRetourFournisseurDetailCollection;
    }

    public void setTRetourFournisseurDetailCollection(
            Collection<TRetourFournisseurDetail> tRetourFournisseurDetailCollection) {
        this.tRetourFournisseurDetailCollection = tRetourFournisseurDetailCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgRETOURFRSID != null ? lgRETOURFRSID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TRetourFournisseur)) {
            return false;
        }
        TRetourFournisseur other = (TRetourFournisseur) object;
        if ((this.lgRETOURFRSID == null && other.lgRETOURFRSID != null)
                || (this.lgRETOURFRSID != null && !this.lgRETOURFRSID.equals(other.lgRETOURFRSID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TRetourFournisseur[ lgRETOURFRSID=" + lgRETOURFRSID + " ]";
    }

}
