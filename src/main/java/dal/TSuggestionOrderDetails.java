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
import javax.persistence.Index;
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
@Table(name = "t_suggestion_order_details", indexes = {
        @Index(name = "t_suggestion_order_detailsIdex", columnList = "str_STATUT")

})
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TSuggestionOrderDetails.findAll", query = "SELECT t FROM TSuggestionOrderDetails t"),
        @NamedQuery(name = "TSuggestionOrderDetails.findByLgSUGGESTIONORDERDETAILSID", query = "SELECT t FROM TSuggestionOrderDetails t WHERE t.lgSUGGESTIONORDERDETAILSID = :lgSUGGESTIONORDERDETAILSID"),
        @NamedQuery(name = "TSuggestionOrderDetails.findByIntNUMBER", query = "SELECT t FROM TSuggestionOrderDetails t WHERE t.intNUMBER = :intNUMBER"),
        @NamedQuery(name = "TSuggestionOrderDetails.findByIntPRICE", query = "SELECT t FROM TSuggestionOrderDetails t WHERE t.intPRICE = :intPRICE"),
        @NamedQuery(name = "TSuggestionOrderDetails.findByIntPRICEDETAIL", query = "SELECT t FROM TSuggestionOrderDetails t WHERE t.intPRICEDETAIL = :intPRICEDETAIL"),
        @NamedQuery(name = "TSuggestionOrderDetails.findByIntPAFDETAIL", query = "SELECT t FROM TSuggestionOrderDetails t WHERE t.intPAFDETAIL = :intPAFDETAIL"),
        @NamedQuery(name = "TSuggestionOrderDetails.findByDtCREATED", query = "SELECT t FROM TSuggestionOrderDetails t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TSuggestionOrderDetails.findByDtUPDATED", query = "SELECT t FROM TSuggestionOrderDetails t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TSuggestionOrderDetails.findByStrSTATUT", query = "SELECT t FROM TSuggestionOrderDetails t WHERE t.strSTATUT = :strSTATUT") })
public class TSuggestionOrderDetails implements Serializable, Cloneable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_SUGGESTION_ORDER_DETAILS_ID", nullable = false, length = 40)
    private String lgSUGGESTIONORDERDETAILSID;
    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @Column(name = "int_PRICE")
    private Integer intPRICE;
    @Column(name = "int_PRICE_DETAIL")
    private Integer intPRICEDETAIL;
    @Column(name = "int_PAF_DETAIL")
    private Integer intPAFDETAIL;
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
    @JoinColumn(name = "lg_SUGGESTION_ORDER_ID", referencedColumnName = "lg_SUGGESTION_ORDER_ID", nullable = false)
    @ManyToOne(optional = false)
    private TSuggestionOrder lgSUGGESTIONORDERID;
    @JoinColumn(name = "lg_GROSSISTE_ID", referencedColumnName = "lg_GROSSISTE_ID")
    @ManyToOne
    private TGrossiste lgGROSSISTEID;
    @Column(name = "b_falg")
    private Boolean bFalg;

    public TSuggestionOrderDetails() {
    }

    public TSuggestionOrderDetails(String lgSUGGESTIONORDERDETAILSID) {
        this.lgSUGGESTIONORDERDETAILSID = lgSUGGESTIONORDERDETAILSID;
    }

    public String getLgSUGGESTIONORDERDETAILSID() {
        return lgSUGGESTIONORDERDETAILSID;
    }

    public void setLgSUGGESTIONORDERDETAILSID(String lgSUGGESTIONORDERDETAILSID) {
        this.lgSUGGESTIONORDERDETAILSID = lgSUGGESTIONORDERDETAILSID;
    }

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public Integer getIntPRICEDETAIL() {
        return intPRICEDETAIL;
    }

    public void setIntPRICEDETAIL(Integer intPRICEDETAIL) {
        this.intPRICEDETAIL = intPRICEDETAIL;
    }

    public Integer getIntPAFDETAIL() {
        return intPAFDETAIL;
    }

    public void setIntPAFDETAIL(Integer intPAFDETAIL) {
        this.intPAFDETAIL = intPAFDETAIL;
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

    public TSuggestionOrder getLgSUGGESTIONORDERID() {
        return lgSUGGESTIONORDERID;
    }

    public void setLgSUGGESTIONORDERID(TSuggestionOrder lgSUGGESTIONORDERID) {
        this.lgSUGGESTIONORDERID = lgSUGGESTIONORDERID;
    }

    public TGrossiste getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public void setLgGROSSISTEID(TGrossiste lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgSUGGESTIONORDERDETAILSID != null ? lgSUGGESTIONORDERDETAILSID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TSuggestionOrderDetails)) {
            return false;
        }
        TSuggestionOrderDetails other = (TSuggestionOrderDetails) object;
        if ((this.lgSUGGESTIONORDERDETAILSID == null && other.lgSUGGESTIONORDERDETAILSID != null)
                || (this.lgSUGGESTIONORDERDETAILSID != null
                        && !this.lgSUGGESTIONORDERDETAILSID.equals(other.lgSUGGESTIONORDERDETAILSID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSuggestionOrderDetails[ lgSUGGESTIONORDERDETAILSID=" + lgSUGGESTIONORDERDETAILSID + " ]";
    }

    public Boolean getBFalg() {
        return bFalg;
    }

    public void setBFalg(Boolean bFalg) {
        this.bFalg = bFalg;
    }

    @Override
    public TSuggestionOrderDetails clone() {

        try {
            return (TSuggestionOrderDetails) super.clone();
        } catch (CloneNotSupportedException ex) {
            return null;
        }

    }

}
