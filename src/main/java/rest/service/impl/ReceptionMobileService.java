package rest.service.impl;

import dal.TUser;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Reception BL et retour fournisseur mobiles (prestige_vente_app, docs/ETAPE_D_SERVEUR_RECEPTION_RETOUR.md, D10 a D16
 * et D18) : fonctions nouvelles, a cote des routes existantes qu'elles ne modifient pas. Chaque reponse porte « status
 * » (code HTTP) que la ressource retire avant de repondre.
 */
@Stateless
public class ReceptionMobileService {

    private static final Logger LOG = Logger.getLogger(ReceptionMobileService.class.getName());

    static final String STATUT_CLOS = "is_Closed";
    static final String PERIME = "is_Perime";
    /** D16 : un verrou sans signal depuis 2 minutes est abandonne. */
    static final int VERROU_SECONDES = 120;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /* ------------------------------------------------------------------ D10 */

    public JSONObject parametres() {
        return new JSONObject().put("success", true)
                .put("peremptionObligatoire", "1".equals(parametre("KEY_ACTIVATE_PEREMPTION_DATE", "0")))
                .put("moisPeremptionCourte", entier(parametre("KEY_RECEPTION_MOIS_PEREMPTION_COURTE", "6"), 6))
                .put("motifObligatoirePeremptionCourte",
                        "1".equals(parametre("KEY_RECEPTION_MOTIF_PEREMPTION_COURTE", "1")))
                .put("scansRepetesActifs", "1".equals(parametre("KEY_RECEPTION_SCANS_REPETES", "1")));
    }

    /* ------------------------------------------------------------------ D11 */

