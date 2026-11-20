package rest;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;

import org.json.JSONObject;

import dal.TUser;
import rest.service.impl.PointageBonService;
import rest.service.impl.pointage.ReleveOrganisme;

/**
 * Pointage des bons par organisme (15/11), onglet « Pointage » de « Liste des Bons par Organisme ». Lecture : session
 * ouverte ; ecriture (pointage, bons annonces, releve, delais) : droit du menu (P_SM_FACTURESUBRO_ORGANISME).
 */
@Path("v1/pointage-bons")
@Produces("application/json")
@Consumes("application/json")
public class PointageBonRessource {

    private static final String DROIT = "Liste des Bons par Organisme";
    private static final String PRIVILEGE = "P_SM_FACTURESUBRO_ORGANISME";

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private PointageBonService service;
    @EJB
    private rest.report.ReportUtil reportUtil;

    private static Response json(JSONObject o) {
        return Response.ok(o.toString()).build();
    }

    private static Response erreur(String msg) {
        return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JSONObject().put("success", false).put("msg", msg).toString()).build();
    }

    private static Response deconnecte() {
        return Response.status(Response.Status.UNAUTHORIZED)
                .entity(new JSONObject().put("success", false).put("msg", "Veuillez vous connecter").toString())
                .build();
    }

    /** periode lue, ou null si invalide */
    private static LocalDate[] periode(String debut, String fin) {
        try {
            LocalDate d = LocalDate.parse(debut), f = LocalDate.parse(fin);
            return f.isBefore(d) || d.plusDays(400).isBefore(f) ? null : new LocalDate[] { d, f };
        } catch (Exception e) {
            return null;
        }
    }

    @GET
    @Path("liste")
    public Response liste(@QueryParam("tiersPayantId") String tp, @QueryParam("dtStart") String debut,
            @QueryParam("dtEnd") String fin, @QueryParam("filtre") String filtre, @QueryParam("search") String search,
            @QueryParam("groupeId") String groupeId) {
        TUser u = Droits.utilisateur(servletRequest);
        if (u == null) {
            return deconnecte();
        }
        LocalDate[] p = periode(debut, fin);
        boolean organisme = tp != null && !tp.isEmpty();
        boolean groupe = !organisme && groupeId != null && !groupeId.trim().isEmpty();
        if ((!organisme && !groupe) || p == null) {
            return erreur("Choisissez un organisme ou un groupe, et une période valide (au plus 400 jours).");
        }
        /* plan du 19/11, point 11 : les bons de chaque organisme du groupe, l'un apres l'autre */
        if (groupe) {
            return json(service.listeGroupe(u, groupeId.trim(), p[0], p[1], filtre, search));
        }
        return json(service.liste(u, tp, p[0], p[1], filtre, search));
    }

    @GET
    @Path("fiche")
    public Response fiche(@QueryParam("tiersPayantId") String tp, @QueryParam("dtStart") String debut,
            @QueryParam("dtEnd") String fin, @QueryParam("id") String id) {
        TUser u = Droits.utilisateur(servletRequest);
        if (u == null) {
            return deconnecte();
        }
        LocalDate[] p = periode(debut, fin);
        if (tp == null || p == null || id == null) {
            return erreur("Bon, organisme ou période manquant.");
        }
        JSONObject f = service.fiche(u, tp, p[0], p[1], id);
        /*
         * demande du 15/11 : corriger pendant le controle avec les boutons existants, selon les memes droits que «
         * Ventes terminées » (infos client / tiers payant ; modification de la vente : prix, quantites)
         */
        f.put("droits",
                new JSONObject().put("clientTp", Droits.a(servletRequest, util.Constant.P_BTN_UPDATE_VENTE_CLIENT_TP))
                        .put("vente", Droits.a(servletRequest, util.Constant.P_BT_MODIFICATION_DE_VENTE)));
        return json(f);
    }

    @POST
    @Path("pointer")
    public Response pointer(String corps) {
        Response refus = Droits.refus(servletRequest, DROIT, PRIVILEGE);
        if (refus != null) {
            return refus;
        }
        JSONObject o;
        try {
            o = new JSONObject(corps);
        } catch (Exception e) {
            return erreur("Demande illisible.");
        }
        JSONObject r = service.pointer(Droits.utilisateur(servletRequest), o);
        return r.optBoolean("success") ? json(r) : erreur(r.optString("msg"));
    }

    @POST
    @Path("annonces")
    public Response annonces(String corps) {
        Response refus = Droits.refus(servletRequest, DROIT, PRIVILEGE);
        if (refus != null) {
            return refus;
        }
        try {
            JSONObject o = new JSONObject(corps);
            LocalDate[] p = periode(o.optString("dtStart"), o.optString("dtEnd"));
            if (p == null || o.optString("tiersPayantId").isEmpty()) {
                return erreur("Choisissez un organisme et une période valide.");
            }
            Integer n = o.isNull("nombre") || !o.has("nombre") || String.valueOf(o.get("nombre")).trim().isEmpty()
                    ? null : Integer.valueOf(String.valueOf(o.get("nombre")).trim());
            JSONObject r = service.fixerAnnonces(Droits.utilisateur(servletRequest), o.getString("tiersPayantId"), p[0],
                    p[1], n, "SAISIE");
            return r.optBoolean("success") ? json(r) : erreur(r.optString("msg"));
        } catch (NumberFormatException e) {
            return erreur("Nombre de bons annoncés invalide.");
        } catch (Exception e) {
            return erreur("Demande illisible.");
        }
    }

    @GET
    @Path("delais")
    public Response delais(@QueryParam("tiersPayantId") String tp) {
        if (Droits.utilisateur(servletRequest) == null) {
            return deconnecte();
        }
        return json(service.delais(tp));
    }

    private static Integer entierOuVide(JSONObject o, String cle) {
        if (!o.has(cle) || o.isNull(cle) || String.valueOf(o.get(cle)).trim().isEmpty()) {
            return null;
        }
        return Integer.valueOf(String.valueOf(o.get(cle)).trim());
    }

    @POST
    @Path("delais")
    public Response fixerDelais(String corps) {
        Response refus = Droits.refus(servletRequest, DROIT, PRIVILEGE);
        if (refus != null) {
            return refus;
        }
        try {
            JSONObject o = new JSONObject(corps);
            JSONObject r = service.fixerDelais(o.getString("tiersPayantId"), entierOuVide(o, "organisme"),
                    o.has("groupe"), entierOuVide(o, "groupe"));
            return r.optBoolean("success") ? json(r) : erreur(r.optString("msg"));
        } catch (NumberFormatException e) {
            return erreur("Délai invalide : de 0 à 365 jours, ou vide.");
        } catch (Exception e) {
            return erreur("Demande illisible.");
        }
    }

    /**
     * Demande du 15/11 : colonnes reconnues dans le releve (Excel, CSV ou PDF), en-tetes et apercu des premieres
     * lignes, pour que l'utilisateur les verifie ou en choisisse d'autres avant le rapprochement. Rien n'est ecrit.
     */
    @POST
    @Path("releve/analyse")
    @Consumes({ "application/octet-stream", "text/csv", "application/vnd.ms-excel", "application/pdf",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    public Response analyseReleve(byte[] contenu) {
        Response refus = Droits.refus(servletRequest, DROIT, PRIVILEGE);
        if (refus != null) {
            return refus;
        }
        if (contenu != null && contenu.length > 10 * 1024 * 1024) {
            return erreur("Fichier trop gros (10 Mo au plus).");
        }
        try {
            ReleveOrganisme.Tableau t = ReleveOrganisme.analyser(contenu);
            org.json.JSONArray apercu = new org.json.JSONArray();
            for (int i = 0; i < Math.min(8, t.donnees.size()); i++) {
                apercu.put(new org.json.JSONArray(t.donnees.get(i)));
            }
            JSONObject col = new JSONObject();
            for (int i = 0; i < ReleveOrganisme.CHAMPS.length; i++) {
                col.put(ReleveOrganisme.CHAMPS[i], t.colonnes[i]);
            }
            return json(new JSONObject().put("success", true).put("format", t.format)
                    .put("entetes", new org.json.JSONArray(t.entetes)).put("colonnes", col).put("apercu", apercu)
                    .put("lignes", t.donnees.size()));
        } catch (IOException e) {
            return erreur(e.getMessage());
        }
    }

    /**
     * Releve de l'organisme envoye tel quel (Excel, CSV ou PDF), rapproche des bons de la periode. Colonnes choisies a
     * l'ecran (cBon, cMatricule, cDate, cMontant : rang, -1 = aucune) ; sans elles, les colonnes reconnues.
     */
    @POST
    @Path("releve")
    @Consumes({ "application/octet-stream", "text/csv", "application/vnd.ms-excel", "application/pdf",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    public Response releve(@QueryParam("tiersPayantId") String tp, @QueryParam("dtStart") String debut,
            @QueryParam("dtEnd") String fin, @QueryParam("cBon") Integer cBon,
            @QueryParam("cMatricule") Integer cMatricule, @QueryParam("cDate") Integer cDate,
            @QueryParam("cMontant") Integer cMontant, byte[] contenu) {
        Response refus = Droits.refus(servletRequest, DROIT, PRIVILEGE);
        if (refus != null) {
            return refus;
        }
        LocalDate[] p = periode(debut, fin);
        if (tp == null || tp.isEmpty() || p == null) {
            return erreur("Choisissez un organisme et une période valide.");
        }
        if (contenu != null && contenu.length > 10 * 1024 * 1024) {
            return erreur("Fichier trop gros (10 Mo au plus).");
        }
        boolean choisies = cBon != null || cMatricule != null || cDate != null || cMontant != null;
        int[] colonnes = choisies ? new int[] { cBon == null ? -1 : cBon, cMatricule == null ? -1 : cMatricule,
                cDate == null ? -1 : cDate, cMontant == null ? -1 : cMontant } : null;
        List<Map<String, Object>> lignes;
        try {
            lignes = ReleveOrganisme.lire(contenu, colonnes);
        } catch (IOException e) {
            return erreur(e.getMessage());
        }
        return json(service.rapprocher(Droits.utilisateur(servletRequest), tp, p[0], p[1], lignes));
    }

    private static String libellePeriode(LocalDate[] p) {
        java.time.format.DateTimeFormatter f = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        return "Du " + p[0].format(f) + " au " + p[1].format(f);
    }

    private String nomOrganisme(String tp) {
        return service.nomOrganisme(tp);
    }

    /** Excel complet : tous les bons de la periode, avec leurs controles et leur pointage. */
    @GET
    @Path("excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response excel(@QueryParam("tiersPayantId") String tp, @QueryParam("dtStart") String debut,
            @QueryParam("dtEnd") String fin) throws IOException {
        TUser u = Droits.utilisateur(servletRequest);
        if (u == null) {
            return deconnecte();
        }
        LocalDate[] p = periode(debut, fin);
        if (tp == null || p == null) {
            return erreur("Choisissez un organisme et une période valide.");
        }
        JSONObject l = service.liste(u, tp, p[0], p[1], "TOUS", null);
        List<JSONObject> bons = new java.util.ArrayList<>();
        for (int i = 0; i < l.getJSONArray("data").length(); i++) {
            bons.add(l.getJSONArray("data").getJSONObject(i));
        }
        byte[] data = rest.report.excel.PointageBonsExcel.construire(bons, nomOrganisme(tp) + " · " + libellePeriode(p),
                indicateurs(l.getJSONObject("compteurs")));
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"pointage_bons.xlsx\"").build();
    }

    private static String indicateurs(JSONObject c) {
        return c.getInt("enBase") + " bon(s) en base · annoncés : " + (c.isNull("annonces") ? "—" : c.get("annonces"))
                + " · pointés : " + c.getInt("pointes") + " · conformes : " + c.getInt("conformes") + " · anomalies : "
                + c.getInt("anomalies") + " · alertes auto : " + c.getInt("alertes") + " · montant attendu : "
                + c.getLong("montant");
    }

    /** PDF des anomalies du pointage (anomalies et absents du papier), a joindre au bordereau. */
    @GET
    @Path("pdf")
    public Response pdf(@QueryParam("tiersPayantId") String tp, @QueryParam("dtStart") String debut,
            @QueryParam("dtEnd") String fin) {
        TUser u = Droits.utilisateur(servletRequest);
        if (u == null) {
            return deconnecte();
        }
        LocalDate[] p = periode(debut, fin);
        if (tp == null || p == null) {
            return erreur("Choisissez un organisme et une période valide.");
        }
        JSONObject l = service.liste(u, tp, p[0], p[1], "ANOMALIES", null);
        List<commonTasks.dto.LignePointageBonDTO> lignes = new java.util.ArrayList<>();
        for (int i = 0; i < l.getJSONArray("data").length(); i++) {
            lignes.add(new commonTasks.dto.LignePointageBonDTO(l.getJSONArray("data").getJSONObject(i)));
        }
        Map<String, Object> params = reportUtil.officineData(u);
        params.put("P_H_CLT_INFOS", "ANOMALIES DU POINTAGE DES BONS");
        params.put("P_PERIODE", nomOrganisme(tp) + " · " + libellePeriode(p));
        params.put("P_INDICATEURS", lignes.size() + " anomalie(s) · " + indicateurs(l.getJSONObject("compteurs")));
        String url = reportUtil.buildReport(params, "rp_pointage_anomalies", lignes);
        if (!reportUtil.editionEcrite(url)) {
            return json(new JSONObject().put("success", false).put("msg", "L'édition n'a pas pu être générée."));
        }
        return json(new JSONObject().put("success", true).put("url", url).put("lignes", lignes.size()));
    }
}
