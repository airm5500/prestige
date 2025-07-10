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
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
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
@Table(name = "t_risque")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TRisque.findAll", query = "SELECT t FROM TRisque t"),
        @NamedQuery(name = "TRisque.findByLgRISQUEID", query = "SELECT t FROM TRisque t WHERE t.lgRISQUEID = :lgRISQUEID"),
        @NamedQuery(name = "TRisque.findByStrCODERISQUE", query = "SELECT t FROM TRisque t WHERE t.strCODERISQUE = :strCODERISQUE"),
        @NamedQuery(name = "TRisque.findByStrLIBELLERISQUE", query = "SELECT t FROM TRisque t WHERE t.strLIBELLERISQUE = :strLIBELLERISQUE"),
        @NamedQuery(name = "TRisque.findByStrRISQUEOFFICIEL", query = "SELECT t FROM TRisque t WHERE t.strRISQUEOFFICIEL = :strRISQUEOFFICIEL"),
        @NamedQuery(name = "TRisque.findByStrSTATUT", query = "SELECT t FROM TRisque t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TRisque.findByDtCREATED", query = "SELECT t FROM TRisque t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TRisque.findByDtUPDATED", query = "SELECT t FROM TRisque t WHERE t.dtUPDATED = :dtUPDATED") })
public class TRisque implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_RISQUE_ID", nullable = false, length = 40)
    private String lgRISQUEID;
    @Column(name = "str_CODE_RISQUE", length = 40)
    private String strCODERISQUE;
    @Column(name = "str_LIBELLE_RISQUE", length = 40)
    private String strLIBELLERISQUE;
    @Column(name = "str_RISQUE_OFFICIEL", length = 40)
    private String strRISQUEOFFICIEL;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgRISQUEID")
    private Collection<TTiersPayant> tTiersPayantCollection;
    @JoinColumn(name = "lg_TYPERISQUE_ID", referencedColumnName = "lg_TYPERISQUE_ID")
    @ManyToOne
    private TTypeRisque lgTYPERISQUEID;
    @OneToMany(mappedBy = "lgRISQUEID")
    private Collection<TAyantDroit> tAyantDroitCollection;

    public TRisque() {
    }

    public TRisque(String lgRISQUEID) {
        this.lgRISQUEID = lgRISQUEID;
    }

    public String getLgRISQUEID() {
        return lgRISQUEID;
    }

    public void setLgRISQUEID(String lgRISQUEID) {
        this.lgRISQUEID = lgRISQUEID;
    }

    public String getStrCODERISQUE() {
        return strCODERISQUE;
    }

    public void setStrCODERISQUE(String strCODERISQUE) {
        this.strCODERISQUE = strCODERISQUE;
    }

    public String getStrLIBELLERISQUE() {
        return strLIBELLERISQUE;
    }

    public void setStrLIBELLERISQUE(String strLIBELLERISQUE) {
        this.strLIBELLERISQUE = strLIBELLERISQUE;
    }

    public String getStrRISQUEOFFICIEL() {
        return strRISQUEOFFICIEL;
    }

    public void setStrRISQUEOFFICIEL(String strRISQUEOFFICIEL) {
        this.strRISQUEOFFICIEL = strRISQUEOFFICIEL;
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
    public Collection<TTiersPayant> getTTiersPayantCollection() {
        return tTiersPayantCollection;
    }

    public void setTTiersPayantCollection(Collection<TTiersPayant> tTiersPayantCollection) {
        this.tTiersPayantCollection = tTiersPayantCollection;
    }

    public TTypeRisque getLgTYPERISQUEID() {
        return lgTYPERISQUEID;
    }

    public void setLgTYPERISQUEID(TTypeRisque lgTYPERISQUEID) {
        this.lgTYPERISQUEID = lgTYPERISQUEID;
    }

    @XmlTransient
    public Collection<TAyantDroit> getTAyantDroitCollection() {
        return tAyantDroitCollection;
    }

    public void setTAyantDroitCollection(Collection<TAyantDroit> tAyantDroitCollection) {
        this.tAyantDroitCollection = tAyantDroitCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgRISQUEID != null ? lgRISQUEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TRisque)) {
            return false;
        }
        TRisque other = (TRisque) object;
        if ((this.lgRISQUEID == null && other.lgRISQUEID != null)
                || (this.lgRISQUEID != null && !this.lgRISQUEID.equals(other.lgRISQUEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TRisque[ lgRISQUEID=" + lgRISQUEID + " ]";
    }

}
