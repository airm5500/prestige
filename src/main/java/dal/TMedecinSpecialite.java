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
@Table(name = "t_medecin_specialite")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TMedecinSpecialite.findAll", query = "SELECT t FROM TMedecinSpecialite t"),
        @NamedQuery(name = "TMedecinSpecialite.findByLgMEDECINSPECIALITEID", query = "SELECT t FROM TMedecinSpecialite t WHERE t.lgMEDECINSPECIALITEID = :lgMEDECINSPECIALITEID"),
        @NamedQuery(name = "TMedecinSpecialite.findByStrLIBELLE", query = "SELECT t FROM TMedecinSpecialite t WHERE t.strLIBELLE = :strLIBELLE"),
        @NamedQuery(name = "TMedecinSpecialite.findByDtCREATED", query = "SELECT t FROM TMedecinSpecialite t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TMedecinSpecialite.findByDtUPDATED", query = "SELECT t FROM TMedecinSpecialite t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TMedecinSpecialite.findByStrSTATUT", query = "SELECT t FROM TMedecinSpecialite t WHERE t.strSTATUT = :strSTATUT") })
public class TMedecinSpecialite implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MEDECIN_SPECIALITE_ID", nullable = false, length = 40)
    private String lgMEDECINSPECIALITEID;
    @Column(name = "str_LIBELLE", length = 50)
    private String strLIBELLE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @JoinColumn(name = "lg_SPECIALITE_ID", referencedColumnName = "lg_SPECIALITE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TSpecialite lgSPECIALITEID;
    @JoinColumn(name = "lg_MEDECIN_ID", referencedColumnName = "lg_MEDECIN_ID", nullable = false)
    @ManyToOne(optional = false)
    private TMedecin lgMEDECINID;

    public TMedecinSpecialite() {
    }

    public TMedecinSpecialite(String lgMEDECINSPECIALITEID) {
        this.lgMEDECINSPECIALITEID = lgMEDECINSPECIALITEID;
    }

    public String getLgMEDECINSPECIALITEID() {
        return lgMEDECINSPECIALITEID;
    }

    public void setLgMEDECINSPECIALITEID(String lgMEDECINSPECIALITEID) {
        this.lgMEDECINSPECIALITEID = lgMEDECINSPECIALITEID;
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

    public TSpecialite getLgSPECIALITEID() {
        return lgSPECIALITEID;
    }

    public void setLgSPECIALITEID(TSpecialite lgSPECIALITEID) {
        this.lgSPECIALITEID = lgSPECIALITEID;
    }

    public TMedecin getLgMEDECINID() {
        return lgMEDECINID;
    }

    public void setLgMEDECINID(TMedecin lgMEDECINID) {
        this.lgMEDECINID = lgMEDECINID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgMEDECINSPECIALITEID != null ? lgMEDECINSPECIALITEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TMedecinSpecialite)) {
            return false;
        }
        TMedecinSpecialite other = (TMedecinSpecialite) object;
        if ((this.lgMEDECINSPECIALITEID == null && other.lgMEDECINSPECIALITEID != null)
                || (this.lgMEDECINSPECIALITEID != null
                        && !this.lgMEDECINSPECIALITEID.equals(other.lgMEDECINSPECIALITEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TMedecinSpecialite[ lgMEDECINSPECIALITEID=" + lgMEDECINSPECIALITEID + " ]";
    }

}
