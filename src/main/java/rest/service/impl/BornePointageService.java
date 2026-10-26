package rest.service.impl;

import dal.TUser;
import dal.enumeration.TypeLog;
import java.security.GeneralSecurityException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.LogService;
import util.borne.ProtectionBorne;

/**
 * BORNES DE POINTAGE SANS COMPTE (demande mobile 57). Une borne (application Prestige Pointage) est enrolee une fois
 * par un administrateur (droit P_SM_RH ou profil administrateur) ; elle recoit un secret, rendu une seule fois, garde
 * chiffre ici (cle AES des secrets de badge). Ensuite, chacun de ses appels est signe (voir ProtectionBorne) et verifie
 * par le filtre d'entree : borne connue et active, meme empreinte qu'a l'enrolement, horloge a moins de 5 minutes,
 * signature juste, jamais vue, debit. Le secret n'est jamais journalise.
 */
@Stateless
public class BornePointageService {

    private static final Logger LOG = Logger.getLogger(BornePointageService.class.getName());
    public static final String PARAM_RESEAU_LOCAL = "KEY_BORNE_POINTAGE_RESEAU_LOCAL";
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private LogService logService;

    /** Borne authentifiee pour la requete en cours. */
    public static final class Borne {
        public final String id, nom, statut, creePar;

        Borne(String id, String nom, String statut, String creePar) {
            this.id = id;
            this.nom = nom;
            this.statut = statut;
            this.creePar = creePar;
        }
    }

    /** Resultat de l'authentification : borne, ou statut HTTP et code d'erreur. */
    public static final class Verdict {
        public final Borne borne;
        public final int statut;
        public final String code, message;
        public final long attente;

        Verdict(Borne borne, int statut, String code, String message, long attente) {
            this.borne = borne;
            this.statut = statut;
            this.code = code;
            this.message = message;
            this.attente = attente;
        }

        static Verdict ok(Borne b) {
            return new Verdict(b, 200, null, null, 0);
        }

        static Verdict refus(int statut, String code, String message) {
            return new Verdict(null, statut, code, message, 0);
        }
    }

    // ------------------------------------------------------------------------------------- enrolement, liste, retrait

    static boolean empreinteValide(String e) {
        return e != null && e.matches("[0-9a-fA-F]{64}");
    }

    public JSONObject enroler(JSONObject corps, TUser auteur) {
        String empreinte = StringUtils.trimToNull(corps.optString("empreinte", null));
        String nom = util.ContexteRequete.nomPoste(corps.optString("nom", null));
        if (!empreinteValide(empreinte)) {
            return new JSONObject().put("success", false).put("code", "INVALIDE").put("msg",
                    "Empreinte invalide : 64 caractères hexadécimaux attendus.");
        }
        if (nom == null) {
            return new JSONObject().put("success", false).put("code", "INVALIDE").put("msg",
                    "Nom de la borne obligatoire.");
        }
        empreinte = empreinte.toLowerCase();
        /* enroler a nouveau la meme empreinte retire l'ancienne borne */
        int retirees = em
                .createNativeQuery(
                        "UPDATE t_borne_pointage SET statut = 'RETIREE', retiree_le = NOW(), retiree_par = ?2"
                                + " WHERE empreinte = ?1 AND statut = 'ACTIVE'")
                .setParameter(1, empreinte).setParameter(2, auteur.getLgUSERID()).executeUpdate();
        byte[] secret = ProtectionBorne.nouveauSecret();
        String id = UUID.randomUUID().toString();
        LocalDateTime le = LocalDateTime.now().withNano(0);
        em.createNativeQuery("INSERT INTO t_borne_pointage (id, nom, empreinte, secret, statut, cree_par, cree_le)"
                + " VALUES (?1, ?2, ?3, ?4, 'ACTIVE', ?5, ?6)").setParameter(1, id).setParameter(2, nom)
                .setParameter(3, empreinte).setParameter(4, EmpreinteServiceImpl.chiffrer(cle(), secret))
                .setParameter(5, auteur.getLgUSERID()).setParameter(6, Timestamp.valueOf(le)).executeUpdate();
        logService.updateLogFile(auteur, empreinte.substring(0, 8),
                "Borne de pointage " + nom + " enrôlée par " + auteur.getStrFIRSTNAME() + " " + auteur.getStrLASTNAME()
                        + " (empreinte " + empreinte.substring(0, 8) + "…"
                        + (retirees > 0 ? ", ancienne borne retirée" : "") + ")",
                TypeLog.BORNE_POINTAGE, auteur);
        return new JSONObject().put("success", true).put("borneId", id).put("secret", ProtectionBorne.base64Url(secret))
                .put("creeLe", le.atZone(ZoneId.systemDefault()).format(ISO));
    }

