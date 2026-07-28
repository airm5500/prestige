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
 * Ligne d'une suggestion de reserve.
 *
 * <p>
 * Trois quantites cohabitent volontairement :
 * <ul>
 * <li>{@code intQTEPROPOSEE} : ce que le systeme a propose. FIGEE, jamais recalculee, elle garantit l'audit ;</li>
 * <li>{@code intQTERETENUE} : ce que l'utilisateur a decide ;</li>
 * <li>{@code intQTEDEPLACEE} : ce qui a reellement bouge apres traitement.</li>
 * </ul>
 * Les champs d'explication (stocks, seuil declencheur, cible, disponible, formule) sont eux aussi figes a la creation :
 * un rapport reimprime des mois plus tard montre bien ce qui avait ete constate a ce moment-la.
 */
@Entity
@Table(name = "t_suggestion_reserve_detail")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TSuggestionReserveDetail.findBySuggestion", query = "SELECT d FROM TSuggestionReserveDetail d WHERE d.lgSUGGESTIONRESERVEID.lgSUGGESTIONRESERVEID = :suggestionId ORDER BY d.lgFAMILLEID.strNAME ASC"),
        @NamedQuery(name = "TSuggestionReserveDetail.findBySuggestionEtFamille", query = "SELECT d FROM TSuggestionReserveDetail d WHERE d.lgSUGGESTIONRESERVEID.lgSUGGESTIONRESERVEID = :suggestionId AND d.lgFAMILLEID.lgFAMILLEID = :familleId") })
public class TSuggestionReserveDetail implements Serializable {

    private static final long serialVersionUID = 1L;

    /** Proposee par le systeme, pas encore touchee par l'utilisateur. */
    public static final String ETAT_PROPOSEE = "PROPOSEE";
    /** L'utilisateur a retenu une quantite differente de la proposition. */
    public static final String ETAT_MODIFIEE = "MODIFIEE";
    /** Retiree de la suggestion : aucun mouvement de stock ne sera fait. */
    public static final String ETAT_SUPPRIMEE = "SUPPRIMEE";
    /** Traitee avec succes : le stock a bouge. */
    public static final String ETAT_TRAITEE = "TRAITEE";
    /** Le traitement a echoue : voir strCODEECHEC. */
    public static final String ETAT_ECHEC = "ECHEC";
    /**
     * Traitee puis defaite par un mouvement inverse.
     *
     * <p>
     * Distinct de {@link #ETAT_SUPPRIMEE}, qui designe une ligne ecartee AVANT tout mouvement. Ici le stock a bouge
     * puis a ete remis en place : la ligne compte toujours comme un produit de la suggestion, et son historique reste
     * lisible.
     */
    public static final String ETAT_ANNULEE = "ANNULEE";

    @Id
    @Basic(optional = false)
    @Column(name = "lg_SUGGESTION_RESERVE_DETAIL_ID", nullable = false, length = 40)
    private String lgSUGGESTIONRESERVEDETAILID;

    @JoinColumn(name = "lg_SUGGESTION_RESERVE_ID", referencedColumnName = "lg_SUGGESTION_RESERVE_ID")
    @ManyToOne(optional = false)
    private TSuggestionReserve lgSUGGESTIONRESERVEID;

    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille lgFAMILLEID;

    @Column(name = "int_QTE_PROPOSEE", nullable = false)
    private Integer intQTEPROPOSEE = 0;

    @Column(name = "int_QTE_RETENUE")
    private Integer intQTERETENUE;

    @Column(name = "int_QTE_DEPLACEE", nullable = false)
    private Integer intQTEDEPLACEE = 0;

    @Column(name = "int_STOCK_RAYON")
    private Integer intSTOCKRAYON;

    @Column(name = "int_STOCK_RESERVE")
    private Integer intSTOCKRESERVE;

    /** Seuil qui a declenche la proposition (seuil mini rayon ou seuil reserve selon le sens). */
    @Column(name = "int_SEUIL_DECLENCHEUR")
    private Integer intSEUILDECLENCHEUR;

    /** Niveau vise apres l'operation. */
    @Column(name = "int_CIBLE")
    private Integer intCIBLE;

    /** Quantite reellement disponible dans la zone source au moment du calcul. */
    @Column(name = "int_DISPONIBLE")
    private Integer intDISPONIBLE;

    /** Regle appliquee, en clair, telle qu'affichee et imprimee. */
    @Column(name = "str_FORMULE", length = 255)
    private String strFORMULE;

    @Column(name = "str_ETAT", nullable = false, length = 20)
    private String strETAT = ETAT_PROPOSEE;

    @Column(name = "str_CODE_ECHEC", length = 40)
    private String strCODEECHEC;

    @Column(name = "str_MOTIF_LIGNE", length = 255)
    private String strMOTIFLIGNE;

    /** Mouvement genere par le traitement : point d'appui de l'annulation par mouvement inverse. */
    @Column(name = "lg_MOUVEMENT_ID", length = 40)
    private String lgMOUVEMENTID;

    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED = new Date();

    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    public TSuggestionReserveDetail() {
    }

