package rest.service.impl;

import commonTasks.dto.RappelHabitudeDTO;
import dal.CategorieNotification;
import dal.ModeleMessage;
import dal.Notification;
import dal.NotificationClient;
import dal.TClient;
import dal.TUser;
import dal.enumeration.TypeNotification;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.NotificationService;
import rest.service.RappelHabitudeService;
import util.MessageModele;
import util.TelephoneCi;

/**
 * Rappels aux patients chroniques par HABITUDE D'ACHAT (plan d'octobre, section 4.1, lot L10).
 *
 * <p>
 * Les achats des 12 derniers mois (ventes cloturees, non annulees, d'un client nomme) sont lus par client et par
 * produit ; {@link HabitudeAchat} decide si l'habitude est reguliere et quand tombe le prochain achat. Un produit dont
 * le prochain achat arrive d'ici N jours est inscrit dans t_rappel_habitude, une fois par cycle : c'est la liste « à
 * préparer » de l'equipe (piluliers) et la source des SMS. Les SMS passent par le module SMS existant (categorie
 * RAPPEL_HABITUDE), sans le modifier, apres le consentement et le controle du numero ; les medicaments ne sont cites
 * que si la fiche client le permet.
 */
@Stateless
public class RappelHabitudeServiceImpl implements RappelHabitudeService {

    private static final Logger LOG = Logger.getLogger(RappelHabitudeServiceImpl.class.getName());
    private static final DateTimeFormatter FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    static final String MODELE = "MODELE_HABITUDE";
    static final String TEXTE_DEFAUT = "Bonjour {client}, votre traitement {medicament} sera bientôt à renouveler "
            + "(vers le {date_prevue}). La pharmacie {officine} peut le préparer pour vous.";
    static final String PARAM_ACTIF = "KEY_RAPPEL_HABITUDE_ACTIF";
    static final String PARAM_JOURS = "KEY_RAPPEL_HABITUDE_JOURS";
    static final String PARAM_MIN_ACHATS = "KEY_RAPPEL_HABITUDE_MIN_ACHATS";
    static final String PARAM_ECART_MAX = "KEY_RAPPEL_HABITUDE_ECART_MAX";

