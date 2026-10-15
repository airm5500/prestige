package rest.service.impl;

import dal.TUser;
import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.EmpreinteService;
import rest.service.dto.EmpreinteDTO;
import rest.service.dto.EmpreinteSuppressionDTO;
import rest.service.dto.EmpreintesLectureDTO;
import util.Constant;

/**
 * Demandes serveur des applications mobiles (43) : empreintes des employes partagees entre terminaux de pointage.
 *
 * <p>
 * Gabarit chiffre en AES-256-GCM (octet de version, vecteur de 12 octets, chiffre + etiquette). La cle est conservee en
 * base (t_empreinte_cle), decision du pharmacien du 15/10 : une sauvegarde de la base contient donc de quoi dechiffrer.
 * Jamais de gabarit dans les journaux ni les exports ; chaque action est tracee dans t_empreinte_journal (sans
 * gabarit). Fonction desactivee tant que KEY_EMPREINTES_PARTAGEES ne vaut pas 1.
 */
@Stateless
public class EmpreinteServiceImpl implements EmpreinteService {

    private static final Logger LOG = Logger.getLogger(EmpreinteServiceImpl.class.getName());
    private static final byte VERSION = 1;
    private static final int IV = 12, ETIQUETTE_BITS = 128;
    private static final SecureRandom HASARD = new SecureRandom();
    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    // ------------------------------------------------------------------------------------------------ ecriture

    @Override
    public JSONObject enroler(String employeId, JSONObject corps, TUser auteur) {
        if (!active()) {
            return refus("DESACTIVE", "Empreintes partagées désactivées (paramètre KEY_EMPREINTES_PARTAGEES).");
        }
        purgerInactifs(auteur);
        if (!employeActif(employeId)) {
            return refus("EMPLOYE", "Employé introuvable ou inactif.");
        }
        String format = StringUtils.trimToEmpty(corps.optString("format", ""));
        if (!format.matches("[A-Za-z0-9_\\-]{1,40}")) {
            return refus("FORMAT", "Format de gabarit absent ou invalide.");
        }
        JSONObject consentement = corps.optJSONObject("consentement");
        String consentementPar = consentement == null ? "" : StringUtils.trimToEmpty(consentement.optString("par", ""));
        LocalDateTime consentementLe = consentement == null ? null : dateIso(consentement.optString("le", ""));
        if (consentementLe == null || consentementPar.isEmpty() || consentementPar.length() > 100) {
            return refus("CONSENTEMENT", "Consentement écrit obligatoire : date (le) et personne (par).");
        }
        JSONArray modeles = corps.optJSONArray("modeles");
        if (modeles == null || modeles.length() == 0 || modeles.length() > 10) {
            return refus("MODELES", "Entre 1 et 10 gabarits par envoi.");
        }
        List<byte[]> gabarits = new ArrayList<>();
        for (int i = 0; i < modeles.length(); i++) {
            byte[] g;
            try {
                g = Base64.getDecoder().decode(StringUtils.trimToEmpty(modeles.optString(i, "")));
            } catch (IllegalArgumentException e) {
                g = null;
            }
            if (g == null || g.length == 0 || g.length > 32 * 1024) {
                return refus("MODELES", "Gabarit " + (i + 1) + " illisible ou trop lourd (32 Ko au plus).");
            }
            gabarits.add(g);
        }
        byte[] cle = cle();
        JSONArray ids = new JSONArray();
        for (byte[] g : gabarits) {
            String id = UUID.randomUUID().toString();
            em.createNativeQuery("INSERT INTO t_employe_empreinte (id, employe_id, modele, format, capteur, doigt,"
                    + " consentement_le, consentement_par, cree_par, dt_creation) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NOW())")
                    .setParameter(1, id).setParameter(2, employeId).setParameter(3, chiffrer(cle, g))
                    .setParameter(4, format).setParameter(5, StringUtils.left(corps.optString("capteur", null), 60))
                    .setParameter(6, StringUtils.left(corps.optString("doigt", null), 20))
                    .setParameter(7, Timestamp.valueOf(consentementLe)).setParameter(8, consentementPar)
                    .setParameter(9, auteur == null ? null : auteur.getLgUSERID()).executeUpdate();
            ids.put(id);
        }
        journal("ENROLER", employeId, auteur, gabarits.size(), format);
        return new JSONObject().put("success", true).put("nombre", gabarits.size()).put("ids", ids);
    }

