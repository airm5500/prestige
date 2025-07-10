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
import javax.persistence.UniqueConstraint;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_optimisation_quantite", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "lg_OPTIMISATION_QUANTITE_ID" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TOptimisationQuantite.findAll", query = "SELECT t FROM TOptimisationQuantite t"),
        @NamedQuery(name = "TOptimisationQuantite.findByLgOPTIMISATIONQUANTITEID", query = "SELECT t FROM TOptimisationQuantite t WHERE t.lgOPTIMISATIONQUANTITEID = :lgOPTIMISATIONQUANTITEID"),
        @NamedQuery(name = "TOptimisationQuantite.findByStrCODEOPTIMISATION", query = "SELECT t FROM TOptimisationQuantite t WHERE t.strCODEOPTIMISATION = :strCODEOPTIMISATION"),
        @NamedQuery(name = "TOptimisationQuantite.findByStrLIBELLEOPTIMISATION", query = "SELECT t FROM TOptimisationQuantite t WHERE t.strLIBELLEOPTIMISATION = :strLIBELLEOPTIMISATION"),
        @NamedQuery(name = "TOptimisationQuantite.findByDtCREATED", query = "SELECT t FROM TOptimisationQuantite t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TOptimisationQuantite.findByStrSTATUT", query = "SELECT t FROM TOptimisationQuantite t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TOptimisationQuantite.findByDtUPDATED", query = "SELECT t FROM TOptimisationQuantite t WHERE t.dtUPDATED = :dtUPDATED") })
public class TOptimisationQuantite implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_OPTIMISATION_QUANTITE_ID", nullable = false, length = 40)
    private String lgOPTIMISATIONQUANTITEID;
    @Column(name = "str_CODE_OPTIMISATION", length = 40)
    private String strCODEOPTIMISATION;
    @Column(name = "str_LIBELLE_OPTIMISATION", length = 40)
    private String strLIBELLEOPTIMISATION;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgOPTIMISATIONQUANTITEID")
    private Collection<TCodeGestion> tCodeGestionCollection;

    public TOptimisationQuantite() {
    }

    public TOptimisationQuantite(String lgOPTIMISATIONQUANTITEID) {
        this.lgOPTIMISATIONQUANTITEID = lgOPTIMISATIONQUANTITEID;
    }

    public String getLgOPTIMISATIONQUANTITEID() {
        return lgOPTIMISATIONQUANTITEID;
    }

    public void setLgOPTIMISATIONQUANTITEID(String lgOPTIMISATIONQUANTITEID) {
        this.lgOPTIMISATIONQUANTITEID = lgOPTIMISATIONQUANTITEID;
    }

    public String getStrCODEOPTIMISATION() {
        return strCODEOPTIMISATION;
    }

    public void setStrCODEOPTIMISATION(String strCODEOPTIMISATION) {
        this.strCODEOPTIMISATION = strCODEOPTIMISATION;
    }

    public String getStrLIBELLEOPTIMISATION() {
        return strLIBELLEOPTIMISATION;
    }

    public void setStrLIBELLEOPTIMISATION(String strLIBELLEOPTIMISATION) {
        this.strLIBELLEOPTIMISATION = strLIBELLEOPTIMISATION;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    @XmlTransient
    public Collection<TCodeGestion> getTCodeGestionCollection() {
        return tCodeGestionCollection;
    }

    public void setTCodeGestionCollection(Collection<TCodeGestion> tCodeGestionCollection) {
        this.tCodeGestionCollection = tCodeGestionCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgOPTIMISATIONQUANTITEID != null ? lgOPTIMISATIONQUANTITEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TOptimisationQuantite)) {
            return false;
        }
        TOptimisationQuantite other = (TOptimisationQuantite) object;
        if ((this.lgOPTIMISATIONQUANTITEID == null && other.lgOPTIMISATIONQUANTITEID != null)
                || (this.lgOPTIMISATIONQUANTITEID != null
                        && !this.lgOPTIMISATIONQUANTITEID.equals(other.lgOPTIMISATIONQUANTITEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TOptimisationQuantite[ lgOPTIMISATIONQUANTITEID=" + lgOPTIMISATIONQUANTITEID + " ]";
    }

}
