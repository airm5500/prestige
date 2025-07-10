/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package dal;

import java.io.Serializable;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_alert_event_user_fone")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TAlertEventUserFone.findAll", query = "SELECT t FROM TAlertEventUserFone t"),
        @NamedQuery(name = "TAlertEventUserFone.findByLgID", query = "SELECT t FROM TAlertEventUserFone t WHERE t.lgID = :lgID"),
        @NamedQuery(name = "TAlertEventUserFone.findByStrSTATUT", query = "SELECT t FROM TAlertEventUserFone t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TAlertEventUserFone.findByDtCREATED", query = "SELECT t FROM TAlertEventUserFone t WHERE t.dtCREATED = :dtCREATED") })
public class TAlertEventUserFone implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ID", nullable = false, length = 20)
    private String lgID;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED", length = 20)
    private String dtCREATED;
    @JoinColumn(name = "lg_USER_FONE_ID", referencedColumnName = "lg_USER_FONE_ID")
    @ManyToOne
    private TUserFone lgUSERFONEID;
    @JoinColumn(name = "str_Event", referencedColumnName = "str_Event")
    @ManyToOne
    private TAlertEvent strEvent;

    public TAlertEventUserFone() {
    }

    public TAlertEventUserFone(String lgID) {
        this.lgID = lgID;
    }

    public String getLgID() {
        return lgID;
    }

    public void setLgID(String lgID) {
        this.lgID = lgID;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public String getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(String dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public TUserFone getLgUSERFONEID() {
        return lgUSERFONEID;
    }

    public void setLgUSERFONEID(TUserFone lgUSERFONEID) {
        this.lgUSERFONEID = lgUSERFONEID;
    }

    public TAlertEvent getStrEvent() {
        return strEvent;
    }

    public void setStrEvent(TAlertEvent strEvent) {
        this.strEvent = strEvent;
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
        if (!(object instanceof TAlertEventUserFone)) {
            return false;
        }
        TAlertEventUserFone other = (TAlertEventUserFone) object;
        if ((this.lgID == null && other.lgID != null) || (this.lgID != null && !this.lgID.equals(other.lgID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TAlertEventUserFone[ lgID=" + lgID + " ]";
    }

}
