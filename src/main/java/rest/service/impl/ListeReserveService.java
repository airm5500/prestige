package rest.service.impl;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;

import org.json.JSONArray;
import org.json.JSONObject;

import dal.TUser;
import rest.service.impl.reserve.RegleListeReserve;
import util.IdGenerator;

/**
 * Onglet « Liste réserve » de la gestion des reserves (15/11) : premiere configuration de la reserve sur une longue
 * liste de produits (base d'appaul), sans ouvrir la fiche de chaque produit.
 * <ul>
 * <li>liste filtree (recherche, emplacement, famille, grossiste, etat) : stock rayon, stock reserve, VMJ (prevision du
 * mois / 30, comme le reste de l'application), capacite maxi rayon et seuil mini rayon en base ;</li>
 * <li>identifiants de toute la recherche, pour « Cocher toute la recherche » ;</li>
 * <li>enregistrement en un seul envoi, controle ligne par ligne par {@link RegleListeReserve} : mise en reserve (ligne
 * de stock reserve a 0 creee si absente), retrait (seulement sans stock reserve ; capacite et seuil gardes, lignes de
 * suggestion encore ouvertes retirees), reglage.</li>
 * </ul>
 */
@Stateless
public class ListeReserveService {

    private static final Logger LOG = Logger.getLogger(ListeReserveService.class.getName());
    private static final String TYPE_STOCK_RESERVE = "2";
    public static final String MOTIF_RETRAIT = "Article retire de la reserve par la liste reserve";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Filtres de l'ecran ; etat : TOUS, EN_RESERVE, HORS_RESERVE, AVEC_STOCK, SANS_VENTE. */
    public static final class Filtres {
        public String recherche;
        public String zoneId;
        public String familleArticleId;
        public String grossisteId;
        public String etat;

        public static Filtres de(String recherche, String zoneId, String familleArticleId, String grossisteId,
                String etat) {
            Filtres f = new Filtres();
            f.recherche = vide(recherche) ? null : recherche.trim();
            f.zoneId = vide(zoneId) || "ALL".equals(zoneId) ? null : zoneId;
            f.familleArticleId = vide(familleArticleId) || "ALL".equals(familleArticleId) ? null : familleArticleId;
            f.grossisteId = vide(grossisteId) || "ALL".equals(grossisteId) ? null : grossisteId;
            f.etat = vide(etat) ? "TOUS" : etat.trim().toUpperCase();
            return f;
        }

        /** Libelle des filtres appliques, pour l'en-tete des editions. */
        public String libelle() {
            List<String> l = new ArrayList<>();
            if (recherche != null) {
                l.add("Recherche « " + recherche + " »");
            }
            switch (etat) {
            case "EN_RESERVE":
                l.add("En réserve");
                break;
            case "HORS_RESERVE":
                l.add("Hors réserve");
                break;
            case "AVEC_STOCK":
                l.add("Avec stock réserve");
                break;
            case "SANS_VENTE":
                l.add("Aucune vente");
                break;
            default:
                break;
            }
            return l.isEmpty() ? "Tous les produits" : String.join(" · ", l);
        }
    }

