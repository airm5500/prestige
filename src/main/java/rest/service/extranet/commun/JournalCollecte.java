package rest.service.extranet.commun;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;
import javax.persistence.EntityManager;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Table {@code extranet_collecte} : une ligne par collecte (source, module, parametres, debut, fin, statut, lignes
 * annoncees et recues). C'est la date de collecte de toutes les donnees en cache, et la preuve qu'une liste est
 * complete ou non. Les parametres enregistres ne portent jamais de cookie ni de jeton.
 */
public final class JournalCollecte {

    public static final String EN_COURS = "EN_COURS";
    public static final String COMPLETE = "COMPLETE";
    public static final String ECHEC = "ECHEC";

    private final EntityManager em;

    public JournalCollecte(EntityManager em) {
        this.em = em;
    }

    public long ouvrir(SourceExtranet source, String module, String parametres, String utilisateur) {
        em.createNativeQuery("INSERT INTO extranet_collecte (source, module, parametres, utilisateur, debut, statut)"
                + " VALUES (?1, ?2, ?3, ?4, NOW(), ?5)").setParameter(1, source.name()).setParameter(2, module)
                .setParameter(3, tronquer(parametres, 500)).setParameter(4, tronquer(utilisateur, 40))
                .setParameter(5, EN_COURS).executeUpdate();
        Object id = em.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult();
        return ((Number) (id instanceof BigInteger ? ((BigInteger) id).longValue() : id)).longValue();
    }

    /**
     * Ferme la collecte.
     *
     * @param annoncees
     *            lignes annoncees par l'extranet (recordsTotal), null si l'extranet n'en annonce pas
     */
    public void fermer(long id, String statut, Integer annoncees, int recues, String message) {
        em.createNativeQuery("UPDATE extranet_collecte SET fin = NOW(), statut = ?1, lignes_annoncees = ?2,"
                + " lignes_recues = ?3, message = ?4 WHERE id = ?5").setParameter(1, statut).setParameter(2, annoncees)
                .setParameter(3, recues).setParameter(4, tronquer(message, 500)).setParameter(5, id).executeUpdate();
    }

    public JSONObject une(long id) {
        List<JSONObject> l = lire("WHERE id = ?1", id, 1);
        return l.isEmpty() ? null : l.get(0);
    }

    /** Dernieres collectes, les plus recentes d'abord. */
    public JSONArray dernieres(SourceExtranet source, String module, int nombre) {
        StringBuilder w = new StringBuilder("WHERE source = ?1");
        if (module != null) {
            w.append(" AND module = ?2");
        }
        return new JSONArray(lire(w.toString(), source.name(), module, Math.max(1, Math.min(nombre, 200))));
    }

    /** Derniere collecte COMPLETE d'un module : la date de reference des donnees affichees. */
    public JSONObject derniereComplete(SourceExtranet source, String module) {
        List<JSONObject> l = lire("WHERE source = ?1 AND module = ?2 AND statut = '" + COMPLETE + "'", source.name(),
                module, 1);
        return l.isEmpty() ? null : l.get(0);
    }

    @SuppressWarnings("unchecked")
    private List<JSONObject> lire(String where, Object p1, int max) {
        return lire(where, p1, null, max);
    }

    @SuppressWarnings("unchecked")
    private List<JSONObject> lire(String where, Object p1, Object p2, int max) {
        javax.persistence.Query q = em.createNativeQuery("SELECT id, source, module, parametres, utilisateur,"
                + " debut, fin, statut, lignes_annoncees, lignes_recues, message FROM extranet_collecte " + where
                + " ORDER BY id DESC LIMIT " + max).setParameter(1, p1);
        if (p2 != null) {
            q.setParameter(2, p2);
        }
        List<JSONObject> r = new ArrayList<>();
        for (Object[] o : (List<Object[]>) q.getResultList()) {
            r.add(new JSONObject().put("id", ((Number) o[0]).longValue()).put("source", o[1]).put("module", o[2])
                    .put("parametres", o[3] == null ? JSONObject.NULL : o[3])
                    .put("utilisateur", o[4] == null ? JSONObject.NULL : o[4])
                    .put("debut", o[5] == null ? JSONObject.NULL : o[5].toString())
                    .put("fin", o[6] == null ? JSONObject.NULL : o[6].toString()).put("statut", o[7])
                    .put("lignesAnnoncees", o[8] == null ? JSONObject.NULL : ((Number) o[8]).intValue())
                    .put("lignesRecues", o[9] == null ? JSONObject.NULL : ((Number) o[9]).intValue())
                    .put("message", o[10] == null ? JSONObject.NULL : o[10]));
        }
        return r;
    }

    static String tronquer(String s, int n) {
        return s == null || s.length() <= n ? s : s.substring(0, n);
    }
}
