package rest.service.impl.campagne;

import dal.CategorieNotification;
import dal.ModeleMessage;
import dal.Notification;
import dal.NotificationClient;
import dal.TClient;
import dal.TUser;
import dal.enumeration.TypeNotification;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.NotificationService;
import rest.service.impl.campagne.Campagnes.Categorie;
import util.MessageModele;
import util.TelephoneCi;

/**
 * CAMPAGNES SMS / WHATSAPP (besoins du 11/10, lot 4). Population visee, apercu, envoi par la file de notifications
 * existante (categorie CAMPAGNE, canal SMS), propositions automatiques (anniversaires et fetes du jour) a valider,
 * calendrier des fetes, journal. Le texte des messages n'est conserve que dans la file d'envoi (comme les rappels) :
 * les tables des campagnes ne gardent que le modele, le canal et les destinataires.
 * <p>
 * Les lectures sont hors transaction ; les ecritures ont chacune la leur.
 */
@Stateless
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
public class CampagneService {

    public static final String PARAM_AUTO = "KEY_CAMPAGNE_AUTO_ACTIF";
    public static final String[] PARAMETRES = { PARAM_AUTO, "KEY_CAMPAGNE_AUTO_ANNIV", "KEY_CAMPAGNE_AUTO_FETE",
            "KEY_CAMPAGNE_AUTO_CANAL", "KEY_CAMPAGNE_MODELE_ANNIV", "KEY_CAMPAGNE_MODELE_FETE" };
    static final int MAX_CIBLES = 5000;
    static final int JOURS_VALIDITE_PROPOSITION = 7;
    private static final DateTimeFormatter JJ = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private NotificationService notificationService;

    /* ============================================================================================ filtres */

    /** Criteres de la population visee. */
    public static final class Filtres {
        public Categorie categorie;
        public LocalDate jour = LocalDate.now();
        public String sexe, recherche, feteCode;
        public Integer ageMin, ageMax, moisAchat;
        public List<String> clientIds;
        public String canal = "SMS";
        public boolean accordExplicite;

        public static Filtres depuis(JSONObject o) {
            Filtres f = new Filtres();
            f.categorie = Categorie.de(o.optString("categorie"));
            String j = StringUtils.trimToNull(o.optString("jour", null));
            if (j != null) {
                try {
                    f.jour = LocalDate.parse(j.substring(0, Math.min(10, j.length())));
                } catch (RuntimeException e) {
                    f.jour = LocalDate.now();
                }
            }
            String s = StringUtils.trimToEmpty(o.optString("sexe")).toUpperCase(java.util.Locale.ROOT);
            f.sexe = "M".equals(s) || "F".equals(s) ? s : null;
            f.recherche = StringUtils.left(StringUtils.trimToNull(o.optString("recherche", null)), 60);
            f.feteCode = StringUtils.left(StringUtils.trimToNull(o.optString("fete", null)), 30);
            f.ageMin = entier(o, "ageMin", 0, 130);
            f.ageMax = entier(o, "ageMax", 0, 130);
            f.moisAchat = entier(o, "moisAchat", 1, 120);
            JSONArray ids = o.optJSONArray("clientIds");
            if (ids != null) {
                f.clientIds = new ArrayList<>();
                for (int i = 0; i < ids.length() && i < MAX_CIBLES; i++) {
                    String id = StringUtils.left(StringUtils.trimToNull(ids.optString(i, null)), 40);
                    if (id != null) {
                        f.clientIds.add(id);
                    }
                }
            }
            f.canal = Campagnes.canal(o.optString("canal"));
            f.accordExplicite = o.optBoolean("accordExplicite", false);
            return f;
        }

        private static Integer entier(JSONObject o, String cle, int min, int max) {
            if (!o.has(cle) || o.isNull(cle) || StringUtils.isBlank(o.optString(cle))) {
                return null;
            }
            int v = o.optInt(cle, -1);
            return v < min || v > max ? null : v;
        }
    }

    /** Un destinataire possible. */
    public static final class Cible {
        public String clientId, nom, prenom, telephone, motif;
        public LocalDate naissance;
        public Integer age;

        public String nomComplet() {
            return (StringUtils.defaultString(nom) + " " + StringUtils.defaultString(prenom)).trim();
        }

        public JSONObject json() {
            return new JSONObject().put("clientId", clientId).put("client", nomComplet())
                    .put("telephone", StringUtils.defaultString(telephone)).put("age", age == null ? "" : age)
                    .put("joignable", motif == null).put("motif", StringUtils.defaultString(motif));
        }
    }

    /* ============================================================================================ lectures */

