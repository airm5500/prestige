/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
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
import org.hibernate.annotations.Type;

/**
 *
 * @author MKABOU
 */
@Entity
@Table(name = "t_bon_livraison_detail")
@XmlRootElement
@NamedQueries({ @NamedQuery(name = "TBonLivraisonDetail.findAll", query = "SELECT t FROM TBonLivraisonDetail t"),
        @NamedQuery(name = "TBonLivraisonDetail.findByLgBONLIVRAISONDETAIL", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.lgBONLIVRAISONDETAIL = :lgBONLIVRAISONDETAIL"),
        @NamedQuery(name = "TBonLivraisonDetail.findByIntQTECMDE", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.intQTECMDE = :intQTECMDE"),
        @NamedQuery(name = "TBonLivraisonDetail.findByIntQTEUG", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.intQTEUG = :intQTEUG"),
        @NamedQuery(name = "TBonLivraisonDetail.findByIntQTERECUE", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.intQTERECUE = :intQTERECUE"),
        @NamedQuery(name = "TBonLivraisonDetail.findByIntPRIXREFERENCE", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.intPRIXREFERENCE = :intPRIXREFERENCE"),
        @NamedQuery(name = "TBonLivraisonDetail.findByStrLIVRAISONADP", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.strLIVRAISONADP = :strLIVRAISONADP"),
        @NamedQuery(name = "TBonLivraisonDetail.findByStrMANQUEFORCES", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.strMANQUEFORCES = :strMANQUEFORCES"),
        @NamedQuery(name = "TBonLivraisonDetail.findByStrETATARTICLE", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.strETATARTICLE = :strETATARTICLE"),
        @NamedQuery(name = "TBonLivraisonDetail.findByIntPRIXVENTE", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.intPRIXVENTE = :intPRIXVENTE"),
        @NamedQuery(name = "TBonLivraisonDetail.findByIntPAF", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.intPAF = :intPAF"),
        @NamedQuery(name = "TBonLivraisonDetail.findByIntPAREEL", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.intPAREEL = :intPAREEL"),
        @NamedQuery(name = "TBonLivraisonDetail.findByStrSTATUT", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.strSTATUT = :strSTATUT"),
        @NamedQuery(name = "TBonLivraisonDetail.findByDtCREATED", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.dtCREATED = :dtCREATED"),
        @NamedQuery(name = "TBonLivraisonDetail.findByDtUPDATED", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.dtUPDATED = :dtUPDATED"),
        @NamedQuery(name = "TBonLivraisonDetail.findByIntQTEMANQUANT", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.intQTEMANQUANT = :intQTEMANQUANT"),
        @NamedQuery(name = "TBonLivraisonDetail.findByIntQTERETURN", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.intQTERETURN = :intQTERETURN"),
        @NamedQuery(name = "TBonLivraisonDetail.findByIntINITSTOCK", query = "SELECT t FROM TBonLivraisonDetail t WHERE t.intINITSTOCK = :intINITSTOCK") })

public class TBonLivraisonDetail implements Serializable, Cloneable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_BON_LIVRAISON_DETAIL", nullable = false, length = 40)
    private String lgBONLIVRAISONDETAIL;
    @Column(name = "int_QTE_CMDE")
    private Integer intQTECMDE;
    @Column(name = "int_QTE_UG")
    private Integer intQTEUG;
    @Column(name = "int_QTE_RECUE")
    private Integer intQTERECUE;
    @Column(name = "int_PRIX_REFERENCE")
    private Integer intPRIXREFERENCE;
    @Column(name = "str_LIVRAISON_ADP", length = 20)
    private String strLIVRAISONADP;
    @Column(name = "str_MANQUE_FORCES", length = 20)
    private String strMANQUEFORCES;
    @Column(name = "str_ETAT_ARTICLE", length = 20)
    private String strETATARTICLE;
    @Column(name = "int_PRIX_VENTE")
    private Integer intPRIXVENTE;
    @Column(name = "int_PAF")
    private Integer intPAF;
    @Column(name = "int_PA_REEL")
    private Integer intPAREEL;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "int_QTE_MANQUANT")
    private Integer intQTEMANQUANT;
    @Column(name = "int_QTE_RETURN")
    private Integer intQTERETURN;
    @Column(name = "int_INITSTOCK")
    private Integer intINITSTOCK;
    @JoinColumn(name = "lg_ZONE_GEO_ID", referencedColumnName = "lg_ZONE_GEO_ID")
    @ManyToOne
    private TZoneGeographique lgZONEGEOID;
    @JoinColumn(name = "lg_BON_LIVRAISON_ID", referencedColumnName = "lg_BON_LIVRAISON_ID")
    @ManyToOne
    private TBonLivraison lgBONLIVRAISONID;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "lg_GROSSISTE_ID", referencedColumnName = "lg_GROSSISTE_ID")
    @ManyToOne
    private TGrossiste lgGROSSISTEID;

    @Column(name = "prixTarif")
    private Integer prixTarif = 0;
    @Column(name = "prixUni")
    private Integer prixUni;
    @Type(type = "json")
    @Column(columnDefinition = "json", name = "lots")
    private List<OrderDetailLot> lots = new ArrayList<>();
    @Column(name = "checked")
    private boolean checked;

    @Column(name = "quantite_controle")
    private Integer checkedQuantity;

    public TBonLivraisonDetail() {
    }

    public Integer getCheckedQuantity() {
        return checkedQuantity;
    }

    public void setCheckedQuantity(Integer checkedQuantity) {
        this.checkedQuantity = checkedQuantity;
    }

    public TBonLivraisonDetail(String lgBONLIVRAISONDETAIL) {
        this.lgBONLIVRAISONDETAIL = lgBONLIVRAISONDETAIL;
    }

    public String getLgBONLIVRAISONDETAIL() {
        return lgBONLIVRAISONDETAIL;
    }

    public void setLgBONLIVRAISONDETAIL(String lgBONLIVRAISONDETAIL) {
        this.lgBONLIVRAISONDETAIL = lgBONLIVRAISONDETAIL;
    }

    public Integer getIntQTECMDE() {
        return intQTECMDE;
    }

    public void setIntQTECMDE(Integer intQTECMDE) {
        this.intQTECMDE = intQTECMDE;
    }

    public Integer getIntQTEUG() {
        return intQTEUG;
    }

    public void setIntQTEUG(Integer intQTEUG) {
        this.intQTEUG = intQTEUG;
    }

    public Integer getIntQTERECUE() {
        return intQTERECUE;
    }

    public void setIntQTERECUE(Integer intQTERECUE) {
        this.intQTERECUE = intQTERECUE;
    }

    public Integer getIntPRIXREFERENCE() {
        return intPRIXREFERENCE;
    }

    public void setIntPRIXREFERENCE(Integer intPRIXREFERENCE) {
        this.intPRIXREFERENCE = intPRIXREFERENCE;
    }

    public String getStrLIVRAISONADP() {
        return strLIVRAISONADP;
    }

    public void setStrLIVRAISONADP(String strLIVRAISONADP) {
        this.strLIVRAISONADP = strLIVRAISONADP;
    }

    public String getStrMANQUEFORCES() {
        return strMANQUEFORCES;
    }

    public void setStrMANQUEFORCES(String strMANQUEFORCES) {
        this.strMANQUEFORCES = strMANQUEFORCES;
    }

    public String getStrETATARTICLE() {
        return strETATARTICLE;
    }

    public void setStrETATARTICLE(String strETATARTICLE) {
        this.strETATARTICLE = strETATARTICLE;
    }

    public Integer getIntPRIXVENTE() {
        return intPRIXVENTE;
    }

    public void setIntPRIXVENTE(Integer intPRIXVENTE) {
        this.intPRIXVENTE = intPRIXVENTE;
    }

    public Integer getIntPAF() {
        return intPAF;
    }

    public void setIntPAF(Integer intPAF) {
        this.intPAF = intPAF;
    }

    public Integer getIntPAREEL() {
        return intPAREEL;
    }

    public void setIntPAREEL(Integer intPAREEL) {
        this.intPAREEL = intPAREEL;
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

    public Integer getIntQTEMANQUANT() {
        return intQTEMANQUANT;
    }

    public void setIntQTEMANQUANT(Integer intQTEMANQUANT) {
        this.intQTEMANQUANT = intQTEMANQUANT;
    }

    public Integer getIntQTERETURN() {
        return intQTERETURN;
    }

    public void setIntQTERETURN(Integer intQTERETURN) {
        this.intQTERETURN = intQTERETURN;
    }

    public Integer getIntINITSTOCK() {
        return intINITSTOCK;
    }

    public void setIntINITSTOCK(Integer intINITSTOCK) {
        this.intINITSTOCK = intINITSTOCK;
    }

    public TZoneGeographique getLgZONEGEOID() {
        return lgZONEGEOID;
    }

    public void setLgZONEGEOID(TZoneGeographique lgZONEGEOID) {
        this.lgZONEGEOID = lgZONEGEOID;
    }

    public TBonLivraison getLgBONLIVRAISONID() {
        return lgBONLIVRAISONID;
    }

    public void setLgBONLIVRAISONID(TBonLivraison lgBONLIVRAISONID) {
        this.lgBONLIVRAISONID = lgBONLIVRAISONID;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public TGrossiste getLgGROSSISTEID() {
        return lgGROSSISTEID;
    }

    public void setLgGROSSISTEID(TGrossiste lgGROSSISTEID) {
        this.lgGROSSISTEID = lgGROSSISTEID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgBONLIVRAISONDETAIL != null ? lgBONLIVRAISONDETAIL.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {

        if (!(object instanceof TBonLivraisonDetail)) {
            return false;
        }
        TBonLivraisonDetail other = (TBonLivraisonDetail) object;
        if ((this.lgBONLIVRAISONDETAIL == null && other.lgBONLIVRAISONDETAIL != null)
                || (this.lgBONLIVRAISONDETAIL != null
                        && !this.lgBONLIVRAISONDETAIL.equals(other.lgBONLIVRAISONDETAIL))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TBonLivraisonDetail[ lgBONLIVRAISONDETAIL=" + lgBONLIVRAISONDETAIL + " ]";
    }

    public Integer getPrixTarif() {
        return prixTarif;
    }

    public void setPrixTarif(Integer prixTarif) {
        this.prixTarif = prixTarif;
    }

    public Integer getPrixUni() {
        return prixUni;
    }

    public void setPrixUni(Integer prixUni) {
        this.prixUni = prixUni;
    }

    public List<OrderDetailLot> getLots() {
        return lots;
    }

    public void setLots(List<OrderDetailLot> lots) {
        this.lots = lots;
    }

    public boolean isChecked() {
        return checked;
    }

    public void setChecked(boolean checked) {
        this.checked = checked;
    }

    @Override
    public Object clone() {
        try {
            return super.clone();
        } catch (CloneNotSupportedException ex) {
            Logger.getLogger(TBonLivraisonDetail.class.getName()).log(Level.SEVERE, null, ex);
        }
        return null;
    }

}
