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
@Table(name = "t_snap_shop_vente_client")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TSnapShopVenteClient.findAll", query = "SELECT t FROM TSnapShopVenteClient t"),
        @NamedQuery(name = "TSnapShopVenteClient.findByLgID", query = "SELECT t FROM TSnapShopVenteClient t WHERE t.lgID = :lgID"),
        @NamedQuery(name = "TSnapShopVenteClient.findByIntAMOUNTSALE", query = "SELECT t FROM TSnapShopVenteClient t WHERE t.intAMOUNTSALE = :intAMOUNTSALE"),
        @NamedQuery(name = "TSnapShopVenteClient.findByIntAMOUNTAVOIR", query = "SELECT t FROM TSnapShopVenteClient t WHERE t.intAMOUNTAVOIR = :intAMOUNTAVOIR"),
        @NamedQuery(name = "TSnapShopVenteClient.findByDtDAY", query = "SELECT t FROM TSnapShopVenteClient t WHERE t.dtDAY = :dtDAY"),
        @NamedQuery(name = "TSnapShopVenteClient.findByDtCREATED", query = "SELECT t FROM TSnapShopVenteClient t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TSnapShopVenteClient.findByDtUPDATED", query = "SELECT t FROM TSnapShopVenteClient t WHERE t.dtUPDATED = :dtUPDATED") })
public class TSnapShopVenteClient implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Basic(optional = false)
    @Column(name = "lg_ID", nullable = false)
    private Long lgID;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "int_AMOUNT_SALE", precision = 15, scale = 0)
    private Double intAMOUNTSALE;
    @Column(name = "int_AMOUNT_AVOIR", precision = 15, scale = 0)
    private Double intAMOUNTAVOIR;
    @Column(name = "dt_DAY")
    @Temporal(TemporalType.DATE)
    private Date dtDAY;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_CLIENT_ID", referencedColumnName = "lg_CLIENT_ID", nullable = false)
    @ManyToOne(optional = false)
    private TClient lgCLIENTID;

    public TSnapShopVenteClient() {
    }

    public TSnapShopVenteClient(Long lgID) {
        this.lgID = lgID;
    }

    public Long getLgID() {
        return lgID;
    }

    public void setLgID(Long lgID) {
        this.lgID = lgID;
    }

    public Double getIntAMOUNTSALE() {
        return intAMOUNTSALE;
    }

    public void setIntAMOUNTSALE(Double intAMOUNTSALE) {
        this.intAMOUNTSALE = intAMOUNTSALE;
    }

    public Double getIntAMOUNTAVOIR() {
        return intAMOUNTAVOIR;
    }

    public void setIntAMOUNTAVOIR(Double intAMOUNTAVOIR) {
        this.intAMOUNTAVOIR = intAMOUNTAVOIR;
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

    public TClient getLgCLIENTID() {
        return lgCLIENTID;
    }

    public void setLgCLIENTID(TClient lgCLIENTID) {
        this.lgCLIENTID = lgCLIENTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgID != null ? lgID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TSnapShopVenteClient)) {
            return false;
        }
        TSnapShopVenteClient other = (TSnapShopVenteClient) object;
        if ((this.lgID == null && other.lgID != null) || (this.lgID != null && !this.lgID.equals(other.lgID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TSnapShopVenteClient[ lgID=" + lgID + " ]";
    }

}
