package rest;

import dal.TUser;
import java.time.LocalDate;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.impl.PeremptionsCourtesPdf;
import rest.service.impl.ReceptionMobileService;

/**
 * Reception BL et retour fournisseur mobiles (prestige_vente_app, docs/ETAPE_D_SERVEUR_RECEPTION_RETOUR.md) : fonctions
 * nouvelles, sous la session habituelle (decision du pharmacien). Session absente : 401 ; droit manquant : 403
 * {interdit:true}.
 */
@Path("v1/reception")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class ReceptionMobileRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private ReceptionMobileService service;

    private TUser utilisateur() {
        return Droits.utilisateur(servletRequest);
    }

    static Response sansSession() {
        return Response.status(Response.Status.UNAUTHORIZED)
                .entity(new JSONObject().put("success", false).put("code", "SESSION").toString()).build();
    }

    static Response repondre(JSONObject r) {
        int status = r.optInt("status", 200);
        r.remove("status");
        return Response.status(status).entity(r.toString()).build();
    }

    private static JSONObject corps(String c) {
        try {
            return c == null || c.isBlank() ? new JSONObject() : new JSONObject(c);
        } catch (JSONException e) {
            return null;
        }
    }

    private static LocalDate jour(String v, LocalDate defaut) {
        try {
            return v == null || v.isBlank() ? defaut : LocalDate.parse(v.trim());
        } catch (RuntimeException e) {
            return defaut;
        }
    }

    /** D10 : parametres de reception servis au mobile. */
    @GET
    @Path("parametres")
    public Response parametres() {
        return utilisateur() == null ? sansSession() : repondre(service.parametres());
    }

    /** D12 : peremption courte acceptee ou refusee ; l'acceptation demande P_BL_MOBILE_ACCEPTER_PEREMPTION_COURTE. */
    @POST
    @Path("peremptions-courtes")
    public Response peremptionCourte(String c) {
        if (utilisateur() == null) {
            return sansSession();
        }
        JSONObject in = corps(c);
        if (in == null) {
            return Response.status(400).entity(new JSONObject().put("success", false).put("code", "JSON").toString())
                    .build();
        }
        if ("ACCEPTE".equalsIgnoreCase(in.optString("decision"))) {
            Response refus = Droits.refus(servletRequest, "Accepter une péremption courte",
                    "P_BL_MOBILE_ACCEPTER_PEREMPTION_COURTE");
            if (refus != null) {
                return refus;
            }
        }
        return repondre(service.enregistrerPeremptionCourte(in, utilisateur()));
    }

    /** D12 : rapport des peremptions courtes (par defaut, le mois en cours). */
    @GET
    @Path("peremptions-courtes")
    public Response peremptionsCourtes(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("grossiste") String grossiste, @QueryParam("statut") String statut) {
        if (utilisateur() == null) {
            return sansSession();
        }
        LocalDate a = jour(au, LocalDate.now());
        return repondre(service.peremptionsCourtes(jour(du, a.withDayOfMonth(1)), a, grossiste, statut));
    }

    /** D12 : rapport des peremptions courtes en Excel (memes filtres que la liste). */
    @GET
    @Path("peremptions-courtes/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response peremptionsCourtesExcel(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("grossiste") String grossiste, @QueryParam("statut") String statut) throws java.io.IOException {
        if (utilisateur() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        LocalDate a = jour(au, LocalDate.now()), d = jour(du, a.withDayOfMonth(1));
        JSONObject r = service.peremptionsCourtes(d, a, grossiste, statut);
        java.util.List<JSONObject> lignes = new java.util.ArrayList<>();
        for (int i = 0; i < r.getJSONArray("data").length(); i++) {
            lignes.add(r.getJSONArray("data").getJSONObject(i));
        }
        byte[] data = new rest.report.excel.ClasseurExcel<JSONObject>("Péremptions courtes")
                .titre("PÉREMPTIONS COURTES À LA RÉCEPTION").critere("Période", periode(d, a))
                .texte("Date", l -> PeremptionsCourtesPdf.jour(l.optString("le"))).texte("BL", l -> l.optString("bl"))
                .texte("CIP", l -> l.optString("cip")).texte("Produit", l -> l.optString("produit"))
                .texte("Grossiste", l -> l.optString("grossiste")).texte("Lot", l -> l.optString("numLot"))
                .texte("Péremption", l -> PeremptionsCourtesPdf.jour(l.optString("datePeremption")))
                .nombre("Jours restants", l -> l.optLong("joursRestants"))
                .nombre("Quantité", l -> l.optLong("quantite")).nombre("Valeur", l -> l.optLong("valeur"))
                .texte("Décision", l -> PeremptionsCourtesPdf.libelleDecision(l.optString("decision")))
                .texte("Motif", l -> l.optString("motif"))
                .texte("Statut", l -> PeremptionsCourtesPdf.libelleStatut(l.optString("statut")))
                .texte("Saisi par", l -> l.optString("utilisateur")).construire(lignes);
        return Response.ok(data, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                .header("content-disposition", "attachment; filename=peremptions_courtes.xlsx").build();
    }

    /** D12 : rapport des peremptions courtes en PDF (ecrit directement, sans modele d'edition). */
    @GET
    @Path("peremptions-courtes/pdf")
    @Produces("application/pdf")
    public Response peremptionsCourtesPdf(@QueryParam("du") String du, @QueryParam("au") String au,
            @QueryParam("grossiste") String grossiste, @QueryParam("statut") String statut) throws Exception {
        if (utilisateur() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        LocalDate a = jour(au, LocalDate.now()), d = jour(du, a.withDayOfMonth(1));
        byte[] pdf = PeremptionsCourtesPdf.ecrire(service.peremptionsCourtes(d, a, grossiste, statut),
                service.officine(), periode(d, a));
        return Response.ok(pdf, "application/pdf")
                .header("Content-Disposition", "inline; filename=peremptions_courtes.pdf").build();
    }

    private static String periode(LocalDate d, LocalDate a) {
        java.time.format.DateTimeFormatter f = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        return "du " + d.format(f) + " au " + a.format(f);
    }

    /** D12 : statut de traitement (A_TRAITER, RECLAME, AVOIR_RECU). */
    @PUT
    @Path("peremptions-courtes/{id}/statut")
    public Response statutPeremption(@PathParam("id") String id, @QueryParam("statut") String statut) {
        Response refus = Droits.refus(servletRequest, "Accepter une péremption courte",
                "P_BL_MOBILE_ACCEPTER_PEREMPTION_COURTE");
        return refus != null ? refus : repondre(service.statutPeremptionCourte(id, statut));
    }

    /** D13 : anomalie de reception. */
    @POST
    @Path("anomalies")
    public Response anomalie(String c) {
        if (utilisateur() == null) {
            return sansSession();
        }
        JSONObject in = corps(c);
        return in == null ? Response.status(400)
                .entity(new JSONObject().put("success", false).put("code", "JSON").toString()).build()
                : repondre(service.enregistrerAnomalie(in, utilisateur()));
    }

    @GET
    @Path("anomalies")
    public Response anomalies(@QueryParam("blId") String blId) {
        return utilisateur() == null ? sansSession() : repondre(service.anomalies(blId));
    }

    /** D16 : signal de presence (toutes les 20 s), avec la ligne et le lot en cours pour le verrou. */
    @POST
    @Path("{blId}/presence")
    public Response signaler(@PathParam("blId") String blId, String c) {
        TUser u = utilisateur();
        if (u == null) {
            return sansSession();
        }
        JSONObject in = corps(c);
        if (in == null) {
            in = new JSONObject();
        }
        return repondre(service.presence(blId, u, in.optString("appareil", ""), in.optString("detailId", null),
                in.optString("numLot", null)));
    }

    @GET
    @Path("{blId}/presence")
    public Response presents(@PathParam("blId") String blId) {
        return utilisateur() == null ? sansSession() : repondre(service.presents(blId));
    }
}
