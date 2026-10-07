package util.whatsapp;

import java.util.UUID;
import java.util.concurrent.TimeUnit;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;

/**
 * Envoi d'UN message WhatsApp selon le compte : simulation (mode test, aucun appel), Cloud API de Meta, ou service
 * compagnon WhatsApp Web ({@code POST <url>/messages}, {@code Authorization: Bearer <jeton>}, corps {@code {"to":
 * "225...", "text": "..."}}, reponse {@code {"id": "..."}}). Ni le jeton ni le texte ne sont journalises.
 */
public final class WhatsAppEnvoi {

    private WhatsAppEnvoi() {
    }

    /** Resultat d'un envoi. */
    public static final class Resultat {
        public final boolean accepte;
        public final boolean simule;
        public final String messageId;
        public final String erreur;

        private Resultat(boolean accepte, boolean simule, String messageId, String erreur) {
            this.accepte = accepte;
            this.simule = simule;
            this.messageId = messageId;
            this.erreur = erreur;
        }

        public static Resultat accepte(String id, boolean simule) {
            return new Resultat(true, simule, id, null);
        }

        public static Resultat refuse(String erreur) {
            return new Resultat(false, false, null, StringUtils.left(erreur, 250));
        }
    }

    public static Resultat envoyer(WhatsAppCompte c, String numeroInternational, String texte) {
        if (c == null) {
            return Resultat.refuse("Aucun compte WhatsApp");
        }
        if (c.modeTest) {
            return Resultat.accepte("SIMULE-" + UUID.randomUUID(), true);
        }
        if (!c.actif) {
            return Resultat.refuse("Compte WhatsApp " + c.mode + " inactif");
        }
        if (!c.pret()) {
            return Resultat.refuse("Compte WhatsApp " + c.mode + " incomplet");
        }
        Client client = ClientBuilder.newBuilder().connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS).build();
        try {
            if (WhatsAppCompte.API.equals(c.mode)) {
                JSONObject corps = WhatsAppCloudApi.corps(numeroInternational, texte, c.modeleNom, c.modeleLangue);
                Response r = client.target(WhatsAppCloudApi.url(c.apiVersion, c.phoneNumberId)).request()
                        .header("Authorization", "Bearer " + c.accessToken.trim())
                        .post(Entity.entity(corps.toString(), MediaType.APPLICATION_JSON));
                JSONObject rep = json(r.readEntity(String.class));
                String id = WhatsAppCloudApi.identifiant(rep);
                return r.getStatus() / 100 == 2 && id != null ? Resultat.accepte(id, false)
                        : Resultat.refuse("HTTP " + r.getStatus() + " " + WhatsAppCloudApi.erreur(rep));
            }
            JSONObject corps = new JSONObject().put("to", numeroInternational).put("text", texte);
            Response r = client.target(StringUtils.removeEnd(c.webUrl.trim(), "/") + "/messages").request()
                    .header("Authorization", "Bearer " + c.webJeton.trim())
                    .post(Entity.entity(corps.toString(), MediaType.APPLICATION_JSON));
            JSONObject rep = json(r.readEntity(String.class));
            String id = StringUtils.trimToNull(rep.optString("id"));
            return r.getStatus() / 100 == 2 && id != null ? Resultat.accepte(id, false) : Resultat.refuse("HTTP "
                    + r.getStatus() + " " + StringUtils.left(rep.optString("error", rep.optString("erreur")), 200));
        } catch (Exception e) {
            /* le message d'une exception reseau ne contient ni jeton ni texte */
            return Resultat.refuse("Service WhatsApp injoignable : " + e.getClass().getSimpleName());
        } finally {
            client.close();
        }
    }

    private static JSONObject json(String s) {
        try {
            return StringUtils.isBlank(s) ? new JSONObject() : new JSONObject(s);
        } catch (RuntimeException e) {
            return new JSONObject();
        }
    }
}
