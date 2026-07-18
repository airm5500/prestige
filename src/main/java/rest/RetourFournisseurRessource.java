/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import commonTasks.dto.RetourDetailsDTO;
import commonTasks.dto.RetourFournisseurDTO;
import dal.TUser;
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
import javax.ws.rs.core.Response;
import rest.service.RetourFournisseurService;
import rest.service.dto.UpdateRetourDTO;
import rest.service.dto.UpdateRetourItemDTO;

/**
 *
 * @author koben
 */
@Path("v1/retourfournisseur")
@Produces("application/json")
@Consumes("application/json")
public class RetourFournisseurRessource {

    @EJB
    private RetourFournisseurService retourFournisseurService;
    @EJB
    private rest.service.MvtProduitService mvtProduitService;
    @EJB
    private rest.service.InventaireService inventaireService;
    @EJB
    private rest.service.utils.ReportExcelExportService reportExcelExportService;

    private String defaultDate(String date) {
        return org.apache.commons.lang3.StringUtils.isEmpty(date) ? java.time.LocalDate.now().toString() : date;
    }

    private List<RetourDetailsDTO> loadDetails(String dtStart, String dtEnd, String fourId, String query,
            String filtre) {
        return mvtProduitService.loadretoursFournisseur(defaultDate(dtStart), defaultDate(dtEnd), fourId, query,
                filtre);
    }

