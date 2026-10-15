package rest.service.mobile.lecture;

import java.io.IOException;
import java.net.URI;
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
 * O5 : lecture avancee par l'API Claude (Messages API, image + sortie JSON structuree).
 * <p>
 * Appel HTTP direct ({@code java.net.http}) : le SDK Java officiel d'Anthropic n'est pas une dependance de Prestige
 * (construction hors ligne), et le fournisseur doit rester interchangeable. Requete : {@code POST /v1/messages},
 * en-tetes {@code x-api-key}, {@code anthropic-version: 2023-06-01} ; image JPEG en base64 ; reponse contrainte par
 * {@code output_config.format} (json_schema) ; effort {@code low} (lecture simple, cout minimal).
 * <p>
 * La consigne demande UNIQUEMENT les medicaments prescrits : jamais nom de patient, de medecin, date, adresse. Le
 * serveur filtre aussi le resultat ({@link LignesLues#nettoyer}).
 */
public class FournisseurClaude implements FournisseurLecture {

    static final String CONSIGNE = "Tu lis la zone des médicaments d'une ordonnance médicale française manuscrite ou "
            + "imprimée (photo recadrée). Renvoie UNIQUEMENT les médicaments prescrits, un élément par médicament, dans "
            + "l'ordre de l'ordonnance : nom commercial ou DCI tel qu'écrit (corrige seulement l'orthographe évidente "
            + "d'un médicament connu), dosage (ex. « 1 g », « 500 mg », « 80/480 »), forme (cp, gélule, sirop, "
            + "suspension, sachet, ampoule, suppositoire, collyre, pommade, injectable…), posologie et quantité "
            + "(boîtes) telles qu'écrites, et ta confiance de 0 à 1 dans la lecture du nom. Laisse une chaîne vide si "
            + "une information est absente ou illisible. N'inclus JAMAIS le nom d'une personne (patient, médecin), une "
            + "date, un âge, une adresse, un téléphone, un numéro ou le nom d'un établissement, même s'ils sont visibles. "
            + "Si aucun médicament n'est lisible, renvoie une liste vide.";

    static JSONObject schema() {
        JSONObject chaine = new JSONObject().put("type", "string");
        JSONObject ligne = new JSONObject().put("type", "object").put("properties",
                new JSONObject().put("nom", chaine).put("dosage", chaine).put("forme", chaine).put("posologie", chaine)
                        .put("quantite", chaine).put("confiance", new JSONObject().put("type", "number")))
                .put("required", new JSONArray().put("nom").put("dosage").put("forme").put("posologie").put("quantite")
                        .put("confiance"))
                .put("additionalProperties", false);
        return new JSONObject().put("type", "object")
                .put("properties",
                        new JSONObject().put("lignes", new JSONObject().put("type", "array").put("items", ligne)))
                .put("required", new JSONArray().put("lignes")).put("additionalProperties", false);
    }

    /** Corps de la requete (sans la cle, qui va dans l'en-tete). */
    static JSONObject requete(byte[] jpeg, String modele) {
        JSONObject image = new JSONObject().put("type", "image").put("source", new JSONObject().put("type", "base64")
                .put("media_type", "image/jpeg").put("data", Base64.getEncoder().encodeToString(jpeg)));
        JSONObject texte = new JSONObject().put("type", "text").put("text",
                "Liste les médicaments prescrits sur cette zone d'ordonnance.");
        return new JSONObject().put("model", modele).put("max_tokens", 4000).put("system", CONSIGNE)
                .put("output_config",
                        new JSONObject().put("effort", "low").put("format",
                                new JSONObject().put("type", "json_schema").put("schema", schema())))
                .put("messages", new JSONArray().put(
                        new JSONObject().put("role", "user").put("content", new JSONArray().put(image).put(texte))));
    }

    @Override
    public Resultat lire(byte[] jpeg, LectureAvanceeConfiguration config) throws Echec {
        String cle = config.cle();
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(config.url()))
                .timeout(Duration.ofMillis(config.delaiMs())).header("content-type", "application/json")
                .header("anthropic-version", "2023-06-01").POST(HttpRequest.BodyPublishers
                        .ofString(requete(jpeg, config.modele()).toString(), StandardCharsets.UTF_8));
        if (cle != null) {
            b.header("x-api-key", cle);
        }
        HttpResponse<String> r;
        try {
            r = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build().send(b.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (HttpTimeoutException e) {
            throw new Echec("délai dépassé", true);
        } catch (IOException e) {
            throw new Echec("service de lecture injoignable", false);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new Echec("lecture interrompue", false);
        }
        return analyser(r.statusCode(), r.body());
    }

    /** Reponse de la Messages API → lignes (sans jamais recopier le corps dans un message d'erreur). */
    static Resultat analyser(int statut, String corps) throws Echec {
        if (statut == 401 || statut == 403) {
            throw new Echec("clé du service de lecture refusée (configuration du serveur)", false);
        }
        if (statut == 429 || statut == 529) {
            throw new Echec("service de lecture saturé, réessayez plus tard", false);
        }
        if (statut != 200) {
            throw new Echec("service de lecture indisponible (code " + statut + ")", false);
        }
        try {
            JSONObject o = new JSONObject(corps);
            String arret = o.optString("stop_reason");
            if ("refusal".equals(arret)) {
                throw new Echec("lecture refusée par le service", false);
            }
            if ("max_tokens".equals(arret)) {
                throw new Echec("réponse incomplète du service", false);
            }
            JSONArray contenu = o.optJSONArray("content");
            String json = null;
            for (int i = 0; contenu != null && i < contenu.length(); i++) {
                JSONObject bloc = contenu.optJSONObject(i);
                if (bloc != null && "text".equals(bloc.optString("type"))) {
                    json = bloc.optString("text");
                    break;
                }
            }
            if (json == null) {
                throw new Echec("réponse inattendue du service", false);
            }
            JSONArray lignes = new JSONObject(json).optJSONArray("lignes");
            JSONObject u = o.optJSONObject("usage");
            return new Resultat(LignesLues.nettoyer(lignes), u == null ? 0 : u.optLong("input_tokens"),
                    u == null ? 0 : u.optLong("output_tokens"));
        } catch (JSONException e) {
            throw new Echec("réponse illisible du service", false);
        }
    }
}
