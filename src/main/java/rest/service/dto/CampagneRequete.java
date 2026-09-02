package rest.service.dto;

import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Demande de campagne SMS / WhatsApp depuis le suivi de consommation (point 2) : la population visee (clients coches,
 * sinon tout le resultat des criteres), le canal, le message et le medicament filtre (pour la variable {medicament}).
 * Construite depuis le corps JSON de la requete.
 */
public final class CampagneRequete {

    private final List<String> clientIds = new ArrayList<>();
    private ConsoFiltres filtres = new ConsoFiltres();
    private String canal = "SMS";
    private String message = "";
    private String modeleId = "";
    private String medicament = "";

    public static CampagneRequete depuisJson(String corps) {
        CampagneRequete r = new CampagneRequete();
        JSONObject o = new JSONObject(corps == null || corps.isBlank() ? "{}" : corps);
        JSONArray ids = o.optJSONArray("clientIds");
        for (int i = 0; ids != null && i < ids.length(); i++) {
            String id = ids.optString(i, "").trim();
            if (!id.isEmpty() && !r.clientIds.contains(id)) {
                r.clientIds.add(id);
            }
        }
        r.canal = o.optString("canal", "SMS").trim().toUpperCase(java.util.Locale.ROOT);
        r.message = o.optString("message", "");
        r.modeleId = o.optString("modeleId", "");
        r.medicament = o.optString("medicament", "");
        JSONObject f = o.optJSONObject("filtres");
        if (f != null) {
            r.filtres = filtresDepuisJson(f);
        }
        return r;
    }

    public static ConsoFiltres filtresDepuisJson(JSONObject f) {
        return new ConsoFiltres().dtStart(f.optString("dtStart", null)).dtEnd(f.optString("dtEnd", null))
                .query(f.optString("query", "")).habitude(f.optString("habitude", ""))
                .typeClient(f.optString("typeClient", "")).sortBy(f.optString("sortBy", "montant"))
                .medicament(f.optString("medicament", "")).familleId(f.optString("familleId", ""))
                .nbAchats(f.optString("nbAchatsOp", ""), f.optString("nbAchats", ""))
                .montant(f.optString("montantOp", ""), f.optString("montant", ""))
                .frequence(f.optString("frequenceOp", ""), f.optString("frequence", ""));
    }

    public List<String> getClientIds() {
        return clientIds;
    }

    public ConsoFiltres getFiltres() {
        return filtres;
    }

    public String getCanal() {
        return canal;
    }

    public boolean estWhatsapp() {
        return "WHATSAPP".equals(canal);
    }

    public String getMessage() {
        return message;
    }

    public String getModeleId() {
        return modeleId;
    }

    public String getMedicament() {
        return medicament;
    }
}
