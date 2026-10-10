package rest;

import dal.TPrivilege;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.fileupload.FileItem;
import org.apache.commons.fileupload.disk.DiskFileItemFactory;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.impl.PointageBLService;
import rest.service.impl.ReleveGrossistePdf;
import rest.service.impl.ReleveModele;
import toolkits.parameters.commonparameter;
import util.CommonUtils;
import util.Constant;

/**
 * Retours du 09/10 (5) : pointage des BL et avoirs grossistes et rapprochement avec le releve PDF du grossiste (droit
 * du menu P_SM_POINTAGE_BL). Modifications directement dans la liste (pas de fenetre de saisie).
 */
@Path("v1/pointage-bl")
@Produces("application/json")
public class PointageBLRessource {

    static final String P_SM_POINTAGE_BL = "P_SM_POINTAGE_BL";
    /** Un releve mensuel fait quelques pages : 10 Mo suffisent largement. */
    static final long TAILLE_MAX = 10L * 1024 * 1024;

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    private PointageBLService service;

    private TUser utilisateur() {
        HttpSession s = servletRequest.getSession(false);
        return s == null ? null : (TUser) s.getAttribute(commonparameter.AIRTIME_USER);
    }

    @SuppressWarnings("unchecked")
    private boolean autorise() {
        HttpSession s = servletRequest.getSession(false);
        return s != null && CommonUtils.hasAuthorityByName(
                (List<TPrivilege>) s.getAttribute(commonparameter.USER_LIST_PRIVILEGE), P_SM_POINTAGE_BL);
    }

    private static JSONObject echec(String msg) {
        return new JSONObject().put("success", false).put("msg", msg);
    }

    private static Response json(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    /** null si l'acces est permis, sinon la reponse de refus. */
    private JSONObject refus() {
        if (utilisateur() == null) {
            return echec(Constant.DECONNECTED_MESSAGE);
        }
        if (!autorise()) {
            return echec("Vous n'avez pas le droit d'accéder au pointage des BL.").put("interdit", true);
        }
        return null;
    }

    private static String emplacement(TUser u) {
        return u.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
    }

    private static LocalDate jour(String v, LocalDate defaut) {
        try {
            return StringUtils.isBlank(v) ? defaut : LocalDate.parse(v.trim());
        } catch (RuntimeException e) {
            return defaut;
        }
    }

    @GET
    public Response liste(@QueryParam("grossiste") String grossiste, @QueryParam("du") String du,
            @QueryParam("au") String au, @QueryParam("etat") String etat, @QueryParam("groupe") String groupe) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        Object crit = criteres(grossiste, groupe, du, au);
        if (crit instanceof JSONObject) {
            return json((JSONObject) crit);
        }
        Criteres c = (Criteres) crit;
        return json(service.liste(c.grossistes, emplacement(utilisateur()), c.debut, c.fin, etat));
    }

    /** Criteres communs a la liste et a son edition PDF. */
    private static final class Criteres {
        java.util.List<String> grossistes;
        LocalDate debut, fin;
    }

    /**
     * Retours du 10/10 : un grossiste, ou a defaut tous les grossistes d'un groupe. Rend un echec (JSONObject) ou les
     * criteres.
     */
    private Object criteres(String grossiste, String groupe, String du, String au) {
        Criteres c = new Criteres();
        if (StringUtils.isNotBlank(grossiste)) {
            c.grossistes = java.util.Collections.singletonList(grossiste.trim());
        } else if (StringUtils.isNotBlank(groupe)) {
            c.grossistes = service.grossistesDuGroupe(groupe.trim());
            if (c.grossistes.isEmpty()) {
                return echec("Ce groupe n'a aucun grossiste.");
            }
        } else {
            return echec("Choisissez un grossiste ou un groupe de grossistes.");
        }
        c.fin = jour(au, LocalDate.now());
        c.debut = jour(du, c.fin.withDayOfMonth(1));
        if (c.debut.isAfter(c.fin)) {
            return echec("La date de début est après la date de fin.");
        }
        if (c.debut.plusYears(1).isBefore(c.fin)) {
            return echec("Période trop longue : un an au plus.");
        }
        return c;
    }

    private static final java.time.format.DateTimeFormatter JJ = java.time.format.DateTimeFormatter
            .ofPattern("dd/MM/yyyy");

    private String imprimePar() {
        dal.TUser u = utilisateur();
        return u == null ? "" : (u.getStrFIRSTNAME() + " " + u.getStrLASTNAME()).trim();
    }

    private static String montant(Object v) {
        if (v == null || JSONObject.NULL.equals(v)) {
            return "";
        }
        long n = ((Number) v).longValue();
        return String.format(java.util.Locale.FRANCE, "%,d", n).replace('\u202f', ' ').replace('\u00a0', ' ');
    }

