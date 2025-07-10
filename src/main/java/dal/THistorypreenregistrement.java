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
@Table(name = "t_historypreenregistrement")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "THistorypreenregistrement.findAll", query = "SELECT t FROM THistorypreenregistrement t"),
        @NamedQuery(name = "THistorypreenregistrement.findByLgHISTORYPREENREGISTREMENTID", query = "SELECT t FROM THistorypreenregistrement t WHERE t.lgHISTORYPREENREGISTREMENTID = :lgHISTORYPREENREGISTREMENTID"),
        @NamedQuery(name = "THistorypreenregistrement.findByIntLASTNUMBER", query = "SELECT t FROM THistorypreenregistrement t WHERE t.intLASTNUMBER = :intLASTNUMBER"),
        @NamedQuery(name = "THistorypreenregistrement.findByStrREF", query = "SELECT t FROM THistorypreenregistrement t WHERE t.strREF = :strREF"),
        @NamedQuery(name = "THistorypreenregistrement.findByDtDAY", query = "SELECT t FROM THistorypreenregistrement t WHERE t.dtDAY = :dtDAY"),
        @NamedQuery(name = "THistorypreenregistrement.findByDtCREATED", query = "SELECT t FROM THistorypreenregistrement t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "THistorypreenregistrement.findByDtUPDATED", query = "SELECT t FROM THistorypreenregistrement t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "THistorypreenregistrement.findByStrSTATUT", query = "SELECT t FROM THistorypreenregistrement t WHERE t.strSTATUT = :strSTATUT") })
public class THistorypreenregistrement implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_HISTORYPREENREGISTREMENT_ID", nullable = false, length = 40)
    private String lgHISTORYPREENREGISTREMENTID;
    @Basic(optional = false)
    @Column(name = "int_LAST_NUMBER", nullable = false)
    private int intLASTNUMBER;
    @Basic(optional = false)
    @Column(name = "str_REF", nullable = false, length = 40)
    private String strREF;
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
    @JoinColumn(name = "lg_EMPLACEMENT_ID", referencedColumnName = "lg_EMPLACEMENT_ID", nullable = false)
    @ManyToOne(optional = false)
    private TEmplacement lgEMPLACEMENTID;

    public THistorypreenregistrement() {
    }

    public THistorypreenregistrement(String lgHISTORYPREENREGISTREMENTID) {
        this.lgHISTORYPREENREGISTREMENTID = lgHISTORYPREENREGISTREMENTID;
    }

    public THistorypreenregistrement(String lgHISTORYPREENREGISTREMENTID, int intLASTNUMBER, String strREF) {
        this.lgHISTORYPREENREGISTREMENTID = lgHISTORYPREENREGISTREMENTID;
        this.intLASTNUMBER = intLASTNUMBER;
        this.strREF = strREF;
    }

    public String getLgHISTORYPREENREGISTREMENTID() {
        return lgHISTORYPREENREGISTREMENTID;
    }

    public void setLgHISTORYPREENREGISTREMENTID(String lgHISTORYPREENREGISTREMENTID) {
        this.lgHISTORYPREENREGISTREMENTID = lgHISTORYPREENREGISTREMENTID;
    }

    public int getIntLASTNUMBER() {
        return intLASTNUMBER;
    }

    public void setIntLASTNUMBER(int intLASTNUMBER) {
        this.intLASTNUMBER = intLASTNUMBER;
    }

    public String getStrREF() {
        return strREF;
    }

    public void setStrREF(String strREF) {
        this.strREF = strREF;
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

    public TEmplacement getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public void setLgEMPLACEMENTID(TEmplacement lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgHISTORYPREENREGISTREMENTID != null ? lgHISTORYPREENREGISTREMENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof THistorypreenregistrement)) {
            return false;
        }
        THistorypreenregistrement other = (THistorypreenregistrement) object;
        if ((this.lgHISTORYPREENREGISTREMENTID == null && other.lgHISTORYPREENREGISTREMENTID != null)
                || (this.lgHISTORYPREENREGISTREMENTID != null
                        && !this.lgHISTORYPREENREGISTREMENTID.equals(other.lgHISTORYPREENREGISTREMENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.THistorypreenregistrement[ lgHISTORYPREENREGISTREMENTID=" + lgHISTORYPREENREGISTREMENTID + " ]";
    }

}
