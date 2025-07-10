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
@Table(name = "t_type_reglement")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypeReglement.findAll", query = "SELECT t FROM TTypeReglement t"),
        @NamedQuery(name = "TTypeReglement.findByLgTYPEREGLEMENTID", query = "SELECT t FROM TTypeReglement t WHERE t.lgTYPEREGLEMENTID = :lgTYPEREGLEMENTID"),
        @NamedQuery(name = "TTypeReglement.findByStrNAME", query = "SELECT t FROM TTypeReglement t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TTypeReglement.findByStrDESCRIPTION", query = "SELECT t FROM TTypeReglement t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TTypeReglement.findByStrFLAG", query = "SELECT t FROM TTypeReglement t WHERE t.strFLAG = :strFLAG"),
        @NamedQuery(name = "TTypeReglement.findByStrSTATUT", query = "SELECT t FROM TTypeReglement t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTypeReglement.findByDtCREATED", query = "SELECT t FROM TTypeReglement t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypeReglement.findByDtUPDATED", query = "SELECT t FROM TTypeReglement t WHERE t.dtUPDATED = :dtUPDATED") })
public class TTypeReglement implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_REGLEMENT_ID", nullable = false, length = 40)
    private String lgTYPEREGLEMENTID;
    @Column(name = "str_NAME", length = 20)
    private String strNAME;
    @Column(name = "str_DESCRIPTION", length = 20)
    private String strDESCRIPTION;
    @Column(name = "str_FLAG", length = 1)
    private String strFLAG;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgTYPEREGLEMENTID")
    private Collection<TModeReglement> tModeReglementCollection;
    @OneToMany(mappedBy = "lgTYPEREGLEMENTID")
    private Collection<TGrossiste> tGrossisteCollection;

    public TTypeReglement() {
    }

    public TTypeReglement(String lgTYPEREGLEMENTID) {
        this.lgTYPEREGLEMENTID = lgTYPEREGLEMENTID;
    }

    public String getLgTYPEREGLEMENTID() {
        return lgTYPEREGLEMENTID;
    }

    public void setLgTYPEREGLEMENTID(String lgTYPEREGLEMENTID) {
        this.lgTYPEREGLEMENTID = lgTYPEREGLEMENTID;
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

    public String getStrFLAG() {
        return strFLAG;
    }

    public void setStrFLAG(String strFLAG) {
        this.strFLAG = strFLAG;
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
    public Collection<TModeReglement> getTModeReglementCollection() {
        return tModeReglementCollection;
    }

    public void setTModeReglementCollection(Collection<TModeReglement> tModeReglementCollection) {
        this.tModeReglementCollection = tModeReglementCollection;
    }

    @XmlTransient
    public Collection<TGrossiste> getTGrossisteCollection() {
        return tGrossisteCollection;
    }

    public void setTGrossisteCollection(Collection<TGrossiste> tGrossisteCollection) {
        this.tGrossisteCollection = tGrossisteCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPEREGLEMENTID != null ? lgTYPEREGLEMENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeReglement)) {
            return false;
        }
        TTypeReglement other = (TTypeReglement) object;
        if ((this.lgTYPEREGLEMENTID == null && other.lgTYPEREGLEMENTID != null)
                || (this.lgTYPEREGLEMENTID != null && !this.lgTYPEREGLEMENTID.equals(other.lgTYPEREGLEMENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeReglement[ lgTYPEREGLEMENTID=" + lgTYPEREGLEMENTID + " ]";
    }

}
