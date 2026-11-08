package rest;

import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONObject;
import rest.service.extranet.ExtranetService;
import rest.service.extranet.commun.SourceExtranet;
import util.Constant;

/**
 * EXTRANETS GROSSISTES (plan du 07/11), lecture seule. Menu « Extranets grossistes » (GESTION DES COMMANDES), droit
 * P_SM_EXTRANETS_GROSSISTES. Renseigner ou effacer la session d'un extranet est reserve a l'administrateur ; la valeur
 * de la session n'est jamais renvoyee.
 */
@Path("v1/extranet")
@Produces(MediaType.APPLICATION_JSON)
public class ExtranetRessource {

    static final String DROIT = "P_SM_EXTRANETS_GROSSISTES";
    static final String LIBELLE = "Extranets grossistes";

    @Inject
    private HttpServletRequest requete;

    @EJB
    private ExtranetService service;

    private Response refus() {
        return Droits.refus(requete, LIBELLE, DROIT);
    }

    private boolean administrateur() {
        Object role = requete.getSession(false) == null ? null
                : requete.getSession(false).getAttribute(Constant.USER_ROLE_ID);
        return role != null && service.administrateur(role.toString());
    }

    private static Response ok(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    private static Response sourceInconnue() {
        return Response.status(Response.Status.BAD_REQUEST).type(MediaType.APPLICATION_JSON)
                .entity(new JSONObject().put("success", false).put("msg", "Extranet inconnu").toString()).build();
    }

    @GET
    @Path("sessions")
    public Response sessions() {
        Response r = refus();
        return r != null ? r : ok(service.sessions().put("administrateur", administrateur()));
    }

    /** Corps : {"cookies": "SESSIONID=..."} ; administrateur seulement. */
    @PUT
    @Path("sessions/{source}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response definirSession(@PathParam("source") String source, String corps) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        if (!administrateur()) {
            return Droits.interdit("Renseigner la session d'un extranet (administrateur)");
        }
        SourceExtranet s = SourceExtranet.lire(source);
        if (s == null) {
            return sourceInconnue();
        }
        String cookies;
        try {
            cookies = new JSONObject(corps == null ? "{}" : corps).optString("cookies", null);
        } catch (Exception e) {
            cookies = null;
        }
        return ok(service.definirSession(s, cookies, Droits.utilisateur(requete).getStrLOGIN()));
    }

