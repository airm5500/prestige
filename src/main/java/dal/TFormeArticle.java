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
@Table(name = "t_forme_article")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TFormeArticle.findAll", query = "SELECT t FROM TFormeArticle t"),
        @NamedQuery(name = "TFormeArticle.findByLgFORMEARTICLEID", query = "SELECT t FROM TFormeArticle t WHERE t.lgFORMEARTICLEID = :lgFORMEARTICLEID"),
        @NamedQuery(name = "TFormeArticle.findByStrCODE", query = "SELECT t FROM TFormeArticle t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TFormeArticle.findByStrLIBELLE", query = "SELECT t FROM TFormeArticle t WHERE t.strLIBELLE = :strLIBELLE"),
        @NamedQuery(name = "TFormeArticle.findByDtCREATED", query = "SELECT t FROM TFormeArticle t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TFormeArticle.findByDtUPDATED", query = "SELECT t FROM TFormeArticle t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TFormeArticle.findByStrSTATUT", query = "SELECT t FROM TFormeArticle t WHERE t.strSTATUT = :strSTATUT") })
public class TFormeArticle implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_FORME_ARTICLE_ID", nullable = false, length = 40)
    private String lgFORMEARTICLEID;
    @Column(name = "str_CODE", length = 40)
    private String strCODE;
    @Column(name = "str_LIBELLE", length = 30)
    private String strLIBELLE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @OneToMany(mappedBy = "lgFORMEID")
    private Collection<TFamille> tFamilleCollection;

    public TFormeArticle() {
    }

    public TFormeArticle(String lgFORMEARTICLEID) {
        this.lgFORMEARTICLEID = lgFORMEARTICLEID;
    }

    public String getLgFORMEARTICLEID() {
        return lgFORMEARTICLEID;
    }

    public void setLgFORMEARTICLEID(String lgFORMEARTICLEID) {
        this.lgFORMEARTICLEID = lgFORMEARTICLEID;
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
    public Collection<TFamille> getTFamilleCollection() {
        return tFamilleCollection;
    }

    public void setTFamilleCollection(Collection<TFamille> tFamilleCollection) {
        this.tFamilleCollection = tFamilleCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgFORMEARTICLEID != null ? lgFORMEARTICLEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TFormeArticle)) {
            return false;
        }
        TFormeArticle other = (TFormeArticle) object;
        if ((this.lgFORMEARTICLEID == null && other.lgFORMEARTICLEID != null)
                || (this.lgFORMEARTICLEID != null && !this.lgFORMEARTICLEID.equals(other.lgFORMEARTICLEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TFormeArticle[ lgFORMEARTICLEID=" + lgFORMEARTICLEID + " ]";
    }

}
