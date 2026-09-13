package rest;

import bll.Util;
import bll.bllBase;
import bll.entity.EntityData;
import bll.facture.factureManagement;
import bll.preenregistrement.Preenregistrement;
import dal.TFacture;
import dal.TFactureDetail;
import dal.TOfficine;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementDetail;
import dal.TPrivilege;
import dal.TTiersPayant;
import dal.TUser;
import dal.dataManager;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
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
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.report.excel.FactureExcelBuilder;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import toolkits.utils.jdom;
import util.DateConverter;

/**
 * Migration REST des webservices JSP de facturation tiers payant (webservices/sm_user/facturation/ws_data.jsp,
 * ws_data_detail_facture.jsp, ws_data_details_vente.jsp, ws_data_detail_tiers_payant.jsp, ws_transaction.jsp).
 *
 * Toutes les operations deleguent aux MEMES methodes metier bll.facture.factureManagement /
 * bll.preenregistrement.Preenregistrement que les JSP historiques : memes regles, memes messages, memes cles JSON. Le
 * parametre CODEGROUPE de la liste est retire (toujours vide cote metier).
 */
@Path("v1/facture-tiers-payant")
@Produces("application/json")
@Consumes("application/json")
public class FactureTiersPayantRessource {

    private static final Logger LOG = Logger.getLogger(FactureTiersPayantRessource.class.getName());

    @Inject
    private HttpServletRequest servletRequest;

    private TUser utilisateurSession() {
        return (TUser) servletRequest.getSession().getAttribute(commonparameter.AIRTIME_USER);
    }

