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
@Table(name = "t_ajustement_detail")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TAjustementDetail.findAll", query = "SELECT t FROM TAjustementDetail t"),
        @NamedQuery(name = "TAjustementDetail.findByLgAJUSTEMENTDETAILID", query = "SELECT t FROM TAjustementDetail t WHERE t.lgAJUSTEMENTDETAILID = :lgAJUSTEMENTDETAILID"),
        @NamedQuery(name = "TAjustementDetail.findByIntNUMBER", query = "SELECT t FROM TAjustementDetail t WHERE t.intNUMBER = :intNUMBER"),
        @NamedQuery(name = "TAjustementDetail.findByIntNUMBERCURRENTSTOCK", query = "SELECT t FROM TAjustementDetail t WHERE t.intNUMBERCURRENTSTOCK = :intNUMBERCURRENTSTOCK"),
        @NamedQuery(name = "TAjustementDetail.findByIntNUMBERAFTERSTOCK", query = "SELECT t FROM TAjustementDetail t WHERE t.intNUMBERAFTERSTOCK = :intNUMBERAFTERSTOCK"),
        @NamedQuery(name = "TAjustementDetail.findByStrSTATUT", query = "SELECT t FROM TAjustementDetail t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TAjustementDetail.findByDtCREATED", query = "SELECT t FROM TAjustementDetail t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TAjustementDetail.findByDtUPDATED", query = "SELECT t FROM TAjustementDetail t WHERE t.dtUPDATED = :dtUPDATED") })
public class TAjustementDetail implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_AJUSTEMENTDETAIL_ID", nullable = false, length = 40)
    private String lgAJUSTEMENTDETAILID;
    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @Column(name = "int_NUMBER_CURRENT_STOCK")
    private Integer intNUMBERCURRENTSTOCK;
    @Column(name = "int_NUMBER_AFTER_STOCK")
    private Integer intNUMBERAFTERSTOCK;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "lg_AJUSTEMENT_ID", referencedColumnName = "lg_AJUSTEMENT_ID", nullable = false)
    @ManyToOne
    private TAjustement lgAJUSTEMENTID;
    @ManyToOne
    @JoinColumn(name = "motif_ajustement_id", referencedColumnName = "id")
    private MotifAjustement typeAjustement;

    public TAjustementDetail() {
    }

    public TAjustementDetail(String lgAJUSTEMENTDETAILID) {
        this.lgAJUSTEMENTDETAILID = lgAJUSTEMENTDETAILID;
    }

    public MotifAjustement getTypeAjustement() {
        return typeAjustement;
    }

    public void setTypeAjustement(MotifAjustement typeAjustement) {
        this.typeAjustement = typeAjustement;
    }

    public String getLgAJUSTEMENTDETAILID() {
        return lgAJUSTEMENTDETAILID;
    }

    public void setLgAJUSTEMENTDETAILID(String lgAJUSTEMENTDETAILID) {
        this.lgAJUSTEMENTDETAILID = lgAJUSTEMENTDETAILID;
    }

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
    }

    public Integer getIntNUMBERCURRENTSTOCK() {
        return intNUMBERCURRENTSTOCK;
    }

    public void setIntNUMBERCURRENTSTOCK(Integer intNUMBERCURRENTSTOCK) {
        this.intNUMBERCURRENTSTOCK = intNUMBERCURRENTSTOCK;
    }

    public Integer getIntNUMBERAFTERSTOCK() {
        return intNUMBERAFTERSTOCK;
    }

    public void setIntNUMBERAFTERSTOCK(Integer intNUMBERAFTERSTOCK) {
        this.intNUMBERAFTERSTOCK = intNUMBERAFTERSTOCK;
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

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public TAjustement getLgAJUSTEMENTID() {
        return lgAJUSTEMENTID;
    }

    public void setLgAJUSTEMENTID(TAjustement lgAJUSTEMENTID) {
        this.lgAJUSTEMENTID = lgAJUSTEMENTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgAJUSTEMENTDETAILID != null ? lgAJUSTEMENTDETAILID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TAjustementDetail)) {
            return false;
        }
        TAjustementDetail other = (TAjustementDetail) object;
        if ((this.lgAJUSTEMENTDETAILID == null && other.lgAJUSTEMENTDETAILID != null)
                || (this.lgAJUSTEMENTDETAILID != null
                        && !this.lgAJUSTEMENTDETAILID.equals(other.lgAJUSTEMENTDETAILID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TAjustementDetail[ lgAJUSTEMENTDETAILID=" + lgAJUSTEMENTDETAILID + " ]";
    }

}
