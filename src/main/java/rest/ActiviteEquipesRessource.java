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
            @QueryParam("seuilMinutes") Integer seuilMinutes) {
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
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("success", true);
        m.put("data", service.analyses(f));
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
