package rest.service.dto;

import org.json.JSONObject;

/**
 * Une facture de carnet depot dans le recapitulatif imprime depuis l'onglet Factures (retour des tests du 09/09, point
 * 7) : la ligne JSON de la liste affichee, traduite en bean pour JasperReports. Ce que le PDF imprime est ce que
 * l'onglet affiche, memes criteres.
 */
public class FactureCarnetDepotRecapLigneDTO {

    private final String codeFacture;
    private final String periode;
    private final String tiersPayant;
    private final String dateFacture;
    private final long nbDossier;
    private final long montant;

    public FactureCarnetDepotRecapLigneDTO(JSONObject ligne) {
        this.codeFacture = ligne.optString("strCODEFACTURE");
        this.periode = ligne.optString("periode");
        this.tiersPayant = ligne.optString("strFULLNAME");
        this.dateFacture = ligne.optString("dtDATEFACTURE");
        this.nbDossier = ligne.optLong("nbDossier");
        this.montant = ligne.optLong("dblMONTANTCMDE");
    }

    public String getCodeFacture() {
        return codeFacture;
    }

    public String getPeriode() {
        return periode;
    }

    public String getTiersPayant() {
        return tiersPayant;
    }

    public String getDateFacture() {
        return dateFacture;
    }

    public long getNbDossier() {
        return nbDossier;
    }

    public long getMontant() {
        return montant;
    }
}
