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
@Table(name = "t_motif_retour")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TMotifRetour.findAll", query = "SELECT t FROM TMotifRetour t"),
        @NamedQuery(name = "TMotifRetour.findByLgMOTIFRETOUR", query = "SELECT t FROM TMotifRetour t WHERE t.lgMOTIFRETOUR = :lgMOTIFRETOUR"),
        @NamedQuery(name = "TMotifRetour.findByStrCODE", query = "SELECT t FROM TMotifRetour t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TMotifRetour.findByStrLIBELLE", query = "SELECT t FROM TMotifRetour t WHERE t.strLIBELLE = :strLIBELLE"),
        @NamedQuery(name = "TMotifRetour.findByStrSTATUT", query = "SELECT t FROM TMotifRetour t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TMotifRetour.findByDtCREATED", query = "SELECT t FROM TMotifRetour t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TMotifRetour.findByDtUPDATED", query = "SELECT t FROM TMotifRetour t WHERE t.dtUPDATED = :dtUPDATED") })
public class TMotifRetour implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MOTIF_RETOUR", nullable = false, length = 40)
    private String lgMOTIFRETOUR;
    @Column(name = "str_CODE", length = 20)
    private String strCODE;
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

    public TMotifRetour() {
    }

    public TMotifRetour(String lgMOTIFRETOUR) {
        this.lgMOTIFRETOUR = lgMOTIFRETOUR;
    }

    public String getLgMOTIFRETOUR() {
        return lgMOTIFRETOUR;
    }

    public void setLgMOTIFRETOUR(String lgMOTIFRETOUR) {
        this.lgMOTIFRETOUR = lgMOTIFRETOUR;
    }

    public String getStrCODE() {
        return strCODE;
    }

    public void setStrCODE(String strCODE) {
        this.strCODE = strCODE;
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
        hash += (lgMOTIFRETOUR != null ? lgMOTIFRETOUR.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TMotifRetour)) {
            return false;
        }
        TMotifRetour other = (TMotifRetour) object;
        if ((this.lgMOTIFRETOUR == null && other.lgMOTIFRETOUR != null)
                || (this.lgMOTIFRETOUR != null && !this.lgMOTIFRETOUR.equals(other.lgMOTIFRETOUR))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TMotifRetour[ lgMOTIFRETOUR=" + lgMOTIFRETOUR + " ]";
    }

}
