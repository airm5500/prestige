package rest.service.extranet.ubipharm;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.extranet.commun.JournalCollecte;
import rest.service.extranet.commun.SourceExtranet;

/**
 * Cache des reapprovisionnements Ubipharm : tables {@code extranet_reappro} (une ligne par ligne lue, reperee par
 * collecte et position) et {@code extranet_reappro_agence} (disponibilites par agence de chaque ligne).
 * <ul>
 * <li>{@link #enregistrer} ecrit les lignes d'une collecte (en remplacant celles deja ecrites pour cette collecte)
 * ;</li>
 * <li>{@link #garderSeulement} n'est appele qu'une fois la collecte COMPLETE : il retire les collectes precedentes
 * ;</li>
 * <li>{@link #lire} ne rend que la derniere collecte complete, avec sa date ; jamais les cellules HTML brutes.</li>
 * </ul>
 * Requetes natives parametrees ; aucun texte n'est journalise.
 */
public final class ReapproDepot {

    public static final int TAILLE_MAX = 200;

    /** Filtres simples, tous facultatifs (null ou vide : pas de filtre). */
    public static final class Filtre {
        public String pscode;
        public String codeAgence;
        public String statut;
        /** Recherche dans la reference, la designation et le code. */
        public String recherche;
    }

    private final EntityManager em;

    public ReapproDepot(EntityManager em) {
        this.em = em;
    }

    public void enregistrer(long collecteId, List<LigneReapproUbipharm> lignes) {
        em.createNativeQuery("DELETE FROM extranet_reappro_agence WHERE collecte_id = ?1").setParameter(1, collecteId)
                .executeUpdate();
        em.createNativeQuery("DELETE FROM extranet_reappro WHERE collecte_id = ?1").setParameter(1, collecteId)
                .executeUpdate();
        for (LigneReapproUbipharm l : lignes) {
            em.createNativeQuery("INSERT INTO extranet_reappro (collecte_id, position, pscode, designation, code,"
                    + " categorie, details_json, date_affichee, date_jour, code_agence, statut, pscode_cache,"
                    + " cip_cache, etcoda_cache, cellules_brutes)"
                    + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)")
                    .setParameter(1, collecteId).setParameter(2, l.position).setParameter(3, l.pscode)
                    .setParameter(4, l.designation).setParameter(5, l.code).setParameter(6, l.categorie)
                    .setParameter(7, new JSONArray(l.details).toString()).setParameter(8, l.dateAffichee)
                    .setParameter(9, l.date == null ? null : java.sql.Date.valueOf(l.date))
                    .setParameter(10, l.codeAgence).setParameter(11, l.statut).setParameter(12, l.pscodeCache)
                    .setParameter(13, l.cipCache).setParameter(14, l.etcodaCache)
                    .setParameter(15, brutes(l.cellulesBrutes)).executeUpdate();
            int rang = 0;
            for (LigneReapproUbipharm.DisponibiliteAgence a : l.disponibilites) {
                em.createNativeQuery("INSERT INTO extranet_reappro_agence (collecte_id, position, rang, etcode, etlib,"
                        + " dispo, colisages_json, colisage_texte, data_colisage)"
                        + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)").setParameter(1, collecteId)
                        .setParameter(2, l.position).setParameter(3, rang++).setParameter(4, a.etcode)
                        .setParameter(5, a.etlib).setParameter(6, a.dispo)
                        .setParameter(7, a.colisages == null ? null : new JSONArray(a.colisages).toString())
                        .setParameter(8, a.colisageTexte).setParameter(9, a.dataColisage).executeUpdate();
            }
        }
    }

    /** Retire les collectes precedentes ; refuse si la collecte indiquee n'est pas COMPLETE. */
    public void garderSeulement(long collecteId) {
        JSONObject c = new JournalCollecte(em).une(collecteId);
        if (c == null || !JournalCollecte.COMPLETE.equals(c.optString("statut"))
                || !ReapproCollecteur.MODULE.equals(c.optString("module"))) {
            throw new IllegalStateException(
                    "Collecte " + collecteId + " non complète : les données précédentes sont gardées");
        }
        em.createNativeQuery("DELETE FROM extranet_reappro_agence WHERE collecte_id <> ?1").setParameter(1, collecteId)
                .executeUpdate();
        em.createNativeQuery("DELETE FROM extranet_reappro WHERE collecte_id <> ?1").setParameter(1, collecteId)
                .executeUpdate();
    }

