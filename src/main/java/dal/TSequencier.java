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
@Table(name = "t_sequencier")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TSequencier.findAll", query = "SELECT t FROM TSequencier t"),
        @NamedQuery(name = "TSequencier.findByLgSEQUENCIERID", query = "SELECT t FROM TSequencier t WHERE t.lgSEQUENCIERID = :lgSEQUENCIERID"),
        @NamedQuery(name = "TSequencier.findByIntSEQUENCE", query = "SELECT t FROM TSequencier t WHERE t.intSEQUENCE = :intSEQUENCE"),
        @NamedQuery(name = "TSequencier.findByDtCREATED", query = "SELECT t FROM TSequencier t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TSequencier.findByDtUPDATED", query = "SELECT t FROM TSequencier t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TSequencier.findByStrSTATUT", query = "SELECT t FROM TSequencier t WHERE t.strSTATUT = :strSTATUT") })
public class TSequencier implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_SEQUENCIER_ID", nullable = false, length = 20)
    private String lgSEQUENCIERID;
    @Column(name = "int_SEQUENCE")
    private Integer intSEQUENCE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @OneToMany(mappedBy = "lgSEQUENCIERID")
    private Collection<TTiersPayant> tTiersPayantCollection;

    public TSequencier() {
    }

    public TSequencier(String lgSEQUENCIERID) {
        this.lgSEQUENCIERID = lgSEQUENCIERID;
    }

    public String getLgSEQUENCIERID() {
        return lgSEQUENCIERID;
    }

    public void setLgSEQUENCIERID(String lgSEQUENCIERID) {
        this.lgSEQUENCIERID = lgSEQUENCIERID;
    }

    public Integer getIntSEQUENCE() {
        return intSEQUENCE;
    }

    public void setIntSEQUENCE(Integer intSEQUENCE) {
        this.intSEQUENCE = intSEQUENCE;
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

    @XmlTransient
    public Collection<TTiersPayant> getTTiersPayantCollection() {
        return tTiersPayantCollection;
    }

    public void setTTiersPayantCollection(Collection<TTiersPayant> tTiersPayantCollection) {
        this.tTiersPayantCollection = tTiersPayantCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgSEQUENCIERID != null ? lgSEQUENCIERID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TSequencier)) {
            return false;
        }
        TSequencier other = (TSequencier) object;
        if ((this.lgSEQUENCIERID == null && other.lgSEQUENCIERID != null)
                || (this.lgSEQUENCIERID != null && !this.lgSEQUENCIERID.equals(other.lgSEQUENCIERID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSequencier[ lgSEQUENCIERID=" + lgSEQUENCIERID + " ]";
    }

}
