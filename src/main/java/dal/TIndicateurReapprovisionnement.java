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
@Table(name = "t_indicateur_reapprovisionnement")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TIndicateurReapprovisionnement.findAll", query = "SELECT t FROM TIndicateurReapprovisionnement t"),
        @NamedQuery(name = "TIndicateurReapprovisionnement.findByLgINDICATEURREAPPROVISIONNEMENTID", query = "SELECT t FROM TIndicateurReapprovisionnement t WHERE t.lgINDICATEURREAPPROVISIONNEMENTID = :lgINDICATEURREAPPROVISIONNEMENTID"),
        @NamedQuery(name = "TIndicateurReapprovisionnement.findByStrCODEINDICATEUR", query = "SELECT t FROM TIndicateurReapprovisionnement t WHERE t.strCODEINDICATEUR = :strCODEINDICATEUR"),
        @NamedQuery(name = "TIndicateurReapprovisionnement.findByStrLIBELLEINDICATEUR", query = "SELECT t FROM TIndicateurReapprovisionnement t WHERE t.strLIBELLEINDICATEUR = :strLIBELLEINDICATEUR"),
        @NamedQuery(name = "TIndicateurReapprovisionnement.findByDtCREATED", query = "SELECT t FROM TIndicateurReapprovisionnement t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TIndicateurReapprovisionnement.findByDtUPDATED", query = "SELECT t FROM TIndicateurReapprovisionnement t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TIndicateurReapprovisionnement.findByStrSTATUT", query = "SELECT t FROM TIndicateurReapprovisionnement t WHERE t.strSTATUT = :strSTATUT") })
public class TIndicateurReapprovisionnement implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_INDICATEUR_REAPPROVISIONNEMENT_ID", nullable = false, length = 40)
    private String lgINDICATEURREAPPROVISIONNEMENTID;
    @Column(name = "str_CODE_INDICATEUR", length = 40)
    private String strCODEINDICATEUR;
    @Column(name = "str_LIBELLE_INDICATEUR", length = 100)
    private String strLIBELLEINDICATEUR;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @OneToMany(mappedBy = "lgINDICATEURREAPPROVISIONNEMENTID")
    private Collection<TFamille> tFamilleCollection;

    public TIndicateurReapprovisionnement() {
    }

    public TIndicateurReapprovisionnement(String lgINDICATEURREAPPROVISIONNEMENTID) {
        this.lgINDICATEURREAPPROVISIONNEMENTID = lgINDICATEURREAPPROVISIONNEMENTID;
    }

    public String getLgINDICATEURREAPPROVISIONNEMENTID() {
        return lgINDICATEURREAPPROVISIONNEMENTID;
    }

    public void setLgINDICATEURREAPPROVISIONNEMENTID(String lgINDICATEURREAPPROVISIONNEMENTID) {
        this.lgINDICATEURREAPPROVISIONNEMENTID = lgINDICATEURREAPPROVISIONNEMENTID;
    }

    public String getStrCODEINDICATEUR() {
        return strCODEINDICATEUR;
    }

    public void setStrCODEINDICATEUR(String strCODEINDICATEUR) {
        this.strCODEINDICATEUR = strCODEINDICATEUR;
    }

    public String getStrLIBELLEINDICATEUR() {
        return strLIBELLEINDICATEUR;
    }

    public void setStrLIBELLEINDICATEUR(String strLIBELLEINDICATEUR) {
        this.strLIBELLEINDICATEUR = strLIBELLEINDICATEUR;
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

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
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
        hash += (lgINDICATEURREAPPROVISIONNEMENTID != null ? lgINDICATEURREAPPROVISIONNEMENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TIndicateurReapprovisionnement)) {
            return false;
        }
        TIndicateurReapprovisionnement other = (TIndicateurReapprovisionnement) object;
        if ((this.lgINDICATEURREAPPROVISIONNEMENTID == null && other.lgINDICATEURREAPPROVISIONNEMENTID != null)
                || (this.lgINDICATEURREAPPROVISIONNEMENTID != null
                        && !this.lgINDICATEURREAPPROVISIONNEMENTID.equals(other.lgINDICATEURREAPPROVISIONNEMENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TIndicateurReapprovisionnement[ lgINDICATEURREAPPROVISIONNEMENTID="
                + lgINDICATEURREAPPROVISIONNEMENTID + " ]";
    }

}