    @SuppressWarnings("unchecked")
    public JSONObject lister() {
        List<Object[]> l = em
                .createNativeQuery("SELECT b.id, b.nom, b.statut, CONCAT_WS(' ', u.str_FIRST_NAME, u.str_LAST_NAME),"
                        + " DATE_FORMAT(b.cree_le, '%d/%m/%Y %H:%i'), DATE_FORMAT(b.derniere_activite, '%d/%m/%Y %H:%i'),"
                        + " b.derniere_adresse, DATE_FORMAT(b.retiree_le, '%d/%m/%Y %H:%i'), LEFT(b.empreinte, 8)"
                        + " FROM t_borne_pointage b LEFT JOIN t_user u ON u.lg_USER_ID = b.cree_par"
                        + " ORDER BY b.statut = 'RETIREE', b.cree_le DESC")
                .getResultList();
        JSONArray a = new JSONArray();
        for (Object[] r : l) {
            a.put(new JSONObject().put("id", r[0]).put("nom", r[1]).put("statut", r[2]).put("enroleePar", t(r[3]))
                    .put("enroleeLe", t(r[4])).put("derniereActivite", t(r[5])).put("derniereAdresse", t(r[6]))
                    .put("retireeLe", t(r[7])).put("empreinte", t(r[8])));
        }
        return new JSONObject().put("success", true).put("data", a);
    }

    public JSONObject retirer(String id, TUser auteur) {
        Object[] b = ligne(id);
        if (b == null) {
            return new JSONObject().put("success", false).put("msg", "Borne introuvable.");
        }
        int n = em
                .createNativeQuery(
                        "UPDATE t_borne_pointage SET statut = 'RETIREE', retiree_le = NOW(), retiree_par = ?2"
                                + " WHERE id = ?1 AND statut = 'ACTIVE'")
                .setParameter(1, id).setParameter(2, auteur.getLgUSERID()).executeUpdate();
        if (n > 0) {
            logService.updateLogFile(auteur, StringUtils.left(id, 8), "Borne de pointage " + b[1] + " retirée par "
                    + auteur.getStrFIRSTNAME() + " " + auteur.getStrLASTNAME(), TypeLog.BORNE_POINTAGE, auteur);
        }
        return new JSONObject().put("success", true).put("message",
                n > 0 ? "Borne retirée : elle ne peut plus pointer." : "Borne déjà retirée.");
    }

    // ------------------------------------------------------------------------------------------ authentification

    @SuppressWarnings("unchecked")
    private Object[] ligne(String id) {
        List<Object[]> l = em
                .createNativeQuery(
                        "SELECT id, nom, statut, empreinte, secret, cree_par FROM t_borne_pointage WHERE id = ?1")
                .setParameter(1, id).getResultList();
        return l.isEmpty() ? null : l.get(0);
    }

    private boolean reseauLocalSeulement() {
        try {
            Object v = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                    .setParameter(1, PARAM_RESEAU_LOCAL).getSingleResult();
            return !"0".equals(String.valueOf(v).trim());
        } catch (RuntimeException e) {
            return true;
        }
    }

