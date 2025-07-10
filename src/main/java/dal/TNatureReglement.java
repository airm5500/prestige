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
@Table(name = "t_nature_reglement")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TNatureReglement.findAll", query = "SELECT t FROM TNatureReglement t"),
        @NamedQuery(name = "TNatureReglement.findByLgNATUREID", query = "SELECT t FROM TNatureReglement t WHERE t.lgNATUREID = :lgNATUREID"),
        @NamedQuery(name = "TNatureReglement.findByStrLIBELLE", query = "SELECT t FROM TNatureReglement t WHERE t.strLIBELLE = :strLIBELLE"),
        @NamedQuery(name = "TNatureReglement.findByStrSTATUT", query = "SELECT t FROM TNatureReglement t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TNatureReglement.findByDtCREATED", query = "SELECT t FROM TNatureReglement t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TNatureReglement.findByDtUPDATED", query = "SELECT t FROM TNatureReglement t WHERE t.dtUPDATED = :dtUPDATED") })
public class TNatureReglement implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_NATURE_ID", nullable = false, length = 40)
    private String lgNATUREID;
    @Column(name = "str_LIBELLE", length = 40)
    private String strLIBELLE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public TNatureReglement() {
    }

    public TNatureReglement(String lgNATUREID) {
        this.lgNATUREID = lgNATUREID;
    }

    public String getLgNATUREID() {
        return lgNATUREID;
    }

    public void setLgNATUREID(String lgNATUREID) {
        this.lgNATUREID = lgNATUREID;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
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

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgNATUREID != null ? lgNATUREID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TNatureReglement)) {
            return false;
        }
        TNatureReglement other = (TNatureReglement) object;
        if ((this.lgNATUREID == null && other.lgNATUREID != null)
                || (this.lgNATUREID != null && !this.lgNATUREID.equals(other.lgNATUREID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TNatureReglement[ lgNATUREID=" + lgNATUREID + " ]";
    }

}
