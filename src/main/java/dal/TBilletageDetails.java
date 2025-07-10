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
@Table(name = "t_billetage_details")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TBilletageDetails.findAll", query = "SELECT t FROM TBilletageDetails t"),
        @NamedQuery(name = "TBilletageDetails.findByLgBILLETAGEDETAILSID", query = "SELECT t FROM TBilletageDetails t WHERE t.lgBILLETAGEDETAILSID = :lgBILLETAGEDETAILSID"),
        @NamedQuery(name = "TBilletageDetails.findByIntNBDIXMIL", query = "SELECT t FROM TBilletageDetails t WHERE t.intNBDIXMIL = :intNBDIXMIL"),
        @NamedQuery(name = "TBilletageDetails.findByIntNBCINQMIL", query = "SELECT t FROM TBilletageDetails t WHERE t.intNBCINQMIL = :intNBCINQMIL"),
        @NamedQuery(name = "TBilletageDetails.findByIntNBDEUXMIL", query = "SELECT t FROM TBilletageDetails t WHERE t.intNBDEUXMIL = :intNBDEUXMIL"),
        @NamedQuery(name = "TBilletageDetails.findByIntNBMIL", query = "SELECT t FROM TBilletageDetails t WHERE t.intNBMIL = :intNBMIL"),
        @NamedQuery(name = "TBilletageDetails.findByIntNBCINQCENT", query = "SELECT t FROM TBilletageDetails t WHERE t.intNBCINQCENT = :intNBCINQCENT"),
        @NamedQuery(name = "TBilletageDetails.findByIntAUTRE", query = "SELECT t FROM TBilletageDetails t WHERE t.intAUTRE = :intAUTRE"),
        @NamedQuery(name = "TBilletageDetails.findByDtCREATED", query = "SELECT t FROM TBilletageDetails t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TBilletageDetails.findByDtUPDATED", query = "SELECT t FROM TBilletageDetails t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TBilletageDetails.findByLgUPDATEDBY", query = "SELECT t FROM TBilletageDetails t WHERE t.lgUPDATEDBY = :lgUPDATEDBY"),
        @NamedQuery(name = "TBilletageDetails.findByLgCREATEDBY", query = "SELECT t FROM TBilletageDetails t WHERE t.lgCREATEDBY = :lgCREATEDBY") })
public class TBilletageDetails implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_BILLETAGE_DETAILS_ID", nullable = false, length = 40)
    private String lgBILLETAGEDETAILSID;
    @Column(name = "int_NB_DIX_MIL")
    private Integer intNBDIXMIL;
    @Column(name = "int_NB_CINQ_MIL")
    private Integer intNBCINQMIL;
    @Column(name = "int_NB_DEUX_MIL")
    private Integer intNBDEUXMIL;
    @Column(name = "int_NB_MIL")
    private Integer intNBMIL;
    @Column(name = "int_NB_CINQ_CENT")
    private Integer intNBCINQCENT;
    @Column(name = "int_AUTRE")
    private Integer intAUTRE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "lg_UPDATED_BY", length = 20)
    private String lgUPDATEDBY;
    @Column(name = "lg_CREATED_BY", length = 20)
    private String lgCREATEDBY;
    @JoinColumn(name = "lg_BILLETAGE_ID", referencedColumnName = "lg_BILLETAGE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TBilletage lgBILLETAGEID;

    public TBilletageDetails() {
    }

    public TBilletageDetails(String lgBILLETAGEDETAILSID) {
        this.lgBILLETAGEDETAILSID = lgBILLETAGEDETAILSID;
    }

    public String getLgBILLETAGEDETAILSID() {
        return lgBILLETAGEDETAILSID;
    }

    public void setLgBILLETAGEDETAILSID(String lgBILLETAGEDETAILSID) {
        this.lgBILLETAGEDETAILSID = lgBILLETAGEDETAILSID;
    }

    public Integer getIntNBDIXMIL() {
        return intNBDIXMIL;
    }

    public void setIntNBDIXMIL(Integer intNBDIXMIL) {
        this.intNBDIXMIL = intNBDIXMIL;
    }

    public Integer getIntNBCINQMIL() {
        return intNBCINQMIL;
    }

    public void setIntNBCINQMIL(Integer intNBCINQMIL) {
        this.intNBCINQMIL = intNBCINQMIL;
    }

    public Integer getIntNBDEUXMIL() {
        return intNBDEUXMIL;
    }

    public void setIntNBDEUXMIL(Integer intNBDEUXMIL) {
        this.intNBDEUXMIL = intNBDEUXMIL;
    }

    public Integer getIntNBMIL() {
        return intNBMIL;
    }

    public void setIntNBMIL(Integer intNBMIL) {
        this.intNBMIL = intNBMIL;
    }

    public Integer getIntNBCINQCENT() {
        return intNBCINQCENT;
    }

    public void setIntNBCINQCENT(Integer intNBCINQCENT) {
        this.intNBCINQCENT = intNBCINQCENT;
    }

    public Integer getIntAUTRE() {
        return intAUTRE;
    }

    public void setIntAUTRE(Integer intAUTRE) {
        this.intAUTRE = intAUTRE;
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

    public String getLgUPDATEDBY() {
        return lgUPDATEDBY;
    }

    public void setLgUPDATEDBY(String lgUPDATEDBY) {
        this.lgUPDATEDBY = lgUPDATEDBY;
    }

    public String getLgCREATEDBY() {
        return lgCREATEDBY;
    }

    public void setLgCREATEDBY(String lgCREATEDBY) {
        this.lgCREATEDBY = lgCREATEDBY;
    }

    public TBilletage getLgBILLETAGEID() {
        return lgBILLETAGEID;
    }

    public void setLgBILLETAGEID(TBilletage lgBILLETAGEID) {
        this.lgBILLETAGEID = lgBILLETAGEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgBILLETAGEDETAILSID != null ? lgBILLETAGEDETAILSID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TBilletageDetails)) {
            return false;
        }
        TBilletageDetails other = (TBilletageDetails) object;
        if ((this.lgBILLETAGEDETAILSID == null && other.lgBILLETAGEDETAILSID != null)
                || (this.lgBILLETAGEDETAILSID != null
                        && !this.lgBILLETAGEDETAILSID.equals(other.lgBILLETAGEDETAILSID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TBilletageDetails[ lgBILLETAGEDETAILSID=" + lgBILLETAGEDETAILSID + " ]";
    }

}
