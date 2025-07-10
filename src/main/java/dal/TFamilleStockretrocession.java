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
@Table(name = "t_famille_stockretrocession")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TFamilleStockretrocession.findAll", query = "SELECT t FROM TFamilleStockretrocession t"),
        @NamedQuery(name = "TFamilleStockretrocession.findByLgFAMILLESTOCKRETROCESSIONID", query = "SELECT t FROM TFamilleStockretrocession t WHERE t.lgFAMILLESTOCKRETROCESSIONID = :lgFAMILLESTOCKRETROCESSIONID"),
        @NamedQuery(name = "TFamilleStockretrocession.findByIntNUMBER", query = "SELECT t FROM TFamilleStockretrocession t WHERE t.intNUMBER = :intNUMBER"),
        @NamedQuery(name = "TFamilleStockretrocession.findByIntNUMBERAVAILABLE", query = "SELECT t FROM TFamilleStockretrocession t WHERE t.intNUMBERAVAILABLE = :intNUMBERAVAILABLE"),
        @NamedQuery(name = "TFamilleStockretrocession.findByDtCREATED", query = "SELECT t FROM TFamilleStockretrocession t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TFamilleStockretrocession.findByDtUPDATED", query = "SELECT t FROM TFamilleStockretrocession t WHERE t.dtUPDATED = :dtUPDATED") })
public class TFamilleStockretrocession implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_FAMILLE_STOCKRETROCESSION_ID", nullable = false, length = 40)
    private String lgFAMILLESTOCKRETROCESSIONID;
    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @Column(name = "int_NUMBER_AVAILABLE")
    private Integer intNUMBERAVAILABLE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TFamille lgFAMILLEID;

    public TFamilleStockretrocession() {
    }

    public TFamilleStockretrocession(String lgFAMILLESTOCKRETROCESSIONID) {
        this.lgFAMILLESTOCKRETROCESSIONID = lgFAMILLESTOCKRETROCESSIONID;
    }

    public String getLgFAMILLESTOCKRETROCESSIONID() {
        return lgFAMILLESTOCKRETROCESSIONID;
    }

    public void setLgFAMILLESTOCKRETROCESSIONID(String lgFAMILLESTOCKRETROCESSIONID) {
        this.lgFAMILLESTOCKRETROCESSIONID = lgFAMILLESTOCKRETROCESSIONID;
    }

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
    }

    public Integer getIntNUMBERAVAILABLE() {
        return intNUMBERAVAILABLE;
    }

    public void setIntNUMBERAVAILABLE(Integer intNUMBERAVAILABLE) {
        this.intNUMBERAVAILABLE = intNUMBERAVAILABLE;
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

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgFAMILLESTOCKRETROCESSIONID != null ? lgFAMILLESTOCKRETROCESSIONID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TFamilleStockretrocession)) {
            return false;
        }
        TFamilleStockretrocession other = (TFamilleStockretrocession) object;
        if ((this.lgFAMILLESTOCKRETROCESSIONID == null && other.lgFAMILLESTOCKRETROCESSIONID != null)
                || (this.lgFAMILLESTOCKRETROCESSIONID != null
                        && !this.lgFAMILLESTOCKRETROCESSIONID.equals(other.lgFAMILLESTOCKRETROCESSIONID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TFamilleStockretrocession[ lgFAMILLESTOCKRETROCESSIONID=" + lgFAMILLESTOCKRETROCESSIONID + " ]";
    }

}
