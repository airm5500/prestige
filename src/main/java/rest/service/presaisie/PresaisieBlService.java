package rest.service.presaisie;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.PersistenceException;
import javax.persistence.Query;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Pre-saisie des bons de livraison (plan avoir du 08/11, point 6, phase 1) : table t_presaisie_bl (migration V7.2.95).
 *
 * <p>
 * Phase 1 : on enregistre et on consulte. Une pre-saisie est « A saisir » ; elle passe a « Traite » quand le BL de meme
 * grossiste et de meme numero est cree depuis « Commande en cours » ({@link #marquerTraite}, appele a la fin de
 * OrderServiceImpl.creerBonLivraison). La selection d'une pre-saisie dans « Commande en cours » est pour la phase 2.
 */
@Stateless
public class PresaisieBlService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private static final String COLONNES = "p.lg_PRESAISIE_BL_ID, p.lg_GROSSISTE_ID, g.str_LIBELLE, p.str_NUMERO,"
            + " DATE_FORMAT(p.dt_DATE_BL, '%Y-%m-%d'), p.int_MHT, p.int_TVA, p.int_TTC, p.str_SEQ_CLIENT, p.lg_ORDER_ID,"
            + " o.str_REF_ORDER, p.str_ETAT, TRIM(CONCAT(IFNULL(uc.str_FIRST_NAME, ''), ' ', IFNULL(uc.str_LAST_NAME, ''))),"
            + " DATE_FORMAT(p.dt_CREE, '%Y-%m-%d %H:%i:%s'), DATE_FORMAT(p.dt_MODIFIE, '%Y-%m-%d %H:%i:%s'),"
            + " DATE_FORMAT(p.dt_TRAITE, '%Y-%m-%d %H:%i:%s'), p.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON,"
            + " DATE_FORMAT(p.dt_SUPPRIME, '%Y-%m-%d %H:%i:%s'), p.str_MOTIF_SUPPRESSION,"
            + " TRIM(CONCAT(IFNULL(ut.str_FIRST_NAME, ''), ' ', IFNULL(ut.str_LAST_NAME, ''))),"
            + " TRIM(CONCAT(IFNULL(us.str_FIRST_NAME, ''), ' ', IFNULL(us.str_LAST_NAME, '')))";
    private static final String JOINTURES = " FROM t_presaisie_bl p"
            + " JOIN t_grossiste g ON g.lg_GROSSISTE_ID = p.lg_GROSSISTE_ID"
            + " LEFT JOIN t_user uc ON uc.lg_USER_ID = p.lg_CREE_PAR"
            + " LEFT JOIN t_user ut ON ut.lg_USER_ID = p.lg_TRAITE_PAR"
            + " LEFT JOIN t_user us ON us.lg_USER_ID = p.lg_SUPPRIME_PAR"
            + " LEFT JOIN t_order o ON o.lg_ORDER_ID = p.lg_ORDER_ID"
            + " LEFT JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = p.lg_BON_LIVRAISON_ID";

    /** Filtres de la liste ; etat : A_SAISIR, TRAITE, SUPPRIME, ou TOUS (A saisir et Traite). */
    public static final class Filtres {

        public String grossisteId;
        public String etat;
        public String du;
        public String au;
        public String numero;
        public int start;
        public int limit = 50;
    }

    private static JSONObject ligne(Object[] r) {
        return new JSONObject().put("id", r[0]).put("grossisteId", r[1]).put("grossiste", r[2] == null ? "" : r[2])
                .put("numero", r[3]).put("date", r[4]).put("montantHt", nombre(r[5])).put("montantTva", nombre(r[6]))
                .put("montantTtc", nombre(r[7])).put("sequence", r[8] == null ? "" : r[8])
                .put("commandeId", r[9] == null ? "" : r[9]).put("commandeRef", r[10] == null ? "" : r[10])
                .put("etat", r[11]).put("etatLibelle", PresaisieBlRegles.libelleEtat((String) r[11]))
                .put("creePar", r[12] == null ? "" : r[12]).put("creeLe", r[13])
                .put("modifieLe", r[14] == null ? "" : r[14]).put("traiteLe", r[15] == null ? "" : r[15])
                .put("bonLivraisonId", r[16] == null ? "" : r[16]).put("bonLivraisonRef", r[17] == null ? "" : r[17])
                .put("supprimeLe", r[18] == null ? "" : r[18]).put("motifSuppression", r[19] == null ? "" : r[19])
                .put("traitePar", r[20] == null ? "" : r[20]).put("supprimePar", r[21] == null ? "" : r[21]);
    }

    private static long nombre(Object o) {
        return o == null ? 0 : ((Number) o).longValue();
    }

    private static String date(String d) {
        if (d == null || d.trim().isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(d.trim()).toString();
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    public JSONObject lister(Filtres f) {
        StringBuilder w = new StringBuilder(" WHERE 1 = 1");
        List<Object> p = new ArrayList<>();
        String etat = f.etat == null || f.etat.trim().isEmpty() ? PresaisieBlRegles.A_SAISIR : f.etat.trim();
        if ("TOUS".equals(etat)) {
            w.append(" AND p.str_ETAT <> 'SUPPRIME'");
        } else if (PresaisieBlRegles.etatConnu(etat)) {
            p.add(etat);
            w.append(" AND p.str_ETAT = ?").append(p.size());
        } else {
            return new JSONObject().put("success", false).put("msg", "État inconnu : " + etat);
        }
        if (f.grossisteId != null && !f.grossisteId.trim().isEmpty()) {
            p.add(f.grossisteId.trim());
            w.append(" AND p.lg_GROSSISTE_ID = ?").append(p.size());
        }
        String du = date(f.du);
        String au = date(f.au);
        if (f.du != null && !f.du.trim().isEmpty() && du == null
                || f.au != null && !f.au.trim().isEmpty() && au == null) {
            return new JSONObject().put("success", false).put("msg", "Période illisible (attendu AAAA-MM-JJ).");
        }
        if (du != null) {
            p.add(du);
            w.append(" AND p.dt_DATE_BL >= ?").append(p.size());
        }
        if (au != null) {
            p.add(au);
            w.append(" AND p.dt_DATE_BL <= ?").append(p.size());
        }
        String numero = PresaisieBlRegles.normaliserNumero(f.numero);
        if (numero != null) {
            p.add("%" + numero.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
            w.append(" AND p.str_NUMERO LIKE ?").append(p.size());
        }
        Query total = em.createNativeQuery("SELECT COUNT(*), IFNULL(SUM(p.int_MHT), 0), IFNULL(SUM(p.int_TVA), 0),"
                + " IFNULL(SUM(p.int_TTC), 0) FROM t_presaisie_bl p" + w);
        Query liste = em.createNativeQuery("SELECT " + COLONNES + JOINTURES + w
                + " ORDER BY p.dt_DATE_BL DESC, p.dt_CREE DESC, p.lg_PRESAISIE_BL_ID");
        for (int i = 0; i < p.size(); i++) {
            total.setParameter(i + 1, p.get(i));
            liste.setParameter(i + 1, p.get(i));
        }
        Object[] t = (Object[]) total.getSingleResult();
        int limit = f.limit <= 0 ? 50 : Math.min(f.limit, 500);
        liste.setFirstResult(Math.max(f.start, 0)).setMaxResults(limit);
        JSONArray data = new JSONArray();
        for (Object o : liste.getResultList()) {
            data.put(ligne((Object[]) o));
        }
        return new JSONObject().put("success", true).put("total", nombre(t[0])).put("data", data).put("totaux",
                new JSONObject().put("montantHt", nombre(t[1])).put("montantTva", nombre(t[2])).put("montantTtc",
                        nombre(t[3])));
    }

    public JSONObject lire(String id) {
        List<?> l = em.createNativeQuery("SELECT " + COLONNES + JOINTURES + " WHERE p.lg_PRESAISIE_BL_ID = ?1")
                .setParameter(1, id).getResultList();
        return l.isEmpty() ? null : ligne((Object[]) l.get(0));
    }

    private String etat(String id) {
        List<?> l = em.createNativeQuery("SELECT str_ETAT FROM t_presaisie_bl WHERE lg_PRESAISIE_BL_ID = ?1")
                .setParameter(1, id).getResultList();
        return l.isEmpty() ? null : (String) l.get(0);
    }

    /** Controles qui demandent la base : grossiste, doublon, BL deja cree, commande. Null si tout va bien. */
    private String controlerEnBase(PresaisieBlRegles.Saisie s, String id) {
        List<?> g = em.createNativeQuery("SELECT str_LIBELLE FROM t_grossiste WHERE lg_GROSSISTE_ID = ?1")
                .setParameter(1, s.grossisteId).getResultList();
        if (g.isEmpty()) {
            return "Grossiste inconnu.";
        }
        String libelle = g.get(0) == null ? "" : String.valueOf(g.get(0));
        List<?> doublon = em
                .createNativeQuery("SELECT DATE_FORMAT(p.dt_CREE, '%d/%m/%Y'), p.str_ETAT FROM t_presaisie_bl p"
                        + " WHERE p.lg_GROSSISTE_ID = ?1 AND p.str_NUMERO = ?2 AND p.str_ETAT <> 'SUPPRIME'"
                        + " AND p.lg_PRESAISIE_BL_ID <> ?3")
                .setParameter(1, s.grossisteId).setParameter(2, s.numero).setParameter(3, id == null ? "" : id)
                .getResultList();
        if (!doublon.isEmpty()) {
            Object[] d = (Object[]) doublon.get(0);
            return "Le BL " + s.numero + " de " + libelle + " est déjà pré-saisi (le " + d[0] + ", "
                    + PresaisieBlRegles.libelleEtat((String) d[1]).toLowerCase(java.util.Locale.FRENCH)
                    + ") : il ne se saisit qu'une fois.";
        }
        List<?> bl = em
                .createNativeQuery("SELECT DATE_FORMAT(b.dt_CREATED, '%d/%m/%Y') FROM t_bon_livraison b"
                        + " JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID WHERE b.str_REF_LIVRAISON = ?1"
                        + " AND o.lg_GROSSISTE_ID = ?2 AND b.str_STATUT <> 'delete' LIMIT 1")
                .setParameter(1, s.numero).setParameter(2, s.grossisteId).getResultList();
        if (!bl.isEmpty()) {
            return "Le BL " + s.numero + " de " + libelle + " est déjà créé dans Prestige (le " + bl.get(0)
                    + ") : rien à pré-saisir.";
        }
        if (s.commandeId != null) {
            List<?> o = em.createNativeQuery("SELECT lg_GROSSISTE_ID, str_STATUT FROM t_order WHERE lg_ORDER_ID = ?1")
                    .setParameter(1, s.commandeId).getResultList();
            if (o.isEmpty()) {
                return "Commande inconnue.";
            }
            Object[] c = (Object[]) o.get(0);
            if (!s.grossisteId.equals(c[0])) {
                return "La commande choisie n'est pas une commande de " + libelle + ".";
            }
            boolean inchangee = id != null && !em
                    .createNativeQuery(
                            "SELECT 1 FROM t_presaisie_bl" + " WHERE lg_PRESAISIE_BL_ID = ?1 AND lg_ORDER_ID = ?2")
                    .setParameter(1, id).setParameter(2, s.commandeId).getResultList().isEmpty();
            if (!inchangee && !"is_Process".equals(c[1])) {
                return "La commande choisie n'est plus en cours.";
            }
        }
        return null;
    }

    private static JSONObject refus(String msg) {
        return new JSONObject().put("success", false).put("msg", msg);
    }

    private static boolean doublonEnBase(PersistenceException e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            if (t.getMessage() != null && t.getMessage().contains("uk_presaisie_bl_active")) {
                return true;
            }
        }
        return false;
    }

    public JSONObject creer(PresaisieBlRegles.Saisie s, String utilisateurId) {
        if (s.erreur != null) {
            return refus(s.erreur);
        }
        String motif = controlerEnBase(s, null);
        if (motif != null) {
            return refus(motif).put("doublon", motif.contains("déjà"));
        }
        String id = UUID.randomUUID().toString();
        try {
            em.createNativeQuery(
                    "INSERT INTO t_presaisie_bl (lg_PRESAISIE_BL_ID, lg_GROSSISTE_ID, str_NUMERO, dt_DATE_BL,"
                            + " int_MHT, int_TVA, int_TTC, str_SEQ_CLIENT, lg_ORDER_ID, str_ETAT, lg_CREE_PAR, dt_CREE)"
                            + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'A_SAISIR', ?10, NOW())")
                    .setParameter(1, id).setParameter(2, s.grossisteId).setParameter(3, s.numero)
                    .setParameter(4, s.date.toString()).setParameter(5, s.ht).setParameter(6, s.tva)
                    .setParameter(7, s.ttc()).setParameter(8, s.sequence).setParameter(9, s.commandeId)
                    .setParameter(10, utilisateurId).executeUpdate();
        } catch (PersistenceException e) {
            if (doublonEnBase(e)) {
                return refus("Le BL " + s.numero + " de ce grossiste vient d'être pré-saisi par un autre poste.")
                        .put("doublon", true);
            }
            throw e;
        }
        return new JSONObject().put("success", true).put("msg", "BL " + s.numero + " pré-saisi : à saisir.").put("data",
                lire(id));
    }

    public JSONObject modifier(String id, PresaisieBlRegles.Saisie s, String utilisateurId) {
        String etat = etat(id);
        if (etat == null) {
            return refus("Pré-saisie introuvable.");
        }
        if (!PresaisieBlRegles.modifiable(etat)) {
            return refus("Ce BL est « " + PresaisieBlRegles.libelleEtat(etat) + " » : il ne se modifie plus.");
        }
        if (s.erreur != null) {
            return refus(s.erreur);
        }
        String motif = controlerEnBase(s, id);
        if (motif != null) {
            return refus(motif).put("doublon", motif.contains("déjà"));
        }
        int n;
        try {
            n = em.createNativeQuery("UPDATE t_presaisie_bl SET lg_GROSSISTE_ID = ?2, str_NUMERO = ?3, dt_DATE_BL = ?4,"
                    + " int_MHT = ?5, int_TVA = ?6, int_TTC = ?7, str_SEQ_CLIENT = ?8, lg_ORDER_ID = ?9,"
                    + " lg_MODIFIE_PAR = ?10, dt_MODIFIE = NOW() WHERE lg_PRESAISIE_BL_ID = ?1 AND str_ETAT = 'A_SAISIR'")
                    .setParameter(1, id).setParameter(2, s.grossisteId).setParameter(3, s.numero)
                    .setParameter(4, s.date.toString()).setParameter(5, s.ht).setParameter(6, s.tva)
                    .setParameter(7, s.ttc()).setParameter(8, s.sequence).setParameter(9, s.commandeId)
                    .setParameter(10, utilisateurId).executeUpdate();
        } catch (PersistenceException e) {
            if (doublonEnBase(e)) {
                return refus("Le BL " + s.numero + " de ce grossiste vient d'être pré-saisi par un autre poste.")
                        .put("doublon", true);
            }
            throw e;
        }
        if (n == 0) {
            return refus("Ce BL vient de changer d'état : il ne se modifie plus.");
        }
        return new JSONObject().put("success", true).put("msg", "BL " + s.numero + " modifié.").put("data", lire(id));
    }

    public JSONObject supprimer(String id, String motif, String utilisateurId) {
        String etat = etat(id);
        if (etat == null) {
            return refus("Pré-saisie introuvable.");
        }
        if (!PresaisieBlRegles.modifiable(etat)) {
            return refus("Ce BL est « " + PresaisieBlRegles.libelleEtat(etat) + " » : il ne se supprime plus.");
        }
        String refus = PresaisieBlRegles.controlerMotif(motif);
        if (refus != null) {
            return refus(refus);
        }
        int n = em.createNativeQuery("UPDATE t_presaisie_bl SET str_ETAT = 'SUPPRIME', dt_SUPPRIME = NOW(),"
                + " lg_SUPPRIME_PAR = ?2, str_MOTIF_SUPPRESSION = ?3 WHERE lg_PRESAISIE_BL_ID = ?1 AND str_ETAT = 'A_SAISIR'")
                .setParameter(1, id).setParameter(2, utilisateurId).setParameter(3, motif.trim()).executeUpdate();
        if (n == 0) {
            return refus("Ce BL vient de changer d'état : il ne se supprime plus.");
        }
        return new JSONObject().put("success", true).put("msg", "Pré-saisie supprimée.").put("data", lire(id));
    }

    public JSONArray grossistes() {
        JSONArray a = new JSONArray();
        for (Object o : em.createNativeQuery("SELECT lg_GROSSISTE_ID, str_LIBELLE FROM t_grossiste"
                + " WHERE str_STATUT = 'enable' ORDER BY str_LIBELLE").getResultList()) {
            Object[] r = (Object[]) o;
            a.put(new JSONObject().put("id", r[0]).put("libelle", r[1] == null ? "" : r[1]));
        }
        return a;
    }

    /** Commandes en cours du grossiste, a lier (facultatif) a la pre-saisie. */
    public JSONArray commandes(String grossisteId) {
        JSONArray a = new JSONArray();
        for (Object o : em
                .createNativeQuery("SELECT o.lg_ORDER_ID, o.str_REF_ORDER, DATE_FORMAT(o.dt_CREATED, '%d/%m/%Y')"
                        + " FROM t_order o WHERE o.lg_GROSSISTE_ID = ?1 AND o.str_STATUT = 'is_Process'"
                        + " ORDER BY o.dt_CREATED DESC LIMIT 200")
                .setParameter(1, grossisteId).getResultList()) {
            Object[] r = (Object[]) o;
            a.put(new JSONObject().put("id", r[0]).put("reference", r[1]).put("date", r[2]).put("libelle",
                    r[1] + " du " + r[2]));
        }
        return a;
    }

    /**
     * Le BL de ce grossiste et de ce numero vient d'etre cree (OrderServiceImpl.creerBonLivraison) : la pre-saisie « A
     * saisir » correspondante passe a « Traite », avec la date, l'operateur et le lien vers le BL. Une seule ecriture ;
     * aucune pre-saisie : rien ne change.
     *
     * @param numero
     *            reference du BL telle que creerBonLivraison la range (trim + majuscules)
     *
     * @return nombre de pre-saisies passees a « Traite » (0 ou 1)
     */
    public static int marquerTraite(EntityManager em, String grossisteId, String numero, String bonLivraisonId,
            String utilisateurId) {
        String n = PresaisieBlRegles.normaliserNumero(numero);
        if (grossisteId == null || n == null) {
            return 0;
        }
        return em
                .createNativeQuery("UPDATE t_presaisie_bl SET str_ETAT = 'TRAITE', dt_TRAITE = NOW(),"
                        + " lg_TRAITE_PAR = ?3, lg_BON_LIVRAISON_ID = ?4 WHERE lg_GROSSISTE_ID = ?1 AND str_NUMERO = ?2"
                        + " AND str_ETAT = 'A_SAISIR'")
                .setParameter(1, grossisteId).setParameter(2, n).setParameter(3, utilisateurId)
                .setParameter(4, bonLivraisonId).executeUpdate();
    }
}
