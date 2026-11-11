package rest;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.ejb.EJB;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import rest.service.ActiviteEquipesService;
import rest.service.dto.ActiviteFiltreDTO;
import rest.service.dto.ActiviteJournalDTO;
import rest.service.dto.ActiviteLigneDTO;
import rest.service.impl.ActiviteEquipesServiceImpl;
import util.Constant;

/**
 * Menu « Activité des équipes » (ANALYSE DE GESTION) : lectures seules, droit du menu verifie par le serveur. Dates en
 * AAAA-MM-JJ ; periode bornee a {@link Constant#ACTIVITE_PERIODE_MAX_JOURS} jours.
 */
@Path("v1/activite-equipes")
@Produces(MediaType.APPLICATION_JSON)
public class ActiviteEquipesRessource {

    @EJB
    private ActiviteEquipesService service;
    @Context
    private HttpServletRequest servletRequest;

    private Response refus() {
        return Droits.refus(servletRequest, Constant.LIBELLE_ACTIVITE_EQUIPES, Constant.P_SM_ACTIVITE_EQUIPES);
    }

    /** Plan du 08/11, point 15.6 : l'onglet Anomalies demande en plus son propre droit. */
    private Response refusAnomalies() {
        Response r = refus();
        if (r != null) {
            return r;
        }
        return Droits.a(servletRequest, Constant.P_ACTIVITE_ANOMALIES) ? null
                : Droits.interdit("Onglet Anomalies de l'activité des équipes");
    }

    /** Plan du 08/11, point 15.1 : annulations par auteur de la vente et suivi des caissieres. */
    @GET
    @Path("annulations")
    public Response annulations(@QueryParam("debut") String debut, @QueryParam("fin") String fin,
            @QueryParam("employeId") String employeId, @QueryParam("gardeId") String gardeId) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        ActiviteFiltreDTO f = filtre(debut, fin, employeId, null, null);
        if (f == null) {
            return dateInvalide();
        }
        if (appliquerGarde(f, gardeId) == GARDE_INTROUVABLE) {
            return gardeIntrouvable();
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("data", service.annulations(f));
        return Response.ok(m).build();
    }

    /**
     * Plan avoir du 08/11, point 1 : CA realise par employe et par tranche horaire (taille de 1 a 6 h, attribution
     * CAISSIER par defaut ou VENDEUR).
     */
    @GET
    @Path("ca-tranches")
    public Response caTranches(@QueryParam("debut") String debut, @QueryParam("fin") String fin,
            @QueryParam("employeId") String employeId, @QueryParam("taille") Integer taille,
            @QueryParam("attribution") String attribution, @QueryParam("gardeId") String gardeId) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        ActiviteFiltreDTO f = filtre(debut, fin, employeId, null, null);
        if (f == null) {
            return dateInvalide();
        }
        if (appliquerGarde(f, gardeId) == GARDE_INTROUVABLE) {
            return gardeIntrouvable();
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("data", service.caTranches(f, taille, attribution));
        return Response.ok(m).build();
    }

    /**
     * Plan du 09/11, point 10 : sept indicateurs d'equipe par employe, sur la periode (ou la garde) et l'employe
     * choisis.
     */
    @GET
    @Path("indicateurs")
    public Response indicateurs(@QueryParam("debut") String debut, @QueryParam("fin") String fin,
            @QueryParam("employeId") String employeId, @QueryParam("gardeId") String gardeId) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        ActiviteFiltreDTO f = filtre(debut, fin, employeId, null, null);
        if (f == null) {
            return dateInvalide();
        }
        if (appliquerGarde(f, gardeId) == GARDE_INTROUVABLE) {
            return gardeIntrouvable();
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("data", service.indicateurs(f));
        return Response.ok(m).build();
    }