    /** Retours du 10/10 : edition PDF de la liste des pieces (pointees ou non), memes criteres que l'ecran. */
    @GET
    @Path("pdf")
    @Produces("application/pdf")
    public Response pdf(@QueryParam("grossiste") String grossiste, @QueryParam("du") String du,
            @QueryParam("au") String au, @QueryParam("etat") String etat, @QueryParam("groupe") String groupe) {
        if (refus() != null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        Object crit = criteres(grossiste, groupe, du, au);
        if (crit instanceof JSONObject) {
            return Response.status(Response.Status.BAD_REQUEST).entity(((JSONObject) crit).optString("msg"))
                    .type("text/plain;charset=UTF-8").build();
        }
        Criteres c = (Criteres) crit;
        JSONObject l = service.liste(c.grossistes, emplacement(utilisateur()), c.debut, c.fin, etat);
        java.util.List<String[]> lignes = new java.util.ArrayList<>();
        org.json.JSONArray d = l.getJSONArray("data");
        for (int i = 0; i < d.length(); i++) {
            JSONObject p = d.getJSONObject(i);
            String type = p.optString("type");
            lignes.add(new String[] {
                    "BL".equals(type) ? "BL"
                            : "RETOUR".equals(type) ? "Avoir (retour)"
                                    : "RECEPTION".equals(type) ? "Avoir (manquants)" : type,
                    p.optString("reference"), p.optString("sequence"), p.optString("referenceAvoir"),
                    p.optString("date"), montant(p.opt("montantHt")), p.optString("statut"),
                    p.optBoolean("pointe") ? "Oui" : "Non",
                    (p.optString("pointeLe") + " " + p.optString("pointePar")).trim() });
        }
        rest.report.pdf.TableauPdf.Edition e = new rest.report.pdf.TableauPdf.Edition();
        e.officine = service.officine();
        e.titre = "POINTAGE DES BL ET AVOIRS — " + service.libelle(grossiste, groupe);
        e.sousTitre = "Du " + c.debut.format(JJ) + " au " + c.fin.format(JJ) + " · "
                + ("POINTES".equals(etat) ? "pièces pointées"
                        : "NON_POINTES".equals(etat) ? "pièces non pointées" : "toutes les pièces")
                + " · BL " + montant(l.opt("totalBl")) + " · avoirs " + montant(l.opt("totalAvoirs")) + " · net "
                + montant(l.opt("net")) + " · " + l.optInt("pointes") + " pointée(s), " + l.optInt("nonPointes")
                + " non pointée(s)";
        e.imprimePar = imprimePar();
        e.entetes = new String[] { "Type", "N° BL", "N° séq.", "Réf. avoir", "Date", "Montant HT", "Statut", "Pointé",
                "Pointé le / par" };
        e.largeurs = new float[] { 6f, 11f, 7f, 11f, 8f, 10f, 14f, 6f, 17f };
        e.droite = new boolean[] { false, false, false, false, false, true, false, false, false };
        return Response.ok(rest.report.pdf.TableauPdf.generer(e, lignes), "application/pdf")
                .header("Content-Disposition", "inline; filename=pointage_bl.pdf").build();
    }

    /** Retours du 10/10 : edition PDF du rapprochement d'un releve avec les pieces de Prestige. */
    @GET
    @Path("releve/{id}/pdf")
    @Produces("application/pdf")
    public Response relevePdf(@PathParam("id") String id) {
        if (refus() != null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        JSONObject r = service.releve(id);
        if (!r.optBoolean("success")) {
            return Response.status(Response.Status.NOT_FOUND).entity(r.optString("msg"))
                    .type("text/plain;charset=UTF-8").build();
        }
        java.util.List<String[]> lignes = new java.util.ArrayList<>();
        org.json.JSONArray d = r.getJSONArray("data");
        for (int i = 0; i < d.length(); i++) {
            JSONObject l = d.getJSONObject(i);
            lignes.add(new String[] { libelleStatut(l.optString("statut")), l.optString("type"), l.optString("numero"),
                    l.optString("sequence"), l.optString("date"), montant(l.opt("montantReleve")),
                    l.optString("pieceReference"), montant(l.opt("montantPrestige")), montant(l.opt("ecart")) });
        }
        JSONObject t = r.getJSONObject("totaux");
        rest.report.pdf.TableauPdf.Edition e = new rest.report.pdf.TableauPdf.Edition();
        e.officine = service.officine();
        e.titre = "RAPPROCHEMENT DU RELEVÉ — " + r.optString("grossiste");
        e.sousTitre = "Relevé " + r.optString("fichier") + " du " + r.optString("du") + " au " + r.optString("au")
                + " · relevé net " + montant(t.opt("releveNet")) + " · Prestige net " + montant(t.opt("prestigeNet"))
                + " · écart " + montant(t.opt("ecartNet"));
        e.imprimePar = imprimePar();
        e.entetes = new String[] { "Statut", "Type", "N° relevé", "Séq.", "Date", "Montant relevé", "Pièce Prestige",
                "Montant Prestige", "Écart" };
        e.largeurs = new float[] { 14f, 6f, 11f, 6f, 8f, 11f, 13f, 11f, 9f };
        e.droite = new boolean[] { false, false, false, false, false, true, false, true, true };
        return Response.ok(rest.report.pdf.TableauPdf.generer(e, lignes), "application/pdf")
                .header("Content-Disposition", "inline; filename=rapprochement_releve.pdf").build();
    }

    private static String libelleStatut(String s) {
        switch (s == null ? "" : s) {
        case "RAPPROCHE":
            return "Rapproché";
        case "ECART":
            return "Écart de montant";
        case "ABSENT_PRESTIGE":
            return "Absent de Prestige";
        case "ABSENT_RELEVE":
            return "Absent du relevé";
        default:
            return s;
        }
    }

    /** type = BL | RETOUR ; pointe = true / false. */
    @PUT
    @Path("pointer/{type}/{id}")
    public Response pointer(@PathParam("type") String type, @PathParam("id") String id,
            @QueryParam("pointe") boolean pointe) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(service.pointer(type, id, pointe, utilisateur().getLgUSERID()));
    }

    @PUT
    @Path("sequence/{blId}")
    public Response sequence(@PathParam("blId") String blId, @QueryParam("valeur") String valeur) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(service.sequence(blId, valeur));
    }