    static boolean vide(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static final String COLONNES = "f.lg_FAMILLE_ID AS id, CAST(f.int_CIP AS CHAR) AS cip, f.str_DESCRIPTION AS designation,"
            + " z.str_LIBELLEE AS emplacement, fa.str_LIBELLE AS famille, g.str_LIBELLE AS grossiste,"
            + " COALESCE(fs.int_NUMBER_AVAILABLE, 0) AS rayon,"
            + " COALESCE((SELECT SUM(t.int_NUMBER) FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
            + "   AND t.lg_TYPE_STOCK_ID = '" + TYPE_STOCK_RESERVE + "' AND t.lg_EMPLACEMENT_ID = ?1"
            + "   AND t.str_STATUT = 'enable'), 0) AS reserve,"
            + " pp.prevu_mois AS prevu, COALESCE(f.bool_RESERVE, 0) AS en_reserve, f.int_SEUIL_RESERVE AS capacite,"
            + " f.int_SEUIL_MINI_RAYON AS seuil";

    private static String depuis(Filtres f, List<Object> p) {
        StringBuilder w = new StringBuilder(" FROM t_famille f")
                .append(" JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND fs.lg_EMPLACEMENT_ID = ?1")
                .append("   AND fs.str_STATUT = 'enable'")
                .append(" LEFT JOIN t_prevision_produit pp ON pp.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND pp.lg_EMPLACEMENT_ID = ?1")
                .append(" LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID")
                .append(" LEFT JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID")
                .append(" LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID")
                .append(" WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0");
        if (f.recherche != null) {
            p.add("%" + f.recherche + "%");
            int i = p.size() + 1;
            w.append(" AND (f.int_CIP LIKE ?").append(i).append(" OR f.str_NAME LIKE ?").append(i)
                    .append(" OR f.str_DESCRIPTION LIKE ?").append(i).append(" OR f.int_EAN13 LIKE ?").append(i)
                    .append(")");
        }
        if (f.zoneId != null) {
            p.add(f.zoneId);
            w.append(" AND f.lg_ZONE_GEO_ID = ?").append(p.size() + 1);
        }
        if (f.familleArticleId != null) {
            p.add(f.familleArticleId);
            w.append(" AND f.lg_FAMILLEARTICLE_ID = ?").append(p.size() + 1);
        }
        if (f.grossisteId != null) {
            p.add(f.grossisteId);
            w.append(" AND f.lg_GROSSISTE_ID = ?").append(p.size() + 1);
        }
        switch (f.etat) {
        case "EN_RESERVE":
            w.append(" AND f.bool_RESERVE = 1");
            break;
        case "HORS_RESERVE":
            w.append(" AND COALESCE(f.bool_RESERVE, 0) = 0");
            break;
        case "AVEC_STOCK":
            w.append(" AND EXISTS (SELECT 1 FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID")
                    .append(" AND t.lg_TYPE_STOCK_ID = '" + TYPE_STOCK_RESERVE + "' AND t.lg_EMPLACEMENT_ID = ?1")
                    .append(" AND t.str_STATUT = 'enable' AND t.int_NUMBER > 0)");
            break;
        case "SANS_VENTE":
            w.append(" AND COALESCE(pp.prevu_mois, 0) <= 0");
            break;
        default:
            break;
        }
        return w.toString();
    }

    private static void parametres(Query q, String empl, List<Object> p) {
        q.setParameter(1, empl);
        for (int i = 0; i < p.size(); i++) {
            q.setParameter(i + 2, p.get(i));
        }
    }

    private static Integer entier(Object o) {
        return o == null ? null : ((Number) o).intValue();
    }

    /** VMJ = prevision du mois / 30, a deux decimales ; null sans prevision. */
    static Double vmj(Object prevuMois) {
        if (prevuMois == null) {
            return null;
        }
        return Math.round(((Number) prevuMois).doubleValue() / 30.0 * 100) / 100.0;
    }

    private static JSONObject ligne(Object[] r) {
        Double v = vmj(r[8]);
        Object enRes = r[9];
        boolean enReserve = enRes instanceof Boolean ? (Boolean) enRes
                : enRes != null && ((Number) enRes).intValue() == 1;
        return new JSONObject().put("id", r[0]).put("cip", r[1] == null ? "" : r[1])
                .put("designation", r[2] == null ? "" : r[2]).put("emplacement", r[3] == null ? "" : r[3])
                .put("famille", r[4] == null ? "" : r[4]).put("grossiste", r[5] == null ? "" : r[5])
                .put("stockRayon", ((Number) r[6]).intValue()).put("stockReserve", ((Number) r[7]).intValue())
                .put("vmj", v == null ? JSONObject.NULL : v).put("enReserve", enReserve)
                .put("capacite", r[10] == null ? JSONObject.NULL : entier(r[10]))
                .put("seuilMini", r[11] == null ? JSONObject.NULL : entier(r[11]));
    }

    /** Une page de la liste ; limit &lt;= 0 : toute la recherche (editions). */
    @SuppressWarnings("unchecked")
    public JSONObject liste(TUser user, Filtres f, int start, int limit) {
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        List<Object> p = new ArrayList<>();
        String from = depuis(f, p);
        Query c = em.createNativeQuery("SELECT COUNT(*)" + from);
        parametres(c, empl, p);
        long total = ((Number) c.getSingleResult()).longValue();
        Query q = em.createNativeQuery("SELECT " + COLONNES + from + " ORDER BY f.str_DESCRIPTION, f.lg_FAMILLE_ID");
        parametres(q, empl, p);
        if (limit > 0) {
            q.setFirstResult(Math.max(0, start));
            q.setMaxResults(limit);
        }
        JSONArray data = new JSONArray();
        for (Object[] r : (List<Object[]>) q.getResultList()) {
            data.put(ligne(r));
        }
        return new JSONObject().put("success", true).put("total", total).put("data", data);
    }

    /** Toute la recherche, sous forme courte (id, VMJ, etat), pour « Cocher toute la recherche ». */
    @SuppressWarnings("unchecked")
    public JSONObject tout(TUser user, Filtres f) {
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        List<Object> p = new ArrayList<>();
        Query q = em.createNativeQuery(
                "SELECT " + COLONNES + depuis(f, p) + " ORDER BY f.str_DESCRIPTION, f.lg_FAMILLE_ID");
        parametres(q, empl, p);
        JSONArray data = new JSONArray();
        for (Object[] r : (List<Object[]>) q.getResultList()) {
            JSONObject l = ligne(r);
            data.put(new JSONObject().put("id", l.get("id")).put("vmj", l.get("vmj"))
                    .put("enReserve", l.get("enReserve")).put("stockReserve", l.get("stockReserve"))
                    .put("capacite", l.get("capacite")).put("seuilMini", l.get("seuilMini")));
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data);
    }

    private static String marques(int n) {
        StringBuilder b = new StringBuilder();
        for (int k = 0; k < n; k++) {
            b.append(k == 0 ? "" : ", ").append('?').append(k + 2);
        }
        return b.toString();
    }

    /** Etat en base des produits envoyes, avec CIP et designation pour les refus. */
    @SuppressWarnings("unchecked")
    private Map<String, Object[]> etats(String empl, List<String> ids) {
        Map<String, Object[]> m = new HashMap<>();
        for (int i = 0; i < ids.size(); i += 500) {
            List<String> lot = ids.subList(i, Math.min(ids.size(), i + 500));
            Query q = em.createNativeQuery("SELECT f.lg_FAMILLE_ID AS id, COALESCE(f.bool_RESERVE, 0) AS en_reserve,"
                    + " COALESCE((SELECT SUM(t.int_NUMBER) FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
                    + "   AND t.lg_TYPE_STOCK_ID = '" + TYPE_STOCK_RESERVE
                    + "' AND t.lg_EMPLACEMENT_ID = ?1 AND t.str_STATUT = 'enable'), 0) AS reserve,"
                    + " f.int_SEUIL_RESERVE AS capacite, f.int_SEUIL_MINI_RAYON AS seuil, CAST(f.int_CIP AS CHAR) AS cip,"
                    + " f.str_DESCRIPTION AS designation,"
                    + " (SELECT COUNT(*) FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
                    + "   AND t.lg_TYPE_STOCK_ID = '" + TYPE_STOCK_RESERVE
                    + "' AND t.lg_EMPLACEMENT_ID = ?1 AND t.str_STATUT = 'enable') AS lignes"
                    + " FROM t_famille f WHERE f.lg_FAMILLE_ID IN (" + marques(lot.size()) + ") FOR UPDATE");
            q.setParameter(1, empl);
            for (int k = 0; k < lot.size(); k++) {
                q.setParameter(k + 2, lot.get(k));
            }
            for (Object[] r : (List<Object[]>) q.getResultList()) {
                m.put(String.valueOf(r[0]), r);
            }
        }
        return m;
    }

    /**
     * Enregistrement en un seul envoi. Corps : {@code {lignes: [{id, enReserve, capacite, seuilMini}]}}. Reponse :
     * nombres par action et refus ligne par ligne (les autres lignes sont enregistrees).
     */
    public JSONObject enregistrer(TUser user, JSONObject corps) {
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        JSONArray lignes = corps == null ? new JSONArray() : corps.optJSONArray("lignes");
        if (lignes == null) {
            lignes = new JSONArray();
        }
        List<String> ids = new ArrayList<>();
        for (int i = 0; i < lignes.length(); i++) {
            String id = lignes.getJSONObject(i).optString("id", "");
            if (!id.isEmpty() && !ids.contains(id)) {
                ids.add(id);
            }
        }
        Map<String, Object[]> etats = ids.isEmpty() ? new HashMap<>() : etats(empl, ids);
        int mis = 0, retires = 0, reglages = 0, inchanges = 0;
        JSONArray refus = new JSONArray();
        List<String> vus = new ArrayList<>();
        for (int i = 0; i < lignes.length(); i++) {
            JSONObject l = lignes.getJSONObject(i);
            String id = l.optString("id", "");
            Object[] r = etats.get(id);
            if (r == null || vus.contains(id)) {
                refus.put(new JSONObject().put("id", id).put("cip", "").put("designation", "").put("motif",
                        r == null ? "Produit introuvable." : "Produit envoyé deux fois."));
                continue;
            }
            vus.add(id);
            Object b = r[1];
            boolean enReserve = b instanceof Boolean ? (Boolean) b : ((Number) b).intValue() == 1;
            RegleListeReserve.Etat e = new RegleListeReserve.Etat(enReserve, ((Number) r[2]).intValue(), entier(r[3]),
                    entier(r[4]));
            RegleListeReserve.Decision d = RegleListeReserve.decider(l, e);
            switch (d.action) {
            case REFUS:
                refus.put(new JSONObject().put("id", id).put("cip", r[5] == null ? "" : r[5])
                        .put("designation", r[6] == null ? "" : r[6]).put("motif", d.motif));
                break;
            case MISE_EN_RESERVE:
                if (((Number) r[7]).intValue() == 0) {
                    em.createNativeQuery("INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID,"
                            + " lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED,"
                            + " str_STATUT, int_NUMBER) VALUES (?1, ?2, '" + TYPE_STOCK_RESERVE
                            + "', ?3, ?4, ?4, NOW(), NOW(), 'enable', 0)").setParameter(1, IdGenerator.getComplexId())
                            .setParameter(2, id).setParameter(3, empl)
                            .setParameter(4, (r[6] == null ? "" : String.valueOf(r[6])) + " Stock reserve")
                            .executeUpdate();
                }
                ecrireReglage(id, true, d);
                mis++;
                break;
            case RETRAIT:
                retirer(id, empl, d);
                retires++;
                break;
            case REGLAGE:
                ecrireReglage(id, true, d);
                reglages++;
                break;
            default:
                inchanges++;
                break;
            }
        }
        LOG.log(Level.INFO, "liste reserve : {0} mis en reserve, {1} retires, {2} reglages, {3} refus, {4} inchanges",
                new Object[] { mis, retires, reglages, refus.length(), inchanges });
        return new JSONObject().put("success", true).put("misEnReserve", mis).put("retires", retires)
                .put("reglages", reglages).put("inchanges", inchanges).put("refus", refus);
    }

    private void ecrireReglage(String id, boolean reserve, RegleListeReserve.Decision d) {
        em.createNativeQuery(
                "UPDATE t_famille SET bool_RESERVE = ?1, int_SEUIL_RESERVE = ?2, int_SEUIL_MINI_RAYON = ?3,"
                        + " dt_UPDATED = NOW() WHERE lg_FAMILLE_ID = ?4")
                .setParameter(1, reserve ? 1 : 0).setParameter(2, d.capacite).setParameter(3, d.seuilMini)
                .setParameter(4, id).executeUpdate();
    }

    /** Retrait : stock reserve nul (verifie par la regle) ; capacite et seuil gardes (reponse du 15/11). */
    private void retirer(String id, String empl, RegleListeReserve.Decision d) {
        em.createNativeQuery("DELETE FROM t_type_stock_famille WHERE lg_FAMILLE_ID = ?1 AND lg_TYPE_STOCK_ID = '"
                + TYPE_STOCK_RESERVE + "' AND lg_EMPLACEMENT_ID = ?2 AND COALESCE(int_NUMBER, 0) = 0")
                .setParameter(1, id).setParameter(2, empl).executeUpdate();
        ecrireReglage(id, false, d);
        em.createNativeQuery("UPDATE t_suggestion_reserve_detail d"
                + " JOIN t_suggestion_reserve s ON s.lg_SUGGESTION_RESERVE_ID = d.lg_SUGGESTION_RESERVE_ID"
                + " SET d.str_ETAT = 'SUPPRIMEE', d.str_MOTIF_LIGNE = ?1, d.dt_UPDATED = NOW()"
                + " WHERE d.lg_FAMILLE_ID = ?2 AND s.str_STATUT IN ('A_TRAITER', 'EN_COURS')"
                + " AND d.str_ETAT IN ('PROPOSEE', 'MODIFIEE', 'ECHEC')").setParameter(1, MOTIF_RETRAIT)
                .setParameter(2, id).executeUpdate();
    }
}
