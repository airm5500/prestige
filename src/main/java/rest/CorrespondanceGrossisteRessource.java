package rest;

import dal.TUser;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.correspondance.CorrespondanceGrossisteService;

/**
 * CORRESPONDANCE PRODUITS GROSSISTES / PRESTIGE (lot 1, cles exactes) :
 * <ul>
 * <li>POST calculer : recalcule les correspondances a partir des codes deja connus par grossiste et des CIP / EAN
 * (droit P_CORRESPONDANCE_GROSSISTES) ; une correspondance validee, rejetee ou contredite est conservee ;</li>
 * <li>GET produit/{familleId} : correspondances d'un produit, chez chaque grossiste ;</li>
 * <li>GET produit/{familleId}/prix : prix lus sur les BL (dernier connu et historique) ;</li>
 * <li>GET ecarts-prix, POST seuil-ecart-prix : ecarts entre prix public du grossiste et prix Prestige ;</li>
 * <li>GET produit/{familleId}/disponibilite, POST produit/{familleId}/disponibilite/{grossisteId}, GET et POST
 * sources-disponibilite : disponibilite a la demande (lot 5) ;</li>
 * <li>GET liste : liste filtree (etat, grossiste), paginee ;</li>
 * <li>GET mesures : effectifs par grossiste, etat et source, et dernier calcul ;</li>
 * <li>GET calculs : journal des calculs.</li>
 * </ul>
 * Lecture : tout utilisateur connecte. Aucune fiche article n'est modifiee.
 */
@Path("v1/correspondance-grossiste")
@Produces(MediaType.APPLICATION_JSON)
public class CorrespondanceGrossisteRessource {

    static final String DROIT = "P_CORRESPONDANCE_GROSSISTES";

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private CorrespondanceGrossisteService service;

    @EJB
    private rest.service.correspondance.DisponibiliteGrossisteService disponibilites;

    private Response nonConnecte() {
        return Droits.utilisateur(servletRequest) == null ? Response.status(Response.Status.UNAUTHORIZED)
                .type(MediaType.APPLICATION_JSON)
                .entity(new JSONObject().put("success", false).put("msg", "Veuillez vous connecter").toString()).build()
                : null;
    }

    @POST
    @Path("calculer")
    public Response calculer() {
        Response refus = Droits.refus(servletRequest, "Correspondances grossistes", DROIT);
        if (refus != null) {
            return refus;
        }
        TUser u = Droits.utilisateur(servletRequest);
        JSONObject calcul = service.calculerDepuisCodesGrossistes(u.getStrLOGIN());
        return Response.ok(new JSONObject().put("success", true).put("calcul", calcul).toString()).build();
    }

    /**
     * Lot 2 : rejoue la reception d'un BL cloture (elle est faite d'office a la cloture). Sans effet sur un BL non
     * cloture ou deja applique.
     */
    @POST
    @Path("reception-bl/{blId}")
    public Response receptionBl(@PathParam("blId") String blId) {
        Response refus = Droits.refus(servletRequest, "Correspondances grossistes", DROIT);
        if (refus != null) {
            return refus;
        }
        return Response.ok(service.appliquerReceptionBl(blId).toString()).build();
    }

    /** Lot 2 : lignes d'un fichier grossiste importe, avec leur code et leur sort a la reception. */
    @GET
    @Path("import/{commandeId}")
    public Response lignesImport(@PathParam("commandeId") String commandeId) {
        Response r = nonConnecte();
        return r != null ? r : Response.ok(service.lignesImport(commandeId).toString()).build();
    }

    /** Lot 3 : propositions par la designation pour les codes non reconnus a l'import (toujours a valider). */
    @POST
    @Path("rapprocher")
    public Response rapprocher() {
        Response refus = Droits.refus(servletRequest, "Correspondances grossistes", DROIT);
        if (refus != null) {
            return refus;
        }
        JSONObject calcul = service.rapprocherDesignations(Droits.utilisateur(servletRequest).getStrLOGIN());
        return Response.ok(new JSONObject().put("success", true).put("calcul", calcul).toString()).build();
    }

    /**
     * Lot 3 : decision humaine. Corps : {@code {"familleId": "...", "version": "..."}} pour valider, {@code {"version":
     * "..."}} pour rejeter ; version = celle lue dans la liste (409 si la ligne a change depuis).
     */
    @POST
    @Path("{id}/{action: valider|rejeter}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response decider(@PathParam("id") long id, @PathParam("action") String action, String corps) {
        Response refus = Droits.refus(servletRequest, "Correspondances grossistes", DROIT);
        if (refus != null) {
            return refus;
        }
        JSONObject c = corps == null || corps.trim().isEmpty() ? new JSONObject() : new JSONObject(corps);
        CorrespondanceGrossisteService.Reponse r = service.decider(id, action.toUpperCase(java.util.Locale.ROOT),
                c.optString("familleId", null), c.optString("version", null),
                Droits.utilisateur(servletRequest).getStrLOGIN());
        return Response.status(r.statut).type(MediaType.APPLICATION_JSON).entity(r.corps.toString()).build();
    }

    /** Lot 3 : fiches actives pour « Autre produit » (CIP ou EAN exact, ou designation). */
    @GET
    @Path("fiches")
    public Response fiches(@QueryParam("q") String q, @DefaultValue("20") @QueryParam("limit") int limit) {
        Response r = nonConnecte();
        return r != null ? r : Response.ok(service.rechercherFiches(q, limit).toString()).build();
    }

