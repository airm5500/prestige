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
@Table(name = "t_deconditionnement")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TDeconditionnement.findAll", query = "SELECT t FROM TDeconditionnement t"),
        @NamedQuery(name = "TDeconditionnement.findByLgDECONDITIONNEMENTID", query = "SELECT t FROM TDeconditionnement t WHERE t.lgDECONDITIONNEMENTID = :lgDECONDITIONNEMENTID"),
        @NamedQuery(name = "TDeconditionnement.findByStrSTATUT", query = "SELECT t FROM TDeconditionnement t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TDeconditionnement.findByIntNUMBER", query = "SELECT t FROM TDeconditionnement t WHERE t.intNUMBER = :intNUMBER"),
        @NamedQuery(name = "TDeconditionnement.findByDtCREATED", query = "SELECT t FROM TDeconditionnement t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TDeconditionnement.findByDtUPDATED", query = "SELECT t FROM TDeconditionnement t WHERE t.dtUPDATED = :dtUPDATED") })
public class TDeconditionnement implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_DECONDITIONNEMENT_ID", nullable = false, length = 40)
    private String lgDECONDITIONNEMENTID;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;

    public TDeconditionnement() {
    }

    public TDeconditionnement(String lgDECONDITIONNEMENTID) {
        this.lgDECONDITIONNEMENTID = lgDECONDITIONNEMENTID;
    }

    public String getLgDECONDITIONNEMENTID() {
        return lgDECONDITIONNEMENTID;
    }

    public void setLgDECONDITIONNEMENTID(String lgDECONDITIONNEMENTID) {
        this.lgDECONDITIONNEMENTID = lgDECONDITIONNEMENTID;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
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

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgDECONDITIONNEMENTID != null ? lgDECONDITIONNEMENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TDeconditionnement)) {
            return false;
        }
        TDeconditionnement other = (TDeconditionnement) object;
        if ((this.lgDECONDITIONNEMENTID == null && other.lgDECONDITIONNEMENTID != null)
                || (this.lgDECONDITIONNEMENTID != null
                        && !this.lgDECONDITIONNEMENTID.equals(other.lgDECONDITIONNEMENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TDeconditionnement[ lgDECONDITIONNEMENTID=" + lgDECONDITIONNEMENTID + " ]";
    }

}
