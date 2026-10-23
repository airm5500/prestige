package rest.service.impl;

import dal.TUser;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Retours du 13/10 (point 3) : badges des employes (onglet « Badges » des ressources humaines). Creer, modifier,
 * desactiver, imprimer. Un seul badge actif par employe ; le numero du badge actif est recopie dans t_employe.badge,
 * que la pointeuse utilise deja : un badge desactive n'est plus reconnu au pointage.
 */
@Stateless
public class RhBadgeService {

    public static final String ACTIF = "ACTIF";
    public static final String DESACTIVE = "DESACTIVE";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private static JSONObject refus(String msg) {
        return new JSONObject().put("success", false).put("msg", msg);
    }

    private static String t(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    @SuppressWarnings("unchecked")
    private String premier(String sql, Object... p) {
        javax.persistence.Query q = em.createNativeQuery(sql);
        for (int i = 0; i < p.length; i++) {
            q.setParameter(i + 1, p[i]);
        }
        List<Object> r = q.setMaxResults(1).getResultList();
        return r.isEmpty() || r.get(0) == null ? null : String.valueOf(r.get(0));
    }

    /** Badges (actifs, ou tous), avec l'employe. */
    @SuppressWarnings("unchecked")
    public JSONObject badges(String query, boolean inactifs) {
        StringBuilder sql = new StringBuilder(
                "SELECT b.id, b.employe_id, b.numero, b.statut, b.dt_emission, b.dt_expiration,"
                        + " b.motif, b.dt_desactivation, b.nb_impressions, b.dt_impression, e.matricule, e.nom, e.prenoms, e.poste,"
                        + " u.str_LOGIN FROM t_rh_badge b JOIN t_employe e ON e.id = b.employe_id"
                        + " LEFT JOIN t_user u ON u.lg_USER_ID = e.lg_USER_ID AND u.str_STATUT = 'enable' WHERE 1 = 1");
        if (!inactifs) {
            sql.append(" AND b.statut = 'ACTIF'");
        }
        boolean filtre = StringUtils.isNotBlank(query);
        if (filtre) {
            sql.append(" AND CONCAT_WS(' ', b.numero, e.matricule, e.nom, e.prenoms, e.poste) LIKE ?1");
        }
        sql.append(" ORDER BY b.statut, e.nom, e.prenoms, b.created_at DESC");
        javax.persistence.Query q = em.createNativeQuery(sql.toString());
        if (filtre) {
            q.setParameter(1, "%" + query.trim() + "%");
        }
        JSONArray a = new JSONArray();
        LocalDate auj = LocalDate.now();
        for (Object[] l : (List<Object[]>) q.getResultList()) {
            String exp = t(l[5]);
            a.put(new JSONObject().put("id", l[0]).put("employeId", l[1]).put("numero", l[2]).put("statut", l[3])
                    .put("dtEmission", t(l[4])).put("dtExpiration", exp).put("motif", t(l[6]))
                    .put("dtDesactivation", t(l[7])).put("impressions", ((Number) l[8]).intValue())
                    .put("dtImpression", t(l[9])).put("matricule", t(l[10])).put("nom", t(l[11]))
                    .put("prenoms", t(l[12])).put("poste", t(l[13])).put("compte", t(l[14]))
                    .put("expire", ACTIF.equals(l[3]) && !exp.isEmpty() && LocalDate.parse(exp).isBefore(auj)));
        }
        return new JSONObject().put("success", true).put("data", a).put("total", a.length());
    }

    /**
     * Numero propose quand aucun n'est saisi (demande du 16/10) : PRE-AA-NNNNN-C, par exemple PGB-26-00017-K. PRE :
     * parametre KEY_BADGE_PREFIXE s'il est renseigne, sinon l'abreviation du nom de l'officine ; numero d'ordre dans
     * l'annee ; lettre de controle. Les badges deja emis (BDG...) gardent leur numero.
     */
    String numeroLibre() {
        String parametre = premier("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_BADGE_PREFIXE'");
        String prefixe = parametre != null && parametre.trim().matches("[A-Za-z]{3}") ? parametre.trim().toUpperCase()
                : util.NumeroBadge.prefixe(officine());
        int annee = LocalDate.now().getYear();
        String debut = prefixe + "-" + String.format("%02d", annee % 100) + "-";
        String max = premier(
                "SELECT MAX(CAST(SUBSTRING(numero, 8, 5) AS UNSIGNED)) FROM t_rh_badge WHERE numero LIKE ?1",
                debut + "%");
        int n = max == null ? 0 : Integer.parseInt(max);
        String numero;
        do {
            n++;
            numero = util.NumeroBadge.numero(prefixe, annee, n);
        } while (premier("SELECT id FROM t_employe WHERE badge = ?1", numero) != null
                || premier("SELECT id FROM t_rh_badge WHERE numero = ?1", numero) != null);
        return numero;
    }

    /**
     * Creer (id vide) ou modifier un badge. A la creation, le badge actif de l'employe (s'il en a un) est desactive :
     * le nouveau le remplace. Seul un badge actif se modifie (numero, expiration).
     */
    public JSONObject enregistrer(JSONObject s, TUser operateur) {
        String id = StringUtils.trimToNull(s.optString("id", null));
        String employeId = StringUtils.trimToNull(s.optString("employeId", null));
        String numero = StringUtils.trimToNull(s.optString("numero", null));
        String saisie = util.ControleSaisie.premier(util.ControleSaisie.longueur("Le numéro du badge", numero, 40),
                util.ControleSaisie.date("La date d'expiration", s.optString("dtExpiration", null)));
        if (saisie != null) {
            return refus(saisie);
        }
        LocalDate expiration = StringUtils.isBlank(s.optString("dtExpiration", null)) ? null
                : LocalDate.parse(s.optString("dtExpiration").substring(0, 10));
        if (expiration != null && expiration.isBefore(LocalDate.now())) {
            return refus("La date d'expiration est déjà passée.");
        }
        if (numero != null && !numero.matches("[A-Za-z0-9-]+")) {
            return refus("Le numéro du badge ne contient que des lettres, des chiffres et des tirets.");
        }
        String auteur = operateur == null ? null : operateur.getLgUSERID();
        if (id == null) {
            if (employeId == null
                    || premier("SELECT id FROM t_employe WHERE id = ?1 AND statut = 'ACTIF'", employeId) == null) {
                return refus("Choisissez un employé actif.");
            }
            if (numero == null) {
                numero = numeroLibre();
            }
            String porte = porteur(numero, employeId);
            if (porte != null) {
                return refus("Ce numéro est déjà porté par " + porte + ".");
            }
            String ancien = premier("SELECT numero FROM t_rh_badge WHERE employe_id = ?1 AND statut = 'ACTIF'",
                    employeId);
            if (ancien != null) {
                desactiverActif(employeId, "Remplacé par le badge " + numero, auteur);
            }
            id = UUID.randomUUID().toString();
            em.createNativeQuery("INSERT INTO t_rh_badge (id, employe_id, numero, statut, dt_emission, dt_expiration,"
                    + " created_at, created_by) VALUES (?1, ?2, ?3, 'ACTIF', CURDATE(), ?4, NOW(), ?5)")
                    .setParameter(1, id).setParameter(2, employeId).setParameter(3, numero)
                    .setParameter(4, expiration == null ? null : java.sql.Date.valueOf(expiration))
                    .setParameter(5, auteur).executeUpdate();
            recopier(employeId, numero);
            return new JSONObject().put("success", true).put("id", id).put("numero", numero).put("msg",
                    ancien == null ? "Badge " + numero + " créé."
                            : "Badge " + numero + " créé ; il remplace le badge " + ancien + ".");
        }
        String[] b = badge(id);
        if (b == null) {
            return refus("Badge introuvable.");
        }
        if (!ACTIF.equals(b[1])) {
            return refus("Ce badge est désactivé : créez-en un nouveau.");
        }
        if (numero == null) {
            numero = b[2];
        }
        String porte = porteur(numero, b[0]);
        if (porte != null) {
            return refus("Ce numéro est déjà porté par " + porte + ".");
        }
        em.createNativeQuery("UPDATE t_rh_badge SET numero = ?1, dt_expiration = ?2, updated_at = NOW() WHERE id = ?3")
                .setParameter(1, numero).setParameter(2, expiration == null ? null : java.sql.Date.valueOf(expiration))
                .setParameter(3, id).executeUpdate();
        recopier(b[0], numero);
        return new JSONObject().put("success", true).put("id", id).put("numero", numero).put("msg",
                "Badge " + numero + " enregistré.");
    }

    /** Desactiver un badge actif (perdu, rendu, abime...) : il n'est plus reconnu au pointage. */
    public JSONObject desactiver(String id, String motif, TUser operateur) {
        String[] b = badge(id);
        if (b == null) {
            return refus("Badge introuvable.");
        }
        if (!ACTIF.equals(b[1])) {
            return refus("Ce badge est déjà désactivé.");
        }
        String m = StringUtils.abbreviate(StringUtils.defaultIfBlank(StringUtils.trimToNull(motif), "Désactivé"), 200);
        desactiverActif(b[0], m, operateur == null ? null : operateur.getLgUSERID());
        return new JSONObject().put("success", true).put("msg",
                "Badge " + b[2] + " désactivé : il n'est plus reconnu au pointage.");
    }

    /**
     * Fiche employe (numero saisi dans la fiche) : l'historique suit. Nouveau numero : l'ancien badge actif est
     * desactive et le nouveau devient actif ; numero efface : le badge actif est desactive.
     */
    public void suivreFicheEmploye(String employeId, String numero, TUser operateur) {
        String actif = premier("SELECT numero FROM t_rh_badge WHERE employe_id = ?1 AND statut = 'ACTIF'", employeId);
        String n = StringUtils.trimToNull(numero);
        if (StringUtils.equals(actif, n)) {
            return;
        }
        String auteur = operateur == null ? null : operateur.getLgUSERID();
        if (actif != null) {
            desactiverActif(employeId,
                    n == null ? "Retiré depuis la fiche employé" : "Remplacé depuis la fiche employé par " + n, auteur);
        }
        if (n != null) {
            /*
             * un ancien badge desactive portant ce numero reste dans l'historique ; le nouveau est une nouvelle ligne
             */
            em.createNativeQuery(
                    "INSERT INTO t_rh_badge (id, employe_id, numero, statut, dt_emission, created_at, created_by)"
                            + " VALUES (?1, ?2, ?3, 'ACTIF', CURDATE(), NOW(), ?4)")
                    .setParameter(1, UUID.randomUUID().toString()).setParameter(2, employeId).setParameter(3, n)
                    .setParameter(4, auteur).executeUpdate();
        }
        recopier(employeId, n);
    }

    /** Badges a imprimer (dans l'ordre donne), impressions comptees. Seuls les badges actifs s'impriment. */
    public List<BadgePdf.Carte> pourImpression(Collection<String> ids) {
        return pourImpression(ids, false);
    }

    /**
     * Demande du 16/10 : avec qr, chaque carte porte un QR code (numero, login de l'employe, secret propre au badge).
     * Retour du 23/10 : le badge reste valable jusqu'a son expiration ; la reimpression redonne le meme QR (secret
     * garde chiffre). Un secret n'est tire qu'a la premiere impression en QR (ou si le secret garde est illisible) ;
     * seule la regeneration ({@link #regenererQr}) le change ensuite. Sans qr : code-barres du numero, secret inchange.
     */
    @SuppressWarnings("unchecked")
    public List<BadgePdf.Carte> pourImpression(Collection<String> ids, boolean qr) {
        List<BadgePdf.Carte> cartes = new ArrayList<>();
        for (String id : ids) {
            List<Object[]> r = em.createNativeQuery(
                    "SELECT b.numero, e.nom, e.prenoms, e.poste, e.matricule, b.dt_expiration, u.str_LOGIN"
                            + " FROM t_rh_badge b JOIN t_employe e ON e.id = b.employe_id"
                            + " LEFT JOIN t_user u ON u.lg_USER_ID = e.lg_USER_ID WHERE b.id = ?1 AND b.statut = 'ACTIF'")
                    .setParameter(1, id).getResultList();
            if (r.isEmpty()) {
                continue;
            }
            Object[] l = r.get(0);
            String contenuQr = null;
            if (qr) {
                String secret = secretConserve(id);
                if (secret == null) {
                    secret = nouveauSecret(id);
                }
                contenuQr = util.BadgeQr.contenu(t(l[0]), t(l[6]), secret);
            }
            cartes.add(new BadgePdf.Carte(t(l[0]), t(l[1]), t(l[2]), t(l[3]), t(l[4]),
                    l[5] == null ? null : LocalDate.parse(t(l[5])), contenuQr));
            em.createNativeQuery(
                    "UPDATE t_rh_badge SET nb_impressions = nb_impressions + 1, dt_impression = NOW() WHERE id = ?1")
                    .setParameter(1, id).executeUpdate();
        }
        return cartes;
    }

    /**
     * Retour du 23/10 : regenerer le QR d'un badge actif (exemplaire perdu, photographie...). Nouveau secret : les
     * exemplaires deja imprimes ne permettent plus de se connecter ; le badge (numero, expiration) ne change pas.
     */
    public JSONObject regenererQr(String id) {
        String[] b = badge(id);
        if (b == null) {
            return refus("Badge introuvable.");
        }
        if (!ACTIF.equals(b[1])) {
            return refus("Ce badge est désactivé : son QR ne peut pas être régénéré.");
        }
        nouveauSecret(id);
        return new JSONObject().put("success", true).put("id", id).put("msg", "QR du badge " + b[2]
                + " régénéré : les exemplaires déjà imprimés ne permettent plus de se connecter. Réimprimez le badge.");
    }

    /** Secret garde du badge, ou null (jamais imprime en QR, garde avant le 23/10, ou ne correspond plus). */
    @SuppressWarnings("unchecked")
    private String secretConserve(String id) {
        List<Object[]> r = em
                .createNativeQuery("SELECT secret_chiffre, secret_hash FROM t_rh_badge WHERE id = ?1"
                        + " AND secret_chiffre IS NOT NULL AND secret_hash IS NOT NULL")
                .setParameter(1, id).getResultList();
        if (r.isEmpty()) {
            return null;
        }
        try {
            String secret = new String(EmpreinteServiceImpl.dechiffrer(cle(), (byte[]) r.get(0)[0]),
                    java.nio.charset.StandardCharsets.UTF_8);
            return util.BadgeQr.empreinte(secret).equals(t(r.get(0)[1])) ? secret : null;
        } catch (java.security.GeneralSecurityException e) {
            // secret garde illisible (cle changee) : un nouveau sera tire, sans jamais journaliser son contenu
            return null;
        }
    }

    private String nouveauSecret(String id) {
        String secret = util.BadgeQr.nouveauSecret();
        em.createNativeQuery(
                "UPDATE t_rh_badge SET secret_hash = ?1, secret_chiffre = ?2, dt_secret = NOW() WHERE id = ?3")
                .setParameter(1, util.BadgeQr.empreinte(secret))
                .setParameter(2,
                        EmpreinteServiceImpl.chiffrer(cle(), secret.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                .setParameter(3, id).executeUpdate();
        return secret;
    }

    /** Cle AES-256 des secrets de badge, conservee en base (une ligne), creee au premier usage. */
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

    /**
     * Demande du 16/10 (connexion par badge) : identifiant de l'utilisateur dont le badge ouvre la session, ou
     * {@code null}. Exige un badge ACTIF non expire portant ce numero, un employe ACTIF rattache a un utilisateur actif
     * de ce login, et l'empreinte du secret lu egale a celle du dernier exemplaire imprime (comparaison a temps
     * constant). Ne dit pas laquelle des conditions manque.
     */
    @SuppressWarnings("unchecked")
    public String utilisateurDuBadge(String numero, String login, String secret) {
        if (StringUtils.isAnyBlank(numero, login, secret)) {
            return null;
        }
        List<Object[]> r = em
                .createNativeQuery("SELECT u.lg_USER_ID, b.secret_hash FROM t_rh_badge b"
                        + " JOIN t_employe e ON e.id = b.employe_id AND e.statut = 'ACTIF'"
                        + " JOIN t_user u ON u.lg_USER_ID = e.lg_USER_ID AND u.str_STATUT = 'enable'"
                        + " WHERE b.numero = ?1 AND b.statut = 'ACTIF' AND b.secret_hash IS NOT NULL"
                        + " AND (b.dt_expiration IS NULL OR b.dt_expiration >= CURDATE()) AND u.str_LOGIN = ?2")
                .setParameter(1, numero).setParameter(2, login).setMaxResults(1).getResultList();
        if (r.isEmpty()) {
            return null;
        }
        byte[] attendu = t(r.get(0)[1]).getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        byte[] lu = util.BadgeQr.empreinte(secret).getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        return java.security.MessageDigest.isEqual(attendu, lu) ? t(r.get(0)[0]) : null;
    }

    /**
     * Retour du 23/10 : raison d'un refus de connexion par badge, pour les traces du serveur seulement (jamais pour
     * l'ecran) : INCONNU, DESACTIVE, EXPIRE, EMPLOYE_INACTIF, SANS_UTILISATEUR, AUTRE_LOGIN, JAMAIS_IMPRIME_EN_QR ou
     * SECRET (secret d'un autre exemplaire : badge reimprime depuis).
     */
    @SuppressWarnings("unchecked")
    public String raisonDuRefus(String numero, String login) {
        List<Object[]> r = em.createNativeQuery(
                "SELECT b.statut AS badge, b.dt_expiration < CURDATE() AS expire, e.statut AS employe, u.str_STATUT AS compte,"
                        + " u.str_LOGIN AS login, b.secret_hash IS NULL AS sans_secret FROM t_rh_badge b JOIN t_employe e ON e.id = b.employe_id"
                        + " LEFT JOIN t_user u ON u.lg_USER_ID = e.lg_USER_ID WHERE b.numero = ?1"
                        + " ORDER BY b.statut = 'ACTIF' DESC, b.created_at DESC")
                .setParameter(1, StringUtils.defaultString(numero)).setMaxResults(1).getResultList();
        if (r.isEmpty()) {
            return "INCONNU";
        }
        Object[] l = r.get(0);
        if (!ACTIF.equals(t(l[0]))) {
            return "DESACTIVE";
        }
        if (l[1] != null && ((Number) l[1]).intValue() == 1) {
            return "EXPIRE";
        }
        if (!ACTIF.equals(t(l[2]))) {
            return "EMPLOYE_INACTIF";
        }
        if (l[4] == null || !"enable".equals(t(l[3]))) {
            return "SANS_UTILISATEUR";
        }
        if (!t(l[4]).equalsIgnoreCase(StringUtils.defaultString(login))) {
            return "AUTRE_LOGIN";
        }
        return ((Number) l[5]).intValue() == 1 ? "JAMAIS_IMPRIME_EN_QR" : "SECRET";
    }

    /** Nom abrege de l'officine (bandeau des cartes). */
    public String officine() {
        return StringUtils
                .defaultString(premier("SELECT COALESCE(NULLIF(str_NOM_ABREGE, ''), str_NOM_COMPLET) FROM t_officine"
                        + " ORDER BY lg_OFFICINE_ID = '1' DESC"));
    }

    /** employe, statut, numero ; null si inconnu. */
    @SuppressWarnings("unchecked")
    private String[] badge(String id) {
        List<Object[]> r = em.createNativeQuery("SELECT employe_id, statut, numero FROM t_rh_badge WHERE id = ?1")
                .setParameter(1, StringUtils.defaultString(id)).getResultList();
        return r.isEmpty() ? null : new String[] { t(r.get(0)[0]), t(r.get(0)[1]), t(r.get(0)[2]) };
    }

    /** Nom de l'autre employe qui porte deja ce numero (badge actif ou fiche), sinon null. */
    private String porteur(String numero, String employeId) {
        String nom = premier(
                "SELECT CONCAT(e.nom, ' ', COALESCE(e.prenoms, '')) FROM t_rh_badge b JOIN t_employe e ON e.id = b.employe_id"
                        + " WHERE b.numero_actif = ?1 AND b.employe_id <> ?2",
                numero, employeId);
        if (nom == null) {
            nom = premier("SELECT CONCAT(nom, ' ', COALESCE(prenoms, '')) FROM t_employe WHERE badge = ?1 AND id <> ?2",
                    numero, employeId);
        }
        return nom == null ? null : nom.trim();
    }

    private void desactiverActif(String employeId, String motif, String auteur) {
        em.createNativeQuery(
                "UPDATE t_rh_badge SET statut = 'DESACTIVE', motif = ?1, dt_desactivation = NOW(), desactive_par = ?2,"
                        + " updated_at = NOW() WHERE employe_id = ?3 AND statut = 'ACTIF'")
                .setParameter(1, motif).setParameter(2, auteur).setParameter(3, employeId).executeUpdate();
        recopier(employeId, null);
    }

    private void recopier(String employeId, String numero) {
        em.createNativeQuery("UPDATE t_employe SET badge = ?1, updated_at = NOW() WHERE id = ?2")
                .setParameter(1, numero).setParameter(2, employeId).executeUpdate();
    }
}
