/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.Objects;
import javax.persistence.Basic;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlTransient;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_suggestion_order")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TSuggestionOrder.findAll", query = "SELECT t FROM TSuggestionOrder t"),
        @NamedQuery(name = "TSuggestionOrder.findByLgSUGGESTIONORDERID", query = "SELECT t FROM TSuggestionOrder t WHERE t.lgSUGGESTIONORDERID = :lgSUGGESTIONORDERID"),
        @NamedQuery(name = "TSuggestionOrder.findByStrREF", query = "SELECT t FROM TSuggestionOrder t WHERE t.strREF = :strREF"),
        @NamedQuery(name = "TSuggestionOrder.findByIntNUMBER", query = "SELECT t FROM TSuggestionOrder t WHERE t.intNUMBER = :intNUMBER"),
        @NamedQuery(name = "TSuggestionOrder.findByDtCREATED", query = "SELECT t FROM TSuggestionOrder t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TSuggestionOrder.findByDtUPDATED", query = "SELECT t FROM TSuggestionOrder t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TSuggestionOrder.findByStrSTATUT", query = "SELECT t FROM TSuggestionOrder t WHERE t.strSTATUT = :strSTATUT") })
public class TSuggestionOrder implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_SUGGESTION_ORDER_ID", nullable = false, length = 40)
    private String lgSUGGESTIONORDERID;
    @Column(name = "str_REF", length = 20)
    private String strREF;
    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @OneToMany(cascade = CascadeType.REMOVE, mappedBy = "lgSUGGESTIONORDERID")
    private Collection<TSuggestionOrderDetails> tSuggestionOrderDetailsCollection;
    @JoinColumn(name = "lg_GROSSISTE_ID", referencedColumnName = "lg_GROSSISTE_ID")
    @ManyToOne
    private TGrossiste lgGROSSISTEID;

    public TSuggestionOrder() {
    }

    public TSuggestionOrder(String lgSUGGESTIONORDERID) {
        this.lgSUGGESTIONORDERID = lgSUGGESTIONORDERID;
    }

    public String getLgSUGGESTIONORDERID() {
        return lgSUGGESTIONORDERID;
    }

    public void setLgSUGGESTIONORDERID(String lgSUGGESTIONORDERID) {
        this.lgSUGGESTIONORDERID = lgSUGGESTIONORDERID;
    }

    public String getStrREF() {
        return strREF;
    }

    public void setStrREF(String strREF) {
        this.strREF = strREF;
    }

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
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

    @XmlTransient
    public Collection<TSuggestionOrderDetails> getTSuggestionOrderDetailsCollection() {
        if (Objects.isNull(tSuggestionOrderDetailsCollection)) {
            tSuggestionOrderDetailsCollection = new ArrayList<>();
        }
        return tSuggestionOrderDetailsCollection;
    }

    public void setTSuggestionOrderDetailsCollection(
            Collection<TSuggestionOrderDetails> tSuggestionOrderDetailsCollection) {
        this.tSuggestionOrderDetailsCollection = tSuggestionOrderDetailsCollection;
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
        hash += (lgSUGGESTIONORDERID != null ? lgSUGGESTIONORDERID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TSuggestionOrder)) {
            return false;
        }
        TSuggestionOrder other = (TSuggestionOrder) object;
        if ((this.lgSUGGESTIONORDERID == null && other.lgSUGGESTIONORDERID != null)
                || (this.lgSUGGESTIONORDERID != null && !this.lgSUGGESTIONORDERID.equals(other.lgSUGGESTIONORDERID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSuggestionOrder[ lgSUGGESTIONORDERID=" + lgSUGGESTIONORDERID + " ]";
    }

}
