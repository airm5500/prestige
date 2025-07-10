/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.Collection;
import java.util.Date;
import javax.persistence.Basic;
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
@Table(name = "t_warehouse")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TWarehouse.findAll", query = "SELECT t FROM TWarehouse t"),
        @NamedQuery(name = "TWarehouse.findByLgWAREHOUSEID", query = "SELECT t FROM TWarehouse t WHERE t.lgWAREHOUSEID = :lgWAREHOUSEID"),
        @NamedQuery(name = "TWarehouse.findByIntNUMLOT", query = "SELECT t FROM TWarehouse t WHERE t.intNUMLOT = :intNUMLOT"),
        @NamedQuery(name = "TWarehouse.findByIntNUMBER", query = "SELECT t FROM TWarehouse t WHERE t.intNUMBER = :intNUMBER"),
        @NamedQuery(name = "TWarehouse.findByDtCREATED", query = "SELECT t FROM TWarehouse t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TWarehouse.findByDtUPDATED", query = "SELECT t FROM TWarehouse t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TWarehouse.findByStrREFLIVRAISON", query = "SELECT t FROM TWarehouse t WHERE t.strREFLIVRAISON = :strREFLIVRAISON"),
        @NamedQuery(name = "TWarehouse.findByDtSORTIEUSINE", query = "SELECT t FROM TWarehouse t WHERE t.dtSORTIEUSINE = :dtSORTIEUSINE"),
        @NamedQuery(name = "TWarehouse.findByDtPEREMPTION", query = "SELECT t FROM TWarehouse t WHERE t.dtPEREMPTION = :dtPEREMPTION"),
        @NamedQuery(name = "TWarehouse.findByIntNUMBERGRATUIT", query = "SELECT t FROM TWarehouse t WHERE t.intNUMBERGRATUIT = :intNUMBERGRATUIT"),
        @NamedQuery(name = "TWarehouse.findByStrSTATUT", query = "SELECT t FROM TWarehouse t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TWarehouse.findByStrREFORDER", query = "SELECT t FROM TWarehouse t WHERE t.strREFORDER = :strREFORDER"),
        @NamedQuery(name = "TWarehouse.findByStrCODEETIQUETTE", query = "SELECT t FROM TWarehouse t WHERE t.strCODEETIQUETTE = :strCODEETIQUETTE"),
        @NamedQuery(name = "TWarehouse.findByIntNUMBERDELETE", query = "SELECT t FROM TWarehouse t WHERE t.intNUMBERDELETE = :intNUMBERDELETE") })
public class TWarehouse implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_WAREHOUSE_ID", nullable = false, length = 40)
    private String lgWAREHOUSEID;
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
    @Column(name = "str_CODE_ETIQUETTE", length = 100)
    private String strCODEETIQUETTE;
    @Column(name = "int_NUMBER_DELETE")
    private Integer intNUMBERDELETE;
    @JoinColumn(name = "lg_TYPEETIQUETTE_ID", referencedColumnName = "lg_TYPEETIQUETTE_ID")
    @ManyToOne
    private TTypeetiquette lgTYPEETIQUETTEID;
    @JoinColumn(name = "lg_GROSSISTE_ID", referencedColumnName = "lg_GROSSISTE_ID")
    @ManyToOne
    private TGrossiste lgGROSSISTEID;
    @JoinColumn(name = "lg_USER_ID", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne(optional = false)
    private TUser lgUSERID;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TFamille lgFAMILLEID;
    @OneToMany(mappedBy = "lgWAREHOUSEID")
    private Collection<TWarehousedetail> tWarehousedetailCollection;
    @Column(name = "stock_initial")
    private Integer stockInitial;
    @Column(name = "stock_final")
    private Integer stockFinal;

    public TWarehouse() {
    }

    public Integer getStockInitial() {
        return stockInitial;
    }

    public void setStockInitial(Integer stockInitial) {
        this.stockInitial = stockInitial;
    }

    public Integer getStockFinal() {
        return stockFinal;
    }

    public void setStockFinal(Integer stockFinal) {
        this.stockFinal = stockFinal;
    }

    public TWarehouse(String lgWAREHOUSEID) {
        this.lgWAREHOUSEID = lgWAREHOUSEID;
    }

    public String getLgWAREHOUSEID() {
        return lgWAREHOUSEID;
    }

    public void setLgWAREHOUSEID(String lgWAREHOUSEID) {
        this.lgWAREHOUSEID = lgWAREHOUSEID;
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

    public String getStrCODEETIQUETTE() {
        return strCODEETIQUETTE;
    }

    public void setStrCODEETIQUETTE(String strCODEETIQUETTE) {
        this.strCODEETIQUETTE = strCODEETIQUETTE;
    }

    public Integer getIntNUMBERDELETE() {
        return intNUMBERDELETE;
    }

    public void setIntNUMBERDELETE(Integer intNUMBERDELETE) {
        this.intNUMBERDELETE = intNUMBERDELETE;
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

    public TUser getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(TUser lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    @XmlTransient
    public Collection<TWarehousedetail> getTWarehousedetailCollection() {
        return tWarehousedetailCollection;
    }

    public void setTWarehousedetailCollection(Collection<TWarehousedetail> tWarehousedetailCollection) {
        this.tWarehousedetailCollection = tWarehousedetailCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgWAREHOUSEID != null ? lgWAREHOUSEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TWarehouse)) {
            return false;
        }
        TWarehouse other = (TWarehouse) object;
        if ((this.lgWAREHOUSEID == null && other.lgWAREHOUSEID != null)
                || (this.lgWAREHOUSEID != null && !this.lgWAREHOUSEID.equals(other.lgWAREHOUSEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TWarehouse[ lgWAREHOUSEID=" + lgWAREHOUSEID + " ]";
    }

}
