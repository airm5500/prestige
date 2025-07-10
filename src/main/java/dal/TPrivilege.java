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
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.Lob;
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
@Table(name = "t_privilege")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TPrivilege.findAll", query = "SELECT t FROM TPrivilege t"),
        @NamedQuery(name = "TPrivilege.findByLgPRIVELEGEID", query = "SELECT t FROM TPrivilege t WHERE t.lgPRIVELEGEID = :lgPRIVELEGEID"),
        @NamedQuery(name = "TPrivilege.findByStrNAME", query = "SELECT t FROM TPrivilege t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TPrivilege.findByStrTYPE", query = "SELECT t FROM TPrivilege t WHERE t.strTYPE = :strTYPE"),
        @NamedQuery(name = "TPrivilege.findByLgPRIVELEGEIDDEP", query = "SELECT t FROM TPrivilege t WHERE t.lgPRIVELEGEIDDEP = :lgPRIVELEGEIDDEP"),
        @NamedQuery(name = "TPrivilege.findByDtCREATED", query = "SELECT t FROM TPrivilege t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TPrivilege.findByLgCREATEDBY", query = "SELECT t FROM TPrivilege t WHERE t.lgCREATEDBY = :lgCREATEDBY"),
        @NamedQuery(name = "TPrivilege.findByDtUPDATED", query = "SELECT t FROM TPrivilege t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TPrivilege.findByLgUPDATEDBY", query = "SELECT t FROM TPrivilege t WHERE t.lgUPDATEDBY = :lgUPDATEDBY"),
        @NamedQuery(name = "TPrivilege.findByStrSTATUT", query = "SELECT t FROM TPrivilege t WHERE t.strSTATUT = :strSTATUT") })
public class TPrivilege implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_PRIVELEGE_ID", nullable = false, length = 50)
    private String lgPRIVELEGEID;
    @Column(name = "str_NAME", length = 80)
    private String strNAME;
    @Column(name = "str_TYPE", length = 50)
    private String strTYPE;
    @Lob
    @Column(name = "str_DESCRIPTION", length = 65535)
    private String strDESCRIPTION;
    @Column(name = "lg_PRIVELEGE_ID_DEP", length = 50)
    private String lgPRIVELEGEIDDEP;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "lg_CREATED_BY", length = 20)
    private String lgCREATEDBY;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "lg_UPDATED_BY", length = 20)
    private String lgUPDATEDBY;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @OneToMany(mappedBy = "lgPRIVILEGEID", fetch = FetchType.EAGER)
    private Collection<TRolePrivelege> tRolePrivelegeCollection = new ArrayList<>();

    public TPrivilege() {
    }

    public TPrivilege(String lgPRIVELEGEID) {
        this.lgPRIVELEGEID = lgPRIVELEGEID;
    }

    public String getLgPRIVELEGEID() {
        return lgPRIVELEGEID;
    }

    public void setLgPRIVELEGEID(String lgPRIVELEGEID) {
        this.lgPRIVELEGEID = lgPRIVELEGEID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrTYPE() {
        return strTYPE;
    }

    public void setStrTYPE(String strTYPE) {
        this.strTYPE = strTYPE;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getLgPRIVELEGEIDDEP() {
        return lgPRIVELEGEIDDEP;
    }

    public void setLgPRIVELEGEIDDEP(String lgPRIVELEGEIDDEP) {
        this.lgPRIVELEGEIDDEP = lgPRIVELEGEIDDEP;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getLgCREATEDBY() {
        return lgCREATEDBY;
    }

    public void setLgCREATEDBY(String lgCREATEDBY) {
        this.lgCREATEDBY = lgCREATEDBY;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public String getLgUPDATEDBY() {
        return lgUPDATEDBY;
    }

    public void setLgUPDATEDBY(String lgUPDATEDBY) {
        this.lgUPDATEDBY = lgUPDATEDBY;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
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
        hash += (lgPRIVELEGEID != null ? lgPRIVELEGEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TPrivilege)) {
            return false;
        }
        TPrivilege other = (TPrivilege) object;
        if ((this.lgPRIVELEGEID == null && other.lgPRIVELEGEID != null)
                || (this.lgPRIVELEGEID != null && !this.lgPRIVELEGEID.equals(other.lgPRIVELEGEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TPrivilege[ lgPRIVELEGEID=" + lgPRIVELEGEID + " ]";
    }

}