    private Response reponseDeconnecte() {
        return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                .put("errors", util.Constant.DECONNECTED_MESSAGE).put("total", 0).toString()).build();
    }

    /**
     * Liste des factures : MEME logique que ws_data.jsp, sans le parametre CODEGROUPE (retire de l'API ; la methode
     * metier recoit une chaine vide, comme quand le champ n'etait pas renseigne).
     */
    @GET
    @Path("list")
    public Response list(@DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("lg_FACTURE_ID") String lgFactureId,
            @DefaultValue("") @QueryParam("lg_TYPE_FACTURE_ID") String lgTypeFactureId,
            @DefaultValue("") @QueryParam("lg_customer_id") String lgCustomerId,
            @DefaultValue("") @QueryParam("dt_debut") String dtDebutParam,
            @DefaultValue("") @QueryParam("dt_fin") String dtFinParam,
            @DefaultValue("") @QueryParam("impayes") String impayesParam,
            @DefaultValue("0") @QueryParam("start") int start, @DefaultValue("20") @QueryParam("limit") int limit) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            date key = new date();
            String impayes = StringUtils.isNotEmpty(impayesParam) ? impayesParam : null;
            String lgFACTUREID = StringUtils.isNotEmpty(lgFactureId) ? lgFactureId : "%%";
            String lgTYPEFACTUREID = StringUtils.isNotEmpty(lgTypeFactureId) ? lgTypeFactureId : "%%";
            String lgCUSTOMERID = StringUtils.isNotEmpty(lgCustomerId) ? lgCustomerId : "%%";
            Date dtFin = StringUtils.isNotEmpty(dtFinParam) ? key.stringToDate(dtFinParam, key.formatterMysqlShort)
                    : key.GetNewDate(0);
            Date dtDebut = StringUtils.isNotEmpty(dtDebutParam)
                    ? key.stringToDate(dtDebutParam, key.formatterMysqlShort) : date.getPreviousMonth(0);
            String odateFin = key.DateToString(dtFin, key.formatterMysqlShort2);
            String odateDebut = key.DateToString(dtDebut, key.formatterMysqlShort2);
            dtDebut = key.getDate(odateDebut, "00:00");
            dtFin = key.getDate(odateFin, "23:59");

            odm.initEntityManager();
            factureManagement ofm = new factureManagement(odm, sessionUser);
            List<TFacture> lstTFacture = ofm.getListFacture(searchValue, lgFACTUREID, lgTYPEFACTUREID, dtDebut, dtFin,
                    lgCUSTOMERID, "", impayes, start, limit);
            int count = ofm.getListFacturesCount(searchValue, lgFACTUREID, lgTYPEFACTUREID, dtDebut, dtFin,
                    lgCUSTOMERID, "", impayes);

            List<TPrivilege> lstTPrivilege = (List<TPrivilege>) servletRequest.getSession()
                    .getAttribute(commonparameter.USER_LIST_PRIVILEGE);
            boolean isALLOWED = DateConverter.hasAuthorityById(lstTPrivilege, Util.ACTIONDELETEINVOICE);
            boolean actionReglerFacture = DateConverter.hasAuthorityById(lstTPrivilege, Util.ACTION_REGLER_FACTURE);
            boolean autorisationAvoirFne = DateConverter.hasAuthorityByName(lstTPrivilege, "AUTORISATION_AVOIR_FNE");

            // Dates des appels FNE de la page courante, en une seule requete : elles alimentent les
            // info-bulles "Facture certifiee le ..." / "Avoir FNE effectue le ...".
            List<String> idsFacture = new ArrayList<>();
            for (TFacture of : lstTFacture) {
                idsFacture.add(of.getLgFACTUREID());
            }
            Map<String, Date[]> datesFne = ofm.getDatesFne(idsFacture);

            JSONArray arrayObj = new JSONArray();
            for (TFacture of : lstTFacture) {
                TTiersPayant otp = (TTiersPayant) ofm.getgetOrganisme(of.getLgTYPEFACTUREID().getLgTYPEFACTUREID(),
                        of.getStrCUSTOMER());
                JSONObject json = new JSONObject();
                json.put("fneUrl", of.getFneUrl());
                json.put("fneAvoirReference", of.getFneAvoirReference());
                json.put("fneAvoirUrl", of.getFneAvoirUrl());
                Date[] datesFneFacture = datesFne.get(of.getLgFACTUREID());
                json.put("fneDateCertification", datesFneFacture != null && datesFneFacture[0] != null
                        ? key.DateToString(datesFneFacture[0], key.backabaseUiFormat1) : "");
                json.put("fneDateAvoir", datesFneFacture != null && datesFneFacture[1] != null
                        ? key.DateToString(datesFneFacture[1], key.backabaseUiFormat1) : "");
                json.put("AUTORISATION_AVOIR_FNE", autorisationAvoirFne);
                json.put("lg_FACTURE_ID", of.getLgFACTUREID());
                json.put("str_CODE_FACTURE", of.getStrCODEFACTURE());
                json.put("int_NB_DOSSIER", of.getIntNBDOSSIER());
                json.put("dt_CREATED", key.DateToString(of.getDtDATEFACTURE(), key.formatterShort));
                String statut = of.getStrSTATUT();
                String codeGroupe = "";
                if ("enable".equals(statut)) {
                    codeGroupe = ofm.getGroupeFacturesCodeByFacture(of.getLgFACTUREID());
                    if (codeGroupe != null) {
                        statut = "group";
                    }
                }
                json.put("str_STATUT", statut);
                // Retour du 09/09 : une facture de carnet depot se regle depuis le menu du carnet, jamais ici.
                json.put("carnetDepot", otp != null && Boolean.TRUE.equals(otp.getIsDepot()));
                json.put("lg_TYPE_FACTURE_ID", of.getLgTYPEFACTUREID().getStrLIBELLE());
                json.put("str_CUSTOMER_NAME", otp.getStrFULLNAME());
                json.put("str_PERIODE", "Du " + key.DateToString(of.getDtDEBUTFACTURE(), key.formatterShort) + " Au "
                        + key.DateToString(of.getDtFINFACTURE(), key.formatterShort));
                json.put("dbl_MONTANT_CMDE", of.getDblMONTANTCMDE());
                json.put("dbl_MONTANT_RESTANT", of.getDblMONTANTRESTANT());
                json.put("dbl_MONTANT_PAYE", of.getDblMONTANTPAYE());
                json.put("MONTANTREMISE", of.getDblMONTANTREMISE());
                json.put("MONTANTFORFETAIRE", of.getDblMONTANTFOFETAIRE());
                json.put("MONTANTBRUT", of.getDblMONTANTBrut());
                json.put("str_CUSTOMER", of.getStrCUSTOMER());
                json.put("CODEGROUPE", codeGroupe);
                json.put("lg_TYPE_TIERS_PAYANT_ID", otp.getLgTYPETIERSPAYANTID().getStrLIBELLETYPETIERSPAYANT());
                json.put("isALLOWED", isALLOWED);
                json.put("ACTION_REGLER_FACTURE", actionReglerFacture);
                arrayObj.put(json);
            }
            String result = "{\"total\":\"" + count + " \",\"results\":" + arrayObj.toString() + "}";
            return Response.ok().entity(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "list factures", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Export tableur d'une facture : un VRAI classeur, construit a partir des donnees.
     *
     * Remplace l'export precedent (invoiceServlet?action=exls), qui passait le PDF deja mis en page a JRXlsxExporter :
     * le fichier reproduisait le dessin de la facture en cellules fusionnees, et les montants, deja transformes en
     * texte par le modele Jasper, n'etaient pas des nombres pour Excel - donc ni modifiables, ni sommables, ni
     * triables.
     *
     * Les montants sont lus par les MEMES accesseurs que l'edition PDF : les chiffres du classeur et ceux de la facture
     * ne peuvent pas diverger.
     */
    @GET
    @Path("export-excel/{id}")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportExcel(@PathParam("id") String lgFactureId) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            odm.initEntityManager();
            TFacture facture = odm.getEm().find(TFacture.class, lgFactureId);
            if (facture == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JSONObject().put("success", false)
                                .put("message",
                                        "Facture introuvable : elle a peut-être été supprimée. "
                                                + "Actualisez la liste et recommencez.")
                                .toString())
                        .type(MediaType.APPLICATION_JSON).build();
            }
            byte[] classeur = FactureExcelBuilder.construire(enteteExcel(odm, facture), lignesExcel(odm, facture));
            String nom = "facture_" + StringUtils.defaultIfEmpty(facture.getStrCODEFACTURE(), lgFactureId) + ".xlsx";
            return Response.ok(classeur).header("Content-Disposition", "attachment; filename=\"" + nom + "\"").build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "export excel facture " + lgFactureId, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JSONObject().put("success", false)
                            .put("message",
                                    "L'export tableur a échoué : "
                                            + StringUtils.defaultIfEmpty(e.getMessage(), e.getClass().getSimpleName())
                                            + ". Le détail figure dans le journal du serveur.")
                            .toString())
                    .type(MediaType.APPLICATION_JSON).build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Identification de la facture, reprise en tete du classeur. */
    private FactureExcelBuilder.Entete enteteExcel(dataManager odm, TFacture facture) {
        date key = new date();
        FactureExcelBuilder.Entete entete = new FactureExcelBuilder.Entete();
        TOfficine officine = odm.getEm().find(TOfficine.class, "1");
        entete.officine = officine != null ? StringUtils.defaultString(officine.getStrNOMABREGE()) : "";
        entete.codeFacture = StringUtils.defaultString(facture.getStrCODEFACTURE());
        TTiersPayant tiersPayant = odm.getEm().find(TTiersPayant.class, facture.getStrCUSTOMER());
        entete.tiersPayant = tiersPayant != null ? StringUtils.defaultString(tiersPayant.getStrFULLNAME()) : "";
        entete.periode = "Période du " + key.DateToString(facture.getDtDEBUTFACTURE(), key.formatterShort) + " au "
                + key.DateToString(facture.getDtFINFACTURE(), key.formatterShort);
        if ("avoir".equals(facture.getStrSTATUT())) {
            entete.mentionAvoir = "*** FACTURE ANNULÉE PAR AVOIR FNE"
                    + (facture.getFneAvoirReference() != null ? " (" + facture.getFneAvoirReference() + ")" : "")
                    + " ***";
        }
        return entete;
    }

    /**
     * Une ligne par bon. Les montants sont pris aux MEMES endroits que l'edition PDF (part tiers payant et remise sur
     * le detail de facture, brut et part client sur la vente), pour que les deux documents ne puissent pas differer.
     */
    private List<FactureExcelBuilder.Ligne> lignesExcel(dataManager odm, TFacture facture) {
        List<FactureExcelBuilder.Ligne> lignes = new ArrayList<>();
        List<TFactureDetail> details = odm.getEm()
                .createQuery("SELECT t FROM TFactureDetail t WHERE t.lgFACTUREID.lgFACTUREID = ?1",
                        TFactureDetail.class)
                .setParameter(1, facture.getLgFACTUREID()).getResultList();
        for (TFactureDetail detail : details) {
            TPreenregistrementCompteClientTiersPayent dossier = odm.getEm()
                    .find(TPreenregistrementCompteClientTiersPayent.class, detail.getStrREF());
            if (dossier == null) {
                continue;
            }
            TPreenregistrement vente = dossier.getLgPREENREGISTREMENTID();
            FactureExcelBuilder.Ligne ligne = new FactureExcelBuilder.Ligne();
            ligne.dateBon = dossier.getDtCREATED();
            ligne.refBon = StringUtils.defaultString(dossier.getStrREFBON());
            ligne.nomComplet = (StringUtils.defaultString(vente.getStrFIRSTNAMECUSTOMER()) + " "
                    + StringUtils.defaultString(vente.getStrLASTNAMECUSTOMER())).trim();
            ligne.matricule = StringUtils.defaultString(vente.getStrNUMEROSECURITESOCIAL());
            ligne.refVente = StringUtils.defaultString(vente.getStrREF());
            ligne.taux = dossier.getIntPERCENT();
            ligne.montantBrut = vente.getIntPRICE() != null ? vente.getIntPRICE() : 0L;
            long remise = detail.getDblMONTANTREMISE() != null ? detail.getDblMONTANTREMISE().longValue() : 0L;
            if (remise == 0 && vente.getIntPRICEREMISE() != null) {
                remise = vente.getIntPRICEREMISE();
            }
            ligne.remise = remise;
            ligne.partClient = vente.getIntCUSTPART() != null ? vente.getIntCUSTPART() : 0L;
            ligne.partTiersPayant = detail.getDblMONTANT() != null ? detail.getDblMONTANT().longValue() : 0L;
            lignes.add(ligne);
        }
        // Meme ordre que l'edition PDF : nom du client, ou date du bon selon la fiche du tiers payant.
        TTiersPayant tiersPayant = odm.getEm().find(TTiersPayant.class, facture.getStrCUSTOMER());
        boolean parDate = tiersPayant != null
                && "DATE_BON".equalsIgnoreCase(StringUtils.trimToEmpty(tiersPayant.getStrMODETRIFACTURE()));
        lignes.sort(parDate
                ? Comparator.comparing((FactureExcelBuilder.Ligne l) -> l.dateBon,
                        Comparator.nullsLast(Comparator.naturalOrder()))
                : Comparator.comparing(l -> Normalizer.normalize(l.nomComplet, Normalizer.Form.NFD)
                        .replaceAll("\\p{M}", "").toUpperCase()));
        return lignes;
    }

    /**
     * Detail d'une facture (bordereau) : MEME requete et MEME pagination maison (jdom.int_size_pagination) que
     * ws_data_detail_facture.jsp.
     */
    @GET
    @Path("detail-facture")
    public Response detailFacture(@DefaultValue("") @QueryParam("lg_FACTURE_ID") String lgFactureIdParam,
            @DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("action") String action, @QueryParam("start") String startParam) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            date key = new date();
            String lgFACTUREID = StringUtils.isNotEmpty(lgFactureIdParam) ? lgFactureIdParam : "%%";
            int dataPerPage = jdom.int_size_pagination;
            int pageAsInt = pageDepuisStart(action, startParam, dataPerPage);

            odm.initEntityManager();
            List<dal.TFactureDetail> lstTFactureDetail = odm.getEm().createQuery(
                    "SELECT t FROM TFactureDetail t ,TPreenregistrementCompteClientTiersPayent p  WHERE t.lgFACTUREID.lgFACTUREID = ?1   AND ( p.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME LIKE ?2 OR p.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strLASTNAME LIKE ?3 OR p.lgPREENREGISTREMENTID.strREFBON LIKE ?4 OR p.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strNUMEROSECURITESOCIAL LIKE ?5) AND t.strREF=p.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID  ")
                    .setParameter(1, lgFACTUREID).setParameter(2, searchValue + "%").setParameter(3, searchValue + "%")
                    .setParameter(4, searchValue + "%").setParameter(5, searchValue + "%").getResultList();

            if (dataPerPage > lstTFactureDetail.size()) {
                dataPerPage = lstTFactureDetail.size();
            }
            int pgInt = pageAsInt - 1;
            int pgIntLast;
            if (pgInt == 0) {
                pgIntLast = dataPerPage;
            } else {
                pgIntLast = (lstTFactureDetail.size() - (dataPerPage * (pgInt)));
                pgIntLast = (dataPerPage * (pgInt) + pgIntLast);
                if (pgIntLast > (dataPerPage * (pgInt + 1))) {
                    pgIntLast = dataPerPage * (pgInt + 1);
                }
                pgInt = ((dataPerPage) * (pgInt));
            }

            factureManagement ofm = new factureManagement(odm, sessionUser);
            JSONArray arrayObj = new JSONArray();
            for (int i = pgInt; i < pgIntLast; i++) {
                try {
                    odm.getEm().refresh(lstTFactureDetail.get(i));
                } catch (Exception er) {
                }
                TPreenregistrementCompteClientTiersPayent op = ofm
                        .GetInfoTierspayant(lstTFactureDetail.get(i).getStrREF());
                String strNOM = op.getLgPREENREGISTREMENTID().getStrFIRSTNAMECUSTOMER();
                String strPRENOM = op.getLgPREENREGISTREMENTID().getStrLASTNAMECUSTOMER();
                String strSECURITESOCIAL = op.getLgPREENREGISTREMENTID().getStrNUMEROSECURITESOCIAL();
                JSONObject json = new JSONObject();
                json.put("lg_DOSSIER_FACTURE_ID", op.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());
                json.put("str_NOM", strNOM != null ? strNOM : "");
                json.put("str_PRENOM", strPRENOM != null ? strPRENOM : "");
                json.put("str_SECURITE_SOCIAL", strSECURITESOCIAL != null ? strSECURITESOCIAL : "");
                json.put("str_NUM_DOSSIER", op.getLgPREENREGISTREMENTID().getStrREFBON());
                json.put("lg_PREENREGISTREMENT_ID", op.getLgPREENREGISTREMENTID().getLgPREENREGISTREMENTID());
                json.put("dt_CREATED", key.DateToString(op.getDtCREATED(), key.formatterShort));
                json.put("MONTANTBRUT", op.getIntPRICE());
                long montantRemise = lstTFactureDetail.get(i).getDblMONTANTREMISE().longValue();
                if (montantRemise == 0) {
                    montantRemise = op.getLgPREENREGISTREMENTID().getIntPRICEREMISE();
                }
                json.put("MONTANTREMISE", montantRemise);
                json.put("dbl_MONTANT", lstTFactureDetail.get(i).getDblMONTANT().longValue());
                json.put("str_REF", op.getLgPREENREGISTREMENTID().getStrREF());
                json.put("str_REF_BON", op.getStrREFBON());
                json.put("int_CUST_PART", op.getLgPREENREGISTREMENTID().getIntCUSTPART());
                json.put("int_PERCENT", op.getIntPERCENT());
                json.put("int_PRICE", op.getLgPREENREGISTREMENTID().getIntPRICE());
                json.put("dt_DATE", date.backabaseUiFormat2.format(op.getLgPREENREGISTREMENTID().getDtUPDATED()));
                json.put("dt_HEURE", date.NomadicUiFormatTime.format(op.getLgPREENREGISTREMENTID().getDtUPDATED()));
                json.put("lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID",
                        op.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());
                arrayObj.put(json);
            }
            String result = "{\"total\":\"" + lstTFactureDetail.size() + "\",\"results\":" + arrayObj.toString() + "}";
            return Response.ok().entity(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "detail facture", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /** Details d'une vente : MEME logique que ws_data_details_vente.jsp (accessible en GET comme en POST). */
    @GET
    @Path("details-vente")
    public Response detailsVenteGet(@DefaultValue("") @QueryParam("lg_PREENREGISTREMENT_ID") String preenregistrementId,
            @DefaultValue("") @QueryParam("str_STATUT") String statut) {
        return detailsVente(preenregistrementId, statut);
    }

    @POST
    @Path("details-vente")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response detailsVentePost(@DefaultValue("") @FormParam("lg_PREENREGISTREMENT_ID") String preenregistrementId,
            @DefaultValue("") @FormParam("str_STATUT") String statut) {
        return detailsVente(preenregistrementId, statut);
    }

    private Response detailsVente(String preenregistrementIdParam, String statutParam) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            String strSTATUT = StringUtils.isNotEmpty(statutParam) ? statutParam : commonparameter.statut_is_Process;
            String lgPREENREGISTREMENTID = StringUtils.isNotEmpty(preenregistrementIdParam) ? preenregistrementIdParam
                    : "%%";
            odm.initEntityManager();
            Preenregistrement op = new Preenregistrement(odm, sessionUser);
            List<TPreenregistrementDetail> lst = odm.getEm().createQuery(
                    "SELECT t FROM TPreenregistrementDetail t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1 ORDER BY t.dtCREATED DESC")
                    .setParameter(1, lgPREENREGISTREMENTID).getResultList();
            odm.getEm().find(TPreenregistrement.class, lgPREENREGISTREMENTID);

            JSONArray arrayObj = new JSONArray();
            for (TPreenregistrementDetail detail : lst) {
                try {
                    odm.getEm().refresh(detail);
                } catch (Exception er) {
                }
                JSONObject json = new JSONObject();
                json.put("lg_PREENREGISTREMENT_DETAIL_ID", detail.getLgPREENREGISTREMENTDETAILID());
                json.put("lg_PREENREGISTREMENT_ID", detail.getLgPREENREGISTREMENTID().getLgPREENREGISTREMENTID());
                json.put("str_REF", detail.getLgPREENREGISTREMENTID().getStrREF());
                json.put("lg_FAMILLE_ID", detail.getLgFAMILLEID().getLgFAMILLEID());
                json.put("int_FAMILLE_PRICE", detail.getIntPRICEUNITAIR());
                json.put("str_FAMILLE_NAME", detail.getLgFAMILLEID().getStrNAME());
                json.put("int_QUANTITY", detail.getIntQUANTITY());
                json.put("int_S", detail.getLgFAMILLEID().getIntS());
                json.put("int_T", detail.getLgFAMILLEID().getIntT());
                json.put("int_QUANTITY_SERVED", detail.getIntQUANTITYSERVED());
                json.put("int_PRICE_DETAIL", detail.getIntPRICE());
                json.put("int_CIP", detail.getLgFAMILLEID().getIntCIP());
                json.put("int_EAN13", detail.getLgFAMILLEID().getIntEAN13());
                json.put("dt_CREATED", date.backabaseUiFormat.format(detail.getDtCREATED()));
                arrayObj.put(json);
            }
            int intTotalVente = op.GetVenteTotalwithRemise(lgPREENREGISTREMENTID, strSTATUT);
            Double dblTotalRemise = op.GetAmountRemise(lgPREENREGISTREMENTID, strSTATUT);
            int intTotalProduct = op.GetProductTotal(lgPREENREGISTREMENTID, strSTATUT);

            String result = "{\"total\":\"" + lst.size() + "\",\"results\":" + arrayObj.toString()
                    + ",\"str_MEDECIN\":\"\",\"lg_TYPE_VENTE_ID\":\"\",\"dbl_total_remise\":\"" + dblTotalRemise
                    + "\",\"total_vente\":\"" + intTotalVente + "\",\"int_total_product\": \"" + intTotalProduct
                    + "\"}";
            return Response.ok().entity(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "details vente", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Assiette de facturation de l'ecran Creer (ventes par tiers payant) : MEME logique metier que
     * ws_data_detail_tiers_payant.jsp. Pagination : si l'ecran envoie limit (ExtJS pageSize), le decoupage respecte
     * start/limit — la JSP decoupait toujours par jdom.int_size_pagination, et quand la taille de page de l'ecran (15)
     * differait, la page suivante renvoyait les memes donnees. Sans limit, l'ancien decoupage est conserve.
     */
    @GET
    @Path("assiette")
    public Response assiette(@DefaultValue("") @QueryParam("dt_debut") String dtDebutParam,
            @DefaultValue("") @QueryParam("dt_fin") String dtFinParam,
            @DefaultValue("") @QueryParam("lg_TYPE_TIERS_PAYANT_ID") String lgTypeTiersPayantId,
            @DefaultValue("") @QueryParam("str_CODE_REGROUPEMENT") String strCodeRegroupement,
            @DefaultValue("") @QueryParam("lg_TIERS_PAYANT") String lgTiersPayant,
            @DefaultValue("") @QueryParam("action") String action, @QueryParam("start") String startParam,
            @DefaultValue("0") @QueryParam("limit") int limit,
            @DefaultValue("") @QueryParam("search_value") String searchValue) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        try {
            String dtDebut = StringUtils.isNotEmpty(dtDebutParam) ? dtDebutParam
                    : date.formatterMysqlShort.format(new Date()) + " 23:59";
            String dtFin = StringUtils.isNotEmpty(dtFinParam) ? dtFinParam + " 23:59"
                    : date.formatterMysql.format(new Date());
            String typeTp = StringUtils.isNotEmpty(lgTypeTiersPayantId) ? lgTypeTiersPayantId : "%%";
            String codeRegroupement = StringUtils.isNotEmpty(strCodeRegroupement) ? strCodeRegroupement : "%%";
            String tiersPayant = StringUtils.isNotEmpty(lgTiersPayant) ? lgTiersPayant : "%%";
            int dataPerPage = jdom.int_size_pagination;
            int pageAsInt = pageDepuisStart(action, startParam, dataPerPage);

            odm.initEntityManager();
            factureManagement ofm = new factureManagement(odm, sessionUser);
            List<EntityData> listEntityData = ofm.getVenteTiersPayant(dtDebut, dtFin, codeRegroupement, typeTp,
                    tiersPayant);
            // Recherche de la selection massive : filtre sur le nom du tiers payant, applique
            // en memoire AVANT la pagination (parametre optionnel : sans recherche, liste inchangee)
            if (StringUtils.isNotEmpty(searchValue)) {
                String cherche = searchValue.toLowerCase();
                List<EntityData> filtres = new ArrayList<>();
                for (EntityData ed : listEntityData) {
                    if (ed.getStr_value1() != null && ed.getStr_value1().toLowerCase().contains(cherche)) {
                        filtres.add(ed);
                    }
                }
                listEntityData = filtres;
            }
            double montantTotal = 0;

            int pgInt;
            int pgIntLast;
            if (limit > 0) {
                int startIdx = 0;
                try {
                    if (StringUtils.isNotEmpty(startParam)) {
                        startIdx = Math.max(0, Integer.parseInt(startParam));
                    }
                } catch (NumberFormatException n) {
                }
                pgInt = Math.min(startIdx, listEntityData.size());
                pgIntLast = Math.min(startIdx + limit, listEntityData.size());
            } else {
                if (dataPerPage > listEntityData.size()) {
                    dataPerPage = listEntityData.size();
                }
                pgInt = pageAsInt - 1;
                if (pgInt == 0) {
                    pgIntLast = dataPerPage;
                } else {
                    pgIntLast = (listEntityData.size() - (dataPerPage * (pgInt)));
                    pgIntLast = (dataPerPage * (pgInt) + pgIntLast);
                    if (pgIntLast > (dataPerPage * (pgInt + 1))) {
                        pgIntLast = dataPerPage * (pgInt + 1);
                    }
                    pgInt = ((dataPerPage) * (pgInt));
                }
            }

            JSONArray arrayObj = new JSONArray();
            for (int i = pgInt; i < pgIntLast; i++) {
                JSONObject json = new JSONObject();
                json.put("lg_TIERS_PAYANT_ID", listEntityData.get(i).getStr_value2());
                json.put("str_FULLNAME", listEntityData.get(i).getStr_value1());
                json.put("str_ACOUNT_DOSSIER", listEntityData.get(i).getStr_value3());
                json.put("dbl_MONTANT", listEntityData.get(i).getStr_value4());
                json.put("isChecked", "false");
                arrayObj.put(json);
            }
            String result = "{\"total\":\"" + listEntityData.size() + "\",\"results\":" + arrayObj.toString()
                    + ",\"Montant_total\":" + montantTotal + "}";
            return Response.ok().entity(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "assiette facturation", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Creation des factures tiers payant et suppression d'une facture : MEME logique que ws_transaction.jsp (modes
     * "create facture tiers" et "delete"), y compris le stockage en session des factures a imprimer consomme par
     * ws_rp_print_all_invoices.jsp.
     */
    @POST
    @Path("transaction")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    public Response transaction(@DefaultValue("") @FormParam("mode") String mode,
            @DefaultValue("") @FormParam("MODE_SELECTION") String modeSelection,
            @DefaultValue("") @FormParam("dt_debut") String dtDebutParam,
            @DefaultValue("") @FormParam("dt_fin") String dtFinParam,
            @DefaultValue("") @FormParam("str_CODE_REGROUPEMENT") String strCodeRegroupement,
            @DefaultValue("") @FormParam("lg_TYPE_TIERS_PAYANT_ID") String lgTypeTiersPayantId,
            @DefaultValue("") @FormParam("lg_TIERS_PAYANT") String lgTiersPayant,
            @DefaultValue("") @FormParam("uncheckedList") String uncheckedListParam,
            @DefaultValue("") @FormParam("recordsToSend") String recordsToSend,
            @DefaultValue("") @FormParam("lg_FACTURE_ID") String lgFactureId) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return reponseDeconnecte();
        }
        dataManager odm = new dataManager();
        bllBase obllBase = new bllBase();
        try {
            odm.initEntityManager();
            String dtDebut = StringUtils.isNotEmpty(dtDebutParam) ? dtDebutParam
                    : date.formatterMysqlShort.format(new Date());
            String dtFin = StringUtils.isNotEmpty(dtFinParam) ? dtFinParam + " 23:59:59"
                    : date.formatterMysql.format(new Date());
            String codeRegroupement = StringUtils.isNotEmpty(strCodeRegroupement) ? strCodeRegroupement : "%%";
            String typeTp = StringUtils.isNotEmpty(lgTypeTiersPayantId) ? lgTypeTiersPayantId : "%%";
            String tiersPayant = StringUtils.isNotEmpty(lgTiersPayant) ? lgTiersPayant : "%%";
            String uncheckedList = StringUtils.isNotEmpty(uncheckedListParam) ? uncheckedListParam : "";

            factureManagement ofm = new factureManagement(odm,
                    odm.getEm().find(TUser.class, sessionUser.getLgUSERID()));
            LinkedHashSet<TFacture> invoicesToPrint = new LinkedHashSet<>();

            if ("create facture tiers".equals(mode)) {
                List<EntityData> listEntityData;
                if ("ALL".equals(modeSelection)) {
                    JSONArray array = new JSONArray(uncheckedList);
                    listEntityData = ofm.getVenteTiersPayant(dtDebut, dtFin, codeRegroupement, typeTp, tiersPayant);
                    if (array.length() > 0) {
                        for (int i = 0; i < array.length(); i++) {
                            for (int j = 0; j < listEntityData.size(); j++) {
                                if (listEntityData.get(j).getStr_value2().equals(array.getString(i))) {
                                    listEntityData.remove(j);
                                }
                            }
                        }
                        for (int j = 0; j < listEntityData.size(); j++) {
                            creerFacturesPourTiersPayant(ofm, obllBase, invoicesToPrint,
                                    listEntityData.get(j).getStr_value2(), dtDebut, dtFin);
                        }
                    } else {
                        for (EntityData oEntityData : listEntityData) {
                            creerFacturesPourTiersPayant(ofm, obllBase, invoicesToPrint, oEntityData.getStr_value2(),
                                    dtDebut, dtFin);
                        }
                    }
                } else if ("SELECTED".equals(modeSelection)) {
                    JSONArray array = new JSONArray(uncheckedList);
                    listEntityData = ofm.getVenteTiersPayant(dtDebut, dtFin, codeRegroupement, typeTp, tiersPayant);
                    if (array.length() > 0) {
                        for (EntityData oEntityData : listEntityData) {
                            for (int i = 0; i < array.length(); i++) {
                                if (!oEntityData.getStr_value2().equals(array.getString(i))) {
                                    creerFacturesPourTiersPayant(ofm, obllBase, invoicesToPrint,
                                            oEntityData.getStr_value2(), dtDebut, dtFin);
                                }
                            }
                        }
                    } else {
                        JSONArray arrayselected = new JSONArray(recordsToSend);
                        for (int i = 0; i < arrayselected.length(); i++) {
                            creerFacturesPourTiersPayant(ofm, obllBase, invoicesToPrint, arrayselected.getString(i),
                                    dtDebut, dtFin);
                        }
                    }
                } else if ("OTHERS".equals(modeSelection)) {
                    listEntityData = ofm.getVenteTiersPayant(dtDebut, dtFin, codeRegroupement, typeTp, tiersPayant);
                    for (EntityData oEntityData : listEntityData) {
                        creerFacturesPourTiersPayant(ofm, obllBase, invoicesToPrint, oEntityData.getStr_value2(),
                                dtDebut, dtFin);
                    }
                }
            } else if ("delete".equals(mode)) {
                boolean result = ofm.deleteInvoice(lgFactureId, sessionUser);
                if (result) {
                    obllBase.setMessage(commonparameter.PROCESS_SUCCESS);
                } else {
                    obllBase.setMessage(commonparameter.PROCESS_FAILED);
                    // remonte le motif reel du refus (ex : facture certifiee FNE) au lieu d'un message generique
                    if (ofm.getDetailmessage() != null) {
                        obllBase.setDetailmessage(ofm.getDetailmessage().replace("\"", "'"));
                    }
                }
            }
            servletRequest.getSession().setAttribute("invoicesToPrint", invoicesToPrint);

            String result = "{\"success\":\"" + obllBase.getMessage() + "\", \"errors\": \""
                    + obllBase.getDetailmessage() + "\"}";
            return Response.ok().entity(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "transaction facturation", e);
            // rollback explicite AVANT la fermeture : sinon closeEntityManager detecte une
            // transaction restee ouverte et emet un evenement generique sans le contexte
            try {
                if (odm.getEm() != null && odm.getEm().getTransaction() != null
                        && odm.getEm().getTransaction().isActive()) {
                    odm.getEm().getTransaction().rollback();
                }
            } catch (Exception ignore) {
            }
            // remonte la cause reelle a l'ecran (la JSP historique laissait partir une erreur 500)
            String cause = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            if (e.getCause() != null && e.getCause().getMessage() != null) {
                cause = e.getCause().getMessage();
            }
            // evenement support PRECIS : quelle operation, quels parametres, quelle cause
            String operation = "génération/suppression de factures (mode=" + mode + ", sélection=" + modeSelection
                    + ", période du " + dtDebutParam + " au " + dtFinParam + ", tiers payant=" + lgTiersPayant
                    + ", type TP=" + lgTypeTiersPayantId + ", facture=" + lgFactureId + ")";
            signalerAuSupportFacturation(operation, cause, e);
            return Response.ok().entity(new JSONObject().put("success", commonparameter.PROCESS_FAILED)
                    .put("errors", "Génération impossible : " + cause).toString()).build();
        } finally {
            odm.closeEntityManager();
        }
    }

    /**
     * Incident de facturation transmis au Centre de Support avec l'operation en cours et la cause exacte, pour un
     * depannage direct (l'evenement generique "transaction non cloturee" ne disait pas quelle ecriture avait echoue).
     * Best-effort : ne perturbe jamais la reponse.
     */
    private static void signalerAuSupportFacturation(String operation, String cause, Exception e) {
        try {
            StringBuilder pile = new StringBuilder();
            for (StackTraceElement frame : e.getStackTrace()) {
                pile.append(frame).append('\n');
            }
            rest.service.SupportEventService support = javax.enterprise.inject.spi.CDI.current()
                    .select(rest.service.SupportEventService.class).get();
            rest.service.dto.SupportEventDTO dto = new rest.service.dto.SupportEventDTO();
            dto.setType("JAVA");
            dto.setNiveau("ERROR");
            dto.setModule("FACTURATION");
            dto.setMessageCourt("Echec " + operation + " : " + cause);
            dto.setUrlOuEcran("api/v1/facture-tiers-payant/transaction");
            dto.setPayloadJson("Cause exacte : " + cause);
            dto.setStack(pile.length() > 20000 ? pile.substring(0, 20000) : pile.toString());
            support.record(dto, "");
        } catch (RuntimeException ex) {
            // centre de support indisponible : la trace serveur reste
        }
    }

    /** Bloc commun de creation des factures d'un tiers payant, identique a celui repete dans ws_transaction.jsp. */
    private void creerFacturesPourTiersPayant(factureManagement ofm, bllBase obllBase,
            LinkedHashSet<TFacture> invoicesToPrint, String tiersPayantId, String dtDebut, String dtFin)
            throws Exception {
        List<TPreenregistrementCompteClientTiersPayent> list = ofm.getListVenteTiersPayantBIS(tiersPayantId,
                date.formatterMysqlShort.parse(dtDebut), date.formatterMysql.parse(dtFin), "%%", "%%");
        LinkedList<TFacture> factures = ofm.createInvoices(list, date.formatterMysqlShort.parse(dtDebut),
                date.formatterMysql.parse(dtFin), tiersPayantId);
        if (!factures.isEmpty()) {
            for (TFacture e : factures) {
                invoicesToPrint.add(e);
            }
            obllBase.setMessage(commonparameter.PROCESS_SUCCESS);
        } else {
            obllBase.setMessage(commonparameter.PROCESS_FAILED);
        }
    }

    /** Reproduit la "logic de gestion des page" des JSP historiques : start -> numero de page. */
    private int pageDepuisStart(String action, String startParam, int dataPerPage) {
        int pageAsInt = 0;
        try {
            if (!"filltable".equals(action)) {
                if (startParam != null) {
                    int intPage = Integer.valueOf(startParam);
                    intPage = (intPage / dataPerPage) + 1;
                    pageAsInt = intPage;
                } else {
                    pageAsInt = 1;
                }
            }
        } catch (Exception e) {
        }
        return pageAsInt;
    }

    /**
     * Liste des dossiers en attente de facturation (ex "factures en attente d'edition") : port de
     * webservices/sm_user/journalvente/ws_facture_ententeedition.jsp, MEMES methodes metier
     * bll.preenregistrement.Preenregistrement et MEMES cles JSON. Relogee dans cette classe (au lieu d'une ressource
     * autonome) : sur certains environnements la ressource dediee n'etait pas enregistree par le serveur (404).
     */
    @GET
    @Path("dossiers-en-attente/list")
    public Response dossiersEnAttente(@DefaultValue("") @QueryParam("search_value") String searchValue,
            @DefaultValue("") @QueryParam("dt_Date_Debut") String dtDebutParam,
            @DefaultValue("") @QueryParam("dt_Date_Fin") String dtFinParam,
            @DefaultValue("") @QueryParam("lg_TIERS_PAYANT_ID") String lgTiersPayantId,
            @DefaultValue("") @QueryParam("action") String action, @QueryParam("start") String startParam) {
        TUser sessionUser = utilisateurSession();
        if (sessionUser == null) {
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        }
        dataManager odm = new dataManager();
        try {
            date key = new date();
            Date today = new Date();
            String strDateDebut = StringUtils.isNotEmpty(dtDebutParam) ? dtDebutParam
                    : key.DateToString(today, key.formatterMysqlShort);
            String strDateFin = StringUtils.isNotEmpty(dtFinParam) ? dtFinParam
                    : key.DateToString(today, key.formatterMysqlShort);
            String tiersPayantId = StringUtils.isNotEmpty(lgTiersPayantId) ? lgTiersPayantId : "%%";

            Date dtDateFin = key.stringToDate(strDateFin, key.formatterMysqlShort);
            String odateFin = key.DateToString(dtDateFin, key.formatterMysqlShort2);
            dtDateFin = key.getDate(odateFin, "23:59");
            Date dtDateDebut = key.stringToDate(strDateDebut, key.formatterMysqlShort);
            String odateDebut = key.DateToString(dtDateDebut, key.formatterMysqlShort2);
            dtDateDebut = key.getDate(odateDebut, "00:00");

            odm.initEntityManager();
            Preenregistrement op = new Preenregistrement(odm, sessionUser);
            List<TPreenregistrementCompteClientTiersPayent> lst = op.getListVenteTiersPayant(searchValue, tiersPayantId,
                    dtDateDebut, dtDateFin);
            double totalBon = op.getTotalBon(lst);
            double totalAttenduTp = op.getTotalAttenduParTP(lst);
            int nbreBon = op.getTotalNbreBon(lst);

            int dataPerPage = jdom.int_size_pagination;
            int pageAsInt = 0;
            try {
                if (!"filltable".equals(action)) {
                    if (startParam != null) {
                        pageAsInt = (Integer.parseInt(startParam) / dataPerPage) + 1;
                    } else {
                        pageAsInt = 1;
                    }
                }
            } catch (Exception e) {
            }
            if (dataPerPage > lst.size()) {
                dataPerPage = lst.size();
            }
            int pgInt = pageAsInt - 1;
            int pgIntLast;
            if (pgInt == 0) {
                pgIntLast = dataPerPage;
            } else {
                pgIntLast = (lst.size() - (dataPerPage * (pgInt)));
                pgIntLast = (dataPerPage * (pgInt) + pgIntLast);
                if (pgIntLast > (dataPerPage * (pgInt + 1))) {
                    pgIntLast = dataPerPage * (pgInt + 1);
                }
                pgInt = ((dataPerPage) * (pgInt));
            }

            JSONArray arrayObj = new JSONArray();
            for (int i = pgInt; i < pgIntLast; i++) {
                TPreenregistrementCompteClientTiersPayent pc = lst.get(i);
                JSONObject json = new JSONObject();
                json.put("lg_PREENREGISTREMENT_ID", pc.getLgPREENREGISTREMENTID().getLgPREENREGISTREMENTID());
                json.put("str_DESCRIPTION", pc.getStrREFBON());
                json.put("str_REF", pc.getLgPREENREGISTREMENTID().getStrREF());
                json.put("lg_USER_CAISSIER_ID", pc.getLgPREENREGISTREMENTID().getLgUSERCAISSIERID().getStrFIRSTNAME()
                        + " " + pc.getLgPREENREGISTREMENTID().getLgUSERCAISSIERID().getStrFIRSTNAME());
                json.put("int_PRICE_DETAIL", pc.getLgPREENREGISTREMENTID().getIntPRICE());
                json.put("int_QTEDETAIL", pc.getIntPRICE());
                json.put("dt_CREATED",
                        date.DateToString(pc.getLgPREENREGISTREMENTID().getDtUPDATED(), date.formatterShort));
                json.put("lg_ETAT_ARTICLE_ID",
                        date.DateToString(pc.getLgPREENREGISTREMENTID().getDtUPDATED(), date.NomadicUiFormat_Time));
                json.put("str_DESCRIPTION_PLUS",
                        pc.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME()
                                + " " + pc.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID().getLgCLIENTID()
                                        .getStrLASTNAME());
                json.put("lg_AJUSTEMENTDETAIL_ID", pc.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID()
                        .getLgCLIENTID().getStrNUMEROSECURITESOCIAL());
                json.put("MOUVEMENT",
                        "<span style='display: inline-block;width:15%;'>"
                                + pc.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrNAME()
                                + "</span><span style='display: inline-block;width:10%;'>"
                                + (pc.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getLgTYPETIERSPAYANTID()
                                        .getLgTYPETIERSPAYANTID().equalsIgnoreCase("1") ? "S" : "X")
                                + "</span>");
                json.put("int_NUMBER_AVAILABLE_DECONDITION", totalAttenduTp);
                json.put("int_NUMBERDETAIL", totalBon);
                json.put("int_SEUIL_RESERVE", nbreBon);
                arrayObj.put(json);
            }
            String result = "{\"total\":\"" + lst.size() + " \",\"results\":" + arrayObj.toString() + "}";
            return Response.ok().entity(result).build();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "dossiers en attente de facturation", e);
            return Response.ok().entity(new JSONObject().put("total", 0).put("results", new JSONArray()).toString())
                    .build();
        } finally {
            odm.closeEntityManager();
        }
    }
}
