package rest.service.impl;

import dal.TUser;
import java.io.InputStream;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ImagesProduitService;
import rest.service.MobileService;
import util.Constant;
import util.mobile.CodePointage;
import util.mobile.Geo;
import util.mobile.JetonMobile;

/**
 * Telephones (plan d'octobre, 0.3 et 3, lot L13).
 *
 * <ul>
 * <li>Connexion : identifiants du logiciel + identifiant de l'appareil ; le telephone est enregistre (un par
 * utilisateur et par appareil) et peut etre revoque depuis l'ecran RH. Le jeton est signe (HMAC-SHA256), court (12 h
 * par defaut), verifie a chaque appel avec le statut du terminal et du compte.</li>
 * <li>Pointage : l'utilisateur doit etre rattache a un employe actif ; anti-fraude parametrable : QR code de l'officine
 * qui change chaque minute (par defaut) et / ou position du telephone dans un rayon autour de l'officine. Deux
 * pointages a moins de deux minutes sont refuses (double appui).</li>
 * <li>Photos : meme regles que l'ecran (droit P_PRODUIT_IMAGES_MAJ, 5 Mo, JPG / PNG / WEBP).</li>
 * </ul>
 * Rien n'est journalise du jeton ni du mot de passe.
 */
@Stateless
public class MobileServiceImpl implements MobileService {

    static final String DROIT_PHOTOS = "P_PRODUIT_IMAGES_MAJ";
    private static final SecureRandom HASARD = new SecureRandom();

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private ImagesProduitService images;
    @EJB
    private rest.service.PrivilegeService privileges;

    /* ---------------------------------------------------------------- connexion */

    @Override
    public JSONObject connexion(String login, String motDePasse, String appareil, String nomAppareil, String adresse) {
        if (!"1".equals(parametre("KEY_MOBILE_ACTIF", "1"))) {
            return refus("La connexion des téléphones est désactivée par l'officine.");
        }
        String app = StringUtils.left(StringUtils.trimToNull(appareil), 80);
        if (StringUtils.isAnyBlank(login, motDePasse) || app == null) {
            return refus("Identifiant, mot de passe et appareil obligatoires.");
        }
        @SuppressWarnings("unchecked")
        List<TUser> l = em
                .createQuery("SELECT t FROM TUser t WHERE t.strLOGIN = ?1 AND t.strPASSWORD = ?2 AND t.strSTATUT = ?3",
                        TUser.class)
                .setParameter(1, login.trim()).setParameter(2, toolkits.security.Md5.encode(motDePasse))
                .setParameter(3, Constant.STATUT_ENABLE).setMaxResults(1).getResultList();
        if (l.isEmpty() || "00".equals(l.get(0).getLgUSERID())) {
            return refus("Identifiant ou mot de passe incorrect.");
        }
        TUser u = l.get(0);
        String terminal = premier("SELECT id FROM t_mobile_terminal WHERE lg_USER_ID = ?1 AND appareil = ?2",
                u.getLgUSERID(), app);
        if (terminal == null) {
            terminal = UUID.randomUUID().toString();
            executer("INSERT INTO t_mobile_terminal (id, lg_USER_ID, appareil, nom, statut, created_at,"
                    + " derniere_activite, derniere_adresse) VALUES (?1, ?2, ?3, ?4, 'ACTIF', NOW(), NOW(), ?5)",
                    terminal, u.getLgUSERID(), app, StringUtils.left(StringUtils.trimToNull(nomAppareil), 80),
                    StringUtils.left(adresse, 60));
        } else if (!"ACTIF".equals(premier("SELECT statut FROM t_mobile_terminal WHERE id = ?1", terminal))) {
            return refus("Ce téléphone a été retiré par l'officine. Demandez au responsable de le réactiver.");
        } else {
            executer(
                    "UPDATE t_mobile_terminal SET derniere_activite = NOW(), derniere_adresse = ?2,"
                            + " nom = COALESCE(?3, nom) WHERE id = ?1",
                    terminal, StringUtils.left(adresse, 60), StringUtils.left(StringUtils.trimToNull(nomAppareil), 80));
        }
        long exp = Instant.now().getEpochSecond()
                + 3600L * Math.max(1, Math.min(24 * 30, entier("KEY_MOBILE_JETON_HEURES", 12)));
        return moi(u).put("jeton", JetonMobile.emettre(cle(), terminal, u.getLgUSERID(), exp)).put("expiration",
                Instant.ofEpochSecond(exp).toString());
    }