    public TSuggestionReserveDetail(String lgSUGGESTIONRESERVEDETAILID) {
        this.lgSUGGESTIONRESERVEDETAILID = lgSUGGESTIONRESERVEDETAILID;
    }

    public String getLgSUGGESTIONRESERVEDETAILID() {
        return lgSUGGESTIONRESERVEDETAILID;
    }

    public void setLgSUGGESTIONRESERVEDETAILID(String lgSUGGESTIONRESERVEDETAILID) {
        this.lgSUGGESTIONRESERVEDETAILID = lgSUGGESTIONRESERVEDETAILID;
    }

    public TSuggestionReserve getLgSUGGESTIONRESERVEID() {
        return lgSUGGESTIONRESERVEID;
    }

    public void setLgSUGGESTIONRESERVEID(TSuggestionReserve lgSUGGESTIONRESERVEID) {
        this.lgSUGGESTIONRESERVEID = lgSUGGESTIONRESERVEID;
    }

    public TFamille getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(TFamille lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public Integer getIntQTEPROPOSEE() {
        return intQTEPROPOSEE;
    }

    public void setIntQTEPROPOSEE(Integer intQTEPROPOSEE) {
        this.intQTEPROPOSEE = intQTEPROPOSEE;
    }

    public Integer getIntQTERETENUE() {
        return intQTERETENUE;
    }

    public void setIntQTERETENUE(Integer intQTERETENUE) {
        this.intQTERETENUE = intQTERETENUE;
    }

    public Integer getIntQTEDEPLACEE() {
        return intQTEDEPLACEE;
    }

    public void setIntQTEDEPLACEE(Integer intQTEDEPLACEE) {
        this.intQTEDEPLACEE = intQTEDEPLACEE;
    }

    public Integer getIntSTOCKRAYON() {
        return intSTOCKRAYON;
    }

    public void setIntSTOCKRAYON(Integer intSTOCKRAYON) {
        this.intSTOCKRAYON = intSTOCKRAYON;
    }

    public Integer getIntSTOCKRESERVE() {
        return intSTOCKRESERVE;
    }

    public void setIntSTOCKRESERVE(Integer intSTOCKRESERVE) {
        this.intSTOCKRESERVE = intSTOCKRESERVE;
    }

    public Integer getIntSEUILDECLENCHEUR() {
        return intSEUILDECLENCHEUR;
    }

    public void setIntSEUILDECLENCHEUR(Integer intSEUILDECLENCHEUR) {
        this.intSEUILDECLENCHEUR = intSEUILDECLENCHEUR;
    }

    public Integer getIntCIBLE() {
        return intCIBLE;
    }

    public void setIntCIBLE(Integer intCIBLE) {
        this.intCIBLE = intCIBLE;
    }

    public Integer getIntDISPONIBLE() {
        return intDISPONIBLE;
    }

    public void setIntDISPONIBLE(Integer intDISPONIBLE) {
        this.intDISPONIBLE = intDISPONIBLE;
    }

    public String getStrFORMULE() {
        return strFORMULE;
    }

    public void setStrFORMULE(String strFORMULE) {
        this.strFORMULE = strFORMULE;
    }

    public String getStrETAT() {
        return strETAT;
    }

    public void setStrETAT(String strETAT) {
        this.strETAT = strETAT;
    }

    public String getStrCODEECHEC() {
        return strCODEECHEC;
    }

    public void setStrCODEECHEC(String strCODEECHEC) {
        this.strCODEECHEC = strCODEECHEC;
    }

    public String getStrMOTIFLIGNE() {
        return strMOTIFLIGNE;
    }

    public void setStrMOTIFLIGNE(String strMOTIFLIGNE) {
        this.strMOTIFLIGNE = strMOTIFLIGNE;
    }

    public String getLgMOUVEMENTID() {
        return lgMOUVEMENTID;
    }

    public void setLgMOUVEMENTID(String lgMOUVEMENTID) {
        this.lgMOUVEMENTID = lgMOUVEMENTID;
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
        return (lgSUGGESTIONRESERVEDETAILID != null ? lgSUGGESTIONRESERVEDETAILID.hashCode() : 0);
    }

    @Override
    public boolean equals(Object object) {
        if (!(object instanceof TSuggestionReserveDetail)) {
            return false;
        }
        TSuggestionReserveDetail other = (TSuggestionReserveDetail) object;
        return !((this.lgSUGGESTIONRESERVEDETAILID == null && other.lgSUGGESTIONRESERVEDETAILID != null)
                || (this.lgSUGGESTIONRESERVEDETAILID != null
                        && !this.lgSUGGESTIONRESERVEDETAILID.equals(other.lgSUGGESTIONRESERVEDETAILID)));
    }

    @Override
    public String toString() {
        return "dal.TSuggestionReserveDetail[ lgSUGGESTIONRESERVEDETAILID=" + lgSUGGESTIONRESERVEDETAILID + " ]";
    }
}
