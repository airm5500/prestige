/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;
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
import org.hibernate.annotations.Type;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_order_detail", indexes = { @Index(name = "t_order_detailIdex", columnList = "str_STATUT")

})
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TOrderDetail.findByLgORDERID", query = "SELECT t FROM TOrderDetail t WHERE t.lgORDERID = :lgORDERID"),
        @NamedQuery(name = "TOrderDetail.findByLgORDERIDAndLgFAMILLEID", query = "SELECT t FROM TOrderDetail t WHERE t.lgORDERID = :lgORDERID AND t.lgFAMILLEID =:lgFAMILLEID") })
public class TOrderDetail implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_ORDERDETAIL_ID", nullable = false, length = 20)
    private String lgORDERDETAILID;
    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @Column(name = "int_PRICE")
    private Integer intPRICE;
    @Column(name = "int_PAF_DETAIL")
    private Integer intPAFDETAIL;
    @Column(name = "int_PRICE_DETAIL")
    private Integer intPRICEDETAIL;
    @Column(name = "int_QTE_MANQUANT")
    private Integer intQTEMANQUANT;
    @Column(name = "int_QTE_REP_GROSSISTE")
    private Integer intQTEREPGROSSISTE;
    @Column(name = "bool_BL")
    private Boolean boolBL;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_GROSSISTE_ID", referencedColumnName = "lg_GROSSISTE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TGrossiste lgGROSSISTEID;
    @JoinColumn(name = "lg_ORDER_ID", referencedColumnName = "lg_ORDER_ID")
    @ManyToOne
    private TOrder lgORDERID;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TFamille lgFAMILLEID;
    @Column(name = "prixUnitaire")
    private Integer prixUnitaire;
    @Column(name = "prixAchat")
    private Integer prixAchat = 0;
    @Column(name = "int_ORERSTATUS")
    private Short intORERSTATUS;
    @Column(name = "ug")
    private int ug = 0;
    @Type(type = "json")
    @Column(columnDefinition = "json", name = "lots")
    private Set<OrderDetailLot> lots = new HashSet<>();

    public TOrderDetail() {
    }

    public Set<OrderDetailLot> getLots() {
        return lots;
    }

    public void setLots(Set<OrderDetailLot> lots) {
        this.lots = lots;
    }

    public TOrderDetail(String lgORDERDETAILID) {
        this.lgORDERDETAILID = lgORDERDETAILID;
    }

    public String getLgORDERDETAILID() {
        return lgORDERDETAILID;
    }

    public void setLgORDERDETAILID(String lgORDERDETAILID) {
        this.lgORDERDETAILID = lgORDERDETAILID;
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

    public Integer getIntPAFDETAIL() {
        return intPAFDETAIL;
    }

    public void setIntPAFDETAIL(Integer intPAFDETAIL) {
        this.intPAFDETAIL = intPAFDETAIL;
    }

    public Integer getIntPRICEDETAIL() {
        return intPRICEDETAIL;
    }

    public void setIntPRICEDETAIL(Integer intPRICEDETAIL) {
        this.intPRICEDETAIL = intPRICEDETAIL;
    }

    public Integer getIntQTEMANQUANT() {
        return intQTEMANQUANT;
    }

    public void setIntQTEMANQUANT(Integer intQTEMANQUANT) {
        this.intQTEMANQUANT = intQTEMANQUANT;
    }

    public Integer getIntQTEREPGROSSISTE() {
        return intQTEREPGROSSISTE;
    }

    public void setIntQTEREPGROSSISTE(Integer intQTEREPGROSSISTE) {
        this.intQTEREPGROSSISTE = intQTEREPGROSSISTE;
    }

    public Boolean getBoolBL() {
        return boolBL;
    }

    public void setBoolBL(Boolean boolBL) {
        this.boolBL = boolBL;
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

    public TGrossiste getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public void setLgGROSSISTEID(TGrossiste lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    public TOrder getLgORDERID() {
        return lgORDERID;
    }

    public void setLgORDERID(TOrder lgORDERID) {
        this.lgORDERID = lgORDERID;
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
        hash += (lgORDERDETAILID != null ? lgORDERDETAILID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TOrderDetail)) {
            return false;
        }
        TOrderDetail other = (TOrderDetail) object;
        if ((this.lgORDERDETAILID == null && other.lgORDERDETAILID != null)
                || (this.lgORDERDETAILID != null && !this.lgORDERDETAILID.equals(other.lgORDERDETAILID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TOrderDetail[ lgORDERDETAILID=" + lgORDERDETAILID + " ]";
    }

    public Short getIntORERSTATUS() {
        return intORERSTATUS;
    }

    public void setIntORERSTATUS(Short intORERSTATUS) {
        this.intORERSTATUS = intORERSTATUS;
    }

    public Integer getPrixUnitaire() {
        return prixUnitaire;
    }

    public void setPrixUnitaire(Integer prixUnitaire) {
        this.prixUnitaire = prixUnitaire;
    }

    public Integer getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(Integer prixAchat) {
        this.prixAchat = prixAchat;
    }

    public int getUg() {
        return ug;
    }

    public void setUg(int ug) {
        this.ug = ug;
    }

}
