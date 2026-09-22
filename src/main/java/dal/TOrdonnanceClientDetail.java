package dal;

import java.io.Serializable;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;

/**
 * Un produit prescrit sur une ordonnance client.
 *
 * <p>
 * L'article du referentiel est FACULTATIF et le libelle est TOUJOURS rempli : le produit se choisit dans le referentiel
 * quand il y figure, et se saisit librement sinon. Une ordonnance reflete ce que le medecin a ecrit, pas ce que
 * l'officine tient en stock.
 *
 * <p>
 * Le libelle est recopie meme quand l'article est reference : le referentiel evolue (renommage, retrait), le document
 * ne doit pas changer de sens des annees apres sa saisie.
 */
@Entity
@Table(name = "t_ordonnance_client_detail")
public class TOrdonnanceClientDetail implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @Column(name = "lg_DETAIL_ID", nullable = false, length = 40)
    private String lgDETAILID;

    /*
     * PAS DE « fetch = LAZY » sur les @ManyToOne de cette entite : EclipseLink ne l'applique que si le TISSAGE des
     * classes est actif, il ne l'est pas dans ce deploiement, et il l'annoncait a chaque demarrage - « Reverting the
     * lazy setting ... since weaving was not enabled ». Une optimisation qu'on croit acquise et qui n'existe pas vaut
     * moins que pas d'optimisation du tout.
     */
    @JoinColumn(name = "lg_ORDONNANCE_ID", referencedColumnName = "lg_ORDONNANCE_ID", nullable = false)
    @ManyToOne(optional = false)
    private TOrdonnanceClient ordonnance;

    @JoinColumn(name = "lg_FAMILLE_ID", referencedColumnName = "lg_FAMILLE_ID")
    @ManyToOne
    private TFamille article;

    @Column(name = "str_LIBELLE", nullable = false, length = 150)
    private String strLIBELLE;

    @Column(name = "int_QUANTITE", nullable = false)
    private int intQUANTITE = 1;

    @Column(name = "str_POSOLOGIE", length = 150)
    private String strPOSOLOGIE;

    @Column(name = "str_DUREE", length = 50)
    private String strDUREE;

    @Column(name = "int_ORDRE", nullable = false)
    private int intORDRE = 1;

    /** Quantite servie : null = pas encore renseignee, 0 = non servie (retour du 22/09, service par ligne). */
    @Column(name = "int_QTE_SERVIE")
    private Integer intQTESERVIE;

    public TOrdonnanceClientDetail() {
    }

    public String getLgDETAILID() {
        return lgDETAILID;
    }

    public void setLgDETAILID(String lgDETAILID) {
        this.lgDETAILID = lgDETAILID;
    }

    public TOrdonnanceClient getOrdonnance() {
        return ordonnance;
    }

    public void setOrdonnance(TOrdonnanceClient ordonnance) {
        this.ordonnance = ordonnance;
    }

    public TFamille getArticle() {
        return article;
    }

    public void setArticle(TFamille article) {
        this.article = article;
    }

    public String getStrLIBELLE() {
        return strLIBELLE;
    }

    public void setStrLIBELLE(String strLIBELLE) {
        this.strLIBELLE = strLIBELLE;
    }

    public int getIntQUANTITE() {
        return intQUANTITE;
    }

    public void setIntQUANTITE(int intQUANTITE) {
        this.intQUANTITE = intQUANTITE;
    }

    public String getStrPOSOLOGIE() {
        return strPOSOLOGIE;
    }

    public void setStrPOSOLOGIE(String strPOSOLOGIE) {
        this.strPOSOLOGIE = strPOSOLOGIE;
    }

    public String getStrDUREE() {
        return strDUREE;
    }

    public void setStrDUREE(String strDUREE) {
        this.strDUREE = strDUREE;
    }

    public int getIntORDRE() {
        return intORDRE;
    }

    public void setIntORDRE(int intORDRE) {
        this.intORDRE = intORDRE;
    }

    public Integer getIntQTESERVIE() {
        return intQTESERVIE;
    }

    public void setIntQTESERVIE(Integer intQTESERVIE) {
        this.intQTESERVIE = intQTESERVIE;
    }
}