    @PUT
    @Path("avoir/{retourId}")
    public Response referenceAvoir(@PathParam("retourId") String retourId, @QueryParam("valeur") String valeur) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(service.referenceAvoir(retourId, valeur));
    }

    /** Import du releve PDF (reponse text/html : l'envoi de fichier d'ExtJS passe par une iframe cachee). */
    @POST
    @Path("releve")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.TEXT_HTML)
    public Response importer() {
        JSONObject r = refus();
        if (r != null) {
            return Response.ok(r.toString()).build();
        }
        try {
            ServletFileUpload upload = new ServletFileUpload(new DiskFileItemFactory());
            upload.setFileSizeMax(TAILLE_MAX);
            upload.setSizeMax(TAILLE_MAX + 64 * 1024);
            String grossiste = null;
            FileItem pdf = null;
            for (FileItem item : upload.parseRequest(servletRequest)) {
                if (item.isFormField() && "grossiste".equals(item.getFieldName())) {
                    grossiste = StringUtils.trimToNull(item.getString("UTF-8"));
                } else if (!item.isFormField() && pdf == null) {
                    pdf = item;
                }
            }
            if (grossiste == null) {
                return Response.ok(echec("Choisissez le grossiste du relevé.").toString()).build();
            }
            if (pdf == null || pdf.getSize() == 0) {
                return Response.ok(echec("Aucun fichier reçu.").toString()).build();
            }
            String nom = StringUtils.defaultString(pdf.getName());
            nom = nom.substring(Math.max(nom.lastIndexOf('/'), nom.lastIndexOf('\\')) + 1);
            if (!nom.toLowerCase().endsWith(".pdf")) {
                return Response.ok(echec("Le relevé doit être un fichier PDF.").toString()).build();
            }
            byte[] octets = pdf.get();
            List<ReleveModele.LigneBrute> brutes = ReleveGrossistePdf.lignes(new java.io.ByteArrayInputStream(octets));
            String texte = ReleveGrossistePdf.texte(new java.io.ByteArrayInputStream(octets));
            TUser u = utilisateur();
            String jeton = garder(new Import(grossiste, nom, brutes, texte));
            return Response.ok(service.importer(grossiste, emplacement(u), nom, brutes, texte, u.getLgUSERID())
                    .put("jeton", jeton).toString()).build();
        } catch (org.apache.commons.fileupload.FileUploadBase.SizeLimitExceededException
                | org.apache.commons.fileupload.FileUploadBase.FileSizeLimitExceededException e) {
            return Response.ok(echec("Le fichier dépasse 10 Mo.").toString()).build();
        } catch (Exception e) {
            return Response.ok(echec("Le PDF n'a pas pu être lu (fichier abîmé ou protégé).").toString()).build();
        }
    }

    @GET
    @Path("releve/{id}")
    public Response releve(@PathParam("id") String id) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(service.releve(id));
    }

    @GET
    @Path("releves")
    public Response releves(@QueryParam("grossiste") String grossiste) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(service.releves(StringUtils.defaultString(grossiste), emplacement(utilisateur())));
    }

    @PUT
    @Path("releve/{id}/pointer")
    public Response pointerRapproches(@PathParam("id") String id) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(service.pointerRapproches(id, utilisateur().getLgUSERID()));
    }

    /**
     * Releve importe garde en session (lignes lues du PDF, pas le fichier) le temps de designer ses colonnes : pas de
     * nouvel envoi du PDF. Les trois derniers imports de la session sont gardes.
     */
    static final class Import implements java.io.Serializable {

        private static final long serialVersionUID = 1L;
        final String grossiste, fichier, texte;
        final java.util.ArrayList<ReleveModele.LigneBrute> brutes;

        Import(String grossiste, String fichier, List<ReleveModele.LigneBrute> brutes, String texte) {
            this.grossiste = grossiste;
            this.fichier = fichier;
            this.brutes = new java.util.ArrayList<>(brutes);
            this.texte = texte;
        }
    }

    static final String IMPORTS = "pointageBL.imports";

    @SuppressWarnings("unchecked")
    private String garder(Import i) {
        HttpSession s = servletRequest.getSession(false);
        java.util.LinkedHashMap<String, Import> m = (java.util.LinkedHashMap<String, Import>) s.getAttribute(IMPORTS);
        if (m == null) {
            m = new java.util.LinkedHashMap<>();
        }
        while (m.size() >= 3) {
            m.remove(m.keySet().iterator().next());
        }
        String jeton = java.util.UUID.randomUUID().toString();
        m.put(jeton, i);
        s.setAttribute(IMPORTS, m);
        return jeton;
    }

    @SuppressWarnings("unchecked")
    private Import importGarde(String jeton) {
        HttpSession s = servletRequest.getSession(false);
        java.util.Map<String, Import> m = s == null ? null : (java.util.Map<String, Import>) s.getAttribute(IMPORTS);
        return m == null || jeton == null ? null : m.get(jeton);
    }

    private static final String IMPORT_PERIME = "Relevé à réimporter (session expirée ou relevé remplacé).";

    /** Colonnes du releve importe, en-tetes et colonnes proposees. */
    @GET
    @Path("releve/apercu")
    public Response apercu(@QueryParam("jeton") String jeton) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        Import i = importGarde(jeton);
        if (i == null) {
            return json(echec(IMPORT_PERIME));
        }
        return json(service.apercu(i.grossiste, i.brutes).put("fichier", i.fichier));
    }

    private static JSONObject corps(String body) {
        try {
            return new JSONObject(StringUtils.defaultIfBlank(body, "{}"));
        } catch (RuntimeException e) {
            return new JSONObject();
        }
    }

    private static String marqueurs(JSONObject o) {
        String m = StringUtils.trimToEmpty(o.optString("marqueursAvoir", "AV"));
        return StringUtils.left(m.replaceAll("[^A-Za-z0-9/ ,;-]", ""), 60);
    }

    /** Essai des colonnes choisies (rien n'est enregistre). */
    @POST
    @Path("releve/essai")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response essai(String body) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        JSONObject o = corps(body);
        Import i = importGarde(o.optString("jeton", null));
        if (i == null) {
            return json(echec(IMPORT_PERIME));
        }
        return json(service.essayer(i.brutes, o.optJSONObject("champs"), marqueurs(o)));
    }

    /** Applique les colonnes choisies, memorise le reglage du grossiste et rapproche le releve. */
    @POST
    @Path("releve/modele")
    @Consumes(MediaType.APPLICATION_JSON)
    public Response appliquerModele(String body) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        JSONObject o = corps(body);
        Import i = importGarde(o.optString("jeton", null));
        if (i == null) {
            return json(echec(IMPORT_PERIME));
        }
        TUser u = utilisateur();
        return json(service.appliquerModele(i.grossiste, emplacement(u), i.fichier, i.brutes, o.optJSONObject("champs"),
                marqueurs(o), u.getLgUSERID()).put("jeton", o.optString("jeton")));
    }

    @GET
    @Path("modele")
    public Response modele(@QueryParam("grossiste") String grossiste) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        return json(service.infoModele(StringUtils.defaultString(grossiste)));
    }

    /** Oublie le reglage des colonnes du grossiste (retour au format standard). */
    @DELETE
    @Path("modele")
    public Response oublierModele(@QueryParam("grossiste") String grossiste) {
        JSONObject r = refus();
        if (r != null) {
            return json(r);
        }
        if (StringUtils.isBlank(grossiste)) {
            return json(echec("Choisissez un grossiste."));
        }
        return json(service.oublierModele(grossiste.trim()));
    }
}
