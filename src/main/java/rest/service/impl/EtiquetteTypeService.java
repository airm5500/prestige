package rest.service.impl;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.pdf.LabelSheetPdf;

/**
 * Types d'etiquette par produit (Etiquettage Pro, retours du 11/10). Un type (t_typeetiquette, lg_TYPEETIQUETTE_ID de
 * la fiche article) peut designer un code (str_CODE : CODE128, DATAMATRIX, QR, DATAMATRIX_PLUS, QR_PLUS) ; les anciens
 * types, sans code, s'impriment comme avant (code du parametre). Mise a jour selective des produits (filtres zone
 * geographique, famille, grossiste, type actuel, recherche), tracee lot par lot dans t_etiquette_type_journal et
 * annulable.
 */
@Stateless
public class EtiquetteTypeService {

    /** Garde-fou : produits par mise a jour selective. */
    public static final int MAX_PRODUITS = 20000;
    static final String[] CODES = { LabelSheetPdf.CODE_BARRES, LabelSheetPdf.DATAMATRIX, LabelSheetPdf.QR,
            LabelSheetPdf.DATAMATRIX_PLUS, LabelSheetPdf.QR_PLUS };

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Code connu (un des 5), sinon null. */
    public static String codeValide(String code) {
        String c = StringUtils.trimToEmpty(code).toUpperCase(java.util.Locale.ROOT);
        for (String x : CODES) {
            if (x.equals(c)) {
                return x;
            }
        }
        return null;
    }

    /** Types d'etiquette avec leur code (vide pour les anciens) et leur nombre de produits actifs. */
    @SuppressWarnings("unchecked")
    public JSONArray types() {
        JSONArray a = new JSONArray();
        for (Object[] r : (List<Object[]>) em
                .createNativeQuery("SELECT t.lg_TYPEETIQUETTE_ID, t.str_NAME, t.str_DESCRIPTION,"
                        + " t.str_CODE, t.str_STATUT, (SELECT COUNT(*) FROM t_famille f WHERE f.lg_TYPEETIQUETTE_ID = t.lg_TYPEETIQUETTE_ID"
                        + " AND f.str_STATUT = 'enable') FROM t_typeetiquette t ORDER BY t.str_CODE IS NULL, t.str_NAME")
                .getResultList()) {
            a.put(new JSONObject().put("id", r[0]).put("nom", StringUtils.defaultString((String) r[1]))
                    .put("description", StringUtils.defaultString((String) r[2]))
                    .put("code", StringUtils.defaultString((String) r[3])).put("ancien", r[3] == null)
                    .put("actif", "enable".equals(r[4])).put("produits", ((Number) r[5]).intValue()));
        }
        return a;
    }

    /** Cree un type d'etiquette (nom unique, code obligatoire). Rend son identifiant. */
    public String creerType(String nom, String description, String code) {
        verifier(nom, code, null);
        String id = "TE_"
                + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase(java.util.Locale.ROOT);
        em.createNativeQuery("INSERT INTO t_typeetiquette (lg_TYPEETIQUETTE_ID, str_NAME, str_DESCRIPTION, dt_CREATED,"
                + " dt_UPDATED, str_STATUT, str_CODE) VALUES (?1, ?2, ?3, NOW(), NOW(), 'enable', ?4)")
                .setParameter(1, id).setParameter(2, nom.trim())
                .setParameter(3, StringUtils.defaultIfBlank(StringUtils.trimToEmpty(description), nom.trim()))
                .setParameter(4, codeValide(code)).executeUpdate();
        return id;
    }

