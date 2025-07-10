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
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_type_bordereau")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypeBordereau.findAll", query = "SELECT t FROM TTypeBordereau t"),
        @NamedQuery(name = "TTypeBordereau.findByLgTYPEBORDEREAUID", query = "SELECT t FROM TTypeBordereau t WHERE t.lgTYPEBORDEREAUID = :lgTYPEBORDEREAUID"),
        @NamedQuery(name = "TTypeBordereau.findByStrNUMEROETAT", query = "SELECT t FROM TTypeBordereau t WHERE t.strNUMEROETAT = :strNUMEROETAT"),
        @NamedQuery(name = "TTypeBordereau.findByStrLIBELLETYPEBORDEREAU", query = "SELECT t FROM TTypeBordereau t WHERE t.strLIBELLETYPEBORDEREAU = :strLIBELLETYPEBORDEREAU"),
        @NamedQuery(name = "TTypeBordereau.findByDtCREATED", query = "SELECT t FROM TTypeBordereau t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypeBordereau.findByDtUPDATED", query = "SELECT t FROM TTypeBordereau t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TTypeBordereau.findByStrSTATUT", query = "SELECT t FROM TTypeBordereau t WHERE t.strSTATUT = :strSTATUT") })
public class TTypeBordereau implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPE_BORDEREAU_ID", nullable = false, length = 40)
    private String lgTYPEBORDEREAUID;
    @Column(name = "str_NUMERO_ETAT", length = 40)
    private String strNUMEROETAT;
    @Column(name = "str_LIBELLE_TYPE_BORDEREAU", length = 100)
    private String strLIBELLETYPEBORDEREAU;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;

    public TTypeBordereau() {
    }

    public TTypeBordereau(String lgTYPEBORDEREAUID) {
        this.lgTYPEBORDEREAUID = lgTYPEBORDEREAUID;
    }

    public String getLgTYPEBORDEREAUID() {
        return lgTYPEBORDEREAUID;
    }

    public void setLgTYPEBORDEREAUID(String lgTYPEBORDEREAUID) {
        this.lgTYPEBORDEREAUID = lgTYPEBORDEREAUID;
    }

    public String getStrNUMEROETAT() {
        return strNUMEROETAT;
    }

    public void setStrNUMEROETAT(String strNUMEROETAT) {
        this.strNUMEROETAT = strNUMEROETAT;
    }

    public String getStrLIBELLETYPEBORDEREAU() {
        return strLIBELLETYPEBORDEREAU;
    }

    public void setStrLIBELLETYPEBORDEREAU(String strLIBELLETYPEBORDEREAU) {
        this.strLIBELLETYPEBORDEREAU = strLIBELLETYPEBORDEREAU;
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

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTYPEBORDEREAUID != null ? lgTYPEBORDEREAUID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypeBordereau)) {
            return false;
        }
        TTypeBordereau other = (TTypeBordereau) object;
        if ((this.lgTYPEBORDEREAUID == null && other.lgTYPEBORDEREAUID != null)
                || (this.lgTYPEBORDEREAUID != null && !this.lgTYPEBORDEREAUID.equals(other.lgTYPEBORDEREAUID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypeBordereau[ lgTYPEBORDEREAUID=" + lgTYPEBORDEREAUID + " ]";
    }

}
