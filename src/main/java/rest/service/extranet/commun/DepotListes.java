package rest.service.extranet.commun;

import java.util.List;
import javax.persistence.EntityManager;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.extranet.ubipharm.ListesUbipharmParseur.Ligne;

/**
 * Table {@code extranet_liste_ligne}, commune aux listes de tous les extranets (Ubipharm, TEDIS) : lignes rattachees a
 * leur collecte. La lecture rend la derniere collecte COMPLETE de la liste et ses lignes ; les lignes des collectes
 * precedentes ne sont retirees qu'apres la fermeture COMPLETE de la nouvelle (un echec laisse le cache precedent). Le
 * nom de la liste est unique entre extranets (listes TEDIS prefixees « TEDIS_ »).
 */
public final class DepotListes {

    private final EntityManager em;

    public DepotListes(EntityManager em) {
        this.em = em;
    }

    public void enregistrer(long collecteId, String liste, List<Ligne> lignes) {
        for (Ligne x : lignes) {
            em.createNativeQuery("INSERT INTO extranet_liste_ligne (collecte_id, liste, position, agence, pscode, cip,"
                    + " cellules) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)").setParameter(1, collecteId)
                    .setParameter(2, liste).setParameter(3, x.position).setParameter(4, x.agence)
                    .setParameter(5, x.pscode).setParameter(6, x.cip)
                    .setParameter(7, new JSONArray(x.cellules).toString()).executeUpdate();
        }
    }

    /**
     * Retire les lignes des autres collectes de la liste. Refuse si la collecte gardee n'est pas COMPLETE : on ne
     * remplace jamais un cache par une liste incomplete.
     */
    public int garderSeulement(String liste, String module, long collecteId) {
        JSONObject c = new JournalCollecte(em).une(collecteId);
        if (c == null || !JournalCollecte.COMPLETE.equals(c.optString("statut"))
                || !module.equals(c.optString("module"))) {
            throw new IllegalStateException("Collecte " + collecteId + " non complète pour " + liste);
        }
        return em.createNativeQuery("DELETE FROM extranet_liste_ligne WHERE liste = ?1 AND collecte_id <> ?2")
                .setParameter(1, liste).setParameter(2, collecteId).executeUpdate();
    }

    /** Derniere collecte complete de la liste, ses colonnes ({@code description}) et ses lignes. */
    @SuppressWarnings("unchecked")
    public JSONObject lire(SourceExtranet source, String liste, String module, JSONObject description) {
        JSONObject collecte = new JournalCollecte(em).derniereComplete(source, module);
        JSONObject r = description.put("collecte", collecte == null ? JSONObject.NULL : collecte);
        JSONArray lignes = new JSONArray();
        if (collecte != null) {
            List<Object[]> rows = em
                    .createNativeQuery("SELECT position, agence, pscode, cip, cellules"
                            + " FROM extranet_liste_ligne WHERE liste = ?1 AND collecte_id = ?2 ORDER BY position")
                    .setParameter(1, liste).setParameter(2, collecte.getLong("id")).getResultList();
            for (Object[] o : rows) {
                lignes.put(new JSONObject().put("position", ((Number) o[0]).intValue())
                        .put("agence", o[1] == null ? JSONObject.NULL : o[1])
                        .put("pscode", o[2] == null ? JSONObject.NULL : o[2])
                        .put("cip", o[3] == null ? JSONObject.NULL : o[3])
                        .put("cellules", new JSONArray((String) o[4])));
            }
        }
        r.put("lignes", lignes);
        /* listes de documents : chaque BL ou facture marque saisi ou non dans Prestige (demande du 09/11) */
        BlSaisis.marquer(em, source, liste, r);
        return r;
    }

    /** Nombre de lignes gardees pour une collecte (controle de bilan). */
    public int compter(String liste, long collecteId) {
        return ((Number) em
                .createNativeQuery("SELECT COUNT(*) FROM extranet_liste_ligne WHERE liste = ?1 AND collecte_id = ?2")
                .setParameter(1, liste).setParameter(2, collecteId).getSingleResult()).intValue();
    }
}
