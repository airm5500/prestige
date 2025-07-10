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
@Table(name = "t_centre_payeur")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TCentrePayeur.findAll", query = "SELECT t FROM TCentrePayeur t"),
        @NamedQuery(name = "TCentrePayeur.findByLgCENTREPAYEUR", query = "SELECT t FROM TCentrePayeur t WHERE t.lgCENTREPAYEUR = :lgCENTREPAYEUR"),
        @NamedQuery(name = "TCentrePayeur.findByStrCODE", query = "SELECT t FROM TCentrePayeur t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TCentrePayeur.findByStrLIBELLE", query = "SELECT t FROM TCentrePayeur t WHERE t.strLIBELLE = :strLIBELLE"),
        @NamedQuery(name = "TCentrePayeur.findByStrSTATUT", query = "SELECT t FROM TCentrePayeur t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TCentrePayeur.findByDtUPDATED", query = "SELECT t FROM TCentrePayeur t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TCentrePayeur.findByDtCREATED", query = "SELECT t FROM TCentrePayeur t WHERE t.dtCREATED = :dtCREATED") })
public class TCentrePayeur implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_CENTRE_PAYEUR", nullable = false, length = 40)
    private String lgCENTREPAYEUR;
    @Column(name = "str_CODE", length = 40)
    private String strCODE;
    @Column(name = "str_LIBELLE", length = 40)
    private String strLIBELLE;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;

    public TCentrePayeur() {
    }

    public TCentrePayeur(String lgCENTREPAYEUR) {
        this.lgCENTREPAYEUR = lgCENTREPAYEUR;
    }

    public String getLgCENTREPAYEUR() {
        return lgCENTREPAYEUR;
    }

    public void setLgCENTREPAYEUR(String lgCENTREPAYEUR) {
        this.lgCENTREPAYEUR = lgCENTREPAYEUR;
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

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCENTREPAYEUR != null ? lgCENTREPAYEUR.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TCentrePayeur)) {
            return false;
        }
        TCentrePayeur other = (TCentrePayeur) object;
        if ((this.lgCENTREPAYEUR == null && other.lgCENTREPAYEUR != null)
                || (this.lgCENTREPAYEUR != null && !this.lgCENTREPAYEUR.equals(other.lgCENTREPAYEUR))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TCentrePayeur[ lgCENTREPAYEUR=" + lgCENTREPAYEUR + " ]";
    }

}
