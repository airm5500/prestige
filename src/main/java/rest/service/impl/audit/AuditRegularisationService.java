package rest.service.impl.audit;

import dal.TResumeCaisse;
import dal.TUser;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.ejb.SessionContext;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.BilletageService;
import rest.service.dto.BilletageDTO;
import util.Constant;

/**
 * AUDIT & RAPPROCHEMENTS, onglet Regularisations. Les regularisations APPLIQUEES par l'ecran (apres validation, droit
 * P_AUDIT_REGULARISER, commentaire obligatoire, journal t_audit_regularisation avec les valeurs d'avant) :
 * <ul>
 * <li>HISTO_DECON_204 : ligne de deconditionnement gonflee a la vente (« probleme 204 ») ;</li>
 * <li>HISTO_VENTE_DECON : ligne de vente partant du stock d'avant l'ouverture automatique d'une boite ;</li>
 * <li>HISTO_ENTREE_DEPOT : entree en stock d'un depot historisee en baisse ;</li>
 * <li>CAISSE_OUVERTE : caisse oubliee, fermee avec le montant compte, au nom de son caissier (meme traitement que la
 * fermeture habituelle).</li>
 * </ul>
 * Les trois premieres ne touchent que l'historique (hmvtproduit), jamais le stock reel ; memes conditions que le script
 * src/test/e2e/correction_204_suivi_mvt.sql, rejouees a l'application (une ligne deja corrigee ne l'est pas deux fois).
 */
@Stateless
public class AuditRegularisationService {

    public static final String DECON_204 = "HISTO_DECON_204", VENTE_DECON = "HISTO_VENTE_DECON",
            ENTREE_DEPOT = "HISTO_ENTREE_DEPOT", CAISSE = "CAISSE_OUVERTE";
    private static final DateTimeFormatter JJ_HH = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private BilletageService billetageService;
    @Resource
    private SessionContext contexte;

    /* ------------------------------------------------------------------ conditions (memes que le script) */

    /** d : ligne de deconditionnement gonflee ; v : la vente de la meme seconde. */
    private static final String JOINTURE_204 = " FROM hmvtproduit d JOIN hmvtproduit v ON v.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
            + " AND v.lg_EMPLACEMENT_ID = d.lg_EMPLACEMENT_ID AND v.createdAt = d.createdAt AND v.typeMvt = '02'"
            + " AND v.qteDebut = d.qteDebut - d.qteMvt WHERE d.typeMvt = '05' AND d.qteFinale = d.qteDebut + d.qteMvt";

    /** v : vente partant du stock d'avant ouverture ; d : le deconditionnement de la meme seconde. */
    private static final String JOINTURE_VENTE = " FROM hmvtproduit v JOIN hmvtproduit d ON d.lg_FAMILLE_ID = v.lg_FAMILLE_ID"
            + " AND d.lg_EMPLACEMENT_ID = v.lg_EMPLACEMENT_ID AND d.createdAt = v.createdAt AND d.typeMvt = '05'"
            + " WHERE v.typeMvt IN ('02', '12') AND v.qteDebut <> v.qteFinale + v.qteMvt"
            + " AND (d.qteFinale = v.qteFinale + v.qteMvt OR d.qteFinale - d.qteMvt = v.qteFinale + v.qteMvt)";

    /** h : entree en stock d'un depot historisee en baisse. */
    private static final String CONDITION_DEPOT = " FROM hmvtproduit h WHERE h.typeMvt = '01' AND h.lg_EMPLACEMENT_ID <> '1'"
            + " AND h.qteMvt > 0 AND h.qteFinale = h.qteDebut - h.qteMvt";

