/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package dal;

import java.io.Serializable;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_skin")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TSkin.findAll", query = "SELECT t FROM TSkin t"),
        @NamedQuery(name = "TSkin.findByLgSKINID", query = "SELECT t FROM TSkin t WHERE t.lgSKINID = :lgSKINID"),
        @NamedQuery(name = "TSkin.findByStrRESOURCE", query = "SELECT t FROM TSkin t WHERE t.strRESOURCE = :strRESOURCE"),
        @NamedQuery(name = "TSkin.findByStrSTATUT", query = "SELECT t FROM TSkin t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TSkin.findByStrDESCRIPTION", query = "SELECT t FROM TSkin t WHERE t.strDESCRIPTION = :strDESCRIPTION"),
        @NamedQuery(name = "TSkin.findByStrDETAILPATH", query = "SELECT t FROM TSkin t WHERE t.strDETAILPATH = :strDETAILPATH") })
public class TSkin implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_SKIN_ID", nullable = false, length = 40)
    private String lgSKINID;
    @Column(name = "str_RESOURCE", length = 50)
    private String strRESOURCE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "str_DESCRIPTION", length = 40)
    private String strDESCRIPTION;
    @Column(name = "str_DETAIL_PATH", length = 50)
    private String strDETAILPATH;

    public TSkin() {
    }

    public TSkin(String lgSKINID) {
        this.lgSKINID = lgSKINID;
    }

    public String getLgSKINID() {
        return lgSKINID;
    }

    public void setLgSKINID(String lgSKINID) {
        this.lgSKINID = lgSKINID;
    }

    public String getStrRESOURCE() {
        return strRESOURCE;
    }

    public void setStrRESOURCE(String strRESOURCE) {
        this.strRESOURCE = strRESOURCE;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getStrDETAILPATH() {
        return strDETAILPATH;
    }

    public void setStrDETAILPATH(String strDETAILPATH) {
        this.strDETAILPATH = strDETAILPATH;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgSKINID != null ? lgSKINID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TSkin)) {
            return false;
        }
        TSkin other = (TSkin) object;
        if ((this.lgSKINID == null && other.lgSKINID != null)
                || (this.lgSKINID != null && !this.lgSKINID.equals(other.lgSKINID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSkin[ lgSKINID=" + lgSKINID + " ]";
    }

}
