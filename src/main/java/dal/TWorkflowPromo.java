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
import javax.persistence.UniqueConstraint;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_workflow_promo", uniqueConstraints = { @UniqueConstraint(columnNames = { "lg_WORKFLOW_PROMO_ID" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TWorkflowPromo.findAll", query = "SELECT t FROM TWorkflowPromo t"),
        @NamedQuery(name = "TWorkflowPromo.findByLgWORKFLOWPROMOID", query = "SELECT t FROM TWorkflowPromo t WHERE t.lgWORKFLOWPROMOID = :lgWORKFLOWPROMOID"),
        @NamedQuery(name = "TWorkflowPromo.findByStrNAME", query = "SELECT t FROM TWorkflowPromo t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TWorkflowPromo.findByStrDESCRIPTION", query = "SELECT t FROM TWorkflowPromo t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TWorkflowPromo.findByDtCREATED", query = "SELECT t FROM TWorkflowPromo t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TWorkflowPromo.findByDtUPDATED", query = "SELECT t FROM TWorkflowPromo t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TWorkflowPromo.findByStrSTATUT", query = "SELECT t FROM TWorkflowPromo t WHERE t.strSTATUT = :strSTATUT") })
public class TWorkflowPromo implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_WORKFLOW_PROMO_ID", nullable = false, length = 40)
    private String lgWORKFLOWPROMOID;
    @Column(name = "str_NAME", length = 40)
    private String strNAME;
    @Column(name = "str_DESCRIPTION", length = 40)
    private String strDESCRIPTION;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;

    public TWorkflowPromo() {
    }

    public TWorkflowPromo(String lgWORKFLOWPROMOID) {
        this.lgWORKFLOWPROMOID = lgWORKFLOWPROMOID;
    }

    public String getLgWORKFLOWPROMOID() {
        return lgWORKFLOWPROMOID;
    }

    public void setLgWORKFLOWPROMOID(String lgWORKFLOWPROMOID) {
        this.lgWORKFLOWPROMOID = lgWORKFLOWPROMOID;
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

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgWORKFLOWPROMOID != null ? lgWORKFLOWPROMOID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TWorkflowPromo)) {
            return false;
        }
        TWorkflowPromo other = (TWorkflowPromo) object;
        if ((this.lgWORKFLOWPROMOID == null && other.lgWORKFLOWPROMOID != null)
                || (this.lgWORKFLOWPROMOID != null && !this.lgWORKFLOWPROMOID.equals(other.lgWORKFLOWPROMOID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TWorkflowPromo[ lgWORKFLOWPROMOID=" + lgWORKFLOWPROMOID + " ]";
    }

}
