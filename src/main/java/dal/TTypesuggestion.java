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
@Table(name = "t_typesuggestion")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TTypesuggestion.findAll", query = "SELECT t FROM TTypesuggestion t"),
        @NamedQuery(name = "TTypesuggestion.findByLgTYPESUGGESTIONID", query = "SELECT t FROM TTypesuggestion t WHERE t.lgTYPESUGGESTIONID = :lgTYPESUGGESTIONID"),
        @NamedQuery(name = "TTypesuggestion.findByStrNAME", query = "SELECT t FROM TTypesuggestion t WHERE t.strNAME = :strNAME"),
        @NamedQuery(name = "TTypesuggestion.findByStrDESCRIPTION", query = "SELECT t FROM TTypesuggestion t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TTypesuggestion.findByStrSTATUT", query = "SELECT t FROM TTypesuggestion t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TTypesuggestion.findByDtCREATED", query = "SELECT t FROM TTypesuggestion t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TTypesuggestion.findByDtUPDATED", query = "SELECT t FROM TTypesuggestion t WHERE t.dtUPDATED = :dtUPDATED") })
public class TTypesuggestion implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_TYPESUGGESTION_ID", nullable = false, length = 40)
    private String lgTYPESUGGESTIONID;
    @Column(name = "str_NAME", length = 40)
    private String strNAME;
    @Column(name = "str_DESCRIPTION", length = 40)
    private String strDESCRIPTION;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public TTypesuggestion() {
    }

    public TTypesuggestion(String lgTYPESUGGESTIONID) {
        this.lgTYPESUGGESTIONID = lgTYPESUGGESTIONID;
    }

    public String getLgTYPESUGGESTIONID() {
        return lgTYPESUGGESTIONID;
    }

    public void setLgTYPESUGGESTIONID(String lgTYPESUGGESTIONID) {
        this.lgTYPESUGGESTIONID = lgTYPESUGGESTIONID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
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
        hash += (lgTYPESUGGESTIONID != null ? lgTYPESUGGESTIONID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TTypesuggestion)) {
            return false;
        }
        TTypesuggestion other = (TTypesuggestion) object;
        if ((this.lgTYPESUGGESTIONID == null && other.lgTYPESUGGESTIONID != null)
                || (this.lgTYPESUGGESTIONID != null && !this.lgTYPESUGGESTIONID.equals(other.lgTYPESUGGESTIONID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TTypesuggestion[ lgTYPESUGGESTIONID=" + lgTYPESUGGESTIONID + " ]";
    }

}