    /** Modifie un type (pas les anciens types, gardes tels quels). */
    public void modifierType(String id, String nom, String description, String code, boolean actif) {
        Object[] t = type(id);
        if (t == null) {
            throw new IllegalArgumentException("Type d'étiquette introuvable.");
        }
        if (t[1] == null) {
            throw new IllegalArgumentException("Les types d'étiquette d'origine ne se modifient pas.");
        }
        verifier(nom, code, id);
        if (!actif) {
            Number n = (Number) em
                    .createNativeQuery(
                            "SELECT COUNT(*) FROM t_famille WHERE lg_TYPEETIQUETTE_ID = ?1 AND str_STATUT = 'enable'")
                    .setParameter(1, id).getSingleResult();
            if (n.intValue() > 0) {
                throw new IllegalArgumentException(
                        n + " produit(s) portent ce type : affectez-leur un autre type avant de" + " le désactiver.");
            }
        }
        em.createNativeQuery("UPDATE t_typeetiquette SET str_NAME = ?2, str_DESCRIPTION = ?3, str_CODE = ?4,"
                + " str_STATUT = ?5, dt_UPDATED = NOW() WHERE lg_TYPEETIQUETTE_ID = ?1").setParameter(1, id)
                .setParameter(2, nom.trim())
                .setParameter(3, StringUtils.defaultIfBlank(StringUtils.trimToEmpty(description), nom.trim()))
                .setParameter(4, codeValide(code)).setParameter(5, actif ? "enable" : "disable").executeUpdate();
    }

    @SuppressWarnings("unchecked")
    private Object[] type(String id) {
        List<Object[]> r = em.createNativeQuery(
                "SELECT lg_TYPEETIQUETTE_ID, str_CODE, str_STATUT FROM t_typeetiquette WHERE lg_TYPEETIQUETTE_ID = ?1")
                .setParameter(1, StringUtils.defaultString(id)).getResultList();
        return r.isEmpty() ? null : r.get(0);
    }

    private void verifier(String nom, String code, String sauf) {
        if (StringUtils.isBlank(nom)) {
            throw new IllegalArgumentException("Le nom du type est obligatoire.");
        }
        if (nom.trim().length() > 40) {
            throw new IllegalArgumentException("Nom trop long (40 caractères au plus).");
        }
        if (codeValide(code) == null) {
            throw new IllegalArgumentException(
                    "Choisissez le code du type (code-barres, DataMatrix, QR, DataMatrix+, QR+).");
        }
        Number n = (Number) em
                .createNativeQuery("SELECT COUNT(*) FROM t_typeetiquette WHERE UPPER(str_NAME) = UPPER(?1)"
                        + " AND lg_TYPEETIQUETTE_ID <> ?2")
                .setParameter(1, nom.trim()).setParameter(2, StringUtils.defaultString(sauf)).getSingleResult();
        if (n.intValue() > 0) {
            throw new IllegalArgumentException("Un type d'étiquette porte déjà ce nom.");
        }
    }

    /** Listes des filtres : zones geographiques, familles, grossistes (actifs). */
    @SuppressWarnings("unchecked")
    public JSONObject filtres() {
        JSONObject o = new JSONObject();
        o.put("zones", liste(
                "SELECT lg_ZONE_GEO_ID, CONCAT(IFNULL(str_LIBELLEE, ''), CASE WHEN str_CODE IS NULL OR str_CODE = ''"
                        + " THEN '' ELSE CONCAT(' (', str_CODE, ')') END) FROM t_zone_geographique WHERE str_STATUT = 'enable' ORDER BY 2"));
        o.put("familles",
                liste("SELECT lg_FAMILLEARTICLE_ID, str_LIBELLE FROM t_famillearticle WHERE str_STATUT = 'enable'"
                        + " ORDER BY str_LIBELLE"));
        o.put("grossistes", liste("SELECT lg_GROSSISTE_ID, str_LIBELLE FROM t_grossiste WHERE str_STATUT = 'enable'"
                + " ORDER BY str_LIBELLE"));
        return o;
    }

    @SuppressWarnings("unchecked")
    private JSONArray liste(String sql) {
        JSONArray a = new JSONArray();
        for (Object[] r : (List<Object[]>) em.createNativeQuery(sql).getResultList()) {
            a.put(new JSONObject().put("id", r[0]).put("libelle", StringUtils.defaultString((String) r[1])));
        }
        return a;
    }

