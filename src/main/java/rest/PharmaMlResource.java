/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.TUser;
import toolkits.parameters.commonparameter;
import java.time.LocalDate;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.PharmaMlService;

import util.Constant;

/**
 *
 * @author kkoffi
 */
@Path("v1/pharma")
@Produces("application/json")
@Consumes("application/json")
public class PharmaMlResource {

    @EJB
    PharmaMlService pharmaMlService;
    @javax.ws.rs.core.Context
    private HttpServletRequest servletRequest;

    private TUser utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        return s == null ? null : (TUser) s.getAttribute(commonparameter.AIRTIME_USER);
    }

    /** Point 5 du 08/10 : equivalents proposes (EP) par les grossistes, en attente de decision. */
    @GET
    @Path("remplacements")
    public Response remplacements() {
        if (utilisateur() == null) {
            return Response
                    .ok(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        return Response.ok(pharmaMlService.remplacementsProposes().toString()).build();
    }

    /** Retours du 08/10 : reponse du grossiste a une commande, sans ouvrir le fichier XML (lecture seule). */
    @GET
    @Path("reponse/{commandeId}")
    public Response reponseGrossiste(@PathParam("commandeId") String commandeId) {
        if (utilisateur() == null) {
            return Response
                    .ok(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        return Response.ok(pharmaMlService.reponseGrossiste(commandeId).toString()).build();
    }

    // Retours du 08/10 (7) : suivi des substitutions

    private Response refuse() {
        return Response.ok(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                .build();
    }

    private static LocalDate date(String v, LocalDate defaut) {
        try {
            return v == null || v.isBlank() ? defaut : LocalDate.parse(v.trim());
        } catch (java.time.format.DateTimeParseException e) {
            return defaut;
        }
    }

    /** Retours du 08/10 (10) : « ou en est ma commande ? » (demande au grossiste) et dernier avancement connu. */
    @POST
    @Path("avancement/{id}")
    public Response demanderAvancement(@PathParam("id") String id) {
        TUser u = utilisateur();
        if (u == null) {
            return refuse();
        }
        return Response.ok(pharmaMlService.avancementCommande(id, u).toString()).build();
    }

    @GET
    @Path("avancement/{id}")
    public Response avancementConnu(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return refuse();
        }
        return Response.ok(pharmaMlService.avancementConnu(id).toString()).build();
    }

    /** Retours du 08/10 (11) : bons de livraison valorises recus (saisie du bon de livraison). */
    @GET
    @Path("blv/commande/{id}")
    public Response blvsCommande(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return refuse();
        }
        return Response.ok(pharmaMlService.blvsCommande(id).toString()).build();
    }

    @GET
    @Path("blv/{id}")
    public Response blv(@PathParam("id") String id, @QueryParam("commande") String commande) {
        if (utilisateur() == null) {
            return refuse();
        }
        return Response.ok(pharmaMlService.blv(id, commande).toString()).build();
    }

    /** Retours du 08/10 (13) : envoi d'un retour fournisseur par PharmaML (demande de retour, reclamation). */
    @POST
    @Path("retour/{id}")
    public Response envoyerRetour(@PathParam("id") String id) {
        TUser u = utilisateur();
        if (u == null) {
            return refuse();
        }
        return Response.ok(pharmaMlService.envoyerRetour(id, u).toString()).build();
    }

    @GET
    @Path("retour/{id}")
    public Response etatRetour(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return refuse();
        }
        return Response.ok(pharmaMlService.etatRetour(id).toString()).build();
    }

    /** Retours du 08/10 (11) : tableau de bord PharmaML. */
    @GET
    @Path("tableau-bord")
    public Response tableauBord() {
        if (utilisateur() == null) {
            return refuse();
        }
        return Response.ok(pharmaMlService.tableauBord().toString()).build();
    }

    /** Informations reglementaires urgentes et alertes commerciales recues. */
    @GET
    @Path("alertes")
    public Response alertes(@QueryParam("nonLues") boolean nonLues) {
        if (utilisateur() == null) {
            return refuse();
        }
        return Response.ok(pharmaMlService.alertes(nonLues).toString()).build();
    }

    @POST
    @Path("alertes/{id}/lue")
    public Response alerteLue(@PathParam("id") String id) {
        TUser u = utilisateur();
        if (u == null) {
            return refuse();
        }
        return Response.ok(pharmaMlService.alerteLue(id, u).toString()).build();
    }

    @GET
    @Path("substitutions")
    public Response substitutions(@QueryParam("statut") String statut, @QueryParam("grossiste") String grossiste,
            @QueryParam("du") String du, @QueryParam("au") String au, @QueryParam("query") String query) {
        if (utilisateur() == null) {
            return refuse();
        }
        String st = statut == null ? "" : statut.trim().toUpperCase();
        if (!st.isEmpty()
                && !java.util.Arrays.asList("PROPOSE", "ACCEPTE", "REFUSE", "AJOUTE", "RETIRE").contains(st)) {
            return Response.ok(new JSONObject().put("success", false).put("msg", "État inconnu").toString()).build();
        }
        LocalDate fin = date(au, LocalDate.now()), debut = date(du, fin.minusMonths(1));
        if (debut.isAfter(fin)) {
            return Response.ok(new JSONObject().put("success", false)
                    .put("msg", "La date de début doit précéder la date de fin.").toString()).build();
        }
        return Response.ok(pharmaMlService.substitutions(st, grossiste, debut, fin, query).toString()).build();
    }

    @GET
    @Path("substitutions/commande/{id}")
    public Response substitutionsCommande(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return refuse();
        }
        return Response.ok(pharmaMlService.substitutionsCommande(id).toString()).build();
    }

    @POST
    @Path("substitutions/{id}/annuler")
    public Response annulerAcceptation(@PathParam("id") String id) {
        TUser u = utilisateur();
        if (u == null) {
            return refuse();
        }
        return Response.ok(pharmaMlService.annulerAcceptation(id, u).toString()).build();
    }

    @POST
    @Path("substitutions/{id}/retirer")
    public Response retirerSubstitution(@PathParam("id") String id) {
        TUser u = utilisateur();
        if (u == null) {
            return refuse();
        }
        return Response.ok(pharmaMlService.retirerSubstitution(id, u).toString()).build();
    }

    @GET
    @Path("substitutions/choix")
    public Response choixMemorises() {
        if (utilisateur() == null) {
            return refuse();
        }
        return Response.ok(pharmaMlService.choixMemorises().toString()).build();
    }

    @POST
    @Path("substitutions/choix/supprimer")
    public Response supprimerChoix(@QueryParam("famille") String famille, @QueryParam("code") String code) {
        TUser u = utilisateur();
        if (u == null) {
            return refuse();
        }
        return Response.ok(pharmaMlService.supprimerChoixMemorise(famille, code, u).toString()).build();
    }

    /** decision = ACCEPTER | REFUSER ; memoriser = meme choix automatique pour ce couple de produits. */
    @POST
    @Path("remplacements/{id}")
    public Response deciderRemplacement(@PathParam("id") String id, @QueryParam("decision") String decision,
            @QueryParam("memoriser") boolean memoriser) {
        TUser u = utilisateur();
        if (u == null) {
            return Response
                    .ok(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        if (!"ACCEPTER".equals(decision) && !"REFUSER".equals(decision)) {
            return Response.ok(new JSONObject().put("success", false).put("msg", "Décision inconnue").toString())
                    .build();
        }
        return Response
                .ok(pharmaMlService.deciderRemplacement(id, "ACCEPTER".equals(decision), memoriser, u).toString())
                .build();
    }

    @PUT
    @Path("{id}")
    public Response envoiPharmaCommande(@PathParam("id") String commandeId) throws JSONException {

        JSONObject json = pharmaMlService.envoiCommande(commandeId, LocalDate.now().plusDays(1), 0, null, null);
        return Response.ok().entity(json.toString()).build();
    }

    /**
     * Reponses differees (FIN_SERVICE puis VIDAGE, specification v4.8 § 4.1.3) : interroge le grossiste donne, ou tous
     * les grossistes actifs a lien PharmaML.
     */
    @POST
    @Path("reponses")
    public Response recupererReponses(@QueryParam("grossiste") String grossisteId) {
        return Response.ok(pharmaMlService.recupererReponses(grossisteId, false).toString()).build();
    }

    /** Envois recus par le grossiste et sans reponse (ou reponses non rattachees). */
    @GET
    @Path("attentes")
    public Response attentes() {
        return Response.ok(pharmaMlService.attentes().toString()).build();
    }

    @PUT
    @Path("infos/{id}")
    public Response envoiPharmaInfosProduit(@PathParam("id") String commandeId) throws JSONException {

        JSONObject json = pharmaMlService.envoiPharmaInfosProduit(commandeId);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("responseorder")
    public Response verificationCommandeReponse(@QueryParam("orderId") String orderId) throws JSONException {
        // JSONObject json = pharmaMlService.lignesCommandeRetour(null, orderId);
        return Response.ok().build();
    }

    @PUT
    @Path("rupture/{id}/{grossiste}")
    public Response renvoiPharmaCommande(@PathParam("id") String ruptureId, @PathParam("grossiste") String grossiste)
            throws JSONException {
        return Response
                .ok(pharmaMlService.renvoiPharmaCommande(ruptureId, grossiste, LocalDate.now().plusDays(1)).toString())
                .build();
    }

    @GET
    @Path("rupture/responseorder")
    public Response reponseRupture(@QueryParam("ruptureId") String orderId) throws JSONException {

        /* JSONObject json = pharmaMlService.reponseRupture(orderId, tu); */
        return Response.ok().build();
    }

}
