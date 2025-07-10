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
import javax.persistence.Lob;
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
@Table(name = "t_inventaire")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TInventaire.findAll", query = "SELECT t FROM TInventaire t"),
        @NamedQuery(name = "TInventaire.findByLgINVENTAIREID", query = "SELECT t FROM TInventaire t WHERE t.lgINVENTAIREID = :lgINVENTAIREID"),
        @NamedQuery(name = "TInventaire.findByStrNAME", query = "SELECT t FROM TInventaire t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TInventaire.findByStrSTATUT", query = "SELECT t FROM TInventaire t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TInventaire.findByDtCREATED", query = "SELECT t FROM TInventaire t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TInventaire.findByDtUPDATED", query = "SELECT t FROM TInventaire t WHERE t.dtUPDATED = :dtUPDATED") })
public class TInventaire implements Serializable {

    @JoinColumn(name = "lg_EMPLACEMENT_ID", referencedColumnName = "lg_EMPLACEMENT_ID")
    @ManyToOne
    private TEmplacement lgEMPLACEMENTID;

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_INVENTAIRE_ID", nullable = false, length = 40)
    private String lgINVENTAIREID;
    @Column(name = "str_NAME", length = 50)
    private String strNAME;
    @Lob
    @Column(name = "str_DESCRIPTION", length = 65535)
    private String strDESCRIPTION;
    @Lob
    @Column(name = "str_TYPE", length = 65535)
    private String strTYPE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgINVENTAIREID")
    private Collection<TInventaireFamille> tInventaireFamilleCollection;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne(optional = false)
    private TUser lgUSERID;

    public TInventaire() {
    }

    public TInventaire(String lgINVENTAIREID) {
        this.lgINVENTAIREID = lgINVENTAIREID;
    }

    public String getLgINVENTAIREID() {
        return lgINVENTAIREID;
    }

    public void setLgINVENTAIREID(String lgINVENTAIREID) {
        this.lgINVENTAIREID = lgINVENTAIREID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getStrTYPE() {
        return strTYPE;
    }

    public void setStrTYPE(String strTYPE) {
        this.strTYPE = strTYPE;
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

    @XmlTransient
    public Collection<TInventaireFamille> getTInventaireFamilleCollection() {
        return tInventaireFamilleCollection;
    }

    public void setTInventaireFamilleCollection(Collection<TInventaireFamille> tInventaireFamilleCollection) {
        this.tInventaireFamilleCollection = tInventaireFamilleCollection;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgINVENTAIREID != null ? lgINVENTAIREID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TInventaire)) {
            return false;
        }
        TInventaire other = (TInventaire) object;
        if ((this.lgINVENTAIREID == null && other.lgINVENTAIREID != null)
                || (this.lgINVENTAIREID != null && !this.lgINVENTAIREID.equals(other.lgINVENTAIREID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TInventaire[ lgINVENTAIREID=" + lgINVENTAIREID + " ]";
    }

    public TEmplacement getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public void setLgEMPLACEMENTID(TEmplacement lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
    }

}
