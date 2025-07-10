/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.UniqueConstraint;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_role", uniqueConstraints = { @UniqueConstraint(columnNames = { "lg_ROLE_ID" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TRole.findAll", query = "SELECT t FROM TRole t"),
        @NamedQuery(name = "TRole.findByLgROLEID", query = "SELECT t FROM TRole t WHERE t.lgROLEID = :lgROLEID"),
        @NamedQuery(name = "TRole.findByStrNAME", query = "SELECT t FROM TRole t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TRole.findByStrDESIGNATION", query = "SELECT t FROM TRole t WHERE t.strDESIGNATION = :strDESIGNATION"),
        @NamedQuery(name = "TRole.findByStrTYPE", query = "SELECT t FROM TRole t WHERE t.strTYPE = :strTYPE"),
        @NamedQuery(name = "TRole.findByStrSTATUT", query = "SELECT t FROM TRole t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TRole.findByDtCREATED", query = "SELECT t FROM TRole t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TRole.findByDtUPDATED", query = "SELECT t FROM TRole t WHERE t.dtUPDATED = :dtUPDATED") })
public class TRole implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ROLE_ID", nullable = false, length = 40)
    private String lgROLEID;
    @Column(name = "str_NAME", length = 50)
    private String strNAME;
    @Column(name = "str_DESIGNATION", length = 50)
    private String strDESIGNATION;
    @Column(name = "str_TYPE", length = 20)
    private String strTYPE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "lgROLEID")
    private Collection<TRoleUser> tRoleUserCollection = new ArrayList<>();
    @OneToMany(mappedBy = "lgROLEID", fetch = FetchType.LAZY)
    private Collection<TRolePrivelege> tRolePrivelegeCollection = new ArrayList<>();

    public TRole() {
    }

    public TRole(String lgROLEID) {
        this.lgROLEID = lgROLEID;
    }

    public String getLgROLEID() {
        return lgROLEID;
    }

    public void setLgROLEID(String lgROLEID) {
        this.lgROLEID = lgROLEID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrDESIGNATION() {
        return strDESIGNATION;
    }

    public void setStrDESIGNATION(String strDESIGNATION) {
        this.strDESIGNATION = strDESIGNATION;
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
    public Collection<TRoleUser> getTRoleUserCollection() {
        return tRoleUserCollection;
    }

    public void setTRoleUserCollection(Collection<TRoleUser> tRoleUserCollection) {
        this.tRoleUserCollection = tRoleUserCollection;
    }

    @XmlTransient
    public Collection<TRolePrivelege> getTRolePrivelegeCollection() {
        return tRolePrivelegeCollection;
    }

    public void setTRolePrivelegeCollection(Collection<TRolePrivelege> tRolePrivelegeCollection) {
        this.tRolePrivelegeCollection = tRolePrivelegeCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgROLEID != null ? lgROLEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TRole)) {
            return false;
        }
        TRole other = (TRole) object;
        if ((this.lgROLEID == null && other.lgROLEID != null)
                || (this.lgROLEID != null && !this.lgROLEID.equals(other.lgROLEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TRole[ lgROLEID=" + lgROLEID + " ]";
    }

}