    /** Lots saisis sur une ligne de BL, avec l'auteur et l'heure. */
    @SuppressWarnings("unchecked")
    public JSONObject lotsDeLigne(String detailId) {
        Object[] ligne = ligneBl(detailId);
        if (ligne == null) {
            return statut(404, "LIGNE_INCONNUE", "Cette ligne de BL n'existe pas.");
        }
        JSONArray data = new JSONArray();
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT l.lg_LOT_ID, l.int_NUM_LOT,"
                + " DATE_FORMAT(l.dt_PEREMPTION, '%Y-%m-%d'), l.int_NUMBER, COALESCE(l.int_NUMBER_GRATUIT, 0),"
                + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, ''))), u.str_LOGIN,"
                + " DATE_FORMAT(l.dt_CREATED, '%Y-%m-%dT%H:%i:%s')"
                + " FROM t_lot l LEFT JOIN t_user u ON u.lg_USER_ID = l.lg_USER_ID"
                + " WHERE l.str_REF_LIVRAISON = ?1 AND l.lg_FAMILLE_ID = ?2 AND l.lg_GROSSISTE_ID = ?3"
                + " ORDER BY l.dt_CREATED").setParameter(1, ligne[1]).setParameter(2, ligne[2])
                .setParameter(3, ligne[3]).getResultList()) {
            data.put(new JSONObject().put("lotId", r[0]).put("numLot", texte(r[1]))
                    .put("datePeremption", r[2] == null ? JSONObject.NULL : r[2]).put("quantite", nombre(r[3]))
                    .put("ug", nombre(r[4])).put("utilisateur", StringUtils.defaultIfBlank(texte(r[5]), texte(r[6])))
                    .put("login", texte(r[6])).put("creeLe", r[7] == null ? JSONObject.NULL : r[7]));
        }
        return new JSONObject().put("status", 200).put("success", true).put("data", data);
    }

    /**
     * Efface UN lot de son BL (et non tous les lots de la ligne) : meme effet que l'effacement de l'ecran pour ce seul
     * lot (lignes d'entrepot de ce lot sur ce BL, unites gratuites de la ligne).
     */
    @SuppressWarnings("unchecked")
    public JSONObject supprimerLot(String lotId) {
        List<Object[]> l = em
                .createNativeQuery("SELECT l.str_REF_LIVRAISON, l.lg_FAMILLE_ID, l.lg_GROSSISTE_ID,"
                        + " l.int_NUM_LOT, COALESCE(l.int_NUMBER_GRATUIT, 0) FROM t_lot l WHERE l.lg_LOT_ID = ?1")
                .setParameter(1, lotId).getResultList();
        if (l.isEmpty()) {
            return statut(404, "LOT_INCONNU", "Ce lot n'existe plus.");
        }
        Object[] lot = l.get(0);
        List<Object[]> lignes = em.createNativeQuery("SELECT d.lg_BON_LIVRAISON_DETAIL, b.str_STATUT"
                + " FROM t_bon_livraison_detail d JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID"
                + " WHERE b.str_REF_LIVRAISON = ?1 AND d.lg_FAMILLE_ID = ?2 AND d.lg_GROSSISTE_ID = ?3"
                + " AND b.str_STATUT <> 'delete'").setParameter(1, lot[0]).setParameter(2, lot[1])
                .setParameter(3, lot[2]).getResultList();
        if (lignes.stream().anyMatch(x -> STATUT_CLOS.equals(x[1]))) {
            return statut(409, "BL_CLOTURE", "Ce BL est entré en stock : son lot ne peut plus être effacé.");
        }
        em.createNativeQuery("DELETE FROM t_lot WHERE lg_LOT_ID = ?1").setParameter(1, lotId).executeUpdate();
        // les lignes d'entrepot de ce numero ne partent que si aucun autre lot du meme numero ne reste sur ce BL
        Number restants = (Number) em
                .createNativeQuery("SELECT COUNT(*) FROM t_lot WHERE str_REF_LIVRAISON = ?1"
                        + " AND lg_FAMILLE_ID = ?2 AND lg_GROSSISTE_ID = ?3 AND int_NUM_LOT <=> ?4")
                .setParameter(1, lot[0]).setParameter(2, lot[1]).setParameter(3, lot[2]).setParameter(4, lot[3])
                .getSingleResult();
        if (restants.intValue() == 0) {
            em.createNativeQuery("DELETE FROM t_warehouse WHERE str_REF_LIVRAISON = ?1 AND lg_FAMILLE_ID = ?2"
                    + " AND lg_GROSSISTE_ID = ?3 AND int_NUM_LOT <=> ?4").setParameter(1, lot[0])
                    .setParameter(2, lot[1]).setParameter(3, lot[2]).setParameter(4, lot[3]).executeUpdate();
        }
        int gratuit = nombre(lot[4]);
        if (gratuit > 0 && lignes.size() == 1) {
            em.createNativeQuery("UPDATE t_bon_livraison_detail SET int_QTE_RECUE = int_QTE_RECUE - ?1,"
                    + " int_QTE_UG = int_QTE_UG - ?1, dt_UPDATED = NOW() WHERE lg_BON_LIVRAISON_DETAIL = ?2")
                    .setParameter(1, gratuit).setParameter(2, lignes.get(0)[0]).executeUpdate();
        }
        em.getEntityManagerFactory().getCache().evictAll();
        return new JSONObject().put("status", 200).put("success", true).put("msg", "Lot effacé.");
    }

    /* ------------------------------------------------------------------ D12 */

    public JSONObject enregistrerPeremptionCourte(JSONObject in, TUser user) {
        String detailId = StringUtils.trimToNull(in.optString("detailId", null));
        Object[] ligne = detailId == null ? null : ligneBl(detailId);
        if (ligne == null) {
            return statut(400, "LIGNE_INCONNUE", "Ligne de BL absente ou inconnue (detailId).");
        }
        String decision = StringUtils.upperCase(in.optString("decision", ""));
        if (!"ACCEPTE".equals(decision) && !"REFUSE".equals(decision)) {
            return statut(400, "DECISION_INVALIDE", "decision : ACCEPTE ou REFUSE.");
        }
        LocalDate peremption;
        try {
            peremption = LocalDate.parse(in.optString("datePeremption", "").trim().substring(0, 10));
        } catch (RuntimeException e) {
            return statut(400, "DATE_INVALIDE", "datePeremption attendue au format AAAA-MM-JJ.");
        }
        int quantite = in.optInt("quantite", -1);
        if (quantite < 0) {
            return statut(400, "QUANTITE_INVALIDE", "Quantité invalide.");
        }
        String motif = StringUtils.left(StringUtils.trimToNull(in.optString("motif", null)), 250);
        if ("ACCEPTE".equals(decision) && motif == null
                && "1".equals(parametre("KEY_RECEPTION_MOTIF_PEREMPTION_COURTE", "1"))) {
            return statut(400, "MOTIF_OBLIGATOIRE", "Le motif est obligatoire pour accepter une péremption courte.");
        }
        String id = UUID.randomUUID().toString();
        em.createNativeQuery("INSERT INTO t_reception_peremption_courte (id, lg_BON_LIVRAISON_ID,"
                + " lg_BON_LIVRAISON_DETAIL, lg_LOT_ID, num_lot, lg_FAMILLE_ID, lg_GROSSISTE_ID, dt_peremption,"
                + " jours_restants, quantite, valeur, decision, motif, lg_USER_ID, created_at) VALUES"
                + " (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, NOW())").setParameter(1, id)
                .setParameter(2, ligne[0]).setParameter(3, detailId)
                .setParameter(4, StringUtils.trimToNull(in.optString("lotId", null)))
                .setParameter(5, StringUtils.left(StringUtils.trimToNull(in.optString("numLot", null)), 40))
                .setParameter(6, ligne[2]).setParameter(7, ligne[3]).setParameter(8, java.sql.Date.valueOf(peremption))
                .setParameter(9, (int) ChronoUnit.DAYS.between(LocalDate.now(), peremption)).setParameter(10, quantite)
                .setParameter(11, (long) quantite * nombre(ligne[4])).setParameter(12, decision).setParameter(13, motif)
                .setParameter(14, user == null ? null : user.getLgUSERID()).executeUpdate();
        return new JSONObject().put("status", 200).put("success", true).put("id", id);
    }

    @SuppressWarnings("unchecked")
    public JSONObject peremptionsCourtes(LocalDate du, LocalDate au, String grossiste, String statut) {
        StringBuilder sql = new StringBuilder("SELECT p.id, b.str_REF_LIVRAISON, f.int_CIP, f.str_NAME,"
                + " g.str_LIBELLE, p.num_lot, DATE_FORMAT(p.dt_peremption, '%Y-%m-%d'), p.jours_restants,"
                + " p.quantite, p.valeur, p.decision, p.motif, p.statut,"
                + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, ''))),"
                + " DATE_FORMAT(p.created_at, '%Y-%m-%dT%H:%i:%s'), p.lg_GROSSISTE_ID"
                + " FROM t_reception_peremption_courte p"
                + " JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = p.lg_BON_LIVRAISON_ID"
                + " JOIN t_famille f ON f.lg_FAMILLE_ID = p.lg_FAMILLE_ID"
                + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = p.lg_GROSSISTE_ID"
                + " LEFT JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID WHERE p.created_at >= ?1 AND p.created_at < ?2");
        /* parametres numerotes dans l'ordre : un statut seul (sans grossiste) donnait ?4 sans ?3, erreur 500 */
        List<Object> filtres = new ArrayList<>();
        if (StringUtils.isNotBlank(grossiste)) {
            filtres.add(grossiste.trim());
            sql.append(" AND p.lg_GROSSISTE_ID = ?").append(2 + filtres.size());
        }
        if (StringUtils.isNotBlank(statut)) {
            filtres.add(statut.trim());
            sql.append(" AND p.statut = ?").append(2 + filtres.size());
        }
        sql.append(" ORDER BY p.created_at DESC");
        javax.persistence.Query q = em.createNativeQuery(sql.toString())
                .setParameter(1, Timestamp.valueOf(du.atStartOfDay()))
                .setParameter(2, Timestamp.valueOf(au.plusDays(1).atStartOfDay()));
        for (int i = 0; i < filtres.size(); i++) {
            q.setParameter(3 + i, filtres.get(i));
        }
        JSONArray data = new JSONArray();
        long valeur = 0;
        for (Object[] r : (List<Object[]>) q.getResultList()) {
            valeur += ((Number) r[9]).longValue();
            data.put(new JSONObject().put("id", r[0]).put("bl", texte(r[1])).put("cip", texte(r[2]))
                    .put("produit", texte(r[3])).put("grossiste", texte(r[4])).put("numLot", texte(r[5]))
                    .put("datePeremption", r[6]).put("joursRestants", nombre(r[7])).put("quantite", nombre(r[8]))
                    .put("valeur", ((Number) r[9]).longValue()).put("decision", r[10]).put("motif", texte(r[11]))
                    .put("statut", r[12]).put("utilisateur", texte(r[13])).put("le", r[14]));
        }
        return new JSONObject().put("status", 200).put("success", true).put("total", data.length())
                .put("valeur", valeur).put("data", data);
    }

    /** Nom de l'officine pour l'en-tete des editions. */
    public String officine() {
        List<?> l = em.createNativeQuery("SELECT COALESCE(NULLIF(str_NOM_ABREGE, ''), str_NOM_COMPLET) FROM t_officine"
                + " ORDER BY lg_OFFICINE_ID = '1' DESC").setMaxResults(1).getResultList();
        return l.isEmpty() || l.get(0) == null ? "" : l.get(0).toString();
    }

    public JSONObject statutPeremptionCourte(String id, String statut) {
        String s = StringUtils.upperCase(StringUtils.trimToEmpty(statut));
        if (!"A_TRAITER".equals(s) && !"RECLAME".equals(s) && !"AVOIR_RECU".equals(s)) {
            return statut(400, "STATUT_INVALIDE", "statut : A_TRAITER, RECLAME ou AVOIR_RECU.");
        }
        int n = em
                .createNativeQuery(
                        "UPDATE t_reception_peremption_courte SET statut = ?1, updated_at = NOW()" + " WHERE id = ?2")
                .setParameter(1, s).setParameter(2, id).executeUpdate();
        return n == 0 ? statut(404, "INCONNU", "Ligne inconnue.")
                : new JSONObject().put("status", 200).put("success", true);
    }

    /* ------------------------------------------------------------------ D13 */

    static final List<String> TYPES_ANOMALIE = java.util.Arrays.asList("PRODUIT_NON_PREVU", "ECART_QUANTITE",
            "LOT_PERIME_REFUSE", "PRODUIT_DIFFERENT_DATAMATRIX", "SERIE_DEJA_CONSOMMEE");

    public JSONObject enregistrerAnomalie(JSONObject in, TUser user) {
        String blId = StringUtils.trimToNull(in.optString("blId", null));
        if (blId == null || premier("SELECT lg_BON_LIVRAISON_ID FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = ?1",
                blId) == null) {
            return statut(400, "BL_INCONNU", "BL absent ou inconnu (blId).");
        }
        String type = StringUtils.upperCase(in.optString("type", ""));
        if (!TYPES_ANOMALIE.contains(type)) {
            return statut(400, "TYPE_INVALIDE", "type : " + String.join(", ", TYPES_ANOMALIE) + ".");
        }
        String produit = StringUtils.trimToNull(in.optString("produitId", null));
        String code = StringUtils.left(StringUtils.trimToNull(in.optString("code", null)), 120);
        if (produit == null && code == null) {
            return statut(400, "PRODUIT_ABSENT", "Produit (produitId) ou code scanné (code) attendu.");
        }
        String id = UUID.randomUUID().toString();
        em.createNativeQuery("INSERT INTO t_reception_anomalie (id, lg_BON_LIVRAISON_ID, lg_FAMILLE_ID, code_scanne,"
                + " type, quantite, commentaire, lg_USER_ID, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NOW())")
                .setParameter(1, id).setParameter(2, blId).setParameter(3, produit).setParameter(4, code)
                .setParameter(5, type).setParameter(6, in.has("quantite") ? in.optInt("quantite") : null)
                .setParameter(7, StringUtils.left(StringUtils.trimToNull(in.optString("commentaire", null)), 250))
                .setParameter(8, user == null ? null : user.getLgUSERID()).executeUpdate();
        return new JSONObject().put("status", 200).put("success", true).put("id", id);
    }

    @SuppressWarnings("unchecked")
    public JSONObject anomalies(String blId) {
        JSONArray data = new JSONArray();
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT a.id, a.type, a.lg_FAMILLE_ID, f.int_CIP,"
                + " f.str_NAME, a.code_scanne, a.quantite, a.commentaire, a.statut,"
                + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, ''))),"
                + " DATE_FORMAT(a.created_at, '%Y-%m-%dT%H:%i:%s') FROM t_reception_anomalie a"
                + " LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = a.lg_FAMILLE_ID"
                + " LEFT JOIN t_user u ON u.lg_USER_ID = a.lg_USER_ID WHERE a.lg_BON_LIVRAISON_ID = ?1"
                + " ORDER BY a.created_at").setParameter(1, blId).getResultList()) {
            data.put(new JSONObject().put("id", r[0]).put("type", r[1]).put("produitId", texte(r[2]))
                    .put("cip", texte(r[3])).put("produit", texte(r[4])).put("code", texte(r[5]))
                    .put("quantite", r[6] == null ? JSONObject.NULL : r[6]).put("commentaire", texte(r[7]))
                    .put("statut", r[8]).put("utilisateur", texte(r[9])).put("le", r[10]));
        }
        return new JSONObject().put("status", 200).put("success", true).put("data", data);
    }

    /* ------------------------------------------------------------------ D15 */

    @SuppressWarnings("unchecked")
    public JSONObject retoursEnPreparation(String blId, String utilisateur) {
        StringBuilder sql = new StringBuilder("SELECT r.lg_RETOUR_FRS_ID, r.str_REF_RETOUR_FRS, b.str_REF_LIVRAISON,"
                + " g.str_LIBELLE, (SELECT COUNT(*) FROM t_retour_fournisseur_detail d"
                + "   WHERE d.lg_RETOUR_FRS_ID = r.lg_RETOUR_FRS_ID AND d.str_STATUT <> 'delete'),"
                + " DATE_FORMAT(r.dt_CREATED, '%Y-%m-%dT%H:%i:%s'),"
                + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, ''))), r.lg_USER_ID,"
                + " r.lg_BON_LIVRAISON_ID FROM t_retour_fournisseur r"
                + " LEFT JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = r.lg_BON_LIVRAISON_ID"
                + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = r.lg_GROSSISTE_ID"
                + " LEFT JOIN t_user u ON u.lg_USER_ID = r.lg_USER_ID WHERE r.str_STATUT = 'is_Process'");
        if (StringUtils.isNotBlank(blId)) {
            sql.append(" AND r.lg_BON_LIVRAISON_ID = ?1");
        }
        if (StringUtils.isNotBlank(utilisateur)) {
            sql.append(" AND r.lg_USER_ID = ?2");
        }
        sql.append(" ORDER BY r.dt_CREATED DESC");
        javax.persistence.Query q = em.createNativeQuery(sql.toString());
        if (StringUtils.isNotBlank(blId)) {
            q.setParameter(1, blId.trim());
        }
        if (StringUtils.isNotBlank(utilisateur)) {
            q.setParameter(2, utilisateur.trim());
        }
        JSONArray data = new JSONArray();
        for (Object[] r : (List<Object[]>) q.getResultList()) {
            data.put(new JSONObject().put("lgRETOURFRSID", r[0]).put("strREFRETOURFRS", texte(r[1]))
                    .put("blId", texte(r[8])).put("blRef", texte(r[2])).put("grossiste", texte(r[3]))
                    .put("nbLignes", nombre(r[4])).put("creeLe", r[5]).put("utilisateur", texte(r[6]))
                    .put("utilisateurId", texte(r[7])));
        }
        return new JSONObject().put("status", 200).put("success", true).put("data", data);
    }

    /* ------------------------------------------------------------------ D16 */

    /**
     * Signal de presence (toutes les 20 s) ; avec une ligne et un lot, pose le verrou de cet utilisateur. Le verrou
     * d'un autre, encore vivant, sur la meme ligne ET le meme lot est signale (verrou), sans bloquer un autre lot du
     * meme produit.
     */
    @SuppressWarnings("unchecked")
    public JSONObject presence(String blId, TUser user, String appareil, String detailId, String numLot) {
        if (premier("SELECT lg_BON_LIVRAISON_ID FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = ?1", blId) == null) {
            return statut(404, "BL_INCONNU", "Ce BL n'existe pas.");
        }
        String app = StringUtils.left(StringUtils.defaultString(appareil).trim(), 80);
        String detail = StringUtils.trimToNull(detailId), lot = StringUtils.left(StringUtils.trimToNull(numLot), 40);
        Timestamp limite = Timestamp.valueOf(LocalDateTime.now().minusSeconds(VERROU_SECONDES));
        if (detail != null) {
            List<Object[]> autres = em.createNativeQuery("SELECT s.lg_USER_ID,"
                    + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, '')))"
                    + " FROM t_reception_session s LEFT JOIN t_user u ON u.lg_USER_ID = s.lg_USER_ID"
                    + " WHERE s.lg_BON_LIVRAISON_ID = ?1 AND s.lg_BON_LIVRAISON_DETAIL = ?2 AND s.num_lot <=> ?3"
                    + " AND s.dernier_signal >= ?4 AND NOT (s.lg_USER_ID = ?5 AND s.appareil = ?6)")
                    .setParameter(1, blId).setParameter(2, detail).setParameter(3, lot).setParameter(4, limite)
                    .setParameter(5, user.getLgUSERID()).setParameter(6, app).getResultList();
            if (!autres.isEmpty()) {
                enregistrerSignal(blId, user, app, null, null);
                return new JSONObject().put("status", 200).put("success", true).put("verrou", false)
                        .put("verrouPar", texte(autres.get(0)[1]))
                        .put("msg", texte(autres.get(0)[1]) + " traite déjà ce lot de ce produit.");
            }
        }
        enregistrerSignal(blId, user, app, detail, lot);
        return new JSONObject().put("status", 200).put("success", true).put("verrou", detail != null);
    }

    private void enregistrerSignal(String blId, TUser user, String app, String detail, String lot) {
        em.createNativeQuery("INSERT INTO t_reception_session (lg_BON_LIVRAISON_ID, lg_USER_ID, appareil,"
                + " lg_BON_LIVRAISON_DETAIL, num_lot, depuis, dernier_signal) VALUES (?1, ?2, ?3, ?4, ?5, NOW(), NOW())"
                + " ON DUPLICATE KEY UPDATE lg_BON_LIVRAISON_DETAIL = VALUES(lg_BON_LIVRAISON_DETAIL),"
                + " num_lot = VALUES(num_lot), dernier_signal = NOW(),"
                + " depuis = IF(dernier_signal < NOW() - INTERVAL " + VERROU_SECONDES + " SECOND, NOW(), depuis)")
                .setParameter(1, blId).setParameter(2, user.getLgUSERID()).setParameter(3, app).setParameter(4, detail)
                .setParameter(5, lot).executeUpdate();
    }

    /** Personnes presentes sur le BL (signal de moins de 2 minutes) et produit en cours. */
    @SuppressWarnings("unchecked")
    public JSONObject presents(String blId) {
        Timestamp limite = Timestamp.valueOf(LocalDateTime.now().minusSeconds(VERROU_SECONDES));
        em.createNativeQuery("DELETE FROM t_reception_session WHERE dernier_signal < NOW() - INTERVAL 1 DAY")
                .executeUpdate();
        JSONArray data = new JSONArray();
        for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT s.lg_USER_ID,"
                + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, ''))), s.appareil,"
                + " f.str_NAME, s.lg_BON_LIVRAISON_DETAIL, s.num_lot, DATE_FORMAT(s.depuis, '%Y-%m-%dT%H:%i:%s')"
                + " FROM t_reception_session s LEFT JOIN t_user u ON u.lg_USER_ID = s.lg_USER_ID"
                + " LEFT JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_DETAIL = s.lg_BON_LIVRAISON_DETAIL"
                + " LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                + " WHERE s.lg_BON_LIVRAISON_ID = ?1 AND s.dernier_signal >= ?2 ORDER BY s.depuis")
                .setParameter(1, blId).setParameter(2, limite).getResultList()) {
            data.put(new JSONObject().put("utilisateurId", r[0]).put("utilisateur", texte(r[1]))
                    .put("appareil", texte(r[2])).put("produitEnCours", texte(r[3])).put("detailId", texte(r[4]))
                    .put("numLot", texte(r[5])).put("depuis", r[6]));
        }
        return new JSONObject().put("status", 200).put("success", true).put("data", data);
    }

    /* ------------------------------------------------------------------ D18 */

    /**
     * Consomme un numero de serie DataMatrix (AI 21) ; faux si la boite a deja ete scannee. Le controle est fait par
     * l'index unique (GTIN, serie) : deux terminaux qui scannent la meme boite en meme temps ne passent pas tous deux.
     */
    public boolean consommerSerie(String gtin, String serie, String detailId, TUser user) {
        int n = em
                .createNativeQuery("INSERT IGNORE INTO t_serie_consommee (gtin, serie, lg_BON_LIVRAISON_DETAIL,"
                        + " lg_USER_ID, created_at) VALUES (?1, ?2, ?3, ?4, NOW())")
                .setParameter(1, gtin).setParameter(2, serie).setParameter(3, detailId)
                .setParameter(4, user == null ? null : user.getLgUSERID()).executeUpdate();
        return n == 1;
    }

    /* ------------------------------------------------------------------ outils */

    /** [blId, refBl, produitId, grossisteId, paf] d'une ligne de BL, ou null. */
    @SuppressWarnings("unchecked")
    Object[] ligneBl(String detailId) {
        List<Object[]> l = em.createNativeQuery("SELECT d.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON, d.lg_FAMILLE_ID,"
                + " d.lg_GROSSISTE_ID, COALESCE(d.int_PAF, 0) FROM t_bon_livraison_detail d"
                + " JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID"
                + " WHERE d.lg_BON_LIVRAISON_DETAIL = ?1").setParameter(1, detailId).getResultList();
        return l.isEmpty() ? null : l.get(0);
    }

    @SuppressWarnings("unchecked")
    private String premier(String sql, Object p) {
        List<Object> l = em.createNativeQuery(sql).setParameter(1, p).setMaxResults(1).getResultList();
        return l.isEmpty() || l.get(0) == null ? null : String.valueOf(l.get(0));
    }

    private String parametre(String cle, String defaut) {
        try {
            String v = premier("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?1", cle);
            return v == null ? defaut : v.trim();
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "parametre {0} illisible", cle);
            return defaut;
        }
    }

    private static int entier(String v, int defaut) {
        try {
            return Integer.parseInt(v.trim());
        } catch (RuntimeException e) {
            return defaut;
        }
    }

    private static int nombre(Object o) {
        return o instanceof Number ? ((Number) o).intValue() : 0;
    }

    private static String texte(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    static JSONObject statut(int status, String code, String msg) {
        return new JSONObject().put("status", status).put("success", false).put("code", code).put("msg", msg);
    }
}
