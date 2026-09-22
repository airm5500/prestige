package rest;

import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
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
import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.json.JSONObject;
import rest.service.impl.OrdonnanceClientSaisie;
import rest.service.impl.OrdonnanceClientService;
import rest.service.impl.OrdonnanceClientSql;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;
import util.DateConverter;

/**
 * Ordonnances des clients (evolution 6, point 2, vague 1).
 *
 * <p>
 * Chaque service verifie le privilege AVANT de repondre : la consultation demande {@code P_ORDONNANCE_CLIENT},
 * l'ecriture {@code P_ORDONNANCE_CLIENT_MAJ}. Masquer un bouton dans l'ecran n'est pas un controle d'acces - un appel
 * direct au service le contournerait, et il s'agit ici de donnees de sante.
 *
 * <p>
 * Aucun de ces services ne cree de vente, ne bouge de stock ni n'ecrit dans l'ordonnancier reglementaire.
 */
@Path("v1/ordonnance-client")
@Produces("application/json")
@Consumes("application/json")
public class OrdonnanceClientRessource {

    private static final java.util.logging.Logger LOG = java.util.logging.Logger
            .getLogger(OrdonnanceClientRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private OrdonnanceClientService ordonnanceService;

    @EJB
    private rest.service.impl.SubstitutionService substitutionService;

    private TUser utilisateur() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private List<TPrivilege> privilegesSession() {
        return (List<TPrivilege>) servletRequest.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE);
    }

    private boolean autorise(String privilege) {
        return CommonUtils.hasAuthorityByName(privilegesSession(), privilege);
    }

    private static Response deconnecte() {
        return Response.ok().entity(new JSONObject().put("success", false).put("total", 0)
                .put("message", Constant.DECONNECTED_MESSAGE).toString()).build();
    }

    private static Response refus(String message) {
        return Response.ok()
                .entity(new JSONObject().put("success", false).put("total", 0).put("message", message).toString())
                .build();
    }

    private static Response refusConsultation() {
        return refus("Votre profil ne donne pas accès aux ordonnances des clients.");
    }

    private static Response refusEcriture() {
        return refus("Votre profil ne permet pas de saisir ou de modifier une ordonnance.");
    }

