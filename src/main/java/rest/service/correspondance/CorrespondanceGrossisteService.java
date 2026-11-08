package rest.service.correspondance;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.correspondance.CorrespondanceRegles.Decision;
import rest.service.correspondance.CorrespondanceRegles.Entree;
import rest.service.correspondance.CorrespondanceRegles.Etat;
import rest.service.correspondance.CorrespondanceRegles.Motif;
import rest.service.correspondance.CorrespondanceRegles.Source;

/**
 * Correspondance produits grossistes / Prestige, lot 1 : calcul sur les cles exactes a partir des codes deja connus
 * ({@code t_famille_grossiste}) et des CIP / EAN des fiches actives, puis lectures pour l'API. Les regles sont dans
 * {@link CorrespondanceRegles} (logique pure, testee seule). Ici : les requetes et l'ecriture.
 * <ul>
 * <li>Une ligne VALIDEE, REJETEE ou CONTREDITE n'est jamais reecrite, meme si elle a ete validee pendant le calcul
 * (garde dans le WHERE de la mise a jour).</li>
 * <li>Une ligne dont la decision n'a pas change n'est pas reecrite (dt_maj garde sa valeur).</li>
 * <li>Aucune fiche, aucune ligne de t_famille_grossiste n'est creee ni modifiee.</li>
 * </ul>
 * Journal : jamais de designation ni de code, seulement les compteurs.
 */
@Stateless
public class CorrespondanceGrossisteService {

    private static final Logger LOG = Logger.getLogger(CorrespondanceGrossisteService.class.getName());
    private static final int PAQUET = 500;
    private static final String FORMAT_DATE = "'%Y-%m-%d %H:%i:%s'";
    static final String ETATS_CONSERVES = "('VALIDEE','REJETEE','CONTREDITE')";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    // ------------------------------------------------------------------ calcul

    /** Ligne deja en base. */
    private static final class Existante {
        long id;
        String famille;
        Etat etat;
        Source source;
        Motif motif;
        BigDecimal score;
        String candidats;
    }

    public JSONObject calculerDepuisCodesGrossistes(String utilisateur) {
        long calculId = ouvrirCalcul("CODES_GROSSISTES", utilisateur);

        Map<String, Set<String>> parCle = indexCles();

        // (grossiste, code normalise) -> fiches actives portant ce code chez ce grossiste
        Map<String, Map<String, Set<String>>> parCode = new LinkedHashMap<>();
        @SuppressWarnings("unchecked")
        List<Object[]> fg = em.createNativeQuery("SELECT fg.lg_GROSSISTE_ID, fg.str_CODE_ARTICLE, fg.lg_FAMILLE_ID"
                + " FROM t_famille_grossiste fg JOIN t_famille f ON f.lg_FAMILLE_ID = fg.lg_FAMILLE_ID"
                + " JOIN t_grossiste g ON g.lg_GROSSISTE_ID = fg.lg_GROSSISTE_ID"
                + " WHERE fg.str_STATUT = 'enable' AND f.str_STATUT = 'enable'"
                + " AND fg.str_CODE_ARTICLE IS NOT NULL AND TRIM(fg.str_CODE_ARTICLE) <> ''"
                + " ORDER BY fg.lg_GROSSISTE_ID, fg.str_CODE_ARTICLE, fg.lg_FAMILLE_ID").getResultList();
        for (Object[] r : fg) {
            String code = CorrespondanceRegles.normaliser((String) r[1]);
            if (!code.isEmpty()) {
                parCode.computeIfAbsent((String) r[0], g -> new LinkedHashMap<>())
                        .computeIfAbsent(code, c -> new LinkedHashSet<>()).add((String) r[2]);
            }
        }

        Map<String, Existante> existantes = existantes();
        int lus = 0, creees = 0, modifiees = 0, inchangees = 0, conservees = 0, sansResultat = 0;
        List<Object[]> aInserer = new ArrayList<>();
        for (Map.Entry<String, Map<String, Set<String>>> g : parCode.entrySet()) {
            for (Map.Entry<String, Set<String>> c : g.getValue().entrySet()) {
                lus++;
                String code = c.getKey();
                Existante ex = existantes.get(g.getKey() + "|" + code);
                List<String> cle = new ArrayList<>(parCle.getOrDefault(code, Collections.emptySet()));
                Decision d = CorrespondanceRegles.decider(new Entree(code, new ArrayList<>(c.getValue()), cle,
                        ex == null ? null : ex.etat, ex == null ? null : ex.famille));
                if (d.motif == Motif.CONSERVEE) {
                    conservees++;
                } else if (!d.aEcrire()) {
                    sansResultat++;
                } else if (ex == null) {
                    aInserer.add(new Object[] { g.getKey(), code, d });
                    creees++;
                } else if (d.identiqueA(ex.etat, ex.famille, ex.source, ex.motif, ex.score, ex.candidats)) {
                    inchangees++;
                } else {
                    modifiees += mettreAJour(ex.id, d, calculId);
                }
            }
        }
        for (int i = 0; i < aInserer.size(); i += PAQUET) {
            inserer(aInserer.subList(i, Math.min(aInserer.size(), i + PAQUET)), calculId);
        }
        em.createNativeQuery("UPDATE correspondance_calcul SET fin = NOW(3), statut = 'COMPLET', codes_lus = ?1,"
                + " creees = ?2, modifiees = ?3, inchangees = ?4, conservees = ?5, sans_resultat = ?6 WHERE id = ?7")
                .setParameter(1, lus).setParameter(2, creees).setParameter(3, modifiees).setParameter(4, inchangees)
                .setParameter(5, conservees).setParameter(6, sansResultat).setParameter(7, calculId).executeUpdate();
        LOG.log(Level.INFO, "Correspondances grossistes, calcul {0} : {1} codes lus, {2} creees, {3} modifiees",
                new Object[] { calculId, lus, creees, modifiees });
        return calcul(calculId);
    }

