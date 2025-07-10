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
import javax.persistence.JoinColumn;
import javax.persistence.Lob;
import javax.persistence.ManyToOne;
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
@Table(name = "t_user_imprimante")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TUserImprimante.findAll", query = "SELECT t FROM TUserImprimante t"),
        @NamedQuery(name = "TUserImprimante.findByLgUSERIMPRIMQNTEID", query = "SELECT t FROM TUserImprimante t WHERE t.lgUSERIMPRIMQNTEID = :lgUSERIMPRIMQNTEID"),
        @NamedQuery(name = "TUserImprimante.findByDtCREATED", query = "SELECT t FROM TUserImprimante t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TUserImprimante.findByDtUPDATED", query = "SELECT t FROM TUserImprimante t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TUserImprimante.findByStrSTATUT", query = "SELECT t FROM TUserImprimante t WHERE t.strSTATUT = :strSTATUT") })
public class TUserImprimante implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_USER_IMPRIMQNTE_ID", nullable = false, length = 40)
    private String lgUSERIMPRIMQNTEID;
    @Lob
    @Column(name = "str_NAME", length = 65535)
    private String strNAME;
    @Lob
    @Column(name = "str_DESCRIPTION", length = 65535)
    private String strDESCRIPTION;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @JoinColumn(name = "lg_IMPRIMANTE_ID", referencedColumnName = "lg_IMPRIMANTE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TImprimante lgIMPRIMANTEID;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne(optional = false)
    private TUser lgUSERID;

    public TUserImprimante() {
    }

    public TUserImprimante(String lgUSERIMPRIMQNTEID) {
        this.lgUSERIMPRIMQNTEID = lgUSERIMPRIMQNTEID;
    }

    public String getLgUSERIMPRIMQNTEID() {
        return lgUSERIMPRIMQNTEID;
    }

    public void setLgUSERIMPRIMQNTEID(String lgUSERIMPRIMQNTEID) {
        this.lgUSERIMPRIMQNTEID = lgUSERIMPRIMQNTEID;
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

    public TImprimante getLgIMPRIMANTEID() {
        return lgIMPRIMANTEID;
    }

    public void setLgIMPRIMANTEID(TImprimante lgIMPRIMANTEID) {
        this.lgIMPRIMANTEID = lgIMPRIMANTEID;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgUSERIMPRIMQNTEID != null ? lgUSERIMPRIMQNTEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TUserImprimante)) {
            return false;
        }
        TUserImprimante other = (TUserImprimante) object;
        if ((this.lgUSERIMPRIMQNTEID == null && other.lgUSERIMPRIMQNTEID != null)
                || (this.lgUSERIMPRIMQNTEID != null && !this.lgUSERIMPRIMQNTEID.equals(other.lgUSERIMPRIMQNTEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TUserImprimante[ lgUSERIMPRIMQNTEID=" + lgUSERIMPRIMQNTEID + " ]";
    }

}
