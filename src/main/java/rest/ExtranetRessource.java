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

    /**
     * Retour 6 du 08/11 : enregistre le PSCODE sur les fiches retrouvees sans ambiguite par CIP / EAN 13 (fiche encore
     * sans reference Ubipharm) ; une ligne de journal par fiche.
     */
    @POST
    @Path("ubipharm/nouveaux/pscode")
    public Response enregistrerPscode() {
        Response r = refus();
        return r != null ? r : ok(service.enregistrerPscodeNouveaux(Droits.utilisateur(requete)));
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

    /* ============================================================ TEDIS : listes de l'onglet */

    @GET
    @Path("tedis/listes")
    public Response listesTedis() {
        Response r = refus();
        return r != null ? r : ok(service.listesTedis());
    }

    @GET
    @Path("tedis/listes/{code}")
    public Response listeTedis(@PathParam("code") String code) {
        Response r = refus();
        return r != null ? r : ok(service.listeTedisEnCache(code));
    }

    @POST
    @Path("tedis/listes/{code}/collecte")
    public Response collecterListeTedis(@PathParam("code") String code) {
        Response r = refus();
        return r != null ? r : ok(service.collecterListeTedis(code, login()));
    }

    /* ============================================================ Ubipharm : recherche CIP, libelle, DCI */

    @GET
    @Path("ubipharm/recherche")
    public Response rechercherUbipharm(@QueryParam("motif") String motif, @QueryParam("champs") String champs,
            @QueryParam("commencePar") boolean commencePar, @QueryParam("enStock") boolean enStock) {
        Response r = refus();
        return r != null ? r : ok(service.rechercherUbipharm(motif, champs, commencePar, enStock));
    }

    /* ============================================================ Copharmed */

    @GET
    @Path("copharmed/listes")
    public Response listesCopharmed() {
        Response r = refus();
        return r != null ? r : ok(service.listesCopharmed());
    }

    @GET
    @Path("copharmed/listes/{code}")
    public Response listeCopharmed(@PathParam("code") String code) {
        Response r = refus();
        return r != null ? r : ok(service.listeCopharmedEnCache(code));
    }

    @POST
    @Path("copharmed/listes/{code}/collecte")
    public Response collecterListeCopharmed(@PathParam("code") String code) {
        Response r = refus();
        return r != null ? r : ok(service.collecterListeCopharmed(code, login()));
    }

    @GET
    @Path("copharmed/recherche")
    public Response rechercherCopharmed(@QueryParam("motif") String motif) {
        Response r = refus();
        return r != null ? r : ok(service.rechercherCopharmed(motif));
    }

    /* ============================================================ DPCI */

    @GET
    @Path("dpci/listes")
    public Response listesDpci() {
        Response r = refus();
        return r != null ? r : ok(service.listesDpci());
    }

    @GET
    @Path("dpci/listes/{code}")
    public Response listeDpci(@PathParam("code") String code) {
        Response r = refus();
        return r != null ? r : ok(service.listeDpciEnCache(code));
    }

    @POST
    @Path("dpci/listes/{code}/collecte")
    public Response collecterListeDpci(@PathParam("code") String code, @QueryParam("du") String du,
            @QueryParam("au") String au) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        rest.service.extranet.commun.Periode periode;
        try {
            periode = rest.service.extranet.commun.Periode.lire(du, au);
        } catch (IllegalArgumentException e) {
            return ok(new JSONObject().put("success", false).put("msg", e.getMessage()));
        }
        return ok(service.collecterListeDpci(code, login(), periode));
    }

    /* ============================================================ lectures en arriere-plan (08/11) */

    @javax.ejb.EJB
    private rest.service.extranet.LecturesExtranet lectures;

    /**
     * Lance la lecture d'une liste en arriere-plan et rend la main tout de suite ; si une lecture de cette liste tourne
     * deja (autre clic, autre poste), la suit au lieu d'en lancer une autre. Periode (du, au) : DPCI seulement.
     */
    @POST
    @Path("lectures/{famille}/{code}")
    public Response lancerLecture(@PathParam("famille") String famille, @PathParam("code") String code,
            @QueryParam("du") String du, @QueryParam("au") String au) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        String f = famille == null ? "" : famille.trim().toLowerCase(java.util.Locale.ROOT);
        if (!rest.service.extranet.LecturesExtranet.familleConnue(f) || code == null
                || !code.trim().matches("[A-Za-z0-9_]{1,40}")) {
            return ok(new JSONObject().put("success", false).put("msg", "Liste inconnue"));
        }
        rest.service.extranet.commun.Periode periode;
        try {
            periode = "dpci".equals(f) ? rest.service.extranet.commun.Periode.lire(du, au) : null;
        } catch (IllegalArgumentException e) {
            return ok(new JSONObject().put("success", false).put("msg", e.getMessage()));
        }
        rest.service.extranet.commun.EtatLectures etat = rest.service.extranet.commun.EtatLectures.duServeur();
        String cle = rest.service.extranet.commun.EtatLectures.cle(f, code);
        rest.service.extranet.commun.EtatLectures.Lecture l = etat.demarrer(cle, login());
        boolean lancee = l != null;
        if (lancee) {
            lectures.lire(l, f, code.trim().toUpperCase(java.util.Locale.ROOT), login(), periode);
        }
        rest.service.extranet.commun.EtatLectures.Lecture suivie = etat.etat(cle);
        return ok(new JSONObject().put("success", true).put("lancee", lancee).put("lecture",
                suivie == null ? JSONObject.NULL : suivie.toJson(etat.maintenant())));
    }

    /** Etat de la lecture d'une liste : en cours (depuis combien de secondes), finie (avec son resultat), ou aucune. */
    @GET
    @Path("lectures/{famille}/{code}")
    public Response etatLecture(@PathParam("famille") String famille, @PathParam("code") String code) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        rest.service.extranet.commun.EtatLectures etat = rest.service.extranet.commun.EtatLectures.duServeur();
        rest.service.extranet.commun.EtatLectures.Lecture l = etat
                .etat(rest.service.extranet.commun.EtatLectures.cle(famille, code));
        return ok(new JSONObject().put("success", true).put("lecture",
                l == null ? JSONObject.NULL : l.toJson(etat.maintenant())));
    }

    /* ============================================================ Mayite : specialites et monographies */

    @GET
    @Path("mayite/recherche")
    public Response rechercherMayite(@QueryParam("nom") String nom, @QueryParam("dci") String dci,
            @QueryParam("forme") String forme, @QueryParam("laboratoire") String laboratoire) {
        Response r = refus();
        return r != null ? r : ok(service.rechercherMayite(nom, dci, forme, laboratoire));
    }

    @GET
    @Path("mayite/monographie/{id}")
    public Response monographieMayite(@PathParam("id") String id) {
        Response r = refus();
        return r != null ? r : ok(service.monographieMayite(id));
    }

    /* ============================================================ rafraichissement automatique des listes */

    @GET
    @Path("rafraichissement")
    public Response rafraichissements() {
        Response r = refus();
        return r != null ? r : ok(service.rafraichissements());
    }

    /** Corps : {delai : minutes} (0 : jamais). */
    @PUT
    @Path("rafraichissement/{code}")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response definirRafraichissement(@PathParam("code") String code, String corps) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        JSONObject c;
        try {
            c = new JSONObject(corps == null ? "{}" : corps);
        } catch (org.json.JSONException e) {
            return ok(new JSONObject().put("success", false).put("msg", "Corps JSON attendu"));
        }
        return ok(service.definirRafraichissement(code, c.optInt("delai", -1), login()));
    }

    /* ============================================================ export CSV / Excel (retour du 08/11, point 2) */

    /**
     * Corps : {format : csv | xlsx, grossiste, onglet, colonnes : [{titre, nombre}], lignes : [[...]]} (lignes
     * affichees ou toutes les lignes gardees, au choix de l'ecran). Rend le fichier, nom « Grossiste - Onglet - date ».
     * Rien n'est lu sur l'extranet ni ecrit en base.
     */
    @POST
    @Path("export")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.WILDCARD)
    public Response exporter(String corps) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        rest.service.extranet.commun.ExportExtranet.Demande d;
        try {
            d = new rest.service.extranet.commun.ExportExtranet.Demande(new JSONObject(corps == null ? "{}" : corps));
        } catch (org.json.JSONException | IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).type(MediaType.APPLICATION_JSON)
                    .entity(new JSONObject().put("success", false)
                            .put("msg", e instanceof IllegalArgumentException ? e.getMessage() : "Corps JSON attendu")
                            .toString())
                    .build();
        }
        try {
            boolean csv = "csv".equals(d.format);
            byte[] b = csv ? rest.service.extranet.commun.ExportExtranet.csv(d)
                    : rest.service.extranet.commun.ExportExtranet.xlsx(d);
            String nom = rest.service.extranet.commun.ExportExtranet.nomFichier(d.grossiste, d.onglet,
                    java.time.LocalDate.now(), d.format);
            return Response.ok(b)
                    .type(csv ? "text/csv; charset=UTF-8"
                            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .header("Content-Disposition", "attachment; filename=\""
                            + rest.service.extranet.commun.ExportExtranet.nomAscii(nom).replace("\"", "")
                            + "\"; filename*=UTF-8''" + java.net.URLEncoder.encode(nom, "UTF-8").replace("+", "%20"))
                    .header("Access-Control-Expose-Headers", "Content-Disposition").build();
        } catch (java.io.IOException e) {
            return Response.serverError().type(MediaType.APPLICATION_JSON)
                    .entity(new JSONObject().put("success", false).put("msg", "Export impossible").toString()).build();
        }
    }}