    /** Clause des filtres (produits actifs) ; les parametres sont ajoutes a la liste dans l'ordre. */
    static String clause(JSONObject f, List<Object> params) {
        StringBuilder w = new StringBuilder(" WHERE f.str_STATUT = 'enable'");
        /* retours du 25/10 (point 7) : filtre a cases a cocher, plusieurs valeurs separees par des virgules */
        dansLaListe(w, "f.lg_ZONE_GEO_ID", f.optString("zone"), params);
        dansLaListe(w, "f.lg_FAMILLEARTICLE_ID", f.optString("famille"), params);
        dansLaListe(w, "f.lg_GROSSISTE_ID", f.optString("grossiste"), params);
        String type = f.optString("type");
        if ("AUCUN".equals(type)) {
            w.append(" AND (f.lg_TYPEETIQUETTE_ID IS NULL OR f.lg_TYPEETIQUETTE_ID = '')");
        } else if (StringUtils.isNotBlank(type)) {
            params.add(type);
            w.append(" AND f.lg_TYPEETIQUETTE_ID = ?").append(params.size());
        }
        String r = StringUtils.trimToEmpty(f.optString("recherche"));
        if (!r.isEmpty()) {
            params.add(r + "%");
            int i = params.size();
            params.add("%" + r + "%");
            w.append(" AND (f.int_CIP LIKE ?").append(i).append(" OR f.str_NAME LIKE ?").append(i + 1)
                    .append(" OR f.str_DESCRIPTION LIKE ?").append(i + 1).append(')');
        }
        return w.toString();
    }

    /** « colonne = ? » pour une valeur, « colonne IN (?, ?) » pour plusieurs ; rien si vide (ou « ALL »). */
    static void dansLaListe(StringBuilder w, String colonne, String valeurs, List<Object> params) {
        List<String> ids = new ArrayList<>();
        for (String v : StringUtils.defaultString(valeurs).split(",")) {
            String x = v.trim();
            if (!x.isEmpty() && !"ALL".equals(x) && !ids.contains(x)) {
                ids.add(x);
            }
        }
        if (ids.isEmpty()) {
            return;
        }
        w.append(" AND ").append(colonne).append(ids.size() == 1 ? " = " : " IN (");
        for (int i = 0; i < ids.size(); i++) {
            params.add(ids.get(i));
            w.append(i > 0 ? ", ?" : "?").append(params.size());
        }
        w.append(ids.size() == 1 ? "" : ")");
    }

    private static Query parametres(Query q, List<Object> params) {
        for (int i = 0; i < params.size(); i++) {
            q.setParameter(i + 1, params.get(i));
        }
        return q;
    }

    /** Produits du filtre, page par page, avec leur type actuel. */
    @SuppressWarnings("unchecked")
    public JSONObject produits(JSONObject filtres, int start, int limit) {
        List<Object> params = new ArrayList<>();
        String where = clause(filtres, params);
        Number total = (Number) parametres(em.createNativeQuery("SELECT COUNT(*) FROM t_famille f" + where), params)
                .getSingleResult();
        List<Object[]> lignes = parametres(em.createNativeQuery("SELECT f.lg_FAMILLE_ID, f.int_CIP, f.str_DESCRIPTION,"
                + " IFNULL(z.str_LIBELLEE, ''), IFNULL(fa.str_LIBELLE, ''), IFNULL(g.str_LIBELLE, ''), IFNULL(t.str_NAME, ''),"
                + " IFNULL(t.str_CODE, ''), IFNULL(f.lg_TYPEETIQUETTE_ID, '') FROM t_famille f"
                + " LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID"
                + " LEFT JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID"
                + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID"
                + " LEFT JOIN t_typeetiquette t ON t.lg_TYPEETIQUETTE_ID = f.lg_TYPEETIQUETTE_ID" + where
                + " ORDER BY f.str_DESCRIPTION, f.int_CIP"), params).setFirstResult(Math.max(0, start))
                        .setMaxResults(Math.max(1, Math.min(limit <= 0 ? 50 : limit, 500))).getResultList();
        JSONArray a = new JSONArray();
        for (Object[] r : lignes) {
            a.put(new JSONObject().put("id", r[0]).put("cip", StringUtils.defaultString((String) r[1]))
                    .put("designation", StringUtils.defaultString((String) r[2])).put("zone", r[3]).put("famille", r[4])
                    .put("grossiste", r[5]).put("type", r[6]).put("code", r[7]).put("typeId", r[8]));
        }
        return new JSONObject().put("total", total.intValue()).put("data", a);
    }

