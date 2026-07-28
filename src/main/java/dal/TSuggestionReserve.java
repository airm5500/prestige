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

/**
 * En-tete d'une suggestion de reserve. Une suggestion est un objet metier persistant et auditable : on sait qui l'a
 * creee, qui l'a traitee, qui l'a cloturee, quand, pourquoi, et ce qui a reellement ete deplace.
 */
@Entity
@Table(name = "t_suggestion_reserve")
@XmlRootElement
@NamedQueries({
        @NamedQuery(name = "TSuggestionReserve.findAll", query = "SELECT s FROM TSuggestionReserve s ORDER BY s.dtCREATED DESC"),
        @NamedQuery(name = "TSuggestionReserve.findOuverteAuto", query = "SELECT s FROM TSuggestionReserve s WHERE s.lgEMPLACEMENTID.lgEMPLACEMENTID = :empl AND s.strCATEGORIE = :categorie AND s.strORIGINE = :origine AND s.strSTATUT IN ('A_TRAITER','EN_COURS') ORDER BY s.dtCREATED DESC") })
public class TSuggestionReserve implements Serializable {

    private static final long serialVersionUID = 1L;

    /** Destination du stock : on regarnit le rayon (reserve -> rayon). */
    public static final String CATEGORIE_RAYON = "RAYON";
    /** Destination du stock : on range le trop-plein du rayon (rayon -> reserve). */
    public static final String CATEGORIE_RESERVE = "RESERVE";

    public static final String ORIGINE_MANUELLE = "MANUELLE";
    public static final String ORIGINE_AUTOMATIQUE = "AUTOMATIQUE";
    /** Reservee a une generation planifiee : aucune suggestion de ce type n'est produite a ce jour. */
    public static final String ORIGINE_SYSTEME = "SYSTEME";

    public static final String STATUT_A_TRAITER = "A_TRAITER";
    public static final String STATUT_EN_COURS = "EN_COURS";
    public static final String STATUT_TRAITEE = "TRAITEE";
    public static final String STATUT_SUPPRIMEE = "SUPPRIMEE";
    /**
     * Traitee puis integralement defaite par mouvements inverses.
     *
     * <p>
     * Statut TERMINAL : une suggestion annulee ne se retraite pas. La reprendre reproduirait des mouvements que l'on
     * vient justement d'annuler. Pour refaire l'operation, on cree une nouvelle suggestion.
     */
    public static final String STATUT_ANNULEE = "ANNULEE";

    @Id
    @Basic(optional = false)
    @Column(name = "lg_SUGGESTION_RESERVE_ID", nullable = false, length = 40)
    private String lgSUGGESTIONRESERVEID;

    @Column(name = "str_REF", length = 30)
    private String strREF;

    @Column(name = "str_CATEGORIE", nullable = false, length = 10)
    private String strCATEGORIE;

    @Column(name = "str_ORIGINE", nullable = false, length = 15)
    private String strORIGINE;

    @Column(name = "str_STATUT", nullable = false, length = 15)
    private String strSTATUT;

    @Column(name = "str_COMMENTAIRE", length = 500)
    private String strCOMMENTAIRE;

    @JoinColumn(name = "motif_id", referencedColumnName = "id")
    @ManyToOne
    private MotifSuggestionReserve motif;

    @JoinColumn(name = "lg_EMPLACEMENT_ID", referencedColumnName = "lg_EMPLACEMENT_ID")
    @ManyToOne
    private TEmplacement lgEMPLACEMENTID;

