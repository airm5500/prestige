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
@Table(name = "t_preenregistrement_detail")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TPreenregistrementDetail.findAvoir", query = "SELECT t FROM TPreenregistrementDetail t WHERE t.bISAVOIR=TRUE AND t.strSTATUT='is_Closed' AND t.intQUANTITY <> t.intQUANTITYSERVED AND t.intQUANTITY >0"),
        @NamedQuery(name = "TPreenregistrementDetail.findAll", query = "SELECT t FROM TPreenregistrementDetail t"),
        @NamedQuery(name = "TPreenregistrementDetail.findByVenteId", query = "SELECT t FROM TPreenregistrementDetail t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID  = :lgPREENREGISTREMENTID"), })
public class TPreenregistrementDetail implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "lg_PREENREGISTREMENT_DETAIL_ID", nullable = false, length = 40)
    private String lgPREENREGISTREMENTDETAILID;
    @Column(name = "int_QUANTITY")
    private Integer intQUANTITY;
    @Column(name = "int_QUANTITY_SERVED")
    private Integer intQUANTITYSERVED;
    @Column(name = "int_AVOIR")
    private Integer intAVOIR;
    @Column(name = "int_AVOIR_SERVED")
    private Integer intAVOIRSERVED;
    @Column(name = "int_AVOIR_INITIAL")
    private Integer intAVOIRINITIAL = 0;
    @Column(name = "int_PRICE")
    private Integer intPRICE;
    @Column(name = "int_PRICE_UNITAIR")
    private Integer intPRICEUNITAIR;
    @Column(name = "int_NUMBER")
    private Integer intNUMBER;
    @Column(name = "str_STATUT", length = 20)
    private String strSTATUT;
    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;
    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;
    @Column(name = "lg_GRILLE_REMISE_ID", length = 40)
    private String lgGRILLEREMISEID;
    @Column(name = "int_PRICE_REMISE")
    private Integer intPRICEREMISE;
    @Basic(optional = false)
    @Column(name = "b_IS_AVOIR", nullable = false)
    private boolean bISAVOIR;
    @Column(name = "int_FREE_PACK_NUMBER")
    private Integer intFREEPACKNUMBER;
    @Column(name = "int_PRICE_OTHER")
    private Integer intPRICEOTHER;
    @Column(name = "int_PRICE_DETAIL_OTHER")
    private Integer intPRICEDETAILOTHER;
    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;
    @JoinColumn(name = "lg_PREENREGISTREMENT_ID", referencedColumnName = "lg_PREENREGISTREMENT_ID", nullable = false)
    @ManyToOne(optional = false)
    private TPreenregistrement lgPREENREGISTREMENTID;
    @Column(name = "bool_ACCOUNT")
    private Boolean boolACCOUNT = true;
    @Column(name = "int_UG")
    private Integer intUG = 0;
    /** Retours du 10/10 (lecture GS1, mode B) : lots des boites scannees, un par boite, separes par « | ». */
    @Column(name = "str_LOTS_SCANNES", length = 500)
    private String strLOTSSCANNES;
    @Column(name = "montantTva")
    private Integer montantTva = 0;
    @Column(name = "valeurTva")
    @Basic(optional = false)
    private Integer valeurTva = 0;
    @Column(name = "prixAchat")
    @Basic(optional = false)
    private Integer prixAchat = 0;
    @Column(name = "montanttvaug")
    private Integer montantTvaUg = 0;
    @Column(name = "calculation_base_price")
    private Integer calculationBasePrice;
    /** Audit 05 PR-01 : promotion (t_promotion_product) qui a fixe le prix de la ligne ; null sinon. */
    @Column(name = "promotion_produit_id")
    private Integer promotionProduitId;
    /**
     * Points 3.2 et 3.5 du plan du 06/11 : la promotion telle qu'elle etait le jour de la vente (type, option a partir
     * de / par palier, seuil, unites gratuites, prix d'avant) ; null pour une ligne sans promotion ou vendue avant.
     */
    @Column(name = "promo_type", length = 40)
    private String promoType;
    @Column(name = "promo_mode", length = 10)
    private String promoMode;
    @Column(name = "promo_seuil")
    private Integer promoSeuil;
    @Column(name = "promo_gratuites")
    private Integer promoGratuites;
    @Column(name = "promo_prix_avant")
    private Integer promoPrixAvant;
    /**
     * Cas 1 du 03/11/2026 : ligne cochee « C » (au comptant) dans une vente assurance. Hors du calcul tiers-payant ; a
     * la cloture, elle part dans la vente comptant liee. Toujours 0 sans le parametre KEY_LIGNE_COMPTANT_VO.
     */
    @Column(name = "comptant")
    private Boolean comptant = false;

    public boolean isComptant() {
        return Boolean.TRUE.equals(comptant);
    }

    public void setComptant(Boolean comptant) {
        this.comptant = comptant != null && comptant;
    }

    public TPreenregistrementDetail() {
    }

    public Integer getPromotionProduitId() {
        return promotionProduitId;
    }

    public void setPromotionProduitId(Integer promotionProduitId) {
        this.promotionProduitId = promotionProduitId;
    }

    public String getPromoType() {
        return promoType;
    }

    public void setPromoType(String promoType) {
        this.promoType = promoType;
    }

    public String getPromoMode() {
        return promoMode;
    }

    public void setPromoMode(String promoMode) {
        this.promoMode = promoMode;
    }

    public Integer getPromoSeuil() {
        return promoSeuil;
    }

    public void setPromoSeuil(Integer promoSeuil) {
        this.promoSeuil = promoSeuil;
    }

    public Integer getPromoGratuites() {
        return promoGratuites;
    }

    public void setPromoGratuites(Integer promoGratuites) {
        this.promoGratuites = promoGratuites;
    }

    public Integer getPromoPrixAvant() {
        return promoPrixAvant;
    }

    public void setPromoPrixAvant(Integer promoPrixAvant) {
        this.promoPrixAvant = promoPrixAvant;
    }

    /** Copie la promotion gardee sur la ligne (copie d'une ligne, annulation). */
    public void copierPromotion(TPreenregistrementDetail p) {
        this.promotionProduitId = p.getPromotionProduitId();
        this.promoType = p.getPromoType();
        this.promoMode = p.getPromoMode();
        this.promoSeuil = p.getPromoSeuil();
        this.promoGratuites = p.getPromoGratuites();
        this.promoPrixAvant = p.getPromoPrixAvant();
    }

    /** Ligne qui n'est plus en promotion (prix saisi a la main, vente passee en assurance). */
    public void effacerPromotion() {
        this.promotionProduitId = null;
        this.promoType = null;
        this.promoMode = null;
        this.promoSeuil = null;
        this.promoGratuites = null;
        this.promoPrixAvant = null;
    }

    /** Mention de la ligne : « PROMOTION x+n OFFERT(S) », « PROMOTION », ou null hors promotion. */
    public String mentionPromotion() {
        if (promotionProduitId == null) {
            return null;
        }
        return rest.service.promotion.PromotionLigne.mention(promoType, promoMode, promoSeuil, promoGratuites,
                intFREEPACKNUMBER != null ? intFREEPACKNUMBER : 0);
    }

    public Integer getPrixAchat() {
        return prixAchat;
    }

    public Integer getCalculationBasePrice() {
        return calculationBasePrice;
    }

    public void setCalculationBasePrice(Integer calculationBasePrice) {
        this.calculationBasePrice = calculationBasePrice;
    }

    public void setPrixAchat(Integer prixAchat) {
        this.prixAchat = prixAchat;
    }

    public Integer getValeurTva() {
        return valeurTva;
    }

    public void setValeurTva(Integer valeurTva) {
        this.valeurTva = valeurTva;
    }

    public TPreenregistrementDetail(String lgPREENREGISTREMENTDETAILID) {
        this.lgPREENREGISTREMENTDETAILID = lgPREENREGISTREMENTDETAILID;
    }

    public TPreenregistrementDetail(String lgPREENREGISTREMENTDETAILID, boolean bISAVOIR) {
        this.lgPREENREGISTREMENTDETAILID = lgPREENREGISTREMENTDETAILID;
        this.bISAVOIR = bISAVOIR;
    }

    public String getLgPREENREGISTREMENTDETAILID() {
        return lgPREENREGISTREMENTDETAILID;
    }

    public void setLgPREENREGISTREMENTDETAILID(String lgPREENREGISTREMENTDETAILID) {
        this.lgPREENREGISTREMENTDETAILID = lgPREENREGISTREMENTDETAILID;
    }

    public Integer getIntQUANTITY() {
        return intQUANTITY;
    }

    public Boolean getBoolACCOUNT() {
        return boolACCOUNT;
    }

    public void setBoolACCOUNT(Boolean boolACCOUNT) {
        this.boolACCOUNT = boolACCOUNT;
    }

    public void setIntQUANTITY(Integer intQUANTITY) {
        this.intQUANTITY = intQUANTITY;
    }

    public Integer getIntQUANTITYSERVED() {
        return intQUANTITYSERVED;
    }

    public void setIntQUANTITYSERVED(Integer intQUANTITYSERVED) {
        this.intQUANTITYSERVED = intQUANTITYSERVED;
    }

    public Integer getIntAVOIR() {
        return intAVOIR;
    }

    public void setIntAVOIR(Integer intAVOIR) {
        this.intAVOIR = intAVOIR;
    }

    public Integer getIntAVOIRSERVED() {
        return intAVOIRSERVED;
    }

    public Integer getIntAVOIRINITIAL() {
        return intAVOIRINITIAL == null ? 0 : intAVOIRINITIAL;
    }

    public void setIntAVOIRINITIAL(Integer intAVOIRINITIAL) {
        this.intAVOIRINITIAL = intAVOIRINITIAL;
    }

    public void setIntAVOIRSERVED(Integer intAVOIRSERVED) {
        this.intAVOIRSERVED = intAVOIRSERVED;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public Integer getIntPRICEUNITAIR() {
        return intPRICEUNITAIR;
    }

    public void setIntPRICEUNITAIR(Integer intPRICEUNITAIR) {
        this.intPRICEUNITAIR = intPRICEUNITAIR;
    }

    public Integer getIntNUMBER() {
        return intNUMBER;
    }

    public void setIntNUMBER(Integer intNUMBER) {
        this.intNUMBER = intNUMBER;
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

    public String getLgGRILLEREMISEID() {
        return lgGRILLEREMISEID;
    }

    public void setLgGRILLEREMISEID(String lgGRILLEREMISEID) {
        this.lgGRILLEREMISEID = lgGRILLEREMISEID;
    }

    public Integer getIntPRICEREMISE() {
        return intPRICEREMISE;
    }

    public void setIntPRICEREMISE(Integer intPRICEREMISE) {
        this.intPRICEREMISE = intPRICEREMISE;
    }

    public boolean getBISAVOIR() {
        return bISAVOIR;
    }

    public void setBISAVOIR(boolean bISAVOIR) {
        this.bISAVOIR = bISAVOIR;
    }

    public Integer getIntFREEPACKNUMBER() {
        return intFREEPACKNUMBER;
    }

    public void setIntFREEPACKNUMBER(Integer intFREEPACKNUMBER) {
        this.intFREEPACKNUMBER = intFREEPACKNUMBER;
    }

    public Integer getIntPRICEOTHER() {
        return intPRICEOTHER;
    }

    public void setIntPRICEOTHER(Integer intPRICEOTHER) {
        this.intPRICEOTHER = intPRICEOTHER;
    }

    public Integer getIntPRICEDETAILOTHER() {
        return intPRICEDETAILOTHER;
    }

    public void setIntPRICEDETAILOTHER(Integer intPRICEDETAILOTHER) {
        this.intPRICEDETAILOTHER = intPRICEDETAILOTHER;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public TPreenregistrement getLgPREENREGISTREMENTID() {
        return lgPREENREGISTREMENTID;
    }

    public void setLgPREENREGISTREMENTID(TPreenregistrement lgPREENREGISTREMENTID) {
        this.lgPREENREGISTREMENTID = lgPREENREGISTREMENTID;
    }

    @Override
    public int hashCode() {
        int hash = 0;
        hash += (lgPREENREGISTREMENTDETAILID != null ? lgPREENREGISTREMENTDETAILID.hashCode() : 0);
        return hash;
    }

    @Override
    public boolean equals(Object object) {
        // TODO: Warning - this method won't work in the case the id fields are not set
        if (!(object instanceof TPreenregistrementDetail)) {
            return false;
        }
        TPreenregistrementDetail other = (TPreenregistrementDetail) object;
        if ((this.lgPREENREGISTREMENTDETAILID == null && other.lgPREENREGISTREMENTDETAILID != null)
                || (this.lgPREENREGISTREMENTDETAILID != null
                        && !this.lgPREENREGISTREMENTDETAILID.equals(other.lgPREENREGISTREMENTDETAILID))) {
            return false;
        }
        return true;
    }

    @Override
    public String toString() {
        return "dal.TPreenregistrementDetail[ lgPREENREGISTREMENTDETAILID=" + lgPREENREGISTREMENTDETAILID + " ]";
    }

    public Integer getIntUG() {
        return intUG;
    }

    public void setIntUG(Integer intUG) {
        this.intUG = intUG;
    }

    public Integer getMontantTva() {
        return montantTva;
    }

    public void setMontantTva(Integer montantTva) {
        this.montantTva = montantTva;
    }

    public Integer getMontantTvaUg() {
        return montantTvaUg;
    }

    public void setMontantTvaUg(Integer montantTvaUg) {
        this.montantTvaUg = montantTvaUg;
    }

    public TPreenregistrementDetail(TPreenregistrementDetail p) {
        this.lgPREENREGISTREMENTDETAILID = p.getLgPREENREGISTREMENTDETAILID();
        this.intQUANTITY = p.getIntQUANTITY();
        this.intQUANTITYSERVED = p.getIntQUANTITYSERVED();
        this.intAVOIR = p.getIntAVOIR();
        this.intAVOIRSERVED = p.getIntAVOIRSERVED();
        this.intAVOIRINITIAL = p.getIntAVOIRINITIAL();
        this.intPRICE = p.getIntPRICE();
        this.intPRICEUNITAIR = p.getIntPRICEUNITAIR();
        this.intNUMBER = p.getIntNUMBER();
        this.strSTATUT = p.getStrSTATUT();
        this.dtCREATED = p.getDtCREATED();
        this.dtUPDATED = p.getDtUPDATED();
        this.lgGRILLEREMISEID = p.getLgGRILLEREMISEID();
        this.intPRICEREMISE = p.getIntPRICEREMISE();
        this.bISAVOIR = p.getBISAVOIR();
        this.intFREEPACKNUMBER = p.getIntFREEPACKNUMBER();
        this.promoType = p.getPromoType();
        this.promoMode = p.getPromoMode();
        this.promoSeuil = p.getPromoSeuil();
        this.promoGratuites = p.getPromoGratuites();
        this.promoPrixAvant = p.getPromoPrixAvant();
        this.intPRICEOTHER = p.getIntPRICEOTHER();
        this.intPRICEDETAILOTHER = p.getIntPRICEDETAILOTHER();
        this.lgFAMILLEID = p.getLgFAMILLEID();
        this.lgPREENREGISTREMENTID = p.getLgPREENREGISTREMENTID();
        this.boolACCOUNT = p.getBoolACCOUNT();
        this.intUG = p.getIntUG();
        this.montantTva = p.getMontantTva();
        this.valeurTva = p.getValeurTva();
        this.prixAchat = p.getPrixAchat();
        this.montantTvaUg = p.getMontantTvaUg();
        this.comptant = p.isComptant();

    }

    public String getStrLOTSSCANNES() {
        return strLOTSSCANNES;
    }

    public void setStrLOTSSCANNES(String strLOTSSCANNES) {
        this.strLOTSSCANNES = strLOTSSCANNES;
    }

    /** Ajoute le lot d'une boite scannee (nettoye, 30 caracteres au plus) ; ignore au-dela de 500 caracteres. */
    public void noterLotScanne(String lot) {
        String l = lotsScannesNettoye(lot);
        if (l == null) {
            return;
        }
        String valeur = strLOTSSCANNES == null || strLOTSSCANNES.isEmpty() ? l : strLOTSSCANNES + "|" + l;
        if (valeur.length() <= 500) {
            strLOTSSCANNES = valeur;
        }
    }

    static String lotsScannesNettoye(String lot) {
        if (lot == null) {
            return null;
        }
        String l = lot.replace("|", "").trim();
        if (l.isEmpty()) {
            return null;
        }
        return l.length() > 30 ? l.substring(0, 30) : l;
    }

    /** Les lots scannes a sortir pour la quantite vendue : les {@code quantite} premiers. */
    public static java.util.List<String> lotsASortir(String lotsScannes, int quantite) {
        java.util.List<String> l = new java.util.ArrayList<>();
        if (lotsScannes == null || quantite <= 0) {
            return l;
        }
        for (String x : lotsScannes.split("\\|")) {
            if (l.size() >= quantite) {
                break;
            }
            if (!x.trim().isEmpty()) {
                l.add(x.trim());
            }
        }
        return l;
    }
}
