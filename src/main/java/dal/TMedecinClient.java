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
@Table(name = "t_medecin_client")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TMedecinClient.findAll", query = "SELECT t FROM TMedecinClient t"),
        @NamedQuery(name = "TMedecinClient.findByLgMEDECINCLIENTID", query = "SELECT t FROM TMedecinClient t WHERE t.lgMEDECINCLIENTID = :lgMEDECINCLIENTID"),
        @NamedQuery(name = "TMedecinClient.findByStrSOINS", query = "SELECT t FROM TMedecinClient t WHERE t.strSOINS = :strSOINS"),
        @NamedQuery(name = "TMedecinClient.findByDtCREATED", query = "SELECT t FROM TMedecinClient t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TMedecinClient.findByDtUPDATED", query = "SELECT t FROM TMedecinClient t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TMedecinClient.findByStrSTATUT", query = "SELECT t FROM TMedecinClient t WHERE t.strSTATUT = :strSTATUT") })
public class TMedecinClient implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MEDECIN_CLIENT_ID", nullable = false, length = 40)
    private String lgMEDECINCLIENTID;
    @Column(name = "str_SOINS", length = 100)
    private String strSOINS;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @JoinColumn(name = "lg_CLIENT_ID", referencedColumnName = "lg_CLIENT_ID")
    @ManyToOne
    private TClient lgCLIENTID;
    @JoinColumn(name = "lg_MEDECIN_ID", referencedColumnName = "lg_MEDECIN_ID")
    @ManyToOne
    private TMedecin lgMEDECINID;

    public TMedecinClient() {
    }

    public TMedecinClient(String lgMEDECINCLIENTID) {
        this.lgMEDECINCLIENTID = lgMEDECINCLIENTID;
    }

    public String getLgMEDECINCLIENTID() {
        return lgMEDECINCLIENTID;
    }

    public void setLgMEDECINCLIENTID(String lgMEDECINCLIENTID) {
        this.lgMEDECINCLIENTID = lgMEDECINCLIENTID;
    }

    public String getStrSOINS() {
        return strSOINS;
    }

    public void setStrSOINS(String strSOINS) {
        this.strSOINS = strSOINS;
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

    public TClient getLgCLIENTID() {
        return lgCLIENTID;
    }

    public void setLgCLIENTID(TClient lgCLIENTID) {
        this.lgCLIENTID = lgCLIENTID;
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
        hash += (lgMEDECINCLIENTID != null ? lgMEDECINCLIENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TMedecinClient)) {
            return false;
        }
        TMedecinClient other = (TMedecinClient) object;
        if ((this.lgMEDECINCLIENTID == null && other.lgMEDECINCLIENTID != null)
                || (this.lgMEDECINCLIENTID != null && !this.lgMEDECINCLIENTID.equals(other.lgMEDECINCLIENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TMedecinClient[ lgMEDECINCLIENTID=" + lgMEDECINCLIENTID + " ]";
    }

}
