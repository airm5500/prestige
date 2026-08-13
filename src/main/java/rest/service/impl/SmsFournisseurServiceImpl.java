package rest.service.impl;

import dal.SmsFournisseur;
import dal.enumeration.DlrMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.SmsAdminService;
import rest.service.SmsFournisseurService;
import util.sms.SmsProviderCatalog;
import util.sms.SmsProviderParamDef;

/**
 * Implémentation de la gestion des fournisseurs SMS.
 *
 * Règles : un seul fournisseur en vigueur à la fois ; le fournisseur en vigueur ne peut être ni désactivé ni supprimé ;
 * un fournisseur ayant déjà envoyé des SMS n'est que désactivable ; les paramètres secrets ne sortent jamais vers le
 * front (valeur vide + indicateur "définie") et une valeur vide entrante les laisse inchangés.
 *
 * @author koben
 */
@Stateless
public class SmsFournisseurServiceImpl implements SmsFournisseurService {

    private static final Logger LOG = Logger.getLogger(SmsFournisseurServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SmsAdminService smsAdminService;
    @EJB
    private SmsProviderFactory smsProviderFactory;

    @Override
    public JSONObject findAll() {
        try {
            List<SmsFournisseur> fournisseurs = em.createNamedQuery("SmsFournisseur.all", SmsFournisseur.class)
                    .getResultList();
            JSONArray data = new JSONArray();
            for (SmsFournisseur f : fournisseurs) {
                data.put(toJson(f));
            }
            return new JSONObject().put("success", true).put("total", fournisseurs.size()).put("data", data);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Echec chargement des fournisseurs SMS", e);
            return fail("Impossible de charger les fournisseurs SMS.");
        }
    }

    private JSONObject toJson(SmsFournisseur f) {
        JSONArray params = new JSONArray();
        for (SmsProviderParamDef def : SmsProviderCatalog.paramDefs(f.getCode())) {
            String valeur = f.getParamValue(def.getCle());
            params.put(new JSONObject().put("cle", def.getCle()).put("libelle", def.getLibelle())
                    .put("secret", def.isSecret()).put("obligatoire", def.isObligatoire())
                    .put("definie", StringUtils.isNotBlank(valeur))
                    .put("valeur", def.isSecret() ? "" : StringUtils.defaultString(valeur)));
        }
        return new JSONObject().put("id", f.getId()).put("code", f.getCode()).put("libelle", f.getLibelle())
                .put("actif", f.isActif()).put("enVigueur", f.isEnVigueur()).put("dlrMode", f.getDlrMode().name())
                .put("dlrCallbackUrl", StringUtils.defaultString(f.getDlrCallbackUrl()))
                .put("configComplete", isConfigComplete(f)).put("params", params);
    }

    /** Vrai si tous les paramètres obligatoires du fournisseur sont renseignés. */
    private boolean isConfigComplete(SmsFournisseur f) {
        for (SmsProviderParamDef def : SmsProviderCatalog.paramDefs(f.getCode())) {
            if (def.isObligatoire() && StringUtils.isBlank(f.getParamValue(def.getCle()))) {
                return false;
            }
        }
        return true;
    }

    @Override
    public JSONObject save(JSONObject payload) {
        try {
            // Toutes les validations sont faites AVANT de toucher l'entité : un refus ne doit
            // laisser aucune modification partielle sur un fournisseur existant (entité managée).
            String id = payload.optString("id", null);
            SmsFournisseur fournisseur;
            if (StringUtils.isNotBlank(id)) {
                fournisseur = em.find(SmsFournisseur.class, id);
                if (fournisseur == null) {
                    return fail("Fournisseur introuvable.");
                }
            } else {
                String code = StringUtils.upperCase(StringUtils.trimToEmpty(payload.optString("code")));
                if (StringUtils.isBlank(code)) {
                    return fail("Le code du fournisseur est obligatoire.");
                }
                if (findByCode(code) != null) {
                    return fail("Un fournisseur avec le code " + code + " existe déjà.");
                }
                fournisseur = new SmsFournisseur();
                fournisseur.setCode(code);
                fournisseur.setActif(false);
            }
            String libelle = StringUtils.trimToEmpty(payload.optString("libelle"));
            if (StringUtils.isBlank(libelle)) {
                return fail("Le libellé est obligatoire.");
            }
            DlrMode dlrMode;
            try {
                dlrMode = DlrMode.valueOf(payload.optString("dlrMode", DlrMode.POLLING.name()));
            } catch (IllegalArgumentException e) {
                return fail("Mode DLR invalide.");
            }
            JSONObject params = payload.optJSONObject("params");
            List<String> manquants = requiredParamsMissing(fournisseur, params);
            if (!manquants.isEmpty()) {
                return fail("Paramètres obligatoires manquants : " + String.join(", ", manquants) + ".");
            }
            fournisseur.setLibelle(libelle);
            fournisseur.setDlrMode(dlrMode);
            fournisseur.setDlrCallbackUrl(StringUtils.trimToNull(payload.optString("dlrCallbackUrl")));
            applyParams(fournisseur, params);
            fournisseur.setUpdatedAt(LocalDateTime.now());
            if (StringUtils.isBlank(id)) {
                em.persist(fournisseur);
            } else {
                em.merge(fournisseur);
            }
            return success("Fournisseur enregistré avec succès.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Echec enregistrement fournisseur SMS", e);
            return fail("L'enregistrement du fournisseur a échoué.");
        }
    }

    /**
     * Libellés des paramètres obligatoires qui resteraient vides après application du payload : valeur entrante non
     * vide, sinon valeur déjà enregistrée (pour un secret, vide signifie "inchangé" ; pour les autres, une valeur
     * envoyée vide efface).
     */
    private List<String> requiredParamsMissing(SmsFournisseur fournisseur, JSONObject params) {
        List<String> manquants = new java.util.ArrayList<>();
        for (SmsProviderParamDef def : SmsProviderCatalog.paramDefs(fournisseur.getCode())) {
            if (!def.isObligatoire()) {
                continue;
            }
            String incoming = params != null && params.has(def.getCle())
                    ? StringUtils.trimToEmpty(params.optString(def.getCle())) : null;
            String effective;
            if (StringUtils.isNotEmpty(incoming)) {
                effective = incoming;
            } else if (incoming != null && !def.isSecret()) {
                // champ non secret envoyé vide : l'utilisateur efface la valeur
                effective = "";
            } else {
                effective = fournisseur.getParamValue(def.getCle());
            }
            if (StringUtils.isBlank(effective)) {
                manquants.add(def.getLibelle());
            }
        }
        return manquants;
    }

    /** Applique les paramètres reçus ; une valeur vide sur un paramètre secret signifie "inchangé". */
    private void applyParams(SmsFournisseur fournisseur, JSONObject params) {
        if (params == null) {
            return;
        }
        for (String cle : params.keySet()) {
            String valeur = StringUtils.trimToEmpty(params.optString(cle));
            if (StringUtils.isEmpty(valeur) && SmsProviderCatalog.isSecret(fournisseur.getCode(), cle)) {
                continue;
            }
            fournisseur.setParamValue(cle, valeur);
        }
    }

    @Override
    public JSONObject toggle(String id) {
        SmsFournisseur fournisseur = em.find(SmsFournisseur.class, id);
        if (fournisseur == null) {
            return fail("Fournisseur introuvable.");
        }
        if (fournisseur.isActif() && fournisseur.isEnVigueur()) {
            return fail("Ce fournisseur est en vigueur pour les envois : basculez d'abord sur un autre fournisseur.");
        }
        fournisseur.setActif(!fournisseur.isActif());
        fournisseur.setUpdatedAt(LocalDateTime.now());
        em.merge(fournisseur);
        return success(fournisseur.isActif() ? "Fournisseur activé." : "Fournisseur désactivé.");
    }

    @Override
    public JSONObject definirEnVigueur(String id) {
        SmsFournisseur fournisseur = em.find(SmsFournisseur.class, id);
        if (fournisseur == null) {
            return fail("Fournisseur introuvable.");
        }
        if (!fournisseur.isActif()) {
            return fail("Activez d'abord ce fournisseur.");
        }
        if (!isConfigComplete(fournisseur)) {
            return fail("Configuration incomplète : renseignez tous les paramètres obligatoires.");
        }
        em.createQuery("UPDATE SmsFournisseur o SET o.enVigueur = false WHERE o.enVigueur = true AND o.id <> :id")
                .setParameter("id", id).executeUpdate();
        fournisseur.setEnVigueur(true);
        fournisseur.setUpdatedAt(LocalDateTime.now());
        em.merge(fournisseur);
        LOG.log(Level.INFO, "Fournisseur SMS en vigueur : {0}", fournisseur.getCode());
        return success("Les envois de SMS passent par " + fournisseur.getLibelle() + ".");
    }

    @Override
    public JSONObject delete(String id) {
        SmsFournisseur fournisseur = em.find(SmsFournisseur.class, id);
        if (fournisseur == null) {
            return fail("Fournisseur introuvable.");
        }
        if (fournisseur.isEnVigueur()) {
            return fail("Ce fournisseur est en vigueur pour les envois : il ne peut pas être supprimé.");
        }
        if (isUsed(fournisseur.getCode())) {
            return fail("Ce fournisseur a déjà envoyé des SMS : désactivez-le au lieu de le supprimer.");
        }
        em.remove(fournisseur);
        return success("Fournisseur supprimé.");
    }

    /**
     * Vrai si des envois ont déjà été faits via ce fournisseur. Les lignes historiques (fournisseur_code NULL mais
     * envoyées) datent d'avant le multi-fournisseur et appartiennent à Orange.
     */
    private boolean isUsed(String code) {
        try {
            Long count = em.createQuery(
                    "SELECT COUNT(o) FROM NotificationClient o WHERE o.fournisseurCode = :code"
                            + " OR (:code = 'ORANGE' AND o.fournisseurCode IS NULL AND o.sentAt IS NOT NULL)",
                    Long.class).setParameter("code", code).getSingleResult();
            return count != null && count > 0;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Echec verification d'utilisation du fournisseur " + code, e);
            return true;
        }
    }

    @Override
    public JSONObject tester(String id) {
        SmsFournisseur fournisseur = em.find(SmsFournisseur.class, id);
        if (fournisseur == null) {
            return fail("Fournisseur introuvable.");
        }
        if (SmsProviderCatalog.CODE_ORANGE.equals(fournisseur.getCode())) {
            JSONObject solde = smsAdminService.getBalanceSummary();
            boolean ok = solde.optBoolean("success", false);
            return new JSONObject().put("success", ok).put("data", solde).put("msg",
                    ok ? "Connexion Orange OK." : "Echec du test Orange : vérifiez les paramètres.");
        }
        util.sms.SmsProvider provider = smsProviderFactory.forFournisseur(fournisseur);
        if (provider == null) {
            return fail("Test non disponible pour ce fournisseur.");
        }
        JSONObject solde = provider.balance();
        boolean ok = solde.optBoolean("success", false);
        String detail = solde.has("totalUnits") ? " Solde : " + solde.opt("totalUnits") + " unité(s)." : "";
        String senderDetail = "";
        if (ok && provider instanceof util.sms.LeTextoSmsProvider) {
            senderDetail = describeSender((util.sms.LeTextoSmsProvider) provider, fournisseur);
        }
        return new JSONObject().put("success", ok).put("data", solde).put("msg",
                ok ? "Connexion " + fournisseur.getLibelle() + " OK." + detail + senderDetail
                        : solde.optString("msg", "Echec du test : vérifiez les paramètres."));
    }

    /** Vérifie l'autorisation du sender LeTexto : l'erreur LT400 vient d'un sender absent ou non validé. */
    private String describeSender(util.sms.LeTextoSmsProvider provider, SmsFournisseur fournisseur) {
        String senderName = fournisseur.getParamValue(SmsProviderCatalog.LETEXTO_SENDER_NAME);
        if (StringUtils.isBlank(senderName)) {
            return "";
        }
        JSONObject info = provider.senderInfo(senderName);
        if (!info.optBoolean("found", false)) {
            return " Sender \"" + senderName
                    + "\" : introuvable sur le compte — créez-le et faites-le valider avant d'envoyer.";
        }
        String status = info.optString("status", "");
        switch (status) {
        case "ACTIVE":
        case "VALIDATED":
        case "APPROVED":
            return " Sender \"" + senderName + "\" : autorisé.";
        case "PENDING":
            return " Sender \"" + senderName + "\" : en attente de validation — les envois échoueront (LT400)"
                    + " tant qu'il n'est pas approuvé.";
        default:
            return " Sender \"" + senderName + "\" : statut " + status + ".";
        }
    }

    @Override
    public SmsFournisseur getEnVigueur() {
        try {
            List<SmsFournisseur> list = em.createNamedQuery("SmsFournisseur.findEnVigueur", SmsFournisseur.class)
                    .setMaxResults(1).getResultList();
            return list.isEmpty() ? null : list.get(0);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Echec chargement du fournisseur SMS en vigueur", e);
            return null;
        }
    }

    @Override
    public SmsFournisseur findByCode(String code) {
        try {
            List<SmsFournisseur> list = em.createNamedQuery("SmsFournisseur.findByCode", SmsFournisseur.class)
                    .setParameter("code", code).setMaxResults(1).getResultList();
            return list.isEmpty() ? null : list.get(0);
        } catch (Exception e) {
            return null;
        }
    }

    private JSONObject success(String msg) {
        return new JSONObject().put("success", true).put("msg", msg);
    }

    private JSONObject fail(String msg) {
        return new JSONObject().put("success", false).put("msg", msg);
    }

}
