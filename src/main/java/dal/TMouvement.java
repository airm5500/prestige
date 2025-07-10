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
@Table(name = "t_mouvement")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TMouvement.findAll", query = "SELECT t FROM TMouvement t"),
        @NamedQuery(name = "TMouvement.findByLgMOUVEMENTID", query = "SELECT t FROM TMouvement t WHERE t.lgMOUVEMENTID = :lgMOUVEMENTID"),
        @NamedQuery(name = "TMouvement.findByPKey", query = "SELECT t FROM TMouvement t WHERE t.pKey = :pKey"),
        @NamedQuery(name = "TMouvement.findByStrTYPEACTION", query = "SELECT t FROM TMouvement t WHERE t.strTYPEACTION = :strTYPEACTION"),
        @NamedQuery(name = "TMouvement.findByStrACTION", query = "SELECT t FROM TMouvement t WHERE t.strACTION = :strACTION"),
        @NamedQuery(name = "TMouvement.findByDtDAY", query = "SELECT t FROM TMouvement t WHERE t.dtDAY = :dtDAY"),
        @NamedQuery(name = "TMouvement.findByDtCREATED", query = "SELECT t FROM TMouvement t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TMouvement.findByDtUPDATED", query = "SELECT t FROM TMouvement t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TMouvement.findByStrSTATUT", query = "SELECT t FROM TMouvement t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TMouvement.findByIntNUMBER", query = "SELECT t FROM TMouvement t WHERE t.intNUMBER = :intNUMBER"),
        @NamedQuery(name = "TMouvement.findByIntNUMBERTRANSACTION", query = "SELECT t FROM TMouvement t WHERE t.intNUMBERTRANSACTION = :intNUMBERTRANSACTION") })
public class TMouvement implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MOUVEMENT_ID", nullable = false, length = 40)
    private String lgMOUVEMENTID;
    @Basic(optional = false)
    @Column(name = "P_KEY", nullable = false, length = 40)
    private String pKey;
    @Basic(optional = false)
    @Column(name = "str_TYPE_ACTION", nullable = false, length = 40)
    private String strTYPEACTION;
    @Basic(optional = false)
    @Column(name = "str_ACTION", nullable = false, length = 40)
    private String strACTION;
    @Column(name = "dt_DAY")
    @Temporal(TemporalType.DATE)
    private Date dtDAY;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @Column(name = "int_NUMBERTRANSACTION")
    private Integer intNUMBERTRANSACTION;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne(optional = false)
    private TUser lgUSERID;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "lg_EMPLACEMENT_ID", referencedColumnName = "lg_EMPLACEMENT_ID")
    @ManyToOne
    private TEmplacement lgEMPLACEMENTID;

    public TMouvement() {
    }

    public TMouvement(String lgMOUVEMENTID) {
        this.lgMOUVEMENTID = lgMOUVEMENTID;
    }

    public TMouvement(String lgMOUVEMENTID, String pKey, String strTYPEACTION, String strACTION) {
        this.lgMOUVEMENTID = lgMOUVEMENTID;
        this.pKey = pKey;
        this.strTYPEACTION = strTYPEACTION;
        this.strACTION = strACTION;
    }

    public String getLgMOUVEMENTID() {
        return lgMOUVEMENTID;
    }

    public void setLgMOUVEMENTID(String lgMOUVEMENTID) {
        this.lgMOUVEMENTID = lgMOUVEMENTID;
    }

    public String getPKey() {
        return pKey;
    }

    public void setPKey(String pKey) {
        this.pKey = pKey;
    }

    public String getStrTYPEACTION() {
        return strTYPEACTION;
    }

    public void setStrTYPEACTION(String strTYPEACTION) {
        this.strTYPEACTION = strTYPEACTION;
    }

    public String getStrACTION() {
        return strACTION;
    }

    public void setStrACTION(String strACTION) {
        this.strACTION = strACTION;
    }

    public Date getDtDAY() {
        return dtDAY;
    }

    public void setDtDAY(Date dtDAY) {
        this.dtDAY = dtDAY;
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

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
    }

    public Integer getIntNUMBERTRANSACTION() {
        return intNUMBERTRANSACTION;
    }

    public void setIntNUMBERTRANSACTION(Integer intNUMBERTRANSACTION) {
        this.intNUMBERTRANSACTION = intNUMBERTRANSACTION;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public TEmplacement getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public void setLgEMPLACEMENTID(TEmplacement lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgMOUVEMENTID != null ? lgMOUVEMENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TMouvement)) {
            return false;
        }
        TMouvement other = (TMouvement) object;
        if ((this.lgMOUVEMENTID == null && other.lgMOUVEMENTID != null)
                || (this.lgMOUVEMENTID != null && !this.lgMOUVEMENTID.equals(other.lgMOUVEMENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TMouvement[ lgMOUVEMENTID=" + lgMOUVEMENTID + " ]";
    }

}
