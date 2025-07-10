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
import javax.persistence.UniqueConstraint;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_role_user", uniqueConstraints = { @UniqueConstraint(columnNames = { "lg_USER_ROLE_ID" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TRoleUser.findAll", query = "SELECT t FROM TRoleUser t"),
        @NamedQuery(name = "TRoleUser.findByLgUSERROLEID", query = "SELECT t FROM TRoleUser t WHERE t.lgUSERROLEID = :lgUSERROLEID"),
        @NamedQuery(name = "TRoleUser.findByDtCREATED", query = "SELECT t FROM TRoleUser t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TRoleUser.findByDtUPDATED", query = "SELECT t FROM TRoleUser t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TRoleUser.findByStrCREATEDBY", query = "SELECT t FROM TRoleUser t WHERE t.strCREATEDBY = :strCREATEDBY"),
        @NamedQuery(name = "TRoleUser.findByStrUPDATEDBY", query = "SELECT t FROM TRoleUser t WHERE t.strUPDATEDBY = :strUPDATEDBY") })
public class TRoleUser implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_USER_ROLE_ID", nullable = false, length = 40)
    private String lgUSERROLEID;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_CREATED_BY", length = 20)
    private String strCREATEDBY;
    @Column(name = "str_UPDATED_BY", length = 20)
    private String strUPDATEDBY;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERID;
    @JoinColumn(name = "lg_ROLE_ID", referencedColumnName = "lg_ROLE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TRole lgROLEID;

    public TRoleUser() {
    }

    public TRoleUser(String lgUSERROLEID) {
        this.lgUSERROLEID = lgUSERROLEID;
    }

    public String getLgUSERROLEID() {
        return lgUSERROLEID;
    }

    public void setLgUSERROLEID(String lgUSERROLEID) {
        this.lgUSERROLEID = lgUSERROLEID;
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

    public String getStrCREATEDBY() {
        return strCREATEDBY;
    }

    public void setStrCREATEDBY(String strCREATEDBY) {
        this.strCREATEDBY = strCREATEDBY;
    }

    public String getStrUPDATEDBY() {
        return strUPDATEDBY;
    }

    public void setStrUPDATEDBY(String strUPDATEDBY) {
        this.strUPDATEDBY = strUPDATEDBY;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TRole getLgROLEID() {
        return lgROLEID;
    }

    public void setLgROLEID(TRole lgROLEID) {
        this.lgROLEID = lgROLEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgUSERROLEID != null ? lgUSERROLEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TRoleUser)) {
            return false;
        }
        TRoleUser other = (TRoleUser) object;
        if ((this.lgUSERROLEID == null && other.lgUSERROLEID != null)
                || (this.lgUSERROLEID != null && !this.lgUSERROLEID.equals(other.lgUSERROLEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TRoleUser[ lgUSERROLEID=" + lgUSERROLEID + " ]";
    }

}