    /**
     * Mise a jour selective : les produits donnes (ou tout le filtre) recoivent ce type. Chaque produit qui change est
     * note au journal (ancien et nouveau type) sous un meme lot. Rend le lot et le nombre de produits modifies.
     */
    @SuppressWarnings("unchecked")
    public JSONObject affecter(String typeId, Collection<String> produits, JSONObject filtres, String utilisateur) {
        Object[] t = type(typeId);
        if (t == null || !"enable".equals(t[2])) {
            throw new IllegalArgumentException("Choisissez un type d'étiquette actif.");
        }
        List<Object> params = new ArrayList<>();
        String where;
        if (produits != null && !produits.isEmpty()) {
            if (produits.size() > MAX_PRODUITS) {
                throw new IllegalArgumentException("Trop de produits en une fois (" + MAX_PRODUITS + " au plus).");
            }
            StringBuilder in = new StringBuilder();
            for (String p : produits) {
                params.add(p);
                in.append(in.length() == 0 ? "" : ", ").append('?').append(params.size());
            }
            where = " WHERE f.str_STATUT = 'enable' AND f.lg_FAMILLE_ID IN (" + in + ")";
        } else if (filtres != null) {
            where = clause(filtres, params);
        } else {
            throw new IllegalArgumentException("Aucun produit choisi.");
        }
        params.add(typeId);
        int pType = params.size();
        where += " AND (f.lg_TYPEETIQUETTE_ID IS NULL OR f.lg_TYPEETIQUETTE_ID <> ?" + pType + ")";
        Number n = (Number) parametres(em.createNativeQuery("SELECT COUNT(*) FROM t_famille f" + where), params)
                .getSingleResult();
        if (n.intValue() > MAX_PRODUITS) {
            throw new IllegalArgumentException(
                    n + " produits : affinez le filtre (" + MAX_PRODUITS + " au plus en une fois).");
        }
        String lot = UUID.randomUUID().toString();
        params.add(lot);
        int pLot = params.size();
        params.add(StringUtils.abbreviate(StringUtils.defaultString(utilisateur), 100));
        int pUser = params.size();
        parametres(em.createNativeQuery("INSERT INTO t_etiquette_type_journal (id, lot, lg_FAMILLE_ID, ancien_type,"
                + " nouveau_type, utilisateur, dt_CREATED) SELECT UUID(), ?" + pLot
                + ", f.lg_FAMILLE_ID, f.lg_TYPEETIQUETTE_ID, ?" + pType + ", ?" + pUser + ", NOW() FROM t_famille f"
                + where), params).executeUpdate();
        int modifies = em.createNativeQuery("UPDATE t_famille f JOIN t_etiquette_type_journal j ON j.lg_FAMILLE_ID ="
                + " f.lg_FAMILLE_ID AND j.lot = ?1 SET f.lg_TYPEETIQUETTE_ID = j.nouveau_type, f.dt_UPDATED = NOW()")
                .setParameter(1, lot).executeUpdate();
        return new JSONObject().put("lot", lot).put("modifies", modifies);
    }

    /** Derniers lots de mise a jour (le plus recent d'abord). */
    @SuppressWarnings("unchecked")
    public JSONArray journal(int nombre) {
        JSONArray a = new JSONArray();
        for (Object[] r : (List<Object[]>) em
                .createNativeQuery("SELECT j.lot, DATE_FORMAT(MIN(j.dt_CREATED), '%d/%m/%Y %H:%i'),"
                        + " MIN(j.utilisateur), COUNT(*), MIN(t.str_NAME), CAST(MAX(j.annule) AS SIGNED) FROM t_etiquette_type_journal j"
                        + " LEFT JOIN t_typeetiquette t ON t.lg_TYPEETIQUETTE_ID = j.nouveau_type GROUP BY j.lot"
                        + " ORDER BY MIN(j.dt_CREATED) DESC")
                .setMaxResults(Math.max(1, nombre)).getResultList()) {
            a.put(new JSONObject().put("lot", r[0]).put("le", r[1]).put("par", StringUtils.defaultString((String) r[2]))
                    .put("produits", ((Number) r[3]).intValue()).put("type", StringUtils.defaultString((String) r[4]))
                    .put("annule", ((Number) r[5]).intValue() == 1));
        }
        return a;
    }