    private long ouvrirCalcul(String origine, String utilisateur) {
        em.createNativeQuery("INSERT INTO correspondance_calcul (origine, utilisateur, debut, statut)"
                + " VALUES (?1, ?2, NOW(3), 'EN_COURS')").setParameter(1, origine).setParameter(2, utilisateur)
                .executeUpdate();
        return ((Number) em.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult()).longValue();
    }

    /** Cle normalisee (CIP, EAN13, CIP2-4) -> fiches actives. */
    private Map<String, Set<String>> indexCles() {
        Map<String, Set<String>> index = new HashMap<>();
        @SuppressWarnings("unchecked")
        List<Object[]> l = em.createNativeQuery("SELECT lg_FAMILLE_ID, int_CIP, int_EAN13, int_CIP2, int_CIP3, int_CIP4"
                + " FROM t_famille WHERE str_STATUT = 'enable'").getResultList();
        for (Object[] r : l) {
            for (int i = 1; i < r.length; i++) {
                String k = CorrespondanceRegles.normaliser(r[i] == null ? null : r[i].toString());
                if (!k.isEmpty()) {
                    index.computeIfAbsent(k, x -> new LinkedHashSet<>()).add((String) r[0]);
                }
            }
        }
        return index;
    }

    private Map<String, Existante> existantes() {
        Map<String, Existante> m = new HashMap<>();
        @SuppressWarnings("unchecked")
        List<Object[]> l = em
                .createNativeQuery("SELECT id, cle_grossiste, code_grossiste, lg_FAMILLE_ID, etat, source,"
                        + " motif, score, candidats FROM correspondance_grossiste WHERE lg_GROSSISTE_ID IS NOT NULL")
                .getResultList();
        for (Object[] r : l) {
            Existante e = new Existante();
            e.id = ((Number) r[0]).longValue();
            e.famille = (String) r[3];
            e.etat = enumOuNull(Etat.class, (String) r[4]);
            e.source = enumOuNull(Source.class, (String) r[5]);
            e.motif = enumOuNull(Motif.class, (String) r[6]);
            e.score = r[7] == null ? null : new BigDecimal(r[7].toString());
            e.candidats = (String) r[8];
            m.put(r[1] + "|" + r[2], e);
        }
        return m;
    }

