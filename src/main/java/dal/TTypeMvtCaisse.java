/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import dal.enumeration.CategorieMvtCaisse;
import java.io.Serializable;
import java.util.Collection;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Index;
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
@Table(name = "t_type_mvt_caisse", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "lg_TYPE_MVT_CAISSE_ID" }) }, indexes = {
                @Index(name = "mvtIndexCategorie", columnList = "categorie"),
                @Index(name = "mvtIndexCodeComp", columnList = "str_CODE_COMPTABLE")

})
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypeMvtCaisse.findAll", query = "SELECT t FROM TTypeMvtCaisse t"),
        @NamedQuery(name = "TTypeMvtCaisse.findByLgTYPEMVTCAISSEID", query = "SELECT t FROM TTypeMvtCaisse t WHERE t.lgTYPEMVTCAISSEID = :lgTYPEMVTCAISSEID"),
        @NamedQuery(name = "TTypeMvtCaisse.findByStrNAME", query = "SELECT t FROM TTypeMvtCaisse t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TTypeMvtCaisse.findByStrDESCRIPTION", query = "SELECT t FROM TTypeMvtCaisse t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TTypeMvtCaisse.findByDtCREATED", query = "SELECT t FROM TTypeMvtCaisse t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypeMvtCaisse.findByDtUPDATED", query = "SELECT t FROM TTypeMvtCaisse t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TTypeMvtCaisse.findByStrSTATUT", query = "SELECT t FROM TTypeMvtCaisse t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTypeMvtCaisse.findByStrCODECOMPTABLE", query = "SELECT t FROM TTypeMvtCaisse t WHERE t.strCODECOMPTABLE = :strCODECOMPTABLE"),
        @NamedQuery(name = "TTypeMvtCaisse.findByStrCODEREGROUPEMENT", query = "SELECT t FROM TTypeMvtCaisse t WHERE t.strCODEREGROUPEMENT = :strCODEREGROUPEMENT") })
public class TTypeMvtCaisse implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_MVT_CAISSE_ID", nullable = false, length = 40)
    private String lgTYPEMVTCAISSEID;
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
    @Column(name = "str_CODE_COMPTABLE", length = 30)
    private String strCODECOMPTABLE;
    @Column(name = "str_CODE_REGROUPEMENT", length = 30)
    private String strCODEREGROUPEMENT;
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "lgTYPEMVTCAISSEID")
    private Collection<TMvtCaisse> tMvtCaisseCollection;
    @Enumerated(EnumType.ORDINAL)
    @Column(name = "categorie", nullable = false)
    private CategorieMvtCaisse categorieMvtCaisse;

    public CategorieMvtCaisse getCategorieMvtCaisse() {
        return categorieMvtCaisse;
    }

    public void setCategorieMvtCaisse(CategorieMvtCaisse categorieMvtCaisse) {
        this.categorieMvtCaisse = categorieMvtCaisse;
    }

    public TTypeMvtCaisse() {
    }

    public TTypeMvtCaisse(String lgTYPEMVTCAISSEID) {
        this.lgTYPEMVTCAISSEID = lgTYPEMVTCAISSEID;
    }

    public String getLgTYPEMVTCAISSEID() {
        return lgTYPEMVTCAISSEID;
    }

    public void setLgTYPEMVTCAISSEID(String lgTYPEMVTCAISSEID) {
        this.lgTYPEMVTCAISSEID = lgTYPEMVTCAISSEID;
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

    public String getStrCODECOMPTABLE() {
        return strCODECOMPTABLE;
    }

    public void setStrCODECOMPTABLE(String strCODECOMPTABLE) {
        this.strCODECOMPTABLE = strCODECOMPTABLE;
    }

    public String getStrCODEREGROUPEMENT() {
        return strCODEREGROUPEMENT;
    }

    public void setStrCODEREGROUPEMENT(String strCODEREGROUPEMENT) {
        this.strCODEREGROUPEMENT = strCODEREGROUPEMENT;
    }

    @XmlTransient
    public Collection<TMvtCaisse> getTMvtCaisseCollection() {
        return tMvtCaisseCollection;
    }

    public void setTMvtCaisseCollection(Collection<TMvtCaisse> tMvtCaisseCollection) {
        this.tMvtCaisseCollection = tMvtCaisseCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPEMVTCAISSEID != null ? lgTYPEMVTCAISSEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeMvtCaisse)) {
            return false;
        }
        TTypeMvtCaisse other = (TTypeMvtCaisse) object;
        if ((this.lgTYPEMVTCAISSEID == null && other.lgTYPEMVTCAISSEID != null)
                || (this.lgTYPEMVTCAISSEID != null && !this.lgTYPEMVTCAISSEID.equals(other.lgTYPEMVTCAISSEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeMvtCaisse[ lgTYPEMVTCAISSEID=" + lgTYPEMVTCAISSEID + " ]";
    }

}
