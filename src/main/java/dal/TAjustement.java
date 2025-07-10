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
import javax.validation.constraints.NotNull;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_ajustement")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TAjustement.findAll", query = "SELECT t FROM TAjustement t"),
        @NamedQuery(name = "TAjustement.findByLgAJUSTEMENTID", query = "SELECT t FROM TAjustement t WHERE t.lgAJUSTEMENTID = :lgAJUSTEMENTID"),
        @NamedQuery(name = "TAjustement.findByStrNAME", query = "SELECT t FROM TAjustement t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TAjustement.findByStrCOMMENTAIRE", query = "SELECT t FROM TAjustement t WHERE t.strCOMMENTAIRE = :strCOMMENTAIRE"),
        @NamedQuery(name = "TAjustement.findByStrSTATUT", query = "SELECT t FROM TAjustement t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TAjustement.findByDtCREATED", query = "SELECT t FROM TAjustement t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TAjustement.findByDtUPDATED", query = "SELECT t FROM TAjustement t WHERE t.dtUPDATED = :dtUPDATED") })
public class TAjustement implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_AJUSTEMENT_ID", nullable = false, length = 40)
    private String lgAJUSTEMENTID;
    @Column(name = "str_NAME", length = 100)
    private String strNAME;
    @Column(name = "str_COMMENTAIRE", length = 100)
    private String strCOMMENTAIRE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgAJUSTEMENTID")
    private Collection<TAjustementDetail> tAjustementDetailCollection;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;

    public TAjustement() {
    }

    public TAjustement(String lgAJUSTEMENTID) {
        this.lgAJUSTEMENTID = lgAJUSTEMENTID;
    }

    public String getLgAJUSTEMENTID() {
        return lgAJUSTEMENTID;
    }

    public void setLgAJUSTEMENTID(String lgAJUSTEMENTID) {
        this.lgAJUSTEMENTID = lgAJUSTEMENTID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
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
    public Collection<TAjustementDetail> getTAjustementDetailCollection() {
        return tAjustementDetailCollection;
    }

    public void setTAjustementDetailCollection(Collection<TAjustementDetail> tAjustementDetailCollection) {
        this.tAjustementDetailCollection = tAjustementDetailCollection;
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
        hash += (lgAJUSTEMENTID != null ? lgAJUSTEMENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TAjustement)) {
            return false;
        }
        TAjustement other = (TAjustement) object;
        if ((this.lgAJUSTEMENTID == null && other.lgAJUSTEMENTID != null)
                || (this.lgAJUSTEMENTID != null && !this.lgAJUSTEMENTID.equals(other.lgAJUSTEMENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TAjustement[ lgAJUSTEMENTID=" + lgAJUSTEMENTID + " ]";
    }

}
