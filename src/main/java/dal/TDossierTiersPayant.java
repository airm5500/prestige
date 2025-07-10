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
@Table(name = "t_dossier_tiers_payant")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TDossierTiersPayant.findAll", query = "SELECT t FROM TDossierTiersPayant t"),
        @NamedQuery(name = "TDossierTiersPayant.findByLgDOSSIERTIERSPAYANTID", query = "SELECT t FROM TDossierTiersPayant t WHERE t.lgDOSSIERTIERSPAYANTID = :lgDOSSIERTIERSPAYANTID"),
        @NamedQuery(name = "TDossierTiersPayant.findByStrNUMEROTRI", query = "SELECT t FROM TDossierTiersPayant t WHERE t.strNUMEROTRI = :strNUMEROTRI"),
        @NamedQuery(name = "TDossierTiersPayant.findByStrLIBELLEDOSSIER", query = "SELECT t FROM TDossierTiersPayant t WHERE t.strLIBELLEDOSSIER = :strLIBELLEDOSSIER"),
        @NamedQuery(name = "TDossierTiersPayant.findByStrSTATUT", query = "SELECT t FROM TDossierTiersPayant t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TDossierTiersPayant.findByDtCREATED", query = "SELECT t FROM TDossierTiersPayant t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TDossierTiersPayant.findByDtUPDATED", query = "SELECT t FROM TDossierTiersPayant t WHERE t.dtUPDATED = :dtUPDATED") })
public class TDossierTiersPayant implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_DOSSIER_TIERS_PAYANT_ID", nullable = false, length = 40)
    private String lgDOSSIERTIERSPAYANTID;
    @Column(name = "str_NUMERO_TRI", length = 40)
    private String strNUMEROTRI;
    @Column(name = "str_LIBELLE_DOSSIER", length = 40)
    private String strLIBELLEDOSSIER;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public TDossierTiersPayant() {
    }

    public TDossierTiersPayant(String lgDOSSIERTIERSPAYANTID) {
        this.lgDOSSIERTIERSPAYANTID = lgDOSSIERTIERSPAYANTID;
    }

    public String getLgDOSSIERTIERSPAYANTID() {
        return lgDOSSIERTIERSPAYANTID;
    }

    public void setLgDOSSIERTIERSPAYANTID(String lgDOSSIERTIERSPAYANTID) {
        this.lgDOSSIERTIERSPAYANTID = lgDOSSIERTIERSPAYANTID;
    }

    public String getStrNUMEROTRI() {
        return strNUMEROTRI;
    }

    public void setStrNUMEROTRI(String strNUMEROTRI) {
        this.strNUMEROTRI = strNUMEROTRI;
    }

    public String getStrLIBELLEDOSSIER() {
        return strLIBELLEDOSSIER;
    }

    public void setStrLIBELLEDOSSIER(String strLIBELLEDOSSIER) {
        this.strLIBELLEDOSSIER = strLIBELLEDOSSIER;
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

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgDOSSIERTIERSPAYANTID != null ? lgDOSSIERTIERSPAYANTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TDossierTiersPayant)) {
            return false;
        }
        TDossierTiersPayant other = (TDossierTiersPayant) object;
        if ((this.lgDOSSIERTIERSPAYANTID == null && other.lgDOSSIERTIERSPAYANTID != null)
                || (this.lgDOSSIERTIERSPAYANTID != null
                        && !this.lgDOSSIERTIERSPAYANTID.equals(other.lgDOSSIERTIERSPAYANTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TDossierTiersPayant[ lgDOSSIERTIERSPAYANTID=" + lgDOSSIERTIERSPAYANTID + " ]";
    }

}