    /** Lot 5 : derniere disponibilite connue du produit chez chaque grossiste (sans appel). */
    @GET
    @Path("produit/{familleId}/disponibilite")
    public Response disponibilites(@PathParam("familleId") String familleId) {
        Response r = nonConnecte();
        return r != null ? r : Response.ok(disponibilites.dernieres(familleId).toString()).build();
    }

    /**
     * Lot 5 : verifie la disponibilite du produit chez le grossiste, par la ou les sources reglees (information
     * produit, jamais une commande) ; lecture de moins de 15 minutes rendue telle quelle sauf {@code forcer=true}.
     */
    @POST
    @Path("produit/{familleId}/disponibilite/{grossisteId}")
    public Response verifierDisponibilite(@PathParam("familleId") String familleId,
            @PathParam("grossisteId") String grossisteId, @DefaultValue("false") @QueryParam("forcer") boolean forcer) {
        Response r = nonConnecte();
        if (r != null) {
            return r;
        }
        JSONObject o = disponibilites.verifier(familleId, grossisteId, forcer, Droits.utilisateur(servletRequest));
        return Response.status(o.getBoolean("success") ? 200 : 404).entity(o.toString()).build();
    }

    /** Lot 5 : source(s) de disponibilite de chaque grossiste actif. */
    @GET
    @Path("sources-disponibilite")
    public Response sourcesDisponibilite() {
        Response r = nonConnecte();
        return r != null ? r : Response.ok(disponibilites.sources().toString()).build();
    }

    /** Lot 5 : regle la source d'un grossiste ({"reglage": 0 PharmaML, 1 extranet, 2 les deux}). */
    @POST
    @Path("sources-disponibilite/{grossisteId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response regleSource(@PathParam("grossisteId") String grossisteId, String corps) {
        Response refus = Droits.refus(servletRequest, "Correspondances grossistes", DROIT);
        if (refus != null) {
            return refus;
        }
        JSONObject c = new JSONObject(corps == null || corps.trim().isEmpty() ? "{}" : corps);
        if (!(c.opt("reglage") instanceof Number)) {
            return Response.status(400).entity(
                    new JSONObject().put("success", false).put("msg", "Réglage attendu : 0, 1 ou 2.").toString())
                    .build();
        }
        JSONObject o = disponibilites.enregistrerSource(grossisteId, c.getInt("reglage"));
        return Response.status(o.getBoolean("success") ? 200 : 400).entity(o.toString()).build();
    }

    /** Lot 4 : produits dont le prix public d'un grossiste s'ecarte du prix Prestige au-dela du seuil. */
    @GET
    @Path("ecarts-prix")
    public Response ecartsPrix(@DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("50") @QueryParam("limit") int limit) {
        Response r = nonConnecte();
        return r != null ? r : Response.ok(service.ecartsPrix(start, Math.min(limit, 1000)).toString()).build();
    }

    /** Lot 4 : seuil d'ecart toléré (FCFA) ; modification reservee au droit des correspondances. */
    @POST
    @Path("seuil-ecart-prix")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response seuilEcartPrix(String corps) {
        Response refus = Droits.refus(servletRequest, "Correspondances grossistes", DROIT);
        if (refus != null) {
            return refus;
        }
        org.json.JSONObject o = new org.json.JSONObject(corps == null || corps.isEmpty() ? "{}" : corps);
        if (!o.has("seuil") || !(o.get("seuil") instanceof Number)) {
            return Response.status(400).entity(new org.json.JSONObject().put("success", false)
                    .put("msg", "Seuil attendu (nombre entier).").toString()).build();
        }
        org.json.JSONObject res = service.enregistrerSeuilEcartPrix(o.getInt("seuil"));
        return Response.status(res.getBoolean("success") ? 200 : 400).entity(res.toString()).build();
    }

    /** Lot 4 : prix d'un produit chez chaque grossiste (dernier connu et historique). */
    @GET
    @Path("produit/{familleId}/prix")
    public Response prixProduit(@PathParam("familleId") String familleId) {
        Response r = nonConnecte();
        return r != null ? r : Response.ok(service.prixProduit(familleId).toString()).build();
    }

    @GET
    @Path("produit/{familleId}")
    public Response produit(@PathParam("familleId") String familleId) {
        Response r = nonConnecte();
        return r != null ? r : Response.ok(service.produit(familleId).toString()).build();
    }

    @GET
    @Path("liste")
    public Response liste(@QueryParam("etat") String etat, @QueryParam("grossiste") String grossiste,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("50") @QueryParam("limit") int limit) {
        Response r = nonConnecte();
        return r != null ? r : Response.ok(service.liste(etat, grossiste, start, limit).toString()).build();
    }

    @GET
    @Path("mesures")
    public Response mesures() {
        Response r = nonConnecte();
        return r != null ? r : Response.ok(service.mesures().toString()).build();
    }

    @GET
    @Path("calculs")
    public Response calculs(@DefaultValue("20") @QueryParam("limit") int limit) {
        Response r = nonConnecte();
        return r != null ? r : Response.ok(service.calculs(limit).toString()).build();
    }
}
