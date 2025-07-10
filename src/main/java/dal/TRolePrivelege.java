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
@Table(name = "t_role_privelege", uniqueConstraints = { @UniqueConstraint(columnNames = { "lg_ROLE_PRIVILEGE" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TRolePrivelege.findAll", query = "SELECT t FROM TRolePrivelege t"),
        @NamedQuery(name = "TRolePrivelege.findByLgROLEPRIVILEGE", query = "SELECT t FROM TRolePrivelege t WHERE t.lgROLEPRIVILEGE = :lgROLEPRIVILEGE"),
        @NamedQuery(name = "TRolePrivelege.findByDtCREATED", query = "SELECT t FROM TRolePrivelege t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TRolePrivelege.findByStrCREATEDBY", query = "SELECT t FROM TRolePrivelege t WHERE t.strCREATEDBY = :strCREATEDBY"),
        @NamedQuery(name = "TRolePrivelege.findByDtUPDATED", query = "SELECT t FROM TRolePrivelege t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TRolePrivelege.findByStrUPDATEDBY", query = "SELECT t FROM TRolePrivelege t WHERE t.strUPDATEDBY = :strUPDATEDBY") })
public class TRolePrivelege implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ROLE_PRIVILEGE", nullable = false, length = 40)
    private String lgROLEPRIVILEGE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "str_CREATED_BY", length = 20)
    private String strCREATEDBY;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_UPDATED_BY", length = 20)
    private String strUPDATEDBY;
    @JoinColumn(name = "lg_PRIVILEGE_ID", referencedColumnName = "lg_PRIVELEGE_ID")
    @ManyToOne
    private TPrivilege lgPRIVILEGEID;
    @JoinColumn(name = "lg_ROLE_ID", referencedColumnName = "lg_ROLE_ID")
    @ManyToOne
    private TRole lgROLEID;

    public TRolePrivelege() {
    }

    public TRolePrivelege(String lgROLEPRIVILEGE) {
        this.lgROLEPRIVILEGE = lgROLEPRIVILEGE;
    }

    public String getLgROLEPRIVILEGE() {
        return lgROLEPRIVILEGE;
    }

    public void setLgROLEPRIVILEGE(String lgROLEPRIVILEGE) {
        this.lgROLEPRIVILEGE = lgROLEPRIVILEGE;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getStrCREATEDBY() {
        return strCREATEDBY;
    }

    public void setStrCREATEDBY(String strCREATEDBY) {
        this.strCREATEDBY = strCREATEDBY;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public String getStrUPDATEDBY() {
        return strUPDATEDBY;
    }

    public void setStrUPDATEDBY(String strUPDATEDBY) {
        this.strUPDATEDBY = strUPDATEDBY;
    }

    public TPrivilege getLgPRIVILEGEID() {
        return lgPRIVILEGEID;
    }

    public void setLgPRIVILEGEID(TPrivilege lgPRIVILEGEID) {
        this.lgPRIVILEGEID = lgPRIVILEGEID;
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
        hash += (lgROLEPRIVILEGE != null ? lgROLEPRIVILEGE.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TRolePrivelege)) {
            return false;
        }
        TRolePrivelege other = (TRolePrivelege) object;
        if ((this.lgROLEPRIVILEGE == null && other.lgROLEPRIVILEGE != null)
                || (this.lgROLEPRIVILEGE != null && !this.lgROLEPRIVILEGE.equals(other.lgROLEPRIVILEGE))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TRolePrivelege[ lgROLEPRIVILEGE=" + lgROLEPRIVILEGE + " ]";
    }

}
