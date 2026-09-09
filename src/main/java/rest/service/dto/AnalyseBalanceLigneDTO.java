package rest.service.dto;

import org.json.JSONObject;

/**
 * Une periode de l'analyse comparative de la balance, telle que l'edition PDF la lit (retour du 09/09, point 4 : «
 * l'analyse comparative doit avoir son fichier jrxml »).
 *
 * <p>
 * L'ecran et le classeur Excel travaillent sur du JSON ; JasperReports veut des proprietes de bean. Cet objet est la
 * traduction, champ pour champ, de la ligne JSON de {@code /balancesalecash/analyse} : ce que le PDF imprime est ce que
 * l'ecran affiche.
 * </p>
 */
public class AnalyseBalanceLigneDTO {

    private final String libelle;
    private final String debut;
    private final String fin;
    private final boolean enCours;
    private final long nbreVente;
    private final long montantTTC;
    private final long montantRemise;
    private final long montantNet;
    private final long montantAchat;
    private final long marge;
    private final long panierMoyen;
    private final long montantEsp;
    private final long montantCB;
    private final long montantCheque;
    private final long montantVirement;
    private final long montantMobilePayment;
    private final long montantTp;
    private final long montantDiff;
    private final Long ecart;
    private final Double ecartPourcentage;

    public AnalyseBalanceLigneDTO(JSONObject ligne) {
        this.libelle = ligne.optString("libelle");
        this.debut = ligne.optString("debut");
        this.fin = ligne.optString("fin");
        this.enCours = ligne.optBoolean("enCours");
        this.nbreVente = ligne.optLong("nbreVente");
        this.montantTTC = ligne.optLong("montantTTC");
        this.montantRemise = ligne.optLong("montantRemise");
        this.montantNet = ligne.optLong("montantNet");
        this.montantAchat = ligne.optLong("montantAchat");
        this.marge = ligne.optLong("marge");
        this.panierMoyen = ligne.optLong("panierMoyen");
        this.montantEsp = ligne.optLong("montantEsp");
        this.montantCB = ligne.optLong("montantCB");
        this.montantCheque = ligne.optLong("montantCheque");
        this.montantVirement = ligne.optLong("montantVirement");
        this.montantMobilePayment = ligne.optLong("montantMobilePayment");
        this.montantTp = ligne.optLong("montantTp");
        this.montantDiff = ligne.optLong("montantDiff");
        this.ecart = ligne.isNull("ecart") ? null : ligne.optLong("ecart");
        this.ecartPourcentage = ligne.isNull("ecartPourcentage") ? null : ligne.optDouble("ecartPourcentage");
    }

    public String getLibelle() {
        return libelle;
    }

    /** Le libelle porte la mention « en cours » : un PDF n'a pas les couleurs de l'ecran pour le dire. */
    public String getLibelleComplet() {
        return enCours ? libelle + " (en cours)" : libelle;
    }

    public String getDebut() {
        return debut;
    }

    public String getFin() {
        return fin;
    }

    public boolean isEnCours() {
        return enCours;
    }

    public long getNbreVente() {
        return nbreVente;
    }

    public long getMontantTTC() {
        return montantTTC;
    }

    public long getMontantRemise() {
        return montantRemise;
    }

    public long getMontantNet() {
        return montantNet;
    }

    public long getMontantAchat() {
        return montantAchat;
    }

    public long getMarge() {
        return marge;
    }

    public long getPanierMoyen() {
        return panierMoyen;
    }

    public long getMontantEsp() {
        return montantEsp;
    }

    public long getMontantCB() {
        return montantCB;
    }

    public long getMontantCheque() {
        return montantCheque;
    }

    public long getMontantVirement() {
        return montantVirement;
    }

    public long getMontantMobilePayment() {
        return montantMobilePayment;
    }

    public long getMontantTp() {
        return montantTp;
    }

    public long getMontantDiff() {
        return montantDiff;
    }

    public Long getEcart() {
        return ecart;
    }

    public Double getEcartPourcentage() {
        return ecartPourcentage;
    }
}
