package rest.service.mobile.lecture;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * O5 : lecture avancee par Google Cloud Vision ({@code images:annotate}, {@code DOCUMENT_TEXT_DETECTION}, langue fr).
 * <p>
 * Vision rend le TEXTE de la zone (pas des medicaments structures) : chaque ligne lue devient une ligne {@code nom}
 * (sans dosage ni forme separes), confiance = celle du bloc ; le telephone la decoupe et la rapproche du catalogue (O2
 * / O3 / O4) comme une lecture ML Kit. Les lignes qui ressemblent a une donnee personnelle sont retirees
 * ({@link LignesLues}). Cle d'API dans {@code LECTURE_AVANCEE_CLE} (parametre {@code key}).
 */
public class FournisseurGoogleVision implements FournisseurLecture {

    static JSONObject requete(byte[] jpeg) {
        return new JSONObject()
                .put("requests",
                        new JSONArray()
                                .put(new JSONObject()
                                        .put("image",
                                                new JSONObject().put("content",
                                                        Base64.getEncoder().encodeToString(jpeg)))
                                        .put("features",
                                                new JSONArray()
                                                        .put(new JSONObject().put("type", "DOCUMENT_TEXT_DETECTION")))
                                        .put("imageContext",
                                                new JSONObject().put("languageHints", new JSONArray().put("fr")))));
    }

    @Override
    public Resultat lire(byte[] jpeg, LectureAvanceeConfiguration config) throws Echec {
        String url = config.url();
        String cle = config.cle();
        if (cle != null) {
            url += (url.contains("?") ? "&" : "?") + "key=" + URLEncoder.encode(cle, StandardCharsets.UTF_8);
        }
        HttpResponse<String> r;
        try {
            r = HttpClient
                    .newBuilder().connectTimeout(Duration.ofSeconds(10)).build().send(
                            HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofMillis(config.delaiMs()))
                                    .header("content-type", "application/json")
                                    .POST(HttpRequest.BodyPublishers.ofString(requete(jpeg).toString(),
                                            StandardCharsets.UTF_8))
                                    .build(),
                            HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (HttpTimeoutException e) {
            throw new Echec("délai dépassé", true);
        } catch (IOException e) {
            throw new Echec("service de lecture injoignable", false);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new Echec("lecture interrompue", false);
        }
        if (r.statusCode() == 401 || r.statusCode() == 403) {
            throw new Echec("clé du service de lecture refusée (configuration du serveur)", false);
        }
        if (r.statusCode() != 200) {
            throw new Echec("service de lecture indisponible (code " + r.statusCode() + ")", false);
        }
        try {
            JSONObject rep = new JSONObject(r.body()).getJSONArray("responses").getJSONObject(0);
            JSONObject doc = rep.optJSONObject("fullTextAnnotation");
            JSONArray lignes = new JSONArray();
            if (doc != null) {
                for (String l : doc.optString("text").split("\\r?\\n")) {
                    if (!l.trim().isEmpty()) {
                        lignes.put(new JSONObject().put("nom", l.trim()).put("dosage", "").put("forme", "")
                                .put("posologie", "").put("quantite", "").put("confiance", 0.5));
                    }
                }
            }
            return new Resultat(LignesLues.nettoyer(lignes), 0, 0);
        } catch (JSONException e) {
            throw new Echec("réponse illisible du service", false);
        }
    }
}
