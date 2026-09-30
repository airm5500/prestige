package rest.service.impl;

import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * TERRAINS CLINIQUES parametrables (retour du 30/09) : diabete, hypertension, allergies... proposes en cases a cocher
 * dans la fiche ordonnance. L'officine ajoute, renomme, reordonne et desactive ; un terrain ne se supprime pas (les
 * ordonnances qui le portent le gardent).
 */
@Stateless
public class TerrainCliniqueService {

    private static final Logger LOG = Logger.getLogger(TerrainCliniqueService.class.getName());
    static final int MAX_LIBELLE = 80;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** La liste, dans son ordre. {@code tous} : desactives compris (ecran de parametrage). */
    @SuppressWarnings("unchecked")
    public JSONObject lister(boolean tous) {
        JSONArray data = new JSONArray();
        List<Tuple> lignes = em
                .createNativeQuery("SELECT t.lg_TERRAIN_ID AS id, t.str_CODE AS code, t.str_LIBELLE AS libelle,"
                        + " t.int_ORDRE AS ordre, t.bool_ACTIF AS actif, t.str_CATEGORIE AS categorie,"
                        + " (SELECT COUNT(*) FROM t_ordonnance_client_terrain ot WHERE ot.lg_TERRAIN_ID = t.lg_TERRAIN_ID) AS utilise"
                        + " FROM t_terrain_clinique t" + (tous ? "" : " WHERE t.bool_ACTIF = 1")
                        + " ORDER BY t.int_ORDRE, t.str_LIBELLE", Tuple.class)
                .getResultList();
        for (Tuple t : lignes) {
            data.put(new JSONObject().put("id", t.get("id", String.class))
                    .put("code", StringUtils.defaultString(t.get("code", String.class)))
                    .put("libelle", t.get("libelle", String.class)).put("ordre", entier(t.get("ordre")))
                    .put("actif", vrai(t.get("actif"))).put("utilise", entier(t.get("utilise")))
                    /* Terrain ou allergie (30/09) : les deux alimentent l'analyse. */
                    .put("categorie", categorie(t.get("categorie", String.class))));
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data);
    }

    /** Cree (id vide) ou modifie un terrain. Libelle obligatoire, unique, 80 caracteres au plus. */
    public JSONObject enregistrer(JSONObject requete) {
        String id = StringUtils.trimToNull(requete.optString("id", null));
        String libelle = StringUtils.normalizeSpace(requete.optString("libelle", ""));
        String motif = valider(libelle);
        if (motif != null) {
            return refus(motif);
        }
        int ordre = requete.optInt("ordre", 100);
        String categorie = categorie(requete.optString("categorie", null));
        boolean actif = requete.optBoolean("actif", true);
        try {
            Number doublon = (Number) em
                    .createNativeQuery("SELECT COUNT(*) FROM t_terrain_clinique WHERE UPPER(str_LIBELLE)"
                            + " = UPPER(?1) AND lg_TERRAIN_ID <> ?2")
                    .setParameter(1, libelle).setParameter(2, StringUtils.defaultString(id)).getSingleResult();
            if (doublon.intValue() > 0) {
                return refus("Un terrain « " + libelle + " » existe déjà.");
            }
            if (id == null) {
                id = UUID.randomUUID().toString();
                em.createNativeQuery(
                        "INSERT INTO t_terrain_clinique (lg_TERRAIN_ID, str_LIBELLE, int_ORDRE, bool_ACTIF,"
                                + " dt_CREATED, str_CATEGORIE) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
                        .setParameter(1, id).setParameter(2, libelle).setParameter(3, ordre)
                        .setParameter(4, actif ? 1 : 0).setParameter(5, new Date()).setParameter(6, categorie)
                        .executeUpdate();
            } else {
                int n = em
                        .createNativeQuery("UPDATE t_terrain_clinique SET str_LIBELLE = ?1, int_ORDRE = ?2,"
                                + " bool_ACTIF = ?3, dt_UPDATED = ?4, str_CATEGORIE = COALESCE(?6, str_CATEGORIE)"
                                + " WHERE lg_TERRAIN_ID = ?5")
                        .setParameter(1, libelle).setParameter(2, ordre).setParameter(3, actif ? 1 : 0)
                        .setParameter(4, new Date()).setParameter(5, id)
                        .setParameter(6, requete.has("categorie") ? categorie : null).executeUpdate();
                if (n == 0) {
                    return refus("Terrain inconnu.");
                }
            }
            return new JSONObject().put("success", true).put("id", id).put("message",
                    "Terrain « " + libelle + " » enregistré.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "terrain clinique", e);
            return refus("Le terrain n'a pas pu être enregistré.");
        }
    }

    static String valider(String libelle) {
        if (StringUtils.isBlank(libelle)) {
            return "Le libellé du terrain est obligatoire.";
        }
        if (libelle.length() > MAX_LIBELLE) {
            return "Le libellé du terrain fait " + MAX_LIBELLE + " caractères au plus.";
        }
        return null;
    }

    /** Les terrains coches sur une ordonnance (identifiants). */
    @SuppressWarnings("unchecked")
    public JSONArray deLOrdonnance(String ordonnanceId) {
        return new JSONArray((List<String>) em
                .createNativeQuery(
                        "SELECT lg_TERRAIN_ID FROM t_ordonnance_client_terrain" + " WHERE lg_ORDONNANCE_ID = ?1")
                .setParameter(1, ordonnanceId).getResultList());
    }

    /** Remplace les terrains d'une ordonnance. Un identifiant inconnu est ignore. */
    public void remplacer(String ordonnanceId, JSONArray terrains) {
        em.createNativeQuery("DELETE FROM t_ordonnance_client_terrain WHERE lg_ORDONNANCE_ID = ?1")
                .setParameter(1, ordonnanceId).executeUpdate();
        for (int i = 0; terrains != null && i < terrains.length(); i++) {
            String t = StringUtils.trimToNull(terrains.optString(i, null));
            if (t != null) {
                em.createNativeQuery("INSERT IGNORE INTO t_ordonnance_client_terrain (lg_ORDONNANCE_ID, lg_TERRAIN_ID)"
                        + " SELECT ?1, lg_TERRAIN_ID FROM t_terrain_clinique WHERE lg_TERRAIN_ID = ?2")
                        .setParameter(1, ordonnanceId).setParameter(2, t).executeUpdate();
            }
        }
    }

    /** « allergie » ou « terrain » (par defaut). */
    static String categorie(String v) {
        return "allergie".equalsIgnoreCase(StringUtils.trimToEmpty(v)) ? "allergie" : "terrain";
    }

    private static JSONObject refus(String message) {
        return new JSONObject().put("success", false).put("message", message);
    }

    /** TINYINT(1) arrive en Boolean ou en nombre selon le pilote : les deux sont lus. */
    static boolean vrai(Object v) {
        return v instanceof Boolean ? (Boolean) v : v instanceof Number && ((Number) v).intValue() != 0;
    }

    private static int entier(Object v) {
        return v instanceof Number ? ((Number) v).intValue() : 0;
    }
}
