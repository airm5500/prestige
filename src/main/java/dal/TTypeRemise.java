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
@Table(name = "t_type_remise")
@XmlRootElement
@NamedQueries({

        @NamedQuery(name = "TTypeRemise.findByStrSTATUT", query = "SELECT DISTINCT t  FROM TTypeRemise t  INNER JOIN FETCH t.tRemiseCollection  WHERE t.strSTATUT = :strSTATUT") })
public class TTypeRemise implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_REMISE_ID", nullable = false, length = 40)
    private String lgTYPEREMISEID;
    @Column(name = "str_NAME", length = 50)
    private String strNAME;
    @Column(name = "str_DESCRIPTION", length = 100)
    private String strDESCRIPTION;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgTYPEREMISEID")
    private Collection<TRemise> tRemiseCollection;

    public TTypeRemise() {
    }

    public TTypeRemise(String lgTYPEREMISEID) {
        this.lgTYPEREMISEID = lgTYPEREMISEID;
    }

    public String getLgTYPEREMISEID() {
        return lgTYPEREMISEID;
    }

    public void setLgTYPEREMISEID(String lgTYPEREMISEID) {
        this.lgTYPEREMISEID = lgTYPEREMISEID;
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
    public Collection<TRemise> getTRemiseCollection() {
        return tRemiseCollection;
    }

    public void setTRemiseCollection(Collection<TRemise> tRemiseCollection) {
        this.tRemiseCollection = tRemiseCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPEREMISEID != null ? lgTYPEREMISEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeRemise)) {
            return false;
        }
        TTypeRemise other = (TTypeRemise) object;
        if ((this.lgTYPEREMISEID == null && other.lgTYPEREMISEID != null)
                || (this.lgTYPEREMISEID != null && !this.lgTYPEREMISEID.equals(other.lgTYPEREMISEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeRemise[ lgTYPEREMISEID=" + lgTYPEREMISEID + " ]";
    }

}
