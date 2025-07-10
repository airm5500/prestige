/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.Date;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import util.DateConverter;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_rupture_history")
public class TRuptureHistory implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_RUPTURE_HISTORY_ID", nullable = false, length = 40)
    private String lgRUPTUREHISTORYID;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT = DateConverter.STATUT_ENABLE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "grossisteId", referencedColumnName = "lg_GROSSISTE_ID")
    @ManyToOne
    private TGrossiste grossisteId;

    public TRuptureHistory() {
    }

    public TRuptureHistory(String lgRUPTUREHISTORYID) {
        this.lgRUPTUREHISTORYID = lgRUPTUREHISTORYID;
    }

    public String getLgRUPTUREHISTORYID() {
        return lgRUPTUREHISTORYID;
    }

    public void setLgRUPTUREHISTORYID(String lgRUPTUREHISTORYID) {
        this.lgRUPTUREHISTORYID = lgRUPTUREHISTORYID;
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

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
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
        hash += (lgRUPTUREHISTORYID != null ? lgRUPTUREHISTORYID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TRuptureHistory)) {
            return false;
        }
        TRuptureHistory other = (TRuptureHistory) object;
        if ((this.lgRUPTUREHISTORYID == null && other.lgRUPTUREHISTORYID != null)
                || (this.lgRUPTUREHISTORYID != null && !this.lgRUPTUREHISTORYID.equals(other.lgRUPTUREHISTORYID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TRuptureHistory[ lgRUPTUREHISTORYID=" + lgRUPTUREHISTORYID + " ]";
    }

    public TGrossiste getGrossisteId() {
        return grossisteId;
    }

    public void setGrossisteId(TGrossiste grossisteId) {
        this.grossisteId = grossisteId;
    }

}
