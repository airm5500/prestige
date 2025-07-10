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
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
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
@Table(name = "t_snapshot_famillesell")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TSnapshotFamillesell.findAll", query = "SELECT t FROM TSnapshotFamillesell t"),
        @NamedQuery(name = "TSnapshotFamillesell.findByLgSNAPSHOTPRODUCTSELLID", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.lgSNAPSHOTPRODUCTSELLID = :lgSNAPSHOTPRODUCTSELLID"),
        @NamedQuery(name = "TSnapshotFamillesell.findByIntNUMBERJANUARY", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.intNUMBERJANUARY = :intNUMBERJANUARY"),
        @NamedQuery(name = "TSnapshotFamillesell.findByIntNUMBERFEBRUARY", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.intNUMBERFEBRUARY = :intNUMBERFEBRUARY"),
        @NamedQuery(name = "TSnapshotFamillesell.findByIntNUMBERMARCH", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.intNUMBERMARCH = :intNUMBERMARCH"),
        @NamedQuery(name = "TSnapshotFamillesell.findByIntNUMBERAPRIL", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.intNUMBERAPRIL = :intNUMBERAPRIL"),
        @NamedQuery(name = "TSnapshotFamillesell.findByIntNUMBERMAY", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.intNUMBERMAY = :intNUMBERMAY"),
        @NamedQuery(name = "TSnapshotFamillesell.findByIntNUMBERJUNE", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.intNUMBERJUNE = :intNUMBERJUNE"),
        @NamedQuery(name = "TSnapshotFamillesell.findByIntNUMBERJULY", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.intNUMBERJULY = :intNUMBERJULY"),
        @NamedQuery(name = "TSnapshotFamillesell.findByIntNUMBERAUGUST", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.intNUMBERAUGUST = :intNUMBERAUGUST"),
        @NamedQuery(name = "TSnapshotFamillesell.findByIntNUMBERSEPTEMBER", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.intNUMBERSEPTEMBER = :intNUMBERSEPTEMBER"),
        @NamedQuery(name = "TSnapshotFamillesell.findByIntNUMBEROCTOBER", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.intNUMBEROCTOBER = :intNUMBEROCTOBER"),
        @NamedQuery(name = "TSnapshotFamillesell.findByIntNUMBERNOVEMBER", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.intNUMBERNOVEMBER = :intNUMBERNOVEMBER"),
        @NamedQuery(name = "TSnapshotFamillesell.findByIntNUMBERDECEMBER", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.intNUMBERDECEMBER = :intNUMBERDECEMBER"),
        @NamedQuery(name = "TSnapshotFamillesell.findByIntYEAR", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.intYEAR = :intYEAR"),
        @NamedQuery(name = "TSnapshotFamillesell.findByLgFAMILLEID", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.lgFAMILLEID = :lgFAMILLEID"),
        @NamedQuery(name = "TSnapshotFamillesell.findByDtCREATED", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TSnapshotFamillesell.findByDtUPDATED", query = "SELECT t FROM TSnapshotFamillesell t WHERE t.dtUPDATED = :dtUPDATED") })
public class TSnapshotFamillesell implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Basic(optional = false)
    @Column(name = "lg_SNAPSHOT_PRODUCTSELL_ID", nullable = false)
    private Integer lgSNAPSHOTPRODUCTSELLID;
    @Column(name = "int_NUMBER_JANUARY")
    private Integer intNUMBERJANUARY;
    @Column(name = "int_NUMBER_FEBRUARY")
    private Integer intNUMBERFEBRUARY;
    @Column(name = "int_NUMBER_MARCH")
    private Integer intNUMBERMARCH;
    @Column(name = "int_NUMBER_APRIL")
    private Integer intNUMBERAPRIL;
    @Column(name = "int_NUMBER_MAY")
    private Integer intNUMBERMAY;
    @Column(name = "int_NUMBER_JUNE")
    private Integer intNUMBERJUNE;
    @Column(name = "int_NUMBER_JULY")
    private Integer intNUMBERJULY;
    @Column(name = "int_NUMBER_AUGUST")
    private Integer intNUMBERAUGUST;
    @Column(name = "int_NUMBER_SEPTEMBER")
    private Integer intNUMBERSEPTEMBER;
    @Column(name = "int_NUMBER_OCTOBER")
    private Integer intNUMBEROCTOBER;
    @Column(name = "int_NUMBER_NOVEMBER")
    private Integer intNUMBERNOVEMBER;
    @Column(name = "int_NUMBER_DECEMBER")
    private Integer intNUMBERDECEMBER;
    @Column(name = "int_YEAR", length = 20)
    private String intYEAR;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TFamille lgFAMILLEID;

    public TSnapshotFamillesell() {
    }

    public TSnapshotFamillesell(Integer lgSNAPSHOTPRODUCTSELLID) {
        this.lgSNAPSHOTPRODUCTSELLID = lgSNAPSHOTPRODUCTSELLID;
    }

    public Integer getLgSNAPSHOTPRODUCTSELLID() {
        return lgSNAPSHOTPRODUCTSELLID;
    }

    public void setLgSNAPSHOTPRODUCTSELLID(Integer lgSNAPSHOTPRODUCTSELLID) {
        this.lgSNAPSHOTPRODUCTSELLID = lgSNAPSHOTPRODUCTSELLID;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public Integer getIntNUMBERJANUARY() {
        return intNUMBERJANUARY;
    }

    public void setIntNUMBERJANUARY(Integer intNUMBERJANUARY) {
        this.intNUMBERJANUARY = intNUMBERJANUARY;
    }

    public Integer getIntNUMBERFEBRUARY() {
        return intNUMBERFEBRUARY;
    }

    public void setIntNUMBERFEBRUARY(Integer intNUMBERFEBRUARY) {
        this.intNUMBERFEBRUARY = intNUMBERFEBRUARY;
    }

    public Integer getIntNUMBERMARCH() {
        return intNUMBERMARCH;
    }

    public void setIntNUMBERMARCH(Integer intNUMBERMARCH) {
        this.intNUMBERMARCH = intNUMBERMARCH;
    }

    public Integer getIntNUMBERAPRIL() {
        return intNUMBERAPRIL;
    }

    public void setIntNUMBERAPRIL(Integer intNUMBERAPRIL) {
        this.intNUMBERAPRIL = intNUMBERAPRIL;
    }

    public Integer getIntNUMBERMAY() {
        return intNUMBERMAY;
    }

    public void setIntNUMBERMAY(Integer intNUMBERMAY) {
        this.intNUMBERMAY = intNUMBERMAY;
    }

    public Integer getIntNUMBERJUNE() {
        return intNUMBERJUNE;
    }

    public void setIntNUMBERJUNE(Integer intNUMBERJUNE) {
        this.intNUMBERJUNE = intNUMBERJUNE;
    }

    public Integer getIntNUMBERJULY() {
        return intNUMBERJULY;
    }

    public void setIntNUMBERJULY(Integer intNUMBERJULY) {
        this.intNUMBERJULY = intNUMBERJULY;
    }

    public Integer getIntNUMBERAUGUST() {
        return intNUMBERAUGUST;
    }

    public void setIntNUMBERAUGUST(Integer intNUMBERAUGUST) {
        this.intNUMBERAUGUST = intNUMBERAUGUST;
    }

    public Integer getIntNUMBERSEPTEMBER() {
        return intNUMBERSEPTEMBER;
    }

    public void setIntNUMBERSEPTEMBER(Integer intNUMBERSEPTEMBER) {
        this.intNUMBERSEPTEMBER = intNUMBERSEPTEMBER;
    }

    public Integer getIntNUMBEROCTOBER() {
        return intNUMBEROCTOBER;
    }

    public void setIntNUMBEROCTOBER(Integer intNUMBEROCTOBER) {
        this.intNUMBEROCTOBER = intNUMBEROCTOBER;
    }

    public Integer getIntNUMBERNOVEMBER() {
        return intNUMBERNOVEMBER;
    }

    public void setIntNUMBERNOVEMBER(Integer intNUMBERNOVEMBER) {
        this.intNUMBERNOVEMBER = intNUMBERNOVEMBER;
    }

    public Integer getIntNUMBERDECEMBER() {
        return intNUMBERDECEMBER;
    }

    public void setIntNUMBERDECEMBER(Integer intNUMBERDECEMBER) {
        this.intNUMBERDECEMBER = intNUMBERDECEMBER;
    }

    public String getIntYEAR() {
        return intYEAR;
    }

    public void setIntYEAR(String intYEAR) {
        this.intYEAR = intYEAR;
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

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgSNAPSHOTPRODUCTSELLID != null ? lgSNAPSHOTPRODUCTSELLID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TSnapshotFamillesell)) {
            return false;
        }
        TSnapshotFamillesell other = (TSnapshotFamillesell) object;
        if ((this.lgSNAPSHOTPRODUCTSELLID == null && other.lgSNAPSHOTPRODUCTSELLID != null)
                || (this.lgSNAPSHOTPRODUCTSELLID != null
                        && !this.lgSNAPSHOTPRODUCTSELLID.equals(other.lgSNAPSHOTPRODUCTSELLID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSnapshotFamillesell[ lgSNAPSHOTPRODUCTSELLID=" + lgSNAPSHOTPRODUCTSELLID + " ]";
    }

}
