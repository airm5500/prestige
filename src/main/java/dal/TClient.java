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
@Table(name = "t_client")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TClient.findAll", query = "SELECT t FROM TClient t"),
        @NamedQuery(name = "TClient.findByLgCLIENTID", query = "SELECT t FROM TClient t WHERE t.lgCLIENTID = :lgCLIENTID"),
        @NamedQuery(name = "TClient.findByStrCODEINTERNE", query = "SELECT t FROM TClient t WHERE t.strCODEINTERNE = :strCODEINTERNE"),
        @NamedQuery(name = "TClient.findByStrFIRSTNAME", query = "SELECT t FROM TClient t WHERE t.strFIRSTNAME = :strFIRSTNAME"),
        @NamedQuery(name = "TClient.findByStrLASTNAME", query = "SELECT t FROM TClient t WHERE t.strLASTNAME = :strLASTNAME"),
        @NamedQuery(name = "TClient.findByStrNUMEROSECURITESOCIAL", query = "SELECT t FROM TClient t WHERE t.strNUMEROSECURITESOCIAL = :strNUMEROSECURITESOCIAL"),
        @NamedQuery(name = "TClient.findByDtNAISSANCE", query = "SELECT t FROM TClient t WHERE t.dtNAISSANCE = :dtNAISSANCE"),
        @NamedQuery(name = "TClient.findByStrSEXE", query = "SELECT t FROM TClient t WHERE t.strSEXE = :strSEXE"),
        @NamedQuery(name = "TClient.findByStrADRESSE", query = "SELECT t FROM TClient t WHERE t.strADRESSE = :strADRESSE"),
        @NamedQuery(name = "TClient.findByStrDOMICILE", query = "SELECT t FROM TClient t WHERE t.strDOMICILE = :strDOMICILE"),
        @NamedQuery(name = "TClient.findByStrAUTREADRESSE", query = "SELECT t FROM TClient t WHERE t.strAUTREADRESSE = :strAUTREADRESSE"),
        @NamedQuery(name = "TClient.findByStrCODEPOSTAL", query = "SELECT t FROM TClient t WHERE t.strCODEPOSTAL = :strCODEPOSTAL"),
        @NamedQuery(name = "TClient.findByStrCOMMENTAIRE", query = "SELECT t FROM TClient t WHERE t.strCOMMENTAIRE = :strCOMMENTAIRE"),

        @NamedQuery(name = "TClient.findByStrSTATUT", query = "SELECT t FROM TClient t WHERE t.strSTATUT = :strSTATUT") })