    private static String libelleType(String type) {
        switch (type) {
        case DECON_204:
            return "Historique : déconditionnement gonflé à la vente";
        case VENTE_DECON:
            return "Historique : vente après ouverture automatique d'une boîte";
        case ENTREE_DEPOT:
            return "Historique : entrée au dépôt écrite à l'envers";
        case CAISSE:
            return "Caisse oubliée à fermer";
        default:
            return type;
        }
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> lignes(String sql, Object... params) {
        javax.persistence.Query q = em.createNativeQuery(sql);
        for (int i = 0; i < params.length; i++) {
            q.setParameter(i + 1, params[i]);
        }
        return q.getResultList();
    }

    /* ------------------------------------------------------------------ propositions */

    /** Propositions par produit et emplacement (historique) et par caisse (caisses oubliees). */
    public JSONArray propositions() {
        JSONArray l = new JSONArray();
        historique(l, DECON_204,
                "SELECT d.lg_FAMILLE_ID f, d.lg_EMPLACEMENT_ID e, COUNT(*) n" + JOINTURE_204
                        + " GROUP BY d.lg_FAMILLE_ID, d.lg_EMPLACEMENT_ID",
                "La ligne de déconditionnement est diminuée de la quantité déconditionnée (stock avant et après).");
        historique(l, VENTE_DECON,
                "SELECT v.lg_FAMILLE_ID f, v.lg_EMPLACEMENT_ID e, COUNT(DISTINCT v.uuid) n" + JOINTURE_VENTE
                        + " GROUP BY v.lg_FAMILLE_ID, v.lg_EMPLACEMENT_ID",
                "Le stock avant de la vente devient son stock après + la quantité vendue.");
        historique(l, ENTREE_DEPOT,
                "SELECT h.lg_FAMILLE_ID f, h.lg_EMPLACEMENT_ID e, COUNT(*) n" + CONDITION_DEPOT
                        + " GROUP BY h.lg_FAMILLE_ID, h.lg_EMPLACEMENT_ID",
                "Le stock après de l'entrée devient son stock avant + la quantité entrée.");
        for (Object[] o : lignes(
                "SELECT rc.ld_CAISSE_ID caisse, CONCAT_WS(' ', u.str_FIRST_NAME, u.str_LAST_NAME) caissier,"
                        + " rc.dt_CREATED ouverture FROM t_resume_caisse rc JOIN t_user u ON u.lg_USER_ID = rc.lg_USER_ID"
                        + " WHERE rc.str_STATUT = ?1 AND DATE(rc.dt_CREATED) < CURDATE() ORDER BY rc.dt_CREATED",
                Constant.STATUT_IS_USING)) {
            String ouverture = o[2] instanceof Timestamp ? ((Timestamp) o[2]).toLocalDateTime().format(JJ_HH)
                    : String.valueOf(o[2]);
            l.put(new JSONObject().put("type", CAISSE).put("typeLibelle", libelleType(CAISSE))
                    .put("cle", String.valueOf(o[0])).put("objet", o[1] + ", caisse ouverte le " + ouverture)
                    .put("lignes", 1).put("montantRequis", true).put("effet",
                            "La caisse est fermée au nom de son caissier, avec le montant compté (même traitement que "
                                    + "la fermeture habituelle : billetage, solde, notification)."));
        }
        return l;
    }

    private void historique(JSONArray l, String type, String sql, String effet) {
        for (Object[] o : lignes(
                "SELECT x.f, x.e, x.n, fa.int_CIP cip, fa.str_NAME produit, em.str_NAME emplacement FROM (" + sql
                        + ") x JOIN t_famille fa ON fa.lg_FAMILLE_ID = x.f JOIN t_emplacement em ON em.lg_EMPLACEMENT_ID = x.e"
                        + " ORDER BY em.str_NAME, fa.str_NAME")) {
            l.put(new JSONObject().put("type", type).put("typeLibelle", libelleType(type)).put("cle", o[0] + "|" + o[1])
                    .put("objet", o[3] + " " + o[4] + " (" + o[5] + ")").put("lignes", ((Number) o[2]).intValue())
                    .put("montantRequis", false).put("effet", effet));
        }
    }

    /* ------------------------------------------------------------------ application */

    /**
     * Applique UNE regularisation validee. Rend {success, lignes, msg} ; rien n'est ecrit si la regularisation n'a plus
     * d'objet (deja appliquee, caisse deja fermee).
     */
    public JSONObject appliquer(String type, String cle, String commentaire, Long montant, TUser valideur) {
        if (commentaire == null || commentaire.trim().length() < 3) {
            return echec("Le commentaire est obligatoire (3 caractères au moins).");
        }
        if (cle == null || cle.isEmpty()) {
            return echec("Régularisation inconnue.");
        }
        if (CAISSE.equals(type)) {
            return fermerCaisse(cle, commentaire.trim(), montant, valideur);
        }
        String[] fe = cle.split("\\|", 2);
        if (fe.length != 2) {
            return echec("Régularisation inconnue.");
        }
        String avantSql, majSql;
        switch (type) {
        case DECON_204:
            avantSql = "SELECT d.uuid id, d.qteDebut debut, d.qteFinale fin" + JOINTURE_204
                    + " AND d.lg_FAMILLE_ID = ?1 AND d.lg_EMPLACEMENT_ID = ?2";
            majSql = "UPDATE hmvtproduit d JOIN hmvtproduit v ON v.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                    + " AND v.lg_EMPLACEMENT_ID = d.lg_EMPLACEMENT_ID AND v.createdAt = d.createdAt AND v.typeMvt = '02'"
                    + " AND v.qteDebut = d.qteDebut - d.qteMvt SET d.qteDebut = d.qteDebut - d.qteMvt,"
                    + " d.qteFinale = d.qteFinale - d.qteMvt WHERE d.typeMvt = '05' AND d.qteFinale = d.qteDebut + d.qteMvt"
                    + " AND d.lg_FAMILLE_ID = ?1 AND d.lg_EMPLACEMENT_ID = ?2";
            break;
        case VENTE_DECON:
            avantSql = "SELECT DISTINCT v.uuid id, v.qteDebut debut, v.qteFinale fin" + JOINTURE_VENTE
                    + " AND v.lg_FAMILLE_ID = ?1 AND v.lg_EMPLACEMENT_ID = ?2";
            majSql = "UPDATE hmvtproduit v JOIN hmvtproduit d ON d.lg_FAMILLE_ID = v.lg_FAMILLE_ID"
                    + " AND d.lg_EMPLACEMENT_ID = v.lg_EMPLACEMENT_ID AND d.createdAt = v.createdAt AND d.typeMvt = '05'"
                    + " SET v.qteDebut = v.qteFinale + v.qteMvt WHERE v.typeMvt IN ('02', '12')"
                    + " AND v.qteDebut <> v.qteFinale + v.qteMvt"
                    + " AND (d.qteFinale = v.qteFinale + v.qteMvt OR d.qteFinale - d.qteMvt = v.qteFinale + v.qteMvt)"
                    + " AND v.lg_FAMILLE_ID = ?1 AND v.lg_EMPLACEMENT_ID = ?2";
            break;
        case ENTREE_DEPOT:
            avantSql = "SELECT h.uuid id, h.qteDebut debut, h.qteFinale fin" + CONDITION_DEPOT
                    + " AND h.lg_FAMILLE_ID = ?1 AND h.lg_EMPLACEMENT_ID = ?2";
            majSql = "UPDATE hmvtproduit h SET h.qteFinale = h.qteDebut + h.qteMvt WHERE h.typeMvt = '01'"
                    + " AND h.lg_EMPLACEMENT_ID <> '1' AND h.qteMvt > 0 AND h.qteFinale = h.qteDebut - h.qteMvt"
                    + " AND h.lg_FAMILLE_ID = ?1 AND h.lg_EMPLACEMENT_ID = ?2";
            break;
        default:
            return echec("Régularisation inconnue.");
        }
        JSONArray avant = new JSONArray();
        for (Object[] o : lignes(avantSql, fe[0], fe[1])) {
            avant.put(new JSONObject().put("uuid", o[0]).put("qteDebut", o[1]).put("qteFinale", o[2]));
        }
        if (avant.length() == 0) {
            return echec("Cette régularisation n'a plus d'objet (déjà appliquée ?).");
        }
        int n = em.createNativeQuery(majSql).setParameter(1, fe[0]).setParameter(2, fe[1]).executeUpdate();
        journaliser(type, cle, objet(fe[0], fe[1]), commentaire.trim(), n, null, avant, valideur);
        return new JSONObject().put("success", true).put("lignes", n).put("msg",
                n + " ligne(s) d'historique corrigée(s).");
    }

    private String objet(String familleId, String emplacementId) {
        List<Object[]> r = lignes(
                "SELECT f.int_CIP cip, f.str_NAME produit, e.str_NAME emplacement FROM t_famille f, t_emplacement e"
                        + " WHERE f.lg_FAMILLE_ID = ?1 AND e.lg_EMPLACEMENT_ID = ?2",
                familleId, emplacementId);
        return r.isEmpty() ? familleId : r.get(0)[0] + " " + r.get(0)[1] + " (" + r.get(0)[2] + ")";
    }

    private JSONObject fermerCaisse(String caisseId, String commentaire, Long montant, TUser valideur) {
        if (montant == null || montant < 0 || montant > Integer.MAX_VALUE) {
            return echec("Indiquez le montant compté dans la caisse.");
        }
        TResumeCaisse rc = em.find(TResumeCaisse.class, caisseId);
        if (rc == null || !Constant.STATUT_IS_USING.equals(rc.getStrSTATUT())) {
            return echec("Cette caisse n'est plus ouverte.");
        }
        LocalDate ouverture = rc.getDtCREATED().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        if (!ouverture.isBefore(LocalDate.now())) {
            return echec("Une caisse ouverte aujourd'hui se ferme depuis la Gestion caisse.");
        }
        TUser caissier = rc.getLgUSERID();
        String objet = (caissier.getStrFIRSTNAME() + " " + caissier.getStrLASTNAME()).trim() + ", caisse ouverte le "
                + rc.getDtCREATED().toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime().format(JJ_HH);
        JSONArray avant = new JSONArray().put(new JSONObject().put("statut", rc.getStrSTATUT())
                .put("soldeSoir", rc.getIntSOLDESOIR()).put("caissier", caissier.getLgUSERID()));
        BilletageDTO b = new BilletageDTO();
        b.setResumeCaisseId(caisseId);
        b.setAutre(montant.intValue());
        try {
            billetageService.cloturerCaisse(b, caissier);
        } catch (Exception e) {
            contexte.setRollbackOnly(); // rien de la fermeture partielle n'est garde
            return echec("Fermeture refusée : " + e.getMessage());
        }
        journaliser(CAISSE, caisseId, objet, commentaire, 1, montant, avant, valideur);
        return new JSONObject().put("success", true).put("lignes", 1).put("msg", "Caisse fermée.");
    }

    private void journaliser(String type, String cle, String libelle, String commentaire, int n, Long montant,
            JSONArray avant, TUser u) {
        em.createNativeQuery(
                "INSERT INTO t_audit_regularisation (id, created_at, lg_USER_ID, auteur, type, cle, libelle,"
                        + " commentaire, lignes, montant, avant) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)")
                .setParameter(1, UUID.randomUUID().toString()).setParameter(2, Timestamp.valueOf(LocalDateTime.now()))
                .setParameter(3, u.getLgUSERID())
                .setParameter(4,
                        ((u.getStrFIRSTNAME() == null ? "" : u.getStrFIRSTNAME()) + " "
                                + (u.getStrLASTNAME() == null ? "" : u.getStrLASTNAME())).trim())
                .setParameter(5, type).setParameter(6, cle).setParameter(7, libelle)
                .setParameter(8, commentaire.length() > 1000 ? commentaire.substring(0, 1000) : commentaire)
                .setParameter(9, n).setParameter(10, montant).setParameter(11, avant.toString()).executeUpdate();
    }

    /* ------------------------------------------------------------------ journal */

    public JSONArray journal(int limite) {
        JSONArray l = new JSONArray();
        for (Object[] o : lignes(
                "SELECT created_at, auteur, type, libelle, commentaire, lignes, montant FROM t_audit_regularisation"
                        + " ORDER BY created_at DESC LIMIT " + Math.max(1, Math.min(limite, 1000)))) {
            l.put(new JSONObject()
                    .put("date",
                            o[0] instanceof Timestamp ? ((Timestamp) o[0]).toLocalDateTime().format(JJ_HH)
                                    : String.valueOf(o[0]))
                    .put("auteur", o[1] == null ? "" : o[1]).put("type", libelleType(String.valueOf(o[2])))
                    .put("objet", o[3] == null ? "" : o[3]).put("commentaire", o[4] == null ? "" : o[4])
                    .put("lignes", ((Number) o[5]).intValue()).put("montant", o[6] == null ? "" : o[6]));
        }
        return l;
    }

    private static JSONObject echec(String msg) {
        return new JSONObject().put("success", false).put("msg", msg);
    }
}