    @DELETE
    @Path("sessions/{source}")
    public Response effacerSession(@PathParam("source") String source) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        if (!administrateur()) {
            return Droits.interdit("Effacer la session d'un extranet (administrateur)");
        }
        SourceExtranet s = SourceExtranet.lire(source);
        return s == null ? sourceInconnue() : ok(service.effacerSession(s));
    }

    /**
     * Corps : {"identifiant": "...", "motDePasse": "..."} (mot de passe vide : inchange) ; administrateur seulement.
     */
    @PUT
    @Path("comptes/{source}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response enregistrerCompte(@PathParam("source") String source, String corps) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        if (!administrateur()) {
            return Droits.interdit("Renseigner les identifiants d'un extranet (administrateur)");
        }
        SourceExtranet s = SourceExtranet.lire(source);
        if (s == null) {
            return sourceInconnue();
        }
        JSONObject in;
        try {
            in = new JSONObject(corps == null ? "{}" : corps);
        } catch (Exception e) {
            in = new JSONObject();
        }
        return ok(service.enregistrerCompte(s, in.optString("identifiant", null), in.optString("motDePasse", null),
                in.optString("pageConnexion", null), in.optString("champIdentifiant", null), login()));
    }

    @DELETE
    @Path("comptes/{source}")
    public Response effacerCompte(@PathParam("source") String source) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        if (!administrateur()) {
            return Droits.interdit("Effacer les identifiants d'un extranet (administrateur)");
        }
        SourceExtranet s = SourceExtranet.lire(source);
        return s == null ? sourceInconnue() : ok(service.effacerCompte(s));
    }

    /** Connexion maintenant avec les identifiants enregistres ; administrateur seulement. */
    @POST
    @Path("comptes/{source}/connexion")
    public Response seConnecter(@PathParam("source") String source) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        if (!administrateur()) {
            return Droits.interdit("Connecter un extranet (administrateur)");
        }
        SourceExtranet s = SourceExtranet.lire(source);
        return s == null ? sourceInconnue() : ok(service.seConnecter(s));
    }

    @GET
    @Path("{source}/collectes")
    public Response collectes(@PathParam("source") String source, @QueryParam("module") String module,
            @DefaultValue("20") @QueryParam("nombre") int nombre) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        SourceExtranet s = SourceExtranet.lire(source);
        return s == null ? sourceInconnue() : ok(service.collectes(s, module, nombre));
    }

    @GET
    @Path("collectes/{id}")
    public Response collecte(@PathParam("id") long id) {
        Response r = refus();
        return r != null ? r : ok(service.collecte(id));
    }

    private String login() {
        return Droits.utilisateur(requete).getStrLOGIN();
    }

    /* ============================================================ Ubipharm : fiche produit */

    @GET
    @Path("ubipharm/produits/{pscode}")
    public Response fiche(@PathParam("pscode") String pscode) {
        Response r = refus();
        return r != null ? r : ok(service.ficheEnCache(pscode));
    }

    /** Lit la fiche sur l'extranet maintenant (GET seulement) et met le cache a jour. */
    @POST
    @Path("ubipharm/produits/{pscode}/collecte")
    public Response collecterFiche(@PathParam("pscode") String pscode) {
        Response r = refus();
        return r != null ? r : ok(service.collecterFiche(pscode, login()));
    }

    /* ============================================================ Ubipharm : reapprovisionnements */

    @GET
    @Path("ubipharm/reappro")
    public Response reappro(@QueryParam("recherche") String recherche, @QueryParam("agence") String agence,
            @DefaultValue("1") @QueryParam("page") int page, @DefaultValue("50") @QueryParam("limit") int limit) {
        Response r = refus();
        return r != null ? r : ok(service.reapproEnCache(recherche, agence, Math.max(0, page - 1), limit));
    }

    @POST
    @Path("ubipharm/reappro/collecte")
    public Response collecterReappro() {
        Response r = refus();
        return r != null ? r : ok(service.collecterReappro(login()));
    }

    /* ============================================================ Ubipharm : reclamations */

    @GET
    @Path("ubipharm/reclamations")
    public Response reclamations(@DefaultValue("ALL") @QueryParam("filtre") String filtre) {
        Response r = refus();
        return r != null ? r : ok(service.reclamationsEnCache(filtre));
    }

    @POST
    @Path("ubipharm/reclamations/collecte")
    public Response collecterReclamations(@DefaultValue("ALL") @QueryParam("filtre") String filtre) {
        Response r = refus();
        return r != null ? r : ok(service.collecterReclamations(filtre, login()));
    }

    @GET
    @Path("ubipharm/reclamations/detail")
    public Response reclamation(@QueryParam("id") String id, @QueryParam("eta") String eta,
            @QueryParam("appl") String appl) {
        Response r = refus();
        return r != null ? r : ok(service.reclamationEnCache(id, eta, appl));
    }

    @POST
    @Path("ubipharm/reclamations/detail/collecte")
    public Response collecterReclamation(@QueryParam("id") String id, @QueryParam("eta") String eta,
            @QueryParam("appl") String appl) {
        Response r = refus();
        return r != null ? r : ok(service.collecterReclamation(id, eta, appl, login()));
    }

    @POST
    @Path("ubipharm/reclamations/pdf/collecte")
    public Response collecterPdf(@QueryParam("id") String id, @QueryParam("eta") String eta,
            @QueryParam("appl") String appl) {
        Response r = refus();
        return r != null ? r : ok(service.collecterPdfReclamation(id, eta, appl, login()));
    }

    /** PDF deja telecharge, ouvert dans le navigateur (jamais retelecharge ici). */
    @GET
    @Path("ubipharm/reclamations/pdf")
    @Produces("application/pdf")
    public Response pdf(@QueryParam("id") String id, @QueryParam("eta") String eta, @QueryParam("appl") String appl) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        java.nio.file.Path f = service.fichierPdfReclamation(id, eta, appl);
        if (f == null) {
            return Response.status(Response.Status.NOT_FOUND).type(MediaType.TEXT_PLAIN).entity("PDF non téléchargé")
                    .build();
        }
        return Response.ok(f.toFile(), "application/pdf")
                .header("Content-Disposition", "inline; filename=\"reclamation-" + id + ".pdf\"").build();
    }

    /* ============================================================ Ubipharm : nouveaux produits */

    @GET
    @Path("ubipharm/nouveaux")
    public Response nouveaux() {
        Response r = refus();
        return r != null ? r : ok(service.nouveauxEnCache());
    }

    @POST
    @Path("ubipharm/nouveaux/collecte")
    public Response collecterNouveaux() {
        Response r = refus();
        return r != null ? r : ok(service.collecterNouveaux(login()));
    }

    /** Propose les articles de Prestige correspondants ; ne cree ni ne modifie rien. */
    @GET
    @Path("ubipharm/nouveaux/rapprochement")
    public Response rapprochement() {
        Response r = refus();
        return r != null ? r : ok(service.rapprocherNouveaux());
    }

    /* ============================================================ Ubipharm : listes de l'onglet */

    @GET
    @Path("ubipharm/listes")
    public Response listes() {
        Response r = refus();
        return r != null ? r : ok(service.listesUbipharm());
    }

    @GET
    @Path("ubipharm/listes/{code}")
    public Response liste(@PathParam("code") String code) {
        Response r = refus();
        return r != null ? r : ok(service.listeEnCache(code));
    }

    @POST
    @Path("ubipharm/listes/{code}/collecte")
    public Response collecterListe(@PathParam("code") String code) {
        Response r = refus();
        return r != null ? r : ok(service.collecterListe(code, login()));
    }
}
