package dal;

import java.io.Serializable;
import java.util.Date;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.OneToMany;
import javax.persistence.OrderBy;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;

/**
 * Ordonnance d'un client (evolution 6, point 2).
 *
 * <p>
 * Un DOCUMENT rattache au dossier du client, et rien de plus : l'enregistrer ne cree aucune vente, ne bouge aucune
 * unite de stock et n'ecrit pas dans l'ordonnancier reglementaire. Un client peut en avoir autant qu'il en presente, et
 * une nouvelle ordonnance ne remplace jamais les precedentes.
 *
 * <p>
 * Le prescripteur et l'etablissement sont facultatifs (« si disponibles ») : une ordonnance dont le tampon est
 * illisible doit pouvoir etre saisie quand meme, sinon elle ne le sera pas du tout.
 *
 * <p>
 * Une ordonnance ne se supprime pas : {@link #strSTATUT} passe a {@code annulee} avec son motif, et le document reste
 * dans l'historique. Un document de sante qui disparait sans trace est une tracabilite qui ne vaut rien.
 */
@Entity
@Table(name = "t_ordonnance_client")
public class TOrdonnanceClient implements Serializable {

    private static final long serialVersionUID = 1L;

    /** Ordonnance en vigueur. */
    public static final String STATUT_ACTIVE = "enable";
    /** Ordonnance annulee : conservee, affichee barree, jamais effacee. */
    public static final String STATUT_ANNULEE = "annulee";

    @Id
    @Column(name = "lg_ORDONNANCE_ID", nullable = false, length = 40)
    private String lgORDONNANCEID;

    @Column(name = "str_NUMERO", nullable = false, length = 30)
    private String strNUMERO;

    /*
     * PAS DE « fetch = LAZY » sur les @ManyToOne de cette entite : EclipseLink ne l'applique que si le TISSAGE des
     * classes est actif, il ne l'est pas dans ce deploiement, et il l'annoncait a chaque demarrage - « Reverting the
     * lazy setting ... since weaving was not enabled ». Une optimisation qu'on croit acquise et qui n'existe pas vaut
     * moins que pas d'optimisation du tout. Les COLLECTIONS, elles, restent paresseuses : leur chargement differe n'a
     * pas besoin du tissage et fonctionne bien.
     */
    @JoinColumn(name = "lg_CLIENT_ID", referencedColumnName = "lg_CLIENT_ID", nullable = false)
    @ManyToOne(optional = false)
    private TClient client;

    @Column(name = "dt_ORDONNANCE", nullable = false)
    @Temporal(TemporalType.DATE)
    private Date dtORDONNANCE;

    @JoinColumn(name = "lg_MEDECIN_ID", referencedColumnName = "lg_MEDECIN_ID")
    @ManyToOne
    private TMedecin medecin;

    @Column(name = "str_ETABLISSEMENT", length = 100)
    private String strETABLISSEMENT;

    @Column(name = "str_OBSERVATIONS")
    private String strOBSERVATIONS;

    @Column(name = "str_STATUT", nullable = false, length = 20)
    private String strSTATUT = STATUT_ACTIVE;

    @Column(name = "str_MOTIF_ANNULATION", length = 200)
    private String strMOTIFANNULATION;

    /*
     * Contexte clinique (retour du 22/09) : les champs de l'Analyse posologie, gardes avec l'ordonnance pour rejouer
     * l'analyse Posos sans ressaisie. Aucun n'identifie le patient.
     */
    @Column(name = "int_AGE_PATIENT")
    private Integer intAGEPATIENT;

    @Column(name = "str_SEXE_PATIENT", length = 1)
    private String strSEXEPATIENT;

    @Column(name = "bool_GROSSESSE", nullable = false)
    private boolean boolGROSSESSE;

    @Column(name = "bool_ALLAITEMENT", nullable = false)
    private boolean boolALLAITEMENT;

    @Column(name = "bool_INSUF_RENALE", nullable = false)
    private boolean boolINSUFRENALE;

    @Column(name = "bool_INSUF_HEPATIQUE", nullable = false)
    private boolean boolINSUFHEPATIQUE;

    @Column(name = "lg_USER_CREATED", length = 40)
    private String lgUSERCREATED;