    private java.util.Set<String> produitIds(String dtStart, String dtEnd, String fourId, String query, String filtre) {
        return loadDetails(dtStart, dtEnd, fourId, query, filtre).stream().map(RetourDetailsDTO::getProduitId)
                .filter(org.apache.commons.lang3.StringUtils::isNotEmpty)
                .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));
    }

    // Nombre de produits distincts des retours affiches (controle avant confirmation)
    @GET
    @Path("produits/count")
    public Response produitsCount(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "fourId") String fourId,
            @QueryParam(value = "query") String query, @QueryParam(value = "filtre") String filtre)
            throws org.json.JSONException {
        int count = produitIds(dtStart, dtEnd, fourId, query, filtre).size();
        return Response.ok().entity(new org.json.JSONObject().put("success", true).put("count", count).toString())
                .build();
    }

    // Creation d'inventaire a partir des produits des retours fournisseur affiches
    @POST
    @Path("create-inventaire")
    public Response createInventaire(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "fourId") String fourId,
            @QueryParam(value = "query") String query, @QueryParam(value = "filtre") String filtre)
            throws org.json.JSONException {
        java.util.Set<String> ids = produitIds(dtStart, dtEnd, fourId, query, filtre);
        if (ids.isEmpty()) {
            return Response.ok().entity(new org.json.JSONObject().put("success", false)
                    .put("message", "Aucun produit dans les retours affiches").toString()).build();
        }
        String name = "INVENTAIRE RETOURS FOURNISSEUR " + java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        int count = inventaireService.create(ids, name, name);
        return Response.ok().entity(new org.json.JSONObject().put("success", true).put("count", count).toString())
                .build();
    }

    // Export Excel des produits des retours affiches (memes filtres que la liste)
    @GET
    @Path("export-excel")
    @Produces("application/vnd.ms-excel")
    public Response exportExcel(@QueryParam(value = "dtStart") String dtStart,
            @QueryParam(value = "dtEnd") String dtEnd, @QueryParam(value = "fourId") String fourId,
            @QueryParam(value = "query") String query, @QueryParam(value = "filtre") String filtre) throws Exception {
        List<RetourDetailsDTO> details = loadDetails(dtStart, dtEnd, fourId, query, filtre);
        String[] headers = new String[] { "N° BL", "Date retour", "Heure", "Fournisseur", "Code produit", "Libelle",
                "Quantite retournee", "Utilisateur" };
        String title = "Produits des retours fournisseur du " + defaultDate(dtStart) + " au " + defaultDate(dtEnd);
        byte[] data = reportExcelExportService.createExcelReport(title, headers, details, (row, dto) -> {
            row.createCell(0).setCellValue(dto.getReferenceBl() == null ? "" : dto.getReferenceBl());
            row.createCell(1).setCellValue(dto.getDtCREATED() == null ? "" : dto.getDtCREATED());
            row.createCell(2).setCellValue(dto.getHEURE() == null ? "" : dto.getHEURE());
            row.createCell(3).setCellValue(dto.getStrLIBELLE() == null ? "" : dto.getStrLIBELLE());
            row.createCell(4).setCellValue(dto.getIntCIP() == null ? "" : dto.getIntCIP());
            row.createCell(5).setCellValue(dto.getStrNAME() == null ? "" : dto.getStrNAME());
            row.createCell(6).setCellValue(dto.getIntNUMBERRETURN() == null ? 0 : dto.getIntNUMBERRETURN());
            row.createCell(7).setCellValue(dto.getOperateur() == null ? "" : dto.getOperateur());
        });
        return Response.ok(data)
                .header("Content-Disposition", "attachment; filename=\"retours_fournisseur_produits.xls\"").build();
    }

    @GET
    @Path("retours-items")
    public Response loadDetailsRetouFournisseurs(@QueryParam(value = "retourId") String retourId) {

        List<RetourDetailsDTO> data = retourFournisseurService.loadDetailRetourFournisseur(retourId);
        return Response.ok().entity(ResultFactory.getSuccessResult(data, data.size())).build();
    }

    @POST
    @Path("new")
    public Response create(RetourFournisseurDTO params) {

        RetourFournisseurDTO data = retourFournisseurService.createRetour(params);
        if (data != null) {
            return Response.ok().entity(ResultFactory.getSuccessResult(data, 1)).build();
        }
        return Response.ok()
                .entity(ResultFactory.getFailResult("L'opération a échoué . Veuillez vérifier la quantité à retourner"))
                .build();
    }

    @POST
    @Path("add-item")
    public Response addItem(RetourDetailsDTO params) {

        RetourDetailsDTO data = retourFournisseurService.addItem(params);
        if (data != null) {
            return Response.ok().entity(ResultFactory.getSuccessResult(data, 1)).build();
        }
        return Response.ok()
                .entity(ResultFactory.getFailResult("L'opération a échoué . Veuillez vérifier la quantité à retourner"))
                .build();
    }

    @POST
    @Path("update-item")
    public Response updateItem(RetourDetailsDTO params) {

        RetourDetailsDTO data = retourFournisseurService.updateItem(params);
        if (data != null) {
            return Response.ok().entity(ResultFactory.getSuccessResult(data, 1)).build();
        }
        return Response.ok()
                .entity(ResultFactory.getFailResult("L'opération a échoué . Veuillez vérifier la quantité à retourner"))
                .build();
    }

    @DELETE
    @Path("remove-item/{id}")
    public Response removeItem(@PathParam("id") String id) {

        retourFournisseurService.removeItem(id);
        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();

    }

    @PUT
    @Path("full-bl/{id}")
    public Response returnFullBonLivraison(@PathParam("id") String id, RetourDetailsDTO params)
            throws CloneNotSupportedException {

        retourFournisseurService.returnFullBonLivraison(id, params.getLgMOTIFRETOUR());

        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
    }

    @POST
    @Path("update-item-response")
    public Response updateQuantiteReponse(UpdateRetourItemDTO retourItem) throws CloneNotSupportedException {

        retourFournisseurService.updateQuantiteReponse(retourItem);

        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
    }

    @POST
    @Path("finaliser-retour-response")
    public Response finaliserRetourFournisseur(UpdateRetourDTO updateRetourDTO) throws CloneNotSupportedException {

        retourFournisseurService.finaliserRetourFournisseur(updateRetourDTO);

        return Response.ok().entity(ResultFactory.getSuccessResultMsg()).build();
    }
}
