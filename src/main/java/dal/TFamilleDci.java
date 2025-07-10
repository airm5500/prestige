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
@Table(name = "t_famille_dci")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TFamilleDci.findAll", query = "SELECT t FROM TFamilleDci t"),
        @NamedQuery(name = "TFamilleDci.findByLgFAMILLEDCIID", query = "SELECT t FROM TFamilleDci t WHERE t.lgFAMILLEDCIID = :lgFAMILLEDCIID"),
        @NamedQuery(name = "TFamilleDci.findByStrSTATUT", query = "SELECT t FROM TFamilleDci t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TFamilleDci.findByDtCREATED", query = "SELECT t FROM TFamilleDci t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TFamilleDci.findByDtUPDATED", query = "SELECT t FROM TFamilleDci t WHERE t.dtUPDATED = :dtUPDATED") })
public class TFamilleDci implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_FAMILLE_DCI_ID", nullable = false, length = 40)
    private String lgFAMILLEDCIID;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_DCI_ID", referencedColumnName = "lg_DCI_ID", nullable = false)
    @ManyToOne(optional = false)
    private TDci lgDCIID;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TFamille lgFAMILLEID;

    public TFamilleDci() {
    }

    public TFamilleDci(String lgFAMILLEDCIID) {
        this.lgFAMILLEDCIID = lgFAMILLEDCIID;
    }

    public String getLgFAMILLEDCIID() {
        return lgFAMILLEDCIID;
    }

    public void setLgFAMILLEDCIID(String lgFAMILLEDCIID) {
        this.lgFAMILLEDCIID = lgFAMILLEDCIID;
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

    public TDci getLgDCIID() {
        return lgDCIID;
    }

    public void setLgDCIID(TDci lgDCIID) {
        this.lgDCIID = lgDCIID;
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
        hash += (lgFAMILLEDCIID != null ? lgFAMILLEDCIID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TFamilleDci)) {
            return false;
        }
        TFamilleDci other = (TFamilleDci) object;
        if ((this.lgFAMILLEDCIID == null && other.lgFAMILLEDCIID != null)
                || (this.lgFAMILLEDCIID != null && !this.lgFAMILLEDCIID.equals(other.lgFAMILLEDCIID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TFamilleDci[ lgFAMILLEDCIID=" + lgFAMILLEDCIID + " ]";
    }

}