    @JoinColumn(name = "lg_USER_CREATEUR_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERCREATEURID;

    @JoinColumn(name = "lg_USER_TRAITANT_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERTRAITANTID;

    @JoinColumn(name = "lg_USER_CLOTURE_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERCLOTUREID;

    @Column(name = "dt_CREATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED = new Date();

    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    @Column(name = "dt_TRAITEE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtTRAITEE;

    @Column(name = "dt_CLOTURE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCLOTURE;

    /** Utilisateur occupant actuellement la suggestion, et depuis quand. */
    @JoinColumn(name = "lg_USER_VERROU_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERVERROUID;

    @Column(name = "dt_VERROU")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtVERROU;

    /**
     * Controle du travail fait : qui a constate sur le terrain que le deplacement a bien ete realise, quand, et ce
     * qu'il a eventuellement observe. Tant que {@code dtCONTROLE} est nul, la suggestion est traitee mais non
     * controlee.
     */
    @JoinColumn(name = "lg_USER_CONTROLE_ID", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser lgUSERCONTROLEID;

    @Column(name = "dt_CONTROLE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCONTROLE;

    @Column(name = "str_OBSERVATION_CONTROLE", length = 500)
    private String strOBSERVATIONCONTROLE;

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "lgSUGGESTIONRESERVEID")
    private Collection<TSuggestionReserveDetail> details;

    public TUser getLgUSERCONTROLEID() {
        return lgUSERCONTROLEID;
    }

    public void setLgUSERCONTROLEID(TUser lgUSERCONTROLEID) {
        this.lgUSERCONTROLEID = lgUSERCONTROLEID;
    }

    public Date getDtCONTROLE() {
        return dtCONTROLE;
    }

    public void setDtCONTROLE(Date dtCONTROLE) {
        this.dtCONTROLE = dtCONTROLE;
    }

    public String getStrOBSERVATIONCONTROLE() {
        return strOBSERVATIONCONTROLE;
    }

    public void setStrOBSERVATIONCONTROLE(String strOBSERVATIONCONTROLE) {
        this.strOBSERVATIONCONTROLE = strOBSERVATIONCONTROLE;
    }

    public TSuggestionReserve() {
    }

    public TSuggestionReserve(String lgSUGGESTIONRESERVEID) {
        this.lgSUGGESTIONRESERVEID = lgSUGGESTIONRESERVEID;
    }

    public String getLgSUGGESTIONRESERVEID() {
        return lgSUGGESTIONRESERVEID;
    }

    public void setLgSUGGESTIONRESERVEID(String lgSUGGESTIONRESERVEID) {
        this.lgSUGGESTIONRESERVEID = lgSUGGESTIONRESERVEID;
    }

    public String getStrREF() {
        return strREF;
    }

    public void setStrREF(String strREF) {
        this.strREF = strREF;
    }

    public String getStrCATEGORIE() {
        return strCATEGORIE;
    }

    public void setStrCATEGORIE(String strCATEGORIE) {
        this.strCATEGORIE = strCATEGORIE;
    }

    public String getStrORIGINE() {
        return strORIGINE;
    }

    public void setStrORIGINE(String strORIGINE) {
        this.strORIGINE = strORIGINE;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public String getStrCOMMENTAIRE() {
        return strCOMMENTAIRE;
    }

    public void setStrCOMMENTAIRE(String strCOMMENTAIRE) {
        this.strCOMMENTAIRE = strCOMMENTAIRE;
    }

    public MotifSuggestionReserve getMotif() {
        return motif;
    }

    public void setMotif(MotifSuggestionReserve motif) {
        this.motif = motif;
    }

    public TEmplacement getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public void setLgEMPLACEMENTID(TEmplacement lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
    }

    public TUser getLgUSERCREATEURID() {
        return lgUSERCREATEURID;
    }

    public void setLgUSERCREATEURID(TUser lgUSERCREATEURID) {
        this.lgUSERCREATEURID = lgUSERCREATEURID;
    }

    public TUser getLgUSERTRAITANTID() {
        return lgUSERTRAITANTID;
    }

    public void setLgUSERTRAITANTID(TUser lgUSERTRAITANTID) {
        this.lgUSERTRAITANTID = lgUSERTRAITANTID;
    }

    public TUser getLgUSERCLOTUREID() {
        return lgUSERCLOTUREID;
    }

    public void setLgUSERCLOTUREID(TUser lgUSERCLOTUREID) {
        this.lgUSERCLOTUREID = lgUSERCLOTUREID;
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

    public Date getDtTRAITEE() {
        return dtTRAITEE;
    }

    public void setDtTRAITEE(Date dtTRAITEE) {
        this.dtTRAITEE = dtTRAITEE;
    }

    public Date getDtCLOTURE() {
        return dtCLOTURE;
    }

    public void setDtCLOTURE(Date dtCLOTURE) {
        this.dtCLOTURE = dtCLOTURE;
    }

    public TUser getLgUSERVERROUID() {
        return lgUSERVERROUID;
    }

    public void setLgUSERVERROUID(TUser lgUSERVERROUID) {
        this.lgUSERVERROUID = lgUSERVERROUID;
    }

    public Date getDtVERROU() {
        return dtVERROU;
    }

    public void setDtVERROU(Date dtVERROU) {
        this.dtVERROU = dtVERROU;
    }

    public Collection<TSuggestionReserveDetail> getDetails() {
        return details;
    }

    public void setDetails(Collection<TSuggestionReserveDetail> details) {
        this.details = details;
    }

    @Override
    public int hashCode() {
        return (lgSUGGESTIONRESERVEID != null ? lgSUGGESTIONRESERVEID.hashCode() : 0);
    }

    @Override
    public boolean equals(Object object) {
        if (!(object instanceof TSuggestionReserve)) {
            return false;
        }
        TSuggestionReserve other = (TSuggestionReserve) object;
        return !((this.lgSUGGESTIONRESERVEID == null && other.lgSUGGESTIONRESERVEID != null)
                || (this.lgSUGGESTIONRESERVEID != null
                        && !this.lgSUGGESTIONRESERVEID.equals(other.lgSUGGESTIONRESERVEID)));
    }

    @Override
    public String toString() {
        return "dal.TSuggestionReserve[ lgSUGGESTIONRESERVEID=" + lgSUGGESTIONRESERVEID + " ]";
    }
}
