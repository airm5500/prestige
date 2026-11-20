package rest;

import bll.Util;
import bll.configManagement.GroupeTierspayantController;
import bll.facture.factureManagement;
import dal.TFacture;
import dal.TGroupeFactures;
import dal.TGroupeTierspayant;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TTiersPayant;
import dal.TUser;
import dal.dataManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.DefaultValue;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import util.DateConverter;

/**
 * Migration REST des webservices JSP des groupes tiers payants (webservices/configmanagement/groupe/ws_data.jsp,
 * facture_data.jsp, ws_groupeInvoices.jsp, ws_invoiceDetails.jsp, ws_transaction.jsp).
 *
 * Toutes les operations deleguent aux MEMES methodes metier bll.configManagement.GroupeTierspayantController /
 * bll.facture.factureManagement que les JSP historiques : memes regles, memes messages, memes cles JSON.
 */
@Path("v1/groupe-tierspayant")
@Produces("application/json")
@Consumes("application/json")
public class GroupeTierspayantRessource {

    private static final Logger LOG = Logger.getLogger(GroupeTierspayantRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;

    @javax.ejb.EJB
    private rest.service.ReleveGroupeFactureService releveGroupeFactureService;

    /**
     * Plan du 19/11, point 14 : releve des factures de groupe en Excel, sous-totaux par facture de groupe ou par tiers
     * payant ; memes criteres, memes donnees et memes blocs que le PDF (releveFactureGroupeServlet).
     */
    @GET
    @Path("releve/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response releveExcel(@QueryParam("dt_start") String dtStart, @QueryParam("dt_end") String dtEnd,
            @QueryParam("lg_GROUPE_ID") String groupe, @QueryParam("search_value") String recherche,
            @QueryParam("CODEGROUPE") String codeFacture, @QueryParam("regroupement") String regroupement)
            throws java.io.IOException {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        String debut = StringUtils.isEmpty(dtStart) ? java.time.LocalDate.now().minusYears(1).toString() : dtStart;
        String fin = StringUtils.isEmpty(dtEnd) ? java.time.LocalDate.now().toString() : dtEnd;
        Integer idGroupe = 0;
        try {
            idGroupe = StringUtils.isEmpty(groupe) ? 0 : Integer.valueOf(groupe.trim());
        } catch (NumberFormatException e) {
            idGroupe = 0;
        }
        String mode = rest.service.ModeRegroupement.normaliser(regroupement);
        rest.service.dto.ReleveGroupeFactureDTO d = releveGroupeFactureService.releve(debut, fin, idGroupe, recherche,
                codeFacture, mode);
        java.time.format.DateTimeFormatter f = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String periode = java.time.LocalDate.parse(debut).format(f) + " au " + java.time.LocalDate.parse(fin).format(f);
        byte[] data = rest.report.excel.ReleveGroupeExcel.construire(d, mode, periode);
        return Response.ok(data).header("Content-Disposition", "attachment; filename=\"releve_factures_groupe_"
                + (rest.service.ModeRegroupement.PAR_TIERS_PAYANT.equals(mode) ? "par_tiers_payant" : "par_facture")
                + ".xlsx\"").build();
    }

    private TUser utilisateurSession() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    private Response reponseDeconnecte() {
        return Response.ok()
                .entity(new JSONObject().put("data", new JSONArray()).put("total", 0).put("status", 0).toString())
                .build();
    }

    /**
     * Charge en UNE seule requete les tiers payants references par les factures (au lieu d'un em.find par ligne, qui
     * faisait un aller-retour SQL par facture et ralentissait les listes de plusieurs dizaines de lignes).
     */
    private Map<String, TTiersPayant> chargerTiersPayants(dataManager odm, List<TFacture> factures) {
        Map<String, TTiersPayant> parId = new HashMap<>();
        Set<String> ids = new HashSet<>();
        for (TFacture f : factures) {
            if (StringUtils.isNotEmpty(f.getStrCUSTOMER())) {
                ids.add(f.getStrCUSTOMER());
            }
        }
        if (!ids.isEmpty()) {
            List<TTiersPayant> lst = odm.getEm()
                    .createQuery("SELECT t FROM TTiersPayant t WHERE t.lgTIERSPAYANTID IN :ids", TTiersPayant.class)
                    .setParameter("ids", ids).getResultList();
            for (TTiersPayant t : lst) {
                parId.put(t.getLgTIERSPAYANTID(), t);
            }
        }
        return parId;
    }

    /** Liste des groupes tiers payants : MEME logique que ws_data.jsp. */
    @GET
    @Path("list")
    public Response list(@DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("query") String query, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            String search = "%%";
            if (StringUtils.isNotEmpty(searchValue)) {
                search = searchValue;
            }
            if (StringUtils.isNotEmpty(query)) {
                search = query;
            }
            odm.initEntityManager();
            GroupeTierspayantController groupeCtl = new GroupeTierspayantController(odm.getEmf());
            boolean actionReglerFacture = Util.isAllowed(odm.getEm(), Util.ACTION_REGLER_FACTURE,
                    sessionUser.getTRoleUserCollection().stream().findFirst().get().getLgROLEID().getLgROLEID());
            List<TGroupeTierspayant> list = groupeCtl.findTGroupeTierspayantEntities(limit, start, search);
            int count = groupeCtl.getTGroupeTierspayantCount(search);
            JSONArray arrayObj = new JSONArray();
            for (TGroupeTierspayant obj : list) {
                JSONObject json = new JSONObject();
                json.put("lg_GROUPE_ID", obj.getLgGROUPEID()).put("str_LIBELLE", obj.getStrLIBELLE())
                        .put("str_ADRESSE", obj.getStrADRESSE()).put("str_TELEPHONE", obj.getStrTELEPHONE());
                json.put("str_MODE_TRI_FACTURE",
                        GroupeTierspayantController.normalizeModeTri(obj.getStrMODETRIFACTURE()));
                json.put("ACTION_REGLER_FACTURE", actionReglerFacture);
                arrayObj.put(json);
            }
            return Response.ok().entity(new JSONObject().put("data", arrayObj).put("total", count).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liste groupes tiers payants", e);
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).put("total", 0).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Liste des groupes pour l'ecran de facturation (+ ligne "Tous les groupes") : MEME logique que facture_data.jsp.
     */
    @GET
    @Path("facture-data")
    public Response factureData(@DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("query") String query, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("20") @QueryParam("limit") int limit) {
        dataManager odm = new dataManager();
        try {
            String search = "%%";
            if (StringUtils.isNotEmpty(searchValue)) {
                search = searchValue;
            }
            if (StringUtils.isNotEmpty(query)) {
                search = query;
            }
            odm.initEntityManager();
            GroupeTierspayantController groupeCtl = new GroupeTierspayantController(odm.getEmf());
            List<TGroupeTierspayant> list = groupeCtl.findTGroupeTierspayantEntities(limit, start, search);
            int count = groupeCtl.getTGroupeTierspayantCount(search);
            JSONArray arrayObj = new JSONArray();
            for (TGroupeTierspayant obj : list) {
                JSONObject json = new JSONObject();
                json.put("lg_GROUPE_ID", obj.getLgGROUPEID()).put("str_LIBELLE", obj.getStrLIBELLE())
                        .put("str_ADRESSE", obj.getStrADRESSE()).put("str_TELEPHONE", obj.getStrTELEPHONE());
                arrayObj.put(json);
            }
            if (list.size() > 0) {
                JSONObject json = new JSONObject();
                json.put("lg_GROUPE_ID", -1).put("str_LIBELLE", "Tous les groupes").put("str_ADRESSE", "")
                        .put("str_TELEPHONE", "");
                arrayObj.put(json);
                count++;
            }
            return Response.ok().entity(new JSONObject().put("data", arrayObj).put("total", count).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "facture-data groupes", e);
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).put("total", 0).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Grille des factures de groupe : MEME logique que ws_groupeInvoices.jsp. */
    @GET
    @Path("invoices")
    public Response invoices(@DefaultValue("") @QueryParam("dt_start") String dtStartParam,
            @DefaultValue("") @QueryParam("dt_end") String dtEndParam,
            @DefaultValue("-1") @QueryParam("lg_GROUPE_ID") String lgGroupeIdParam,
            @DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("query") String query,
            @DefaultValue("") @QueryParam("CODEGROUPE") String codeGroupeParam,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            String dtStart = StringUtils.isNotEmpty(dtStartParam) ? dtStartParam
                    : date.formatterMysqlShort.format(date.getPreviousMonth(new Date()));
            String dtEnd = StringUtils.isNotEmpty(dtEndParam) ? dtEndParam
                    : date.formatterMysqlShort.format(new Date());
            int lgGroupeId = -1;
            if (StringUtils.isNotEmpty(lgGroupeIdParam) && !"undefined".equals(lgGroupeIdParam)) {
                try {
                    lgGroupeId = Integer.valueOf(lgGroupeIdParam);
                } catch (NumberFormatException n) {
                }
            }
            String search = "";
            if (StringUtils.isNotEmpty(searchValue)) {
                search = searchValue;
            }
            if (StringUtils.isNotEmpty(query)) {
                search = query;
            }
            String codeGroupe = "";
            if (StringUtils.isNotEmpty(codeGroupeParam) && !"undefined".equals(codeGroupeParam)) {
                codeGroupe = codeGroupeParam;
            }
            odm.initEntityManager();
            GroupeTierspayantController groupeCtl = new GroupeTierspayantController(odm.getEmf());
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            boolean actionReglerFacture = Util.isAllowed(odm.getEm(), Util.ACTION_REGLER_FACTURE,
                    user.getTRoleUserCollection().stream().findFirst().get().getLgROLEID().getLgROLEID());
            JSONArray arrayObj = groupeCtl.getGroupeInvoice(false, dtStart, dtEnd, search, lgGroupeId, codeGroupe,
                    actionReglerFacture, start, limit);
            int count = groupeCtl.getGroupeInvoiceCount(dtStart, dtEnd, search, lgGroupeId, codeGroupe);
            return Response.ok().entity(new JSONObject().put("data", arrayObj).put("total", count).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "factures de groupe", e);
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).put("total", 0).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Sous-factures d'une facture de groupe : MEME logique que ws_invoiceDetails.jsp, avec en plus le filtre optionnel
     * lg_GROUPE_ID (transmis desormais par le front) pour eviter les collisions de codes facture reutilises d'une annee
     * a l'autre.
     */
    @GET
    @Path("invoice-details")
    public Response invoiceDetails(@DefaultValue("") @QueryParam("lgTP") String lgTP,
            @DefaultValue("") @QueryParam("CODEFACTURE") String codeFacture,
            @DefaultValue("") @QueryParam("query") String query,
            @DefaultValue("-1") @QueryParam("lg_GROUPE_ID") String lgGroupeIdParam,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            Integer lgGroupeId = null;
            if (StringUtils.isNotEmpty(lgGroupeIdParam) && !"undefined".equals(lgGroupeIdParam)) {
                try {
                    lgGroupeId = Integer.valueOf(lgGroupeIdParam);
                } catch (NumberFormatException n) {
                }
            }
            odm.initEntityManager();
            GroupeTierspayantController groupeCtl = new GroupeTierspayantController(odm.getEmf());
            List<TFacture> tps = groupeCtl.getGroupeInvoiceDetails(false, query, lgTP, codeFacture, lgGroupeId, start,
                    limit);
            int count = groupeCtl.getGroupeInvoiceDetails(query, lgTP, codeFacture, lgGroupeId);
            Map<String, TTiersPayant> tiersPayants = chargerTiersPayants(odm, tps);
            // Dates des appels FNE de la page, en une seule requete : elles alimentent les info-bulles
            // "Certifiee le ..." / "Avoir FNE emis le ..." des indicateurs d'etat.
            List<String> idsFacture = new ArrayList<>();
            for (TFacture f : tps) {
                idsFacture.add(f.getLgFACTUREID());
            }
            Map<String, Date[]> datesFne = new factureManagement(odm, sessionUser).getDatesFne(idsFacture);
            JSONArray arrayObj = new JSONArray();
            for (TFacture f : tps) {
                TTiersPayant otp = tiersPayants.get(f.getStrCUSTOMER());
                if (otp == null) {
                    otp = odm.getEm().find(TTiersPayant.class, f.getStrCUSTOMER());
                }
                JSONObject json = new JSONObject();
                json.put("lg_FACTURE_ID", f.getLgFACTUREID());
                json.put("str_CODE_FACTURE", f.getStrCODEFACTURE());
                json.put("int_NB_DOSSIER", f.getIntNBDOSSIER());
                json.put("dt_CREATED", date.formatterShort.format(f.getDtDATEFACTURE()));
                json.put("str_STATUT", f.getStrSTATUT());
                json.put("str_CUSTOMER_NAME", otp.getStrFULLNAME());
                json.put("str_PERIODE", "Du " + date.formatterShort.format(f.getDtDEBUTFACTURE()) + " Au "
                        + date.formatterShort.format(f.getDtFINFACTURE()));
                json.put("dbl_MONTANT_CMDE", f.getDblMONTANTCMDE());
                json.put("dbl_MONTANT_RESTANT", f.getDblMONTANTRESTANT());
                json.put("dbl_MONTANT_PAYE", f.getDblMONTANTPAYE());
                json.put("MONTANTREMISE", f.getDblMONTANTREMISE());
                json.put("MONTANTFORFETAIRE", f.getDblMONTANTFOFETAIRE());
                json.put("MONTANTBRUT", f.getDblMONTANTBrut());
                // etat de certification FNE, affiche en clair dans la fenetre des factures du groupe
                json.put("fneUrl", StringUtils.defaultString(f.getFneUrl()));
                json.put("fneAvoirReference", StringUtils.defaultString(f.getFneAvoirReference()));
                Date[] datesFneFacture = datesFne.get(f.getLgFACTUREID());
                json.put("fneDateCertification", datesFneFacture != null && datesFneFacture[0] != null
                        ? date.backabaseUiFormat1.format(datesFneFacture[0]) : "");
                json.put("fneDateAvoir", datesFneFacture != null && datesFneFacture[1] != null
                        ? date.backabaseUiFormat1.format(datesFneFacture[1]) : "");
                json.put("isChecked", false);
                arrayObj.put(json);
            }
            return Response.ok().entity(new JSONObject().put("data", arrayObj).put("total", count).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "sous-factures de groupe", e);
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).put("total", 0).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Factures d'une facture de groupe pour l'ecran de reglement : MEME logique que ws_invoices.jsp (pas de pagination,
     * factures non soldees uniquement).
     */
    @GET
    @Path("invoices-reglement")
    public Response invoicesReglement(@DefaultValue("") @QueryParam("lgTP") String lgTP,
            @DefaultValue("") @QueryParam("CODEFACTURE") String codeFacture,
            @DefaultValue("") @QueryParam("query") String query, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("0") @QueryParam("limit") int limit) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            GroupeTierspayantController groupeCtl = new GroupeTierspayantController(odm.getEmf());
            List<TFacture> toutes = groupeCtl.getGroupeInvoiceDetails(query, codeFacture);
            int count = groupeCtl.getGroupeInvoiceDetailsCount(query, codeFacture);
            // Le decoupage demande par l'ecran (start / limit) etait ignore : toutes les lignes
            // etaient renvoyees a chaque appel. La barre de pagination annoncait donc plusieurs
            // pages qui affichaient toutes le meme contenu. limit <= 0 : aucune limite demandee,
            // on renvoie tout. Le total reste le nombre TOTAL de factures, pas la tranche.
            List<TFacture> tps = toutes.subList(PaginationUtil.debut(start, toutes.size()),
                    PaginationUtil.fin(start, limit, toutes.size()));
            Map<String, TTiersPayant> tiersPayants = chargerTiersPayants(odm, tps);
            JSONArray arrayObj = new JSONArray();
            for (TFacture f : tps) {
                TTiersPayant otp = tiersPayants.get(f.getStrCUSTOMER());
                if (otp == null) {
                    otp = odm.getEm().find(TTiersPayant.class, f.getStrCUSTOMER());
                }
                JSONObject json = new JSONObject();
                json.put("lg_FACTURE_ID", f.getLgFACTUREID());
                json.put("str_CODE_FACTURE", f.getStrCODEFACTURE());
                json.put("int_NB_DOSSIER", f.getIntNBDOSSIER());
                json.put("dt_CREATED", date.formatterShort.format(f.getDtDATEFACTURE()));
                json.put("str_STATUT", f.getStrSTATUT());
                json.put("str_CUSTOMER_NAME", otp.getStrFULLNAME());
                json.put("str_PERIODE", "Du " + date.formatterShort.format(f.getDtDEBUTFACTURE()) + " Au "
                        + date.formatterShort.format(f.getDtFINFACTURE()));
                json.put("dbl_MONTANT_CMDE", f.getDblMONTANTCMDE());
                json.put("dbl_MONTANT_RESTANT", f.getDblMONTANTRESTANT());
                json.put("dbl_MONTANT_PAYE", f.getDblMONTANTPAYE());
                json.put("MONTANTREMISE", f.getDblMONTANTREMISE());
                json.put("MONTANTFORFETAIRE", f.getDblMONTANTFOFETAIRE());
                json.put("MONTANTBRUT", f.getDblMONTANTBrut());
                json.put("MONTANTVERSEE", f.getDblMONTANTRESTANT());
                json.put("MONTANTVIRTUEL", f.getDblMONTANTRESTANT());
                json.put("isChecked", false);
                arrayObj.put(json);
            }
            return Response.ok().entity(new JSONObject().put("data", arrayObj).put("total", count).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "factures reglement de groupe", e);
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).put("total", 0).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Transactions sur les groupes (modes 0 a 8) : MEME logique que ws_transaction.jsp. */
    @POST
    @Path("transaction")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response transaction(@DefaultValue("0") @FormParam("mode") int mode,
            @DefaultValue("0") @FormParam("lg_GROUPE_ID") int lgGroupeId,
            @DefaultValue("") @FormParam("str_LIBELLE") String strLibelle,
            @DefaultValue("") @FormParam("str_ADRESSE") String strAdresse,
            @DefaultValue("") @FormParam("str_TELEPHONE") String strTelephone,
            @DefaultValue("") @FormParam("str_MODE_TRI_FACTURE") String strModeTriFacture,
            @DefaultValue("") @FormParam("listtp") String listtpParam,
            @DefaultValue("") @FormParam("search_value") String searchValue,
            @DefaultValue("") @FormParam("CODEFACTURE") String codeFacture,
            @DefaultValue("") @FormParam("LGFACTURE") String lgFacture,
            @DefaultValue("") @FormParam("MONTANTRESTANT") String montantRestantParam) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            String search = StringUtils.isNotEmpty(searchValue) ? searchValue : "%%";
            String modeTri = StringUtils.isNotEmpty(strModeTriFacture) ? strModeTriFacture : "ALPHABETIQUE";
            Integer montantRestant = 0;
            if (StringUtils.isNotEmpty(montantRestantParam)) {
                montantRestant = Integer.valueOf(montantRestantParam);
            }
            JSONArray listtp = new JSONArray();
            if (StringUtils.isNotEmpty(listtpParam)) {
                listtp = new JSONArray(listtpParam);
            }
            GroupeTierspayantController groupeCtl = new GroupeTierspayantController(odm.getEmf());
            JSONObject data = new JSONObject();
            boolean isOK;
            switch (mode) {
            case 0:
                TGroupeTierspayant gtp = new TGroupeTierspayant();
                gtp.setStrLIBELLE(strLibelle);
                gtp.setStrADRESSE(strAdresse);
                gtp.setStrTELEPHONE(strTelephone);
                gtp.setStrMODETRIFACTURE(GroupeTierspayantController.normalizeModeTri(modeTri));
                isOK = groupeCtl.create(gtp);
                data.put("status", (isOK) ? 1 : 0);
                break;
            case 1:
                isOK = groupeCtl.edit(lgGroupeId, strLibelle, strAdresse, strTelephone, modeTri);
                data.put("status", (isOK) ? 1 : 0);
                break;
            case 2:
                isOK = groupeCtl.destroy(lgGroupeId);
                data.put("status", (isOK) ? 1 : 0);
                break;
            case 3:
                data = groupeCtl.addTiersPayants2Groupe(listtp, lgGroupeId);
                break;
            case 4:
                data = groupeCtl.removeTiersPayants2Groupe(listtp, lgGroupeId);
                break;
            case 5:
                data = groupeCtl.addSelection2Groupe(lgGroupeId, search);
                break;
            case 6:
                data = groupeCtl.removeSelection2Groupe(lgGroupeId, search);
                break;
            case 7:
                factureManagement ofm = new factureManagement(odm, user);
                List<TGroupeFactures> factureses = groupeCtl.getgroupeFacturesByCodeFacture(codeFacture, lgGroupeId);
                // CONTROLE PREALABLE, avant toute suppression : si une seule facture du groupe a
                // deja fait l'objet d'un reglement, on refuse l'operation ENTIERE et on ne touche
                // a rien. Sans ce controle, les factures deja parcourues etaient supprimees puis
                // la suivante refusee : le groupe restait a moitie supprime.
                int dejaReglees = 0;
                for (TGroupeFactures obj : factureses) {
                    if (ofm.factureDejaReglee(obj.getLgFACTURESID().getLgFACTUREID())) {
                        dejaReglees++;
                    }
                }
                if (dejaReglees > 0) {
                    data.put("status", 0);
                    data.put("message",
                            "Suppression impossible : " + dejaReglees + " facture(s) de ce groupe ont déjà fait "
                                    + "l'objet d'un règlement. Annulez d'abord le ou les règlements concernés, "
                                    + "puis relancez la suppression. Aucune facture du groupe n'a été supprimée.");
                    break;
                }
                boolean okDeleted = true;
                for (TGroupeFactures obj : factureses) {
                    if (!ofm.deleteInvoice(obj.getLgFACTURESID().getLgFACTUREID(), user)) {
                        okDeleted = false;
                    }
                }
                data.put("status", okDeleted ? 1 : 0);
                if (!okDeleted && StringUtils.isNotBlank(ofm.getDetailmessage())) {
                    data.put("message", ofm.getDetailmessage());
                }
                break;
            case 8:
                boolean okUpdated = groupeCtl.updateGroupFactureAmount(lgFacture, montantRestant);
                data.put("status", okUpdated ? 1 : 0);
                break;
            default:
                break;
            }
            return Response.ok().entity(data.toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "transaction groupe", e);
            return Response.ok().entity(new JSONObject().put("status", 0).toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Bons d'un groupe tiers payant pour l'ecran Generer facture (option "Par groupes et compagnies d'assurances") :
     * port de configmanagement/groupe/ws_groupe_data.jsp, MEME methode metier getGoupBons, memes cles JSON.
     */
    @GET
    @Path("bons-groupe")
    public Response bonsGroupe(@DefaultValue("0") @QueryParam("lg_GROUPE_ID") int lgGroupeId,
            @DefaultValue("") @QueryParam("dt_start") String dtStartParam,
            @DefaultValue("") @QueryParam("dt_end") String dtEndParam,
            @DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("query") String query, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("15") @QueryParam("limit") int limit) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            String dtStart = StringUtils.isNotEmpty(dtStartParam) ? dtStartParam
                    : date.formatterMysqlShort.format(new Date());
            String dtEnd = StringUtils.isNotEmpty(dtEndParam) ? dtEndParam
                    : date.formatterMysqlShort.format(new Date());
            String search = StringUtils.isNotEmpty(query) ? query : searchValue;
            odm.initEntityManager();
            GroupeTierspayantController groupeCtl = new GroupeTierspayantController(odm.getEmf());
            JSONArray arrayObj = groupeCtl.getGoupBons(false, dtStart, dtEnd, lgGroupeId,
                    StringUtils.defaultString(search), start, limit);
            int count = groupeCtl.getGoupBons(dtStart, dtEnd, lgGroupeId, StringUtils.defaultString(search));
            return Response.ok().entity(new JSONObject().put("data", arrayObj).put("total", count).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "bons du groupe", e);
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).put("total", 0).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Generation des factures d'un groupe tiers payant : port de configmanagement/groupe/ws_facturation.jsp (MEME
     * methode metier generateGroupeFacture, meme cle JSON "status" et meme depot en session des factures a imprimer).
     */
    @POST
    @Path("facturation-groupe")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response facturationGroupe(@DefaultValue("0") @FormParam("MODE_SELECTION") int modeSelection,
            @DefaultValue("0") @FormParam("lg_GROUPE_ID") int lgGroupeId,
            @DefaultValue("") @FormParam("dt_start") String dtStartParam,
            @DefaultValue("") @FormParam("dt_end") String dtEndParam,
            @DefaultValue("") @FormParam("listProductSelected") String listProductSelectedParam,
            @DefaultValue("") @FormParam("unselectedrecords") String unselectedrecordsParam) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            String dtStart = StringUtils.isNotEmpty(dtStartParam) ? dtStartParam
                    : date.formatterMysqlShort.format(new Date());
            String dtEnd = StringUtils.isNotEmpty(dtEndParam) ? dtEndParam : dtStart;
            JSONArray listProductSelected = StringUtils.isNotEmpty(listProductSelectedParam)
                    ? new JSONArray(listProductSelectedParam) : new JSONArray();
            JSONArray unselectedrecords = StringUtils.isNotEmpty(unselectedrecordsParam)
                    ? new JSONArray(unselectedrecordsParam) : new JSONArray();

            odm.initEntityManager();
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            GroupeTierspayantController groupeCtl = new GroupeTierspayantController(odm.getEmf());
            Map<String, LinkedHashSet<TFacture>> grfact = groupeCtl.generateGroupeFacture(dtStart, dtEnd, lgGroupeId,
                    listProductSelected, unselectedrecords, modeSelection, user);
            int success = grfact != null ? grfact.size() : 0;
            if (success > 0) {
                servletRequest.getSession().setAttribute("groupeinvoicesToPrint", grfact);
            }
            return Response.ok().entity(new JSONObject().put("status", success).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "generation factures de groupe", e);
            String cause = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return Response.ok().entity(
                    new JSONObject().put("status", 0).put("message", "Génération impossible : " + cause).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Bons d'un tiers payant pour l'ecran Generer facture (option "Par Selection de bons") : port de
     * configmanagement/groupe/ws_allbons.jsp, MEMES methodes metier findAllBons / allBonsCount, memes cles JSON.
     */
    @GET
    @Path("tous-bons")
    public Response tousBons(@DefaultValue("") @QueryParam("lg_TIERS_PAYANT_ID") String lgTiersPayantId,
            @DefaultValue("") @QueryParam("dt_start") String dtStartParam,
            @DefaultValue("") @QueryParam("dt_end") String dtEndParam,
            @DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("query") String query, @DefaultValue("0") @QueryParam("start") int start,
            @DefaultValue("15") @QueryParam("limit") int limit) {
        if (utilisateurSession() == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            String dtStart = StringUtils.isNotEmpty(dtStartParam) ? dtStartParam
                    : date.formatterMysqlShort.format(new Date());
            String dtEnd = StringUtils.isNotEmpty(dtEndParam) ? dtEndParam
                    : date.formatterMysqlShort.format(new Date());
            String search = StringUtils.isNotEmpty(query) ? query : searchValue;
            odm.initEntityManager();
            GroupeTierspayantController groupeCtl = new GroupeTierspayantController(odm.getEmf());
            List<TPreenregistrementCompteClientTiersPayent> lis = groupeCtl.findAllBons(false, dtStart, dtEnd, start,
                    limit, StringUtils.defaultString(lgTiersPayantId), StringUtils.defaultString(search));
            int count = groupeCtl.allBonsCount(dtStart, dtEnd, StringUtils.defaultString(lgTiersPayantId),
                    StringUtils.defaultString(search));
            JSONArray arrayObj = new JSONArray();
            for (TPreenregistrementCompteClientTiersPayent obj : lis) {
                JSONObject json = new JSONObject();
                json.put("lg_PCMT_ID", obj.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());
                json.put("REFBON", obj.getStrREFBON());
                json.put("AMOUNT", obj.getIntPRICE());
                json.put("AMOUNT_VENTE", obj.getLgPREENREGISTREMENTID().getIntPRICE());
                try {
                    json.put("CLIENT_FULLNAME", obj.getLgPREENREGISTREMENTID().getClient().getStrFIRSTNAME() + " "
                            + obj.getLgPREENREGISTREMENTID().getClient().getStrLASTNAME());
                } catch (Exception ignore) {
                }
                json.put("DATE_VENTE",
                        DateConverter.convertDateToDD_MM_YYYY_HH_mm(obj.getLgPREENREGISTREMENTID().getDtUPDATED()));
                json.put("isChecked", false);
                arrayObj.put(json);
            }
            return Response.ok().entity(new JSONObject().put("data", arrayObj).put("total", count).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "tous les bons", e);
            return Response.ok().entity(new JSONObject().put("data", new JSONArray()).put("total", 0).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Generation des factures a partir de bons selectionnes : port de configmanagement/groupe/ws_selectedBons.jsp (MEME
     * methode metier generateFacture, meme cle JSON "status", meme depot en session des factures a imprimer).
     */
    @POST
    @Path("facturation-bons")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response facturationBons(@DefaultValue("0") @FormParam("MODE_SELECTION") int modeSelection,
            @DefaultValue("") @FormParam("lg_TIERS_PAYANT_ID") String lgTiersPayantId,
            @DefaultValue("") @FormParam("dt_start") String dtStartParam,
            @DefaultValue("") @FormParam("dt_end") String dtEndParam,
            @DefaultValue("") @FormParam("listProductSelected") String listProductSelectedParam,
            @DefaultValue("") @FormParam("unselectedrecords") String unselectedrecordsParam) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            String dtStart = StringUtils.isNotEmpty(dtStartParam) ? dtStartParam
                    : date.formatterMysqlShort.format(new Date());
            String dtEnd = StringUtils.isNotEmpty(dtEndParam) ? dtEndParam : dtStart;
            JSONArray listProductSelected = StringUtils.isNotEmpty(listProductSelectedParam)
                    ? new JSONArray(listProductSelectedParam) : new JSONArray();
            JSONArray unselectedrecords = StringUtils.isNotEmpty(unselectedrecordsParam)
                    ? new JSONArray(unselectedrecordsParam) : new JSONArray();

            odm.initEntityManager();
            TUser user = odm.getEm().find(TUser.class, sessionUser.getLgUSERID());
            GroupeTierspayantController groupeCtl = new GroupeTierspayantController(odm.getEmf());
            Set<TFacture> grfact = groupeCtl.generateFacture(dtStart, dtEnd, unselectedrecords, listProductSelected,
                    StringUtils.defaultString(lgTiersPayantId), modeSelection, user);
            int success = grfact != null ? grfact.size() : 0;
            if (success > 0) {
                servletRequest.getSession().setAttribute("invoicesToPrint", grfact);
            }
            return Response.ok().entity(new JSONObject().put("status", success).toString()).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "generation factures par selection de bons", e);
            String cause = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return Response.ok().entity(
                    new JSONObject().put("status", 0).put("message", "Génération impossible : " + cause).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }
}
