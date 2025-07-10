/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.math.BigDecimal;
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
@Table(name = "t_facture_detail")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TFactureDetail.findAll", query = "SELECT t FROM TFactureDetail t"),
        @NamedQuery(name = "TFactureDetail.findByFactureId", query = "SELECT t FROM TFactureDetail t WHERE t.lgFACTUREID.lgFACTUREID = :lgFACTUREID"),
        @NamedQuery(name = "TFactureDetail.findByStrREF", query = "SELECT t FROM TFactureDetail t WHERE t.strREF = :strREF"),
        @NamedQuery(name = "TFactureDetail.findByStrREFDESCRIPTION", query = "SELECT t FROM TFactureDetail t WHERE t.strREFDESCRIPTION = :strREFDESCRIPTION"),
        @NamedQuery(name = "TFactureDetail.findByPKey", query = "SELECT t FROM TFactureDetail t WHERE t.pKey = :pKey"), })
public class TFactureDetail implements Serializable {

    private static final long serialVersionUID = 1L;
    @Column(name = "str_CATEGORY_CLIENT")
    private String strCATEGORYCLIENT;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_FACTURE_DETAIL_ID", nullable = false, length = 40)
    private String lgFACTUREDETAILID;
    @Column(name = "str_REF", length = 40)
    private String strREF;
    @Column(name = "str_REF_DESCRIPTION", length = 40)
    private String strREFDESCRIPTION;
    // @Max(value=?) @Min(value=?)//if you know range of your decimal fields consider using these annotations to enforce
    // field validation
    @Column(name = "dbl_MONTANT", precision = 15, scale = 3)
    private Double dblMONTANT;
    @Column(name = "dbl_MONTANT_PAYE", precision = 15, scale = 3)
    private Double dblMONTANTPAYE;
    @Column(name = "dbl_MONTANT_RESTANT", precision = 15, scale = 3)
    private Double dblMONTANTRESTANT;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "P_KEY", length = 40)
    private String pKey;
    @Column(name = "str_FIRST_NAME_CUSTOMER", length = 70)
    private String strFIRSTNAMECUSTOMER;
    @Column(name = "str_LAST_NAME_CUSTOMER", length = 70)
    private String strLASTNAMECUSTOMER;
    @Column(name = "str_NUMERO_SECURITE_SOCIAL", length = 50)
    private String strNUMEROSECURITESOCIAL;
    @Column(name = "dbl_MONTANT_Brut", precision = 15, scale = 3)
    private BigDecimal dblMONTANTBrut;
    @Column(name = "dbl_MONTANT_REMISE", precision = 15, scale = 3)
    private BigDecimal dblMONTANTREMISE;
    @OneToMany(mappedBy = "lgFACTUREDETAILID")
    private Collection<TDossierReglementDetail> tDossierReglementDetailCollection;
    @JoinColumn(name = "lg_FACTURE_ID", referencedColumnName = "lg_FACTURE_ID")
    @ManyToOne
    private TFacture lgFACTUREID;
    @JoinColumn(name = "lg_CLIENT_ID", referencedColumnName = "lg_CLIENT_ID")
    @ManyToOne
    private TClient client;
    @JoinColumn(name = "lg_AYANTS_DROITS_ID", referencedColumnName = "lg_AYANTS_DROITS_ID")
    @ManyToOne
    private TAyantDroit ayantDroit;
    @Column(name = "montantRemiseVente")
    private Integer montantRemiseVente = 0;
    @Column(name = "montantTvaVente")
    private Integer montantTvaVente = 0;
    @Column(name = "montantVente")
    private Integer montantVente = 0;
    @Temporal(TemporalType.TIMESTAMP)
    private Date dateOperation;
    private Integer taux;

    public TFactureDetail() {
    }

    public Integer getTaux() {
        return taux;
    }

    public void setTaux(Integer taux) {
        this.taux = taux;
    }

    public Integer getMontantVente() {
        return montantVente;
    }

    public void setMontantVente(Integer montantVente) {
        this.montantVente = montantVente;
    }

    public Integer getMontantRemiseVente() {
        return montantRemiseVente;
    }

    public void setMontantRemiseVente(Integer montantRemiseVente) {
        this.montantRemiseVente = montantRemiseVente;
    }

    public Integer getMontantTvaVente() {
        return montantTvaVente;
    }

    public void setMontantTvaVente(Integer montantTvaVente) {
        this.montantTvaVente = montantTvaVente;
    }

    public String getpKey() {
        return pKey;
    }

    public void setpKey(String pKey) {
        this.pKey = pKey;
    }

    public TClient getClient() {
        return client;
    }

    public void setClient(TClient client) {
        this.client = client;
    }

    public TAyantDroit getAyantDroit() {
        return ayantDroit;
    }

    public void setAyantDroit(TAyantDroit ayantDroit) {
        this.ayantDroit = ayantDroit;
    }

    public TFactureDetail(String lgFACTUREDETAILID) {
        this.lgFACTUREDETAILID = lgFACTUREDETAILID;
    }

    public String getLgFACTUREDETAILID() {
        return lgFACTUREDETAILID;
    }

    public void setLgFACTUREDETAILID(String lgFACTUREDETAILID) {
        this.lgFACTUREDETAILID = lgFACTUREDETAILID;
    }

    public String getStrREF() {
        return strREF;
    }

    public void setStrREF(String strREF) {
        this.strREF = strREF;
    }

    public String getStrREFDESCRIPTION() {
        return strREFDESCRIPTION;
    }

    public void setStrREFDESCRIPTION(String strREFDESCRIPTION) {
        this.strREFDESCRIPTION = strREFDESCRIPTION;
    }

    public Double getDblMONTANT() {
        return dblMONTANT;
    }

    public void setDblMONTANT(Double dblMONTANT) {
        this.dblMONTANT = dblMONTANT;
    }

    public Double getDblMONTANTPAYE() {
        return dblMONTANTPAYE;
    }

    public void setDblMONTANTPAYE(Double dblMONTANTPAYE) {
        this.dblMONTANTPAYE = dblMONTANTPAYE;
    }

    public Double getDblMONTANTRESTANT() {
        return dblMONTANTRESTANT;
    }

    public void setDblMONTANTRESTANT(Double dblMONTANTRESTANT) {
        this.dblMONTANTRESTANT = dblMONTANTRESTANT;
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

    public String getPKey() {
        return pKey;
    }

    public void setPKey(String pKey) {
        this.pKey = pKey;
    }

    public String getStrFIRSTNAMECUSTOMER() {
        return strFIRSTNAMECUSTOMER;
    }

    public void setStrFIRSTNAMECUSTOMER(String strFIRSTNAMECUSTOMER) {
        this.strFIRSTNAMECUSTOMER = strFIRSTNAMECUSTOMER;
    }

    public String getStrLASTNAMECUSTOMER() {
        return strLASTNAMECUSTOMER;
    }

    public void setStrLASTNAMECUSTOMER(String strLASTNAMECUSTOMER) {
        this.strLASTNAMECUSTOMER = strLASTNAMECUSTOMER;
    }

    public String getStrNUMEROSECURITESOCIAL() {
        return strNUMEROSECURITESOCIAL;
    }

    public void setStrNUMEROSECURITESOCIAL(String strNUMEROSECURITESOCIAL) {
        this.strNUMEROSECURITESOCIAL = strNUMEROSECURITESOCIAL;
    }

    public BigDecimal getDblMONTANTBrut() {
        return dblMONTANTBrut;
    }

    public void setDblMONTANTBrut(BigDecimal dblMONTANTBrut) {
        this.dblMONTANTBrut = dblMONTANTBrut;
    }

    public BigDecimal getDblMONTANTREMISE() {
        return dblMONTANTREMISE;
    }

    public void setDblMONTANTREMISE(BigDecimal dblMONTANTREMISE) {
        this.dblMONTANTREMISE = dblMONTANTREMISE;
    }

    @XmlTransient
    public Collection<TDossierReglementDetail> getTDossierReglementDetailCollection() {
        return tDossierReglementDetailCollection;
    }

    public void setTDossierReglementDetailCollection(
            Collection<TDossierReglementDetail> tDossierReglementDetailCollection) {
        this.tDossierReglementDetailCollection = tDossierReglementDetailCollection;
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
        hash += (lgFACTUREDETAILID != null ? lgFACTUREDETAILID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TFactureDetail)) {
            return false;
        }
        TFactureDetail other = (TFactureDetail) object;
        if ((this.lgFACTUREDETAILID == null && other.lgFACTUREDETAILID != null)
                || (this.lgFACTUREDETAILID != null && !this.lgFACTUREDETAILID.equals(other.lgFACTUREDETAILID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TFactureDetail[ lgFACTUREDETAILID=" + lgFACTUREDETAILID + " ]";
    }

    public String getStrCATEGORYCLIENT() {
        return strCATEGORYCLIENT;
    }

    public Date getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(Date dateOperation) {
        this.dateOperation = dateOperation;
    }

    public void setStrCATEGORYCLIENT(String strCATEGORYCLIENT) {
        this.strCATEGORYCLIENT = strCATEGORYCLIENT;
    }

}