    @Override
    public TUser authentifier(String jeton, String adresse) {
        JetonMobile.Contenu c = JetonMobile.verifier(cle(), jeton, Instant.now().getEpochSecond()).orElse(null);
        if (c == null
                || !"ACTIF".equals(premier("SELECT statut FROM t_mobile_terminal WHERE id = ?1 AND lg_USER_ID = ?2",
                        c.terminal, c.utilisateur))
                || !"1".equals(parametre("KEY_MOBILE_ACTIF", "1"))) {
            return null;
        }
        TUser u = em.find(TUser.class, c.utilisateur);
        if (u == null || !Constant.STATUT_ENABLE.equals(u.getStrSTATUT())) {
            return null;
        }
        executer(
                "UPDATE t_mobile_terminal SET derniere_activite = NOW(), derniere_adresse = ?2 WHERE id = ?1"
                        + " AND (derniere_activite IS NULL OR derniere_activite < NOW() - INTERVAL 1 MINUTE)",
                c.terminal, StringUtils.left(adresse, 60));
        return u;
    }

    @Override
    public String terminalDuJeton(String jeton) {
        return JetonMobile.verifier(cle(), jeton, Instant.now().getEpochSecond()).map(c -> c.terminal).orElse(null);
    }

    @Override
    public JSONObject moi(TUser u) {
        String[] employe = employe(u);
        boolean pointage = employe != null && "1".equals(parametre("KEY_RH_MOBILE_POINTAGE", "1"));
        return ok()
                .put("utilisateur",
                        new JSONObject().put("id", u.getLgUSERID()).put("login", u.getStrLOGIN()).put("nom",
                                StringUtils.trimToEmpty(u.getStrFIRSTNAME()) + " "
                                        + StringUtils.trimToEmpty(u.getStrLASTNAME())))
                .put("employe",
                        employe == null ? JSONObject.NULL
                                : new JSONObject().put("id", employe[0]).put("matricule", employe[1]).put("nom",
                                        employe[2]))
                .put("droits", new JSONObject().put("pointage", pointage).put("photos", aLeDroit(u, DROIT_PHOTOS)))
                .put("pointage", new JSONObject().put("qr", "1".equals(parametre("KEY_RH_MOBILE_QR", "1"))).put("gps",
                        "1".equals(parametre("KEY_RH_MOBILE_GPS", "0"))));
    }

    /* ---------------------------------------------------------------- pointage */

