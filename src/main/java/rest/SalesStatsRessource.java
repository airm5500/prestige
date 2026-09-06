/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.ArticleHeader;
import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.Params;
import commonTasks.dto.SalesStatsParams;
import commonTasks.dto.TiersPayantParams;
import dal.TPreenregistrementDetail;
import dal.TPrivilege;
import dal.TUser;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONException;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.GenerateTicketService;
import rest.service.SalesStatsService;
import rest.service.TvaService;
import util.CommonUtils;
import util.Constant;
import util.FunctionUtils;

/**
 *
 * @author Kobena
 */
@Path("v1/ventestats")
@Produces("application/json")
@Consumes("application/json")
public class SalesStatsRessource {

    @Inject
    private HttpServletRequest servletRequest;

    @EJB
    SalesStatsService salesService;

    @EJB
    GenerateTicketService generateTicketService;

    @EJB
    private TvaService tvaService;

    @EJB
    private rest.service.InventaireService inventaireService;

    @EJB
    private rest.report.ReportUtil reportUtil;

    @EJB
    private rest.service.utils.ReportExcelExportService excelExportService;

    @EJB
    private rest.service.CommonService commonService;

    @GET
    @Path("preventes")
    public Response getDetails(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "typeVenteId") String typeVenteId,
            @DefaultValue(value = "is_Process") @QueryParam(value = "statut") String statut,
            @QueryParam(value = "nature") String nature) throws JSONException {
        SalesStatsParams body = new SalesStatsParams();
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setStatut(statut);
        body.setNature(nature);
        body.setAll(false);
        body.setTypeVenteId(typeVenteId);
        JSONObject jsono = salesService.getPreVentes(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("annulations")
    public Response annulations(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "statut") String statut)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        List<TPrivilege> hsAttribute = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean asAuthority = CommonUtils.hasAuthorityByName(hsAttribute, Constant.SHOW_VENTE);
        boolean allActivitis = CommonUtils.hasAuthorityByName(hsAttribute, Constant.P_SHOW_ALL_ACTIVITY);
        SalesStatsParams body = new SalesStatsParams();
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setStatut(Constant.STATUT_IS_CLOSED);
        body.setAll(false);
        body.setShowAll(asAuthority);
        body.setShowAllActivities(allActivitis);
        body.setUserId(tu);
        try {
            body.setDtEnd(LocalDate.parse(dtEnd));
            body.setDtStart(LocalDate.parse(dtStart));
        } catch (Exception e) {
        }

        JSONObject jsono = salesService.annulations(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    @POST
    @Path("remove/{id}")
    public Response delete(@PathParam("id") String id) throws JSONException {

        JSONObject json = salesService.delete(id);
        return Response.ok().entity(json.toString()).build();
    }

    private SalesStatsParams buildPreventesParams(String query, String typeVenteId, String statut) {
        SalesStatsParams body = new SalesStatsParams();
        body.setQuery(query);
        body.setStatut(StringUtils.isNotEmpty(statut) ? statut : "is_Process");
        body.setAll(true);
        body.setTypeVenteId(typeVenteId);
        return body;
    }

    private String buildPreventesCriteres(String query, String typeVenteId) {
        StringBuilder criteres = new StringBuilder(
                "VENTES EN ATTENTE DU " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
        if (StringUtils.isNotEmpty(typeVenteId)) {
            criteres.append(" - TYPE : ").append(typeVenteId);
        }
        if (StringUtils.isNotEmpty(query)) {
            criteres.append(" - RECHERCHE : ").append(query);
        }
        return criteres.toString();
    }

    // Impression des produits des ventes en attente (filtres actifs de la liste).
    // mode=PAR_VENTE : produits regroupes par vente (rp_preventes_produits_par_vente.jrxml),
    // mode=LISTE : liste complete alphabetique (rp_preventes_produits_liste.jrxml).
    @GET
    @Path("preventes/produits/pdf")
    public Response preventesProduitsPdf(@QueryParam(value = "query") String query,
            @QueryParam(value = "typeVenteId") String typeVenteId, @QueryParam(value = "statut") String statut,
            @DefaultValue(value = "PAR_VENTE") @QueryParam(value = "mode") String mode) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        boolean parVente = !"LISTE".equalsIgnoreCase(mode);
        List<rest.service.dto.PreventeProduitDTO> data = salesService
                .preventesProduits(buildPreventesParams(query, typeVenteId, statut), parVente);
        if (data.isEmpty()) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", "Aucun produit a imprimer").toString())
                    .build();
        }
        java.util.Map<String, Object> params = reportUtil.officineData(tu);
        params.put("P_H_CLT_INFOS",
                (parVente ? "PRODUITS DES VENTES EN ATTENTE PAR VENTE - "
                        : "LISTE COMPLETE DES PRODUITS DES VENTES EN ATTENTE - ")
                        + buildPreventesCriteres(query, typeVenteId));
        String reportName = parVente ? "rp_preventes_produits_par_vente" : "rp_preventes_produits_liste";
        String url = servletRequest.getContextPath() + reportUtil.buildReport(params, reportName, data);
        return Response.ok().entity(new JSONObject().put("success", true).put("url", url).toString()).build();
    }

    // Nombre de produits distincts (controle avant confirmation de creation d'inventaire)
    /**
     * Export Excel de la liste des preventes : la liste filtree ENTIERE (recherche, statut, type), pas seulement la
     * page affichee. Memes colonnes que l'ecran, plus le type de vente et le statut.
     */
    @GET
    @Path("preventes/excel")
    @Produces("application/vnd.ms-excel")
    public Response preventesExcel(@QueryParam(value = "query") String query,
            @QueryParam(value = "typeVenteId") String typeVenteId,
            @DefaultValue(value = "ALL") @QueryParam(value = "statut") String statut) throws Exception {
        SalesStatsParams body = buildPreventesParams(query, typeVenteId, statut);
        List<commonTasks.dto.VenteDTO> preventes = salesService.listePreVentes(body);
        if (preventes.isEmpty()) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", "Aucune prévente à exporter").toString())
                    .build();
        }
        String[] headers = { "Reference", "Montant", "Date", "Heure", "Vendeur", "Type de vente", "Statut" };
        byte[] data = excelExportService.createExcelReport("LISTE DES PREVENTES", headers, preventes, (row, v) -> {
            row.createCell(0).setCellValue(nonNul(v.getStrREF()));
            row.createCell(1).setCellValue(v.getIntPRICE() == null ? 0 : v.getIntPRICE());
            row.createCell(2).setCellValue(nonNul(v.getDtUPDATED()));
            row.createCell(3).setCellValue(nonNul(v.getHeure()));
            row.createCell(4).setCellValue(nonNul(v.getUserFullName()));
            row.createCell(5).setCellValue(nonNul(v.getStrTYPEVENTE()));
            row.createCell(6).setCellValue("pending".equals(v.getStrSTATUT()) ? "Non clôturée" : "Clôturée");
        });
        String filename = "preventes_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss"))
                + ".xls";
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"" + filename + "\"").build();
    }

    @GET
    @Path("preventes/produits/count")
    public Response preventesProduitsCount(@QueryParam(value = "query") String query,
            @QueryParam(value = "typeVenteId") String typeVenteId, @QueryParam(value = "statut") String statut)
            throws JSONException {
        int count = salesService.preventesProduitIds(buildPreventesParams(query, typeVenteId, statut)).size();
        return Response.ok().entity(new JSONObject().put("success", true).put("count", count).toString()).build();
    }

    // Creation d'inventaire avec les produits des ventes en attente affichees
    // (un meme produit present dans plusieurs ventes = une seule ligne)
    @POST
    @Path("preventes/create-inventaire")
    public Response preventesCreateInventaire(@QueryParam(value = "query") String query,
            @QueryParam(value = "typeVenteId") String typeVenteId, @QueryParam(value = "statut") String statut)
            throws JSONException {
        java.util.Set<String> produitIds = salesService
                .preventesProduitIds(buildPreventesParams(query, typeVenteId, statut));
        if (produitIds.isEmpty()) {
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("message", "Aucun produit dans les ventes en attente").toString()).build();
        }
        String name = "INVENTAIRE PRODUITS EN ATTENTE DU "
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        int count = inventaireService.create(produitIds, name, name);
        return Response.ok().entity(new JSONObject().put("success", true).put("count", count).toString()).build();
    }

    @PUT
    @Path("attente/mode-reglement/{venteId}/{typeReglementId}")
    public Response setModeReglementAttente(@PathParam("venteId") String venteId,
            @PathParam("typeReglementId") String typeReglementId) throws JSONException {
        JSONObject json = salesService.setModeReglementAttente(venteId, typeReglementId);
        return Response.ok().entity(json.toString()).build();
    }

    @PUT
    @Path("update/{venteId}/{statut}")
    public Response update(@PathParam("venteId") String venteId, @PathParam("statut") String statut)
            throws JSONException {
        JSONObject json = salesService.trash(venteId, statut);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("devis")
    public Response allDevis(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "statut") String statut)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean asAuthority = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.SHOW_VENTE);
        boolean allActivitis = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_SHOW_ALL_ACTIVITY);
        SalesStatsParams body = new SalesStatsParams();
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setStatut(statut);
        try {
            body.setDtEnd(LocalDate.parse(dtEnd));
            body.setDtStart(LocalDate.parse(dtStart));
        } catch (Exception e) {
        }

        body.setAll(false);
        body.setShowAll(asAuthority);
        body.setShowAllActivities(allActivitis);
        body.setUserId(tu);

        JSONObject jsono = salesService.getListeTPreenregistrement(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("preventes-depot")
    public Response preventeDepotOnly(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "typeVenteId") String typeVenteId,
            @QueryParam(value = "statut") String statut) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean asAuthority = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.SHOW_VENTE);
        boolean allActivitis = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_SHOW_ALL_ACTIVITY);
        SalesStatsParams body = new SalesStatsParams();
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setStatut(statut);
        body.setAll(false);
        body.setTypeVenteId(typeVenteId);
        body.setShowAll(asAuthority);
        body.setShowAllActivities(allActivitis);
        body.setUserId(tu);
        body.setDepotOnly(true);
        JSONObject jsono = salesService.getListeTPreenregistrement(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("depot/{id}")
    public Response getDepot(@PathParam("id") String id) throws JSONException {

        JSONObject json = salesService.findVenteById(id);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("{id}")
    public Response findOne(@PathParam("id") String id) throws JSONException {

        JSONObject json = salesService.reloadVenteById(id);
        return Response.ok().entity(json.toString()).build();
    }

    private SalesStatsParams buildParams(int start, int limit, String query, String dtStart, String dtEnd,
            String hStart, String hEnd, boolean sansBon, boolean onlyAvoir, String typeVenteId, String nature,
            Boolean depotOnly, String typeDepotId, String depotId) {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean asAuthority = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.SHOW_VENTE);
        boolean allActivitis = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_SHOW_ALL_ACTIVITY);
        boolean canCancel = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_BT_ANNULER_VENTE);
        boolean modification = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_BT_MODIFICATION_DE_VENTE);
        boolean modificationClientTp = CommonUtils.hasAuthorityByName(lstTPrivilege,
                Constant.P_BTN_UPDATE_VENTE_CLIENT_TP);
        boolean modificationVenteDate = CommonUtils.hasAuthorityByName(lstTPrivilege,
                Constant.P_BTN_UPDATE_VENTE_CLIENT_DATE);
        SalesStatsParams body = new SalesStatsParams();
        if (Objects.nonNull(depotOnly)) {
            body.setDepotOnly(depotOnly);
        }
        body.setCanCancel(canCancel);
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setTypeVenteId(typeVenteId);
        body.setStatut(Constant.STATUT_IS_CLOSED);
        body.setAll(false);
        body.setSansBon(sansBon);
        body.setNature(nature);
        body.setOnlyAvoir(onlyAvoir);
        body.setShowAll(asAuthority);
        body.setShowAllActivities(allActivitis);
        body.setUserId(tu);
        body.setModification(modification);
        body.setModificationClientTp(modificationClientTp);
        body.setModificationVenteDate(modificationVenteDate);
        body.setTypeDepotId(typeDepotId);
        body.setDepotId(depotId);
        try {
            body.sethEnd(LocalTime.parse(hEnd));
        } catch (Exception e) {
        }
        try {
            body.sethStart(LocalTime.parse(hStart));
        } catch (Exception e) {
        }
        try {
            body.setDtEnd(LocalDate.parse(dtEnd));
            body.setDtStart(LocalDate.parse(dtStart));
        } catch (Exception e) {
        }
        return body;
    }

    @GET
    public Response getAlls(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd, @QueryParam(value = "sansBon") boolean sansBon,
            @QueryParam(value = "onlyAvoir") boolean onlyAvoir, @QueryParam(value = "typeVenteId") String typeVenteId,
            @QueryParam(value = "nature") String nature, @QueryParam(value = "depotOnly") Boolean depotOnly,
            @QueryParam(value = "typeDepotId") String typeDepotId, @QueryParam(value = "depotId") String depotId,
            @QueryParam(value = "avoirStatut") String avoirStatut, @QueryParam(value = "caissierId") String caissierId,
            @QueryParam(value = "lgTypeVenteId") String lgTypeVenteId,
            @QueryParam(value = "modeReglementId") String modeReglementId) throws JSONException {
        SalesStatsParams body = buildParams(start, limit, query, dtStart, dtEnd, hStart, hEnd, sansBon, onlyAvoir,
                typeVenteId, nature, depotOnly, typeDepotId, depotId);
        body.setAvoirStatut(avoirStatut);
        body.setCaissierId(caissierId);
        body.setLgTypeVenteId(lgTypeVenteId);
        body.setModeReglementId(modeReglementId);
        JSONObject jsono = salesService.getVenteTerminees(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    /**
     * Plafond de lignes de l'export Excel. Le fichier reste ouvrable et la memoire du serveur bornee. Au-dela, une
     * derniere ligne du tableau le dit explicitement : un export tronque en silence se lirait comme un export complet.
     */
    private static final int EXPORT_VENTES_MAX = 20000;

    /*
     * Export Excel de la liste des ventes terminees, avec EXACTEMENT les filtres actifs a l'ecran. Les colonnes
     * reprennent celles de la liste, plus la categorie de vente et la part client : ce sont les informations que la
     * liste porte deja, aucune requete supplementaire par ligne n'est faite.
     */
    @GET
    @Path("excel")
    @Produces("application/vnd.ms-excel")
    public Response exportVentesTermineesExcel(@QueryParam(value = "query") String query,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "hStart") String hStart, @QueryParam(value = "hEnd") String hEnd,
            @QueryParam(value = "sansBon") boolean sansBon, @QueryParam(value = "onlyAvoir") boolean onlyAvoir,
            @QueryParam(value = "typeVenteId") String typeVenteId, @QueryParam(value = "nature") String nature,
            @QueryParam(value = "depotOnly") Boolean depotOnly, @QueryParam(value = "typeDepotId") String typeDepotId,
            @QueryParam(value = "depotId") String depotId, @QueryParam(value = "avoirStatut") String avoirStatut,
            @QueryParam(value = "caissierId") String caissierId,
            @QueryParam(value = "lgTypeVenteId") String lgTypeVenteId,
            @QueryParam(value = "modeReglementId") String modeReglementId) throws Exception {
        SalesStatsParams body = buildParams(0, EXPORT_VENTES_MAX, query, dtStart, dtEnd, hStart, hEnd, sansBon,
                onlyAvoir, typeVenteId, nature, depotOnly, typeDepotId, depotId);
        body.setAvoirStatut(avoirStatut);
        body.setCaissierId(caissierId);
        body.setLgTypeVenteId(lgTypeVenteId);
        body.setModeReglementId(modeReglementId);

        List<commonTasks.dto.VenteDTO> ventes = salesService.getListTerminees(body);
        if (ventes.isEmpty()) {
            return Response.ok()
                    .entity(new JSONObject().put("success", false).put("message", "Aucune vente à exporter").toString())
                    .build();
        }
        java.util.Map<String, String> categories = new java.util.HashMap<>();
        for (dal.TTypeVente t : commonService.findAllTypeVente()) {
            categories.put(t.getLgTYPEVENTEID(), t.getStrDESCRIPTION());
        }

        java.util.List<commonTasks.dto.VenteDTO> lignes = new java.util.ArrayList<>(ventes);
        boolean tronque = ventes.size() >= EXPORT_VENTES_MAX;
        if (tronque) {
            lignes.add(null); // sentinelle : ligne d'avertissement
        }
        String[] headers = { "Reference", "N° ticket", "Type", "Categorie", "Client", "Montant", "Part client",
                "Remise", "Montant différé", "Date", "Heure", "Vendeur", "Caissier" };
        byte[] data = excelExportService.createLandscapeExcelReport(titreExportVentes(body), headers, lignes,
                (row, v) -> {
                    if (v == null) {
                        row.createCell(0).setCellValue("Liste tronquée aux " + EXPORT_VENTES_MAX
                                + " premières ventes : affinez la période ou les filtres.");
                        return;
                    }
                    row.createCell(0).setCellValue(nonNul(v.getStrREF()));
                    row.createCell(1).setCellValue(nonNul(v.getStrREFTICKET()));
                    row.createCell(2).setCellValue(nonNul(v.getStrTYPEVENTE()));
                    row.createCell(3).setCellValue(nonNul(categories.get(v.getLgTYPEVENTEID())));
                    row.createCell(4).setCellValue(nonNul(v.getClientFullName()));
                    row.createCell(5).setCellValue(v.getIntPRICE() == null ? 0 : v.getIntPRICE());
                    row.createCell(6).setCellValue(v.getIntCUSTPART() == null ? 0 : v.getIntCUSTPART());
                    row.createCell(7).setCellValue(v.getIntPRICEREMISE() == null ? 0 : v.getIntPRICEREMISE());
                    row.createCell(8).setCellValue(v.getIntPRICERESTE() == null ? 0 : v.getIntPRICERESTE());
                    row.createCell(9).setCellValue(nonNul(v.getDtUPDATED()));
                    row.createCell(10).setCellValue(nonNul(v.getHeure()));
                    row.createCell(11).setCellValue(nonNul(v.getUserVendeurName()));
                    row.createCell(12).setCellValue(nonNul(v.getUserCaissierName()));
                });
        String filename = "ventes_terminees_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".xls";
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"" + filename + "\"").build();
    }

    private static String nonNul(String valeur) {
        return valeur == null ? "" : valeur;
    }

    private String titreExportVentes(SalesStatsParams body) {
        DateTimeFormatter jour = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        return "VENTES TERMINEES DU " + body.getDtStart().format(jour) + " AU " + body.getDtEnd().format(jour);
    }

    /*
     * Avoirs non clôturés SANS borne de période (préparé pour la cloche de notifications) : le drapeau b_IS_AVOIR
     * suffit, un avoir ouvert ancien reste à signaler. Réutilise le pipeline getVenteTerminees avec une fenêtre très
     * large pour garantir la même forme de réponse.
     */
    @GET
    @Path("avoirs-ouverts")
    public Response openAvoirs(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit)
            throws JSONException {
        SalesStatsParams body = buildParams(start, limit > 0 ? limit : 50, "", "2000-01-01",
                java.time.LocalDate.now().toString(), null, null, false, true, "", null, null, null, null);
        body.setAvoirStatut("EN_COURS");
        JSONObject jsono = salesService.getVenteTerminees(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    /* Compteur ultra-léger des avoirs non clôturés (badge 60 s de la cloche) */
    @GET
    @Path("avoirs-ouverts/count")
    public Response openAvoirsCount() {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean asAuthority = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.SHOW_VENTE);
        boolean allActivitis = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_SHOW_ALL_ACTIVITY);
        JSONObject jsono = salesService.getOpenAvoirsCount(tu, asAuthority, allActivitis);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("ticket/vno/{id}")
    public Response getTicket(@PathParam("id") String id) throws JSONException {
        JSONObject json = generateTicketService.lunchPrinterForTicket(id);
        return Response.ok().entity(json).build();
    }

    @GET
    @Path("ticket/vo/{id}")
    public Response getTicketVo(@PathParam("id") String id) throws JSONException {
        JSONObject json = generateTicketService.lunchPrinterForTicketVo(id);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("avoirs")
    public Response getAllsAvoir(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd, @QueryParam(value = "typeVenteId") String typeVenteId,
            @QueryParam(value = "nature") String nature) throws JSONException {
        HttpSession hs = servletRequest.getSession();

        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);

        List<TPrivilege> lstTPrivilege = (List<TPrivilege>) hs.getAttribute(Constant.USER_LIST_PRIVILEGE);
        boolean asAuthority = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.SHOW_VENTE);
        boolean allActivitis = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_SHOW_ALL_ACTIVITY);
        boolean canCancel = CommonUtils.hasAuthorityByName(lstTPrivilege, Constant.P_BT_ANNULER_VENTE);

        SalesStatsParams body = new SalesStatsParams();
        body.setCanCancel(canCancel);
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setTypeVenteId(null);
        body.setNature(nature);
        body.setStatut(Constant.STATUT_IS_CLOSED);
        body.setAll(false);
        body.setSansBon(false);
        body.setOnlyAvoir(true);
        body.setShowAll(asAuthority);
        body.setShowAllActivities(allActivitis);
        body.setUserId(tu);
        try {
            body.sethEnd(LocalTime.parse(hEnd));
        } catch (Exception e) {
        }
        try {
            body.sethStart(LocalTime.parse(hStart));
        } catch (Exception e) {
        }
        try {
            body.setDtStart(LocalDate.parse(dtStart));
            body.setDtEnd(LocalDate.parse(dtEnd));

        } catch (Exception e) {
        }
        JSONObject jsono = salesService.getVenteTerminees(body);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("tvastat")
    @Deprecated
    public Response tvastat(@QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "typeVente") String typeVente) throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        if (!tvaService.isExcludTiersPayantActive()) {
            Params params = new Params();
            params.setDtEnd(dtEnd);
            params.setDtStart(dtStart);
            params.setOperateur(tu);
            params.setRef(typeVente);
            JSONObject json = salesService.tvasViewData2(params);
            return Response.ok().entity(json.toString()).build();
        } else {
            JSONObject json = tvaService.tvaData(LocalDate.parse(dtStart), LocalDate.parse(dtEnd), false, null);
            return Response.ok().entity(json.toString()).build();
        }

    }

    @PUT
    @Path("modifiertierspayant/{id}")
    public Response modifiertpayantvente(@PathParam("id") String venteId, ClotureVenteParams params)
            throws JSONException {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        JSONObject json = salesService.modifiertypevente(venteId, params);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("venteTierspayantData/{id}")
    public Response venteTierspayantData(@PathParam("id") String venteId) throws JSONException {

        List<TiersPayantParams> data = salesService.venteTierspayantData(venteId);
        JSONObject json = new JSONObject();
        json.put("total", data.size());
        json.put("data", data);
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("ventesordonnanciers")
    public Response findAllVenteOrdonnancier(@QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "query") String query,
            @QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "medecinId") String medecinId) throws JSONException {

        JSONObject jsono = salesService.findAllVenteOrdonnancier(medecinId, dtStart, dtEnd, query, start, limit);
        return Response.ok().entity(jsono.toString()).build();
    }

    // =============================================================================================
    // Ordonnancier : editions, export et creation d'inventaire.
    //
    // Les trois s'appuient sur EXACTEMENT la meme recherche que la grille (memes dates, meme
    // medecin, meme mot cherche). Un etat qui ne dirait pas la meme chose que l'ecran d'ou il sort
    // serait pire que pas d'etat du tout.
    // =============================================================================================

    /** En-tetes du registre, partages par l'edition PDF et l'export Excel. */
    private static final String[] ENTETES_ORDONNANCIER = { "Date", "Heure", "Référence", "Client", "Médecin",
            "N° ordre", "CIP", "Produit", "Tableau", "Qté", "Montant", "Vendeur" };

    /**
     * Le registre mis a plat : une ligne par produit delivre, et non par vente.
     *
     * <p>
     * L'ecran groupe par vente parce que c'est ainsi qu'on retrouve une delivrance. Le registre, lui, se lit produit
     * par produit : c'est la delivrance du produit reglemente qui doit etre tracable.
     * </p>
     */
    private List<commonTasks.dto.OrdonnancierLigneDTO> lignesOrdonnancier(String medecinId, String dtStart,
            String dtEnd, String query) {
        List<commonTasks.dto.OrdonnancierLigneDTO> lignes = new java.util.ArrayList<>();
        for (commonTasks.dto.VenteDTO vente : salesService.findAllVenteOrdonnancier(medecinId, dtStart, dtEnd, query)) {
            if (vente.getItems() == null) {
                continue;
            }
            for (commonTasks.dto.VenteDetailsDTO detail : vente.getItems()) {
                commonTasks.dto.OrdonnancierLigneDTO ligne = new commonTasks.dto.OrdonnancierLigneDTO();
                ligne.setDate(StringUtils.defaultString(vente.getDtUPDATED()));
                ligne.setHeure(StringUtils.defaultString(vente.getHeure()));
                ligne.setReference(StringUtils.defaultString(vente.getStrREF()));
                ligne.setClient(StringUtils.defaultString(vente.getClientFullName()));
                ligne.setMedecin(StringUtils.defaultString(vente.getNom()));
                ligne.setNumeroOrdre(StringUtils.defaultString(vente.getNumOrder()));
                ligne.setCip(StringUtils.defaultString(detail.getIntCIP()));
                ligne.setProduit(StringUtils.defaultString(detail.getStrNAME()));
                ligne.setCodeTableau(StringUtils.defaultString(detail.getCodeTableau()));
                ligne.setQuantite(detail.getIntQUANTITY() != null ? detail.getIntQUANTITY() : 0);
                ligne.setMontant(detail.getIntPRICE() != null ? detail.getIntPRICE() : 0);
                ligne.setVendeur(StringUtils.defaultString(vente.getUserVendeurName()));
                lignes.add(ligne);
            }
        }
        return lignes;
    }

    /** Sous-titre de l'edition : la periode et ce sur quoi elle a ete filtree. */
    private static String sousTitreOrdonnancier(String dtStart, String dtEnd, String query, int nbLignes,
            int nbVentes) {
        StringBuilder sb = new StringBuilder("Du ").append(StringUtils.defaultString(dtStart)).append(" au ")
                .append(StringUtils.defaultString(dtEnd));
        if (StringUtils.isNotBlank(query)) {
            sb.append(" - recherche : ").append(query.trim());
        }
        return sb.append(" - ").append(nbVentes).append(" délivrance(s), ").append(nbLignes)
                .append(" ligne(s) de produit").toString();
    }

    /**
     * Les produits soumis a ordonnance d'UNE vente, charges a la demande.
     *
     * <p>
     * L'ecran ne les descend pas avec la liste : sur un mois de registre, cela ferait des centaines de lignes
     * transportees pour celles que l'utilisateur consulte reellement, c'est-a-dire une a la fois.
     * </p>
     */
    @GET
    @Path("ventesordonnanciers/detail/{venteId}")
    public Response detailOrdonnancier(@PathParam("venteId") String venteId) throws JSONException {
        List<commonTasks.dto.VenteDetailsDTO> produits = salesService.produitsOrdonnancier(venteId);
        return Response.ok().entity(new JSONObject().put("success", true).put("total", produits.size())
                .put("data", new org.json.JSONArray(produits)).toString()).build();
    }

    /**
     * TOUS les produits d'une vente, charges a la demande.
     *
     * <p>
     * Meme raison que pour l'ordonnancier : l'ecran des suppressions de vente ouvrait un (+) par ligne, alimente par un
     * champ que le serveur ne remplit jamais. Le detail se demande desormais vente par vente, et seulement quand on le
     * regarde.
     * </p>
     */
    @GET
    @Path("vente/detail/{venteId}")
    public Response detailProduitsVente(@PathParam("venteId") String venteId) throws JSONException {
        List<commonTasks.dto.VenteDetailsDTO> produits = salesService.venteDetailsByVenteId(venteId);
        return Response.ok().entity(new JSONObject().put("success", true).put("total", produits.size())
                .put("data", new org.json.JSONArray(produits)).toString()).build();
    }

    /** Nombre de lignes gardees dans chaque palmares quand l'ecran n'en demande pas d'autre. */
    private static final int TOP_ORDONNANCIER_DEFAUT = 20;

    /** En-tetes de l'analyse, partages par l'edition PDF et l'export Excel. */
    private static final String[] ENTETES_ANALYSE_ORDONNANCIER = { "Section", "Libellé", "Complément", "Délivrances",
            "Quantité", "Montant" };

    private rest.service.impl.AnalyseOrdonnancier.Resultat analyseOrdonnancier(String medecinId, String dtStart,
            String dtEnd, String query, int top) {
        // L'analyse porte sur EXACTEMENT la population du registre : meme appel, memes criteres.
        // Deux chemins de lecture differents donneraient deux verites, sans qu'on sache laquelle croire.
        return rest.service.impl.AnalyseOrdonnancier.analyser(
                salesService.findAllVenteOrdonnancier(medecinId, dtStart, dtEnd, query, true),
                top > 0 ? top : TOP_ORDONNANCIER_DEFAUT);
    }

    private static JSONArray palmaresJson(List<rest.service.impl.AnalyseOrdonnancier.Cumul> cumuls) {
        JSONArray tableau = new JSONArray();
        for (rest.service.impl.AnalyseOrdonnancier.Cumul cumul : cumuls) {
            tableau.put(new JSONObject().put("libelle", cumul.getLibelle()).put("complement", cumul.getComplement())
                    .put("delivrances", cumul.getDelivrances()).put("quantite", cumul.getQuantite())
                    .put("montant", cumul.getMontant()));
        }
        return tableau;
    }

    /**
     * L'analyse du registre : ce qui sort le plus, pour qui, et sur prescription de qui.
     *
     * @param top
     *            nombre de lignes gardees dans chaque palmares
     */
    @GET
    @Path("ventesordonnanciers/analyse")
    public Response analyseOrdonnancierJson(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "medecinId") String medecinId,
            @QueryParam(value = "query") String query, @QueryParam(value = "top") int top) throws JSONException {
        rest.service.impl.AnalyseOrdonnancier.Resultat r = analyseOrdonnancier(medecinId, dtStart, dtEnd, query, top);
        JSONObject indicateurs = new JSONObject().put("delivrances", r.getDelivrances()).put("lignes", r.getLignes())
                .put("produitsDistincts", r.getProduitsDistincts()).put("clientsDistincts", r.getClientsDistincts())
                .put("medecinsDistincts", r.getMedecinsDistincts()).put("quantiteTotale", r.getQuantiteTotale())
                .put("montantTotal", r.getMontantTotal());
        return Response.ok().entity(new JSONObject().put("success", true).put("indicateurs", indicateurs)
                .put("topProduits", palmaresJson(r.getTopProduits())).put("topClients", palmaresJson(r.getTopClients()))
                .put("topMedecins", palmaresJson(r.getTopMedecins())).toString()).build();
    }

    @GET
    @Path("ventesordonnanciers/analyse/pdf")
    public Response imprimerAnalyseOrdonnancier(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "medecinId") String medecinId,
            @QueryParam(value = "query") String query, @QueryParam(value = "top") int top) {
        TUser user = (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
        if (user == null) {
            return Response.ok()
                    .entity(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        rest.service.impl.AnalyseOrdonnancier.Resultat r = analyseOrdonnancier(medecinId, dtStart, dtEnd, query, top);
        java.util.Map<String, Object> parametres = reportUtil.officineData(user);
        parametres.put("P_H_CLT_INFOS", "ANALYSE DE L'ORDONNANCIER");
        parametres.put("P_PERIODE", sousTitreOrdonnancier(dtStart, dtEnd, query, r.getLignes(), r.getDelivrances()));
        parametres.put("P_INDICATEURS", rest.service.impl.AnalyseOrdonnancier.indicateursTexte(r));
        String url = reportUtil.buildReport(parametres, "analyse_ordonnancier",
                rest.service.impl.AnalyseOrdonnancier.aPlat(r));
        // Meme precaution que pour le registre : buildReport rend l'URL attendue meme quand
        // l'edition a echoue. On verifie que le PDF existe avant d'annoncer un succes.
        if (StringUtils.isBlank(url)
                || !new java.io.File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))).isFile()) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("msg", "L'édition n'a pas pu être générée").toString())
                    .build();
        }
        return Response.ok().entity(new JSONObject().put("success", true).put("url", url).put("msg", url).toString())
                .build();
    }

    @GET
    @Path("ventesordonnanciers/analyse/excel")
    @Produces("application/vnd.ms-excel")
    public Response exporterAnalyseOrdonnancier(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "medecinId") String medecinId,
            @QueryParam(value = "query") String query, @QueryParam(value = "top") int top) throws IOException {
        rest.service.impl.AnalyseOrdonnancier.Resultat r = analyseOrdonnancier(medecinId, dtStart, dtEnd, query, top);
        String titre = "ANALYSE DE L'ORDONNANCIER - du " + StringUtils.defaultString(dtStart) + " au "
                + StringUtils.defaultString(dtEnd) + " - " + rest.service.impl.AnalyseOrdonnancier.indicateursTexte(r);
        byte[] data = excelExportService.createExcelReport(titre, ENTETES_ANALYSE_ORDONNANCIER,
                rest.service.impl.AnalyseOrdonnancier.aPlat(r), (row, ligne) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(ligne.getSection());
                    row.createCell(col++).setCellValue(ligne.getLibelle());
                    row.createCell(col++).setCellValue(ligne.getComplement());
                    row.createCell(col++).setCellValue(ligne.getDelivrances());
                    row.createCell(col++).setCellValue(ligne.getQuantite());
                    row.createCell(col++).setCellValue(ligne.getMontant());
                });
        String nomFichier = "analyse_ordonnancier_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".xls";
        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("content-disposition", "attachment; filename = " + nomFichier).build();
    }

    @GET
    @Path("ventesordonnanciers/pdf")
    public Response imprimerOrdonnancier(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "medecinId") String medecinId,
            @QueryParam(value = "query") String query) {
        TUser user = (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
        if (user == null) {
            return Response.ok()
                    .entity(new JSONObject().put("success", false).put("msg", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        List<commonTasks.dto.OrdonnancierLigneDTO> lignes = lignesOrdonnancier(medecinId, dtStart, dtEnd, query);
        int nbVentes = salesService.findAllVenteOrdonnancier(medecinId, dtStart, dtEnd, query).size();
        java.util.Map<String, Object> parametres = reportUtil.officineData(user);
        parametres.put("P_H_CLT_INFOS", "ORDONNANCIER");
        parametres.put("P_PERIODE", sousTitreOrdonnancier(dtStart, dtEnd, query, lignes.size(), nbVentes));
        String url = reportUtil.buildReport(parametres, "ordonnancier", lignes);
        // buildReport rend l'URL attendue meme quand l'edition a echoue : il journalise l'erreur et
        // continue. Annoncer un succes sur cette seule foi enverrait l'utilisateur ouvrir un fichier
        // qui n'existe pas. On verifie donc que le PDF a bien ete ecrit.
        if (StringUtils.isBlank(url)
                || !new java.io.File(reportUtil.getReportDirectory(url.substring(url.lastIndexOf('/') + 1))).isFile()) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("msg", "L'édition n'a pas pu être générée").toString())
                    .build();
        }
        return Response.ok().entity(new JSONObject().put("success", true).put("url", url).put("msg", url).toString())
                .build();
    }

    @GET
    @Path("ventesordonnanciers/excel")
    @Produces("application/vnd.ms-excel")
    public Response exporterOrdonnancier(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "medecinId") String medecinId,
            @QueryParam(value = "query") String query) throws IOException {
        List<commonTasks.dto.OrdonnancierLigneDTO> lignes = lignesOrdonnancier(medecinId, dtStart, dtEnd, query);
        String titre = "ORDONNANCIER - du " + StringUtils.defaultString(dtStart) + " au "
                + StringUtils.defaultString(dtEnd);
        byte[] data = excelExportService.createExcelReport(titre, ENTETES_ORDONNANCIER, lignes, (row, ligne) -> {
            int col = 0;
            row.createCell(col++).setCellValue(ligne.getDate());
            row.createCell(col++).setCellValue(ligne.getHeure());
            row.createCell(col++).setCellValue(ligne.getReference());
            row.createCell(col++).setCellValue(ligne.getClient());
            row.createCell(col++).setCellValue(ligne.getMedecin());
            row.createCell(col++).setCellValue(ligne.getNumeroOrdre());
            row.createCell(col++).setCellValue(ligne.getCip());
            row.createCell(col++).setCellValue(ligne.getProduit());
            row.createCell(col++).setCellValue(ligne.getCodeTableau());
            row.createCell(col++).setCellValue(ligne.getQuantite());
            row.createCell(col++).setCellValue(ligne.getMontant());
            row.createCell(col++).setCellValue(ligne.getVendeur());
        });
        String nomFichier = "ordonnancier_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".xls";
        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("content-disposition", "attachment; filename = " + nomFichier).build();
    }

    /**
     * Cree un inventaire des produits delivres sur la periode affichee.
     *
     * <p>
     * Compter d'abord, creer ensuite, dans le meme appel : l'ecran affiche le nombre avant de demander confirmation, et
     * {@code controle=true} lui donne ce nombre sans rien creer.
     * </p>
     */
    @POST
    @Path("ventesordonnanciers/inventaire")
    public Response inventaireOrdonnancier(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "medecinId") String medecinId,
            @QueryParam(value = "query") String query,
            @DefaultValue("false") @QueryParam(value = "controle") boolean controle) {
        TUser user = (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
        if (user == null) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", Constant.DECONNECTED_MESSAGE).toString())
                    .build();
        }
        List<String> venteIds = salesService.findAllVenteOrdonnancier(medecinId, dtStart, dtEnd, query).stream()
                .map(commonTasks.dto.VenteDTO::getLgPREENREGISTREMENTID).collect(java.util.stream.Collectors.toList());
        java.util.Set<String> produitIds = inventaireService.produitIdsFromVentes(venteIds);
        if (controle) {
            return Response.ok().entity(new JSONObject().put("success", true).put("count", produitIds.size())
                    .put("ventes", venteIds.size()).toString()).build();
        }
        if (produitIds.isEmpty()) {
            return Response.ok().entity(new JSONObject().put("success", false)
                    .put("message", "Aucun produit sur la période affichée.").toString()).build();
        }
        String nom = "INVENTAIRE ORDONNANCIER "
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        int compte = inventaireService.create(produitIds, nom, nom);
        return Response.ok().entity(new JSONObject().put("success", true).put("count", compte).toString()).build();
    }

    @GET
    @Path("article-vendus")
    public Response articlesVendus(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd, @QueryParam(value = "user") String user,
            @QueryParam(value = "query") String query, @QueryParam(value = "typeTransaction") String typeTransaction,
            @QueryParam(value = "nbre") int nbre, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "stock") Integer stock,
            @QueryParam(value = "prixachatFiltre") String prixachatFiltre,
            @QueryParam(value = "grossisteId") String grossisteId,
            @QueryParam(value = "stockFiltre") String stockFiltre, @QueryParam(value = "rayonId") String rayonId,
            @QueryParam(value = "produitId") String produitId) throws JSONException {

        JSONObject jsono = salesService
                .articlesVendus(buildSalesStatsParams(dtStart, dtEnd, hStart, hEnd, user, query, typeTransaction, nbre,
                        start, limit, stock, prixachatFiltre, stockFiltre, rayonId, null, produitId, grossisteId));
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("article-vendus-recap")
    public Response articlesVendusRecap(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd, @QueryParam(value = "user") String user,
            @QueryParam(value = "query") String query, @QueryParam(value = "typeTransaction") String typeTransaction,
            @QueryParam(value = "nbre") int nbre, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "stock") Integer stock,
            @QueryParam(value = "prixachatFiltre") String prixachatFiltre,
            @QueryParam(value = "stockFiltre") String stockFiltre, @QueryParam(value = "rayonId") String rayonId,
            @QueryParam(value = "grossisteId") String grossisteId, @QueryParam(value = "qteVendu") Integer qteVendu)
            throws JSONException {

        JSONObject jsono = salesService
                .articlesVendusRecap(buildSalesStatsParams(dtStart, dtEnd, hStart, hEnd, user, query, typeTransaction,
                        nbre, start, limit, stock, prixachatFiltre, stockFiltre, rayonId, qteVendu, null, grossisteId));
        return Response.ok().entity(jsono.toString()).build();
    }

    private SalesStatsParams buildSalesStatsParams(String dtStart, String dtEnd, String hStart, String hEnd,
            String user, String query, String typeTransaction, int nbre, int start, int limit, Integer stock,
            String prixachatFiltre, String stockFiltre, String rayonId, Integer qteVendu, String produitId,
            String grossisteId) {
        SalesStatsParams body = new SalesStatsParams();
        body.setUser(user);
        body.setLimit(limit);
        body.setStart(start);
        body.setQuery(query);
        body.setTypeVenteId(null);
        body.setStatut(Constant.STATUT_IS_CLOSED);
        body.setAll(false);
        body.setStock(stock);
        // Case « Inclure le stock reserve » des ecrans articles vendus : lue ici pour
        // couvrir d'un coup liste, recap, exports csv/excel et suggestion. Cochee par
        // defaut (seul 'false' explicite bascule sur le stock rayon seul).
        body.setAvecStockReserve(!"false".equals(servletRequest.getParameter("avecStockReserve")));
        body.setRayonId(rayonId);
        body.setTypeTransaction(typeTransaction);
        body.setStockFiltre(stockFiltre);
        body.setPrixachatFiltre(prixachatFiltre);
        body.setQteVendu(qteVendu);
        body.setNbre(nbre);
        body.setProduitId(produitId);
        body.setGrossisteId(grossisteId);
        try {
            body.setDtEnd(LocalDate.parse(dtEnd));
        } catch (Exception e) {
        }
        try {
            body.sethEnd(LocalTime.parse(hEnd));
        } catch (Exception e) {
        }
        try {
            body.sethStart(LocalTime.parse(hStart));
        } catch (Exception e) {
        }
        try {
            body.setDtStart(LocalDate.parse(dtStart));

        } catch (Exception e) {
        }
        body.setDepotOnly(false);
        return body;

    }

    @GET
    @Path("suggerer")
    public Response suggerer(@QueryParam(value = "dtStart") String dtStart, @QueryParam(value = "dtEnd") String dtEnd,
            @QueryParam(value = "hStart") String hStart, @QueryParam(value = "hEnd") String hEnd,
            @QueryParam(value = "user") String user, @QueryParam(value = "query") String query,
            @QueryParam(value = "typeTransaction") String typeTransaction, @QueryParam(value = "nbre") int nbre,
            @QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "stock") Integer stock, @QueryParam(value = "prixachatFiltre") String prixachatFiltre,
            @QueryParam(value = "stockFiltre") String stockFiltre, @QueryParam(value = "rayonId") String rayonId,
            @QueryParam(value = "grossisteId") String grossisteId, @QueryParam(value = "qteVendu") Integer qteVendu,
            @QueryParam(value = "isReappro") Boolean isReappro) {

        JSONObject json = salesService.articleVendusASuggerer(
                buildSalesStatsParams(dtStart, dtEnd, hStart, hEnd, user, query, typeTransaction, nbre, start, limit,
                        stock, prixachatFiltre, stockFiltre, rayonId, qteVendu, null, grossisteId),
                Objects.requireNonNullElse(isReappro, false));
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("devis/csv")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportToCsv(@QueryParam("id") String venteId, @QueryParam("ref") String ref) {
        StreamingOutput output = (OutputStream out) -> {
            try {
                List<TPreenregistrementDetail> detailses = salesService.venteDetailByVenteId(venteId);
                Writer writer = new OutputStreamWriter(out, "UTF-8");

                try (CSVPrinter printer = CSVFormat.EXCEL.withDelimiter(';').withHeader(ArticleHeader.class)
                        .print(writer)) {

                    detailses.forEach(f -> {
                        try {
                            printer.printRecord(f.getLgFAMILLEID().getIntCIP(), f.getIntQUANTITY());

                        } catch (IOException ex) {

                        }
                    });

                }
            } catch (IOException ex) {
                throw new WebApplicationException("File Not Found !!");
            }
        };
        String filename = "devis_" + ref + "_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".csv";
        return Response.ok(output, MediaType.APPLICATION_OCTET_STREAM)
                .header("content-disposition", "attachment; filename = " + filename).build();

    }

    // Export Excel TABULAIRE du devis/proforma : une ligne par article, montants
    // numeriques et total, facilement modifiable (remplace l'export Jasper qui
    // reproduisait la mise en page de la facture).
    @GET
    @Path("devis/excel")
    @Produces("application/vnd.ms-excel")
    public Response exportDevisToExcel(@QueryParam("id") String venteId, @QueryParam("ref") String ref)
            throws Exception {
        List<TPreenregistrementDetail> details = salesService.venteDetailByVenteId(venteId);
        if (details == null || details.isEmpty()) {
            return Response.ok().entity(
                    new JSONObject().put("success", false).put("message", "Aucun article dans ce devis").toString())
                    .build();
        }
        dal.TPreenregistrement devis = details.get(0).getLgPREENREGISTREMENTID();
        StringBuilder title = new StringBuilder("Devis " + (ref != null ? ref : ""));
        try {
            if (devis != null) {
                title.append(" du ").append(new java.text.SimpleDateFormat("dd/MM/yyyy").format(devis.getDtUPDATED()));
                if (devis.getClient() != null) {
                    title.append(" - Client : ").append(devis.getClient().getStrFIRSTNAME()).append(" ")
                            .append(devis.getClient().getStrLASTNAME());
                }
            }
        } catch (Exception e) {
        }
        long totalQte = details.stream().mapToLong(d -> d.getIntQUANTITY() == null ? 0 : d.getIntQUANTITY()).sum();
        long totalRemise = details.stream().mapToLong(d -> d.getIntPRICEREMISE() == null ? 0 : d.getIntPRICEREMISE())
                .sum();
        long totalMontant = details.stream().mapToLong(d -> d.getIntPRICE() == null ? 0 : d.getIntPRICE()).sum();
        java.util.List<TPreenregistrementDetail> rows = new java.util.ArrayList<>(details);
        rows.add(null); // sentinelle : ligne de total
        String[] headers = new String[] { "CIP", "Designation", "Quantite", "Prix unitaire", "Remise", "Montant" };
        byte[] data = excelExportService.createExcelReport(title.toString(), headers, rows, (row, d) -> {
            if (d == null) {
                row.createCell(0).setCellValue("TOTAL");
                row.createCell(2).setCellValue(totalQte);
                row.createCell(4).setCellValue(totalRemise);
                row.createCell(5).setCellValue(totalMontant);
                return;
            }
            row.createCell(0).setCellValue(d.getLgFAMILLEID() != null ? d.getLgFAMILLEID().getIntCIP() : "");
            row.createCell(1).setCellValue(d.getLgFAMILLEID() != null ? d.getLgFAMILLEID().getStrNAME() : "");
            row.createCell(2).setCellValue(d.getIntQUANTITY() == null ? 0 : d.getIntQUANTITY());
            row.createCell(3).setCellValue(d.getIntPRICEUNITAIR() == null ? 0 : d.getIntPRICEUNITAIR());
            row.createCell(4).setCellValue(d.getIntPRICEREMISE() == null ? 0 : d.getIntPRICEREMISE());
            row.createCell(5).setCellValue(d.getIntPRICE() == null ? 0 : d.getIntPRICE());
        });
        String filename = "devis_" + (ref != null ? ref : venteId) + "_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".xls";
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"" + filename + "\"").build();
    }

    @GET
    @Path("find-one/{id}")
    public Response getOne(@PathParam("id") String venteId) {

        JSONObject json = FunctionUtils.returnData(salesService.getOne(venteId));
        return Response.ok().entity(json.toString()).build();
    }

    @GET
    @Path("depot-amount")
    public Response getDepotAmount(@QueryParam(value = "start") int start, @QueryParam(value = "limit") int limit,
            @QueryParam(value = "query") String query, @QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd, @QueryParam(value = "sansBon") boolean sansBon,
            @QueryParam(value = "onlyAvoir") boolean onlyAvoir, @QueryParam(value = "typeVenteId") String typeVenteId,
            @QueryParam(value = "nature") String nature, @QueryParam(value = "depotOnly") Boolean depotOnly,
            @QueryParam(value = "typeDepotId") String typeDepotId, @QueryParam(value = "depotId") String depotId)
            throws JSONException {
        SalesStatsParams body = buildParams(start, limit, query, dtStart, dtEnd, hStart, hEnd, sansBon, onlyAvoir,
                typeVenteId, nature, depotOnly, typeDepotId, depotId);
        JSONObject jsono = new JSONObject();
        long amount = salesService.montantDepot(body);
        jsono.put("amount", amount);
        return Response.ok().entity(jsono.toString()).build();
    }

    @GET
    @Path("article-vendus-recap/csv")
    @Produces("text/csv")
    public Response exportArticlesVendusRecapCsv(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd, @QueryParam(value = "user") String user,
            @QueryParam(value = "query") String query, @QueryParam(value = "typeTransaction") String typeTransaction,
            @QueryParam(value = "nbre") int nbre, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "stock") Integer stock,
            @QueryParam(value = "prixachatFiltre") String prixachatFiltre,
            @QueryParam(value = "stockFiltre") String stockFiltre, @QueryParam(value = "rayonId") String rayonId,
            @QueryParam(value = "grossisteId") String grossisteId, @QueryParam(value = "qteVendu") Integer qteVendu)
            throws IOException {

        byte[] data = salesService.exportArticlesVendusRecapCsv(
                buildSalesStatsParams(dtStart, dtEnd, hStart, hEnd, user, query, typeTransaction, nbre, start, limit,
                        stock, prixachatFiltre, stockFiltre, rayonId, qteVendu, null, grossisteId));
        String filename = "article-vendus-recap_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".csv";
        return Response.ok(data, "text/csv; charset=UTF-8").encoding("UTF-8")
                .header("content-disposition", "attachment; filename = " + filename).build();
    }

    @GET
    @Path("article-vendus-recap/excel")
    @Produces("application/vnd.ms-excel")
    public Response exportArticlesVendusRecapExcel(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd, @QueryParam(value = "user") String user,
            @QueryParam(value = "query") String query, @QueryParam(value = "typeTransaction") String typeTransaction,
            @QueryParam(value = "nbre") int nbre, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "stock") Integer stock,
            @QueryParam(value = "prixachatFiltre") String prixachatFiltre,
            @QueryParam(value = "stockFiltre") String stockFiltre, @QueryParam(value = "rayonId") String rayonId,
            @QueryParam(value = "grossisteId") String grossisteId, @QueryParam(value = "qteVendu") Integer qteVendu)
            throws IOException {

        byte[] data = salesService.exportArticlesVendusRecapExcel(
                buildSalesStatsParams(dtStart, dtEnd, hStart, hEnd, user, query, typeTransaction, nbre, start, limit,
                        stock, prixachatFiltre, stockFiltre, rayonId, qteVendu, null, grossisteId));
        String filename = "article-vendus-recap_"
                + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd_MM_yyyy_H_mm_ss")) + ".xls";
        return Response.ok(data, "application/vnd.ms-excel").encoding("UTF-8")
                .header("content-disposition", "attachment; filename = " + filename).build();
    }

    @GET
    @Path("create-invenatire")
    public Response createInventaire(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "hStart") String hStart,
            @QueryParam(value = "hEnd") String hEnd, @QueryParam(value = "user") String user,
            @QueryParam(value = "query") String query, @QueryParam(value = "typeTransaction") String typeTransaction,
            @QueryParam(value = "nbre") int nbre, @QueryParam(value = "start") int start,
            @QueryParam(value = "limit") int limit, @QueryParam(value = "stock") Integer stock,
            @QueryParam(value = "prixachatFiltre") String prixachatFiltre,
            @QueryParam(value = "stockFiltre") String stockFiltre, @QueryParam(value = "rayonId") String rayonId,
            @QueryParam(value = "grossisteId") String grossisteId, @QueryParam(value = "qteVendu") Integer qteVendu)
            throws IOException {

        JSONObject count = salesService
                .createInventaire(buildSalesStatsParams(dtStart, dtEnd, hStart, hEnd, user, query, typeTransaction,
                        nbre, start, limit, stock, prixachatFiltre, stockFiltre, rayonId, qteVendu, null, grossisteId));

        return Response.ok(count.toString()).build();
    }

    @POST
    @Path("devis/inventaire/{id}")
    @Consumes({ MediaType.APPLICATION_JSON, MediaType.APPLICATION_FORM_URLENCODED })
    @Produces(MediaType.APPLICATION_JSON)
    public Response createInventaireFromOneDevis(@PathParam("id") String devisId) {
        HttpSession hs = servletRequest.getSession();
        TUser u = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (u == null) {
            return Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"success\":false,\"msg\":\"" + Constant.DECONNECTED_MESSAGE + "\"}").build();
        }

        try {
            JSONObject json = salesService.createInventaireFromOneDevis(u, devisId);
            return Response.ok(json.toString(), MediaType.APPLICATION_JSON).build();
        } catch (JSONException e) {
            Logger.getLogger(SalesStatsRessource.class.getName()).log(Level.SEVERE, null, e);
            return Response.serverError().entity("{\"count\":0}").build();
        }
    }
}
