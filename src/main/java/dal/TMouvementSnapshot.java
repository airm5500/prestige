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
@Table(name = "t_mouvement_snapshot")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TMouvementSnapshot.findAll", query = "SELECT t FROM TMouvementSnapshot t"),
        @NamedQuery(name = "TMouvementSnapshot.findByLgMOUVEMENTSNAPSHOTID", query = "SELECT t FROM TMouvementSnapshot t WHERE t.lgMOUVEMENTSNAPSHOTID = :lgMOUVEMENTSNAPSHOTID"),
        @NamedQuery(name = "TMouvementSnapshot.findByDtDAY", query = "SELECT t FROM TMouvementSnapshot t WHERE t.dtDAY = :dtDAY"),
        @NamedQuery(name = "TMouvementSnapshot.findByDtCREATED", query = "SELECT t FROM TMouvementSnapshot t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TMouvementSnapshot.findByDtUPDATED", query = "SELECT t FROM TMouvementSnapshot t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TMouvementSnapshot.findByStrSTATUT", query = "SELECT t FROM TMouvementSnapshot t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TMouvementSnapshot.findByIntSTOCKJOUR", query = "SELECT t FROM TMouvementSnapshot t WHERE t.intSTOCKJOUR = :intSTOCKJOUR"),
        @NamedQuery(name = "TMouvementSnapshot.findByIntSTOCKDEBUT", query = "SELECT t FROM TMouvementSnapshot t WHERE t.intSTOCKDEBUT = :intSTOCKDEBUT"),
        @NamedQuery(name = "TMouvementSnapshot.findByIntNUMBERTRANSACTION", query = "SELECT t FROM TMouvementSnapshot t WHERE t.intNUMBERTRANSACTION = :intNUMBERTRANSACTION") })
public class TMouvementSnapshot implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MOUVEMENT_SNAPSHOT_ID", nullable = false, length = 40)
    private String lgMOUVEMENTSNAPSHOTID;
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
    @Column(name = "int_STOCK_JOUR")
    private Integer intSTOCKJOUR;
    @Column(name = "int_STOCK_DEBUT")
    private Integer intSTOCKDEBUT;
    @Column(name = "int_NUMBERTRANSACTION")
    private Integer intNUMBERTRANSACTION;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "lg_EMPLACEMENT_ID", referencedColumnName = "lg_EMPLACEMENT_ID")
    @ManyToOne
    private TEmplacement lgEMPLACEMENTID;

    public TMouvementSnapshot() {
    }

    public TMouvementSnapshot(String lgMOUVEMENTSNAPSHOTID) {
        this.lgMOUVEMENTSNAPSHOTID = lgMOUVEMENTSNAPSHOTID;
    }

    public String getLgMOUVEMENTSNAPSHOTID() {
        return lgMOUVEMENTSNAPSHOTID;
    }

    public void setLgMOUVEMENTSNAPSHOTID(String lgMOUVEMENTSNAPSHOTID) {
        this.lgMOUVEMENTSNAPSHOTID = lgMOUVEMENTSNAPSHOTID;
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

    public Integer getIntSTOCKJOUR() {
        return intSTOCKJOUR;
    }

    public void setIntSTOCKJOUR(Integer intSTOCKJOUR) {
        this.intSTOCKJOUR = intSTOCKJOUR;
    }

    public Integer getIntSTOCKDEBUT() {
        return intSTOCKDEBUT;
    }

    public void setIntSTOCKDEBUT(Integer intSTOCKDEBUT) {
        this.intSTOCKDEBUT = intSTOCKDEBUT;
    }

    public Integer getIntNUMBERTRANSACTION() {
        return intNUMBERTRANSACTION;
    }

    public void setIntNUMBERTRANSACTION(Integer intNUMBERTRANSACTION) {
        this.intNUMBERTRANSACTION = intNUMBERTRANSACTION;
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
        hash += (lgMOUVEMENTSNAPSHOTID != null ? lgMOUVEMENTSNAPSHOTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TMouvementSnapshot)) {
            return false;
        }
        TMouvementSnapshot other = (TMouvementSnapshot) object;
        if ((this.lgMOUVEMENTSNAPSHOTID == null && other.lgMOUVEMENTSNAPSHOTID != null)
                || (this.lgMOUVEMENTSNAPSHOTID != null
                        && !this.lgMOUVEMENTSNAPSHOTID.equals(other.lgMOUVEMENTSNAPSHOTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TMouvementSnapshot[ lgMOUVEMENTSNAPSHOTID=" + lgMOUVEMENTSNAPSHOTID + " ]";
    }

}
