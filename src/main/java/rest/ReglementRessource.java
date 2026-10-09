/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.Params;
import dal.TUser;
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
import rest.service.GenerateTicketService;
import rest.service.ReglementService;
import util.Constant;
import toolkits.parameters.commonparameter;

/**
 *
 * @author DICI
 */
@Path("v1/reglement")
@Produces("application/json")
@Consumes("application/json")
public class ReglementRessource {

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    ReglementService reglementService;
    @EJB
    GenerateTicketService generateTicketService;
    @EJB
    rest.report.ReportUtil reportUtil;
    @EJB
    rest.service.utils.ReportExcelExportService excelExport;

    @GET
    @Path("liste")
    public Response searchProduct(@QueryParam(value = "query") String query,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "userId") String userId, @QueryParam(value = "pairclient") boolean pairclient,
            @QueryParam(value = "etat") String etat) throws JSONException {

        Params body = new Params();
        body.setEtatDiffere(etat);
        if (!"".equals(query)) {
            body.setDescription(query);
        }
        if (!"".equals(userId)) {
            body.setRef(userId);
        }
        body.setDtEnd(dtEnd);
        body.setDtStart(dtStart);
        JSONObject jsono = reglementService.listeDifferesData(body, pairclient);
        return Response.ok().entity(jsono.toString()).build();
    }

    @POST
    @Path("reglementdiffere")
    public Response faireReglementDiffere(ClotureVenteParams clotureVenteParams) throws JSONException {

        JSONObject json = reglementService.reglerDiffereV2(clotureVenteParams);
        return Response.ok().entity(json.toString()).build();
    }

    @POST
    @Path("reglementdiffere-all")
    public Response faireReglementDiffereAll(ClotureVenteParams clotureVenteParams) throws JSONException {

        JSONObject json = reglementService.reglerDiffereAllV2(clotureVenteParams);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("delayed")
    public Response listeReglementDifferes(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "clientId") String clientId)
            throws JSONException {

        JSONObject jsono = reglementService.reglementsDifferes(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), true,
                clientId);
        return Response.ok().entity(jsono.toString()).build();
    }

    private static LocalDate dateOu(String v, LocalDate defaut) {
        try {
            return v == null || v.isBlank() ? defaut : LocalDate.parse(v.trim().substring(0, 10));
        } catch (RuntimeException e) {
            return defaut;
        }
    }

    /** Ligne du releve pour l'edition (getters lus par Jasper). */
    public static class LigneReleve {

        private final String type, date, libelle, reference, client;
        private final Long debit, credit, solde;

        LigneReleve(JSONObject o) {
            type = o.optString("type");
            date = o.optString("date");
            libelle = o.optString("libelle");
            reference = o.optString("reference");
            client = o.optString("client");
            debit = o.optLong("debit");
            credit = o.optLong("credit");
            solde = o.optLong("solde");
        }

        public String getType() {
            return type;
        }

        public String getDate() {
            return date;
        }

        public String getLibelle() {
            return libelle;
        }

        public String getReference() {
            return reference;
        }

        public String getClient() {
            return client;
        }

        public Long getDebit() {
            return debit == 0 ? null : debit;
        }

        public Long getCredit() {
            return credit == 0 ? null : credit;
        }

        public Long getSolde() {
            return solde;
        }
    }

    private static final java.time.format.DateTimeFormatter JJ_MM_AAAA = java.time.format.DateTimeFormatter
            .ofPattern("dd/MM/yyyy");

    private static String milliers(long v) {
        return String.format("%,d", v).replace(',', ' ');
    }

    /** Releve calcule comme a l'ecran, puis ses lignes ; null si la periode est invalide ou le calcul a echoue. */
    private JSONObject releve(LocalDate du, LocalDate au, String clientId) {
        JSONObject r = reglementService.releveDifferes(du, au, clientId);
        return r.optBoolean("success") ? r : null;
    }

    /** Retours du 09/10 (1) : impression de l'onglet « Solde » (releve), memes chiffres que l'ecran. */
    @GET
    @Path("releve/pdf")
    @Produces("application/pdf")
    public Response releveDifferesPdf(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "clientId") String clientId,
            @QueryParam(value = "clientNom") String clientNom) {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        LocalDate au = dateOu(dtEnd, LocalDate.now());
        LocalDate du = dateOu(dtStart, au.withDayOfMonth(1));
        JSONObject r = du.isAfter(au) ? null : releve(du, au, clientId);
        java.io.File fichier = null;
        if (r != null) {
            java.util.List<LigneReleve> lignes = new java.util.ArrayList<>();
            org.json.JSONArray data = r.getJSONArray("data");
            for (int i = 0; i < data.length(); i++) {
                lignes.add(new LigneReleve(data.getJSONObject(i)));
            }
            java.util.Map<String, Object> parametres = reportUtil.officineData(tu);
            // milliers separes par une espace, comme a l'ecran et dans l'en-tete (4 000)
            parametres.put(net.sf.jasperreports.engine.JRParameter.REPORT_LOCALE, java.util.Locale.FRANCE);
            parametres.put("P_H_CLT_INFOS",
                    "RELEVÉ DES DIFFÉRÉS DU " + du.format(JJ_MM_AAAA) + " AU " + au.format(JJ_MM_AAAA));
            String nom = clientId == null || clientId.trim().isEmpty() ? "Tous les clients"
                    : org.apache.commons.lang3.StringUtils
                            .left(org.apache.commons.lang3.StringUtils.defaultIfBlank(clientNom, "Client choisi"), 80);
            parametres.put("P_CLIENT", nom);
            parametres.put("P_TOTAUX",
                    "Solde au début : " + milliers(r.optLong("soldeInitial")) + "   ·   Débit (ventes) : "
                            + milliers(r.optLong("totalDebit")) + "   ·   Crédit (règlements) : "
                            + milliers(r.optLong("totalCredit")) + "   ·   Solde à la fin : "
                            + milliers(r.optLong("soldeFinal")));
            String url = reportUtil.buildReport(parametres, "releve_differes", lignes);
            fichier = reportUtil.editionEcrite(url)
                    ? new java.io.File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))) : null;
        }
        if (fichier == null || !fichier.exists()) {
            return Response.ok(
                    "<html><head><meta charset=\"UTF-8\"></head><body style=\"font-family:Arial;padding:30px;\">"
                            + "<h3 style=\"color:#C00000;\">Le relevé n'a pas pu être imprimé.</h3></body></html>",
                    "text/html;charset=UTF-8").build();
        }
        return Response.ok(fichier, "application/pdf")
                .header("Content-Disposition", "inline; filename=releve_differes.pdf").build();
    }

    /** Retours du 09/10 (1) : export Excel de l'onglet « Solde ». */
    @GET
    @Path("releve/excel")
    @Produces("application/vnd.ms-excel")
    public Response releveDifferesExcel(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "clientId") String clientId)
            throws java.io.IOException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        LocalDate au = dateOu(dtEnd, LocalDate.now());
        LocalDate du = dateOu(dtStart, au.withDayOfMonth(1));
        JSONObject r = du.isAfter(au) ? null : releve(du, au, clientId);
        if (r == null) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }
        java.util.List<LigneReleve> lignes = new java.util.ArrayList<>();
        org.json.JSONArray data = r.getJSONArray("data");
        for (int i = 0; i < data.length(); i++) {
            lignes.add(new LigneReleve(data.getJSONObject(i)));
        }
        byte[] contenu = excelExport.createExcelReport(
                "Relevé des différés du " + du.format(JJ_MM_AAAA) + " au " + au.format(JJ_MM_AAAA) + " (solde au début "
                        + milliers(r.optLong("soldeInitial")) + ")",
                new String[] { "Date et heure", "Opération", "Référence", "Client", "Débit", "Crédit", "Solde" },
                lignes, (row, l) -> {
                    int i = 0;
                    row.createCell(i++).setCellValue(l.getDate());
                    row.createCell(i++).setCellValue(l.getLibelle());
                    row.createCell(i++).setCellValue(l.getReference());
                    row.createCell(i++).setCellValue(l.getClient());
                    row.createCell(i++).setCellValue(l.getDebit() == null ? 0 : l.getDebit());
                    row.createCell(i++).setCellValue(l.getCredit() == null ? 0 : l.getCredit());
                    row.createCell(i).setCellValue(l.getSolde());
                });
        return Response.ok(contenu, "application/vnd.ms-excel")
                .header("content-disposition", "attachment; filename=releve_differes_" + du + "_" + au + ".xls")
                .build();
    }

    /** Onglet « Solde » de la gestion des differes (retours du 07/10). */
    @GET
    @Path("releve")
    public Response releveDifferes(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "clientId") String clientId) {
        LocalDate au = dateOu(dtEnd, LocalDate.now());
        LocalDate du = dateOu(dtStart, au.withDayOfMonth(1));
        if (du.isAfter(au)) {
            return Response.ok(new JSONObject().put("success", false)
                    .put("msg", "La date de début est après la date de fin.").toString()).build();
        }
        return Response.ok(reglementService.releveDifferes(du, au, clientId).toString()).build();
    }

    @GET
    @Path("details")
    public Response detailsDifferes(@QueryParam(value = "ref") String ref) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject jsono = reglementService.detailsReglmentDiffere(ref);
        return Response.ok().entity(jsono.toString()).build();
    }

    @PUT
    @Path("ticket/{id}")
    public Response getTicket(@PathParam("id") String ref) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = generateTicketService.ticketReglementDiffere(ref);
        return Response.ok().entity(json.toString()).build();
    }

    @PUT
    @Path("ticket-carnet/{id}")
    public Response print(@PathParam("id") String ref) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = generateTicketService.ticketReglementCarnet(ref);
        return Response.ok().entity(json.toString()).build();
    }
}
