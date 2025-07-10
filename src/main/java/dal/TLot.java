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
@Table(name = "t_lot")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TLot.findAll", query = "SELECT t FROM TLot t"),
        @NamedQuery(name = "TLot.findByLgLOTID", query = "SELECT t FROM TLot t WHERE t.lgLOTID = :lgLOTID"),
        @NamedQuery(name = "TLot.findByIntNUMLOT", query = "SELECT t FROM TLot t WHERE t.intNUMLOT = :intNUMLOT"),
        @NamedQuery(name = "TLot.findByIntNUMBER", query = "SELECT t FROM TLot t WHERE t.intNUMBER = :intNUMBER"),
        @NamedQuery(name = "TLot.findByDtCREATED", query = "SELECT t FROM TLot t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TLot.findByDtUPDATED", query = "SELECT t FROM TLot t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TLot.findByStrREFLIVRAISON", query = "SELECT t FROM TLot t WHERE t.strREFLIVRAISON = :strREFLIVRAISON"),
        @NamedQuery(name = "TLot.findByDtSORTIEUSINE", query = "SELECT t FROM TLot t WHERE t.dtSORTIEUSINE = :dtSORTIEUSINE"),
        @NamedQuery(name = "TLot.findByDtPEREMPTION", query = "SELECT t FROM TLot t WHERE t.dtPEREMPTION = :dtPEREMPTION"),
        @NamedQuery(name = "TLot.findByIntNUMBERGRATUIT", query = "SELECT t FROM TLot t WHERE t.intNUMBERGRATUIT = :intNUMBERGRATUIT"),
        @NamedQuery(name = "TLot.findByStrSTATUT", query = "SELECT t FROM TLot t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TLot.findByStrREFORDER", query = "SELECT t FROM TLot t WHERE t.strREFORDER = :strREFORDER") })
public class TLot implements Serializable {

    @Column(name = "int_QTY_VENDUE")
    private Integer intQTYVENDUE;
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_LOT_ID", nullable = false, length = 40)
    private String lgLOTID;
    @Column(name = "int_NUM_LOT", length = 40)
    private String intNUMLOT;
    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_REF_LIVRAISON", length = 50)
    private String strREFLIVRAISON;
    @Column(name = "dt_SORTIE_USINE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtSORTIEUSINE;
    @Column(name = "dt_PEREMPTION")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtPEREMPTION;
    @Column(name = "int_NUMBER_GRATUIT")
    private Integer intNUMBERGRATUIT;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "str_REF_ORDER", length = 20)
    private String strREFORDER;
    @JoinColumn(name = "lg_TYPEETIQUETTE_ID", referencedColumnName = "lg_TYPEETIQUETTE_ID")
    @ManyToOne
    private TTypeetiquette lgTYPEETIQUETTEID;
    @JoinColumn(name = "lg_GROSSISTE_ID", referencedColumnName = "lg_GROSSISTE_ID")
    @ManyToOne
    private TGrossiste lgGROSSISTEID;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne(optional = false)
    private TUser lgUSERID;

    public TLot() {
    }

    public TLot(String lgLOTID) {
        this.lgLOTID = lgLOTID;
    }

    public String getLgLOTID() {
        return lgLOTID;
    }

    public void setLgLOTID(String lgLOTID) {
        this.lgLOTID = lgLOTID;
    }

    public String getIntNUMLOT() {
        return intNUMLOT;
    }

    public void setIntNUMLOT(String intNUMLOT) {
        this.intNUMLOT = intNUMLOT;
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

    public String getStrREFLIVRAISON() {
        return strREFLIVRAISON;
    }

    public void setStrREFLIVRAISON(String strREFLIVRAISON) {
        this.strREFLIVRAISON = strREFLIVRAISON;
    }

    public Date getDtSORTIEUSINE() {
        return dtSORTIEUSINE;
    }

    public void setDtSORTIEUSINE(Date dtSORTIEUSINE) {
        this.dtSORTIEUSINE = dtSORTIEUSINE;
    }

    public Date getDtPEREMPTION() {
        return dtPEREMPTION;
    }

    public void setDtPEREMPTION(Date dtPEREMPTION) {
        this.dtPEREMPTION = dtPEREMPTION;
    }

    public Integer getIntNUMBERGRATUIT() {
        return intNUMBERGRATUIT;
    }

    public void setIntNUMBERGRATUIT(Integer intNUMBERGRATUIT) {
        this.intNUMBERGRATUIT = intNUMBERGRATUIT;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public String getStrREFORDER() {
        return strREFORDER;
    }

    public void setStrREFORDER(String strREFORDER) {
        this.strREFORDER = strREFORDER;
    }

    public TTypeetiquette getLgTYPEETIQUETTEID() {
        return lgTYPEETIQUETTEID;
    }

    public void setLgTYPEETIQUETTEID(TTypeetiquette lgTYPEETIQUETTEID) {
        this.lgTYPEETIQUETTEID = lgTYPEETIQUETTEID;
    }

    public TGrossiste getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public void setLgGROSSISTEID(TGrossiste lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgLOTID != null ? lgLOTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TLot)) {
            return false;
        }
        TLot other = (TLot) object;
        if ((this.lgLOTID == null && other.lgLOTID != null)
                || (this.lgLOTID != null && !this.lgLOTID.equals(other.lgLOTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TLot[ lgLOTID=" + lgLOTID + " ]";
    }

    public Integer getIntQTYVENDUE() {
        return intQTYVENDUE;
    }

    public void setIntQTYVENDUE(Integer intQTYVENDUE) {
        this.intQTYVENDUE = intQTYVENDUE;
    }

}