    /**
     * Ce a quoi l'operateur a droit : l'ecran s'en sert pour n'offrir que les gestes possibles, le serveur continuant a
     * verifier chaque appel.
     */
    @GET
    @Path("droits")
    public Response droits() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        return Response.ok()
                .entity(new JSONObject().put("success", true)
                        .put("consulter", autorise(DateConverter.P_ORDONNANCE_CLIENT))
                        .put("modifier", autorise(DateConverter.P_ORDONNANCE_CLIENT_MAJ)).toString())
                .build();
    }

    /** Historique, du plus recent au plus ancien, filtre par client, type de client, prescripteur et periode. */
    @GET
    @Path("liste")
    public Response liste(@QueryParam("query") String query, @QueryParam("clientId") String clientId,
            @QueryParam("typeClientId") String typeClientId, @QueryParam("medecinId") String medecinId,
            @QueryParam("dtStart") String debut, @QueryParam("dtEnd") String fin,
            @QueryParam("annulees") @DefaultValue("false") boolean annulees,
            @QueryParam("start") @DefaultValue("0") int start, @QueryParam("limit") @DefaultValue("50") int limit) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return refusConsultation();
        }
        return Response.ok()
                .entity(ordonnanceService
                        .liste(criteres(query, clientId, typeClientId, medecinId, debut, fin, annulees), start, limit)
                        .toString())
                .build();
    }

    /** Une ordonnance et ses produits. */
    @GET
    @Path("{id}")
    public Response detail(@PathParam("id") String id) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return refusConsultation();
        }
        return Response.ok().entity(ordonnanceService.detail(id).toString()).build();
    }

    /** Creation (sans {@code id}) ou modification (avec) d'une ordonnance. */
    @POST
    @Path("enregistrer")
    public Response enregistrer(String corps) {
        TUser operateur = utilisateur();
        if (operateur == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT_MAJ)) {
            return refusEcriture();
        }
        JSONObject requete;
        try {
            requete = new JSONObject(corps);
        } catch (RuntimeException e) {
            return refus("La saisie n'a pas pu être lue.");
        }
        return Response.ok().entity(ordonnanceService.enregistrer(requete, operateur).toString()).build();
    }

    /**
     * Annulation d'une ordonnance, avec son motif. Il n'y a pas de suppression : le document reste dans l'historique du
     * client, annule et trace.
     */
    @POST
    @Path("annuler")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response annuler(@QueryParam("id") String id, @QueryParam("motif") String motif) {
        TUser operateur = utilisateur();
        if (operateur == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT_MAJ)) {
            return refusEcriture();
        }
        return Response.ok().entity(ordonnanceService.annuler(id, motif, operateur).toString()).build();
    }

    /*
     * ============================================================================================= PIECES
     * JUSTIFICATIVES (vague 2)
     * =============================================================================================
     */

    /**
     * Depot d'une piece sur une ordonnance.
     *
     * <p>
     * Reponse en {@code text/html} : l'envoi de fichier d'ExtJS passe par une iframe cachee, qui n'accepte pas
     * {@code application/json}. C'est le meme montage que l'import du panier de reappro.
     */
    @POST
    @Path("pieces/{ordonnanceId}")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.TEXT_HTML)
    public Response deposerPiece(@PathParam("ordonnanceId") String ordonnanceId) {
        TUser operateur = utilisateur();
        if (operateur == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT_MAJ)) {
            return refusEcriture();
        }
        try {
            ServletFileUpload upload = new ServletFileUpload(new DiskFileItemFactory());
            for (FileItem item : upload.parseRequest(servletRequest)) {
                if (!item.isFormField()) {
                    JSONObject json = ordonnanceService.ajouterPiece(ordonnanceId, item.getName(),
                            item.getInputStream(), item.getSize(), operateur);
                    return Response.ok().entity(json.toString()).build();
                }
            }
            return refus("Aucun fichier reçu.");
        } catch (Exception e) {
            LOG.log(java.util.logging.Level.SEVERE, "depot d'une piece d'ordonnance", e);
            return refus("Le fichier n'a pas pu être lu.");
        }
    }

    /** Les pieces d'une ordonnance. */
    @GET
    @Path("pieces/{ordonnanceId}")
    public Response pieces(@PathParam("ordonnanceId") String ordonnanceId) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return refusConsultation();
        }
        return Response.ok().entity(ordonnanceService.pieces(ordonnanceId).toString()).build();
    }

    /**
     * Consultation d'une piece, servie EN FLUX dans un onglet du navigateur.
     *
     * <p>
     * {@code inline} et non {@code attachment} : l'officine ne veut aucune fenetre surgissante ni telechargement pour
     * regarder un document. Le type MIME est celui deduit de l'extension a l'enregistrement, jamais celui annonce par
     * le navigateur qui a envoye le fichier.
     */
    @GET
    @Path("piece/{pieceId}")
    @Produces(MediaType.WILDCARD)
    public Response voirPiece(@PathParam("pieceId") String pieceId) {
        return servirPiece(pieceId, false);
    }

    /** Telechargement de la meme piece, sous son nom d'origine. */
    @GET
    @Path("piece/{pieceId}/telecharger")
    @Produces(MediaType.WILDCARD)
    public Response telechargerPiece(@PathParam("pieceId") String pieceId) {
        return servirPiece(pieceId, true);
    }

    private Response servirPiece(String pieceId, boolean telechargement) {
        if (utilisateur() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            /*
             * 403 et non un JSON d'erreur : ce service rend un fichier, et un corps JSON servi a la place d'une image
             * s'afficherait comme un document illisible sans dire pourquoi.
             */
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        dal.TOrdonnanceClientPiece piece = ordonnanceService.piece(pieceId);
        java.nio.file.Path fichier = ordonnanceService.fichierDeLaPiece(piece);
        if (fichier == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        String nom = rest.service.impl.OrdonnancePieces.assainir(piece.getStrNOMORIGINE());
        return Response.ok(fichier.toFile()).type(rest.service.impl.OrdonnancePieces.typeMime(nom))
                .header("Content-Disposition",
                        (telechargement ? "attachment" : "inline") + "; filename=\"" + nom + "\"")
                .build();
    }

    /**
     * Retrait d'une piece.
     *
     * <p>
     * C'est la seule suppression de ce menu : une piece jointe au mauvais patient est un probleme de confidentialite,
     * pas une coquille. L'ordonnance, elle, ne se supprime toujours pas.
     */
    @POST
    @Path("piece/{pieceId}/retirer")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response retirerPiece(@PathParam("pieceId") String pieceId) {
        TUser operateur = utilisateur();
        if (operateur == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT_MAJ)) {
            return refusEcriture();
        }
        return Response.ok().entity(ordonnanceService.retirerPiece(pieceId, operateur).toString()).build();
    }

    /** Purge des fichiers de pieces qui ne correspondent a aucune ordonnance. */
    @POST
    @Path("pieces/purger")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response purgerPieces() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT_MAJ)) {
            return refusEcriture();
        }
        return Response.ok().entity(ordonnanceService.purgerPiecesOrphelines().toString()).build();
    }

    /** Prescripteurs actifs (referentiel medecins existant). */
    @GET
    @Path("medecins")
    public Response medecins(@QueryParam("query") String query) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return refusConsultation();
        }
        return Response.ok().entity(ordonnanceService.medecins(query).toString()).build();
    }

    /*
     * ============================================================================================= EDITIONS ET EXPORT
     * (vague 3)
     *
     * Les PDF sont servis EN FLUX, inline, dans l'onglet ouvert par le clic : « je ne veux pas de pop up pour aucune
     * edition ». Aucun fichier temporaire n'est ecrit sur le serveur.
     * =============================================================================================
     */

    /** Fiche detaillee d'une ordonnance, en PDF. */
    @GET
    @Path("{id}/pdf")
    @Produces("application/pdf")
    public Response fichePdf(@PathParam("id") String id) {
        TUser operateur = utilisateur();
        if (operateur == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            byte[] pdf = ordonnanceService.pdfFiche(operateur, id);
            return Response.ok(pdf).type("application/pdf")
                    .header("Content-Disposition", "inline; filename=\"ordonnance.pdf\"").build();
        } catch (Exception e) {
            LOG.log(java.util.logging.Level.SEVERE, "edition de la fiche d'ordonnance", e);
            return Response.status(Response.Status.NOT_FOUND).build();
        }
    }

    /**
     * Historique en PDF : la liste filtree, ou celle d'un seul client.
     *
     * <p>
     * C'est le MEME etat dans les deux cas - un client est un critere comme un autre - et le rappel des criteres
     * imprime dit lequel a ete pose. Deux etats distincts auraient diverge au premier ajout de colonne.
     */
    @GET
    @Path("historique/pdf")
    @Produces("application/pdf")
    public Response historiquePdf(@QueryParam("query") String query, @QueryParam("clientId") String clientId,
            @QueryParam("typeClientId") String typeClientId, @QueryParam("medecinId") String medecinId,
            @QueryParam("dtStart") String debut, @QueryParam("dtEnd") String fin,
            @QueryParam("annulees") @DefaultValue("false") boolean annulees,
            @QueryParam("clientLibelle") String clientLibelle, @QueryParam("typeLibelle") String typeLibelle,
            @QueryParam("medecinLibelle") String medecinLibelle) {
        TUser operateur = utilisateur();
        if (operateur == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            byte[] pdf = ordonnanceService.pdfHistorique(operateur,
                    criteres(query, clientId, typeClientId, medecinId, debut, fin, annulees), clientLibelle,
                    typeLibelle, medecinLibelle);
            return Response.ok(pdf).type("application/pdf")
                    .header("Content-Disposition", "inline; filename=\"ordonnances_historique.pdf\"").build();
        } catch (Exception e) {
            LOG.log(java.util.logging.Level.SEVERE, "edition de l'historique des ordonnances", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    /** Export Excel de l'historique : une ligne par produit prescrit, filtres compris. */
    @GET
    @Path("historique/excel")
    @Produces("application/vnd.ms-excel")
    public Response historiqueExcel(@QueryParam("query") String query, @QueryParam("clientId") String clientId,
            @QueryParam("typeClientId") String typeClientId, @QueryParam("medecinId") String medecinId,
            @QueryParam("dtStart") String debut, @QueryParam("dtEnd") String fin,
            @QueryParam("annulees") @DefaultValue("false") boolean annulees) {
        if (utilisateur() == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            byte[] classeur = ordonnanceService
                    .excelHistorique(criteres(query, clientId, typeClientId, medecinId, debut, fin, annulees));
            return Response.ok(classeur).type("application/vnd.ms-excel")
                    .header("Content-Disposition", "attachment; filename=\"ordonnances_clients.xls\"").build();
        } catch (Exception e) {
            LOG.log(java.util.logging.Level.SEVERE, "export Excel des ordonnances", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Analyse des ordonnances saisies (retour du 22/09) : taux d'annulation, de service, satisfaction, ventilations par
     * prescripteur, etablissement et type de client, produits les plus prescrits. Memes criteres que l'historique.
     */
    @GET
    @Path("analyse")
    public Response analyse(@QueryParam("query") String query, @QueryParam("clientId") String clientId,
            @QueryParam("typeClientId") String typeClientId, @QueryParam("medecinId") String medecinId,
            @QueryParam("dtStart") String debut, @QueryParam("dtEnd") String fin) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return refusConsultation();
        }
        return Response
                .ok().entity(ordonnanceService
                        .analyse(criteres(query, clientId, typeClientId, medecinId, debut, fin, true)).toString())
                .build();
    }

    /**
     * Equivalents d'un produit (retour du 23/09) : memes DCI, classes « equivalent direct » ou « a adapter », avec le
     * stock de l'emplacement de l'operateur et le prix. Lecture seule.
     */
    @GET
    @Path("substituts/{familleId}")
    public Response substituts(@PathParam("familleId") String familleId) {
        TUser operateur = utilisateur();
        if (operateur == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return refusConsultation();
        }
        String emplacement = operateur.getLgEMPLACEMENTID() == null ? null
                : operateur.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        return Response.ok().entity(substitutionService.substituts(familleId, emplacement).toString()).build();
    }

    /** L'onglet Analyse en PDF, servi en flux dans l'onglet ouvert par le clic (aucune fenetre surgissante). */
    @GET
    @Path("analyse/pdf")
    @Produces("application/pdf")
    public Response analysePdf(@QueryParam("typeClientId") String typeClientId,
            @QueryParam("medecinId") String medecinId, @QueryParam("dtStart") String debut,
            @QueryParam("dtEnd") String fin, @QueryParam("typeLibelle") String typeLibelle,
            @QueryParam("medecinLibelle") String medecinLibelle) {
        TUser operateur = utilisateur();
        if (operateur == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return Response.status(Response.Status.FORBIDDEN).build();
        }
        try {
            byte[] pdf = ordonnanceService.pdfAnalyse(operateur,
                    criteres(null, null, typeClientId, medecinId, debut, fin, true), typeLibelle, medecinLibelle);
            return Response.ok(pdf).type("application/pdf")
                    .header("Content-Disposition", "inline; filename=\"analyse_ordonnances.pdf\"").build();
        } catch (Exception e) {
            LOG.log(java.util.logging.Level.SEVERE, "edition de l'analyse des ordonnances", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Suivi de consommation d'un client, vu depuis ses ordonnances : le service de la gestion des clients, plus le
     * stock disponible de chaque produit sur l'emplacement de l'operateur.
     */
    @GET
    @Path("client/{clientId}/consommation")
    public Response consommationClient(@PathParam("clientId") String clientId, @QueryParam("dtStart") String debut,
            @QueryParam("dtEnd") String fin) {
        TUser operateur = utilisateur();
        if (operateur == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return refusConsultation();
        }
        String emplacement = operateur.getLgEMPLACEMENTID() == null ? null
                : operateur.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        return Response.ok().entity(ordonnanceService.consommationClient(clientId, debut, fin, emplacement).toString())
                .build();
    }

    /** Types de client (carnet, assurance, standard) pour le filtre de l'historique. */
    @GET
    @Path("types-client")
    public Response typesClient() {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return refusConsultation();
        }
        return Response.ok().entity(ordonnanceService.typesClient().toString()).build();
    }

    /** Etablissements deja saisis, proposes a la frappe. */
    @GET
    @Path("etablissements")
    public Response etablissements(@QueryParam("query") String query) {
        if (utilisateur() == null) {
            return deconnecte();
        }
        if (!autorise(DateConverter.P_ORDONNANCE_CLIENT)) {
            return refusConsultation();
        }
        return Response.ok().entity(ordonnanceService.etablissements(query).toString()).build();
    }

    private static OrdonnanceClientSql.Criteres criteres(String query, String clientId, String typeClientId,
            String medecinId, String debut, String fin, boolean annulees) {
        LocalDate d = OrdonnanceClientSaisie.date(debut);
        LocalDate f = OrdonnanceClientSaisie.date(fin);
        return new OrdonnanceClientSql.Criteres(query, clientId, typeClientId, medecinId, d, f, annulees);
    }
}
