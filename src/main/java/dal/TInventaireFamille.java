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
@Table(name = "t_inventaire_famille")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TInventaireFamille.findAll", query = "SELECT t FROM TInventaireFamille t"),
        @NamedQuery(name = "TInventaireFamille.findByLgINVENTAIREFAMILLEID", query = "SELECT t FROM TInventaireFamille t WHERE t.lgINVENTAIREFAMILLEID = :lgINVENTAIREFAMILLEID"),
        @NamedQuery(name = "TInventaireFamille.findByIntNUMBER", query = "SELECT t FROM TInventaireFamille t WHERE t.intNUMBER = :intNUMBER"),
        @NamedQuery(name = "TInventaireFamille.findByIntNUMBERINIT", query = "SELECT t FROM TInventaireFamille t WHERE t.intNUMBERINIT = :intNUMBERINIT"),
        @NamedQuery(name = "TInventaireFamille.findByStrSTATUT", query = "SELECT t FROM TInventaireFamille t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TInventaireFamille.findByDtCREATED", query = "SELECT t FROM TInventaireFamille t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TInventaireFamille.findByDtUPDATED", query = "SELECT t FROM TInventaireFamille t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TInventaireFamille.findByBoolINVENTAIRE", query = "SELECT t FROM TInventaireFamille t WHERE t.boolINVENTAIRE = :boolINVENTAIRE"),
        @NamedQuery(name = "TInventaireFamille.findByStrUPDATEDID", query = "SELECT t FROM TInventaireFamille t WHERE t.strUPDATEDID = :strUPDATEDID") })
public class TInventaireFamille implements Serializable {
    private static final long serialVersionUID = 1L;
    @JoinColumn(name = "lg_FAMILLE_STOCK_ID", referencedColumnName = "lg_FAMILLE_STOCK_ID")
    @ManyToOne
    private TFamilleStock lgFAMILLESTOCKID;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Basic(optional = false)
    @Column(name = "lg_INVENTAIRE_FAMILLE_ID", nullable = false)
    private Long lgINVENTAIREFAMILLEID;
    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @Column(name = "int_NUMBER_INIT")
    private Integer intNUMBERINIT;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "bool_INVENTAIRE")
    private Boolean boolINVENTAIRE;
    @Column(name = "str_UPDATED_ID", length = 40)
    private String strUPDATEDID;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "lg_INVENTAIRE_ID", referencedColumnName = "lg_INVENTAIRE_ID")
    @ManyToOne
    private TInventaire lgINVENTAIREID;

    public TInventaireFamille() {
    }

    public TInventaireFamille(Long lgINVENTAIREFAMILLEID) {
        this.lgINVENTAIREFAMILLEID = lgINVENTAIREFAMILLEID;
    }

    public Long getLgINVENTAIREFAMILLEID() {
        return lgINVENTAIREFAMILLEID;
    }

    public void setLgINVENTAIREFAMILLEID(Long lgINVENTAIREFAMILLEID) {
        this.lgINVENTAIREFAMILLEID = lgINVENTAIREFAMILLEID;
    }

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
    }

    public Integer getIntNUMBERINIT() {
        return intNUMBERINIT;
    }

    public void setIntNUMBERINIT(Integer intNUMBERINIT) {
        this.intNUMBERINIT = intNUMBERINIT;
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

    public Boolean getBoolINVENTAIRE() {
        return boolINVENTAIRE;
    }

    public void setBoolINVENTAIRE(Boolean boolINVENTAIRE) {
        this.boolINVENTAIRE = boolINVENTAIRE;
    }

    public String getStrUPDATEDID() {
        return strUPDATEDID;
    }

    public void setStrUPDATEDID(String strUPDATEDID) {
        this.strUPDATEDID = strUPDATEDID;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public TInventaire getLgINVENTAIREID() {
        return lgINVENTAIREID;
    }

    public void setLgINVENTAIREID(TInventaire lgINVENTAIREID) {
        this.lgINVENTAIREID = lgINVENTAIREID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgINVENTAIREFAMILLEID != null ? lgINVENTAIREFAMILLEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TInventaireFamille)) {
            return false;
        }
        TInventaireFamille other = (TInventaireFamille) object;
        if ((this.lgINVENTAIREFAMILLEID == null && other.lgINVENTAIREFAMILLEID != null)
                || (this.lgINVENTAIREFAMILLEID != null
                        && !this.lgINVENTAIREFAMILLEID.equals(other.lgINVENTAIREFAMILLEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TInventaireFamille[ lgINVENTAIREFAMILLEID=" + lgINVENTAIREFAMILLEID + " ]";
    }

    public TFamilleStock getLgFAMILLESTOCKID() {
        return lgFAMILLESTOCKID;
    }

    public void setLgFAMILLESTOCKID(TFamilleStock lgFAMILLESTOCKID) {
        this.lgFAMILLESTOCKID = lgFAMILLESTOCKID;
    }

}
