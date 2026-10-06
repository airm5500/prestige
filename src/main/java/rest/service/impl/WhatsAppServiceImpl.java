package rest.service.impl;

import dal.Notification;
import dal.NotificationClient;
import dal.TClient;
import dal.TUser;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.Resource;
import javax.ejb.Asynchronous;
import javax.ejb.EJB;
import javax.ejb.SessionContext;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.SmsService;
import rest.service.WhatsAppService;
import util.TelephoneCi;
import util.whatsapp.WhatsAppCompte;
import util.whatsapp.WhatsAppEnvoi;
import util.whatsapp.WhatsAppWebhook;

/**
 * WhatsApp (plan d'octobre, section 4.2, lot L10). Les comptes et leurs secrets restent cote serveur ; le journal ne
 * garde ni le texte des messages ni les jetons ; les journaux du serveur ne citent que des identifiants et des statuts.
 */
@Stateless
public class WhatsAppServiceImpl implements WhatsAppService {

    private static final Logger LOG = Logger.getLogger(WhatsAppServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private SmsService smsService;

    @Resource
    private SessionContext contexte;

    /* ------------------------------------------------------------------ comptes */

    @SuppressWarnings("unchecked")
    WhatsAppCompte compte(String mode) {
        List<Object[]> r = em.createNativeQuery("SELECT mode, actif, mode_test, api_version, phone_number_id, waba_id,"
                + " access_token, verify_token, app_secret, modele_nom, modele_langue, web_url, web_jeton"
                + " FROM whatsapp_compte WHERE mode = ?1").setParameter(1, mode).getResultList();
        if (r.isEmpty()) {
            return null;
        }
        Object[] l = r.get(0);
        WhatsAppCompte c = new WhatsAppCompte();
        c.mode = (String) l[0];
        c.actif = vrai(l[1]);
        c.modeTest = vrai(l[2]);
        c.apiVersion = (String) l[3];
        c.phoneNumberId = (String) l[4];
        c.wabaId = (String) l[5];
        c.accessToken = (String) l[6];
        c.verifyToken = (String) l[7];
        c.appSecret = (String) l[8];
        c.modeleNom = (String) l[9];
        c.modeleLangue = (String) l[10];
        c.webUrl = (String) l[11];
        c.webJeton = (String) l[12];
        return c;
    }

    String modeDefaut() {
        String v = parametre(MODE_DEFAUT, WhatsAppCompte.API);
        return WhatsAppCompte.WEB.equalsIgnoreCase(StringUtils.trimToEmpty(v)) ? WhatsAppCompte.WEB
                : WhatsAppCompte.API;
    }

    @Override
    public JSONObject comptes() {
        JSONArray a = new JSONArray();
        for (String m : new String[] { WhatsAppCompte.API, WhatsAppCompte.WEB }) {
            WhatsAppCompte c = compte(m);
            if (c != null) {
                a.put(c.publique());
            }
        }
        return new JSONObject().put("success", true).put("modeDefaut", modeDefaut()).put("comptes", a);
    }

    @Override
    public JSONObject enregistrer(String mode, JSONObject s, TUser operateur) {
        String m = StringUtils.upperCase(StringUtils.trimToEmpty(mode));
        WhatsAppCompte c = compte(m);
        if (c == null) {
            return refus("Mode WhatsApp inconnu.");
        }
        JSONObject in = s == null ? new JSONObject() : s;
        c.actif = in.optBoolean("actif", c.actif);
        c.modeTest = in.optBoolean("modeTest", c.modeTest);
        c.apiVersion = texte(in, "apiVersion", c.apiVersion, 10);
        c.phoneNumberId = texte(in, "phoneNumberId", c.phoneNumberId, 40);
        c.wabaId = texte(in, "wabaId", c.wabaId, 40);
        c.modeleNom = texte(in, "modeleNom", c.modeleNom, 100);
        c.modeleLangue = texte(in, "modeleLangue", c.modeleLangue, 10);
        c.webUrl = texte(in, "webUrl", c.webUrl, 300);
        if (StringUtils.isNotBlank(c.webUrl) && !c.webUrl.matches("(?i)https?://.+")) {
            return refus("L'adresse du service WhatsApp Web doit commencer par http:// ou https://.");
        }
        /* secrets : ecriture seule ; vide = inchange */
        c.accessToken = secret(in, "accessToken", c.accessToken, 1000);
        c.verifyToken = secret(in, "verifyToken", c.verifyToken, 200);
        c.appSecret = secret(in, "appSecret", c.appSecret, 200);
        c.webJeton = secret(in, "webJeton", c.webJeton, 300);
        JSONArray effacer = in.optJSONArray("effacer");
        for (int i = 0; effacer != null && i < effacer.length(); i++) {
            switch (effacer.optString(i)) {
            case "accessToken":
                c.accessToken = null;
                break;
            case "verifyToken":
                c.verifyToken = null;
                break;
            case "appSecret":
                c.appSecret = null;
                break;
            case "webJeton":
                c.webJeton = null;
                break;
            default:
                break;
            }
        }
        if (c.actif && !c.modeTest && !c.pret()) {
            return refus(WhatsAppCompte.API.equals(m)
                    ? "Pour envoyer réellement : identifiant du numéro et jeton d'accès sont nécessaires."
                    : "Pour envoyer réellement : adresse et jeton du service WhatsApp Web sont nécessaires.");
        }
        em.createNativeQuery("UPDATE whatsapp_compte SET actif = ?1, mode_test = ?2, api_version = ?3,"
                + " phone_number_id = ?4, waba_id = ?5, access_token = ?6, verify_token = ?7, app_secret = ?8,"
                + " modele_nom = ?9, modele_langue = ?10, web_url = ?11, web_jeton = ?12, updated_at = NOW(),"
                + " updated_by = ?13 WHERE mode = ?14").setParameter(1, c.actif ? 1 : 0)
                .setParameter(2, c.modeTest ? 1 : 0).setParameter(3, c.apiVersion).setParameter(4, c.phoneNumberId)
                .setParameter(5, c.wabaId).setParameter(6, c.accessToken).setParameter(7, c.verifyToken)
                .setParameter(8, c.appSecret).setParameter(9, c.modeleNom).setParameter(10, c.modeleLangue)
                .setParameter(11, c.webUrl).setParameter(12, c.webJeton)
                .setParameter(13, operateur == null ? null : operateur.getLgUSERID()).setParameter(14, m)
                .executeUpdate();
        if (in.optBoolean("defaut", false)) {
            em.createNativeQuery("UPDATE t_parameters SET str_VALUE = ?1 WHERE str_KEY = ?2").setParameter(1, m)
                    .setParameter(2, MODE_DEFAUT).executeUpdate();
        }
        LOG.log(Level.INFO, "Compte WhatsApp {0} enregistre (actif={1}, test={2})",
                new Object[] { m, c.actif, c.modeTest });
        return comptes().put("message", "Compte WhatsApp " + m + " enregistré.");
    }

    /* ------------------------------------------------------------------ envoi */

    @Override
    public JSONObject tester(String numero, String texte, TUser operateur) {
        TelephoneCi.Resultat tel = TelephoneCi.controler(numero);
        if (!tel.isValide()) {
            return refus("Numéro invalide : " + tel.getMotif() + ".");
        }
        WhatsAppCompte c = compte(modeDefaut());
        WhatsAppEnvoi.Resultat r = WhatsAppEnvoi.envoyer(c, tel.getInternational(),
                StringUtils.defaultIfBlank(texte, "Message d'essai de la pharmacie."));
        journaliser(null, null, tel.getLocal(), c == null ? modeDefaut() : c.mode, r, false);
        LOG.log(Level.INFO, "Essai WhatsApp ({0}) : {1}",
                new Object[] { modeDefaut(), r.accepte ? "accepte" : "refuse" });
        return new JSONObject()
                .put("success", r.accepte).put("simule",
                        r.simule)
                .put("mode", modeDefaut())
                .put("message", r.accepte ? (r.simule ? "Message simulé (mode test) : aucun envoi réel."
                        : "Message accepté par WhatsApp.") : "Envoi refusé : " + r.erreur);
    }

    @Override
    public JSONObject envoyerNotification(String notificationId, boolean repliSms) {
        Notification n = em.find(Notification.class, notificationId);
        if (n == null) {
            return refus("Notification introuvable.");
        }
        WhatsAppCompte c = compte(modeDefaut());
        int envoyes = 0;
        List<NotificationClient> nonServis = new ArrayList<>();
        for (NotificationClient nc : n.getNotificationClients()) {
            TClient tc = nc.getClient();
            if (tc == null) {
                continue;
            }
            TelephoneCi.Resultat tel = TelephoneCi.controler(tc.getStrADRESSE());
            Boolean consent = consentWhatsApp(tc.getLgCLIENTID());
            WhatsAppEnvoi.Resultat r;
            if (Boolean.FALSE.equals(consent)) {
                r = WhatsAppEnvoi.Resultat.refuse("Le client a refusé WhatsApp");
            } else if (!tel.isValide()) {
                r = WhatsAppEnvoi.Resultat.refuse("Numéro invalide");
            } else {
                r = WhatsAppEnvoi.envoyer(c, tel.getInternational(), n.getMessage());
            }
            boolean repli = !r.accepte && repliSms && !Boolean.FALSE.equals(tc.getBoolCONSENTSMS());
            journaliser(n.getId(), tc.getLgCLIENTID(), tel.isValide() ? tel.getLocal() : null,
                    c == null ? modeDefaut() : c.mode, r, repli);
            if (r.accepte) {
                envoyes++;
            } else if (repli) {
                nonServis.add(nc);
            }
        }
        String repliId = null;
        if (!nonServis.isEmpty()) {
            Notification s = new Notification();
            s.setCategorieNotification(n.getCategorieNotification());
            s.setMessage(n.getMessage());
            s.setUser(n.getUser());
            s.entityRef(n.getEntityRef());
            for (NotificationClient nc : nonServis) {
                s.getNotificationClients().add(new NotificationClient(nc.getClient(), s));
            }
            em.persist(s);
            em.flush();
            repliId = s.getId();
        }
        LOG.log(Level.INFO, "WhatsApp notification {0} : {1} envoye(s), {2} en repli SMS",
                new Object[] { notificationId, envoyes, nonServis.size() });
        return new JSONObject().put("success", true).put("envoyes", envoyes).put("repli", nonServis.size())
                .put("repliNotificationId", repliId == null ? JSONObject.NULL : repliId);
    }

    @Override
    @Asynchronous
    public void envoyerNotificationAsync(String notificationId, boolean repliSms) {
        try {
            JSONObject r = contexte.getBusinessObject(WhatsAppService.class).envoyerNotification(notificationId,
                    repliSms);
            String repli = r.optString("repliNotificationId", null);
            if (StringUtils.isNotBlank(repli) && !"null".equals(repli)) {
                smsService.sendSMSById(repli);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Envoi WhatsApp de la notification " + notificationId, e);
        }
    }

    private void journaliser(String notificationId, String clientId, String telephone, String mode,
            WhatsAppEnvoi.Resultat r, boolean repli) {
        em.createNativeQuery("INSERT INTO whatsapp_message (id, notification_id, client_id, telephone, mode, simule,"
                + " statut, message_id, erreur, repli_sms, created_at, updated_at)"
                + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, NOW(), NOW())")
                .setParameter(1, UUID.randomUUID().toString()).setParameter(2, notificationId).setParameter(3, clientId)
                .setParameter(4, telephone).setParameter(5, mode).setParameter(6, r.simule ? 1 : 0)
                .setParameter(7, r.accepte ? (r.simule ? "SIMULE" : "ENVOYE") : "ECHEC").setParameter(8, r.messageId)
                .setParameter(9, r.erreur).setParameter(10, repli ? 1 : 0).executeUpdate();
    }

    /* ------------------------------------------------------------------ webhooks */

    @Override
    public String verifierWebhook(String mode, String jeton, String challenge) {
        WhatsAppCompte c = compte(WhatsAppCompte.API);
        return WhatsAppWebhook.verifierAbonnement(mode, jeton, challenge, c == null ? null : c.verifyToken);
    }

    @Override
    public boolean webhookMeta(String corpsBrut, String signature) {
        WhatsAppCompte c = compte(WhatsAppCompte.API);
        if (c == null || !WhatsAppWebhook.signatureValide(c.appSecret, corpsBrut, signature)) {
            LOG.log(Level.WARNING, "Webhook WhatsApp refuse : signature absente ou invalide");
            return false;
        }
        WhatsAppWebhook.Contenu contenu;
        try {
            contenu = WhatsAppWebhook.analyser(new JSONObject(corpsBrut));
        } catch (RuntimeException e) {
            return false;
        }
        appliquer(contenu);
        return true;
    }

    @Override
    public boolean webhookWeb(String corpsBrut, String jeton) {
        WhatsAppCompte c = compte(WhatsAppCompte.WEB);
        if (c == null || StringUtils.isBlank(c.webJeton) || jeton == null
                || !java.security.MessageDigest.isEqual(
                        c.webJeton.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8),
                        jeton.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
            LOG.log(Level.WARNING, "Webhook WhatsApp Web refuse : jeton absent ou invalide");
            return false;
        }
        try {
            JSONObject o = new JSONObject(corpsBrut);
            /* meme forme que Meta, plus simple : {statuts:[{id, statut, erreur}], entrants:[{numero, texte}]} */
            JSONObject meta = new JSONObject();
            JSONObject value = new JSONObject();
            JSONArray statuses = new JSONArray();
            JSONArray st = o.optJSONArray("statuts");
            for (int i = 0; st != null && i < st.length(); i++) {
                JSONObject s = st.getJSONObject(i);
                JSONObject x = new JSONObject().put("id", s.optString("id")).put("status", s.optString("statut"));
                if (StringUtils.isNotBlank(s.optString("erreur"))) {
                    x.put("errors",
                            new JSONArray().put(new JSONObject().put("code", "").put("title", s.optString("erreur"))));
                }
                statuses.put(x);
            }
            JSONArray messages = new JSONArray();
            JSONArray en = o.optJSONArray("entrants");
            for (int i = 0; en != null && i < en.length(); i++) {
                JSONObject e = en.getJSONObject(i);
                messages.put(new JSONObject().put("from", e.optString("numero")).put("text",
                        new JSONObject().put("body", e.optString("texte"))));
            }
            value.put("statuses", statuses).put("messages", messages);
            meta.put("entry", new JSONArray()
                    .put(new JSONObject().put("changes", new JSONArray().put(new JSONObject().put("value", value)))));
            appliquer(WhatsAppWebhook.analyser(meta));
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    private void appliquer(WhatsAppWebhook.Contenu contenu) {
        int statuts = 0;
        for (WhatsAppWebhook.Statut s : contenu.statuts) {
            String statut = statutJournal(s.statut);
            if (statut == null || StringUtils.isBlank(s.messageId)) {
                continue;
            }
            statuts += em
                    .createNativeQuery("UPDATE whatsapp_message SET statut = ?1, erreur = COALESCE(?2, erreur),"
                            + " updated_at = NOW() WHERE message_id = ?3")
                    .setParameter(1, statut).setParameter(2, s.erreur).setParameter(3, s.messageId).executeUpdate();
        }
        int desinscrits = 0;
        for (WhatsAppWebhook.Entrant e : contenu.entrants) {
            if (e.stop) {
                desinscrits += desinscrire(e.numero);
            }
        }
        LOG.log(Level.INFO, "Webhook WhatsApp : {0} statut(s), {1} desinscription(s)",
                new Object[] { statuts, desinscrits });
    }

    static String statutJournal(String statutMeta) {
        switch (StringUtils.defaultString(statutMeta).toLowerCase()) {
        case "sent":
            return "ENVOYE";
        case "delivered":
            return "DELIVRE";
        case "read":
            return "LU";
        case "failed":
            return "ECHEC";
        default:
            return null;
        }
    }

    /** « STOP » : le consentement WhatsApp de chaque client portant ce numero passe a 0. */
    @SuppressWarnings("unchecked")
    private int desinscrire(String numero) {
        TelephoneCi.Resultat tel = TelephoneCi.controler(numero);
        if (!tel.isValide()) {
            return 0;
        }
        /* les 8 derniers chiffres, separateurs de saisie ignores ; le controle complet tranche ensuite */
        List<Object[]> candidats = em
                .createNativeQuery("SELECT lg_CLIENT_ID, str_ADRESSE FROM t_client"
                        + " WHERE REPLACE(REPLACE(REPLACE(str_ADRESSE,' ',''),'.',''),'-','') LIKE ?1")
                .setParameter(1, "%" + tel.getLocal().substring(2)).getResultList();
        int n = 0;
        for (Object[] c : candidats) {
            TelephoneCi.Resultat t = TelephoneCi.controler((String) c[1]);
            if (t.isValide() && t.getLocal().equals(tel.getLocal())) {
                n += em.createNativeQuery("UPDATE t_client SET bool_CONSENT_WHATSAPP = 0, dt_UPDATED = NOW()"
                        + " WHERE lg_CLIENT_ID = ?1").setParameter(1, c[0]).executeUpdate();
            }
        }
        return n;
    }

    /* ------------------------------------------------------------------ journal */

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject journal(int limite) {
        List<Object[]> r = em.createNativeQuery("SELECT w.created_at, w.updated_at, w.mode, w.simule, w.statut,"
                + " w.erreur, w.repli_sms, w.telephone,"
                + " TRIM(CONCAT(COALESCE(c.str_FIRST_NAME,''),' ',COALESCE(c.str_LAST_NAME,''))), w.notification_id"
                + " FROM whatsapp_message w LEFT JOIN t_client c ON c.lg_CLIENT_ID = w.client_id"
                + " ORDER BY w.created_at DESC LIMIT " + Math.max(1, Math.min(500, limite))).getResultList();
        JSONArray a = new JSONArray();
        for (Object[] l : r) {
            a.put(new JSONObject().put("date", l[0] == null ? "" : String.valueOf(l[0]).substring(0, 19))
                    .put("maj", l[1] == null ? "" : String.valueOf(l[1]).substring(0, 19)).put("mode", l[2])
                    .put("simule", vrai(l[3])).put("statut", l[4])
                    .put("erreur", StringUtils.defaultString((String) l[5])).put("repliSms", vrai(l[6]))
                    .put("telephone", StringUtils.defaultString((String) l[7]))
                    .put("client", StringUtils.defaultString((String) l[8])).put("essai", l[9] == null));
        }
        return new JSONObject().put("success", true).put("total", a.length()).put("data", a);
    }

    /* ------------------------------------------------------------------ outils */

    @SuppressWarnings("unchecked")
    Boolean consentWhatsApp(String clientId) {
        List<Object> r = em.createNativeQuery("SELECT bool_CONSENT_WHATSAPP FROM t_client WHERE lg_CLIENT_ID = ?1")
                .setParameter(1, clientId).getResultList();
        return r.isEmpty() || r.get(0) == null ? null : vrai(r.get(0));
    }

    @SuppressWarnings("unchecked")
    private String parametre(String cle, String defaut) {
        List<Object> r = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                .setParameter(1, cle).getResultList();
        return r.isEmpty() || r.get(0) == null ? defaut : String.valueOf(r.get(0));
    }

    private static String texte(JSONObject in, String cle, String actuel, int max) {
        return in.has(cle) ? StringUtils.left(StringUtils.trimToNull(in.optString(cle, null)), max) : actuel;
    }

    private static String secret(JSONObject in, String cle, String actuel, int max) {
        String v = StringUtils.trimToNull(in.optString(cle, null));
        return v == null ? actuel : StringUtils.left(v, max);
    }

    private static JSONObject refus(String message) {
        return new JSONObject().put("success", false).put("message", message).put("msg", message);
    }

    private static boolean vrai(Object v) {
        return v instanceof Boolean ? (Boolean) v : v instanceof Number && ((Number) v).intValue() != 0;
    }
}
