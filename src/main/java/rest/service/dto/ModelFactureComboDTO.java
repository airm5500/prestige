package rest.service.dto;

import java.text.SimpleDateFormat;
import java.util.Date;

import org.json.JSONException;
import org.json.JSONObject;

import dal.TModelFacture;

/**
 * Une ligne de la liste déroulante « modèle de facture » de la fiche tiers payant.
 *
 * Les noms de propriétés sont ceux que l'écran attend depuis toujours ({@code lg_MODEL_FACTURE_ID}, {@code str_VALUE}…)
 * : ils viennent du modèle ExtJS {@code testextjs.model.ModelFacture}. Ils sont volontairement conservés tels quels, en
 * passant de la JSP au service REST, pour que l'écran ne voie aucune différence.
 *
 * @author koben
 */
public class ModelFactureComboDTO {

    /** Format historique de la date dans cette liste : jour/mois/année, sans heure. */
    private static final String FORMAT_DATE = "dd/MM/yyyy";

    private final String id;
    private final String valeur;
    private final String description;
    private final String statut;
    private final String creeLe;

    public ModelFactureComboDTO(TModelFacture modele) {
        this.id = modele.getLgMODELFACTUREID();
        this.valeur = modele.getStrVALUE();
        this.description = modele.getStrDESCRIPTION();
        this.statut = modele.getStrSTATUT();
        this.creeLe = formater(modele.getDtCREATED());
    }

    private static String formater(Date date) {
        return date == null ? "" : new SimpleDateFormat(FORMAT_DATE).format(date);
    }

    /** Objet JSON aux noms attendus par l'écran. Une valeur absente devient une chaîne vide, jamais {@code null}. */
    public JSONObject toJson() throws JSONException {
        return new JSONObject().put("lg_MODEL_FACTURE_ID", vide(id)).put("str_VALUE", vide(valeur))
                .put("str_DESCRIPTION", vide(description)).put("str_STATUT", vide(statut))
                .put("dt_CREATED", vide(creeLe));
    }

    private static String vide(String valeur) {
        return valeur == null ? "" : valeur;
    }

    public String getId() {
        return id;
    }

    public String getValeur() {
        return valeur;
    }

    public String getDescription() {
        return description;
    }

    public String getStatut() {
        return statut;
    }

    public String getCreeLe() {
        return creeLe;
    }
}
