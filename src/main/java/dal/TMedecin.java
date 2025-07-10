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
import javax.persistence.CascadeType;
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
@Table(name = "t_medecin")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TMedecin.findAll", query = "SELECT t FROM TMedecin t"),
        @NamedQuery(name = "TMedecin.findByLgMEDECINID", query = "SELECT t FROM TMedecin t WHERE t.lgMEDECINID = :lgMEDECINID"),
        @NamedQuery(name = "TMedecin.findByStrCODEINTERNE", query = "SELECT t FROM TMedecin t WHERE t.strCODEINTERNE = :strCODEINTERNE"),
        @NamedQuery(name = "TMedecin.findByStrFIRSTNAME", query = "SELECT t FROM TMedecin t WHERE t.strFIRSTNAME = :strFIRSTNAME"),
        @NamedQuery(name = "TMedecin.findByStrLASTNAME", query = "SELECT t FROM TMedecin t WHERE t.strLASTNAME = :strLASTNAME"),
        @NamedQuery(name = "TMedecin.findByStrADRESSE", query = "SELECT t FROM TMedecin t WHERE t.strADRESSE = :strADRESSE"),
        @NamedQuery(name = "TMedecin.findByStrPHONE", query = "SELECT t FROM TMedecin t WHERE t.strPHONE = :strPHONE"),
        @NamedQuery(name = "TMedecin.findByStrMAIL", query = "SELECT t FROM TMedecin t WHERE t.strMAIL = :strMAIL"),
        @NamedQuery(name = "TMedecin.findByStrSEXE", query = "SELECT t FROM TMedecin t WHERE t.strSEXE = :strSEXE"),
        @NamedQuery(name = "TMedecin.findByStrCommentaire", query = "SELECT t FROM TMedecin t WHERE t.strCommentaire = :strCommentaire"),
        @NamedQuery(name = "TMedecin.findByStrSTATUT", query = "SELECT t FROM TMedecin t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TMedecin.findByDtCREATED", query = "SELECT t FROM TMedecin t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TMedecin.findByDtUPDATED", query = "SELECT t FROM TMedecin t WHERE t.dtUPDATED = :dtUPDATED") })
public class TMedecin implements Serializable {
    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_MEDECIN_ID", nullable = false, length = 40)
    private String lgMEDECINID;
    @Column(name = "str_CODE_INTERNE", length = 40)
    private String strCODEINTERNE;
    @Column(name = "str_FIRST_NAME", length = 40)
    private String strFIRSTNAME;
    @Column(name = "str_LAST_NAME", length = 40)
    private String strLASTNAME;
    @Column(name = "str_ADRESSE", length = 40)
    private String strADRESSE;
    @Column(name = "str_PHONE", length = 20)
    private String strPHONE;
    @Column(name = "str_MAIL", length = 40)
    private String strMAIL;
    @Column(name = "str_SEXE", length = 10)
    private String strSEXE;
    @Column(name = "str_Commentaire", length = 100)
    private String strCommentaire;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @OneToMany(mappedBy = "lgMEDECINID")
    private Collection<TMedecinSpecialite> tMedecinSpecialiteCollection;
    @JoinColumn(name = "lg_SPECIALITE_ID", referencedColumnName = "lg_SPECIALITE_ID")
    @ManyToOne
    private TSpecialite lgSPECIALITEID;
    @JoinColumn(name = "lg_VILLE_ID", referencedColumnName = "lg_VILLE_ID")
    @ManyToOne
    private TVille lgVILLEID;
    @OneToMany(mappedBy = "lgMEDECINID")
    private Collection<TMedecinClient> tMedecinClientCollection;

    public TMedecin() {
    }

    public TMedecin(String lgMEDECINID) {
        this.lgMEDECINID = lgMEDECINID;
    }

    public String getLgMEDECINID() {
        return lgMEDECINID;
    }

    public void setLgMEDECINID(String lgMEDECINID) {
        this.lgMEDECINID = lgMEDECINID;
    }

    public String getStrCODEINTERNE() {
        return strCODEINTERNE;
    }

    public void setStrCODEINTERNE(String strCODEINTERNE) {
        this.strCODEINTERNE = strCODEINTERNE;
    }

    public String getStrFIRSTNAME() {
        return strFIRSTNAME;
    }

    public void setStrFIRSTNAME(String strFIRSTNAME) {
        this.strFIRSTNAME = strFIRSTNAME;
    }

    public String getStrLASTNAME() {
        return strLASTNAME;
    }

    public void setStrLASTNAME(String strLASTNAME) {
        this.strLASTNAME = strLASTNAME;
    }

    public String getStrADRESSE() {
        return strADRESSE;
    }

    public void setStrADRESSE(String strADRESSE) {
        this.strADRESSE = strADRESSE;
    }

    public String getStrPHONE() {
        return strPHONE;
    }

    public void setStrPHONE(String strPHONE) {
        this.strPHONE = strPHONE;
    }

    public String getStrMAIL() {
        return strMAIL;
    }

    public void setStrMAIL(String strMAIL) {
        this.strMAIL = strMAIL;
    }

    public String getStrSEXE() {
        return strSEXE;
    }

    public void setStrSEXE(String strSEXE) {
        this.strSEXE = strSEXE;
    }

    public String getStrCommentaire() {
        return strCommentaire;
    }

    public void setStrCommentaire(String strCommentaire) {
        this.strCommentaire = strCommentaire;
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
    public Collection<TMedecinSpecialite> getTMedecinSpecialiteCollection() {
        return tMedecinSpecialiteCollection;
    }

    public void setTMedecinSpecialiteCollection(Collection<TMedecinSpecialite> tMedecinSpecialiteCollection) {
        this.tMedecinSpecialiteCollection = tMedecinSpecialiteCollection;
    }

    public TSpecialite getLgSPECIALITEID() {
        return lgSPECIALITEID;
    }

    public void setLgSPECIALITEID(TSpecialite lgSPECIALITEID) {
        this.lgSPECIALITEID = lgSPECIALITEID;
    }

    public TVille getLgVILLEID() {
        return lgVILLEID;
    }

    public void setLgVILLEID(TVille lgVILLEID) {
        this.lgVILLEID = lgVILLEID;
    }

    @XmlTransient
    public Collection<TMedecinClient> getTMedecinClientCollection() {
        return tMedecinClientCollection;
    }

    public void setTMedecinClientCollection(Collection<TMedecinClient> tMedecinClientCollection) {
        this.tMedecinClientCollection = tMedecinClientCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgMEDECINID != null ? lgMEDECINID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TMedecin)) {
            return false;
        }
        TMedecin other = (TMedecin) object;
        if ((this.lgMEDECINID == null && other.lgMEDECINID != null)
                || (this.lgMEDECINID != null && !this.lgMEDECINID.equals(other.lgMEDECINID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TMedecin[ lgMEDECINID=" + lgMEDECINID + " ]";
    }

}
