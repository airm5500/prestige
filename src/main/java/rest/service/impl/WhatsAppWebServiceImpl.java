package rest.service.impl;

import dal.TUser;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.WhatsAppWebService;
import util.whatsapp.ModeleWhatsApp;
import util.whatsapp.WhatsAppCloudApi;
import util.whatsapp.WhatsAppCompte;

/**
 * Voir {@link WhatsAppWebService}. Les jetons restent cote serveur : l'ecran ne recoit que des etats, le QR code et des
 * statuts ; les journaux ne contiennent ni jeton ni texte de message.
 */
@Stateless
public class WhatsAppWebServiceImpl implements WhatsAppWebService {

    private static final Logger LOG = Logger.getLogger(WhatsAppWebServiceImpl.class.getName());

    /** Regles par defaut et bornes [min, max] (memes valeurs que outils/whatsapp-web/src/regles.js). */
    static final Object[][] REGLES = { { "delaiMinSec", 20, 5, 3600 }, { "delaiMaxSec", 60, 5, 7200 },
            { "pauseApres", 15, 1, 500 }, { "pauseMinMin", 5, 0, 240 }, { "pauseMaxMin", 12, 0, 480 },
            { "plafondHeure", 40, 1, 1000 }, { "plafondJour", 150, 1, 5000 }, { "monteeEnCharge", true },
            { "monteeDepart", 20, 1, 1000 }, { "monteePas", 20, 0, 1000 }, { "heureDebut", 8, 0, 23 },
            { "heureFin", 20, 1, 24 }, { "echecsAvantPause", 3, 1, 50 }, { "pauseEchecMin", 30, 1, 1440 },
            { "verifierNumero", true } };

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Le compte du mode (API ou WEB), avec ses secrets : jamais renvoye tel quel a l'ecran. */
    @SuppressWarnings("unchecked")
    private WhatsAppCompte compte(String mode) {
        List<Object[]> r = em.createNativeQuery("SELECT mode, mode_test, api_version, waba_id, access_token, web_url,"
                + " web_jeton FROM whatsapp_compte WHERE mode = ?1").setParameter(1, mode).getResultList();
        if (r.isEmpty()) {
            return null;
        }
        Object[] l = r.get(0);
        WhatsAppCompte c = new WhatsAppCompte();
        c.mode = (String) l[0];
        c.modeTest = l[1] instanceof Boolean ? (Boolean) l[1]
                : l[1] instanceof Number && ((Number) l[1]).intValue() == 1;
        c.apiVersion = (String) l[2];
        c.wabaId = (String) l[3];
        c.accessToken = (String) l[4];
        c.webUrl = (String) l[5];
        c.webJeton = (String) l[6];
        return c;
    }

    private static JSONObject echec(String m) {
        return new JSONObject().put("success", false).put("message", m).put("msg", m);
    }

    /* ------------------------------------------------------------------ service compagnon */

    private interface Appel {
        Response faire(Client c, String base, String jeton);
    }

    private JSONObject appeler(Appel appel) {
        WhatsAppCompte c = compte(WhatsAppCompte.WEB);
        if (c == null || StringUtils.isAnyBlank(c.webUrl, c.webJeton)) {
            return echec(
                    "Service WhatsApp Web non configuré : renseignez son adresse et son jeton dans l'onglet Comptes.")
                            .put("etat", "NON_CONFIGURE");
        }
        Client client = ClientBuilder.newBuilder().connectTimeout(5, TimeUnit.SECONDS).readTimeout(20, TimeUnit.SECONDS)
                .build();
        try {
            Response r = appel.faire(client, StringUtils.removeEnd(c.webUrl.trim(), "/"), c.webJeton.trim());
            String t = r.readEntity(String.class);
            JSONObject o = StringUtils.isBlank(t) ? new JSONObject() : new JSONObject(t);
            if (r.getStatus() == 401) {
                return echec("Le service WhatsApp Web refuse le jeton : vérifiez qu'il est identique des deux côtés.")
                        .put("etat", "JETON_REFUSE");
            }
            if (r.getStatus() / 100 != 2) {
                return echec(StringUtils.defaultIfBlank(o.optString("erreur"),
                        "Service WhatsApp Web : HTTP " + r.getStatus()));
            }
            return o.put("success", true);
        } catch (Exception e) {
            LOG.log(Level.FINE, "service WhatsApp Web", e);
            return echec("Service WhatsApp Web injoignable (" + e.getClass().getSimpleName()
                    + ") : vérifiez qu'il est démarré sur le serveur.").put("etat", "INJOIGNABLE");
        } finally {
            client.close();
        }
    }

