package rest;

import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Espace produit de l'ecran de connexion : consultation LIBRE, sans compte.
 *
 * <p>
 * Accessible depuis le bouton « Espace produit » de la page de connexion, avant toute authentification - c'est un choix
 * assume de l'officine. Le perimetre est donc reduit au strict necessaire du comptoir :
 *
 * <ul>
 * <li>recherche par CIP, nom (mode « contient ») ou code EAN, a partir de deux caracteres ;</li>
 * <li>colonnes : CIP, designation, emplacement, prix de vente, stock rayon, stock reserve, stock total ;</li>
 * <li>au plus {@value #MAX_RESULTATS} resultats - pas d'export de tout le catalogue ;</li>
 * <li>AUCUNE donnee d'achat, de marge ou de gestion.</li>
 * </ul>
 */
@Path("v1/espace-produit")
@Produces("application/json")
@Stateless
public class EspaceProduitRessource {

    /** Nombre maximum de lignes servies a une recherche : l'ecran sert a retrouver UN produit, pas a tout lister. */
    static final int MAX_RESULTATS = 50;

    /** En deca, on ne cherche pas : trop de resultats, et autant de charge inutile. */
    static final int LONGUEUR_MINIMALE = 2;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @GET
    @Path("recherche")
    public Response rechercher(@QueryParam("q") String q) {
        JSONObject reponse = new JSONObject();
        JSONArray lignes = new JSONArray();
        String texte = StringUtils.trimToEmpty(q);
        if (texte.length() < LONGUEUR_MINIMALE) {
            return Response.ok().entity(reponse.put("total", 0).put("data", lignes).toString()).build();
        }
        String motif = "%" + texte + "%";
        // Stock rayon = stock total moins la reserve : la table des stocks par type n'est pas
        // entretenue sur toutes les bases, seul le couple (total, reserve) est fiable partout.
        @SuppressWarnings("unchecked")
        List<Object[]> resultats = em.createNativeQuery("SELECT f.int_CIP, f.str_NAME, z.str_LIBELLEE, f.int_PRICE,"
                + " COALESCE(reserve.int_NUMBER, 0), s.int_NUMBER_AVAILABLE" + " FROM t_famille f"
                + " INNER JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.str_STATUT = 'enable'"
                + " LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID"
                + " LEFT JOIN t_type_stock_famille reserve ON reserve.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
                + "   AND reserve.lg_TYPE_STOCK_ID = '2' AND reserve.lg_EMPLACEMENT_ID = s.lg_EMPLACEMENT_ID"
                + " WHERE f.str_STATUT = 'enable'"
                + " AND (f.int_CIP LIKE ?1 OR f.str_NAME LIKE ?1 OR f.int_EAN13 LIKE ?1)" + " ORDER BY f.str_NAME")
                .setParameter(1, motif).setMaxResults(MAX_RESULTATS).getResultList();

        for (Object[] r : resultats) {
            long reserve = nombreDe(r[4]);
            long total = nombreDe(r[5]);
            lignes.put(new JSONObject().put("cip", texteDe(r[0])).put("designation", texteDe(r[1]))
                    .put("emplacement", texteDe(r[2])).put("prixVente", nombreDe(r[3]))
                    .put("stockRayon", Math.max(0, total - reserve)).put("stockReserve", reserve)
                    .put("stockTotal", total));
        }
        return Response.ok().entity(reponse.put("total", lignes.length()).put("data", lignes).toString()).build();
    }

    private static String texteDe(Object valeur) {
        return valeur == null ? "" : String.valueOf(valeur);
    }

    private static long nombreDe(Object valeur) {
        return valeur instanceof Number ? ((Number) valeur).longValue() : 0L;
    }
}