    /** Achats par client et produit, jours distincts, sur la periode ; seulement les couples assez frequents. */
    private static final String ACHATS = "SELECT p.lg_CLIENT_ID AS client, d.lg_FAMILLE_ID AS famille,"
            + " GROUP_CONCAT(DISTINCT DATE(p.dt_UPDATED) ORDER BY DATE(p.dt_UPDATED) SEPARATOR ',') AS jours"
            + " FROM t_preenregistrement_detail d"
            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
            + " WHERE p.lg_CLIENT_ID IS NOT NULL AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
            + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2"
            + " GROUP BY p.lg_CLIENT_ID, d.lg_FAMILLE_ID HAVING COUNT(DISTINCT DATE(p.dt_UPDATED)) >= ?3";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private NotificationService notificationService;

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject actualiser(LocalDate jour) {
        LocalDate j = jour == null ? LocalDate.now() : jour;
        int joursAvant = entierParametre(PARAM_JOURS, 3);
        int minAchats = Math.max(2, entierParametre(PARAM_MIN_ACHATS, HabitudeAchat.MIN_ACHATS_DEFAUT));
        int ecartMax = entierParametre(PARAM_ECART_MAX, HabitudeAchat.ECART_MAX_DEFAUT);
        /* Le rachat d'un produit clot son cycle : la ligne sort de la liste. */
        int achetes = em
                .createNativeQuery("UPDATE t_rappel_habitude r SET r.str_STATUT = ?1, r.dt_TRAITE = NOW()"
                        + " WHERE r.str_STATUT IN (?2, ?3) AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d"
                        + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                        + " WHERE p.lg_CLIENT_ID = r.lg_CLIENT_ID AND d.lg_FAMILLE_ID = r.lg_FAMILLE_ID"
                        + " AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
                        + " AND p.dt_UPDATED >= r.dt_DERNIER_ACHAT + INTERVAL 1 DAY)")
                .setParameter(1, ACHETE).setParameter(2, A_PREPARER).setParameter(3, PREPARE).executeUpdate();
        em.createNativeQuery("SET SESSION group_concat_max_len = 65536").executeUpdate();
        List<Tuple> lignes = em.createNativeQuery(ACHATS, Tuple.class)
                .setParameter(1, java.sql.Date.valueOf(j.minusDays(365)))
                .setParameter(2, java.sql.Date.valueOf(j.plusDays(1))).setParameter(3, minAchats).getResultList();
        int habitudes = 0;
        int inscrits = 0;
        for (Tuple t : lignes) {
            List<LocalDate> jours = Arrays.stream(String.valueOf(t.get("jours")).split(",")).map(String::trim)
                    .filter(StringUtils::isNotBlank).map(LocalDate::parse).collect(Collectors.toList());
            HabitudeAchat.Resultat r = HabitudeAchat.analyser(jours, j, minAchats, ecartMax);
            if (!r.reguliere) {
                continue;
            }
            habitudes++;
            if (r.aRappeler(j, joursAvant)) {
                inscrits += em
                        .createNativeQuery("INSERT IGNORE INTO t_rappel_habitude (id, lg_CLIENT_ID, lg_FAMILLE_ID,"
                                + " dt_DERNIER_ACHAT, dt_PREVU, int_FREQUENCE, int_ACHATS, str_STATUT, dt_CREATED)"
                                + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NOW())")
                        .setParameter(1, UUID.randomUUID().toString()).setParameter(2, t.get("client"))
                        .setParameter(3, t.get("famille")).setParameter(4, java.sql.Date.valueOf(r.dernierAchat))
                        .setParameter(5, java.sql.Date.valueOf(r.prochainAchat)).setParameter(6, r.frequenceJours)
                        .setParameter(7, r.achats).setParameter(8, A_PREPARER).executeUpdate();
            }
        }
        return new JSONObject().put("success", true).put("inscrits", inscrits).put("achetes", achetes)
                .put("habitudes", habitudes).put("jour", j.toString());
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<RappelHabitudeDTO> liste(String statut, String recherche, LocalDate du, LocalDate au,
            String emplacementId) {
        StringBuilder sql = new StringBuilder("SELECT r.id, r.lg_CLIENT_ID AS clientId,"
                + " TRIM(CONCAT(COALESCE(c.str_FIRST_NAME,''),' ',COALESCE(c.str_LAST_NAME,''))) AS client,"
                + " c.str_ADRESSE AS telephone, c.bool_CONSENT_SMS AS consent, c.bool_MSG_MEDICAMENTS AS citer,"
                + " r.lg_FAMILLE_ID AS familleId, f.int_CIP AS cip, f.str_NAME AS produit,"
                + " (SELECT COALESCE(SUM(s.int_NUMBER_AVAILABLE),0) FROM t_famille_stock s"
                + " WHERE s.lg_FAMILLE_ID = r.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = ?1) AS stock,"
                + " r.dt_DERNIER_ACHAT AS dernier, r.dt_PREVU AS prevu, r.int_FREQUENCE AS frequence,"
                + " r.int_ACHATS AS achats, r.str_STATUT AS statut, r.dt_ENVOI AS envoi,"
                + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME,''),' ',COALESCE(u.str_LAST_NAME,''))) AS traitePar"
                + " FROM t_rappel_habitude r JOIN t_client c ON c.lg_CLIENT_ID = r.lg_CLIENT_ID"
                + " JOIN t_famille f ON f.lg_FAMILLE_ID = r.lg_FAMILLE_ID"
                + " LEFT JOIN t_user u ON u.lg_USER_ID = r.lg_USER_ID WHERE 1 = 1");
        List<Object> params = new ArrayList<>();
        params.add(StringUtils.defaultIfBlank(emplacementId, "1"));
        if (StringUtils.isBlank(statut)) {
            sql.append(" AND r.str_STATUT IN ('").append(A_PREPARER).append("','").append(PREPARE).append("')");
        } else if (!"TOUS".equalsIgnoreCase(statut)) {
            params.add(statut.trim().toUpperCase());
            sql.append(" AND r.str_STATUT = ?").append(params.size());
        }
        if (StringUtils.isNotBlank(recherche)) {
            params.add("%" + recherche.trim() + "%");
            int i = params.size();
            sql.append(" AND (CONCAT(COALESCE(c.str_FIRST_NAME,''),' ',COALESCE(c.str_LAST_NAME,'')) LIKE ?").append(i)
                    .append(" OR c.str_ADRESSE LIKE ?").append(i).append(" OR f.str_NAME LIKE ?").append(i)
                    .append(" OR f.int_CIP LIKE ?").append(i).append(")");
        }
        if (du != null) {
            params.add(java.sql.Date.valueOf(du));
            sql.append(" AND r.dt_PREVU >= ?").append(params.size());
        }
        if (au != null) {
            params.add(java.sql.Date.valueOf(au));
            sql.append(" AND r.dt_PREVU <= ?").append(params.size());
        }
        sql.append(" ORDER BY r.dt_PREVU, client, produit LIMIT 2000");
        Query q = em.createNativeQuery(sql.toString(), Tuple.class);
        for (int i = 0; i < params.size(); i++) {
            q.setParameter(i + 1, params.get(i));
        }
        List<RappelHabitudeDTO> sortie = new ArrayList<>();
        for (Tuple t : (List<Tuple>) q.getResultList()) {
            RappelHabitudeDTO d = new RappelHabitudeDTO();
            d.setId(t.get("id", String.class));
            d.setClientId(t.get("clientId", String.class));
            d.setClient(t.get("client", String.class));
            d.setTelephone(t.get("telephone", String.class));
            Object consent = t.get("consent");
            d.setConsentSms(consent == null ? null : vrai(consent));
            d.setMsgMedicaments(t.get("citer") == null || vrai(t.get("citer")));
            d.setFamilleId(t.get("familleId", String.class));
            d.setCip(t.get("cip", String.class));
            d.setProduit(t.get("produit", String.class));
            d.setStock(entier(t.get("stock")));
            d.setDernierAchat(date(t.get("dernier")));
            d.setPrevu(date(t.get("prevu")));
            d.setFrequence(entier(t.get("frequence")));
            d.setAchats(entier(t.get("achats")));
            d.setStatut(t.get("statut", String.class));
            Object envoi = t.get("envoi");
            d.setEnvoi(envoi instanceof Date ? (Date) envoi : null);
            d.setTraitePar(t.get("traitePar", String.class));
            sortie.add(d);
        }
        return sortie;
    }

    @Override
    public int aPreparer() {
        Object n = em.createNativeQuery("SELECT COUNT(*) FROM t_rappel_habitude WHERE str_STATUT = ?1")
                .setParameter(1, A_PREPARER).getSingleResult();
        return entier(n);
    }

    @Override
    public JSONObject marquer(List<String> ids, String statut, TUser operateur) {
        String s = statut == null ? "" : statut.trim().toUpperCase();
        if (!Arrays.asList(A_PREPARER, PREPARE, ECARTE).contains(s)) {
            return refus("Statut inconnu.");
        }
        if (ids == null || ids.isEmpty()) {
            return refus("Aucune ligne choisie.");
        }
        Query q = em
                .createNativeQuery("UPDATE t_rappel_habitude SET str_STATUT = ?1, lg_USER_ID = ?2, dt_TRAITE = ?3"
                        + " WHERE id IN (" + marques(4, ids.size()) + ")")
                .setParameter(1, s).setParameter(2, operateur == null ? null : operateur.getLgUSERID())
                .setParameter(3, A_PREPARER.equals(s) ? null : new Date());
        int n = lier(q, 4, ids).executeUpdate();
        return new JSONObject().put("success", true).put("modifies", n);
    }

    @Override
    public JSONObject preparerSms(List<String> ids, TUser operateur) {
        return preparerMessages(ids, operateur, "SMS");
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject preparerMessages(List<String> ids, TUser operateur, String canal) {
        return preparerMessages(ids, operateur, canal, null);
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject preparerMessages(List<String> ids, TUser operateur, String canal, String modeleId) {
        String c = StringUtils.defaultIfBlank(canal, "SMS").trim().toUpperCase();
        boolean whatsapp = c.contains("WHATSAPP");
        boolean sms = !"WHATSAPP".equals(c);
        JSONArray notifications = new JSONArray();
        JSONArray refus = new JSONArray();
        if (ids == null || ids.isEmpty()) {
            return refus("Aucune ligne choisie.");
        }
        String idModele = StringUtils.trimToNull(modeleId);
        String modele;
        if (idModele == null) {
            modele = modele();
        } else {
            ModeleMessage choisi = em.find(ModeleMessage.class, idModele);
            if (choisi == null || !choisi.isActif()) {
                return refus("Modèle de message introuvable ou désactivé.");
            }
            if ((sms && !choisi.convientAuCanal("SMS")) || (whatsapp && !choisi.convientAuCanal("WHATSAPP"))) {
                return refus("Le modèle « " + choisi.getLibelle() + " » n'est pas prévu pour ce canal.");
            }
            modele = choisi.getContenu();
        }
        List<Object[]> lignes = lier(em.createNativeQuery("SELECT r.id, r.lg_CLIENT_ID, f.str_NAME, r.dt_PREVU"
                + " FROM t_rappel_habitude r JOIN t_famille f ON f.lg_FAMILLE_ID = r.lg_FAMILLE_ID" + " WHERE r.id IN ("
                + marques(1, ids.size()) + ") ORDER BY r.lg_CLIENT_ID, r.dt_PREVU, f.str_NAME"), 1, ids)
                        .getResultList();
        Map<String, List<Object[]>> parClient = new LinkedHashMap<>();
        for (Object[] l : lignes) {
            parClient.computeIfAbsent((String) l[1], k -> new ArrayList<>()).add(l);
        }
        TUser auteur = operateur != null ? operateur : auteurParDefaut();
        String[] officine = officine();
        CategorieNotification categorie = notificationService.getOneByName(TypeNotification.RAPPEL_HABITUDE);
        for (Map.Entry<String, List<Object[]>> e : parClient.entrySet()) {
            TClient client = em.find(TClient.class, e.getKey());
            String nom = client == null ? "" : (StringUtils.defaultString(client.getStrFIRSTNAME()) + " "
                    + StringUtils.defaultString(client.getStrLASTNAME())).trim();
            String motif = null;
            TelephoneCi.Resultat tel = client == null ? null : TelephoneCi.controler(client.getStrADRESSE());
            if (client == null) {
                motif = "Client introuvable.";
            } else if (refuse(client, whatsapp, sms)) {
                motif = whatsapp && sms ? "Le client a refusé WhatsApp et les SMS."
                        : whatsapp ? "Le client a refusé WhatsApp." : "Le client a refusé les SMS.";
            } else if (!tel.isValide()) {
                motif = "Numéro de téléphone absent ou invalide.";
            } else if (auteur == null || categorie == null) {
                motif = "Rappel non configuré (utilisateur ou catégorie).";
            }
            if (motif != null) {
                refus.put(new JSONObject().put("client", nom).put("motif", motif));
                continue;
            }
            List<String> produits = e.getValue().stream().map(l -> (String) l[2]).distinct()
                    .collect(Collectors.toList());
            LocalDate prevu = date(e.getValue().get(0)[3]);
            String texte = message(modele, client.getStrFIRSTNAME(), client.getStrLASTNAME(), produits,
                    citerMedicaments(client.getLgCLIENTID()), officine[0], officine[1], prevu);
            Notification n = new Notification();
            n.setCategorieNotification(categorie);
            n.setMessage(texte);
            n.setUser(auteur);
            n.entityRef(client.getLgCLIENTID());
            n.getNotificationClients().add(new NotificationClient(client, n));
            em.persist(n);
            List<String> idsClient = e.getValue().stream().map(l -> (String) l[0]).collect(Collectors.toList());
            lier(em.createNativeQuery(
                    "UPDATE t_rappel_habitude SET lg_NOTIFICATION_ID = ?1, dt_ENVOI = ?2, str_CANAL = ?3, lg_MODELE = ?4"
                            + " WHERE id IN (" + marques(5, idsClient.size()) + ")")
                    .setParameter(1, n.getId()).setParameter(2, new Date()).setParameter(3, c)
                    .setParameter(4, idModele == null ? MODELE : idModele), 5, idsClient).executeUpdate();
            notifications.put(n.getId());
        }
        em.flush();
        String message = notifications.length() + (whatsapp ? " message(s) WhatsApp préparé(s)" : " SMS préparé(s)")
                + (refus.length() > 0 ? ", " + refus.length() + " client(s) non joignable(s)" : "") + ".";
        return new JSONObject().put("success", true).put("notifications", notifications)
                .put("envoyes", notifications.length()).put("refus", refus).put("message", message);
    }

    /** Refus du canal : SMS seul ou WhatsApp seul -> son consentement ; WhatsApp puis SMS -> les deux refuses. */
    private boolean refuse(TClient client, boolean whatsapp, boolean sms) {
        boolean refusSms = Boolean.FALSE.equals(client.getBoolCONSENTSMS());
        if (!whatsapp) {
            return refusSms;
        }
        boolean refusWhatsApp = Boolean.FALSE.equals(consentementWhatsApp(client.getLgCLIENTID()));
        return sms ? refusSms && refusWhatsApp : refusWhatsApp;
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<String> rappelsAutomatiques(LocalDate jour) {
        List<String> ids = new ArrayList<>();
        actualiser(jour);
        if (!"1".equals(parametre(PARAM_ACTIF, "0").trim())) {
            return ids;
        }
        List<String> lignes = em
                .createNativeQuery("SELECT id FROM t_rappel_habitude WHERE str_STATUT = ?1"
                        + " AND dt_ENVOI IS NULL AND lg_NOTIFICATION_ID IS NULL")
                .setParameter(1, A_PREPARER).getResultList();
        if (lignes.isEmpty()) {
            return ids;
        }
        JSONArray n = preparerSms(lignes, null).optJSONArray("notifications");
        for (int i = 0; n != null && i < n.length(); i++) {
            ids.add(n.getString(i));
        }
        return ids;
    }

    @Override
    @SuppressWarnings("unchecked")
    public boolean citerMedicaments(String clientId) {
        List<Object> r = em.createNativeQuery("SELECT bool_MSG_MEDICAMENTS FROM t_client WHERE lg_CLIENT_ID = ?1")
                .setParameter(1, clientId).getResultList();
        return r.isEmpty() || r.get(0) == null || vrai(r.get(0));
    }

    @Override
    public void enregistrerCiterMedicaments(String clientId, boolean citer) {
        em.createNativeQuery("UPDATE t_client SET bool_MSG_MEDICAMENTS = ?1 WHERE lg_CLIENT_ID = ?2")
                .setParameter(1, citer ? 1 : 0).setParameter(2, clientId).executeUpdate();
    }

    @Override
    @SuppressWarnings("unchecked")
    public Boolean consentementWhatsApp(String clientId) {
        List<Object> r = em.createNativeQuery("SELECT bool_CONSENT_WHATSAPP FROM t_client WHERE lg_CLIENT_ID = ?1")
                .setParameter(1, clientId).getResultList();
        return r.isEmpty() || r.get(0) == null ? null : vrai(r.get(0));
    }

    @Override
    public void enregistrerConsentementWhatsApp(String clientId, Boolean consent) {
        em.createNativeQuery("UPDATE t_client SET bool_CONSENT_WHATSAPP = ?1 WHERE lg_CLIENT_ID = ?2")
                .setParameter(1, consent == null ? null : consent ? 1 : 0).setParameter(2, clientId).executeUpdate();
    }

    /** Le texte du rappel : medicaments cites, ou message neutre si la fiche client le demande. */
    static String message(String modele, String nom, String prenom, List<String> produits, boolean citer,
            String officine, String telephoneOfficine, LocalDate prevu) {
        String m = StringUtils.isBlank(modele) ? TEXTE_DEFAUT : modele;
        String medicament = citer ? MessageTraitement.medicaments(produits, MessageTraitement.NEUTRE)
                : MessageTraitement.NEUTRE;
        Map<String, String> valeurs = MessageModele.valeurs(nom, prenom, medicament, officine, telephoneOfficine, "");
        valeurs.put("date_prevue", prevu == null ? "" : prevu.format(FR));
        return MessageModele.personnaliser(citer ? m : MessageTraitement.modeleNeutre(m), valeurs);
    }

    private String modele() {
        ModeleMessage m = em.find(ModeleMessage.class, MODELE);
        return m != null && m.isActif() ? m.getContenu() : TEXTE_DEFAUT;
    }

    /** Envoi automatique : rattache au compte admin (a defaut, au premier utilisateur actif). */
    @SuppressWarnings("unchecked")
    private TUser auteurParDefaut() {
        List<String> r = em
                .createNativeQuery("SELECT lg_USER_ID FROM t_user WHERE str_STATUT = 'enable'"
                        + " ORDER BY CASE WHEN str_LOGIN = 'admin' THEN 0 ELSE 1 END, dt_CREATED LIMIT 1")
                .getResultList();
        return r.isEmpty() ? null : em.find(TUser.class, r.get(0));
    }

    @SuppressWarnings("unchecked")
    private String[] officine() {
        try {
            List<Object[]> r = em.createNativeQuery("SELECT str_NOM_COMPLET, str_PHONE FROM t_officine LIMIT 1")
                    .getResultList();
            if (!r.isEmpty()) {
                return new String[] { StringUtils.defaultString((String) r.get(0)[0]),
                        StringUtils.defaultString((String) r.get(0)[1]) };
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "officine pour le rappel d'habitude", e);
        }
        return new String[] { "", "" };
    }

    @SuppressWarnings("unchecked")
    private String parametre(String cle, String defaut) {
        List<Object> r = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                .setParameter(1, cle).getResultList();
        return r.isEmpty() || r.get(0) == null ? defaut : String.valueOf(r.get(0));
    }

    private int entierParametre(String cle, int defaut) {
        try {
            return Integer.parseInt(parametre(cle, String.valueOf(defaut)).trim());
        } catch (NumberFormatException e) {
            return defaut;
        }
    }

    /** « ?debut, ?debut+1, ... » pour une liste de n valeurs. */
    private static String marques(int debut, int n) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            sb.append(i == 0 ? "" : ", ").append('?').append(debut + i);
        }
        return sb.toString();
    }

    private static Query lier(Query q, int debut, List<String> valeurs) {
        for (int i = 0; i < valeurs.size(); i++) {
            q.setParameter(debut + i, valeurs.get(i));
        }
        return q;
    }

    private static JSONObject refus(String message) {
        return new JSONObject().put("success", false).put("message", message);
    }

    private static LocalDate date(Object v) {
        if (v instanceof java.sql.Date) {
            return ((java.sql.Date) v).toLocalDate();
        }
        if (v instanceof Date) {
            return new java.sql.Date(((Date) v).getTime()).toLocalDate();
        }
        if (v instanceof LocalDate) {
            return (LocalDate) v;
        }
        return v == null ? null : LocalDate.parse(String.valueOf(v).substring(0, 10));
    }

    private static int entier(Object v) {
        return v instanceof Number ? ((Number) v).intValue() : 0;
    }

    private static boolean vrai(Object v) {
        return v instanceof Boolean ? (Boolean) v : v instanceof Number && ((Number) v).intValue() != 0;
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject analyse(LocalDate du, LocalDate au) {
        rest.service.impl.rappel.AnalyseRappels a = new rest.service.impl.rappel.AnalyseRappels();
        for (Object[] r : (List<Object[]>) em
                .createNativeQuery("SELECT DATE_FORMAT(dt_PREVU, '%Y-%m'), str_STATUT,"
                        + " dt_ENVOI IS NOT NULL, str_CANAL FROM t_rappel_habitude WHERE dt_PREVU BETWEEN ?1 AND ?2")
                .setParameter(1, java.sql.Date.valueOf(du)).setParameter(2, java.sql.Date.valueOf(au))
                .getResultList()) {
            a.ajouter(String.valueOf(r[0]), (String) r[1], vrai(r[2]), (String) r[3]);
        }
        return a.json().put("success", true).put("debut", du.toString()).put("fin", au.toString());
    }

    @Override
    public String nomOfficine() {
        return officine()[0];
    }
}