    @Override
    public JSONObject supprimer(String employeId, TUser auteur) {
        int n = em
                .createNativeQuery("UPDATE t_employe_empreinte SET modele = NULL, dt_suppression = NOW()"
                        + " WHERE employe_id = ?1 AND dt_suppression IS NULL")
                .setParameter(1, employeId).executeUpdate();
        journal("SUPPRIMER", employeId, auteur, n, null);
        return new JSONObject().put("success", true).put("nombre", n);
    }

    // ------------------------------------------------------------------------------------------------ lecture

    @Override
    public EmpreintesLectureDTO lire(String depuis, String format, TUser lecteur) {
        if (!active()) {
            return EmpreintesLectureDTO.builder().success(false).code("DESACTIVE")
                    .msg("Empreintes partagées désactivées (paramètre KEY_EMPREINTES_PARTAGEES).").build();
        }
        if (StringUtils.isBlank(format)) {
            return EmpreintesLectureDTO.builder().success(false).code("FORMAT").msg("Format de gabarit obligatoire.")
                    .build();
        }
        LocalDateTime d = StringUtils.isBlank(depuis) ? null : dateIso(depuis);
        if (StringUtils.isNotBlank(depuis) && d == null) {
            return EmpreintesLectureDTO.builder().success(false).code("DEPUIS")
                    .msg("« depuis » attendu au format AAAA-MM-JJTHH:MM:SS.").build();
        }
        String horodatage = String
                .valueOf(em.createNativeQuery("SELECT DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s')").getSingleResult());
        purgerInactifs(lecteur);
        Timestamp t = d == null ? Timestamp.valueOf(LocalDateTime.of(2000, 1, 1, 0, 0)) : Timestamp.valueOf(d);
        @SuppressWarnings("unchecked")
        List<Tuple> lignes = em.createNativeQuery("SELECT e.id, e.employe_id, e.format, e.capteur, e.doigt, e.modele,"
                + " DATE_FORMAT(e.dt_creation, '%Y-%m-%dT%H:%i:%s') AS dt_creation FROM t_employe_empreinte e"
                + " JOIN t_employe x ON x.id = e.employe_id AND x.statut = 'ACTIF'"
                + " WHERE e.dt_suppression IS NULL AND e.format = ?1 AND e.dt_creation >= ?2 ORDER BY e.dt_creation",
                Tuple.class).setParameter(1, format).setParameter(2, t).getResultList();
        byte[] cle = lignes.isEmpty() ? null : cle();
        List<EmpreinteDTO> modeles = new ArrayList<>();
        for (Tuple l : lignes) {
            try {
                modeles.add(mapTupleToDto(l, cle));
            } catch (GeneralSecurityException | RuntimeException e) {
                // gabarit illisible (cle changee, donnee alteree) : ecarte, sans jamais journaliser son contenu
                LOG.log(Level.WARNING, "Gabarit d'empreinte illisible ecarte : {0}", l.get("id"));
            }
        }
        @SuppressWarnings("unchecked")
        List<Tuple> retires = em.createNativeQuery("SELECT id, employe_id,"
                + " DATE_FORMAT(dt_suppression, '%Y-%m-%dT%H:%i:%s') AS dt_suppression FROM t_employe_empreinte"
                + " WHERE dt_suppression IS NOT NULL AND dt_suppression >= ?1 AND format = ?2 ORDER BY dt_suppression",
                Tuple.class).setParameter(1, t).setParameter(2, format).getResultList();
        journal("LIRE", null, lecteur, modeles.size(), format);
        return EmpreintesLectureDTO.builder().success(true).horodatage(horodatage).modeles(modeles)
                .suppressions(retires.stream()
                        .map(r -> EmpreinteSuppressionDTO.builder().id((String) r.get("id"))
                                .employeId((String) r.get("employe_id")).dtSuppression((String) r.get("dt_suppression"))
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }

    EmpreinteDTO mapTupleToDto(Tuple t, byte[] cle) throws GeneralSecurityException {
        return EmpreinteDTO.builder().id((String) t.get("id")).employeId((String) t.get("employe_id"))
                .format((String) t.get("format")).capteur((String) t.get("capteur")).doigt((String) t.get("doigt"))
                .modele(Base64.getEncoder().encodeToString(dechiffrer(cle, (byte[]) t.get("modele"))))
                .dtCreation((String) t.get("dt_creation")).build();
    }

    // ------------------------------------------------------------------------------------------------ outils

    /** Employes devenus inactifs : gabarits effaces (conservation limitee), signales aux terminaux. */
    private void purgerInactifs(TUser auteur) {
        @SuppressWarnings("unchecked")
        List<Object> employes = em.createNativeQuery("SELECT DISTINCT e.employe_id FROM t_employe_empreinte e"
                + " LEFT JOIN t_employe x ON x.id = e.employe_id"
                + " WHERE e.dt_suppression IS NULL AND (x.id IS NULL OR x.statut <> 'ACTIF')").getResultList();
        for (Object e : employes) {
            int n = em.createNativeQuery("UPDATE t_employe_empreinte SET modele = NULL, dt_suppression = NOW()"
                    + " WHERE employe_id = ?1 AND dt_suppression IS NULL").setParameter(1, e).executeUpdate();
            journal("PURGER", String.valueOf(e), auteur, n, null);
        }
    }

    private boolean active() {
        @SuppressWarnings("unchecked")
        List<Object> l = em.createNativeQuery("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1")
                .setParameter(1, Constant.KEY_EMPREINTES_PARTAGEES).getResultList();
        return !l.isEmpty() && "1".equals(StringUtils.trim(String.valueOf(l.get(0))));
    }

    private boolean employeActif(String employeId) {
        return !em.createNativeQuery("SELECT 1 FROM t_employe WHERE id = ?1 AND statut = 'ACTIF'")
                .setParameter(1, employeId).getResultList().isEmpty();
    }

    /** Cle AES-256 conservee en base (une seule ligne), creee au premier usage. */
    private byte[] cle() {
        @SuppressWarnings("unchecked")
        List<Object> l = em.createNativeQuery("SELECT cle FROM t_empreinte_cle WHERE id = 1").getResultList();
        if (!l.isEmpty()) {
            return (byte[]) l.get(0);
        }
        byte[] k = new byte[32];
        HASARD.nextBytes(k);
        em.createNativeQuery("INSERT IGNORE INTO t_empreinte_cle (id, cle, dt_creation) VALUES (1, ?1, NOW())")
                .setParameter(1, k).executeUpdate();
        return (byte[]) em.createNativeQuery("SELECT cle FROM t_empreinte_cle WHERE id = 1").getSingleResult();
    }

    static byte[] chiffrer(byte[] cle, byte[] clair) {
        try {
            byte[] iv = new byte[IV];
            HASARD.nextBytes(iv);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(cle, "AES"), new GCMParameterSpec(ETIQUETTE_BITS, iv));
            byte[] chiffre = c.doFinal(clair);
            return ByteBuffer.allocate(1 + IV + chiffre.length).put(VERSION).put(iv).put(chiffre).array();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Chiffrement du gabarit impossible", e);
        }
    }

    static byte[] dechiffrer(byte[] cle, byte[] donnee) throws GeneralSecurityException {
        if (donnee == null || donnee.length < 1 + IV + 16 || donnee[0] != VERSION) {
            throw new GeneralSecurityException("gabarit chiffre invalide");
        }
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(cle, "AES"), new GCMParameterSpec(ETIQUETTE_BITS, donnee, 1, IV));
        return c.doFinal(donnee, 1 + IV, donnee.length - 1 - IV);
    }

    private void journal(String action, String employeId, TUser auteur, int nombre, String format) {
        em.createNativeQuery(
                "INSERT INTO t_empreinte_journal (horodatage, action, employe_id, utilisateur, nombre, format)"
                        + " VALUES (NOW(), ?1, ?2, ?3, ?4, ?5)")
                .setParameter(1, action).setParameter(2, employeId)
                .setParameter(3, auteur == null ? null : auteur.getLgUSERID()).setParameter(4, nombre)
                .setParameter(5, format).executeUpdate();
    }

    private static LocalDateTime dateIso(String s) {
        try {
            String v = StringUtils.trimToEmpty(s);
            return v.length() >= 19 ? LocalDateTime.parse(v.substring(0, 19), ISO) : null;
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static JSONObject refus(String code, String msg) {
        return new JSONObject().put("success", false).put("code", code).put("msg", msg).put("message", msg);
    }
}