    @Column(name = "dt_CREATED", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;

    @Column(name = "lg_USER_UPDATED", length = 40)
    private String lgUSERUPDATED;

    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    @OneToMany(mappedBy = "ordonnance", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("intORDRE ASC")
    private List<TOrdonnanceClientDetail> details;

    public TOrdonnanceClient() {
    }

    public String getLgORDONNANCEID() {
        return lgORDONNANCEID;
    }

    public void setLgORDONNANCEID(String lgORDONNANCEID) {
        this.lgORDONNANCEID = lgORDONNANCEID;
    }

    public String getStrNUMERO() {
        return strNUMERO;
    }

    public void setStrNUMERO(String strNUMERO) {
        this.strNUMERO = strNUMERO;
    }

    public TClient getClient() {
        return client;
    }

    public void setClient(TClient client) {
        this.client = client;
    }

    public Date getDtORDONNANCE() {
        return dtORDONNANCE;
    }

    public void setDtORDONNANCE(Date dtORDONNANCE) {
        this.dtORDONNANCE = dtORDONNANCE;
    }

    public TMedecin getMedecin() {
        return medecin;
    }

    public void setMedecin(TMedecin medecin) {
        this.medecin = medecin;
    }

    public String getStrETABLISSEMENT() {
        return strETABLISSEMENT;
    }

    public void setStrETABLISSEMENT(String strETABLISSEMENT) {
        this.strETABLISSEMENT = strETABLISSEMENT;
    }

    public String getStrOBSERVATIONS() {
        return strOBSERVATIONS;
    }

    public void setStrOBSERVATIONS(String strOBSERVATIONS) {
        this.strOBSERVATIONS = strOBSERVATIONS;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public String getStrMOTIFANNULATION() {
        return strMOTIFANNULATION;
    }

    public void setStrMOTIFANNULATION(String strMOTIFANNULATION) {
        this.strMOTIFANNULATION = strMOTIFANNULATION;
    }

    public String getLgUSERCREATED() {
        return lgUSERCREATED;
    }

    public void setLgUSERCREATED(String lgUSERCREATED) {
        this.lgUSERCREATED = lgUSERCREATED;
    }

    public Date getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(Date dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getLgUSERUPDATED() {
        return lgUSERUPDATED;
    }

    public void setLgUSERUPDATED(String lgUSERUPDATED) {
        this.lgUSERUPDATED = lgUSERUPDATED;
    }

    public Date getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(Date dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public List<TOrdonnanceClientDetail> getDetails() {
        return details;
    }

    public void setDetails(List<TOrdonnanceClientDetail> details) {
        this.details = details;
    }

    public boolean estAnnulee() {
        return STATUT_ANNULEE.equals(strSTATUT);
    }

    public Integer getIntAGEPATIENT() {
        return intAGEPATIENT;
    }

    public void setIntAGEPATIENT(Integer intAGEPATIENT) {
        this.intAGEPATIENT = intAGEPATIENT;
    }

    public String getStrSEXEPATIENT() {
        return strSEXEPATIENT;
    }

    public void setStrSEXEPATIENT(String strSEXEPATIENT) {
        this.strSEXEPATIENT = strSEXEPATIENT;
    }

    public boolean isBoolGROSSESSE() {
        return boolGROSSESSE;
    }

    public void setBoolGROSSESSE(boolean boolGROSSESSE) {
        this.boolGROSSESSE = boolGROSSESSE;
    }

    public boolean isBoolALLAITEMENT() {
        return boolALLAITEMENT;
    }

    public void setBoolALLAITEMENT(boolean boolALLAITEMENT) {
        this.boolALLAITEMENT = boolALLAITEMENT;
    }

    public boolean isBoolINSUFRENALE() {
        return boolINSUFRENALE;
    }

    public void setBoolINSUFRENALE(boolean boolINSUFRENALE) {
        this.boolINSUFRENALE = boolINSUFRENALE;
    }

    public boolean isBoolINSUFHEPATIQUE() {
        return boolINSUFHEPATIQUE;
    }

    public void setBoolINSUFHEPATIQUE(boolean boolINSUFHEPATIQUE) {
        this.boolINSUFHEPATIQUE = boolINSUFHEPATIQUE;
    }
}
