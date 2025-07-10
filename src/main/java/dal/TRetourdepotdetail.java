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
@Table(name = "t_retourdepotdetail")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TRetourdepotdetail.findAll", query = "SELECT t FROM TRetourdepotdetail t"),
        @NamedQuery(name = "TRetourdepotdetail.findByLgRETOURDEPOTDETAILID", query = "SELECT t FROM TRetourdepotdetail t WHERE t.lgRETOURDEPOTDETAILID = :lgRETOURDEPOTDETAILID"),
        @NamedQuery(name = "TRetourdepotdetail.findByIntSTOCK", query = "SELECT t FROM TRetourdepotdetail t WHERE t.intSTOCK = :intSTOCK"),
        @NamedQuery(name = "TRetourdepotdetail.findByIntNUMBERRETURN", query = "SELECT t FROM TRetourdepotdetail t WHERE t.intNUMBERRETURN = :intNUMBERRETURN"),
        @NamedQuery(name = "TRetourdepotdetail.findByStrSTATUT", query = "SELECT t FROM TRetourdepotdetail t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TRetourdepotdetail.findByDtCREATED", query = "SELECT t FROM TRetourdepotdetail t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TRetourdepotdetail.findByDtUPDATED", query = "SELECT t FROM TRetourdepotdetail t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TRetourdepotdetail.findByIntPRICEDETAIL", query = "SELECT t FROM TRetourdepotdetail t WHERE t.intPRICEDETAIL = :intPRICEDETAIL"),
        @NamedQuery(name = "TRetourdepotdetail.findByIntPRICE", query = "SELECT t FROM TRetourdepotdetail t WHERE t.intPRICE = :intPRICE") })
public class TRetourdepotdetail implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_RETOURDEPOTDETAIL_ID", nullable = false, length = 40)
    private String lgRETOURDEPOTDETAILID;
    @Column(name = "int_STOCK")
    private Integer intSTOCK;
    @Column(name = "int_NUMBER_RETURN")
    private Integer intNUMBERRETURN;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "int_PRICE_DETAIL")
    private Integer intPRICEDETAIL;
    @Column(name = "int_PRICE")
    private Integer intPRICE;
    @JoinColumn(name = "lg_RETOURDEPOT_ID", referencedColumnName = "lg_RETOURDEPOT_ID", nullable = false)
    @ManyToOne(optional = false)
    private TRetourdepot lgRETOURDEPOTID;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TFamille lgFAMILLEID;

    public TRetourdepotdetail() {
    }

    public TRetourdepotdetail(String lgRETOURDEPOTDETAILID) {
        this.lgRETOURDEPOTDETAILID = lgRETOURDEPOTDETAILID;
    }

    public String getLgRETOURDEPOTDETAILID() {
        return lgRETOURDEPOTDETAILID;
    }

    public void setLgRETOURDEPOTDETAILID(String lgRETOURDEPOTDETAILID) {
        this.lgRETOURDEPOTDETAILID = lgRETOURDEPOTDETAILID;
    }

    public Integer getIntSTOCK() {
        return intSTOCK;
    }

    public void setIntSTOCK(Integer intSTOCK) {
        this.intSTOCK = intSTOCK;
    }

    public Integer getIntNUMBERRETURN() {
        return intNUMBERRETURN;
    }

    public void setIntNUMBERRETURN(Integer intNUMBERRETURN) {
        this.intNUMBERRETURN = intNUMBERRETURN;
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

    public Integer getIntPRICEDETAIL() {
        return intPRICEDETAIL;
    }

    public void setIntPRICEDETAIL(Integer intPRICEDETAIL) {
        this.intPRICEDETAIL = intPRICEDETAIL;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public TRetourdepot getLgRETOURDEPOTID() {
        return lgRETOURDEPOTID;
    }

    public void setLgRETOURDEPOTID(TRetourdepot lgRETOURDEPOTID) {
        this.lgRETOURDEPOTID = lgRETOURDEPOTID;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgRETOURDEPOTDETAILID != null ? lgRETOURDEPOTDETAILID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TRetourdepotdetail)) {
            return false;
        }
        TRetourdepotdetail other = (TRetourdepotdetail) object;
        if ((this.lgRETOURDEPOTDETAILID == null && other.lgRETOURDEPOTDETAILID != null)
                || (this.lgRETOURDEPOTDETAILID != null
                        && !this.lgRETOURDEPOTDETAILID.equals(other.lgRETOURDEPOTDETAILID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TRetourdepotdetail[ lgRETOURDEPOTDETAILID=" + lgRETOURDEPOTDETAILID + " ]";
    }

}