public class TClient implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_CLIENT_ID", nullable = false, length = 40)
    private String lgCLIENTID;
    @Column(name = "email", length = 100)
    private String email;
    @Column(name = "str_CODE_INTERNE", length = 40)
    private String strCODEINTERNE;
    @Column(name = "str_FIRST_NAME", length = 50)
    private String strFIRSTNAME;
    @Column(name = "str_LAST_NAME", length = 50)
    private String strLASTNAME;
    @Column(name = "str_NUMERO_SECURITE_SOCIAL", length = 50)
    private String strNUMEROSECURITESOCIAL;
    @Column(name = "dt_NAISSANCE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtNAISSANCE;
    @Column(name = "str_SEXE", length = 10)
    private String strSEXE;
    @Column(name = "str_ADRESSE", length = 50)
    private String strADRESSE;
    @Column(name = "str_DOMICILE", length = 50)
    private String strDOMICILE;
    @Column(name = "str_AUTRE_ADRESSE", length = 50)
    private String strAUTREADRESSE;
    @Column(name = "str_CODE_POSTAL", length = 50)
    private String strCODEPOSTAL;
    @Column(name = "str_COMMENTAIRE", length = 100)
    private String strCOMMENTAIRE;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "str_STATUT", length = 40)
    private String strSTATUT;
    @JoinColumn(name = "lg_VILLE_ID", referencedColumnName = "lg_VILLE_ID")
    @ManyToOne
    private TVille lgVILLEID;
    @JoinColumn(name = "lg_TYPE_CLIENT_ID", referencedColumnName = "lg_TYPE_CLIENT_ID")
    @ManyToOne
    private TTypeClient lgTYPECLIENTID;
    @OneToMany(mappedBy = "lgCLIENTID")
    private Collection<TCompteClient> tCompteClientCollection;
    @OneToMany(mappedBy = "lgCLIENTID")
    private Collection<TSnapShopVenteClient> tSnapShopVenteClientCollection;
    @OneToMany(mappedBy = "lgCLIENTID")
    private Collection<TAyantDroit> tAyantDroitCollection;
    @OneToMany(mappedBy = "lgCLIENTID")
    private Collection<TMedecinClient> tMedecinClientCollection;
    @OneToMany(mappedBy = "lgCLIENTID")
    private Collection<TRetrocession> tRetrocessionCollection;
    @JoinColumn(name = "lg_COMPANY_ID", referencedColumnName = "lg_COMPANY_ID")
    @ManyToOne
    private TCompany lgCOMPANYID;
    @JoinColumn(name = "lg_CATEGORY_CLIENT_ID", referencedColumnName = "lg_CATEGORY_CLIENT_ID")
    @ManyToOne
    private TCategoryClient lgCATEGORYCLIENTID;
    @JoinColumn(name = "remise", referencedColumnName = "lg_REMISE_ID")
    @ManyToOne
    private TRemise remise;

    public TClient() {
    }

    public TCompany getLgCOMPANYID() {
        return lgCOMPANYID;
    }

    public TRemise getRemise() {
        return remise;
    }

    public void setRemise(TRemise remise) {
        this.remise = remise;
    }

    public void setLgCOMPANYID(TCompany lgCOMPANYID) {
        this.lgCOMPANYID = lgCOMPANYID;
    }

    public TClient(String lgCLIENTID) {
        this.lgCLIENTID = lgCLIENTID;
    }

    public String getLgCLIENTID() {
        return lgCLIENTID;
    }

    public void setLgCLIENTID(String lgCLIENTID) {
        this.lgCLIENTID = lgCLIENTID;
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

    public String getStrNUMEROSECURITESOCIAL() {
        return strNUMEROSECURITESOCIAL;
    }

    public void setStrNUMEROSECURITESOCIAL(String strNUMEROSECURITESOCIAL) {
        this.strNUMEROSECURITESOCIAL = strNUMEROSECURITESOCIAL;
    }

    public Date getDtNAISSANCE() {
        return dtNAISSANCE;
    }

    public void setDtNAISSANCE(Date dtNAISSANCE) {
        this.dtNAISSANCE = dtNAISSANCE;
    }

    public String getStrSEXE() {
        return strSEXE;
    }

    public void setStrSEXE(String strSEXE) {
        this.strSEXE = strSEXE;
    }

    public String getStrADRESSE() {
        return strADRESSE;
    }

    public void setStrADRESSE(String strADRESSE) {
        this.strADRESSE = strADRESSE;
    }

    public String getStrDOMICILE() {
        return strDOMICILE;
    }

    public void setStrDOMICILE(String strDOMICILE) {
        this.strDOMICILE = strDOMICILE;
    }

    public String getStrAUTREADRESSE() {
        return strAUTREADRESSE;
    }

    public void setStrAUTREADRESSE(String strAUTREADRESSE) {
        this.strAUTREADRESSE = strAUTREADRESSE;
    }

    public String getStrCODEPOSTAL() {
        return strCODEPOSTAL;
    }

    public void setStrCODEPOSTAL(String strCODEPOSTAL) {
        this.strCODEPOSTAL = strCODEPOSTAL;
    }

    public String getStrCOMMENTAIRE() {
        return strCOMMENTAIRE;
    }

    public void setStrCOMMENTAIRE(String strCOMMENTAIRE) {
        this.strCOMMENTAIRE = strCOMMENTAIRE;
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

    public TVille getLgVILLEID() {
        return lgVILLEID;
    }

    public void setLgVILLEID(TVille lgVILLEID) {
        this.lgVILLEID = lgVILLEID;
    }

    public TTypeClient getLgTYPECLIENTID() {
        return lgTYPECLIENTID;
    }

    public void setLgTYPECLIENTID(TTypeClient lgTYPECLIENTID) {
        this.lgTYPECLIENTID = lgTYPECLIENTID;
    }

    @XmlTransient
    public Collection<TCompteClient> getTCompteClientCollection() {
        return tCompteClientCollection;
    }

    public void setTCompteClientCollection(Collection<TCompteClient> tCompteClientCollection) {
        this.tCompteClientCollection = tCompteClientCollection;
    }

    @XmlTransient
    public Collection<TSnapShopVenteClient> getTSnapShopVenteClientCollection() {
        return tSnapShopVenteClientCollection;
    }

    public void setTSnapShopVenteClientCollection(Collection<TSnapShopVenteClient> tSnapShopVenteClientCollection) {
        this.tSnapShopVenteClientCollection = tSnapShopVenteClientCollection;
    }

    @XmlTransient
    public Collection<TAyantDroit> getTAyantDroitCollection() {
        return tAyantDroitCollection;
    }

    public void setTAyantDroitCollection(Collection<TAyantDroit> tAyantDroitCollection) {
        this.tAyantDroitCollection = tAyantDroitCollection;
    }

    @XmlTransient
    public Collection<TMedecinClient> getTMedecinClientCollection() {
        return tMedecinClientCollection;
    }

    public void setTMedecinClientCollection(Collection<TMedecinClient> tMedecinClientCollection) {
        this.tMedecinClientCollection = tMedecinClientCollection;
    }

    @XmlTransient
    public Collection<TRetrocession> getTRetrocessionCollection() {
        return tRetrocessionCollection;
    }

    public void setTRetrocessionCollection(Collection<TRetrocession> tRetrocessionCollection) {
        this.tRetrocessionCollection = tRetrocessionCollection;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgCLIENTID != null ? lgCLIENTID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TClient)) {
            return false;
        }
        TClient other = (TClient) object;
        if ((this.lgCLIENTID == null && other.lgCLIENTID != null)
                || (this.lgCLIENTID != null && !this.lgCLIENTID.equals(other.lgCLIENTID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "TClient{" + "lgCATEGORYCLIENTID=" + lgCATEGORYCLIENTID + ", lgCLIENTID=" + lgCLIENTID
                + ", strCODEINTERNE=" + strCODEINTERNE + ", strFIRSTNAME=" + strFIRSTNAME + ", strLASTNAME="
                + strLASTNAME + ", strNUMEROSECURITESOCIAL=" + strNUMEROSECURITESOCIAL + ", dtNAISSANCE=" + dtNAISSANCE
                + ", strSEXE=" + strSEXE + ", strADRESSE=" + strADRESSE + ", strDOMICILE=" + strDOMICILE
                + ", strAUTREADRESSE=" + strAUTREADRESSE + ", strCODEPOSTAL=" + strCODEPOSTAL + ", strCOMMENTAIRE="
                + strCOMMENTAIRE + ", dtCREATED=" + dtCREATED + ", dtUPDATED=" + dtUPDATED + ", strSTATUT=" + strSTATUT
                + '}';
    }

    public TCategoryClient getLgCATEGORYCLIENTID() {
        return lgCATEGORYCLIENTID;
    }

    public void setLgCATEGORYCLIENTID(TCategoryClient lgCATEGORYCLIENTID) {
        this.lgCATEGORYCLIENTID = lgCATEGORYCLIENTID;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

}
