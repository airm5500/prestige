package rest;

import bll.entity.EntityData;
import bll.preenregistrement.Preenregistrement;
import commonTasks.dto.BalanceAgeeDetailDTO;
import commonTasks.dto.BalanceAgeeRecapDTO;
import dal.TFacture;
import dal.TUser;
import dal.dataManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.report.ReportUtil;
import rest.service.utils.CsvExportService;
import rest.service.utils.ReportExcelExportService;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import util.Constant;

/**
 * Exports (CSV, Excel) et impression des balances agees recapitulative et detaillee. Reprend la meme logique de
 * construction des donnees que ws_data_balance_agee.jsp et ws_data_balance_agee_recapitulatifdetail.jsp.
 */
@Path("v1/balance-agee")
@Produces("application/json")
@Consumes("application/json")
public class BalanceAgeeRessource {

    private static final Logger LOG = Logger.getLogger(BalanceAgeeRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private CsvExportService csvExportService;
    @EJB
    private ReportExcelExportService reportExcelExportService;
    @EJB
    private ReportUtil reportUtil;

    private TUser getUser() {
        HttpSession hs = servletRequest.getSession();
        return (TUser) hs.getAttribute(commonparameter.AIRTIME_USER);
    }

    private Preenregistrement preenregistrement(TUser user) {
        dataManager odataManager = new dataManager();
        odataManager.initEntityManager();
        return new Preenregistrement(odataManager, user);
    }

    // ---------------------------------------------------------------- recap

    private List<BalanceAgeeRecapDTO> buildRecap(TUser user, String searchValue, String tiersPayantId) {
        List<BalanceAgeeRecapDTO> rows = new ArrayList<>();
        try {
            String search = StringUtils.isEmpty(searchValue) ? "" : searchValue;
            String tp = StringUtils.isEmpty(tiersPayantId) ? "%%" : tiersPayantId;
            date key = new date();
            Preenregistrement oPreenregistrement = preenregistrement(user);

            long nbdossierhalfyear = 0L, montanthalfyear = 0L;
            List<TFacture> lsthalfyearinvoices = oPreenregistrement.getPreviousHalfYearBalanceInvoice(search, "%%", tp);
            for (TFacture oFacture : lsthalfyearinvoices) {
                nbdossierhalfyear += oPreenregistrement.getNombreDossierImpayeParFacture(oFacture.getLgFACTUREID());
                montanthalfyear += oFacture.getDblMONTANTRESTANT().longValue();
            }
            JSONObject obj = oPreenregistrement.getPreviousHalfYearBalance();
            BalanceAgeeRecapDTO first = new BalanceAgeeRecapDTO();
            first.setPeriode(
                    "<= " + date.formatterShort.format(date.getPreviousHalfYearIncludeCurrentMonth(new Date())));
            first.setNbFactures(lsthalfyearinvoices.size());
            first.setNbDossiersFactures(nbdossierhalfyear);
            first.setMontantFacture(montanthalfyear);
            first.setNbDossiersNonFactures(obj.getLong("NOMBRE"));
            first.setMontantNonFacture(obj.getLong("MONTANT"));
            rows.add(first);

            for (int i = 5; i > -1; i--) {
                List<TFacture> list = oPreenregistrement.getBalanceInvoice(search, date.getPreviousMonth(i), "%%", tp);
                JSONObject objMois = oPreenregistrement.getBalanceInvoice(date.getPreviousMonth(i));
                long nbdossier = 0L, montant = 0L;
                for (TFacture oFacture : list) {
                    nbdossier += oPreenregistrement.getNombreDossierImpayeParFacture(oFacture.getLgFACTUREID());
                    montant += oFacture.getDblMONTANTRESTANT().longValue();
                }
                BalanceAgeeRecapDTO dto = new BalanceAgeeRecapDTO();
                dto.setPeriode(date.DateToString(key.getFirstDayofSomeMonth(-i), date.formatterShort) + " au "
                        + date.DateToString(key.getLastDayofSomeMonth(-i), date.formatterShort));
                dto.setNbFactures(list.size());
                dto.setNbDossiersFactures(nbdossier);
                dto.setMontantFacture(montant);
                dto.setNbDossiersNonFactures(objMois.getLong("NOMBRE"));
                dto.setMontantNonFacture(objMois.getLong("MONTANT"));
                rows.add(dto);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return rows;
    }

    private String[] recapHeaders() {
        return new String[] { "Période", "Nombre factures", "Nb dossiers facturés", "Nb dossiers non facturés",
                "Total dossiers", "Montant facturé", "Montant non facturé", "Total montant" };
    }

    @GET
    @Path("recap/csv")
    @Produces("text/csv")
    public Response recapCsv(@QueryParam("search_value") String searchValue,
            @QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId) throws Exception {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<BalanceAgeeRecapDTO> rows = buildRecap(tu, searchValue, tiersPayantId);
        byte[] raw = csvExportService.createCsvReport("Balance âgée récapitulative", recapHeaders(), rows,
                dto -> new String[] { dto.getPeriode(), String.valueOf(dto.getNbFactures()),
                        String.valueOf(dto.getNbDossiersFactures()), String.valueOf(dto.getNbDossiersNonFactures()),
                        String.valueOf(dto.getTotalDossiers()), String.valueOf(dto.getMontantFacture()),
                        String.valueOf(dto.getMontantNonFacture()), String.valueOf(dto.getTotalMontant()) });
        return Response.ok(csvExportService.addUtf8Bom(raw))
                .header("Content-Disposition", "attachment; filename=\"balance_agee_recap.csv\"").build();
    }

    @GET
    @Path("recap/excel")
    @Produces("application/vnd.ms-excel")
    public Response recapExcel(@QueryParam("search_value") String searchValue,
            @QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId) throws Exception {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<BalanceAgeeRecapDTO> rows = buildRecap(tu, searchValue, tiersPayantId);
        byte[] data = reportExcelExportService.createExcelReport("Balance âgée récapitulative", recapHeaders(), rows,
                (row, dto) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(dto.getPeriode());
                    row.createCell(col++).setCellValue(dto.getNbFactures());
                    row.createCell(col++).setCellValue(dto.getNbDossiersFactures());
                    row.createCell(col++).setCellValue(dto.getNbDossiersNonFactures());
                    row.createCell(col++).setCellValue(dto.getTotalDossiers());
                    row.createCell(col++).setCellValue(dto.getMontantFacture());
                    row.createCell(col++).setCellValue(dto.getMontantNonFacture());
                    row.createCell(col++).setCellValue(dto.getTotalMontant());
                });
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"balance_agee_recap.xls\"")
                .build();
    }

    @GET
    @Path("recap/pdf")
    public Response recapPdf(@QueryParam("search_value") String searchValue,
            @QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId) {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<BalanceAgeeRecapDTO> rows = buildRecap(tu, searchValue, tiersPayantId);
        Map<String, Object> parameters = reportUtil.officineData(tu);
        parameters.put("P_H_CLT_INFOS", "BALANCE AGEE RECAPITULATIVE");
        String file = reportUtil.buildReport(parameters, "rp_balance_agee_recap", rows);
        return Response.status(Response.Status.FOUND)
                .location(java.net.URI.create(servletRequest.getContextPath() + file)).build();
    }

    // ---------------------------------------------------------------- detail

    private List<BalanceAgeeDetailDTO> buildDetail(TUser user, String searchValue, String tiersPayantId, String dtDebut,
            String dtFin) {
        List<BalanceAgeeDetailDTO> rows = new ArrayList<>();
        try {
            String search = StringUtils.isEmpty(searchValue) ? "" : searchValue;
            String tp = StringUtils.isEmpty(tiersPayantId) ? "%%" : tiersPayantId;
            String debut = StringUtils.isEmpty(dtDebut) ? "" : dtDebut;
            String fin = StringUtils.isEmpty(dtFin) ? "" : dtFin;
            Preenregistrement oPreenregistrement = preenregistrement(user);
            List<EntityData> datas = oPreenregistrement.getBalancePreenregistrementDetails(search, tp, debut, fin);
            for (EntityData data : datas) {
                BalanceAgeeDetailDTO dto = new BalanceAgeeDetailDTO();
                dto.setTiersPayantId(data.getStr_value1());
                dto.setTiersPayant(data.getStr_value2());
                dto.setNbProduits(oPreenregistrement.getTierspayantProduitsVendus(data.getStr_value1(), debut, fin));
                dto.setNbDossiers(parseLong(data.getStr_value3()));
                dto.setMontant(parseLong(data.getStr_value4()));
                rows.add(dto);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return rows;
    }

    private long parseLong(String value) {
        try {
            return Long.parseLong(value);
        } catch (Exception e) {
            return 0L;
        }
    }

    private String[] detailHeaders() {
        return new String[] { "Tiers payant", "Nombre produits vendus", "Nombre dossiers", "Montant" };
    }

    private String detailPeriode(String dtDebut, String dtFin) {
        if (StringUtils.isEmpty(dtDebut) || StringUtils.isEmpty(dtFin)) {
            return "";
        }
        return " du " + dtDebut + " au " + dtFin;
    }

    @GET
    @Path("detail/csv")
    @Produces("text/csv")
    public Response detailCsv(@QueryParam("search_value") String searchValue,
            @QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId, @QueryParam("datedebut") String dtDebut,
            @QueryParam("datefin") String dtFin) throws Exception {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<BalanceAgeeDetailDTO> rows = buildDetail(tu, searchValue, tiersPayantId, dtDebut, dtFin);
        byte[] raw = csvExportService.createCsvReport("Balance âgée détaillée" + detailPeriode(dtDebut, dtFin),
                detailHeaders(), rows, dto -> new String[] { dto.getTiersPayant(), String.valueOf(dto.getNbProduits()),
                        String.valueOf(dto.getNbDossiers()), String.valueOf(dto.getMontant()) });
        return Response.ok(csvExportService.addUtf8Bom(raw))
                .header("Content-Disposition", "attachment; filename=\"balance_agee_detail.csv\"").build();
    }

    @GET
    @Path("detail/excel")
    @Produces("application/vnd.ms-excel")
    public Response detailExcel(@QueryParam("search_value") String searchValue,
            @QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId, @QueryParam("datedebut") String dtDebut,
            @QueryParam("datefin") String dtFin) throws Exception {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<BalanceAgeeDetailDTO> rows = buildDetail(tu, searchValue, tiersPayantId, dtDebut, dtFin);
        byte[] data = reportExcelExportService.createExcelReport(
                "Balance âgée détaillée" + detailPeriode(dtDebut, dtFin), detailHeaders(), rows, (row, dto) -> {
                    int col = 0;
                    row.createCell(col++).setCellValue(dto.getTiersPayant());
                    row.createCell(col++).setCellValue(dto.getNbProduits());
                    row.createCell(col++).setCellValue(dto.getNbDossiers());
                    row.createCell(col++).setCellValue(dto.getMontant());
                });
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"balance_agee_detail.xls\"")
                .build();
    }

    @GET
    @Path("detail/pdf")
    public Response detailPdf(@QueryParam("search_value") String searchValue,
            @QueryParam("lg_TIERS_PAYANT_ID") String tiersPayantId, @QueryParam("datedebut") String dtDebut,
            @QueryParam("datefin") String dtFin) {
        TUser tu = getUser();
        if (tu == null) {
            return Response.ok().entity(ResultFactory.getFailResult(Constant.DECONNECTED_MESSAGE)).build();
        }
        List<BalanceAgeeDetailDTO> rows = buildDetail(tu, searchValue, tiersPayantId, dtDebut, dtFin);
        Map<String, Object> parameters = reportUtil.officineData(tu);
        parameters.put("P_H_CLT_INFOS", ("BALANCE AGEE DETAILLEE" + detailPeriode(dtDebut, dtFin)).toUpperCase());
        String file = reportUtil.buildReport(parameters, "rp_balance_agee_detail", rows);
        return Response.status(Response.Status.FOUND)
                .location(java.net.URI.create(servletRequest.getContextPath() + file)).build();
    }
}
