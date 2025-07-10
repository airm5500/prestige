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
@Table(name = "t_warehousedetail")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TWarehousedetail.findAll", query = "SELECT t FROM TWarehousedetail t"),
        @NamedQuery(name = "TWarehousedetail.findByLgWAREHOUSEDETAILID", query = "SELECT t FROM TWarehousedetail t WHERE t.lgWAREHOUSEDETAILID = :lgWAREHOUSEDETAILID"),
        @NamedQuery(name = "TWarehousedetail.findByDtCREATED", query = "SELECT t FROM TWarehousedetail t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TWarehousedetail.findByDtUPDATED", query = "SELECT t FROM TWarehousedetail t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TWarehousedetail.findByStrREFLIVRAISON", query = "SELECT t FROM TWarehousedetail t WHERE t.strREFLIVRAISON = :strREFLIVRAISON"),
        @NamedQuery(name = "TWarehousedetail.findByDtPEREMPTION", query = "SELECT t FROM TWarehousedetail t WHERE t.dtPEREMPTION = :dtPEREMPTION"),
        @NamedQuery(name = "TWarehousedetail.findByStrSTATUT", query = "SELECT t FROM TWarehousedetail t WHERE t.strSTATUT = :strSTATUT") })
public class TWarehousedetail implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_WAREHOUSEDETAIL_ID", nullable = false, length = 40)
    private String lgWAREHOUSEDETAILID;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_REF_LIVRAISON", length = 50)
    private String strREFLIVRAISON;
    @Column(name = "dt_PEREMPTION")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtPEREMPTION;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @JoinColumn(name = "lg_WAREHOUSE_ID", referencedColumnName = "lg_WAREHOUSE_ID")
    @ManyToOne
    private TWarehouse lgWAREHOUSEID;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;

    public TWarehousedetail() {
    }

    public TWarehousedetail(String lgWAREHOUSEDETAILID) {
        this.lgWAREHOUSEDETAILID = lgWAREHOUSEDETAILID;
    }

    public String getLgWAREHOUSEDETAILID() {
        return lgWAREHOUSEDETAILID;
    }

    public void setLgWAREHOUSEDETAILID(String lgWAREHOUSEDETAILID) {
        this.lgWAREHOUSEDETAILID = lgWAREHOUSEDETAILID;
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

    public Date getDtPEREMPTION() {
        return dtPEREMPTION;
    }

    public void setDtPEREMPTION(Date dtPEREMPTION) {
        this.dtPEREMPTION = dtPEREMPTION;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public TWarehouse getLgWAREHOUSEID() {
        return lgWAREHOUSEID;
    }

    public void setLgWAREHOUSEID(TWarehouse lgWAREHOUSEID) {
        this.lgWAREHOUSEID = lgWAREHOUSEID;
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
        hash += (lgWAREHOUSEDETAILID != null ? lgWAREHOUSEDETAILID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TWarehousedetail)) {
            return false;
        }
        TWarehousedetail other = (TWarehousedetail) object;
        if ((this.lgWAREHOUSEDETAILID == null && other.lgWAREHOUSEDETAILID != null)
                || (this.lgWAREHOUSEDETAILID != null && !this.lgWAREHOUSEDETAILID.equals(other.lgWAREHOUSEDETAILID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TWarehousedetail[ lgWAREHOUSEDETAILID=" + lgWAREHOUSEDETAILID + " ]";
    }

}
