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
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
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
@Table(name = "t_famille_zonegeo")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TFamilleZonegeo.findAll", query = "SELECT t FROM TFamilleZonegeo t"),
        @NamedQuery(name = "TFamilleZonegeo.findByLgFAMILLEZONEGEOID", query = "SELECT t FROM TFamilleZonegeo t WHERE t.lgFAMILLEZONEGEOID = :lgFAMILLEZONEGEOID"),
        @NamedQuery(name = "TFamilleZonegeo.findByStrSTATUT", query = "SELECT t FROM TFamilleZonegeo t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TFamilleZonegeo.findByDtCREATED", query = "SELECT t FROM TFamilleZonegeo t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TFamilleZonegeo.findByDtUPDATED", query = "SELECT t FROM TFamilleZonegeo t WHERE t.dtUPDATED = :dtUPDATED") })
public class TFamilleZonegeo implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_FAMILLE_ZONEGEO_ID", nullable = false, length = 40)
    private String lgFAMILLEZONEGEOID;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_ZONE_GEO_ID", referencedColumnName = "lg_ZONE_GEO_ID")
    @ManyToOne
    private TZoneGeographique lgZONEGEOID;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "lg_EMPLACEMENT_ID", referencedColumnName = "lg_EMPLACEMENT_ID")
    @ManyToOne
    private TEmplacement lgEMPLACEMENTID;

    public TFamilleZonegeo() {
    }

    public TFamilleZonegeo(String lgFAMILLEZONEGEOID) {
        this.lgFAMILLEZONEGEOID = lgFAMILLEZONEGEOID;
    }

    public String getLgFAMILLEZONEGEOID() {
        return lgFAMILLEZONEGEOID;
    }

    public void setLgFAMILLEZONEGEOID(String lgFAMILLEZONEGEOID) {
        this.lgFAMILLEZONEGEOID = lgFAMILLEZONEGEOID;
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

    public TZoneGeographique getLgZONEGEOID() {
        return lgZONEGEOID;
    }

    public void setLgZONEGEOID(TZoneGeographique lgZONEGEOID) {
        this.lgZONEGEOID = lgZONEGEOID;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public TEmplacement getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public void setLgEMPLACEMENTID(TEmplacement lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgFAMILLEZONEGEOID != null ? lgFAMILLEZONEGEOID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TFamilleZonegeo)) {
            return false;
        }
        TFamilleZonegeo other = (TFamilleZonegeo) object;
        if ((this.lgFAMILLEZONEGEOID == null && other.lgFAMILLEZONEGEOID != null)
                || (this.lgFAMILLEZONEGEOID != null && !this.lgFAMILLEZONEGEOID.equals(other.lgFAMILLEZONEGEOID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TFamilleZonegeo[ lgFAMILLEZONEGEOID=" + lgFAMILLEZONEGEOID + " ]";
    }

}
