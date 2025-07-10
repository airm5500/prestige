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
@Table(name = "t_user_fone")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TUserFone.findAll", query = "SELECT t FROM TUserFone t"),
        @NamedQuery(name = "TUserFone.findByLgUSERFONEID", query = "SELECT t FROM TUserFone t WHERE t.lgUSERFONEID = :lgUSERFONEID"),
        @NamedQuery(name = "TUserFone.findByDtUPDATED", query = "SELECT t FROM TUserFone t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TUserFone.findByStrSTATUT", query = "SELECT t FROM TUserFone t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TUserFone.findByDtCREATED", query = "SELECT t FROM TUserFone t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TUserFone.findByStrPHONE", query = "SELECT t FROM TUserFone t WHERE t.strPHONE = :strPHONE") })
public class TUserFone implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_USER_FONE_ID", nullable = false, length = 30)
    private String lgUSERFONEID;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "str_PHONE", length = 20)
    private String strPHONE;
    @OneToMany(mappedBy = "lgUSERFONEID")
    private Collection<TAlertEventUserFone> tAlertEventUserFoneCollection;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne(optional = false)
    private TUser lgUSERID;

    public TUserFone() {
    }

    public TUserFone(String lgUSERFONEID) {
        this.lgUSERFONEID = lgUSERFONEID;
    }

    public String getLgUSERFONEID() {
        return lgUSERFONEID;
    }

    public void setLgUSERFONEID(String lgUSERFONEID) {
        this.lgUSERFONEID = lgUSERFONEID;
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

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getStrPHONE() {
        return strPHONE;
    }

    public void setStrPHONE(String strPHONE) {
        this.strPHONE = strPHONE;
    }

    @XmlTransient
    public Collection<TAlertEventUserFone> getTAlertEventUserFoneCollection() {
        return tAlertEventUserFoneCollection;
    }

    public void setTAlertEventUserFoneCollection(Collection<TAlertEventUserFone> tAlertEventUserFoneCollection) {
        this.tAlertEventUserFoneCollection = tAlertEventUserFoneCollection;
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
        hash += (lgUSERFONEID != null ? lgUSERFONEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TUserFone)) {
            return false;
        }
        TUserFone other = (TUserFone) object;
        if ((this.lgUSERFONEID == null && other.lgUSERFONEID != null)
                || (this.lgUSERFONEID != null && !this.lgUSERFONEID.equals(other.lgUSERFONEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TUserFone[ lgUSERFONEID=" + lgUSERFONEID + " ]";
    }

}