    @Override
    public JSONObject pointer(TUser u, String terminal, JSONObject s) {
        if (!"1".equals(parametre("KEY_RH_MOBILE_POINTAGE", "1"))) {
            return refus("Le pointage par téléphone est désactivé par l'officine.");
        }
        String[] employe = employe(u);
        if (employe == null) {
            return refus("Votre compte n'est rattaché à aucun employé actif : voyez le responsable RH.");
        }
        long maintenant = Instant.now().getEpochSecond();
        if ("1".equals(parametre("KEY_RH_MOBILE_QR", "1"))
                && !CodePointage.valide(cle(), s.optString("code", null), maintenant)) {
            return refus("Code de pointage invalide ou expiré : scannez le QR code affiché à l'officine.");
        }
        Double lat = nombre(s.opt("latitude"));
        Double lon = nombre(s.opt("longitude"));
        Double precision = nombre(s.opt("precision"));
        boolean positionOk = Geo.positionPlausible(lat, lon);
        if ("1".equals(parametre("KEY_RH_MOBILE_GPS", "0"))) {
            Double oLat = nombre(parametre("KEY_RH_MOBILE_LATITUDE", ""));
            Double oLon = nombre(parametre("KEY_RH_MOBILE_LONGITUDE", ""));
            int rayon = Math.max(20, entier("KEY_RH_MOBILE_RAYON_M", 150));
            if (!Geo.positionPlausible(oLat, oLon)) {
                return refus("La position de l'officine n'est pas paramétrée : voyez le responsable RH.");
            }
            if (!positionOk) {
                return refus("Activez la localisation du téléphone pour pointer.");
            }
            if (precision != null && precision > 2d * rayon) {
                return refus("Position trop imprécise (" + Math.round(precision)
                        + " m) : réessayez à l'extérieur ou près" + " d'une fenêtre.");
            }
            double d = Geo.distanceM(lat, lon, oLat, oLon);
            if (d > rayon) {
                return refus("Vous êtes à " + Math.round(d) + " m de l'officine (maximum " + rayon + " m).");
            }
        }
        LocalDateTime t = LocalDateTime.now().withNano(0);
        if (premier("SELECT id FROM t_pointage WHERE employe_id = ?1 AND horodatage > ?2", employe[0],
                Timestamp.valueOf(t.minusMinutes(2))) != null) {
            return refus("Pointage déjà enregistré il y a moins de deux minutes.");
        }
        String sens = StringUtils.upperCase(s.optString("sens", ""));
        if (!"ENTREE".equals(sens) && !"SORTIE".equals(sens)) {
            /*
             * sens non choisi : l'inverse du dernier pointage des 16 dernieres heures (une garde de nuit sort le
             * lendemain : « du jour » se tromperait apres minuit)
             */
            String dernier = premier("SELECT sens FROM t_pointage WHERE employe_id = ?1 AND horodatage >= ?2"
                    + " ORDER BY horodatage DESC", employe[0], Timestamp.valueOf(t.minusHours(16)));
            sens = "ENTREE".equals(dernier) ? "SORTIE" : "ENTREE";
        }
        String nomTerminal = premier("SELECT COALESCE(nom, appareil) FROM t_mobile_terminal WHERE id = ?1", terminal);
        executer("INSERT INTO t_pointage (id, employe_id, horodatage, sens, source, terminal, saisi_par, latitude,"
                + " longitude, precision_m, created_at) VALUES (?1, ?2, ?3, ?4, 'MOBILE', ?5, ?6, ?7, ?8, ?9, NOW())",
                UUID.randomUUID().toString(), employe[0], Timestamp.valueOf(t), sens, StringUtils.left(nomTerminal, 60),
                u.getLgUSERID(),
                positionOk ? BigDecimal.valueOf(lat).setScale(7, java.math.RoundingMode.HALF_UP) : null,
                positionOk ? BigDecimal.valueOf(lon).setScale(7, java.math.RoundingMode.HALF_UP) : null,
                positionOk && precision != null ? (int) Math.min(100000, Math.round(precision)) : null);
        String hm = String.format("%02d:%02d", t.getHour(), t.getMinute());
        return ok().put("sens", sens).put("heure", hm).put("message",
                ("ENTREE".equals(sens) ? "Entrée" : "Sortie") + " enregistrée à " + hm + ".");
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject mesPointages(TUser u) {
        String[] employe = employe(u);
        JSONArray a = new JSONArray();
        if (employe != null) {
            for (Object[] l : (List<Object[]>) em
                    .createNativeQuery("SELECT DATE_FORMAT(horodatage, '%H:%i'), sens,"
                            + " source FROM t_pointage WHERE employe_id = ?1 AND horodatage >= ?2 ORDER BY horodatage")
                    .setParameter(1, employe[0]).setParameter(2, Timestamp.valueOf(LocalDateTime.now().minusHours(16)))
                    .getResultList()) {
                a.put(new JSONObject().put("heure", l[0]).put("sens", l[1]).put("source", l[2]));
            }
        }
        return ok().put("data", a);
    }

    /* ---------------------------------------------------------------- photos */

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject produits(String recherche) {
        String r = StringUtils.left(StringUtils.trimToEmpty(recherche), 60);
        JSONArray a = new JSONArray();
        if (r.length() >= 2) {
            for (Object[] l : (List<Object[]>) em
                    .createNativeQuery("SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME,"
                            + " (SELECT COUNT(*) FROM t_famille_image i WHERE i.lg_FAMILLE_ID = f.lg_FAMILLE_ID)"
                            + " FROM t_famille f WHERE f.str_STATUT = 'enable' AND (f.int_CIP = ?1 OR f.int_EAN13 = ?1"
                            + " OR f.str_NAME LIKE ?2) ORDER BY (f.int_CIP = ?1) DESC, f.str_NAME")
                    .setParameter(1, r).setParameter(2, r.replace("%", "").replace("_", "\\_") + "%").setMaxResults(30)
                    .getResultList()) {
                a.put(new JSONObject().put("id", l[0]).put("cip", l[1]).put("nom", l[2]).put("images",
                        ((Number) l[3]).intValue()));
            }
        }
        return ok().put("data", a);
    }

    @Override
    public JSONObject ajouterPhoto(TUser u, String familleId, InputStream flux, boolean principale) {
        if (!aLeDroit(u, DROIT_PHOTOS)) {
            return refus("Vous n'avez pas le droit de modifier les images des produits.");
        }
        return images.ajouter(familleId, flux, principale, u);
    }

    /* ---------------------------------------------------------------- ecran RH */

    @Override
    public JSONObject codePointage() {
        long t = Instant.now().getEpochSecond();
        String code = CodePointage.code(cle(), t);
        return ok().put("code", code).put("contenu", CodePointage.PREFIXE + code)
                .put("resteSec", CodePointage.resteSec(t)).put("periodeSec", CodePointage.PERIODE_SEC)
                .put("actif", "1".equals(parametre("KEY_RH_MOBILE_POINTAGE", "1")))
                .put("qr", "1".equals(parametre("KEY_RH_MOBILE_QR", "1")))
                .put("gps", "1".equals(parametre("KEY_RH_MOBILE_GPS", "0")))
                .put("latitude", parametre("KEY_RH_MOBILE_LATITUDE", ""))
                .put("longitude", parametre("KEY_RH_MOBILE_LONGITUDE", ""))
                .put("rayon", entier("KEY_RH_MOBILE_RAYON_M", 150));
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject terminaux() {
        JSONArray a = new JSONArray();
        for (Object[] l : (List<Object[]>) em.createNativeQuery("SELECT t.id, u.str_LOGIN, CONCAT_WS(' ',"
                + " u.str_FIRST_NAME, u.str_LAST_NAME), COALESCE(t.nom, t.appareil), t.statut,"
                + " DATE_FORMAT(t.created_at, '%d/%m/%Y %H:%i'), DATE_FORMAT(t.derniere_activite, '%d/%m/%Y %H:%i'),"
                + " t.derniere_adresse FROM t_mobile_terminal t JOIN t_user u ON u.lg_USER_ID = t.lg_USER_ID"
                + " ORDER BY t.derniere_activite DESC").getResultList()) {
            a.put(new JSONObject().put("id", l[0]).put("login", l[1]).put("utilisateur", l[2]).put("appareil", l[3])
                    .put("statut", l[4]).put("creeLe", l[5]).put("derniereActivite", t(l[6])).put("adresse", t(l[7])));
        }
        return ok().put("data", a);
    }

    @Override
    public JSONObject changerTerminal(String id, boolean actif, TUser operateur) {
        int n = actif
                ? executer("UPDATE t_mobile_terminal SET statut = 'ACTIF', revoque_par = NULL, revoque_le = NULL"
                        + " WHERE id = ?1", id)
                : executer("UPDATE t_mobile_terminal SET statut = 'REVOQUE', revoque_par = ?2, revoque_le = NOW()"
                        + " WHERE id = ?1", id, operateur == null ? null : operateur.getLgUSERID());
        return n == 0 ? refus("Téléphone introuvable.")
                : ok().put("message", actif ? "Téléphone réactivé." : "Téléphone retiré : il est déconnecté.");
    }

    @Override
    public JSONObject revoquerTousLesJetons() {
        executer("DELETE FROM t_mobile_cle WHERE id = 'JETON'");
        cle();
        return ok().put("message", "Tous les téléphones devront se reconnecter.");
    }

    /* ---------------------------------------------------------------- outils */

    /** Cle de signature (32 octets aleatoires), creee au premier besoin ; jamais renvoyee ni journalisee. */
    private byte[] cle() {
        String v = premier("SELECT valeur FROM t_mobile_cle WHERE id = 'JETON'");
        if (v == null) {
            byte[] b = new byte[32];
            HASARD.nextBytes(b);
            executer("INSERT IGNORE INTO t_mobile_cle (id, valeur, created_at) VALUES ('JETON', ?1, NOW())",
                    new java.math.BigInteger(1, b).toString(16));
            v = premier("SELECT valeur FROM t_mobile_cle WHERE id = 'JETON'");
        }
        /* la cle est utilisee telle quelle (texte hexadecimal) : seul compte qu'elle soit secrete et stable */
        return v.getBytes(java.nio.charset.StandardCharsets.US_ASCII);
    }

    /** {id, matricule, nom} de l'employe actif rattache, ou null. */
    @SuppressWarnings("unchecked")
    private String[] employe(TUser u) {
        List<Object[]> l = em.createNativeQuery("SELECT id, matricule, CONCAT_WS(' ', nom, prenoms) FROM t_employe"
                + " WHERE lg_USER_ID = ?1 AND statut = 'ACTIF' AND (dt_sortie IS NULL OR dt_sortie >= CURDATE())")
                .setParameter(1, u.getLgUSERID()).setMaxResults(1).getResultList();
        return l.isEmpty() ? null : new String[] { t(l.get(0)[0]), t(l.get(0)[1]), t(l.get(0)[2]) };
    }

    private boolean aLeDroit(TUser u, String droit) {
        return "00".equals(u.getLgUSERID())
                || privileges.getPrivilegeByNames(java.util.Set.of(droit), u.getLgUSERID()).contains(droit);
    }

    private static Double nombre(Object o) {
        if (o == null || o == JSONObject.NULL) {
            return null;
        }
        try {
            double d = o instanceof Number ? ((Number) o).doubleValue() : Double.parseDouble(String.valueOf(o).trim());
            return Double.isFinite(d) ? d : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private int executer(String sql, Object... p) {
        Query q = em.createNativeQuery(sql);
        for (int i = 0; i < p.length; i++) {
            q.setParameter(i + 1, p[i]);
        }
        return q.executeUpdate();
    }

    @SuppressWarnings("unchecked")
    private String premier(String sql, Object... p) {
        Query q = em.createNativeQuery(sql);
        for (int i = 0; i < p.length; i++) {
            q.setParameter(i + 1, p[i]);
        }
        List<Object> r = q.setMaxResults(1).getResultList();
        return r.isEmpty() || r.get(0) == null ? null : String.valueOf(r.get(0));
    }

    private String parametre(String cle, String defaut) {
        String v = premier("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1", cle);
        return v == null ? defaut : v.trim();
    }

    private int entier(String cle, int defaut) {
        try {
            return Integer.parseInt(parametre(cle, String.valueOf(defaut)));
        } catch (NumberFormatException e) {
            return defaut;
        }
    }

    private static String t(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private static JSONObject ok() {
        return new JSONObject().put("success", true);
    }

    private static JSONObject refus(String m) {
        return new JSONObject().put("success", false).put("msg", m).put("message", m);
    }
}
