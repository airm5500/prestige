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
@Table(name = "t_type_risque")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypeRisque.findAll", query = "SELECT t FROM TTypeRisque t"),
        @NamedQuery(name = "TTypeRisque.findByLgTYPERISQUEID", query = "SELECT t FROM TTypeRisque t WHERE t.lgTYPERISQUEID = :lgTYPERISQUEID"),
        @NamedQuery(name = "TTypeRisque.findByStrNAME", query = "SELECT t FROM TTypeRisque t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TTypeRisque.findByStrDESCRIPTION", query = "SELECT t FROM TTypeRisque t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TTypeRisque.findByStrSTATUT", query = "SELECT t FROM TTypeRisque t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTypeRisque.findByDtCREATED", query = "SELECT t FROM TTypeRisque t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypeRisque.findByDtUPDATED", query = "SELECT t FROM TTypeRisque t WHERE t.dtUPDATED = :dtUPDATED") })
public class TTypeRisque implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPERISQUE_ID", nullable = false, length = 40)
    private String lgTYPERISQUEID;
    @Column(name = "str_NAME", length = 40)
    private String strNAME;
    @Column(name = "str_DESCRIPTION", length = 40)
    private String strDESCRIPTION;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgTYPERISQUEID")
    private Collection<TRisque> tRisqueCollection;

    public TTypeRisque() {
    }

    public TTypeRisque(String lgTYPERISQUEID) {
        this.lgTYPERISQUEID = lgTYPERISQUEID;
    }

    public String getLgTYPERISQUEID() {
        return lgTYPERISQUEID;
    }

    public void setLgTYPERISQUEID(String lgTYPERISQUEID) {
        this.lgTYPERISQUEID = lgTYPERISQUEID;
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
    public Collection<TRisque> getTRisqueCollection() {
        return tRisqueCollection;
    }

    public void setTRisqueCollection(Collection<TRisque> tRisqueCollection) {
        this.tRisqueCollection = tRisqueCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPERISQUEID != null ? lgTYPERISQUEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeRisque)) {
            return false;
        }
        TTypeRisque other = (TTypeRisque) object;
        if ((this.lgTYPERISQUEID == null && other.lgTYPERISQUEID != null)
                || (this.lgTYPERISQUEID != null && !this.lgTYPERISQUEID.equals(other.lgTYPERISQUEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeRisque[ lgTYPERISQUEID=" + lgTYPERISQUEID + " ]";
    }

}
