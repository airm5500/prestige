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
@Table(name = "t_regime_caisse")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TRegimeCaisse.findAll", query = "SELECT t FROM TRegimeCaisse t"),
        @NamedQuery(name = "TRegimeCaisse.findByLgREGIMECAISSEID", query = "SELECT t FROM TRegimeCaisse t WHERE t.lgREGIMECAISSEID = :lgREGIMECAISSEID"),
        @NamedQuery(name = "TRegimeCaisse.findByStrCODEREGIMECAISSE", query = "SELECT t FROM TRegimeCaisse t WHERE t.strCODEREGIMECAISSE = :strCODEREGIMECAISSE"),
        @NamedQuery(name = "TRegimeCaisse.findByStrLIBELLEREGIMECAISSE", query = "SELECT t FROM TRegimeCaisse t WHERE t.strLIBELLEREGIMECAISSE = :strLIBELLEREGIMECAISSE"),
        @NamedQuery(name = "TRegimeCaisse.findByBoolCONTROLEMATRICULE", query = "SELECT t FROM TRegimeCaisse t WHERE t.boolCONTROLEMATRICULE = :boolCONTROLEMATRICULE"),
        @NamedQuery(name = "TRegimeCaisse.findByStrSTATUT", query = "SELECT t FROM TRegimeCaisse t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TRegimeCaisse.findByDtCREATED", query = "SELECT t FROM TRegimeCaisse t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TRegimeCaisse.findByDtUPDATED", query = "SELECT t FROM TRegimeCaisse t WHERE t.dtUPDATED = :dtUPDATED") })
public class TRegimeCaisse implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_REGIMECAISSE_ID", nullable = false, length = 40)
    private String lgREGIMECAISSEID;
    @Column(name = "str_CODEREGIMECAISSE", length = 40)
    private String strCODEREGIMECAISSE;
    @Column(name = "str_LIBELLEREGIMECAISSE", length = 40)
    private String strLIBELLEREGIMECAISSE;
    @Column(name = "bool_CONTROLEMATRICULE")
    private Boolean boolCONTROLEMATRICULE;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgREGIMECAISSEID")
    private Collection<TTiersPayant> tTiersPayantCollection;

    public TRegimeCaisse() {
    }

    public TRegimeCaisse(String lgREGIMECAISSEID) {
        this.lgREGIMECAISSEID = lgREGIMECAISSEID;
    }

    public String getLgREGIMECAISSEID() {
        return lgREGIMECAISSEID;
    }

    public void setLgREGIMECAISSEID(String lgREGIMECAISSEID) {
        this.lgREGIMECAISSEID = lgREGIMECAISSEID;
    }

    public String getStrCODEREGIMECAISSE() {
        return strCODEREGIMECAISSE;
    }

    public void setStrCODEREGIMECAISSE(String strCODEREGIMECAISSE) {
        this.strCODEREGIMECAISSE = strCODEREGIMECAISSE;
    }

    public String getStrLIBELLEREGIMECAISSE() {
        return strLIBELLEREGIMECAISSE;
    }

    public void setStrLIBELLEREGIMECAISSE(String strLIBELLEREGIMECAISSE) {
        this.strLIBELLEREGIMECAISSE = strLIBELLEREGIMECAISSE;
    }

    public Boolean getBoolCONTROLEMATRICULE() {
        return boolCONTROLEMATRICULE;
    }

    public void setBoolCONTROLEMATRICULE(Boolean boolCONTROLEMATRICULE) {
        this.boolCONTROLEMATRICULE = boolCONTROLEMATRICULE;
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
    public Collection<TTiersPayant> getTTiersPayantCollection() {
        return tTiersPayantCollection;
    }

    public void setTTiersPayantCollection(Collection<TTiersPayant> tTiersPayantCollection) {
        this.tTiersPayantCollection = tTiersPayantCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgREGIMECAISSEID != null ? lgREGIMECAISSEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TRegimeCaisse)) {
            return false;
        }
        TRegimeCaisse other = (TRegimeCaisse) object;
        if ((this.lgREGIMECAISSEID == null && other.lgREGIMECAISSEID != null)
                || (this.lgREGIMECAISSEID != null && !this.lgREGIMECAISSEID.equals(other.lgREGIMECAISSEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TRegimeCaisse[ lgREGIMECAISSEID=" + lgREGIMECAISSEID + " ]";
    }

}