    /**
     * Annule un lot : chaque produit reprend son ancien type, s'il porte toujours le type donne par ce lot (un produit
     * modifie depuis n'est pas touche). Rend le nombre de produits remis.
     */
    public int annuler(String lot) {
        Number deja = (Number) em
                .createNativeQuery("SELECT COUNT(*) FROM t_etiquette_type_journal WHERE lot = ?1 AND annule = 1")
                .setParameter(1, StringUtils.defaultString(lot)).getSingleResult();
        if (deja.intValue() > 0) {
            throw new IllegalArgumentException("Cette mise à jour est déjà annulée.");
        }
        int remis = em
                .createNativeQuery(
                        "UPDATE t_famille f JOIN t_etiquette_type_journal j ON j.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
                                + " AND j.lot = ?1 SET f.lg_TYPEETIQUETTE_ID = j.ancien_type, f.dt_UPDATED = NOW()"
                                + " WHERE f.lg_TYPEETIQUETTE_ID = j.nouveau_type")
                .setParameter(1, StringUtils.defaultString(lot)).executeUpdate();
        em.createNativeQuery("UPDATE t_etiquette_type_journal SET annule = 1 WHERE lot = ?1")
                .setParameter(1, StringUtils.defaultString(lot)).executeUpdate();
        return remis;
    }

    /** Code d'etiquette de chaque produit (identifiant -> code) ; absent si le produit n'a pas de type a code. */
    @SuppressWarnings("unchecked")
    public Map<String, String> codesDesProduits(Collection<String> familles) {
        Map<String, String> m = new HashMap<>();
        List<String> ids = new ArrayList<>();
        for (String f : familles) {
            if (StringUtils.isNotBlank(f) && !ids.contains(f)) {
                ids.add(f);
            }
        }
        for (int i = 0; i < ids.size(); i += 1000) {
            for (Object[] r : (List<Object[]>) em
                    .createNativeQuery("SELECT f.lg_FAMILLE_ID, t.str_CODE FROM t_famille f"
                            + " JOIN t_typeetiquette t ON t.lg_TYPEETIQUETTE_ID = f.lg_TYPEETIQUETTE_ID WHERE t.str_CODE IS NOT NULL"
                            + " AND f.lg_FAMILLE_ID IN :ids")
                    .setParameter("ids", ids.subList(i, Math.min(ids.size(), i + 1000))).getResultList()) {
                if (codeValide((String) r[1]) != null) {
                    m.put((String) r[0], codeValide((String) r[1]));
                }
            }
        }
        return m;
    }

    /** Code d'etiquette par CIP (produits actifs de Prestige), pour Etiquettage Pro. */
    @SuppressWarnings("unchecked")
    public Map<String, String> codesParCip(Collection<String> cips) {
        Map<String, String> m = new HashMap<>();
        List<String> ids = new ArrayList<>();
        for (String c : cips) {
            if (StringUtils.isNotBlank(c) && !ids.contains(c.trim())) {
                ids.add(c.trim());
            }
        }
        for (int i = 0; i < ids.size(); i += 1000) {
            for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT f.int_CIP, t.str_CODE FROM t_famille f"
                    + " JOIN t_typeetiquette t ON t.lg_TYPEETIQUETTE_ID = f.lg_TYPEETIQUETTE_ID WHERE t.str_CODE IS NOT NULL"
                    + " AND f.str_STATUT = 'enable' AND f.int_CIP IN :ids")
                    .setParameter("ids", ids.subList(i, Math.min(ids.size(), i + 1000))).getResultList()) {
                if (codeValide((String) r[1]) != null) {
                    m.put((String) r[0], codeValide((String) r[1]));
                }
            }
        }
        return m;
    }
}
