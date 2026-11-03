package rest;

import commonTasks.dto.SalesParams;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.PrixReferenceService;
import rest.service.SalesService;
import rest.service.dto.PrixReferenceDTO;
import rest.service.dto.PrixReferenceJournalDTO;
import rest.service.dto.ReferenceTpDTO;
import rest.service.dto.SaisieReferenceCaisseParams;
import rest.service.dto.SaisieReferenceResultat;

/**
 *
 * @author koben
 */
@Path("v1/prix-reference")
@Produces("application/json")
@Consumes("application/json")
public class PrixReferenceRessource {

    private static final Logger LOG = Logger.getLogger(PrixReferenceRessource.class.getName());

    @EJB
    private PrixReferenceService prixReferenceService;
    @EJB
    private SalesService salesService;
    @Inject
    private HttpServletRequest servletRequest;

    @POST
    public Response add(PrixReferenceDTO prixReference) {
        prixReferenceService.add(prixReference);
        return Response.ok().build();
    }

    @PUT
    public Response update(PrixReferenceDTO prixReference) {
        prixReferenceService.update(prixReference);
        return Response.ok().build();
    }

    @GET
    @Path("{id}")
    public Response getByProduitId(@PathParam("id") String produitId) {
        JSONObject json = new JSONObject();
        List<PrixReferenceDTO> list = prixReferenceService.getByProduitId(produitId);
        json.put("data", new JSONArray(list)).put("total", list.size());
        return Response.ok(json.toString()).build();
    }

    @DELETE
    @Path("{id}")
    public Response delete(@PathParam("id") String prixId) {
        prixReferenceService.delete(prixId);
        return Response.ok().build();
    }

    /* ---- cas 2 du 03/11/2026 ---- */

    /** Journal des references d'un produit (fiche article, Q2.6), du plus recent au plus ancien. */
    @GET
    @Path("{id}/journal")
    public Response journal(@PathParam("id") String produitId) {
        List<PrixReferenceJournalDTO> list = prixReferenceService.journalProduit(produitId);
        return Response.ok(new JSONObject().put("data", new JSONArray(list)).put("total", list.size()).toString())
                .build();
    }

    /** Refus 403 tant que KEY_PRIX_REF_CAISSE vaut 0 : sans le parametre, le chemin de la caisse n'existe pas. */
    private Response refusSiInactif() {
        if (Droits.utilisateur(servletRequest) == null) {
            return Response.status(Response.Status.UNAUTHORIZED).type("application/json")
                    .entity(new JSONObject().put("success", false).put("msg", "Veuillez vous connecter").toString())
                    .build();
        }
        if (!prixReferenceService.caisseActive()) {
            return Droits.interdit("saisie des prix de référence à la caisse (paramètre KEY_PRIX_REF_CAISSE)");
        }
        return null;
    }

    private static Response refus(String msg) {
        return Response.status(Response.Status.BAD_REQUEST).type("application/json")
                .entity(new JSONObject().put("success", false).put("msg", msg).toString()).build();
    }

    /** Prix et taux de reference de chaque ligne de la vente, par tiers-payant de la vente. */
    @GET
    @Path("vente/{venteId}")
    public Response referencesVente(@PathParam("venteId") String venteId) {
        Response refus = refusSiInactif();
        if (refus != null) {
            return refus;
        }
        List<ReferenceTpDTO> list = prixReferenceService.referencesPourVente(venteId);
        return Response.ok(new JSONObject().put("success", true).put("data", new JSONArray(list))
                .put("total", list.size()).toString()).build();
    }

    /**
     * Saisie a la caisse d'une reference pour une ligne et un tiers-payant de la vente : bornes reverifiees par le
     * service (entier, prix de 5 au prix de vente, taux de 5 a 100, 400 sinon), ecriture MIX_TAUX_PRIX journalisee
     * avec la vente, puis recalcul du net par le meme chemin que net/assurance (le moteur n'est pas modifie).
     */
    @PUT
    @Path("vente/{venteId}/ligne/{detailId}")
    public Response saisie(@PathParam("venteId") String venteId, @PathParam("detailId") String detailId,
            SaisieReferenceCaisseParams params) {
        Response refus = refusSiInactif();
        if (refus != null) {
            return refus;
        }
        if (params == null) {
            return refus("Aucune donn\u00e9e re\u00e7ue.");
        }
        SaisieReferenceResultat resultat = prixReferenceService.saisieCaisse(venteId, detailId,
                params.getTiersPayantId(), params.getValeur(), params.getTaux());
        if (resultat.estRefusee()) {
            return refus(resultat.getMotif());
        }
        JSONObject json = new JSONObject().put("success", true).put("reference",
                new JSONObject(resultat.getReference()));
        // Net recalcule comme le ferait l'ecran apres une modification de la fiche article : meme service,
        // memes parametres (tiers-payants, bons, remise). Sans eux, l'ecran le relance lui-meme.
        if (params.getTierspayants() != null && !params.getTierspayants().isEmpty()) {
            try {
                SalesParams sp = new SalesParams();
                sp.setVenteId(venteId);
                sp.setRemiseId(params.getRemiseId());
                sp.setTierspayants(params.getTierspayants());
                String motifNet = salesService.controleCalculNetAssurance(sp);
                if (motifNet == null) {
                    json.put("net", salesService.computeVONet(sp));
                } else {
                    json.put("msgNet", motifNet);
                }
            } catch (Exception e) {
                LOG.log(Level.WARNING, "net apres saisie de reference", e);
            }
        }
        return Response.ok(json.toString()).build();
    }
}