    /**
     * Lignes de la derniere collecte complete, page par page (page 0 = premiere), dans l'ordre de l'extranet.
     *
     * @return { collecte, dateCollecte, total, page, taille, lignes } ; collecte null s'il n'y en a aucune
     */
    @SuppressWarnings("unchecked")
    public JSONObject lire(Filtre filtre, int page, int taille) {
        int t = Math.max(1, Math.min(taille, TAILLE_MAX));
        int p = Math.max(0, page);
        JSONObject r = new JSONObject().put("page", p).put("taille", t);
        JSONObject collecte = new JournalCollecte(em).derniereComplete(SourceExtranet.UBIPHARM,
                ReapproCollecteur.MODULE);
        if (collecte == null) {
            return r.put("collecte", JSONObject.NULL).put("dateCollecte", JSONObject.NULL).put("total", 0).put("lignes",
                    new JSONArray());
        }
        long id = collecte.getLong("id");
        r.put("collecte", collecte).put("dateCollecte", collecte.opt("fin"));

        List<Object> params = new ArrayList<>();
        params.add(id);
        StringBuilder w = new StringBuilder(" WHERE collecte_id = ?1");
        Filtre f = filtre == null ? new Filtre() : filtre;
        egal(w, params, "pscode", f.pscode);
        egal(w, params, "code_agence", f.codeAgence);
        egal(w, params, "statut", f.statut);
        if (rempli(f.recherche)) {
            String motif = "%" + echapper(f.recherche.trim()) + "%";
            int n = params.size();
            w.append(" AND (pscode LIKE ?").append(n + 1).append(" OR designation LIKE ?").append(n + 2)
                    .append(" OR code LIKE ?").append(n + 3).append(")");
            params.add(motif);
            params.add(motif);
            params.add(motif);
        }

        Query compte = em.createNativeQuery("SELECT COUNT(*) FROM extranet_reappro" + w);
        lier(compte, params);
        r.put("total", ((Number) compte.getSingleResult()).intValue());

        Query q = em.createNativeQuery("SELECT position, pscode, designation, code, categorie, details_json,"
                + " date_affichee, date_jour, code_agence, statut, pscode_cache, cip_cache, etcoda_cache"
                + " FROM extranet_reappro" + w + " ORDER BY position LIMIT " + t + " OFFSET " + ((long) p * t));
        lier(q, params);
        List<Object[]> rows = q.getResultList();
        JSONArray lignes = new JSONArray();
        if (rows.isEmpty()) {
            return r.put("lignes", lignes);
        }
        int min = Integer.MAX_VALUE, max = Integer.MIN_VALUE;
        for (Object[] o : rows) {
            int pos = ((Number) o[0]).intValue();
            min = Math.min(min, pos);
            max = Math.max(max, pos);
        }
        Map<Integer, JSONArray> agences = agences(id, min, max);
        for (Object[] o : rows) {
            int pos = ((Number) o[0]).intValue();
            lignes.put(new JSONObject().put("position", pos).put("pscode", n(o[1])).put("designation", n(o[2]))
                    .put("code", n(o[3])).put("categorie", n(o[4]))
                    .put("details", o[5] == null ? new JSONArray() : new JSONArray(o[5].toString()))
                    .put("dateAffichee", n(o[6])).put("date", o[7] == null ? JSONObject.NULL : o[7].toString())
                    .put("codeAgence", n(o[8])).put("statut", n(o[9]))
                    .put("disponibilites", agences.getOrDefault(pos, new JSONArray())).put("pscodeCache", n(o[10]))
                    .put("cipCache", n(o[11])).put("etcodaCache", n(o[12])));
        }
        return r.put("lignes", lignes);
    }

    @SuppressWarnings("unchecked")
    private Map<Integer, JSONArray> agences(long collecteId, int min, int max) {
        List<Object[]> rows = em
                .createNativeQuery("SELECT position, etcode, etlib, dispo, colisages_json,"
                        + " colisage_texte, data_colisage FROM extranet_reappro_agence"
                        + " WHERE collecte_id = ?1 AND position BETWEEN ?2 AND ?3 ORDER BY position, rang")
                .setParameter(1, collecteId).setParameter(2, min).setParameter(3, max).getResultList();
        Map<Integer, JSONArray> m = new HashMap<>();
        for (Object[] o : rows) {
            m.computeIfAbsent(((Number) o[0]).intValue(), k -> new JSONArray())
                    .put(new JSONObject().put("etcode", n(o[1])).put("etlib", n(o[2])).put("dispo", n(o[3]))
                            .put("colisages", o[4] == null ? JSONObject.NULL : new JSONArray(o[4].toString()))
                            .put("colisageTexte", n(o[5])).put("dataColisage", n(o[6])));
        }
        return m;
    }

    private static void egal(StringBuilder w, List<Object> params, String colonne, String valeur) {
        if (rempli(valeur)) {
            params.add(valeur.trim());
            w.append(" AND ").append(colonne).append(" = ?").append(params.size());
        }
    }

    private static void lier(Query q, List<Object> params) {
        for (int i = 0; i < params.size(); i++) {
            q.setParameter(i + 1, params.get(i));
        }
    }

    private static boolean rempli(String s) {
        return s != null && !s.trim().isEmpty();
    }

    static String echapper(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    /** Cellules brutes en tableau JSON (null garde distinct de ""). */
    static String brutes(List<String> cellules) {
        JSONArray a = new JSONArray();
        for (String c : cellules) {
            a.put(c == null ? JSONObject.NULL : c);
        }
        return a.toString();
    }

    private static Object n(Object o) {
        return o == null ? JSONObject.NULL : o.toString();
    }
}
