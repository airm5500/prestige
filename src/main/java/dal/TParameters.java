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
import javax.persistence.Lob;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.persistence.UniqueConstraint;
import javax.xml.bind.annotation.XmlRootElement;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_parameters", uniqueConstraints = { @UniqueConstraint(columnNames = { "str_KEY" }) })
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TParameters.findAll", query = "SELECT t FROM TParameters t"),
        @NamedQuery(name = "TParameters.findByStrKEY", query = "SELECT t FROM TParameters t WHERE t.strKEY = :strKEY"),
        @NamedQuery(name = "TParameters.findByStrTYPE", query = "SELECT t FROM TParameters t WHERE t.strTYPE = :strTYPE"),
        @NamedQuery(name = "TParameters.findByStrSTATUT", query = "SELECT t FROM TParameters t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TParameters.findByStrISENKRYPTED", query = "SELECT t FROM TParameters t WHERE t.strISENKRYPTED = :strISENKRYPTED"),
        @NamedQuery(name = "TParameters.findByStrSECTIONKEY", query = "SELECT t FROM TParameters t WHERE t.strSECTIONKEY = :strSECTIONKEY"),
        @NamedQuery(name = "TParameters.findByDtCREATED", query = "SELECT t FROM TParameters t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TParameters.findByDtUPDATED", query = "SELECT t FROM TParameters t WHERE t.dtUPDATED = :dtUPDATED") })
public class TParameters implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "str_KEY", nullable = false, length = 50)
    private String strKEY;
    @Lob
    @Column(name = "str_VALUE", length = 65535)
    private String strVALUE;
    @Lob
    @Column(name = "str_DESCRIPTION", length = 65535)
    private String strDESCRIPTION;
    @Column(name = "str_TYPE", length = 50)
    private String strTYPE;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "str_IS_EN_KRYPTED", length = 50)
    private String strISENKRYPTED;
    @Column(name = "str_SECTION_KEY", length = 50)
    private String strSECTIONKEY;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public TParameters() {
    }

    public TParameters(String strKEY) {
        this.strKEY = strKEY;
    }

    public String getStrKEY() {
        return strKEY;
    }

    public void setStrKEY(String strKEY) {
        this.strKEY = strKEY;
    }

    public String getStrVALUE() {
        return strVALUE;
    }

    public void setStrVALUE(String strVALUE) {
        this.strVALUE = strVALUE;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public String getStrTYPE() {
        return strTYPE;
    }

    public void setStrTYPE(String strTYPE) {
        this.strTYPE = strTYPE;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public String getStrISENKRYPTED() {
        return strISENKRYPTED;
    }

    public void setStrISENKRYPTED(String strISENKRYPTED) {
        this.strISENKRYPTED = strISENKRYPTED;
    }

    public String getStrSECTIONKEY() {
        return strSECTIONKEY;
    }

    public void setStrSECTIONKEY(String strSECTIONKEY) {
        this.strSECTIONKEY = strSECTIONKEY;
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
        hash += (strKEY != null ? strKEY.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TParameters)) {
            return false;
        }
        TParameters other = (TParameters) object;
        if ((this.strKEY == null && other.strKEY != null)
                || (this.strKEY != null && !this.strKEY.equals(other.strKEY))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "TParameters{" + "strKEY=" + strKEY + ", strVALUE=" + strVALUE + ", strDESCRIPTION=" + strDESCRIPTION
                + ", strTYPE=" + strTYPE + ", strSTATUT=" + strSTATUT + ", strISENKRYPTED=" + strISENKRYPTED
                + ", strSECTIONKEY=" + strSECTIONKEY + ", dtCREATED=" + dtCREATED + ", dtUPDATED=" + dtUPDATED + '}';
    }

}
