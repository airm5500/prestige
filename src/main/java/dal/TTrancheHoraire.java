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
@Table(name = "t_tranche_horaire")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTrancheHoraire.findAll", query = "SELECT t FROM TTrancheHoraire t"),
        @NamedQuery(name = "TTrancheHoraire.findByLgTRANCHEHORAIREID", query = "SELECT t FROM TTrancheHoraire t WHERE t.lgTRANCHEHORAIREID = :lgTRANCHEHORAIREID"),
        @NamedQuery(name = "TTrancheHoraire.findByIntHEUREMIN", query = "SELECT t FROM TTrancheHoraire t WHERE t.intHEUREMIN = :intHEUREMIN"),
        @NamedQuery(name = "TTrancheHoraire.findByIntHEUREMAX", query = "SELECT t FROM TTrancheHoraire t WHERE t.intHEUREMAX = :intHEUREMAX"),
        @NamedQuery(name = "TTrancheHoraire.findByStrLIBELLE", query = "SELECT t FROM TTrancheHoraire t WHERE t.strLIBELLE = :strLIBELLE"),
        @NamedQuery(name = "TTrancheHoraire.findByStrSTATUT", query = "SELECT t FROM TTrancheHoraire t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTrancheHoraire.findByDtCREATED", query = "SELECT t FROM TTrancheHoraire t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTrancheHoraire.findByDtUPDATED", query = "SELECT t FROM TTrancheHoraire t WHERE t.dtUPDATED = :dtUPDATED") })
public class TTrancheHoraire implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TRANCHE_HORAIRE_ID", nullable = false, length = 40)
    private String lgTRANCHEHORAIREID;
    @Column(name = "int_HEURE_MIN")
    private Integer intHEUREMIN;
    @Column(name = "int_HEURE_MAX")
    private Integer intHEUREMAX;
    @Column(name = "str_LIBELLE", length = 20)
    private String strLIBELLE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgTRANCHEHORAIREID")
    private Collection<TSnapShopDalyStat> tSnapShopDalyStatCollection;
    @OneToMany(mappedBy = "lgTRANCHEHORAIREID")
    private Collection<TSnapShopDalyStatFrequentation> tSnapShopDalyStatFrequentationCollection;

    public TTrancheHoraire() {
    }

    public TTrancheHoraire(String lgTRANCHEHORAIREID) {
        this.lgTRANCHEHORAIREID = lgTRANCHEHORAIREID;
    }

    public String getLgTRANCHEHORAIREID() {
        return lgTRANCHEHORAIREID;
    }

    public void setLgTRANCHEHORAIREID(String lgTRANCHEHORAIREID) {
        this.lgTRANCHEHORAIREID = lgTRANCHEHORAIREID;
    }

    public Integer getIntHEUREMIN() {
        return intHEUREMIN;
    }

    public void setIntHEUREMIN(Integer intHEUREMIN) {
        this.intHEUREMIN = intHEUREMIN;
    }

    public Integer getIntHEUREMAX() {
        return intHEUREMAX;
    }

    public void setIntHEUREMAX(Integer intHEUREMAX) {
        this.intHEUREMAX = intHEUREMAX;
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

    @XmlTransient
    public Collection<TSnapShopDalyStat> getTSnapShopDalyStatCollection() {
        return tSnapShopDalyStatCollection;
    }

    public void setTSnapShopDalyStatCollection(Collection<TSnapShopDalyStat> tSnapShopDalyStatCollection) {
        this.tSnapShopDalyStatCollection = tSnapShopDalyStatCollection;
    }

    @XmlTransient
    public Collection<TSnapShopDalyStatFrequentation> getTSnapShopDalyStatFrequentationCollection() {
        return tSnapShopDalyStatFrequentationCollection;
    }

    public void setTSnapShopDalyStatFrequentationCollection(
            Collection<TSnapShopDalyStatFrequentation> tSnapShopDalyStatFrequentationCollection) {
        this.tSnapShopDalyStatFrequentationCollection = tSnapShopDalyStatFrequentationCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgTRANCHEHORAIREID != null ? lgTRANCHEHORAIREID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTrancheHoraire)) {
            return false;
        }
        TTrancheHoraire other = (TTrancheHoraire) object;
        if ((this.lgTRANCHEHORAIREID == null && other.lgTRANCHEHORAIREID != null)
                || (this.lgTRANCHEHORAIREID != null && !this.lgTRANCHEHORAIREID.equals(other.lgTRANCHEHORAIREID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTrancheHoraire[ lgTRANCHEHORAIREID=" + lgTRANCHEHORAIREID + " ]";
    }

}