    private static Boolean bool(Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof Boolean) {
            return (Boolean) o;
        }
        if (o instanceof Number) {
            return ((Number) o).intValue() != 0;
        }
        if (o instanceof byte[]) {
            byte[] b = (byte[]) o;
            return b.length > 0 && b[0] != 0;
        }
        String s = o.toString().trim();
        return "1".equals(s) || "true".equalsIgnoreCase(s);
    }

    private static LocalDate date(Object o) {
        if (o instanceof java.sql.Timestamp) {
            return ((java.sql.Timestamp) o).toLocalDateTime().toLocalDate();
        }
        if (o instanceof java.sql.Date) {
            return ((java.sql.Date) o).toLocalDate();
        }
        if (o instanceof java.util.Date) {
            return new java.sql.Date(((java.util.Date) o).getTime()).toLocalDate();
        }
        if (o instanceof java.time.LocalDateTime) {
            return ((java.time.LocalDateTime) o).toLocalDate();
        }
        if (o instanceof LocalDate) {
            return (LocalDate) o;
        }
        return null;
    }

    private static String texte(Object o) {
        return o == null ? "" : o.toString().trim();
    }

    private static void lier(Query q, List<Object> p) {
        for (int i = 0; i < p.size(); i++) {
            q.setParameter(i + 1, p.get(i));
        }
    }

    /** Population visee, avec pour chacun le motif d'exclusion eventuel (consentement, numero). */
    @SuppressWarnings("unchecked")
    public List<Cible> population(Filtres f) {
        StringBuilder sql = new StringBuilder("SELECT c.lg_CLIENT_ID AS id, c.str_FIRST_NAME AS prenom,"
                + " c.str_LAST_NAME AS nom, c.str_ADRESSE AS tel, c.dt_NAISSANCE AS naissance,"
                + " c.bool_CONSENT_SMS AS csms, c.bool_CONSENT_WHATSAPP AS cwa FROM t_client c"
                + " WHERE c.str_STATUT = 'enable'");
        List<Object> p = new ArrayList<>();
        if (f.categorie == Categorie.ANNIVERSAIRE) {
            LocalDate j = f.jour;
            boolean veille29 = j.getMonthValue() == 2 && j.getDayOfMonth() == 28 && !j.isLeapYear();
            sql.append(" AND c.dt_NAISSANCE IS NOT NULL AND MONTH(c.dt_NAISSANCE) = ?").append(p.size() + 1);
            p.add(j.getMonthValue());
            sql.append(" AND DAY(c.dt_NAISSANCE) IN (?").append(p.size() + 1).append(", ?").append(p.size() + 2)
                    .append(")");
            p.add(j.getDayOfMonth());
            p.add(veille29 ? 29 : j.getDayOfMonth());
        }
        if (f.sexe != null) {
            sql.append(" AND UPPER(LEFT(COALESCE(c.str_SEXE, ''), 1)) = ?").append(p.size() + 1);
            p.add(f.sexe);
        }
        if (f.recherche != null) {
            sql.append(" AND (CONCAT(COALESCE(c.str_FIRST_NAME,''),' ',COALESCE(c.str_LAST_NAME,'')) LIKE ?")
                    .append(p.size() + 1)
                    .append(" OR CONCAT(COALESCE(c.str_LAST_NAME,''),' ',COALESCE(c.str_FIRST_NAME,'')) LIKE ?")
                    .append(p.size() + 1).append(" OR c.str_ADRESSE LIKE ?").append(p.size() + 1).append(")");
            p.add("%" + f.recherche.replace("%", "").replace("_", "") + "%");
        }
        if (f.moisAchat != null) {
            sql.append(" AND EXISTS (SELECT 1 FROM t_preenregistrement v WHERE v.lg_CLIENT_ID = c.lg_CLIENT_ID")
                    .append(" AND v.str_STATUT = 'is_Closed' AND v.b_IS_CANCEL = 0 AND v.int_PRICE > 0")
                    .append(" AND v.dt_UPDATED >= ?").append(p.size() + 1).append(")");
            p.add(Timestamp.valueOf(f.jour.minusMonths(f.moisAchat).atStartOfDay()));
        }
        if (f.clientIds != null) {
            if (f.clientIds.isEmpty()) {
                return new ArrayList<>();
            }
            sql.append(" AND c.lg_CLIENT_ID IN (");
            for (int i = 0; i < f.clientIds.size(); i++) {
                sql.append(i == 0 ? "?" : ", ?").append(p.size() + 1);
                p.add(f.clientIds.get(i));
            }
            sql.append(")");
        }
        sql.append(" ORDER BY c.str_FIRST_NAME, c.str_LAST_NAME LIMIT ").append(MAX_CIBLES);
        Query q = em.createNativeQuery(sql.toString());
        lier(q, p);
        List<Cible> l = new ArrayList<>();
        for (Object[] r : (List<Object[]>) q.getResultList()) {
            Cible c = new Cible();
            c.clientId = texte(r[0]);
            /* convention des fiches clients : str_FIRST_NAME = nom de famille, str_LAST_NAME = prenom(s) */
            c.nom = texte(r[1]);
            c.prenom = texte(r[2]);
            c.naissance = date(r[4]);
            c.age = Campagnes.age(c.naissance, f.jour);
            if (f.categorie == Categorie.ANNIVERSAIRE && !Campagnes.anniversaire(c.naissance, f.jour)) {
                continue;
            }
            if ((f.ageMin != null && (c.age == null || c.age < f.ageMin))
                    || (f.ageMax != null && (c.age == null || c.age > f.ageMax))) {
                continue;
            }
            TelephoneCi.Resultat tel = TelephoneCi.controler(texte(r[3]));
            c.telephone = tel.isValide() ? tel.getLocal() : texte(r[3]);
            c.motif = Campagnes.motifExclusion(f.canal, bool(r[5]), bool(r[6]), f.accordExplicite, tel.isValide());
            l.add(c);
        }
        return l;
    }

    /** Nom et telephone de l'officine. */
    @SuppressWarnings("unchecked")
    public String[] officine() {
        List<Object[]> r = em.createNativeQuery("SELECT str_NOM_COMPLET, str_PHONE FROM t_officine LIMIT 1")
                .getResultList();
        return r.isEmpty() ? new String[] { "", "" } : new String[] { texte(r.get(0)[0]), texte(r.get(0)[1]) };
    }

    /** Contenu d'un modele actif convenant au canal ; IllegalArgumentException sinon. */
    public String contenuModele(String modeleId, String canal) {
        ModeleMessage m = StringUtils.isBlank(modeleId) ? null : em.find(ModeleMessage.class, modeleId.trim());
        if (m == null || !m.isActif()) {
            throw new IllegalArgumentException("Modèle de message introuvable ou désactivé.");
        }
        String c = Campagnes.canal(canal);
        if ((!"WHATSAPP".equals(c) && !m.convientAuCanal("SMS"))
                || (!"SMS".equals(c) && !m.convientAuCanal("WHATSAPP"))) {
            throw new IllegalArgumentException("Le modèle « " + m.getLibelle() + " » n'est pas prévu pour ce canal.");
        }
        return m.getContenu();
    }

    /** Message d'un destinataire : variables habituelles, plus {fete} et {age}. */
    public static String message(String modele, Cible c, String[] officine, String fete) {
        Map<String, String> v = MessageModele.valeurs(c.nom, c.prenom, "", officine[0], officine[1], "");
        v.put("fete", StringUtils.defaultString(fete));
        v.put("age", c.age == null ? "" : String.valueOf(c.age));
        return MessageModele.personnaliser(modele, v);
    }

    /* ============================================================================================ fetes */

    @SuppressWarnings("unchecked")
    private Map<String, Map<Integer, LocalDate>> datesSaisies() {
        Map<String, Map<Integer, LocalDate>> m = new HashMap<>();
        for (Object[] r : (List<Object[]>) em
                .createNativeQuery("SELECT code AS code, annee AS annee, date_fete AS jour FROM t_fete_date")
                .getResultList()) {
            m.computeIfAbsent(texte(r[0]), k -> new HashMap<>()).put(((Number) r[1]).intValue(), date(r[2]));
        }
        return m;
    }

    /** Calendrier des fetes d'une annee : date (ou « a saisir »), type, regle, actif. */
    @SuppressWarnings("unchecked")
    public JSONArray fetes(int annee) {
        Map<String, Map<Integer, LocalDate>> saisies = datesSaisies();
        JSONArray a = new JSONArray();
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT code AS code, libelle AS libelle, type AS type,"
                + " regle AS regle, mois AS mois, jour AS jour, decalage AS decalage, actif AS actif FROM t_fete"
                + " ORDER BY ordre, code").getResultList()) {
            String code = texte(r[0]);
            LocalDate d = Campagnes.dateFete(texte(r[3]), r[4] == null ? null : ((Number) r[4]).intValue(),
                    r[5] == null ? null : ((Number) r[5]).intValue(), r[6] == null ? 0 : ((Number) r[6]).intValue(),
                    annee, saisies.get(code));
            a.put(new JSONObject().put("code", code).put("libelle", texte(r[1])).put("type", texte(r[2]))
                    .put("regle", texte(r[3])).put("date", d == null ? "" : d.toString())
                    .put("actif", Boolean.TRUE.equals(bool(r[7]))));
        }
        return a;
    }

    /** Libelle de la fete, ou null si elle est inconnue. */
    @SuppressWarnings("unchecked")
    public String libelleFete(String code) {
        List<Object> r = em.createNativeQuery("SELECT libelle FROM t_fete WHERE code = ?1").setParameter(1, code)
                .getResultList();
        return r.isEmpty() ? null : texte(r.get(0));
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public void saisirDateFete(String code, int annee, LocalDate jour, String userId) {
        if (libelleFete(code) == null) {
            throw new IllegalArgumentException("Fête inconnue.");
        }
        if (annee < 2000 || annee > 2100 || (jour != null && jour.getYear() != annee)) {
            throw new IllegalArgumentException("La date doit être dans l'année " + annee + ".");
        }
        if (jour == null) {
            em.createNativeQuery("DELETE FROM t_fete_date WHERE code = ?1 AND annee = ?2").setParameter(1, code)
                    .setParameter(2, annee).executeUpdate();
            return;
        }
        em.createNativeQuery("INSERT INTO t_fete_date (code, annee, date_fete, updated_at, lg_USER_ID)"
                + " VALUES (?1, ?2, ?3, NOW(), ?4) ON DUPLICATE KEY UPDATE date_fete = VALUES(date_fete),"
                + " updated_at = NOW(), lg_USER_ID = VALUES(lg_USER_ID)").setParameter(1, code).setParameter(2, annee)
                .setParameter(3, java.sql.Date.valueOf(jour)).setParameter(4, userId).executeUpdate();
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public void activerFete(String code, boolean actif, String userId) {
        int n = em
                .createNativeQuery("UPDATE t_fete SET actif = ?1, updated_at = NOW(), lg_USER_ID = ?2 WHERE code = ?3")
                .setParameter(1, actif).setParameter(2, userId).setParameter(3, code).executeUpdate();
        if (n == 0) {
            throw new IllegalArgumentException("Fête inconnue.");
        }
    }

    /* ============================================================================================ parametres */

    @SuppressWarnings("unchecked")
    public String parametre(String cle, String defaut) {
        List<Object> r = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                .setParameter(1, cle).getResultList();
        return r.isEmpty() || r.get(0) == null ? defaut : r.get(0).toString().trim();
    }

    public JSONObject parametres() {
        JSONObject o = new JSONObject();
        o.put("auto", "1".equals(parametre(PARAM_AUTO, "0")));
        o.put("anniversaires", "1".equals(parametre("KEY_CAMPAGNE_AUTO_ANNIV", "1")));
        o.put("fetes", "1".equals(parametre("KEY_CAMPAGNE_AUTO_FETE", "1")));
        o.put("canal", Campagnes.canal(parametre("KEY_CAMPAGNE_AUTO_CANAL", "SMS")));
        o.put("modeleAnniversaire", parametre("KEY_CAMPAGNE_MODELE_ANNIV", "MODELE_ANNIVERSAIRE"));
        o.put("modeleFete", parametre("KEY_CAMPAGNE_MODELE_FETE", "MODELE_FETE"));
        return o;
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public void enregistrerParametres(JSONObject o) {
        Map<String, String> v = new LinkedHashMap<>();
        if (o.has("auto")) {
            v.put(PARAM_AUTO, o.optBoolean("auto") ? "1" : "0");
        }
        if (o.has("anniversaires")) {
            v.put("KEY_CAMPAGNE_AUTO_ANNIV", o.optBoolean("anniversaires") ? "1" : "0");
        }
        if (o.has("fetes")) {
            v.put("KEY_CAMPAGNE_AUTO_FETE", o.optBoolean("fetes") ? "1" : "0");
        }
        if (o.has("canal")) {
            v.put("KEY_CAMPAGNE_AUTO_CANAL", Campagnes.canal(o.optString("canal")));
        }
        for (String[] k : new String[][] { { "modeleAnniversaire", "KEY_CAMPAGNE_MODELE_ANNIV" },
                { "modeleFete", "KEY_CAMPAGNE_MODELE_FETE" } }) {
            if (o.has(k[0])) {
                String id = StringUtils.trimToEmpty(o.optString(k[0]));
                if (em.find(ModeleMessage.class, id) == null) {
                    throw new IllegalArgumentException("Modèle de message introuvable.");
                }
                v.put(k[1], id);
            }
        }
        for (Map.Entry<String, String> e : v.entrySet()) {
            em.createNativeQuery("UPDATE t_parameters SET str_VALUE = ?1, dt_UPDATED = NOW() WHERE str_KEY = ?2")
                    .setParameter(1, e.getValue()).setParameter(2, e.getKey()).executeUpdate();
        }
    }

    /* ============================================================================================ envois */

    private TUser utilisateur(String userId) {
        return userId == null ? null : em.find(TUser.class, userId);
    }

    /** Une notification (file d'envoi) pour un destinataire ; renvoie son identifiant. */
    private String notification(CategorieNotification categorie, TUser auteur, Cible c, String texte) {
        TClient client = em.find(TClient.class, c.clientId);
        Notification n = new Notification();
        n.setCategorieNotification(categorie);
        n.setMessage(texte);
        n.setUser(auteur);
        n.entityRef(c.clientId);
        n.getNotificationClients().add(new NotificationClient(client, n));
        em.persist(n);
        return n.getId();
    }

    private String creerCampagne(Categorie categorie, String origine, String statut, LocalDate jour, String fete,
            String canal, String modeleId, boolean accord, String userId) {
        String id = UUID.randomUUID().toString();
        em.createNativeQuery("INSERT INTO t_campagne (id, categorie, origine, statut, date_cible, fete_code, canal,"
                + " lg_MODELE, accord_explicite, created_at, lg_USER_ID) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9,"
                + " NOW(), ?10)").setParameter(1, id).setParameter(2, categorie.name()).setParameter(3, origine)
                .setParameter(4, statut).setParameter(5, jour == null ? null : java.sql.Date.valueOf(jour))
                .setParameter(6, fete).setParameter(7, canal).setParameter(8, modeleId).setParameter(9, accord)
                .setParameter(10, userId).executeUpdate();
        return id;
    }

    private void ligne(String campagneId, String clientId, String statut, String motif, String notificationId) {
        em.createNativeQuery("INSERT INTO t_campagne_ligne (campagne_id, lg_CLIENT_ID, retenu, statut, motif,"
                + " lg_NOTIFICATION_ID) VALUES (?1, ?2, ?3, ?4, ?5, ?6)").setParameter(1, campagneId)
                .setParameter(2, clientId).setParameter(3, !"DECOCHE".equals(statut)).setParameter(4, statut)
                .setParameter(5, StringUtils.left(motif, 120)).setParameter(6, notificationId).executeUpdate();
    }

    private void totaux(String campagneId) {
        em.createNativeQuery("UPDATE t_campagne c SET"
                + " nb_cibles = (SELECT COUNT(*) FROM t_campagne_ligne l WHERE l.campagne_id = c.id),"
                + " nb_envoyes = (SELECT COUNT(*) FROM t_campagne_ligne l WHERE l.campagne_id = c.id AND l.statut = 'PREPARE'),"
                + " nb_exclus = (SELECT COUNT(*) FROM t_campagne_ligne l WHERE l.campagne_id = c.id AND l.statut <> 'PREPARE')"
                + " WHERE c.id = ?1").setParameter(1, campagneId).executeUpdate();
    }

    /**
     * Envoi immediat (campagne manuelle) aux clients coches : la population est relue ici (consentement et numero
     * controles au moment de l'envoi), les autres sont ecartes avec leur motif. Renvoie les notifications a expedier.
     *
     * @param texteLibre
     *            message saisi (categorie Personnalise ou modele modifie) ; sinon le modele
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public JSONObject envoyer(Filtres f, String modeleId, String texteLibre, String userId) {
        if (f.categorie == null) {
            throw new IllegalArgumentException("Catégorie de campagne inconnue.");
        }
        if (f.clientIds == null || f.clientIds.isEmpty()) {
            throw new IllegalArgumentException("Aucun destinataire coché.");
        }
        String modele = StringUtils.isNotBlank(texteLibre) ? texteLibre.trim() : contenuModele(modeleId, f.canal);
        String motif = Campagnes.controlerTexte(modele);
        if (motif != null) {
            throw new IllegalArgumentException(motif);
        }
        String fete = null;
        if (f.categorie == Categorie.FETE) {
            fete = f.feteCode == null ? null : libelleFete(f.feteCode);
            if (fete == null) {
                throw new IllegalArgumentException("Choisissez la fête.");
            }
        }
        TUser auteur = utilisateur(userId);
        CategorieNotification categorie = notificationService.getOneByName(TypeNotification.CAMPAGNE);
        if (auteur == null || categorie == null) {
            throw new IllegalArgumentException("Campagne non configurée (utilisateur ou catégorie d'envoi).");
        }
        Set<String> demandes = new LinkedHashSet<>(f.clientIds);
        Filtres relu = new Filtres();
        relu.categorie = f.categorie == Categorie.ANNIVERSAIRE ? Categorie.ANNIVERSAIRE : null;
        relu.jour = f.jour;
        relu.clientIds = new ArrayList<>(demandes);
        relu.canal = f.canal;
        relu.accordExplicite = f.accordExplicite;
        Map<String, Cible> cibles = new LinkedHashMap<>();
        for (Cible c : population(relu)) {
            cibles.put(c.clientId, c);
        }
        String id = creerCampagne(f.categorie, "MANUEL", "ENVOYEE", f.jour, f.feteCode, f.canal,
                StringUtils.isNotBlank(texteLibre) ? null : modeleId, f.accordExplicite, userId);
        String[] officine = officine();
        JSONArray notifications = new JSONArray(), refus = new JSONArray();
        for (String clientId : demandes) {
            Cible c = cibles.get(clientId);
            String m = c == null ? "Client introuvable ou désactivé" : c.motif;
            if (m != null) {
                if (c != null) {
                    ligne(id, clientId, "EXCLU", m, null);
                    refus.put(new JSONObject().put("client", c.nomComplet()).put("motif", m));
                }
                continue;
            }
            String n = notification(categorie, auteur, c, message(modele, c, officine, fete));
            ligne(id, clientId, "PREPARE", null, n);
            notifications.put(n);
        }
        em.flush();
        totaux(id);
        em.createNativeQuery("UPDATE t_campagne SET traitee_at = NOW(), lg_USER_TRAITE = ?1 WHERE id = ?2")
                .setParameter(1, userId).setParameter(2, id).executeUpdate();
        return new JSONObject().put("success", true).put("campagne", id).put("canal", f.canal)
                .put("notifications", notifications).put("envoyes", notifications.length()).put("refus", refus)
                .put("message",
                        notifications.length() + " message(s) " + Campagnes.libelleCanal(f.canal) + " en cours d'envoi"
                                + (refus.length() > 0 ? ", " + refus.length() + " client(s) écarté(s)" : "") + ".");
    }

    /* ============================================================================================ propositions */

    private boolean propositionExiste(Categorie c, LocalDate jour, String fete) {
        Number n = (Number) em
                .createNativeQuery("SELECT COUNT(*) FROM t_campagne WHERE origine = 'AUTO'"
                        + " AND categorie = ?1 AND date_cible = ?2 AND COALESCE(fete_code, '') = ?3")
                .setParameter(1, c.name()).setParameter(2, java.sql.Date.valueOf(jour))
                .setParameter(3, StringUtils.defaultString(fete)).getSingleResult();
        return n.longValue() > 0;
    }

    private int proposer(Categorie c, LocalDate jour, String feteCode, String canal, String modeleId) {
        if (propositionExiste(c, jour, feteCode)) {
            return 0;
        }
        Filtres f = new Filtres();
        f.categorie = c;
        f.jour = jour;
        f.canal = canal;
        List<Cible> l = population(f);
        if (l.isEmpty()) {
            return 0;
        }
        String id = creerCampagne(c, "AUTO", "PROPOSEE", jour, feteCode, canal, modeleId, false, null);
        int n = 0;
        for (Cible x : l) {
            ligne(id, x.clientId, x.motif == null ? "PROPOSE" : "EXCLU", x.motif, null);
            n += x.motif == null ? 1 : 0;
        }
        totaux(id);
        return n;
    }

    /**
     * Propositions du jour (anniversaires, fetes actives tombant ce jour), si le volet automatique est actif ou si
     * {@code force} : une seule par categorie, jour et fete. Les propositions de plus de 7 jours non traitees expirent.
     * Rien n'est envoye. Renvoie le nombre de messages proposes.
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public JSONObject genererPropositions(LocalDate jour, boolean force) {
        int expirees = em
                .createNativeQuery("UPDATE t_campagne SET statut = 'EXPIREE', traitee_at = NOW()"
                        + " WHERE statut = 'PROPOSEE' AND date_cible < ?1")
                .setParameter(1, java.sql.Date.valueOf(jour.minusDays(JOURS_VALIDITE_PROPOSITION))).executeUpdate();
        JSONObject o = new JSONObject().put("expirees", expirees);
        if (!force && !"1".equals(parametre(PARAM_AUTO, "0"))) {
            return o.put("actif", false).put("proposes", 0);
        }
        String canal = Campagnes.canal(parametre("KEY_CAMPAGNE_AUTO_CANAL", "SMS"));
        int n = 0;
        if ("1".equals(parametre("KEY_CAMPAGNE_AUTO_ANNIV", "1"))) {
            n += proposer(Categorie.ANNIVERSAIRE, jour, null, canal,
                    parametre("KEY_CAMPAGNE_MODELE_ANNIV", "MODELE_ANNIVERSAIRE"));
        }
        if ("1".equals(parametre("KEY_CAMPAGNE_AUTO_FETE", "1"))) {
            JSONArray fetes = fetes(jour.getYear());
            for (int i = 0; i < fetes.length(); i++) {
                JSONObject x = fetes.getJSONObject(i);
                if (x.optBoolean("actif") && jour.toString().equals(x.optString("date"))) {
                    n += proposer(Categorie.FETE, jour, x.getString("code"), canal,
                            parametre("KEY_CAMPAGNE_MODELE_FETE", "MODELE_FETE"));
                }
            }
        }
        return o.put("actif", true).put("proposes", n);
    }

    /** Nombre de messages proposes en attente de validation (cloche). */
    public long compteurPropositions() {
        Number n = (Number) em
                .createNativeQuery("SELECT COUNT(*) FROM t_campagne_ligne l JOIN t_campagne c"
                        + " ON c.id = l.campagne_id WHERE c.statut = 'PROPOSEE' AND l.statut = 'PROPOSE'")
                .getSingleResult();
        return n.longValue();
    }

    private String titre(String categorie, String fete, Object dateCible) {
        Categorie c = Categorie.de(categorie);
        LocalDate d = date(dateCible);
        return (c == null ? categorie : c.libelle) + (fete == null || fete.isEmpty() ? "" : " — " + fete)
                + (d == null ? "" : " du " + d.format(JJ));
    }

    /** Propositions en attente, avec leurs destinataires. */
    @SuppressWarnings("unchecked")
    public JSONArray propositions() {
        JSONArray a = new JSONArray();
        for (Object[] r : (List<Object[]>) em
                .createNativeQuery("SELECT c.id AS id, c.categorie AS categorie,"
                        + " f.libelle AS fete, c.date_cible AS jour, c.canal AS canal, c.lg_MODELE AS modele,"
                        + " c.created_at AS cree FROM t_campagne c LEFT JOIN t_fete f ON f.code = c.fete_code"
                        + " WHERE c.statut = 'PROPOSEE' ORDER BY c.date_cible DESC, c.created_at DESC")
                .getResultList()) {
            a.put(new JSONObject().put("id", texte(r[0])).put("categorie", texte(r[1])).put("fete", texte(r[2]))
                    .put("titre", titre(texte(r[1]), texte(r[2]), r[3]))
                    .put("jour", date(r[3]) == null ? "" : date(r[3]).toString()).put("canal", texte(r[4]))
                    .put("modele", texte(r[5])).put("lignes", lignesProposition(texte(r[0]))));
        }
        return a;
    }

    @SuppressWarnings("unchecked")
    private JSONArray lignesProposition(String id) {
        JSONArray a = new JSONArray();
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT l.lg_CLIENT_ID AS id,"
                + " TRIM(CONCAT(COALESCE(c.str_FIRST_NAME,''),' ',COALESCE(c.str_LAST_NAME,''))) AS client,"
                + " c.str_ADRESSE AS tel, l.statut AS statut, l.motif AS motif FROM t_campagne_ligne l"
                + " JOIN t_client c ON c.lg_CLIENT_ID = l.lg_CLIENT_ID WHERE l.campagne_id = ?1"
                + " ORDER BY l.statut DESC, client").setParameter(1, id).getResultList()) {
            a.put(new JSONObject().put("clientId", texte(r[0])).put("client", texte(r[1])).put("telephone", texte(r[2]))
                    .put("joignable", "PROPOSE".equals(texte(r[3]))).put("motif", texte(r[4])));
        }
        return a;
    }

    /**
     * Envoi d'une proposition, sans les clients decoches. Verrou sur la campagne : un double clic ou deux postes
     * n'envoient pas deux fois. Le consentement et le numero sont recontroles au moment de l'envoi.
     */
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    @SuppressWarnings("unchecked")
    public JSONObject envoyerProposition(String id, Collection<String> decoches, String canal, String modeleId,
            String userId) {
        List<Object[]> c = em.createNativeQuery("SELECT statut AS statut, categorie AS categorie, date_cible AS jour,"
                + " fete_code AS fete, canal AS canal, lg_MODELE AS modele FROM t_campagne WHERE id = ?1 FOR UPDATE")
                .setParameter(1, id).getResultList();
        if (c.isEmpty()) {
            throw new IllegalArgumentException("Proposition introuvable.");
        }
        if (!"PROPOSEE".equals(texte(c.get(0)[0]))) {
            throw new IllegalArgumentException("Cette proposition a déjà été traitée.");
        }
        Filtres f = new Filtres();
        f.categorie = Categorie.de(texte(c.get(0)[1]));
        f.jour = date(c.get(0)[2]);
        f.feteCode = StringUtils.trimToNull(texte(c.get(0)[3]));
        f.canal = Campagnes.canal(StringUtils.defaultIfBlank(canal, texte(c.get(0)[4])));
        String modele = StringUtils.defaultIfBlank(modeleId, texte(c.get(0)[5]));
        Set<String> exclus = decoches == null ? new LinkedHashSet<>() : new LinkedHashSet<>(decoches);
        List<String> proposes = em
                .createNativeQuery(
                        "SELECT lg_CLIENT_ID FROM t_campagne_ligne WHERE campagne_id = ?1" + " AND statut = 'PROPOSE'")
                .setParameter(1, id).getResultList();
        f.clientIds = new ArrayList<>();
        for (String p : proposes) {
            if (!exclus.contains(p)) {
                f.clientIds.add(p);
            }
        }
        JSONObject r = new JSONObject().put("success", true).put("notifications", new JSONArray()).put("envoyes", 0)
                .put("refus", new JSONArray()).put("canal", f.canal);
        if (!f.clientIds.isEmpty()) {
            /* envoi par le chemin commun ; ses lignes remplacent celles de la proposition */
            String modeleTexte = contenuModele(modele, f.canal);
            String fete = f.feteCode == null ? null : libelleFete(f.feteCode);
            TUser auteur = utilisateur(userId);
            CategorieNotification categorie = notificationService.getOneByName(TypeNotification.CAMPAGNE);
            String[] officine = officine();
            Filtres relu = new Filtres();
            relu.categorie = f.categorie == Categorie.ANNIVERSAIRE ? Categorie.ANNIVERSAIRE : null;
            relu.jour = f.jour;
            relu.clientIds = f.clientIds;
            relu.canal = f.canal;
            Map<String, Cible> cibles = new HashMap<>();
            for (Cible x : population(relu)) {
                cibles.put(x.clientId, x);
            }
            JSONArray notifications = new JSONArray(), refus = new JSONArray();
            for (String clientId : f.clientIds) {
                Cible x = cibles.get(clientId);
                String m = x == null ? "Client introuvable ou désactivé" : x.motif;
                if (m != null) {
                    em.createNativeQuery(
                            "UPDATE t_campagne_ligne SET statut = 'EXCLU', motif = ?1 WHERE campagne_id = ?2"
                                    + " AND lg_CLIENT_ID = ?3")
                            .setParameter(1, m).setParameter(2, id).setParameter(3, clientId).executeUpdate();
                    refus.put(new JSONObject().put("client", x == null ? clientId : x.nomComplet()).put("motif", m));
                    continue;
                }
                String n = notification(categorie, auteur, x, message(modeleTexte, x, officine, fete));
                em.createNativeQuery("UPDATE t_campagne_ligne SET statut = 'PREPARE', lg_NOTIFICATION_ID = ?1"
                        + " WHERE campagne_id = ?2 AND lg_CLIENT_ID = ?3").setParameter(1, n).setParameter(2, id)
                        .setParameter(3, clientId).executeUpdate();
                notifications.put(n);
            }
            r.put("notifications", notifications).put("envoyes", notifications.length()).put("refus", refus);
        }
        for (String d : exclus) {
            em.createNativeQuery("UPDATE t_campagne_ligne SET statut = 'DECOCHE', retenu = b'0', motif = 'Décoché'"
                    + " WHERE campagne_id = ?1 AND lg_CLIENT_ID = ?2 AND statut = 'PROPOSE'").setParameter(1, id)
                    .setParameter(2, d).executeUpdate();
        }
        em.flush();
        totaux(id);
        em.createNativeQuery("UPDATE t_campagne SET statut = 'ENVOYEE', canal = ?1, lg_MODELE = ?2, traitee_at = NOW(),"
                + " lg_USER_TRAITE = ?3 WHERE id = ?4").setParameter(1, f.canal).setParameter(2, modele)
                .setParameter(3, userId).setParameter(4, id).executeUpdate();
        return r.put("message", r.getInt("envoyes") + " message(s) " + Campagnes.libelleCanal(f.canal)
                + " en cours d'envoi" + (exclus.isEmpty() ? "" : ", " + exclus.size() + " décoché(s)")
                + (r.getJSONArray("refus").length() > 0 ? ", " + r.getJSONArray("refus").length() + " écarté(s)" : "")
                + ".");
    }

    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public void abandonner(String id, String userId) {
        int n = em
                .createNativeQuery("UPDATE t_campagne SET statut = 'ABANDONNEE', traitee_at = NOW(),"
                        + " lg_USER_TRAITE = ?1 WHERE id = ?2 AND statut = 'PROPOSEE'")
                .setParameter(1, userId).setParameter(2, id).executeUpdate();
        if (n == 0) {
            throw new IllegalArgumentException("Cette proposition a déjà été traitée.");
        }
    }

    /* ============================================================================================ journal */

    /** Campagnes traitees (les plus recentes d'abord) : envoyes, distribues (fournisseur), ecartes. */
    @SuppressWarnings("unchecked")
    public JSONArray journal(int limite) {
        JSONArray a = new JSONArray();
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT c.id AS id, c.categorie AS categorie,"
                + " f.libelle AS fete, c.date_cible AS jour, c.origine AS origine, c.statut AS statut, c.canal AS canal,"
                + " m.libelle AS modele, c.nb_cibles AS cibles, c.nb_envoyes AS envoyes, c.nb_exclus AS exclus,"
                + " COALESCE(c.traitee_at, c.created_at) AS quand,"
                + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME,''),' ',COALESCE(u.str_LAST_NAME,''))) AS auteur,"
                + " (SELECT COUNT(*) FROM t_campagne_ligne l JOIN notification_client nc"
                + "   ON nc.notification_id = l.lg_NOTIFICATION_ID WHERE l.campagne_id = c.id AND nc.statut = 'SENT') AS partis,"
                + " c.accord_explicite AS accord" + " FROM t_campagne c LEFT JOIN t_fete f ON f.code = c.fete_code"
                + " LEFT JOIN modele_message m ON m.id = c.lg_MODELE"
                + " LEFT JOIN t_user u ON u.lg_USER_ID = COALESCE(c.lg_USER_TRAITE, c.lg_USER_ID)"
                + " WHERE c.statut <> 'PROPOSEE' ORDER BY quand DESC LIMIT " + Math.max(1, Math.min(500, limite)))
                .getResultList()) {
            Object q = r[11];
            a.put(new JSONObject().put("id", texte(r[0])).put("titre", titre(texte(r[1]), texte(r[2]), r[3]))
                    .put("categorie", texte(r[1]))
                    .put("origine", "AUTO".equals(texte(r[4])) ? "Proposition" : "Manuelle").put("statut", texte(r[5]))
                    .put("canal", Campagnes.libelleCanal(texte(r[6])))
                    .put("modele", StringUtils.defaultIfBlank(texte(r[7]), "Message saisi"))
                    .put("cibles", ((Number) r[8]).intValue()).put("envoyes", ((Number) r[9]).intValue())
                    .put("exclus", ((Number) r[10]).intValue()).put("partis", ((Number) r[13]).intValue())
                    .put("quand",
                            q instanceof Timestamp
                                    ? ((Timestamp) q).toLocalDateTime().toString().replace('T', ' ').substring(0, 16)
                                    : texte(q))
                    .put("auteur", texte(r[12])).put("accordExplicite", Boolean.TRUE.equals(bool(r[14]))));
        }
        return a;
    }
}
