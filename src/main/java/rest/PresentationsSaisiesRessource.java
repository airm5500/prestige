package rest;

import dal.TBonLivraisonDetail;
import dal.TUser;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.report.pdf.Gs1;
import rest.service.impl.LectureGs1Service;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 * Presentations a l'essai des saisies (proposition du 04/11, variante C de la gestion des entrees : reception au
 * scanner).
 *
 * <p>
 * GET bon/{id}/gs1?code=... : lit une etiquette GS1 (lot, peremption, CIP ou GTIN) avec le decodeur deja utilise a la
 * vente ({@link Gs1}) et dit a quelle ligne du bon elle correspond. Lecture seule : rien n'est ecrit ici, la quantite
 * lue est enregistree ensuite par l'action existante d'ajout de lot. Le code lu n'est jamais journalise.
 * </p>
 * <p>
 * GET suggestion/{id}/totaux : nombre de lignes, boites et montant d'achat de toute la suggestion, en une seule requete
 * d'agregat. Les variantes affichent les lignes page par page, comme la grille d'origine (le calcul de chaque ligne de
 * suggestion est couteux) : leurs totaux viennent d'ici et non des lignes affichees. Lecture seule.
 * </p>
 */
@Path("v1/presentations-saisies")
@Produces(MediaType.APPLICATION_JSON)
@Stateless
public class PresentationsSaisiesRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private LectureGs1Service lectureGs1Service;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    @GET
    @Path("bon/{id}/gs1")
    public Response lireEtiquetteReception(@PathParam("id") String bonId, @QueryParam("code") String code) {
        JSONObject o = new JSONObject().put("success", false);
        if (utilisateur() == null) {
            return Response.ok(o.put("msg", Constant.DECONNECTED_MESSAGE).toString()).build();
        }
        if (code == null || code.trim().isEmpty()) {
            return Response.ok(o.put("msg", "Code vide.").toString()).build();
        }
        List<Gs1.Contenu> candidats = new ArrayList<>();
        boolean gs1 = Gs1.estGs1(code);
        if (gs1) {
            candidats.add(Gs1.lire(code));
        } else {
            /* separateur GS perdu par la douchette : chaque decoupe possible est essayee */
            candidats.addAll(Gs1.sansSeparateur(code));
        }
        o.put("gs1", gs1 || !candidats.isEmpty());
        if (candidats.isEmpty()) {
            /* code-barres simple de la boite (EAN, CIP) : compare tel quel aux codes du produit */
            Gs1.Contenu simple = new Gs1.Contenu();
            simple.cip = code.trim();
            candidats.add(simple);
        }
        for (Gs1.Contenu c : candidats) {
            Set<String> codes = new LinkedHashSet<>(lectureGs1Service.codesProduit(c));
            if (codes.isEmpty()) {
                continue;
            }
            List<TBonLivraisonDetail> lignes = em
                    .createQuery("SELECT d FROM TBonLivraisonDetail d"
                            + " WHERE d.lgBONLIVRAISONID.lgBONLIVRAISONID = :bon AND (d.lgFAMILLEID.intCIP IN :codes"
                            + " OR d.lgFAMILLEID.intEAN13 IN :codes OR d.lgFAMILLEID.codeEanFabriquant IN :codes)",
                            TBonLivraisonDetail.class)
                    .setParameter("bon", bonId).setParameter("codes", codes).setMaxResults(1).getResultList();
            o.put("cip", c.cip == null ? JSONObject.NULL : c.cip);
            o.put("lot", c.lot == null ? JSONObject.NULL : c.lot);
            o.put("peremption", c.peremption == null ? JSONObject.NULL : c.peremption.toString());
            if (!lignes.isEmpty()) {
                return Response
                        .ok(o.put("success", true).put("ligneId", lignes.get(0).getLgBONLIVRAISONDETAIL()).toString())
                        .build();
            }
        }
        return Response.ok(o.put("msg", "Aucune ligne de ce bon ne correspond à ce code.").toString()).build();
    }

    @GET
    @Path("suggestion/{id}/totaux")
    public Response totauxSuggestion(@PathParam("id") String suggestionId) {
        JSONObject o = new JSONObject().put("success", false);
        if (utilisateur() == null) {
            return Response.ok(o.put("msg", Constant.DECONNECTED_MESSAGE).toString()).build();
        }
        Object[] t = (Object[]) em
                .createNativeQuery("SELECT COUNT(*), COALESCE(SUM(int_NUMBER), 0), COALESCE(SUM(int_PRICE), 0)"
                        + " FROM t_suggestion_order_details WHERE lg_SUGGESTION_ORDER_ID = ?1")
                .setParameter(1, suggestionId).getSingleResult();
        return Response.ok(o.put("success", true).put("lignes", ((Number) t[0]).longValue())
                .put("boites", ((Number) t[1]).longValue()).put("montant", ((Number) t[2]).longValue()).toString())
                .build();
    }
}
