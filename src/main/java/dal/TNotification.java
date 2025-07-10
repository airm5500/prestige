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
import javax.persistence.Lob;
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
@Table(name = "t_notification")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TNotification.findAll", query = "SELECT t FROM TNotification t"),
        @NamedQuery(name = "TNotification.findByLgID", query = "SELECT t FROM TNotification t WHERE t.lgID = :lgID"),
        @NamedQuery(name = "TNotification.findByStrDESCRIPTION", query = "SELECT t FROM TNotification t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TNotification.findByDtCREATED", query = "SELECT t FROM TNotification t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TNotification.findByDtUPDATED", query = "SELECT t FROM TNotification t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TNotification.findByStrSTATUT", query = "SELECT t FROM TNotification t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TNotification.findByStrTYPE", query = "SELECT t FROM TNotification t WHERE t.strTYPE = :strTYPE"),
        @NamedQuery(name = "TNotification.findByStrREFRESSOURCE", query = "SELECT t FROM TNotification t WHERE t.strREFRESSOURCE = :strREFRESSOURCE") })
public class TNotification implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ID", nullable = false, length = 40)
    private String lgID;
    @Column(name = "str_DESCRIPTION", length = 200)
    private String strDESCRIPTION;
    @Lob
    @Column(name = "str_CONTENT", length = 65535)
    private String strCONTENT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "str_TYPE", length = 40)
    private String strTYPE;
    @Column(name = "str_REF_RESSOURCE", length = 40)
    private String strREFRESSOURCE;
    @JoinColumn(name = "lg_USER_ID_OUT", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERIDOUT;
    @JoinColumn(name = "lg_USER_ID_IN", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERIDIN;

    public TNotification() {
    }

    public TNotification(String lgID) {
        this.lgID = lgID;
    }

    public String getLgID() {
        return lgID;
    }

    public void setLgID(String lgID) {
        this.lgID = lgID;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getStrCONTENT() {
        return strCONTENT;
    }

    public void setStrCONTENT(String strCONTENT) {
        this.strCONTENT = strCONTENT;
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

    public String getStrTYPE() {
        return strTYPE;
    }

    public void setStrTYPE(String strTYPE) {
        this.strTYPE = strTYPE;
    }

    public String getStrREFRESSOURCE() {
        return strREFRESSOURCE;
    }

    public void setStrREFRESSOURCE(String strREFRESSOURCE) {
        this.strREFRESSOURCE = strREFRESSOURCE;
    }

    public TUser getLgUSERIDOUT() {
        return lgUSERIDOUT;
    }

    public void setLgUSERIDOUT(TUser lgUSERIDOUT) {
        this.lgUSERIDOUT = lgUSERIDOUT;
    }

    public TUser getLgUSERIDIN() {
        return lgUSERIDIN;
    }

    public void setLgUSERIDIN(TUser lgUSERIDIN) {
        this.lgUSERIDIN = lgUSERIDIN;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgID != null ? lgID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TNotification)) {
            return false;
        }
        TNotification other = (TNotification) object;
        if ((this.lgID == null && other.lgID != null) || (this.lgID != null && !this.lgID.equals(other.lgID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TNotification[ lgID=" + lgID + " ]";
    }

}
