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
@Table(name = "t_etat_article")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TEtatArticle.findAll", query = "SELECT t FROM TEtatArticle t"),
        @NamedQuery(name = "TEtatArticle.findByLgETATARTICLEID", query = "SELECT t FROM TEtatArticle t WHERE t.lgETATARTICLEID = :lgETATARTICLEID"),
        @NamedQuery(name = "TEtatArticle.findByStrCODE", query = "SELECT t FROM TEtatArticle t WHERE t.strCODE = :strCODE"),
        @NamedQuery(name = "TEtatArticle.findByStrLIBELLEE", query = "SELECT t FROM TEtatArticle t WHERE t.strLIBELLEE = :strLIBELLEE"),
        @NamedQuery(name = "TEtatArticle.findByDtCREATED", query = "SELECT t FROM TEtatArticle t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TEtatArticle.findByDtUPDATED", query = "SELECT t FROM TEtatArticle t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TEtatArticle.findByStrSTATUT", query = "SELECT t FROM TEtatArticle t WHERE t.strSTATUT = :strSTATUT") })
public class TEtatArticle implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ETAT_ARTICLE_ID", nullable = false, length = 20)
    private String lgETATARTICLEID;
    @Column(name = "str_CODE", length = 40)
    private String strCODE;
    @Column(name = "str_LIBELLEE", length = 40)
    private String strLIBELLEE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;

    public TEtatArticle() {
    }

    public TEtatArticle(String lgETATARTICLEID) {
        this.lgETATARTICLEID = lgETATARTICLEID;
    }

    public String getLgETATARTICLEID() {
        return lgETATARTICLEID;
    }

    public void setLgETATARTICLEID(String lgETATARTICLEID) {
        this.lgETATARTICLEID = lgETATARTICLEID;
    }

    public String getStrCODE() {
        return strCODE;
    }

    public void setStrCODE(String strCODE) {
        this.strCODE = strCODE;
    }

    public String getStrLIBELLEE() {
        return strLIBELLEE;
    }

    public void setStrLIBELLEE(String strLIBELLEE) {
        this.strLIBELLEE = strLIBELLEE;
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

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgETATARTICLEID != null ? lgETATARTICLEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TEtatArticle)) {
            return false;
        }
        TEtatArticle other = (TEtatArticle) object;
        if ((this.lgETATARTICLEID == null && other.lgETATARTICLEID != null)
                || (this.lgETATARTICLEID != null && !this.lgETATARTICLEID.equals(other.lgETATARTICLEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TEtatArticle[ lgETATARTICLEID=" + lgETATARTICLEID + " ]";
    }

}