    /**
     * Verifie un appel de borne. Les refus de signature ne disent pas laquelle des conditions manque (code BORNE) ; une
     * borne retiree recoit REVOQUEE, une fois sa signature verifiee.
     */
    public Verdict authentifier(String methode, String chemin, String borneId, String date, String empreinte,
            String signature, byte[] corps, String adresse) {
        ProtectionBorne p = ProtectionBorne.instance();
        long attente = p.blocageSecondes(adresse);
        if (attente > 0) {
            return new Verdict(null, 429, "TROP_DE_DEMANDES", "Trop de demandes : réessayez dans " + attente + " s.",
                    attente);
        }
        if (reseauLocalSeulement() && !util.PosteOfficine.estLocal(adresse)) {
            return Verdict.refus(403, "RESEAU", "Borne de pointage acceptée seulement sur le réseau de l'officine.");
        }
        Verdict refus = Verdict.refus(401, "BORNE", "Borne non reconnue : enrôlez-la à nouveau.");
        Object[] b = StringUtils.isAnyBlank(borneId, date, empreinte, signature) ? null : ligne(borneId.trim());
        long dateMs;
        try {
            dateMs = Instant.parse(StringUtils.trimToEmpty(date)).toEpochMilli();
        } catch (RuntimeException e) {
            dateMs = Long.MIN_VALUE;
        }
        boolean signatureJuste = false;
        if (b != null && StringUtils.equalsIgnoreCase(String.valueOf(b[3]), StringUtils.trimToEmpty(empreinte))
                && dateMs != Long.MIN_VALUE && p.dateAcceptee(dateMs)) {
            try {
                byte[] secret = EmpreinteServiceImpl.dechiffrer(cle(), (byte[]) b[4]);
                signatureJuste = ProtectionBorne.signaturesEgales(
                        ProtectionBorne.signer(secret,
                                ProtectionBorne.chaine(methode, chemin, date.trim(), empreinte.trim(), corps)),
                        signature);
            } catch (GeneralSecurityException | RuntimeException e) {
                LOG.log(Level.WARNING, "Secret de borne illisible : {0}", borneId);
            }
        }
        if (!signatureJuste) {
            long blocage = p.echec(adresse);
            return blocage > 0 ? new Verdict(null, 429, "TROP_DE_DEMANDES",
                    "Trop de demandes : réessayez dans " + blocage + " s.", blocage) : refus;
        }
        if (!p.premiereFois(signature.trim())) {
            return refus; /* rejeu */
        }
        if (!"ACTIVE".equals(b[2])) {
            return Verdict.refus(401, "REVOQUEE", "Borne retirée : elle doit être enrôlée à nouveau.");
        }
        if (!p.appelAccepte(String.valueOf(b[0]))) {
            return new Verdict(null, 429, "TROP_DE_DEMANDES",
                    "Trop de demandes pour cette borne : réessayez dans une minute.", 60);
        }
        em.createNativeQuery(
                "UPDATE t_borne_pointage SET derniere_activite = NOW(), derniere_adresse = ?2 WHERE id = ?1"
                        + " AND (derniere_activite IS NULL OR derniere_activite < NOW() - INTERVAL 1 MINUTE OR NOT derniere_adresse <=> ?2)")
                .setParameter(1, b[0]).setParameter(2, StringUtils.left(adresse, 60)).executeUpdate();
        return Verdict.ok(new Borne(String.valueOf(b[0]), String.valueOf(b[1]), String.valueOf(b[2]), t(b[5])));
    }

    /** Nom et prenoms de l'employe (journal ; jamais le contenu d'un badge). */
    @SuppressWarnings("unchecked")
    public String nomEmploye(String employeId) {
        List<Object> l = em.createNativeQuery("SELECT CONCAT_WS(' ', nom, prenoms) FROM t_employe WHERE id = ?1")
                .setParameter(1, employeId).getResultList();
        return l.isEmpty() ? "?" : t(l.get(0));
    }

    /** Utilisateur au nom duquel le journal note les actions d'une borne : celui qui l'a enrolee. */
    public TUser enroleur(Borne b) {
        return b == null || b.creePar == null ? null : em.find(TUser.class, b.creePar);
    }

    /** Cle AES-256 des secrets de badge (meme cle, meme table que RhBadgeService), creee au premier usage. */
    @SuppressWarnings("unchecked")
    private byte[] cle() {
        List<Object> l = em.createNativeQuery("SELECT cle FROM t_rh_badge_cle WHERE id = 1").getResultList();
        if (!l.isEmpty()) {
            return (byte[]) l.get(0);
        }
        byte[] k = new byte[32];
        new java.security.SecureRandom().nextBytes(k);
        em.createNativeQuery("INSERT IGNORE INTO t_rh_badge_cle (id, cle, dt_creation) VALUES (1, ?1, NOW())")
                .setParameter(1, k).executeUpdate();
        return (byte[]) em.createNativeQuery("SELECT cle FROM t_rh_badge_cle WHERE id = 1").getSingleResult();
    }

    private static String t(Object o) {
        return o == null ? "" : String.valueOf(o);
    }
}
