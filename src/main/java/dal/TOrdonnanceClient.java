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

    @JoinColumn(name = "lg_CLIENT_ID", referencedColumnName = "lg_CLIENT_ID", nullable = false)
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private TClient client;

    @Column(name = "dt_ORDONNANCE", nullable = false)
    @Temporal(TemporalType.DATE)
    private Date dtORDONNANCE;

    @JoinColumn(name = "lg_MEDECIN_ID", referencedColumnName = "lg_MEDECIN_ID")
    @ManyToOne(fetch = FetchType.LAZY)
    private TMedecin medecin;

    @Column(name = "str_ETABLISSEMENT", length = 100)
    private String strETABLISSEMENT;

    @Column(name = "str_OBSERVATIONS")
    private String strOBSERVATIONS;

    @Column(name = "str_STATUT", nullable = false, length = 20)
    private String strSTATUT = STATUT_ACTIVE;

    @Column(name = "str_MOTIF_ANNULATION", length = 200)
    private String strMOTIFANNULATION;

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
}