    @Override
    public JSONObject etat() {
        return appeler((c, base, j) -> c.target(base + "/etat").request().header("Authorization", "Bearer " + j).get());
    }

    @Override
    public JSONObject qr() {
        return appeler((c, base, j) -> c.target(base + "/qr").request().header("Authorization", "Bearer " + j).get());
    }

    @Override
    public JSONObject deconnecter() {
        return appeler((c, base, j) -> c.target(base + "/deconnecter").request().header("Authorization", "Bearer " + j)
                .post(Entity.entity("{}", MediaType.APPLICATION_JSON)));
    }

    /* ------------------------------------------------------------------ regles */

    /** Regles bornees : une valeur absente ou hors bornes reprend la valeur par defaut. */
    static JSONObject normaliser(JSONObject s) {
        JSONObject r = new JSONObject();
        for (Object[] d : REGLES) {
            String k = (String) d[0];
            if (d[1] instanceof Boolean) {
                r.put(k, s != null && s.has(k) ? s.optBoolean(k, (Boolean) d[1]) : d[1]);
            } else {
                int v = s != null && s.has(k) ? s.optInt(k, Integer.MIN_VALUE) : Integer.MIN_VALUE;
                r.put(k, v >= (Integer) d[2] && v <= (Integer) d[3] ? v : d[1]);
            }
        }
        if (r.getInt("delaiMaxSec") < r.getInt("delaiMinSec")) {
            r.put("delaiMaxSec", r.getInt("delaiMinSec"));
        }
        if (r.getInt("pauseMaxMin") < r.getInt("pauseMinMin")) {
            r.put("pauseMaxMin", r.getInt("pauseMinMin"));
        }
        if (r.getInt("heureFin") <= r.getInt("heureDebut")) {
            r.put("heureDebut", 8).put("heureFin", 20);
        }
        return r;
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject regles() {
        List<Object> l = em.createNativeQuery("SELECT web_regles FROM whatsapp_compte WHERE mode = 'WEB'")
                .getResultList();
        JSONObject s = null;
        try {
            s = l.isEmpty() || l.get(0) == null ? null : new JSONObject(String.valueOf(l.get(0)));
        } catch (Exception e) {
            s = null;
        }
        return new JSONObject().put("success", true).put("regles", normaliser(s));
    }

    @Override
    public JSONObject enregistrerRegles(JSONObject saisie, TUser operateur) {
        JSONObject r = normaliser(saisie);
        em.createNativeQuery(
                "UPDATE whatsapp_compte SET web_regles = ?1, updated_at = NOW(), updated_by = ?2 WHERE mode = 'WEB'")
                .setParameter(1, r.toString()).setParameter(2, operateur == null ? null : operateur.getLgUSERID())
                .executeUpdate();
        JSONObject envoi = appeler((c, base, j) -> c.target(base + "/regles").request()
                .header("Authorization", "Bearer " + j).put(Entity.entity(r.toString(), MediaType.APPLICATION_JSON)));
        return new JSONObject().put("success", true).put("regles", r).put("transmises", envoi.optBoolean("success"))
                .put("message",
                        envoi.optBoolean("success") ? "Règles enregistrées et appliquées par le service."
                                : "Règles enregistrées ; elles seront transmises quand le service sera joignable ("
                                        + envoi.optString("message") + ")");
    }

    /* ------------------------------------------------------------------ modeles */

    private static String texte(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject modeles() {
        JSONArray data = new JSONArray();
        for (Object[] r : (List<Object[]>) em
                .createNativeQuery("SELECT id, nom, langue, categorie, entete, corps, pied,"
                        + " exemples, boutons, statut, meta_id, motif_rejet, DATE_FORMAT(soumis_le, '%d/%m/%Y %H:%i'),"
                        + " DATE_FORMAT(updated_at, '%d/%m/%Y %H:%i') FROM whatsapp_modele ORDER BY nom, langue")
                .getResultList()) {
            data.put(new JSONObject().put("id", r[0]).put("nom", r[1]).put("langue", r[2]).put("categorie", r[3])
                    .put("entete", StringUtils.defaultString(texte(r[4]))).put("corps", r[5])
                    .put("pied", StringUtils.defaultString(texte(r[6])))
                    .put("exemples", r[7] == null ? new JSONArray() : new JSONArray(texte(r[7])))
                    .put("boutons", r[8] == null ? new JSONArray() : new JSONArray(texte(r[8]))).put("statut", r[9])
                    .put("statutLibelle", ModeleWhatsApp.statutLisible(texte(r[9])))
                    .put("metaId", StringUtils.defaultString(texte(r[10])))
                    .put("motifRejet", StringUtils.defaultString(texte(r[11])))
                    .put("soumisLe", StringUtils.defaultString(texte(r[12]))).put("modifieLe", r[13]));
        }
        return new JSONObject().put("success", true).put("data", data);
    }

    static ModeleWhatsApp lire(JSONObject s) {
        ModeleWhatsApp m = new ModeleWhatsApp();
        m.nom = StringUtils.trimToNull(s.optString("nom", null));
        m.langue = StringUtils.defaultIfBlank(StringUtils.trimToNull(s.optString("langue", null)), "fr");
        m.categorie = StringUtils.upperCase(StringUtils.trimToNull(s.optString("categorie", null)));
        m.entete = StringUtils.trimToNull(s.optString("entete", null));
        m.corps = StringUtils.trimToNull(s.optString("corps", null));
        m.pied = StringUtils.trimToNull(s.optString("pied", null));
        JSONArray ex = s.optJSONArray("exemples");
        for (int i = 0; ex != null && i < ex.length(); i++) {
            m.exemples.add(ex.optString(i));
        }
        JSONArray b = s.optJSONArray("boutons");
        for (int i = 0; b != null && i < b.length(); i++) {
            JSONObject x = b.optJSONObject(i);
            if (x != null) {
                m.boutons.add(new String[] { StringUtils.upperCase(x.optString("type")), x.optString("texte"),
                        x.optString("valeur") });
            }
        }
        return m;
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject enregistrerModele(JSONObject s, TUser operateur) {
        ModeleWhatsApp m = lire(s);
        List<String> erreurs = m.erreurs();
        if (!erreurs.isEmpty()) {
            return echec(String.join("<br>", erreurs)).put("erreurs", new JSONArray(erreurs));
        }
        String id = StringUtils.trimToNull(s.optString("id", null));
        List<Object> doublon = em
                .createNativeQuery("SELECT id FROM whatsapp_modele WHERE nom = ?1 AND langue = ?2 AND id <> ?3")
                .setParameter(1, m.nom).setParameter(2, m.langue).setParameter(3, StringUtils.defaultString(id))
                .getResultList();
        if (!doublon.isEmpty()) {
            return echec("Un modèle « " + m.nom + " » existe déjà dans cette langue.");
        }
        JSONArray boutons = new JSONArray();
        for (String[] b : m.boutons) {
            boutons.put(new JSONObject().put("type", b[0]).put("texte", b[1]).put("valeur", b.length > 2 ? b[2] : ""));
        }
        if (id != null) {
            List<Object> st = em.createNativeQuery("SELECT statut FROM whatsapp_modele WHERE id = ?1")
                    .setParameter(1, id).getResultList();
            if (st.isEmpty()) {
                return echec("Modèle introuvable.");
            }
            if (!"BROUILLON".equals(st.get(0)) && !"REJECTED".equals(st.get(0))) {
                return echec("Un modèle soumis à Meta ne se modifie plus : créez-en une nouvelle version (autre nom).");
            }
        }
        boolean nouveau = id == null;
        if (nouveau) {
            id = UUID.randomUUID().toString();
            em.createNativeQuery(
                    "INSERT INTO whatsapp_modele (id, nom, langue, categorie, corps, created_at, updated_at)"
                            + " VALUES (?1, ?2, ?3, ?4, ?5, NOW(), NOW())")
                    .setParameter(1, id).setParameter(2, m.nom).setParameter(3, m.langue).setParameter(4, m.categorie)
                    .setParameter(5, m.corps).executeUpdate();
        }
        em.createNativeQuery(
                "UPDATE whatsapp_modele SET nom = ?1, langue = ?2, categorie = ?3, entete = ?4, corps = ?5,"
                        + " pied = ?6, exemples = ?7, boutons = ?8, statut = 'BROUILLON', motif_rejet = NULL, updated_at = NOW(),"
                        + " updated_by = ?9 WHERE id = ?10")
                .setParameter(1, m.nom).setParameter(2, m.langue).setParameter(3, m.categorie).setParameter(4, m.entete)
                .setParameter(5, m.corps).setParameter(6, m.pied).setParameter(7, new JSONArray(m.exemples).toString())
                .setParameter(8, boutons.toString()).setParameter(9, operateur == null ? null : operateur.getLgUSERID())
                .setParameter(10, id).executeUpdate();
        return new JSONObject().put("success", true).put("id", id).put("message",
                nouveau ? "Modèle enregistré (brouillon)." : "Modèle modifié (brouillon).");
    }

    @Override
    public JSONObject supprimerModele(String id) {
        int n = em.createNativeQuery("DELETE FROM whatsapp_modele WHERE id = ?1").setParameter(1, id).executeUpdate();
        return n > 0 ? new JSONObject().put("success", true) : echec("Modèle introuvable.");
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject soumettreModele(String id, TUser operateur) {
        List<Object[]> l = em
                .createNativeQuery("SELECT nom, langue, categorie, entete, corps, pied, exemples, boutons, statut"
                        + " FROM whatsapp_modele WHERE id = ?1")
                .setParameter(1, id).getResultList();
        if (l.isEmpty()) {
            return echec("Modèle introuvable.");
        }
        Object[] r = l.get(0);
        if (!"BROUILLON".equals(r[8]) && !"REJECTED".equals(r[8])) {
            return echec("Ce modèle a déjà été soumis à Meta.");
        }
        JSONObject s = new JSONObject().put("nom", r[0]).put("langue", r[1]).put("categorie", r[2])
                .put("entete", texte(r[3])).put("corps", r[4]).put("pied", texte(r[5]))
                .put("exemples", r[6] == null ? new JSONArray() : new JSONArray(texte(r[6])))
                .put("boutons", r[7] == null ? new JSONArray() : new JSONArray(texte(r[7])));
        ModeleWhatsApp m = lire(s);
        List<String> erreurs = m.erreurs();
        if (!erreurs.isEmpty()) {
            return echec(String.join("<br>", erreurs));
        }
        WhatsAppCompte c = compte(WhatsAppCompte.API);
        String metaId;
        String statut = "PENDING";
        if (c == null || c.modeTest) {
            metaId = "SIMULE-" + UUID.randomUUID().toString().substring(0, 8);
        } else {
            if (StringUtils.isAnyBlank(c.wabaId, c.accessToken)) {
                return echec(
                        "Compte API incomplet : identifiant WABA et jeton d'accès sont nécessaires pour soumettre.");
            }
            Client client = ClientBuilder.newBuilder().connectTimeout(10, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS).build();
            try {
                Response rep = client
                        .target(WhatsAppCloudApi.HOTE + "/"
                                + StringUtils.defaultIfBlank(c.apiVersion, WhatsAppCloudApi.VERSION_DEFAUT) + "/"
                                + c.wabaId.trim() + "/message_templates")
                        .request().header("Authorization", "Bearer " + c.accessToken.trim())
                        .post(Entity.entity(m.soumission().toString(), MediaType.APPLICATION_JSON));
                JSONObject o = new JSONObject(StringUtils.defaultIfBlank(rep.readEntity(String.class), "{}"));
                if (rep.getStatus() / 100 != 2) {
                    return echec("Meta refuse le modèle : " + WhatsAppCloudApi.erreur(o));
                }
                metaId = o.optString("id", null);
                statut = StringUtils.defaultIfBlank(o.optString("status", null), "PENDING").toUpperCase();
            } catch (Exception e) {
                return echec("Meta injoignable (" + e.getClass().getSimpleName() + ").");
            } finally {
                client.close();
            }
        }
        em.createNativeQuery(
                "UPDATE whatsapp_modele SET statut = ?1, meta_id = ?2, soumis_le = NOW(), motif_rejet = NULL,"
                        + " updated_at = NOW(), updated_by = ?3 WHERE id = ?4")
                .setParameter(1, statut).setParameter(2, metaId)
                .setParameter(3, operateur == null ? null : operateur.getLgUSERID()).setParameter(4, id)
                .executeUpdate();
        return new JSONObject().put("success", true).put("statut", statut).put("message",
                c == null || c.modeTest ? "Mode test : soumission simulée (aucun envoi à Meta)."
                        : "Modèle soumis à Meta : la validation prend de quelques minutes à 48 h.");
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject synchroniserModeles() {
        WhatsAppCompte c = compte(WhatsAppCompte.API);
        int maj = 0;
        if (c == null || c.modeTest) {
            /* mode test : Meta « approuve » les modeles en attente */
            maj = em.createNativeQuery(
                    "UPDATE whatsapp_modele SET statut = 'APPROVED', updated_at = NOW() WHERE statut = 'PENDING'")
                    .executeUpdate();
            return new JSONObject().put("success", true).put("misAJour", maj).put("message",
                    "Mode test : modèles en attente approuvés (simulation).");
        }
        if (StringUtils.isAnyBlank(c.wabaId, c.accessToken)) {
            return echec("Compte API incomplet : identifiant WABA et jeton d'accès sont nécessaires.");
        }
        Client client = ClientBuilder.newBuilder().connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS).build();
        try {
            Response rep = client
                    .target(WhatsAppCloudApi.HOTE + "/"
                            + StringUtils.defaultIfBlank(c.apiVersion, WhatsAppCloudApi.VERSION_DEFAUT) + "/"
                            + c.wabaId.trim() + "/message_templates")
                    .queryParam("fields", "name,language,status,rejected_reason,id").queryParam("limit", "200")
                    .request().header("Authorization", "Bearer " + c.accessToken.trim()).get();
            JSONObject o = new JSONObject(StringUtils.defaultIfBlank(rep.readEntity(String.class), "{}"));
            if (rep.getStatus() / 100 != 2) {
                return echec("Meta : " + WhatsAppCloudApi.erreur(o));
            }
            JSONArray d = o.optJSONArray("data");
            for (int i = 0; d != null && i < d.length(); i++) {
                JSONObject t = d.getJSONObject(i);
                String motif = t.optString("rejected_reason", "");
                maj += em
                        .createNativeQuery("UPDATE whatsapp_modele SET statut = ?1, meta_id = ?2, motif_rejet = ?3,"
                                + " updated_at = NOW() WHERE nom = ?4 AND langue = ?5 AND statut <> 'BROUILLON'")
                        .setParameter(1, t.optString("status").toUpperCase()).setParameter(2, t.optString("id"))
                        .setParameter(3,
                                "NONE".equalsIgnoreCase(motif) || motif.isEmpty() ? null : StringUtils.left(motif, 500))
                        .setParameter(4, t.optString("name")).setParameter(5, t.optString("language")).executeUpdate();
            }
            return new JSONObject().put("success", true).put("misAJour", maj);
        } catch (Exception e) {
            return echec("Meta injoignable (" + e.getClass().getSimpleName() + ").");
        } finally {
            client.close();
        }
    }
}
