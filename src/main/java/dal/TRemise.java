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
@Table(name = "t_remise")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TRemise.findByStrSTATUT", query = "SELECT t FROM TRemise t WHERE t.strSTATUT = :strSTATUT AND t.lgTYPEREMISEID.lgTYPEREMISEID=:typeId"),
        @NamedQuery(name = "TRemise.findByAll", query = "SELECT t FROM TRemise t WHERE t.strSTATUT = :strSTATUT ") })
public class TRemise implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_REMISE_ID", nullable = false, length = 40)
    private String lgREMISEID;
    @Column(name = "str_NAME", length = 50)
    private String strNAME;
    @Column(name = "str_CODE", length = 40)
    private String strCODE;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_TAUX", precision = 5, scale = 2)
    private Double dblTAUX;
    @Column(name = "str_IDS")
    private Integer strIDS;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgREMISEID")
    private Collection<TGrilleRemise> tGrilleRemiseCollection;
    @JoinColumn(name = "lg_TYPE_REMISE_ID", referencedColumnName = "lg_TYPE_REMISE_ID")
    @ManyToOne
    private TTypeRemise lgTYPEREMISEID;
    @OneToMany(mappedBy = "lgREMISEID")
    private Collection<TFamille> tFamilleCollection;

    public TRemise() {
    }

    public TRemise(String lgREMISEID) {
        this.lgREMISEID = lgREMISEID;
    }

    public String getLgREMISEID() {
        return lgREMISEID;
    }

    public void setLgREMISEID(String lgREMISEID) {
        this.lgREMISEID = lgREMISEID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getStrCODE() {
        return strCODE;
    }

    public void setStrCODE(String strCODE) {
        this.strCODE = strCODE;
    }

    public Double getDblTAUX() {
        return dblTAUX;
    }

    public void setDblTAUX(Double dblTAUX) {
        this.dblTAUX = dblTAUX;
    }

    public Integer getStrIDS() {
        return strIDS;
    }

    public void setStrIDS(Integer strIDS) {
        this.strIDS = strIDS;
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

    @XmlTransient
    public Collection<TGrilleRemise> getTGrilleRemiseCollection() {
        return tGrilleRemiseCollection;
    }

    public void setTGrilleRemiseCollection(Collection<TGrilleRemise> tGrilleRemiseCollection) {
        this.tGrilleRemiseCollection = tGrilleRemiseCollection;
    }

    public TTypeRemise getLgTYPEREMISEID() {
        return lgTYPEREMISEID;
    }

    public void setLgTYPEREMISEID(TTypeRemise lgTYPEREMISEID) {
        this.lgTYPEREMISEID = lgTYPEREMISEID;
    }

    @XmlTransient
    public Collection<TFamille> getTFamilleCollection() {
        return tFamilleCollection;
    }

    public void setTFamilleCollection(Collection<TFamille> tFamilleCollection) {
        this.tFamilleCollection = tFamilleCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgREMISEID != null ? lgREMISEID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TRemise)) {
            return false;
        }
        TRemise other = (TRemise) object;
        if ((this.lgREMISEID == null && other.lgREMISEID != null)
                || (this.lgREMISEID != null && !this.lgREMISEID.equals(other.lgREMISEID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TRemise[ lgREMISEID=" + lgREMISEID + " ]";
    }

}
