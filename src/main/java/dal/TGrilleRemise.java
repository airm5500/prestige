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
import javax.persistence.Lob;
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
@Table(name = "t_grille_remise")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TGrilleRemise.findAll", query = "SELECT t FROM TGrilleRemise t"),
        @NamedQuery(name = "TGrilleRemise.findByLgGRILLEREMISEID", query = "SELECT t FROM TGrilleRemise t WHERE t.lgGRILLEREMISEID = :lgGRILLEREMISEID"),
        @NamedQuery(name = "TGrilleRemise.findByStrCODEGRILLE", query = "SELECT t FROM TGrilleRemise t WHERE t.strCODEGRILLE = :strCODEGRILLE"),
        @NamedQuery(name = "TGrilleRemise.findByDblTAUX", query = "SELECT t FROM TGrilleRemise t WHERE t.dblTAUX = :dblTAUX"),
        @NamedQuery(name = "TGrilleRemise.findByStrSTATUT", query = "SELECT t FROM TGrilleRemise t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TGrilleRemise.findByDtCREATED", query = "SELECT t FROM TGrilleRemise t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TGrilleRemise.findByDtUPDATED", query = "SELECT t FROM TGrilleRemise t WHERE t.dtUPDATED = :dtUPDATED") })
public class TGrilleRemise implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_GRILLE_REMISE_ID", nullable = false, length = 40)
    private String lgGRILLEREMISEID;
    @Column(name = "str_CODE_GRILLE")
    private Integer strCODEGRILLE;
    @Lob
    @Column(name = "str_DESCRIPTION", length = 65535)
    private String strDESCRIPTION;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_TAUX", precision = 15, scale = 3)
    private Double dblTAUX;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @JoinColumn(name = "lg_REMISE_ID", referencedColumnName = "lg_REMISE_ID")
    @ManyToOne
    private TRemise lgREMISEID;

    public TGrilleRemise() {
    }

    public TGrilleRemise(String lgGRILLEREMISEID) {
        this.lgGRILLEREMISEID = lgGRILLEREMISEID;
    }

    public String getLgGRILLEREMISEID() {
        return lgGRILLEREMISEID;
    }

    public void setLgGRILLEREMISEID(String lgGRILLEREMISEID) {
        this.lgGRILLEREMISEID = lgGRILLEREMISEID;
    }

    public Integer getStrCODEGRILLE() {
        return strCODEGRILLE;
    }

    public void setStrCODEGRILLE(Integer strCODEGRILLE) {
        this.strCODEGRILLE = strCODEGRILLE;
    }

    public String getStrDESCRIPTION() {
        return strDESCRIPTION;
    }

    public void setStrDESCRIPTION(String strDESCRIPTION) {
        this.strDESCRIPTION = strDESCRIPTION;
    }

    public Double getDblTAUX() {
        return dblTAUX;
    }

    public void setDblTAUX(Double dblTAUX) {
        this.dblTAUX = dblTAUX;
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

    public TRemise getLgREMISEID() {
        return lgREMISEID;
    }

    public void setLgREMISEID(TRemise lgREMISEID) {
        this.lgREMISEID = lgREMISEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgGRILLEREMISEID != null ? lgGRILLEREMISEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TGrilleRemise)) {
            return false;
        }
        TGrilleRemise other = (TGrilleRemise) object;
        if ((this.lgGRILLEREMISEID == null && other.lgGRILLEREMISEID != null)
                || (this.lgGRILLEREMISEID != null && !this.lgGRILLEREMISEID.equals(other.lgGRILLEREMISEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TGrilleRemise[ lgGRILLEREMISEID=" + lgGRILLEREMISEID + " ]";
    }

}
