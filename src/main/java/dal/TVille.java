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
@Table(name = "t_ville")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TVille.findAll", query = "SELECT t FROM TVille t"),
        @NamedQuery(name = "TVille.findByLgVILLEID", query = "SELECT t FROM TVille t WHERE t.lgVILLEID = :lgVILLEID"),
        @NamedQuery(name = "TVille.findByStrName", query = "SELECT t FROM TVille t WHERE t.strName = :strName"),
        @NamedQuery(name = "TVille.findByStrCodePostal", query = "SELECT t FROM TVille t WHERE t.strCodePostal = :strCodePostal"),
        @NamedQuery(name = "TVille.findByStrBureauDistributeur", query = "SELECT t FROM TVille t WHERE t.strBureauDistributeur = :strBureauDistributeur"),
        @NamedQuery(name = "TVille.findByStrStatut", query = "SELECT t FROM TVille t WHERE t.strStatut = :strStatut"),
        @NamedQuery(name = "TVille.findByDtCreated", query = "SELECT t FROM TVille t WHERE t.dtCreated = :dtCreated"),
        @NamedQuery(name = "TVille.findByDtUpdated", query = "SELECT t FROM TVille t WHERE t.dtUpdated = :dtUpdated"),
        @NamedQuery(name = "TVille.findByStrCODE", query = "SELECT t FROM TVille t WHERE t.strCODE = :strCODE") })
public class TVille implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_VILLE_ID", nullable = false, length = 20)
    private String lgVILLEID;
    @Column(name = "STR_NAME", length = 100)
    private String strName;
    @Column(name = "STR_CODE_POSTAL", length = 50)
    private String strCodePostal;
    @Column(name = "STR_BUREAU_DISTRIBUTEUR", length = 200)
    private String strBureauDistributeur;
    @Column(name = "STR_STATUT", length = 20)
    private String strStatut;
    @Column(name = "DT_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCreated;
    @Column(name = "DT_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUpdated;
    @Column(name = "str_CODE", length = 20)
    private String strCODE;

    public TVille() {
    }

    public TVille(String lgVILLEID) {
        this.lgVILLEID = lgVILLEID;
    }

    public String getLgVILLEID() {
        return lgVILLEID;
    }

    public void setLgVILLEID(String lgVILLEID) {
        this.lgVILLEID = lgVILLEID;
    }

    public String getStrName() {
        return strName;
    }

    public void setStrName(String strName) {
        this.strName = strName;
    }

    public String getStrCodePostal() {
        return strCodePostal;
    }

    public void setStrCodePostal(String strCodePostal) {
        this.strCodePostal = strCodePostal;
    }

    public String getStrBureauDistributeur() {
        return strBureauDistributeur;
    }

    public void setStrBureauDistributeur(String strBureauDistributeur) {
        this.strBureauDistributeur = strBureauDistributeur;
    }

    public String getStrStatut() {
        return strStatut;
    }

    public void setStrStatut(String strStatut) {
        this.strStatut = strStatut;
    }

    public Date getDtCreated() {
        return dtCreated;
    }

    public void setDtCreated(Date dtCreated) {
        this.dtCreated = dtCreated;
    }

    public Date getDtUpdated() {
        return dtUpdated;
    }

    public void setDtUpdated(Date dtUpdated) {
        this.dtUpdated = dtUpdated;
    }

    public String getStrCODE() {
        return strCODE;
    }

    public void setStrCODE(String strCODE) {
        this.strCODE = strCODE;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgVILLEID != null ? lgVILLEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TVille)) {
            return false;
        }
        TVille other = (TVille) object;
        if ((this.lgVILLEID == null && other.lgVILLEID != null)
                || (this.lgVILLEID != null && !this.lgVILLEID.equals(other.lgVILLEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TVille[ lgVILLEID=" + lgVILLEID + " ]";
    }

}