    /** Plan avoir du 08/11, point 1 : le meme tableau en CSV (ouvert par Excel), totaux compris. */
    @GET
    @Path("ca-tranches/csv")
    @Produces("text/csv")
    @SuppressWarnings("unchecked")
    public Response caTranchesCsv(@QueryParam("debut") String debut, @QueryParam("fin") String fin,
            @QueryParam("employeId") String employeId, @QueryParam("taille") Integer taille,
            @QueryParam("attribution") String attribution) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        ActiviteFiltreDTO f = filtre(debut, fin, employeId, null, null);
        if (f == null) {
            return dateInvalide();
        }
        Map<String, Object> d = service.caTranches(f, taille, attribution);
        java.util.List<Map<String, Object>> tranches = (java.util.List<Map<String, Object>>) d.get("tranches");
        StringBuilder csv = new StringBuilder("﻿")
                .append(champ(rest.service.impl.activite.CaTranchesEmploye.VENDEUR.equals(d.get("attribution"))
                        ? "Vendeur" : rest.service.impl.activite.CaTranchesEmploye.CONSEIL.equals(d.get("attribution"))
                                ? "Conseil" : "Caissière"));
        for (Map<String, Object> t : tranches) {
            csv.append(';').append(champ(t.get("libelle") + " CA")).append(';')
                    .append(champ(t.get("libelle") + " ventes"));
        }
        csv.append(";\"Total CA\";\"Total ventes\"\r\n");
        for (Map<String, Object> l : (java.util.List<Map<String, Object>>) d.get("lignes")) {
            ligneCsv(csv, String.valueOf(l.get("nom")), l);
        }
        ligneCsv(csv, "Total", (Map<String, Object>) d.get("totaux"));
        String nom = "ca_tranches_" + d.get("taille") + "h_" + f.getDebut() + "_" + f.getFin() + ".csv";
        return Response.ok(csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8))
                .header("Content-Disposition", "attachment; filename=\"" + nom + "\"").type("text/csv; charset=UTF-8")
                .build();
    }

    @SuppressWarnings("unchecked")
    private static void ligneCsv(StringBuilder csv, String nom, Map<String, Object> l) {
        csv.append(champ(nom));
        for (Map<String, Object> c : (java.util.List<Map<String, Object>>) l.get("cellules")) {
            csv.append(';').append(c.get("ca")).append(';').append(c.get("ventes"));
        }
        csv.append(';').append(l.get("ca")).append(';').append(l.get("ventes")).append("\r\n");
    }

    /** Plan du 08/11, point 15.1 : detail d'une ligne (consultation) : vente, motif, par qui, quand. */
    @GET
    @Path("annulations/detail")
    public Response detailAnnulations(@QueryParam("debut") String debut, @QueryParam("fin") String fin,
            @QueryParam("role") String role, @QueryParam("id") String id) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        ActiviteFiltreDTO f = filtre(debut, fin, null, null, null);
        if (f == null || id == null || id.isBlank()) {
            return dateInvalide();
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("data", service.detailAnnulations(f.getDebut(), f.getFin(),
                "CAISSIER".equals(role) ? "CAISSIER" : "VENDEUR", id));
        return Response.ok(m).build();
    }

    /**
     * Plan du 09/11, point 10 : enregistre pour tous le critere de duree des ventes (onglet principal, Anomalies, carte
     * du tableau de bord). Le bouton de l'ecran demande la confirmation dans le bouton lui-meme.
     */
    @javax.ws.rs.POST
    @Path("seuil")
    @javax.ws.rs.Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response enregistrerSeuil(@javax.ws.rs.FormParam("seuilOperateur") String seuilOperateur,
            @javax.ws.rs.FormParam("seuilMinutes") Integer seuilMinutes) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        return Response.ok(service.enregistrerSeuil(seuilOperateur, seuilMinutes)).build();
    }

    /** Plan du 08/11, point 15.6 : onglets permis a l'utilisateur connecte (l'ecran cache les autres). */
    @GET
    @Path("droits")
    public Response droits() {
        Response r = refus();
        if (r != null) {
            return r;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("anomalies", Droits.a(servletRequest, Constant.P_ACTIVITE_ANOMALIES));
        return Response.ok(m).build();
    }

    @GET
    @Path("employes")
    public Response employes() {
        Response r = refus();
        if (r != null) {
            return r;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("data", service.employes());
        return Response.ok(m).build();
    }

    @GET
    @Path("journal")
    public Response journal(@QueryParam("debut") String debut, @QueryParam("fin") String fin,
            @QueryParam("employeId") String employeId, @QueryParam("type") String type,
            @QueryParam("q") String recherche, @QueryParam("start") int start, @QueryParam("limit") int limit) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        ActiviteFiltreDTO f = filtre(debut, fin, employeId, type, recherche);
        if (f == null) {
            return dateInvalide();
        }
        f.setStart(start);
        f.setLimit(limit <= 0 ? 50 : limit);
        ActiviteJournalDTO j = service.journal(f);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("total", j.getTotal());
        m.put("data", j.getLignes());
        m.put("compteurs", j.getCompteurs());
        m.put("debut", f.getDebut().toString());
        m.put("fin", f.getFin().toString());
        return Response.ok(m).build();
    }

    @GET
    @Path("analyses")
    public Response analyses(@QueryParam("debut") String debut, @QueryParam("fin") String fin,
            @QueryParam("employeId") String employeId, @QueryParam("seuilOperateur") String seuilOperateur,
            @QueryParam("seuilMinutes") Integer seuilMinutes, @QueryParam("gardeId") String gardeId) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        ActiviteFiltreDTO f = filtre(debut, fin, employeId, null, null);
        if (f == null) {
            return dateInvalide();
        }
        f.setSeuilOperateur(seuilOperateur);
        f.setSeuilMinutes(seuilMinutes);
        Map<String, String> garde = appliquerGarde(f, gardeId);
        if (garde == GARDE_INTROUVABLE) {
            return gardeIntrouvable();
        }
        rest.service.dto.ActiviteAnalysesDTO d = service.analyses(f);
        d.setGarde(garde);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("data", d);
        return Response.ok(m).build();
    }

    private static final Map<String, String> GARDE_INTROUVABLE = java.util.Collections
            .unmodifiableMap(new LinkedHashMap<>());

    /**
     * Plan du 09/11, point 10 : une garde choisie fixe la plage lue a l'heure pres (et les jours). Rend null sans
     * garde, GARDE_INTROUVABLE si l'identifiant ne correspond a aucune garde, sinon id, libelle, debut et fin
     * affichables.
     */
    private Map<String, String> appliquerGarde(ActiviteFiltreDTO f, String gardeId) {
        if (gardeId == null || gardeId.trim().isEmpty()) {
            return null;
        }
        Map<String, Object> g = service.fenetreGarde(gardeId.trim());
        if (g == null) {
            return GARDE_INTROUVABLE;
        }
        java.time.LocalDateTime de = (java.time.LocalDateTime) g.get("debut");
        java.time.LocalDateTime a = (java.time.LocalDateTime) g.get("fin");
        f.setDe(de);
        f.setA(a);
        f.setDebut(de.toLocalDate());
        f.setFin(a.minusSeconds(1).toLocalDate());
        java.time.format.DateTimeFormatter h = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        Map<String, String> garde = new LinkedHashMap<>();
        garde.put("id", gardeId.trim());
        garde.put("libelle", String.valueOf(g.get("libelle")));
        garde.put("debut", de.format(h));
        garde.put("fin", a.format(h));
        return garde;
    }

    private Response gardeIntrouvable() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", false);
        m.put("msg", "Garde introuvable.");
        return Response.ok(m).build();
    }

    /** Plan du 08/11, point 15.8 : gardes sans vente et nuits avec des ventes sans garde declaree. */
    @GET
    @Path("gardes")
    public Response gardes(@QueryParam("debut") String debut, @QueryParam("fin") String fin) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        ActiviteFiltreDTO f = filtre(debut, fin, null, null, null);
        if (f == null) {
            return dateInvalide();
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("data", service.controleGardes(f.getDebut(), f.getFin()));
        return Response.ok(m).build();
    }

    /** Plan du 08/11, point 15.8 : carte d'affluence d'une garde choisie dans le selecteur. */
    @GET
    @Path("carte-garde/{id}")
    public Response carteGarde(@javax.ws.rs.PathParam("id") String id) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        Map<String, Object> d = service.carteGarde(id);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", d != null);
        m.put("data", d);
        if (d == null) {
            m.put("msg", "Garde introuvable.");
        }
        return Response.ok(m).build();
    }

    /** Retour du 24/10 : anomalies par employe et liste des anomalies de la periode. */
    @GET
    @Path("anomalies")
    public Response anomalies(@QueryParam("debut") String debut, @QueryParam("fin") String fin,
            @QueryParam("employeId") String employeId, @QueryParam("famille") String famille,
            @QueryParam("seuilOperateur") String seuilOperateur, @QueryParam("seuilMinutes") Integer seuilMinutes) {
        Response r = refusAnomalies();
        if (r != null) {
            return r;
        }
        ActiviteFiltreDTO f = filtre(debut, fin, employeId, null, null);
        if (f == null) {
            return dateInvalide();
        }
        f.setSeuilOperateur(seuilOperateur);
        f.setSeuilMinutes(seuilMinutes);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("data", service.anomalies(f, famille));
        return Response.ok(m).build();
    }

    /** Une anomalie et le fil de ce que l'employe a fait juste avant. */
    @GET
    @Path("anomalies/{id}")
    public Response anomalie(@javax.ws.rs.PathParam("id") long id) {
        Response r = refusAnomalies();
        if (r != null) {
            return r;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        rest.service.dto.ActiviteAnomaliesDTO.Element e = service.anomalie(id);
        m.put("success", e != null);
        m.put("data", e);
        return Response.ok(m).build();
    }

    @GET
    @Path("journal/csv")
    @Produces("text/csv")
    public Response journalCsv(@QueryParam("debut") String debut, @QueryParam("fin") String fin,
            @QueryParam("employeId") String employeId, @QueryParam("type") String type,
            @QueryParam("q") String recherche) {
        Response r = refus();
        if (r != null) {
            return r;
        }
        ActiviteFiltreDTO f = filtre(debut, fin, employeId, type, recherche);
        if (f == null) {
            return dateInvalide();
        }
        StringBuilder csv = new StringBuilder("\uFEFFDate;Employé;Action;Référence;Montant;Détail\r\n");
        for (ActiviteLigneDTO l : service.export(f)) {
            csv.append(champ(l.getDate())).append(';').append(champ(l.getEmploye())).append(';')
                    .append(champ(l.getLibelleType())).append(';').append(champ(l.getReference())).append(';')
                    .append(l.getMontant() == null ? "" : l.getMontant()).append(';').append(champ(l.getDetail()))
                    .append("\r\n");
        }
        String nom = "activite_equipes_" + f.getDebut() + "_" + f.getFin() + ".csv";
        return Response.ok(csv.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8))
                .header("Content-Disposition", "attachment; filename=\"" + nom + "\"").type("text/csv; charset=UTF-8")
                .build();
    }

    /** Champ CSV : guillemets doubles, et pas de formule interpretee par le tableur. */
    static String champ(String v) {
        String s = v == null ? "" : v;
        if (!s.isEmpty() && "=+-@".indexOf(s.charAt(0)) >= 0) {
            s = "'" + s;
        }
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }

    private static Response dateInvalide() {
        return Response.status(Response.Status.BAD_REQUEST)
                .entity(Map.of("success", false, "msg", "Date invalide (AAAA-MM-JJ)")).build();
    }

    /** Filtres communs, periode bornee ; null si une date est illisible. */
    static ActiviteFiltreDTO filtre(String debut, String fin, String employeId, String type, String recherche) {
        try {
            LocalDate[] p = ActiviteEquipesServiceImpl.periode(date(debut), date(fin),
                    Constant.ACTIVITE_PERIODE_MAX_JOURS);
            return ActiviteFiltreDTO.builder().debut(p[0]).fin(p[1]).employeId(employeId).type(type)
                    .recherche(recherche).build();
        } catch (java.time.format.DateTimeParseException e) {
            return null;
        }
    }

    static LocalDate date(String s) {
        return s == null || s.isBlank() ? null
                : LocalDate.parse(s.trim().substring(0, Math.min(10, s.trim().length())));
    }
}
