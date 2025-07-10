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
@Table(name = "t_bordereau_detail")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TBordereauDetail.findAll", query = "SELECT t FROM TBordereauDetail t"),
        @NamedQuery(name = "TBordereauDetail.findByLgBORDEREAUDETAILID", query = "SELECT t FROM TBordereauDetail t WHERE t.lgBORDEREAUDETAILID = :lgBORDEREAUDETAILID"),
        @NamedQuery(name = "TBordereauDetail.findByStrSTATUT", query = "SELECT t FROM TBordereauDetail t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TBordereauDetail.findByDtCREATED", query = "SELECT t FROM TBordereauDetail t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TBordereauDetail.findByDtUPDATED", query = "SELECT t FROM TBordereauDetail t WHERE t.dtUPDATED = :dtUPDATED") })
public class TBordereauDetail implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_BORDEREAU_DETAIL_ID", nullable = false, length = 40)
    private String lgBORDEREAUDETAILID;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_BORDEREAU_ID", referencedColumnName = "lg_BORDEREAU_ID")
    @ManyToOne
    private TBordereau lgBORDEREAUID;
    @JoinColumn(name = "lg_FACTURE_ID", referencedColumnName = "lg_FACTURE_ID")
    @ManyToOne
    private TFacture lgFACTUREID;

    public TBordereauDetail() {
    }

    public TBordereauDetail(String lgBORDEREAUDETAILID) {
        this.lgBORDEREAUDETAILID = lgBORDEREAUDETAILID;
    }

    public String getLgBORDEREAUDETAILID() {
        return lgBORDEREAUDETAILID;
    }

    public void setLgBORDEREAUDETAILID(String lgBORDEREAUDETAILID) {
        this.lgBORDEREAUDETAILID = lgBORDEREAUDETAILID;
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

    public TBordereau getLgBORDEREAUID() {
        return lgBORDEREAUID;
    }

    public void setLgBORDEREAUID(TBordereau lgBORDEREAUID) {
        this.lgBORDEREAUID = lgBORDEREAUID;
    }

    public TFacture getLgFACTUREID() {
        return lgFACTUREID;
    }

    public void setLgFACTUREID(TFacture lgFACTUREID) {
        this.lgFACTUREID = lgFACTUREID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgBORDEREAUDETAILID != null ? lgBORDEREAUDETAILID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TBordereauDetail)) {
            return false;
        }
        TBordereauDetail other = (TBordereauDetail) object;
        if ((this.lgBORDEREAUDETAILID == null && other.lgBORDEREAUDETAILID != null)
                || (this.lgBORDEREAUDETAILID != null && !this.lgBORDEREAUDETAILID.equals(other.lgBORDEREAUDETAILID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TBordereauDetail[ lgBORDEREAUDETAILID=" + lgBORDEREAUDETAILID + " ]";
    }

}
