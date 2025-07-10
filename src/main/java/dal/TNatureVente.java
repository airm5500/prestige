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
@Table(name = "t_nature_vente")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TNatureVente.findByStrLIBELLE", query = "SELECT t FROM TNatureVente t WHERE t.strLIBELLE = :strLIBELLE"),
        @NamedQuery(name = "TNatureVente.findByStrSTATUT", query = "SELECT t FROM TNatureVente t WHERE t.strSTATUT = :strSTATUT") })
public class TNatureVente implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_NATURE_VENTE_ID", nullable = false, length = 40)
    private String lgNATUREVENTEID;
    @Column(name = "str_LIBELLE", length = 40)
    private String strLIBELLE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;

    public TNatureVente() {
    }

    public TNatureVente(String lgNATUREVENTEID) {
        this.lgNATUREVENTEID = lgNATUREVENTEID;
    }

    public String getLgNATUREVENTEID() {
        return lgNATUREVENTEID;
    }

    public void setLgNATUREVENTEID(String lgNATUREVENTEID) {
        this.lgNATUREVENTEID = lgNATUREVENTEID;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
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
        hash += (lgNATUREVENTEID != null ? lgNATUREVENTEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TNatureVente)) {
            return false;
        }
        TNatureVente other = (TNatureVente) object;
        return !((this.lgNATUREVENTEID == null && other.lgNATUREVENTEID != null)
                || (this.lgNATUREVENTEID != null && !this.lgNATUREVENTEID.equals(other.lgNATUREVENTEID)));
    }

    @Override
    public String toString() {
        return "dal.TNatureVente[ lgNATUREVENTEID=" + lgNATUREVENTEID + " ]";
    }

}
