package rest.service.impl.rappel;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Retours du 10/10 (section 13) : analyse des rappels de traitement d'une periode (date prevue du rappel).
 * <ul>
 * <li>statuts : a preparer, prepares, ecartes, rachetes ;</li>
 * <li>« envoye » n'est pas un statut (date d'envoi) : il est compte comme un etat a part, avec le canal ;</li>
 * <li>efficacite = rachetes apres un rappel envoye ÷ rappels envoyes ;</li>
 * <li>evolution par mois de la date prevue.</li>
 * </ul>
 */
public final class AnalyseRappels {

    public static final String A_PREPARER = "A_PREPARER", PREPARE = "PREPARE", ECARTE = "ECARTE", ACHETE = "ACHETE";
    public static final String CANAL_INCONNU = "NON_RENSEIGNE";

    private static final class Compteur {
        int total, aPreparer, prepares, ecartes, rachetes, envoyes, rachetesApresEnvoi;
        final Map<String, Integer> canaux = new LinkedHashMap<>();

        void ajouter(String statut, boolean envoye, String canal) {
            total++;
            if (A_PREPARER.equals(statut)) {
                aPreparer++;
            } else if (PREPARE.equals(statut)) {
                prepares++;
            } else if (ECARTE.equals(statut)) {
                ecartes++;
            } else if (ACHETE.equals(statut)) {
                rachetes++;
            }
            if (envoye) {
                envoyes++;
                canaux.merge(canal == null || canal.isEmpty() ? CANAL_INCONNU : canal, 1, Integer::sum);
                if (ACHETE.equals(statut)) {
                    rachetesApresEnvoi++;
                }
            }
        }

        JSONObject json() {
            JSONObject c = new JSONObject();
            canaux.forEach(c::put);
            return new JSONObject().put("total", total).put("aPreparer", aPreparer).put("prepares", prepares)
                    .put("ecartes", ecartes).put("rachetes", rachetes).put("envoyes", envoyes)
                    .put("rachetesApresEnvoi", rachetesApresEnvoi)
                    .put("rachetesSansEnvoi", rachetes - rachetesApresEnvoi)
                    .put("efficacite", envoyes == 0 ? 0 : Math.round(rachetesApresEnvoi * 1000.0 / envoyes) / 10.0)
                    .put("canaux", c);
        }
    }

    private final Compteur total = new Compteur();
    private final Map<String, Compteur> mois = new TreeMap<>();

    /** Un rappel : mois prevu « aaaa-mm », statut, envoye ou non, canal d'envoi (null si inconnu). */
    public void ajouter(String moisPrevu, String statut, boolean envoye, String canal) {
        total.ajouter(statut, envoye, canal);
        mois.computeIfAbsent(moisPrevu, m -> new Compteur()).ajouter(statut, envoye, canal);
    }

    public JSONObject json() {
        JSONArray m = new JSONArray();
        mois.forEach((k, c) -> m.put(c.json().put("mois", k)));
        return new JSONObject().put("total", total.json()).put("mois", m);
    }
}
