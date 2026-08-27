package dal;

import java.io.Serializable;
import java.util.Date;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import javax.persistence.Temporal;
import javax.persistence.TemporalType;
import javax.xml.bind.annotation.XmlRootElement;

/**
 * Demande de produit non vendue (vente ratee). Chaque demande est une ligne independante : elle garde son client, son
 * telephone, sa quantite, son motif, son commentaire, son heure et son utilisateur. Le CIP et la designation sont
 * copies au moment de la saisie, meme quand le produit est connu, pour que l'historique reste comprehensible si la
 * fiche produit change ensuite. Une saisie libre (produit inconnu, {@code lgFAMILLEID} nul) peut etre rattachee plus
 * tard a un produit existant ou nouvellement cree.
 */
@Entity
@Table(name = "t_vente_ratee")
@XmlRootElement
public class VenteRatee implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @Basic(optional = false)
    @Column(name = "lg_VENTE_RATEE_ID", nullable = false, length = 40)
    private String lgVENTERATEEID;

    /** Produit de la base, facultatif : nul pour une saisie libre non rattachee. */
    @Column(name = "lg_FAMILLE_ID", length = 40)
    private String lgFAMILLEID;

    @Column(name = "str_CIP", length = 40)
    private String strCIP;

    @Column(name = "str_DESIGNATION", nullable = false, length = 150)
    private String strDESIGNATION;

    /** Designation normalisee (minuscules, espaces reduits) pour regrouper les saisies libres. */
    @Column(name = "str_DESIGNATION_NORM", nullable = false, length = 150)
    private String strDESIGNATIONNORM;

    @Column(name = "int_QUANTITE", nullable = false)
    private int intQUANTITE = 1;

    @Column(name = "lg_CLIENT_ID", length = 40)
    private String lgCLIENTID;

    @Column(name = "str_NOM_CLIENT", length = 120)
    private String strNOMCLIENT;

    @Column(name = "str_TELEPHONE", length = 30)
    private String strTELEPHONE;

    @Column(name = "lg_MOTIF_ID", length = 40)
    private String lgMOTIFID;

    /** Libelle du motif copie a la saisie : l'historique survit au renommage du referentiel. */
    @Column(name = "str_MOTIF", length = 100)
    private String strMOTIF;

    @Column(name = "str_COMMENTAIRE", length = 255)
    private String strCOMMENTAIRE;

    @Column(name = "bool_COMMANDE", nullable = false)
    private boolean boolCOMMANDE;

    @Column(name = "dt_COMMANDE")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCOMMANDE;

    @Column(name = "lg_USER_COMMANDE_ID", length = 40)
    private String lgUSERCOMMANDEID;

    @Column(name = "dt_RATTACHEMENT")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtRATTACHEMENT;

    @Column(name = "lg_USER_RATTACHE_ID", length = 40)
    private String lgUSERRATTACHEID;

    @Column(name = "dt_CREATED", nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtCREATED;

    @Column(name = "dt_UPDATED")
    @Temporal(TemporalType.TIMESTAMP)
    private Date dtUPDATED;

    @Column(name = "lg_USER_ID", length = 40)
    private String lgUSERID;

    @Column(name = "str_STATUT", nullable = false, length = 20)
    private String strSTATUT = "enable";

    public VenteRatee() {
    }

    public VenteRatee(String lgVENTERATEEID) {
        this.lgVENTERATEEID = lgVENTERATEEID;
    }

    public String getLgVENTERATEEID() {
        return lgVENTERATEEID;
    }

    public void setLgVENTERATEEID(String lgVENTERATEEID) {
        this.lgVENTERATEEID = lgVENTERATEEID;
    }

    public String getLgFAMILLEID() {
        return lgFAMILLEID;
    }

    public void setLgFAMILLEID(String lgFAMILLEID) {
        this.lgFAMILLEID = lgFAMILLEID;
    }

    public String getStrCIP() {
        return strCIP;
    }

    public void setStrCIP(String strCIP) {
        this.strCIP = strCIP;
    }

    public String getStrDESIGNATION() {
        return strDESIGNATION;
    }

    public void setStrDESIGNATION(String strDESIGNATION) {
        this.strDESIGNATION = strDESIGNATION;
    }

    public String getStrDESIGNATIONNORM() {
        return strDESIGNATIONNORM;
    }

    public void setStrDESIGNATIONNORM(String strDESIGNATIONNORM) {
        this.strDESIGNATIONNORM = strDESIGNATIONNORM;
    }

    public int getIntQUANTITE() {
        return intQUANTITE;
    }

    public void setIntQUANTITE(int intQUANTITE) {
        this.intQUANTITE = intQUANTITE;
    }

    public String getLgCLIENTID() {
        return lgCLIENTID;
    }

    public void setLgCLIENTID(String lgCLIENTID) {
        this.lgCLIENTID = lgCLIENTID;
    }

    public String getStrNOMCLIENT() {
        return strNOMCLIENT;
    }

    public void setStrNOMCLIENT(String strNOMCLIENT) {
        this.strNOMCLIENT = strNOMCLIENT;
    }

    public String getStrTELEPHONE() {
        return strTELEPHONE;
    }

    public void setStrTELEPHONE(String strTELEPHONE) {
        this.strTELEPHONE = strTELEPHONE;
    }

    public String getLgMOTIFID() {
        return lgMOTIFID;
    }

    public void setLgMOTIFID(String lgMOTIFID) {
        this.lgMOTIFID = lgMOTIFID;
    }

    public String getStrMOTIF() {
        return strMOTIF;
    }

    public void setStrMOTIF(String strMOTIF) {
        this.strMOTIF = strMOTIF;
    }

    public String getStrCOMMENTAIRE() {
        return strCOMMENTAIRE;
    }

    public void setStrCOMMENTAIRE(String strCOMMENTAIRE) {
        this.strCOMMENTAIRE = strCOMMENTAIRE;
    }

    public boolean isBoolCOMMANDE() {
        return boolCOMMANDE;
    }

    public void setBoolCOMMANDE(boolean boolCOMMANDE) {
        this.boolCOMMANDE = boolCOMMANDE;
    }

    public Date getDtCOMMANDE() {
        return dtCOMMANDE;
    }

    public void setDtCOMMANDE(Date dtCOMMANDE) {
        this.dtCOMMANDE = dtCOMMANDE;
    }

    public String getLgUSERCOMMANDEID() {
        return lgUSERCOMMANDEID;
    }

    public void setLgUSERCOMMANDEID(String lgUSERCOMMANDEID) {
        this.lgUSERCOMMANDEID = lgUSERCOMMANDEID;
    }

    public Date getDtRATTACHEMENT() {
        return dtRATTACHEMENT;
    }

    public void setDtRATTACHEMENT(Date dtRATTACHEMENT) {
        this.dtRATTACHEMENT = dtRATTACHEMENT;
    }

    public String getLgUSERRATTACHEID() {
        return lgUSERRATTACHEID;
    }

    public void setLgUSERRATTACHEID(String lgUSERRATTACHEID) {
        this.lgUSERRATTACHEID = lgUSERRATTACHEID;
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

    public String getLgUSERID() {
        return lgUSERID;
    }

    public void setLgUSERID(String lgUSERID) {
        this.lgUSERID = lgUSERID;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    @Override
    public int hashCode() {
        return (lgVENTERATEEID != null ? lgVENTERATEEID.hashCode() : 0);
    }

    @Override
    public boolean equals(Object object) {
        if (!(object instanceof VenteRatee)) {
            return false;
        }
        VenteRatee other = (VenteRatee) object;
        return !((this.lgVENTERATEEID == null && other.lgVENTERATEEID != null)
                || (this.lgVENTERATEEID != null && !this.lgVENTERATEEID.equals(other.lgVENTERATEEID)));
    }

    @Override
    public String toString() {
        return "dal.VenteRatee[ id=" + lgVENTERATEEID + " ]";
    }
}