    private static <E extends Enum<E>> E enumOuNull(Class<E> type, String v) {
        try {
            return v == null ? null : Enum.valueOf(type, v);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private void inserer(List<Object[]> lignes, long calculId) {
        StringBuilder sql = new StringBuilder("INSERT IGNORE INTO correspondance_grossiste (cle_grossiste,"
                + " lg_GROSSISTE_ID, code_grossiste, lg_FAMILLE_ID, etat, source, motif, score, candidats,"
                + " dt_creation, dt_maj, calcul_id) VALUES ");
        int p = 1;
        for (int i = 0; i < lignes.size(); i++) {
            sql.append(i == 0 ? "" : ",").append("(?").append(p++).append(",?").append(p++).append(",?").append(p++)
                    .append(",?").append(p++).append(",?").append(p++).append(",?").append(p++).append(",?").append(p++)
                    .append(",?").append(p++).append(",?").append(p++).append(",NOW(3),NOW(3),?").append(p++)
                    .append(")");
        }
        Query q = em.createNativeQuery(sql.toString());
        p = 1;
        for (Object[] l : lignes) {
            Decision d = (Decision) l[2];
            q.setParameter(p++, l[0]).setParameter(p++, l[0]).setParameter(p++, l[1]).setParameter(p++, d.familleId)
                    .setParameter(p++, d.etat.name()).setParameter(p++, d.source.name())
                    .setParameter(p++, d.motif.name()).setParameter(p++, d.score)
                    .setParameter(p++, CorrespondanceRegles.candidatsJson(d.candidats)).setParameter(p++, calculId);
        }
        q.executeUpdate();
    }

    private int mettreAJour(long id, Decision d, long calculId) {
        return em
                .createNativeQuery("UPDATE correspondance_grossiste SET lg_FAMILLE_ID = ?1, etat = ?2, source = ?3,"
                        + " motif = ?4, score = ?5, candidats = ?6, dt_maj = NOW(3), calcul_id = ?7"
                        + " WHERE id = ?8 AND etat NOT IN " + ETATS_CONSERVES)
                .setParameter(1, d.familleId).setParameter(2, d.etat.name()).setParameter(3, d.source.name())
                .setParameter(4, d.motif.name()).setParameter(5, d.score)
                .setParameter(6, CorrespondanceRegles.candidatsJson(d.candidats)).setParameter(7, calculId)
                .setParameter(8, id).executeUpdate();
    }

    // ------------------------------------------------------------------ lectures

    private static final String COLONNES = "c.id, c.cle_grossiste, c.lg_GROSSISTE_ID, c.source_extranet,"
            + " g.str_LIBELLE, c.code_grossiste, c.cip, c.ean, c.designation_grossiste, c.lg_FAMILLE_ID,"
            + " f.str_DESCRIPTION, f.int_CIP, f.str_STATUT, c.etat, c.source, c.motif, c.score, c.candidats,"
            + " c.nb_confirmations, c.nb_contradictions, DATE_FORMAT(c.dt_creation, " + FORMAT_DATE + "),"
            + " DATE_FORMAT(c.dt_maj, " + FORMAT_DATE + "), DATE_FORMAT(c.dt_derniere_confirmation, " + FORMAT_DATE
            + "), c.lg_USER_VALIDATION, DATE_FORMAT(c.dt_validation, " + FORMAT_DATE + "), c.calcul_id"
            + " FROM correspondance_grossiste c LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = c.lg_GROSSISTE_ID"
            + " LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = c.lg_FAMILLE_ID";

    private static final String[] NOMS = { "id", "cleGrossiste", "grossisteId", "sourceExtranet", "grossiste",
            "codeGrossiste", "cip", "ean", "designationGrossiste", "familleId", "famille", "familleCip",
            "familleStatut", "etat", "source", "motif", "score", "candidats", "nbConfirmations", "nbContradictions",
            "dateCreation", "dateMaj", "dateDerniereConfirmation", "utilisateurValidation", "dateValidation",
            "calculId" };

    private JSONArray lignes(List<Object[]> l) {
        Set<String> ids = new LinkedHashSet<>();
        List<JSONObject> objets = new ArrayList<>();
        for (Object[] r : l) {
            JSONObject o = new JSONObject();
            for (int i = 0; i < NOMS.length; i++) {
                Object v = r[i];
                if ("candidats".equals(NOMS[i])) {
                    JSONArray a = v == null ? new JSONArray() : new JSONArray(v.toString());
                    a.forEach(x -> ids.add(x.toString()));
                    o.put(NOMS[i], a);
                } else if (v instanceof BigDecimal || "score".equals(NOMS[i])) {
                    o.put(NOMS[i], v == null ? JSONObject.NULL : new BigDecimal(v.toString()));
                } else if (v instanceof Number) {
                    o.put(NOMS[i], ((Number) v).longValue());
                } else {
                    o.put(NOMS[i], v == null ? JSONObject.NULL : v.toString());
                }
            }
            objets.add(o);
        }
        // libelles des candidats, en une requete
        Map<String, JSONObject> fiches = fiches(ids);
        JSONArray res = new JSONArray();
        for (JSONObject o : objets) {
            JSONArray detail = new JSONArray();
            o.getJSONArray("candidats").forEach(x -> detail.put(fiches.getOrDefault(x.toString(),
                    new JSONObject().put("familleId", x.toString()).put("famille", JSONObject.NULL))));
            o.put("candidatsDetail", detail);
            res.put(o);
        }
        return res;
    }

    private Map<String, JSONObject> fiches(Set<String> ids) {
        Map<String, JSONObject> m = new HashMap<>();
        if (ids.isEmpty()) {
            return m;
        }
        List<String> liste = new ArrayList<>(ids);
        StringBuilder marques = new StringBuilder();
        for (int i = 1; i <= liste.size(); i++) {
            marques.append(i == 1 ? "?" : ",?").append(i);
        }
        Query q = em.createNativeQuery("SELECT lg_FAMILLE_ID, str_DESCRIPTION, int_CIP, int_EAN13, str_STATUT"
                + " FROM t_famille WHERE lg_FAMILLE_ID IN (" + marques + ")");
        for (int i = 0; i < liste.size(); i++) {
            q.setParameter(i + 1, liste.get(i));
        }
        @SuppressWarnings("unchecked")
        List<Object[]> l = q.getResultList();
        for (Object[] r : l) {
            m.put((String) r[0],
                    new JSONObject().put("familleId", r[0]).put("famille", r[1] == null ? JSONObject.NULL : r[1])
                            .put("cip", r[2] == null ? JSONObject.NULL : r[2])
                            .put("ean", r[3] == null ? JSONObject.NULL : r[3]).put("statut", r[4]));
        }
        return m;
    }

    /** Correspondances d'un produit : retenu, ou candidat d'une correspondance a valider. */
    public JSONObject produit(String familleId) {
        @SuppressWarnings("unchecked")
        List<Object[]> l = em.createNativeQuery("SELECT " + COLONNES + " WHERE c.lg_FAMILLE_ID = ?1"
                + " OR (c.lg_FAMILLE_ID IS NULL AND c.candidats LIKE ?2) ORDER BY g.str_LIBELLE, c.code_grossiste")
                .setParameter(1, familleId).setParameter(2, "%\"" + familleId.replace("%", "") + "\"%").getResultList();
        return new JSONObject().put("success", true).put("familleId", familleId).put("data", lignes(l));
    }

    /** File : filtres facultatifs (etat, grossiste), page. */
    public JSONObject liste(String etat, String grossiste, int start, int limit) {
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        List<Object> params = new ArrayList<>();
        if (etat != null && !etat.isEmpty()) {
            params.add(etat);
            where.append(" AND c.etat = ?").append(params.size());
        }
        if (grossiste != null && !grossiste.isEmpty()) {
            params.add(grossiste);
            where.append(" AND c.cle_grossiste = ?").append(params.size());
        }
        int n = params.size();
        Query total = em.createNativeQuery("SELECT COUNT(*) FROM correspondance_grossiste c" + where);
        Query q = em.createNativeQuery(
                "SELECT " + COLONNES + where + " ORDER BY c.score DESC, g.str_LIBELLE, c.code_grossiste, c.id LIMIT ?"
                        + (n + 1) + " OFFSET ?" + (n + 2));
        for (int i = 0; i < n; i++) {
            total.setParameter(i + 1, params.get(i));
            q.setParameter(i + 1, params.get(i));
        }
        q.setParameter(n + 1, Math.max(1, Math.min(limit, 500))).setParameter(n + 2, Math.max(0, start));
        @SuppressWarnings("unchecked")
        List<Object[]> l = q.getResultList();
        return new JSONObject().put("success", true).put("total", ((Number) total.getSingleResult()).longValue())
                .put("data", lignes(l));
    }

    /** Effectifs par grossiste, etat et source, et dernier calcul. */
    public JSONObject mesures() {
        @SuppressWarnings("unchecked")
        List<Object[]> l = em.createNativeQuery("SELECT c.cle_grossiste, MAX(g.str_LIBELLE), c.etat, c.source,"
                + " COUNT(*) FROM correspondance_grossiste c LEFT JOIN t_grossiste g"
                + " ON g.lg_GROSSISTE_ID = c.lg_GROSSISTE_ID GROUP BY c.cle_grossiste, c.etat, c.source"
                + " ORDER BY COUNT(*) DESC").getResultList();
        JSONArray a = new JSONArray();
        for (Object[] r : l) {
            a.put(new JSONObject().put("cleGrossiste", r[0]).put("grossiste", r[1] == null ? JSONObject.NULL : r[1])
                    .put("etat", r[2]).put("source", r[3]).put("nombre", ((Number) r[4]).longValue()));
        }
        @SuppressWarnings("unchecked")
        List<Object> dernier = em.createNativeQuery("SELECT MAX(id) FROM correspondance_calcul").getResultList();
        Object id = dernier.isEmpty() ? null : dernier.get(0);
        return new JSONObject().put("success", true).put("data", a).put("dernierCalcul",
                id == null ? JSONObject.NULL : calcul(((Number) id).longValue()));
    }

    /** Journal des calculs, du plus recent au plus ancien. */
    public JSONObject calculs(int limit) {
        @SuppressWarnings("unchecked")
        List<Object> ids = em.createNativeQuery("SELECT id FROM correspondance_calcul ORDER BY id DESC LIMIT ?1")
                .setParameter(1, Math.max(1, Math.min(limit, 100))).getResultList();
        JSONArray a = new JSONArray();
        ids.forEach(i -> a.put(calcul(((Number) i).longValue())));
        return new JSONObject().put("success", true).put("data", a);
    }

    private JSONObject calcul(long id) {
        Object[] r = (Object[]) em
                .createNativeQuery("SELECT id, origine, utilisateur, DATE_FORMAT(debut, " + FORMAT_DATE
                        + "), DATE_FORMAT(fin, " + FORMAT_DATE + "), statut, codes_lus, creees, modifiees,"
                        + " inchangees, conservees, sans_resultat, message FROM correspondance_calcul WHERE id = ?1")
                .setParameter(1, id).getSingleResult();
        String[] n = { "id", "origine", "utilisateur", "debut", "fin", "statut", "codesLus", "creees", "modifiees",
                "inchangees", "conservees", "sansResultat", "message" };
        JSONObject o = new JSONObject();
        for (int i = 0; i < n.length; i++) {
            Object v = r[i];
            o.put(n[i], v == null ? JSONObject.NULL : v instanceof Number ? ((Number) v).longValue() : v.toString());
        }
        return o;
    }
}
