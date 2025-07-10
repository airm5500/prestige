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
@Table(name = "t_evaluationoffreprix")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TEvaluationoffreprix.findAll", query = "SELECT t FROM TEvaluationoffreprix t"),
        @NamedQuery(name = "TEvaluationoffreprix.findByLgEVALUATIONOFFREPRIXID", query = "SELECT t FROM TEvaluationoffreprix t WHERE t.lgEVALUATIONOFFREPRIXID = :lgEVALUATIONOFFREPRIXID"),
        @NamedQuery(name = "TEvaluationoffreprix.findByIntNUMBER", query = "SELECT t FROM TEvaluationoffreprix t WHERE t.intNUMBER = :intNUMBER"),
        @NamedQuery(name = "TEvaluationoffreprix.findByIntNUMBERGRATUIT", query = "SELECT t FROM TEvaluationoffreprix t WHERE t.intNUMBERGRATUIT = :intNUMBERGRATUIT"),
        @NamedQuery(name = "TEvaluationoffreprix.findByIntPRICEOFFRE", query = "SELECT t FROM TEvaluationoffreprix t WHERE t.intPRICEOFFRE = :intPRICEOFFRE"),
        @NamedQuery(name = "TEvaluationoffreprix.findByIntMOISLIQUIDATION", query = "SELECT t FROM TEvaluationoffreprix t WHERE t.intMOISLIQUIDATION = :intMOISLIQUIDATION"),
        @NamedQuery(name = "TEvaluationoffreprix.findByIntQTEPRODUCTVENDU", query = "SELECT t FROM TEvaluationoffreprix t WHERE t.intQTEPRODUCTVENDU = :intQTEPRODUCTVENDU"),
        @NamedQuery(name = "TEvaluationoffreprix.findByDtCREATED", query = "SELECT t FROM TEvaluationoffreprix t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TEvaluationoffreprix.findByDtUPDATED", query = "SELECT t FROM TEvaluationoffreprix t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TEvaluationoffreprix.findByStrSTATUT", query = "SELECT t FROM TEvaluationoffreprix t WHERE t.strSTATUT = :strSTATUT") })
public class TEvaluationoffreprix implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_EVALUATIONOFFREPRIX_ID", nullable = false, length = 40)
    private String lgEVALUATIONOFFREPRIXID;
    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @Column(name = "int_NUMBER_GRATUIT")
    private Integer intNUMBERGRATUIT;
    @Column(name = "int_PRICE_OFFRE")
    private Integer intPRICEOFFRE;
    @Column(name = "int_MOIS_LIQUIDATION")
    private Integer intMOISLIQUIDATION;
    @Column(name = "int_QTE_PRODUCT_VENDU")
    private Integer intQTEPRODUCTVENDU;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TFamille lgFAMILLEID;

    public TEvaluationoffreprix() {
    }

    public TEvaluationoffreprix(String lgEVALUATIONOFFREPRIXID) {
        this.lgEVALUATIONOFFREPRIXID = lgEVALUATIONOFFREPRIXID;
    }

    public String getLgEVALUATIONOFFREPRIXID() {
        return lgEVALUATIONOFFREPRIXID;
    }

    public void setLgEVALUATIONOFFREPRIXID(String lgEVALUATIONOFFREPRIXID) {
        this.lgEVALUATIONOFFREPRIXID = lgEVALUATIONOFFREPRIXID;
    }

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
    }

    public Integer getIntNUMBERGRATUIT() {
        return intNUMBERGRATUIT;
    }

    public void setIntNUMBERGRATUIT(Integer intNUMBERGRATUIT) {
        this.intNUMBERGRATUIT = intNUMBERGRATUIT;
    }

    public Integer getIntPRICEOFFRE() {
        return intPRICEOFFRE;
    }

    public void setIntPRICEOFFRE(Integer intPRICEOFFRE) {
        this.intPRICEOFFRE = intPRICEOFFRE;
    }

    public Integer getIntMOISLIQUIDATION() {
        return intMOISLIQUIDATION;
    }

    public void setIntMOISLIQUIDATION(Integer intMOISLIQUIDATION) {
        this.intMOISLIQUIDATION = intMOISLIQUIDATION;
    }

    public Integer getIntQTEPRODUCTVENDU() {
        return intQTEPRODUCTVENDU;
    }

    public void setIntQTEPRODUCTVENDU(Integer intQTEPRODUCTVENDU) {
        this.intQTEPRODUCTVENDU = intQTEPRODUCTVENDU;
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

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgEVALUATIONOFFREPRIXID != null ? lgEVALUATIONOFFREPRIXID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TEvaluationoffreprix)) {
            return false;
        }
        TEvaluationoffreprix other = (TEvaluationoffreprix) object;
        if ((this.lgEVALUATIONOFFREPRIXID == null && other.lgEVALUATIONOFFREPRIXID != null)
                || (this.lgEVALUATIONOFFREPRIXID != null
                        && !this.lgEVALUATIONOFFREPRIXID.equals(other.lgEVALUATIONOFFREPRIXID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TEvaluationoffreprix[ lgEVALUATIONOFFREPRIXID=" + lgEVALUATIONOFFREPRIXID + " ]";
    }

}
