/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package controller;

import bll.common.Parameter;
import bll.entity.EntityData;
import bll.preenregistrement.Preenregistrement;
import bll.report.JournalVente;
import bll.report.JsonDataSourceApp;
import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TBonLivraisonDetail_;
import dal.TBonLivraison_;
import dal.TCashTransaction;
import dal.TCashTransaction_;
import dal.TCodeTva;
import dal.TFamille;
import dal.TOfficine;
import dal.TOrder;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClient;
import dal.TPreenregistrementCompteClient_;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrementDetail_;
import dal.TPreenregistrement_;
import dal.TRecettes;
import dal.TReglement;
import dal.TUser;
import dal.dataManager;
import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.persistence.criteria.Subquery;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import net.sf.jasperreports.engine.JRException;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import report.reportManager;
import toolkits.parameters.commonparameter;
import toolkits.utils.conversion;
import toolkits.utils.date;
import toolkits.utils.jdom;
import toolkits.utils.logger;

/**
 *
 * @author user
 */
@WebServlet(name = "MyBean", urlPatterns = { "/myBean" })
public class MyBean extends HttpServlet {

    private final static Logger LOGGER = Logger.getLogger(MyBean.class.getName());
    TUser OTUser = null;
    dataManager OdataManager = null;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException, JSONException, JRException {
        OdataManager = new dataManager();
        OdataManager.initEntityManager();
        response.setContentType("application/json;charset=UTF-8");
        HttpSession session = request.getSession();
        OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
        String dt_start = LocalDate.now().toString(), dt_end = dt_start;
        String action = "";
        TOfficine oTOfficine = OdataManager.getEm().find(dal.TOfficine.class, "1");
        DateFormat DATEFORMAT = new SimpleDateFormat("HH_mm_ss");
        String P_FOOTER_RC = "", fileName;
        JsonDataSourceApp app;
        Map<String, Object> parameters = new HashMap();
        if (request.getParameter("action") != null) {
            action = request.getParameter("action");
        }

        if (request.getParameter("dt_start") != null && !"".equals(request.getParameter("dt_start"))) {
            dt_start = request.getParameter("dt_start");

        }

        if (request.getParameter("dt_end") != null && !"".equals(request.getParameter("dt_end"))) {
            dt_end = request.getParameter("dt_end");
        }
        String P_H_CLT_INFOS = "";
        String empl = OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        JSONArray array = null;
        JSONArray arrayObj = new JSONArray();
        JSONObject data = new JSONObject();
        try (PrintWriter out = response.getWriter()) {
            switch (action) {
            case "tva":

                array = getTvaDatas(dt_start, dt_end);
                data.put("data", array);
                data.put("total", array.length());
                out.println(data);
                break;
            case "tvapdf":
                String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
                String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();
                String au = " au " + LocalDate.parse(dt_end).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                String du = LocalDate.parse(dt_start).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                if (!dt_start.equals(dt_end)) {
                    parameters.put("P_H_CLT_INFOS", "Statistiques des\n Résultats par Taux de TVA du " + du + au);

                } else {
                    parameters.put("P_H_CLT_INFOS", "Statistiques des\n Résultats par Taux de TVA du " + du);
                }

                String P_H_LOGO = jdom.scr_report_file_logo;

                parameters.put("P_H_LOGO", P_H_LOGO);
                parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);

                parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
                parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());

                if (oTOfficine.getStrREGISTRECOMMERCE() != null) {
                    P_FOOTER_RC += "RC N° " + oTOfficine.getStrREGISTRECOMMERCE();
                }

                if (oTOfficine.getStrCOMPTECONTRIBUABLE() != null) {
                    P_FOOTER_RC += " - CC N° " + oTOfficine.getStrCOMPTECONTRIBUABLE();
                }
                if (oTOfficine.getStrREGISTREIMPOSITION() != null) {
                    P_FOOTER_RC += " - Régime d'Imposition " + oTOfficine.getStrREGISTREIMPOSITION();
                }
                if (oTOfficine.getStrCENTREIMPOSITION() != null) {
                    P_FOOTER_RC += " - Centre des Impôts: " + oTOfficine.getStrCENTREIMPOSITION();
                }

                if (oTOfficine.getStrPHONE() != null) {
                    String finalphonestring = oTOfficine.getStrPHONE() != null
                            ? "- Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
                    if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
                        String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
                        for (String va : phone) {
                            finalphonestring += " / " + conversion.PhoneNumberFormat(va);
                        }
                    }
                    P_INSTITUTION_ADRESSE += " -  " + finalphonestring;
                }
                if (oTOfficine.getStrCOMPTEBANCAIRE() != null) {
                    P_INSTITUTION_ADRESSE += " - Compte Bancaire: " + oTOfficine.getStrCOMPTEBANCAIRE();
                }
                if (oTOfficine.getStrNUMCOMPTABLE() != null) {
                    P_INSTITUTION_ADRESSE += " - CPT N°: " + oTOfficine.getStrNUMCOMPTABLE();
                }
                parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
                parameters.put("P_FOOTER_RC", P_FOOTER_RC);

                JSONArray _array = getTvaDatasReport(dt_start, dt_end);
                JSONObject _data = new JSONObject();
                _data.put("root", _array);
                app = new JsonDataSourceApp();
                fileName = "rp_resultat_tva_" + DATEFORMAT.format(new Date()) + ".pdf";
                app.fill(parameters, _data, jdom.scr_report_file + "rp_tva.jrxml", fileName);

                response.sendRedirect(request.getContextPath() + "/data/reports/pdf/" + fileName);
                break;

            case "balance":
                try {
                    TParameters KEY_TAKE_INTO_ACCOUNT = OdataManager.getEm().getReference(TParameters.class,
                            "KEY_TAKE_INTO_ACCOUNT");
                    System.out.println("KEY_TAKE_INTO_ACCOUNT------->>>    " + KEY_TAKE_INTO_ACCOUNT);

                    if (KEY_TAKE_INTO_ACCOUNT != null
                            && (Integer.valueOf(KEY_TAKE_INTO_ACCOUNT.getStrVALUE().trim()) == 1)) {

                        array = getBalanceExclude(dt_start, dt_end, empl);

                    } else {
                        array = getBalance(dt_start, dt_end, empl);
                    }
                } catch (Exception e) {
                }
                if (array != null && array.length() > 1) {
                    JSONObject totaux = array.getJSONObject((array.length() - 1));
                    for (int idx = 0; idx < (array.length() - 1); idx++) {
                        try {
                            JSONObject o = array.getJSONObject(idx);

                            double mnt = o.getInt("VENTE_NET");
                            double percent = (mnt * 100) / totaux.getInt("GLOBAL");
                            Integer pm = ((Long) Math
                                    .round(Double.valueOf(totaux.getInt("GLOBAL")) / totaux.getInt("NB"))).intValue();
                            o.put("POURCENTAGE", Math.round(percent)).put("TOTALVENTE", totaux.getInt("GLOBAL"))
                                    .put("TOTALMARGE", totaux.getLong("TOTALMARGE"))
                                    .put("TOTALRATIO", totaux.getDouble("TOTALRATIO"))
                                    .put("TOTALACHAT", totaux.getLong("TOTALACHAT")).put("VENTE_NET_BIS", pm);

                            arrayObj.put(o);
                        } catch (Exception e) {

                        }

                    }
                }
                data.put("data", arrayObj);
                data.put("total", arrayObj.length());
                out.println(data);
                break;

            case "balancepdf":
                try {
                    TParameters KEY_TAKE_INTO_ACCOUNT = OdataManager.getEm().getReference(TParameters.class,
                            "KEY_TAKE_INTO_ACCOUNT");
                    if (KEY_TAKE_INTO_ACCOUNT != null
                            && (Integer.valueOf(KEY_TAKE_INTO_ACCOUNT.getStrVALUE().trim()) == 1)) {

                        array = getBalanceExclude(dt_start, dt_end, empl);

                    } else {
                        array = getBalance(dt_start, dt_end, empl);
                    }
                } catch (Exception e) {
                }

                date key = new date();
                String lg_TYPE_REGLEMENT_ID = "%%", lg_EMPLACEMENT_ID = "%%";
                int VENTE_BRUT = 0, TOTAL_REMISE = 0, VENTE_NET = 0, TOTAL_GLOBAL = 0, NB = 0;
                String P_VENTEDEPOT_LABEL = "Ventes aux dépôts extensions",
                        P_REGLEMENTDEPOT_LABEL = "Règlement des ventes des dépôts";
                double P_VO_PERCENT = 0d, P_VNO_PERCENT = 0d, P_VENTEDEPOT_ESPECE = 0d, P_VENTEDEPOT_CHEQUES = 0d,
                        P_VENTEDEPOT_CB = 0d, P_TOTAL_VENTEDEPOT_CAISSE = 0d, P_REGLEMENTDEPOT_ESPECE = 0d,
                        P_REGLEMENTDEPOT_CHEQUES = 0d, P_REGLEMENTDEPOT_CB = 0d, P_TOTAL_REGLEMENTDEPOT_CAISSE = 0d;
                // Double P_SORTIECAISSE_ESPECE_FALSE = 0d;
                int TOTALBRUT = 0, TOTALNET = 0, P_TOTAL_REMISE = 0, P_TOTAL_PANIER = 0, TOTAL_REMISEVNO = 0,
                        P_TOTAL_ESPECE = 0, P_TOTAL_CHEQUES = 0, P_TOTAL_CARTEBANCAIRE = 0, P_TOTAL_TIERSPAYANT = 0,
                        P_AMOUNT_VO_TIERESPAYANT = 0, P_VO_PANIER_MOYEN = 0, P_AMOUNT_VO_ESPECE = 0,
                        P_AMOUNT_VO_CHEQUE = 0, P_AMOUNT_VO_CARTEBANCAIRE = 0, P_AMOUNT_VO_DIFFERE = 0,
                        P_TOTAL_AVOIR = 0;
                JournalVente OjournalVente = new JournalVente(OdataManager, OTUser);

                List<EntityData> listTMvtCaisses = OjournalVente.getAllMouvmentsCaisse(dt_start, dt_end);
                List<EntityData> listTDataInDepot = OjournalVente.getListeVenteInDepotForBalanceVenteCaisse(dt_start,
                        dt_end, lg_TYPE_REGLEMENT_ID, lg_EMPLACEMENT_ID);

                reportManager OreportManager = new reportManager();
                String scr_report_file = "rp_balancevente_caissev2";
                // String scr_report_file = "rp_liste_retrocession_final";
                String report_generate_file = key.GetNumberRandom();

                report_generate_file = report_generate_file + ".pdf";
                OreportManager.setPath_report_src(jdom.scr_report_file + scr_report_file + ".jrxml");
                OreportManager.setPath_report_pdf(jdom.scr_report_pdf + "balancevente_caisse" + report_generate_file);

                new logger().OCategory.info("Dans edition scr_report_file " + scr_report_file);
                int count = 0;
                Integer VENTE_BRUT_VNO = 0, P_AMOUNT_VNO_ESPECE = 0, NBVNO = 0, VENTE_VNONET = 0,
                        P_AMOUNT_VNO_CARTEBANCAIRE = 0, P_AMOUNT_VNO_DIFFERE = 0, TOTAL_VNOREMISE = 0,
                        P_VNO_PANIER_MOYEN = 0, P_AMOUNT_VNO_CHEQUE = 0;
                if (array.length() > 1) {
                    JSONObject totaux = array.getJSONObject((array.length() - 1));
                    TOTAL_GLOBAL = totaux.getInt("GLOBAL");
                    P_TOTAL_PANIER = ((Long) Math.round(Double.valueOf(totaux.getInt("GLOBAL")) / totaux.getInt("NB")))
                            .intValue();
                    for (int idx = 0; idx < (array.length() - 1); idx++) {

                        try {
                            JSONObject o = array.getJSONObject(idx);
                            TOTALBRUT += o.getInt("VENTE_BRUT");
                            P_TOTAL_REMISE += o.getInt("TOTAL_REMISE");
                            TOTALNET += o.getInt("VENTE_NET");
                            if ("VO".equals(o.getString("str_TYPE_VENTE"))) {
                                VENTE_BRUT = o.getInt("VENTE_BRUT");
                                VENTE_NET = o.getInt("VENTE_NET");
                                NB = o.getInt("NB");

                                TOTAL_REMISE = o.getInt("TOTAL_REMISE");
                                double mnt = o.getInt("VENTE_NET");
                                double percent = (mnt * 100) / totaux.getInt("GLOBAL");
                                P_VO_PERCENT = Math.round(percent);
                                P_AMOUNT_VO_TIERESPAYANT = o.getInt("PART_TIERSPAYANT");
                                P_VO_PANIER_MOYEN = o.getInt("PANIER_MOYEN");
                                P_AMOUNT_VO_ESPECE = o.getInt("TOTAL_ESPECE");
                                P_AMOUNT_VO_CHEQUE = o.getInt("TOTAL_CHEQUE");
                                P_AMOUNT_VO_CARTEBANCAIRE = o.getInt("TOTAL_CARTEBANCAIRE");
                                P_AMOUNT_VO_DIFFERE = o.getInt("TOTAL_DIFFERE");

                            } else {
                                TOTAL_REMISEVNO = o.getInt("TOTAL_REMISE");
                                double mnt = o.getInt("VENTE_NET");
                                double percent = (mnt * 100) / totaux.getInt("GLOBAL");
                                P_VNO_PERCENT = Math.round(percent);

                                P_VNO_PANIER_MOYEN = o.getInt("PANIER_MOYEN");
                                P_AMOUNT_VNO_ESPECE = o.getInt("TOTAL_ESPECE");
                                P_AMOUNT_VNO_CHEQUE = o.getInt("TOTAL_CHEQUE");
                                P_AMOUNT_VNO_CARTEBANCAIRE = o.getInt("TOTAL_CARTEBANCAIRE");
                                P_AMOUNT_VNO_DIFFERE = o.getInt("TOTAL_DIFFERE");
                                VENTE_BRUT_VNO = o.getInt("VENTE_BRUT");
                                VENTE_VNONET = o.getInt("VENTE_NET");
                                NBVNO = o.getInt("NB");

                            }
                            count += o.getInt("NB");
                            P_TOTAL_AVOIR += o.getInt("TOTAL_DIFFERE");

                            P_TOTAL_ESPECE += o.getInt("TOTAL_ESPECE");
                            P_TOTAL_CHEQUES += o.getInt("TOTAL_CHEQUE");
                            P_TOTAL_CARTEBANCAIRE += o.getInt("TOTAL_CARTEBANCAIRE");
                            P_TOTAL_TIERSPAYANT += o.getInt("PART_TIERSPAYANT");
                        } catch (Exception e) {
                            e.printStackTrace();
                        }

                    }
                }

                P_H_CLT_INFOS = "BALANCE VENTE/CAISSE             DU "
                        + date.formatterShort.format(java.sql.Date.valueOf(dt_start)) + " AU "
                        + date.formatterShort.format(java.sql.Date.valueOf(dt_end));

                parameters.put("P_EMPLACEMENT", OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());

                parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);

                parameters.put("P_TYPE_VENTE", "%%");

                parameters.put("P_VO_PERCENT", Math.round(P_VO_PERCENT));

                parameters.put("P_AMOUNT_REMISE_VO", conversion.AmountFormat(TOTAL_REMISE, ' '));
                parameters.put("P_VENTE_NET_VO", conversion.AmountFormat(VENTE_NET, ' '));
                parameters.put("P_AMOUNT_BRUT_VO", conversion.AmountFormat(VENTE_BRUT, ' '));
                parameters.put("P_NB_VO", conversion.AmountFormat(NB, ' '));
                parameters.put("P_AMOUNT_VO_TIERESPAYANT", conversion.AmountFormat(P_AMOUNT_VO_TIERESPAYANT, ' '));

                parameters.put("P_VO_PANIER_MOYEN", conversion.AmountFormat(P_VO_PANIER_MOYEN, ' '));

                parameters.put("P_AMOUNT_VO_ESPECE", conversion.AmountFormat(P_AMOUNT_VO_ESPECE, ' '));
                parameters.put("P_AMOUNT_VO_CHEQUE", conversion.AmountFormat(P_AMOUNT_VO_CHEQUE, ' '));
                parameters.put("P_AMOUNT_VO_CARTEBANCAIRE", conversion.AmountFormat(P_AMOUNT_VO_CARTEBANCAIRE, ' '));
                parameters.put("P_AMOUNT_VO_DIFFERE", conversion.AmountFormat(P_AMOUNT_VO_DIFFERE, ' '));

                parameters.put("P_VENTE_NET_AVOIR", "0");
                parameters.put("P_NB_AVOIR", "0");
                parameters.put("P_VO_PANIER_AVOIR", "0");
                parameters.put("P_AVOIR_", "0");
                parameters.put("P_AMOUNT_AVOIR_ESPECE", "0");
                parameters.put("P_AMOUNT_AVOIR_CHEQUE", "0");
                parameters.put("P_AMOUNT_AVOIR_CARTEBANCAIRE", "0");
                parameters.put("P_AMOUNT_AVOIR_DIFFERE", "0");
                parameters.put("P_AMOUNT_BRUT_AVOIR", "0");
                parameters.put("P_AMOUNT_AVOIR_TIERESPAYANT", "0");
                parameters.put("P_AMOUNT_AVOIR_VO", "0");

                parameters.put("P_AMOUNT_BRUT_VNO", conversion.AmountFormat(VENTE_BRUT_VNO, ' '));
                parameters.put("P_VENTE_NET_VNO", conversion.AmountFormat(VENTE_VNONET, ' '));
                parameters.put("P_AMOUNT_VNO_ESPECE", conversion.AmountFormat(P_AMOUNT_VNO_ESPECE, ' '));

                parameters.put("P_NB_VNO", conversion.AmountFormat(NBVNO, ' '));
                parameters.put("P_AMOUNT_REMISE_VNO", conversion.AmountFormat(TOTAL_REMISEVNO, ' '));
                parameters.put("P_AMOUNT_VNO_TIERSPAYANT", "0");
                parameters.put("P_VNO_PANIER_MOYEN", conversion.AmountFormat(P_VNO_PANIER_MOYEN, ' '));
                // parameters.put("P_AMOUNT_VNO_DIFFERE", "0");
                parameters.put("P_AMOUNT_AVOIR_TIERSPAYANT", "0");
                parameters.put("P_AMOUNT_REMISE_AVOIR", "0");

                parameters.put("P_AMOUNT_VNO_CHEQUE", conversion.AmountFormat(P_AMOUNT_VNO_CHEQUE, ' '));
                parameters.put("P_AMOUNT_VNO_CARTEBANCAIRE", conversion.AmountFormat(P_AMOUNT_VNO_CARTEBANCAIRE, ' '));
                parameters.put("P_AMOUNT_VNO_DIFFERE", conversion.AmountFormat(P_AMOUNT_VNO_DIFFERE, ' '));

                parameters.put("P_NB", conversion.AmountFormat(count, ' '));
                parameters.put("P_TOTAL_BRUT", conversion.AmountFormat(TOTALBRUT, ' '));
                parameters.put("P_TOTAL_NET", conversion.AmountFormat(TOTALNET, ' '));
                parameters.put("P_TOTAL_REMISE", conversion.AmountFormat(P_TOTAL_REMISE, ' '));

                parameters.put("P_TOTAL_PANIER", conversion.AmountFormat(P_TOTAL_PANIER, ' '));
                parameters.put("P_TOTAL_ESPECE", conversion.AmountFormat(P_TOTAL_ESPECE, ' '));
                parameters.put("P_TOTAL_CHEQUES", conversion.AmountFormat(P_TOTAL_CHEQUES, ' '));
                parameters.put("P_TOTAL_CARTEBANCAIRE", conversion.AmountFormat(P_TOTAL_CARTEBANCAIRE, ' '));
                parameters.put("P_TOTAL_TIERSPAYANT", conversion.AmountFormat(P_TOTAL_TIERSPAYANT, ' '));
                parameters.put("P_TOTAL_AVOIR", P_TOTAL_AVOIR);

                parameters.put("P_VNO_PERCENT", Math.round(P_VNO_PERCENT));

                double P_TOTAL_PERCENT = (P_VO_PERCENT + P_VNO_PERCENT);
                parameters.put("P_TOTAL_PERCENT", Math.round(P_TOTAL_PERCENT));
                double P_TOTAL_VENTE = P_TOTAL_ESPECE + P_TOTAL_CHEQUES + P_TOTAL_CARTEBANCAIRE;

                parameters.put("P_TOTAL_VENTE", conversion.AmountFormat((int) P_TOTAL_VENTE, ' '));
                String P_FONDCAISSE_LABEL = "", P_SORIECAISSE_LABEL = "", P_ENTREECAISSE_LABEL = "",
                        P_REGLEMENT_LABEL = "", P_ACCOMPTE_LABEL = "", P_DIFFERE_LABEL = "", P_TOTAL_CAISSE_LABEL = "";
                double P_SORTIECAISSE_ESPECE = 0d, P_SORTIECAISSE_CHEQUES = 0d, P_SORTIECAISSE_CB = 0d,
                        P_SORTIECAISSE_VIREMENT = 0d, P_TOTAL_SORTIE_CAISSE = 0d, P_ENTREECAISSE_ESPECE = 0d,
                        P_ENTREECAISSE_VIREMENT = 0d, P_ENTREECAISSE_CHEQUES = 0d, P_ENTREECAISSE_CB = 0d,
                        P_TOTAL_ENTREE_CAISSE = 0d, P_REGLEMENT_ESPECE = 0d, P_REGLEMENT_CHEQUES = 0d,
                        P_REGLEMENT_VIREMENT = 0d, P_REGLEMENT_CB = 0d, P_TOTAL_REGLEMENT_CAISSE = 0d,
                        P_ACCOMPTE_ESPECE = 0d, P_ACCOMPTE_CHEQUES = 0d, P_ACCOMPTE_VIREMENT = 0d, P_ACCOMPTE_CB = 0d,
                        P_TOTAL_ACCOMPTE_CAISSE = 0d, P_FONDCAISSE = 0d, P_DIFFERE_CHEQUES = 0d, P_DIFFERE_CB = 0d,
                        P_TOTAL_GLOBAL_CAISSE = 0d, P_DIFFERE_ESPECE = 0d, P_DIFFERE_VIREMENT = 0d,
                        P_TOTAL_VIREMENT_GLOBAL = 0d, P_TOTAL_DIFFERE_CAISSE = 0d, P_TOTAL_ESPECES_GLOBAL = 0d,
                        P_TOTAL_CHEQUES_GLOBAL = 0d, P_TOTAL_CB_GLOBAL = 0d;

                for (EntityData Odata : listTMvtCaisses) {
                    // System.out.println("P_SORIECAISSE_LABEL +++++++++++++++++++++++++++++++++ " +
                    // Odata.getStr_value2() + " --------------------" + Odata.getStr_value4());
                    if (Odata.getStr_value4().equals(Parameter.KEY_PARAM_MVT_FOND_DE_CAISSE)) {
                        P_FONDCAISSE_LABEL = Odata.getStr_value2();
                        P_FONDCAISSE = Double.valueOf(Odata.getStr_value1());
                    } else if (Odata.getStr_value4().equals(Parameter.KEY_PARAM_MVT_SORTIECAISSE)) {

                        P_SORIECAISSE_LABEL = Odata.getStr_value2();
                        // System.out.println("P_SORIECAISSE_LABEL +++++++++++++++++++++++++++++++++ " +
                        // P_SORIECAISSE_LABEL + " --------------------");
                        if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_ESPECE)) {
                            P_SORTIECAISSE_ESPECE = (-1) * Double.valueOf(Odata.getStr_value1());
                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_CHEQUE)) {
                            P_SORTIECAISSE_CHEQUES = (-1) * Double.valueOf(Odata.getStr_value1());
                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_CARTEBANQUAIRE)) {
                            P_SORTIECAISSE_CB = (-1) * Double.valueOf(Odata.getStr_value1());
                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_VIREMENT)) {
                            P_SORTIECAISSE_VIREMENT = (-1) * Double.valueOf(Odata.getStr_value1());
                        }
                    } else if (Odata.getStr_value4().equals(Parameter.KEY_PARAM_MVT_ENTREE_CAISSE)) {
                        P_ENTREECAISSE_LABEL = Odata.getStr_value2();
                        if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_ESPECE)) {
                            P_ENTREECAISSE_ESPECE = Double.valueOf(Odata.getStr_value1());

                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_CHEQUE)) {
                            P_ENTREECAISSE_CHEQUES = Double.valueOf(Odata.getStr_value1());
                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_CARTEBANQUAIRE)) {
                            P_ENTREECAISSE_CB = Double.valueOf(Odata.getStr_value1());
                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_VIREMENT)) {
                            P_ENTREECAISSE_VIREMENT = Double.valueOf(Odata.getStr_value1());
                        }
                    } else if (Odata.getStr_value4().equals(Parameter.KEY_PARAM_MVT_REGLEMENTTIERS)) {
                        P_REGLEMENT_LABEL = Odata.getStr_value2();
                        if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_ESPECE)) {
                            P_REGLEMENT_ESPECE = Double.valueOf(Odata.getStr_value1());
                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_CHEQUE)) {
                            P_REGLEMENT_CHEQUES = Double.valueOf(Odata.getStr_value1());
                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_CARTEBANQUAIRE)) {
                            P_REGLEMENT_CB = Double.valueOf(Odata.getStr_value1());
                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_VIREMENT)) {
                            P_REGLEMENT_VIREMENT = Double.valueOf(Odata.getStr_value1());
                        }
                    } else if (Odata.getStr_value4().equals(Parameter.KEY_PARAM_MVT_REGLEMENT_DIFFERES)) {
                        P_DIFFERE_LABEL = Odata.getStr_value2();
                        if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_ESPECE)) {
                            P_DIFFERE_ESPECE = Double.valueOf(Odata.getStr_value1());
                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_CHEQUE)) {
                            P_DIFFERE_CHEQUES = Double.valueOf(Odata.getStr_value1());
                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_CARTEBANQUAIRE)) {
                            P_DIFFERE_CB = Double.valueOf(Odata.getStr_value1());
                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_VIREMENT)) {
                            P_DIFFERE_VIREMENT = Double.valueOf(Odata.getStr_value1());
                        }
                    } else if (Odata.getStr_value4().equals(Parameter.KEY_PARAM_MVT_ACCOMPTES)) {
                        P_ACCOMPTE_LABEL = Odata.getStr_value2();
                        if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_ESPECE)) {
                            P_ACCOMPTE_ESPECE = Double.valueOf(Odata.getStr_value1());
                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_CHEQUE)) {
                            P_ACCOMPTE_CHEQUES = Double.valueOf(Odata.getStr_value1());
                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_CARTEBANQUAIRE)) {
                            P_ACCOMPTE_CB = Double.valueOf(Odata.getStr_value1());
                        } else if (Odata.getStr_value6().equals(Parameter.KEY_TYPEREGLEMENT_VIREMENT)) {
                            P_ACCOMPTE_VIREMENT = Double.valueOf(Odata.getStr_value1());
                        }
                    }
                }
                Preenregistrement OPreenregistrement = new Preenregistrement(OdataManager, OTUser);
                /* subquery parameters */
                // code ajouté 05/04/2016
                if (OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                        .equalsIgnoreCase(commonparameter.PROCESS_SUCCESS)) {
                    P_VENTEDEPOT_ESPECE = (-1) * OPreenregistrement.getPriceVenteToDepot("",
                            Parameter.VENTE_DEPOT_EXTENSION, dt_start, dt_end);
                    P_TOTAL_VENTEDEPOT_CAISSE = P_VENTEDEPOT_ESPECE + P_VENTEDEPOT_CHEQUES + P_VENTEDEPOT_CB;
                    P_REGLEMENTDEPOT_ESPECE = OjournalVente.getTotalAmountVenteInDepotForBalanceVenteCaisse(
                            listTDataInDepot, Parameter.KEY_TYPEREGLEMENT_ESPECE)
                            + OjournalVente.getTotalAmountVenteInDepotForBalanceVenteCaisse(listTDataInDepot,
                                    Parameter.KEY_TYPEREGLEMENT_DIFERRE);
                    P_REGLEMENTDEPOT_CHEQUES = OjournalVente.getTotalAmountVenteInDepotForBalanceVenteCaisse(
                            listTDataInDepot, Parameter.KEY_TYPEREGLEMENT_CHEQUE);
                    P_REGLEMENTDEPOT_CB = OjournalVente.getTotalAmountVenteInDepotForBalanceVenteCaisse(
                            listTDataInDepot, Parameter.KEY_TYPEREGLEMENT_CARTEBANQUAIRE);
                    P_TOTAL_REGLEMENTDEPOT_CAISSE = P_REGLEMENTDEPOT_ESPECE + P_REGLEMENTDEPOT_CHEQUES
                            + P_REGLEMENTDEPOT_CB;
                }

                P_VENTEDEPOT_LABEL = (P_TOTAL_VENTEDEPOT_CAISSE != 0 ? P_VENTEDEPOT_LABEL : "");
                P_REGLEMENTDEPOT_LABEL = (P_TOTAL_REGLEMENTDEPOT_CAISSE > 0 ? P_REGLEMENTDEPOT_LABEL : "");

                parameters.put("P_VENTEDEPOT_LABEL", P_VENTEDEPOT_LABEL);
                parameters.put("P_VENTEDEPOT_ESPECE", conversion.AmountFormat((int) P_VENTEDEPOT_ESPECE, ' '));
                parameters.put("P_VENTEDEPOT_CHEQUES", conversion.AmountFormat((int) P_VENTEDEPOT_CHEQUES, ' '));
                parameters.put("P_VENTEDEPOT_CB", conversion.AmountFormat((int) P_VENTEDEPOT_CB, ' '));
                parameters.put("P_TOTAL_VENTEDEPOT_CAISSE",
                        conversion.AmountFormat((int) P_TOTAL_VENTEDEPOT_CAISSE, ' '));

                parameters.put("P_REGLEMENTDEPOT_LABEL", P_REGLEMENTDEPOT_LABEL);
                parameters.put("P_REGLEMENTDEPOT_ESPECE", conversion.AmountFormat((int) P_REGLEMENTDEPOT_ESPECE, ' '));
                parameters.put("P_REGLEMENTDEPOT_CHEQUES",
                        conversion.AmountFormat((int) P_REGLEMENTDEPOT_CHEQUES, ' '));
                parameters.put("P_REGLEMENTDEPOT_CB", conversion.AmountFormat((int) P_REGLEMENTDEPOT_CB, ' '));
                parameters.put("P_TOTAL_REGLEMENTDEPOT_CAISSE",
                        conversion.AmountFormat((int) P_TOTAL_REGLEMENTDEPOT_CAISSE, ' '));

                // fin code ajouté 05/04/2016
                P_TOTAL_SORTIE_CAISSE = P_SORTIECAISSE_ESPECE + P_SORTIECAISSE_CHEQUES + P_SORTIECAISSE_CB;
                P_TOTAL_ENTREE_CAISSE = P_ENTREECAISSE_ESPECE + P_ENTREECAISSE_CHEQUES + P_ENTREECAISSE_CB;
                P_TOTAL_REGLEMENT_CAISSE = P_REGLEMENT_ESPECE + P_REGLEMENT_CHEQUES + P_REGLEMENT_CB;
                P_TOTAL_ACCOMPTE_CAISSE = P_ACCOMPTE_ESPECE + P_ACCOMPTE_CHEQUES + P_ACCOMPTE_CB;
                P_TOTAL_DIFFERE_CAISSE = P_DIFFERE_ESPECE + P_DIFFERE_CHEQUES + P_DIFFERE_CB;

                P_TOTAL_ESPECES_GLOBAL = (P_FONDCAISSE + P_TOTAL_ESPECE + P_ENTREECAISSE_ESPECE + P_REGLEMENT_ESPECE
                        + P_ACCOMPTE_ESPECE + P_DIFFERE_ESPECE + P_REGLEMENTDEPOT_ESPECE) + P_SORTIECAISSE_ESPECE;
                P_TOTAL_CHEQUES_GLOBAL = P_TOTAL_CHEQUES + P_SORTIECAISSE_CHEQUES + P_ENTREECAISSE_CHEQUES
                        + P_REGLEMENT_CHEQUES + P_ACCOMPTE_CHEQUES + P_DIFFERE_CHEQUES + P_REGLEMENTDEPOT_CHEQUES;
                P_TOTAL_VIREMENT_GLOBAL = P_ENTREECAISSE_VIREMENT + P_SORTIECAISSE_VIREMENT + P_REGLEMENT_VIREMENT
                        + P_ACCOMPTE_VIREMENT + P_DIFFERE_VIREMENT;
                P_TOTAL_CB_GLOBAL = P_TOTAL_CARTEBANCAIRE + P_SORTIECAISSE_CB + P_ENTREECAISSE_CB + P_REGLEMENT_CB
                        + P_ACCOMPTE_CB + P_DIFFERE_CB + P_REGLEMENTDEPOT_CB;

                /* code ajouté 15/07/2015 */
                P_TOTAL_GLOBAL_CAISSE = +P_TOTAL_ESPECES_GLOBAL + P_TOTAL_CHEQUES_GLOBAL + P_TOTAL_CB_GLOBAL;

                parameters.put("P_TOTAL_GLOBAL_CAISSE", conversion.AmountFormat((int) P_TOTAL_GLOBAL_CAISSE, ' '));
                parameters.put("P_TOTAL_VIREMENT_GLOBAL", conversion.AmountFormat((int) P_TOTAL_VIREMENT_GLOBAL, ' '));

                parameters.put("P_SORIECAISSE_LABEL", P_SORIECAISSE_LABEL);

                parameters.put("P_TOTAL_CB_GLOBAL", conversion.AmountFormat((int) P_TOTAL_CB_GLOBAL, ' '));
                parameters.put("P_TOTAL_CHEQUES_GLOBAL", conversion.AmountFormat((int) P_TOTAL_CHEQUES_GLOBAL, ' '));
                parameters.put("P_FONDCAISSE", conversion.AmountFormat((int) P_FONDCAISSE, ' '));
                parameters.put("P_SORTIECAISSE_ESPECE", conversion.AmountFormat((int) P_SORTIECAISSE_ESPECE, ' '));
                parameters.put("P_SORTIECAISSE_CHEQUES", conversion.AmountFormat((int) P_SORTIECAISSE_CHEQUES, ' '));
                parameters.put("P_SORTIECAISSE_CB", conversion.AmountFormat((int) P_SORTIECAISSE_CB, ' '));
                parameters.put("P_SORTIECAISSE_VIREMENT", conversion.AmountFormat((int) P_SORTIECAISSE_VIREMENT, ' '));
                parameters.put("P_TOTAL_FONDCAISSE", conversion.AmountFormat((int) P_FONDCAISSE, ' '));
                parameters.put("P_TOTAL_SORTIE_CAISSE", conversion.AmountFormat((int) P_TOTAL_SORTIE_CAISSE, ' '));
                parameters.put("P_ENTREECAISSE_ESPECE", conversion.AmountFormat((int) P_ENTREECAISSE_ESPECE, ' '));
                parameters.put("P_ENTREECAISSE_VIREMENT", conversion.AmountFormat((int) P_ENTREECAISSE_VIREMENT, ' '));
                parameters.put("P_ENTREECAISSE_CHEQUES", conversion.AmountFormat((int) P_ENTREECAISSE_CHEQUES, ' '));
                parameters.put("P_ENTREECAISSE_CB", conversion.AmountFormat((int) P_ENTREECAISSE_CB, ' '));
                parameters.put("P_TOTAL_ENTREE_CAISSE", conversion.AmountFormat((int) P_TOTAL_ENTREE_CAISSE, ' '));
                parameters.put("P_REGLEMENT_ESPECE", conversion.AmountFormat((int) P_REGLEMENT_ESPECE, ' '));
                parameters.put("P_REGLEMENT_VIREMENT", conversion.AmountFormat((int) P_REGLEMENT_VIREMENT, ' '));
                parameters.put("P_REGLEMENT_CHEQUES", conversion.AmountFormat((int) P_REGLEMENT_CHEQUES, ' '));
                parameters.put("P_REGLEMENT_CB", conversion.AmountFormat((int) P_REGLEMENT_CB, ' '));
                parameters.put("P_TOTAL_REGLEMENT_CAISSE",
                        conversion.AmountFormat((int) P_TOTAL_REGLEMENT_CAISSE, ' '));
                parameters.put("P_ACCOMPTE_ESPECE", conversion.AmountFormat((int) P_ACCOMPTE_ESPECE, ' '));
                parameters.put("P_ACCOMPTE_CHEQUES", conversion.AmountFormat((int) P_ACCOMPTE_CHEQUES, ' '));
                parameters.put("P_ACCOMPTE_CB", conversion.AmountFormat((int) P_ACCOMPTE_CB, ' '));
                parameters.put("P_ACCOMPTE_VIREMENT", conversion.AmountFormat((int) P_ACCOMPTE_VIREMENT, ' '));

                parameters.put("P_TOTAL_ACCOMPTE_CAISSE", conversion.AmountFormat((int) P_TOTAL_ACCOMPTE_CAISSE, ' '));
                parameters.put("P_DIFFERE_ESPECE", conversion.AmountFormat((int) P_DIFFERE_ESPECE, ' '));
                parameters.put("P_DIFFERE_VIREMENT", conversion.AmountFormat((int) P_DIFFERE_VIREMENT, ' '));
                parameters.put("P_DIFFERE_CHEQUES", conversion.AmountFormat((int) P_DIFFERE_CHEQUES, ' '));
                parameters.put("P_DIFFERE_CB", conversion.AmountFormat((int) P_DIFFERE_CB, ' '));

                parameters.put("P_TOTAL_DIFFERE_CAISSE", conversion.AmountFormat((int) P_TOTAL_DIFFERE_CAISSE, ' '));
                P_TOTAL_CAISSE_LABEL = "Total caisse " + date.formatterShort.format(java.sql.Date.valueOf(dt_start))
                        + " AU " + date.formatterShort.format(java.sql.Date.valueOf(dt_end));
                parameters.put("P_TOTAL_CAISSE_LABEL", P_TOTAL_CAISSE_LABEL);

                parameters.put("P_FONDCAISSE_LABEL", P_FONDCAISSE_LABEL);
                parameters.put("P_ENTREECAISSE_LABEL", P_ENTREECAISSE_LABEL);
                parameters.put("P_DIFFERE_LABEL", P_DIFFERE_LABEL);
                parameters.put("P_ACCOMPTE_LABEL", P_ACCOMPTE_LABEL);
                parameters.put("P_REGLEMENT_LABEL", P_REGLEMENT_LABEL);
                parameters.put("P_TOTAL_ESPECES_GLOBAL", conversion.AmountFormat((int) P_TOTAL_ESPECES_GLOBAL, ' '));

                parameters.put("P_ACCOMPTE_CB", conversion.AmountFormat((int) P_ACCOMPTE_CB, ' '));
                P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
                P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();

                P_H_LOGO = jdom.scr_report_file_logo;

                parameters.put("P_H_LOGO", P_H_LOGO);
                parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);

                parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
                parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());

                if (oTOfficine.getStrREGISTRECOMMERCE() != null) {
                    P_FOOTER_RC += "RC N° " + oTOfficine.getStrREGISTRECOMMERCE();
                }

                if (oTOfficine.getStrCOMPTECONTRIBUABLE() != null) {
                    P_FOOTER_RC += " - CC N° " + oTOfficine.getStrCOMPTECONTRIBUABLE();
                }
                if (oTOfficine.getStrREGISTREIMPOSITION() != null) {
                    P_FOOTER_RC += " - Régime d'Imposition " + oTOfficine.getStrREGISTREIMPOSITION();
                }
                if (oTOfficine.getStrCENTREIMPOSITION() != null) {
                    P_FOOTER_RC += " - Centre des Impôts: " + oTOfficine.getStrCENTREIMPOSITION();
                }

                if (oTOfficine.getStrPHONE() != null) {
                    String finalphonestring = oTOfficine.getStrPHONE() != null
                            ? "- Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
                    if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
                        String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
                        for (String va : phone) {
                            finalphonestring += " / " + conversion.PhoneNumberFormat(va);
                        }
                    }
                    P_INSTITUTION_ADRESSE += " -  " + finalphonestring;
                }
                if (oTOfficine.getStrCOMPTEBANCAIRE() != null) {
                    P_INSTITUTION_ADRESSE += " - Compte Bancaire: " + oTOfficine.getStrCOMPTEBANCAIRE();
                }
                if (oTOfficine.getStrNUMCOMPTABLE() != null) {
                    P_INSTITUTION_ADRESSE += " - CPT N°: " + oTOfficine.getStrNUMCOMPTABLE();
                }
                parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
                parameters.put("P_FOOTER_RC", P_FOOTER_RC);

                OreportManager.BuildReportEmptyDs(parameters);

                response.sendRedirect(
                        request.getContextPath() + "/data/reports/pdf/" + "balancevente_caisse" + report_generate_file);

                break;
            case "para":
                System.out.println("-------------------------------------->>>>  " + dt_start);
                System.out.println("-------------------------------------->>>>  " + dt_end);
                array = getBalancePara(dt_start, dt_end, OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
                System.out.println("-------------------------------------->>>>  " + array);
                arrayObj = new JSONArray();

                if (array.length() > 1) {
                    JSONObject totaux = array.getJSONObject((array.length() - 1));
                    for (int idx = 0; idx < (array.length() - 1); idx++) {
                        try {
                            JSONObject o = array.getJSONObject(idx);

                            double mnt = o.getInt("VENTE_NET");
                            double percent = (mnt * 100) / totaux.getInt("GLOBAL");
                            Integer pm = ((Long) Math
                                    .round(Double.valueOf(totaux.getInt("GLOBAL")) / totaux.getInt("NB"))).intValue();
                            o.put("POURCENTAGE", Math.round(percent)).put("TOTALVENTE", totaux.getInt("GLOBAL"))
                                    .put("TOTALMARGE", totaux.getLong("TOTALMARGE"))
                                    .put("TOTALRATIO", totaux.getDouble("TOTALRATIO"))
                                    .put("TOTALACHAT", totaux.getLong("TOTALACHAT")).put("VENTE_NET_BIS", pm);

                            arrayObj.put(o);
                        } catch (Exception e) {
                        }

                    }
                }

                data.put("data", arrayObj);
                data.put("total", arrayObj.length());
                out.println(data);

                break;
            case "parapdf":

                P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
                P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();
                // String au = " au " + LocalDate.parse(dt_end).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                // String du_= LocalDate.parse(dt_start).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));

                P_H_CLT_INFOS = "BALANCE VENTE/CAISSE DU " + date.formatterShort.format(java.sql.Date.valueOf(dt_start))
                        + " AU " + date.formatterShort.format(java.sql.Date.valueOf(dt_end));

                P_H_LOGO = jdom.scr_report_file_logo;
                parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);
                parameters.put("P_H_LOGO", P_H_LOGO);
                parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);

                parameters.put("P_PRINTED_BY", " " + OTUser.getStrFIRSTNAME() + "  " + OTUser.getStrLASTNAME());
                parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());

                if (oTOfficine.getStrREGISTRECOMMERCE() != null) {
                    P_FOOTER_RC += "RC N° " + oTOfficine.getStrREGISTRECOMMERCE();
                }

                if (oTOfficine.getStrCOMPTECONTRIBUABLE() != null) {
                    P_FOOTER_RC += " - CC N° " + oTOfficine.getStrCOMPTECONTRIBUABLE();
                }
                if (oTOfficine.getStrREGISTREIMPOSITION() != null) {
                    P_FOOTER_RC += " - Régime d'Imposition " + oTOfficine.getStrREGISTREIMPOSITION();
                }
                if (oTOfficine.getStrCENTREIMPOSITION() != null) {
                    P_FOOTER_RC += " - Centre des Impôts: " + oTOfficine.getStrCENTREIMPOSITION();
                }

                if (oTOfficine.getStrPHONE() != null) {
                    String finalphonestring = oTOfficine.getStrPHONE() != null
                            ? "- Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
                    if (!"".equals(oTOfficine.getStrAUTRESPHONES())) {
                        String[] phone = oTOfficine.getStrAUTRESPHONES().split(";");
                        for (String va : phone) {
                            finalphonestring += " / " + conversion.PhoneNumberFormat(va);
                        }
                    }
                    P_INSTITUTION_ADRESSE += " -  " + finalphonestring;
                }
                if (oTOfficine.getStrCOMPTEBANCAIRE() != null) {
                    P_INSTITUTION_ADRESSE += " - Compte Bancaire: " + oTOfficine.getStrCOMPTEBANCAIRE();
                }
                if (oTOfficine.getStrNUMCOMPTABLE() != null) {
                    P_INSTITUTION_ADRESSE += " - CPT N°: " + oTOfficine.getStrNUMCOMPTABLE();
                }
                parameters.put("P_INSTITUTION_ADRESSE", P_INSTITUTION_ADRESSE);
                parameters.put("P_FOOTER_RC", P_FOOTER_RC);
                _array = getBalanceParaReport(dt_start, dt_end, OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID());
                _data = new JSONObject();
                _data.put("root", _array);
                app = new JsonDataSourceApp();

                fileName = "rp_balancevente_caissevpara_" + DATEFORMAT.format(new Date()) + ".pdf";
                app.fill(parameters, _data, jdom.scr_report_file + "rp_balancevente_caissevpara.jrxml", fileName);

                response.sendRedirect(request.getContextPath() + "/data/reports/pdf/" + fileName);

                break;

            case "tableau":
                break;
            case "tableaupdf":
                break;

            default:
                break;
            }

        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (JSONException ex) {
            Logger.getLogger(MyBean.class.getName()).log(Level.SEVERE, null, ex);
        } catch (JRException ex) {
            Logger.getLogger(MyBean.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (JSONException ex) {
            Logger.getLogger(MyBean.class.getName()).log(Level.SEVERE, null, ex);
        } catch (JRException ex) {
            Logger.getLogger(MyBean.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    private Integer venteCarnetRemise(String dt_start, String dt_end, String lgEmp) {
        LocalDate dtstart = LocalDate.parse(dt_start);
        LocalDate dtend = LocalDate.parse(dt_end);
        Period pd = Period.between(dtstart, dtend);
        EntityManager em = this.getEntityManager();
        Integer amount = 0;
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);

            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = root.join("lgUSERID", JoinType.INNER);
            Join<TPreenregistrement, TReglement> r = root.join("lgREGLEMENTID", JoinType.INNER);
            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            predicate = cb.and(predicate, cb.equal(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "3"));
            Predicate ge = cb.greaterThan(root.get(TPreenregistrement_.intPRICE), 0);
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            cq.select(root.get(TPreenregistrement_.intPRICEREMISE));

            cq.where(predicate, btw, ge);
            Query q = em.createQuery(cq);
            amount = (Integer) q.getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return amount;
    }

    private JSONArray getBalance(String dt_start, String dt_end, String lgEmp) {
        JSONArray array = new JSONArray();
        LocalDate dtstart = LocalDate.parse(dt_start);
        LocalDate dtend = LocalDate.parse(dt_end);
        Period pd = Period.between(dtstart, dtend);
        if (pd.getMonths() > 1) {
            return getBalanceInterval(dt_start, dt_end, lgEmp);
        }
        EntityManager em = this.getEntityManager();

        TParameters p;
        int isOk = 0;
        try {
            try {
                p = em.getReference(TParameters.class, "KEY_PARAMS");
                if (p != null) {
                    isOk = Integer.valueOf(p.getStrVALUE().trim());
                }

            } catch (Exception e) {
            }

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = root.join("lgUSERID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            Predicate ge = cb.greaterThan(root.get(TPreenregistrement_.intPRICE), 0);
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            cq.multiselect(cb.sum(
                    (isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER) : root.get(TPreenregistrement_.intPRICE))),
                    cb.sum(root.get(TPreenregistrement_.intPRICEREMISE)), cb
                            .sum(cb.diff(
                                    (isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER)
                                            : root.get(TPreenregistrement_.intPRICE)),
                                    root.get(TPreenregistrement_.intPRICEREMISE))),
                    root.get(TPreenregistrement_.strTYPEVENTE), cb
                            .selectCase().when(
                                    cb.equal(root
                                            .get(TPreenregistrement_.strTYPEVENTE), "VO"),
                                    cb.sum(root.get(TPreenregistrement_.intCUSTPART)))
                            .otherwise(cb.sum(cb.diff(
                                    (isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER)
                                            : root.get(TPreenregistrement_.intPRICE)),
                                    root.get(TPreenregistrement_.intPRICEREMISE)))),
                    cb.count(root),
                    cb.quot(cb.sum((isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER)
                            : root.get(TPreenregistrement_.intPRICE))), cb.count(root)),
                    cb.selectCase()
                            .when(cb.equal(root.get(TPreenregistrement_.strTYPEVENTE), "VO"),
                                    cb.sum(cb.diff(root.get(TPreenregistrement_.intPRICE),
                                            root.get(TPreenregistrement_.intCUSTPART))))
                            .otherwise(0))
                    .groupBy(root.get(TPreenregistrement_.strTYPEVENTE))
                    .orderBy(cb.desc(root.get(TPreenregistrement_.strTYPEVENTE)));
            cq.where(predicate, btw, ge);
            Query q = em.createQuery(cq);
            List<Object[]> list = q.getResultList();
            LocalDate x = LocalDate.parse(dt_start);
            LocalDate y = LocalDate.parse(dt_end);
            double percent = 0, Gbl = 0, vo = 0, vno = 0;
            int nb = 0;
            Integer totalcq = 0, totalcb = 0, totalEs = 0;
            for (Object[] t : list) {
                try {
                    // Integer TOTAL_DIFFERE = 0;
                    Integer VENTE_BRUT = Integer.valueOf(t[0] + ""), TOTAL_REMISE = Integer.valueOf(t[1] + ""),
                            VENTE_NET = Integer.valueOf(t[2] + ""), TOTAL_CAISSE = Integer.valueOf(t[4] + ""),
                            PANIER_MOYEN = Math.round(Double.valueOf(t[6] + "").intValue()),
                            PART_TIERSPAYANT = Integer.valueOf(t[7] + "");
                    // JSONObject transac = getBalanceRegl(dt_start, dt_end, t[3] + "", lgEmp, isOk);
                    if ("VO".equals(t[3] + "")) {
                        PART_TIERSPAYANT -= venteCarnetRemise(dt_start, dt_end, lgEmp);
                    }

                    Integer TOTAL_DIFFERE = getBalanceDiff(dt_start, dt_end, t[3] + "", lgEmp);

                    Integer montantES = getBalanceRegl(dt_start, dt_end, t[3] + "", lgEmp, isOk, "1");
                    montantES = (montantES != null ? montantES : 0);
                    montantES += getBalanceRegl(dt_start, dt_end, t[3] + "", lgEmp, isOk, "4");

                    Integer Cheques = getBalanceRegl(dt_start, dt_end, t[3] + "", lgEmp, isOk, "2");
                    Cheques = (Cheques != null ? Cheques : 0);
                    Integer cba = getBalanceRegl(dt_start, dt_end, t[3] + "", lgEmp, isOk, "3");
                    cba = (cba != null ? cba : 0);

                    if (y.compareTo(x) == 0) {
                        JSONObject json = getVenteAnnuler(dt_end, t[3] + "");
                        VENTE_BRUT -= json.getInt("monantTTC");
                        TOTAL_REMISE -= json.getInt("remise");
                        VENTE_NET -= json.getInt("montant");
                        TOTAL_CAISSE -= json.getInt("montantES");

                        PART_TIERSPAYANT -= json.getInt("tp");

                        montantES -= json.getInt("montantES");

                        Cheques -= json.getInt("cheques");
                        cba -= json.getInt("cb");
                        TOTAL_DIFFERE -= json.getInt("differe");
                        Long _PANIER_MOYEN = Math.round(Double.valueOf(VENTE_BRUT) / Integer.valueOf(t[5] + ""));
                        PANIER_MOYEN = _PANIER_MOYEN.intValue();

                    }
                    Gbl += VENTE_NET;
                    totalcq += Cheques;
                    totalcb += cba;
                    totalEs += montantES;
                    nb += Integer.valueOf(t[5] + "");
                    JSONObject ob = new JSONObject();
                    ob.put("VENTE_BRUT", VENTE_BRUT).put("TOTAL_DIFFERE", TOTAL_DIFFERE)
                            .put("TOTAL_REMISE", TOTAL_REMISE).put("VENTE_NET", VENTE_NET);
                    ob.put("str_TYPE_VENTE", t[3] + "");
                    ob.put("TOTAL_CAISSE", TOTAL_CAISSE);
                    ob.put("NB", Integer.valueOf(t[5] + ""));
                    ob.put("PANIER_MOYEN", PANIER_MOYEN);
                    ob.put("PART_TIERSPAYANT", PART_TIERSPAYANT);
                    if ("VNO".equals(t[3] + "")) {
                        ob.put("PART_TIERSPAYANT", 0);
                    }

                    ob.put("TOTAL_ESPECE", montantES);
                    ob.put("TOTAL_CHEQUE", Cheques);
                    ob.put("TOTAL_CARTEBANCAIRE", cba);

                    array.put(ob);
                } catch (Exception ex) {
                    ex.printStackTrace();
                }

            }

            JSONObject totaux = new JSONObject();
            double ration;
            long achat = getMontantAchats(dt_start, dt_end, lgEmp);
            long marge = getMarge(dt_start, dt_end, lgEmp);
            double rat = 0.0;
            if (achat > 0) {
                ration = (Gbl / achat);
                rat = new BigDecimal(ration).setScale(2, RoundingMode.HALF_UP).doubleValue();
            }
            totaux.put("NB", nb).put("GLOBALESP", totalEs).put("GLOBALCB", totalcb).put("TOTALMARGE", marge)
                    .put("GLOBALCQ", totalcq).put("GLOBAL", Double.valueOf(Gbl).intValue()).put("TOTALACHAT", achat)
                    .put("TOTALRATIO", rat);
            array.put(totaux);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public JSONArray getBalanceInterval(String dt_start, String dt_end, String lgEmp) {
        JSONArray array = new JSONArray();
        String str_TYPE_VENTE = "", str_TYPE_VENTEVO = "";
        Integer NB = 0, NBT = 0, NBVO = 0;
        EntityManager em = this.getEntityManager();
        long PART_TIERSPAYANT = 0, TOTALMARGE = 0, TOTALACHAT = 0, GLOBALESP = 0, GLOBAL = 0, GLOBALCQ = 0,
                GLOBALCB = 0, PART_TIERSPAYANTVO = 0, TOTAL_REMISE = 0, VENTE_BRUT = 0, TOTAL_ESPECE = 0,
                TOTAL_CHEQUE = 0, TOTAL_CARTEBANCAIRE = 0, VENTE_NET = 0, TOTAL_DIFFERE = 0, TOTAL_CAISSE = 0,
                TOTAL_REMISEVO = 0, VENTE_BRUTVO = 0, TOTAL_ESPECEVO = 0, TOTAL_CHEQUEVO = 0, TOTAL_CARTEBANCAIREVO = 0,
                VENTE_NETVO = 0, TOTAL_DIFFEREVO = 0, TOTAL_CAISSEVO = 0;
        int isOk = 0;
        try {
            TParameters p;
            try {

                p = em.getReference(TParameters.class, "KEY_PARAMS");
                if (p != null) {
                    isOk = Integer.valueOf(p.getStrVALUE().trim());
                }
                LocalDate dtstart = LocalDate.parse(dt_start);
                LocalDate dtend = LocalDate.parse(dt_end);
                Period period = Period.between(dtstart, dtend);
                for (int i = 0; i < period.getMonths(); i++) {
                    LocalDate _dtStart = dtstart.plusMonths(i);
                    JSONArray _array = getBalance(_dtStart, _dtStart.plusDays(_dtStart.lengthOfMonth() - 1), lgEmp,
                            isOk);
                    JSONObject totaux = _array.getJSONObject((_array.length() - 1));
                    NBT += totaux.getInt("NB");
                    TOTALMARGE += totaux.getLong("TOTALMARGE");
                    TOTALACHAT += totaux.getLong("TOTALACHAT");
                    GLOBALESP += totaux.getLong("GLOBALESP");
                    GLOBAL += totaux.getLong("GLOBAL");
                    GLOBALCQ += totaux.getLong("GLOBALCQ");
                    GLOBALCB += totaux.getLong("GLOBALCB");
                    for (int j = 0; j < _array.length() - 1; j++) {
                        JSONObject object = _array.getJSONObject(j);
                        if (object.getString("str_TYPE_VENTE").equals("VNO")) {
                            TOTAL_REMISE += object.getInt("TOTAL_REMISE");
                            NB += object.getInt("NB");
                            VENTE_BRUT += object.getLong("VENTE_BRUT");
                            TOTAL_ESPECE += object.getLong("TOTAL_ESPECE");
                            TOTAL_CHEQUE += object.getLong("TOTAL_CHEQUE");
                            TOTAL_CARTEBANCAIRE += object.getLong("TOTAL_CARTEBANCAIRE");
                            VENTE_NET += object.getLong("VENTE_NET");
                            TOTAL_DIFFERE += object.getLong("TOTAL_DIFFERE");
                            TOTAL_CAISSE += object.getLong("TOTAL_CAISSE");
                            str_TYPE_VENTE = object.getString("str_TYPE_VENTE");
                        } else {
                            PART_TIERSPAYANTVO += object.getLong("PART_TIERSPAYANT");
                            TOTAL_REMISEVO += object.getInt("TOTAL_REMISE");
                            NBVO += object.getInt("NB");
                            VENTE_BRUTVO += object.getLong("VENTE_BRUT");
                            TOTAL_ESPECEVO += object.getLong("TOTAL_ESPECE");
                            TOTAL_CHEQUEVO += object.getLong("TOTAL_CHEQUE");
                            TOTAL_CARTEBANCAIREVO += object.getLong("TOTAL_CARTEBANCAIRE");
                            VENTE_NETVO += object.getLong("VENTE_NET");
                            TOTAL_DIFFEREVO += object.getLong("TOTAL_DIFFERE");
                            TOTAL_CAISSEVO += object.getLong("TOTAL_CAISSE");
                            str_TYPE_VENTEVO = object.getString("str_TYPE_VENTE");
                        }
                    }

                }
                LocalDate dd = LocalDate.of(dtend.getYear(), dtend.getMonthValue(), 1);
                JSONArray endarray = getBalance(dd, dd.plusDays(dd.lengthOfMonth() - 1), lgEmp, isOk);
                JSONObject endtotaux = endarray.getJSONObject((endarray.length() - 1));
                NBT += endtotaux.getInt("NB");
                TOTALMARGE += endtotaux.getLong("TOTALMARGE");
                TOTALACHAT += endtotaux.getLong("TOTALACHAT");
                GLOBALESP += endtotaux.getLong("GLOBALESP");
                GLOBAL += endtotaux.getLong("GLOBAL");
                GLOBALCQ += endtotaux.getLong("GLOBALCQ");
                GLOBALCB += endtotaux.getLong("GLOBALCB");

                for (int j = 0; j < endarray.length() - 1; j++) {
                    JSONObject object = endarray.getJSONObject(j);
                    if (object.getString("str_TYPE_VENTE").equals("VNO")) {
                        TOTAL_REMISE += object.getInt("TOTAL_REMISE");
                        NB += object.getInt("NB");
                        VENTE_BRUT += object.getLong("VENTE_BRUT");
                        // PART_TIERSPAYANT+= object.getLong("PART_TIERSPAYANT");
                        TOTAL_ESPECE += object.getLong("TOTAL_ESPECE");
                        TOTAL_CHEQUE += object.getLong("TOTAL_CHEQUE");
                        TOTAL_CARTEBANCAIRE += object.getLong("TOTAL_CARTEBANCAIRE");
                        VENTE_NET += object.getLong("VENTE_NET");
                        TOTAL_DIFFERE += object.getLong("TOTAL_DIFFERE");
                        TOTAL_CAISSE += object.getLong("TOTAL_CAISSE");
                        str_TYPE_VENTE = object.getString("str_TYPE_VENTE");
                    } else {
                        PART_TIERSPAYANTVO += object.getLong("PART_TIERSPAYANT");
                        TOTAL_REMISEVO += object.getInt("TOTAL_REMISE");
                        NBVO += object.getInt("NB");
                        VENTE_BRUTVO += object.getLong("VENTE_BRUT");
                        TOTAL_ESPECEVO += object.getLong("TOTAL_ESPECE");
                        TOTAL_CHEQUEVO += object.getLong("TOTAL_CHEQUE");
                        TOTAL_CARTEBANCAIREVO += object.getLong("TOTAL_CARTEBANCAIRE");
                        VENTE_NETVO += object.getLong("VENTE_NET");
                        TOTAL_DIFFEREVO += object.getLong("TOTAL_DIFFERE");
                        TOTAL_CAISSEVO += object.getLong("TOTAL_CAISSE");
                        str_TYPE_VENTEVO = object.getString("str_TYPE_VENTE");
                    }
                }

                Long _PANIER_MOYEN = Math.round(Double.valueOf(VENTE_BRUT) / NB);
                JSONObject ob = new JSONObject();
                ob.put("VENTE_BRUT", VENTE_BRUT).put("TOTAL_DIFFERE", TOTAL_DIFFERE).put("TOTAL_REMISE", TOTAL_REMISE)
                        .put("VENTE_NET", VENTE_NET);
                ob.put("str_TYPE_VENTE", "VNO");
                ob.put("TOTAL_CAISSE", TOTAL_CAISSE);
                ob.put("NB", NB);
                ob.put("PANIER_MOYEN", _PANIER_MOYEN.intValue());
                ob.put("PART_TIERSPAYANT", 0);
                ob.put("TOTAL_ESPECE", TOTAL_ESPECE);
                ob.put("TOTAL_CHEQUE", TOTAL_CHEQUE);
                ob.put("TOTAL_CARTEBANCAIRE", TOTAL_CARTEBANCAIRE);
                array.put(ob);
                Long _PANIER_MOYENVO = Math.round(Double.valueOf(VENTE_BRUTVO) / NBVO);

                JSONObject obvo = new JSONObject();
                obvo.put("VENTE_BRUT", VENTE_BRUTVO).put("TOTAL_DIFFERE", TOTAL_DIFFEREVO)
                        .put("TOTAL_REMISE", TOTAL_REMISEVO).put("VENTE_NET", VENTE_NETVO);
                obvo.put("str_TYPE_VENTE", "VO");
                obvo.put("TOTAL_CAISSE", TOTAL_CAISSEVO);
                obvo.put("NB", NBVO);
                obvo.put("PANIER_MOYEN", _PANIER_MOYENVO.intValue());
                obvo.put("PART_TIERSPAYANT", PART_TIERSPAYANTVO);
                obvo.put("TOTAL_ESPECE", TOTAL_ESPECEVO);
                obvo.put("TOTAL_CHEQUE", TOTAL_CHEQUEVO);
                obvo.put("TOTAL_CARTEBANCAIRE", TOTAL_CARTEBANCAIREVO);
                array.put(obvo);
                double ration;
                double rat = 0.0;
                if (TOTALACHAT > 0) {
                    ration = (GLOBAL / TOTALACHAT);
                    rat = new BigDecimal(ration).setScale(2, RoundingMode.HALF_UP).doubleValue();
                }
                JSONObject totaux = new JSONObject();
                totaux.put("NB", NBT).put("GLOBALESP", GLOBALESP).put("GLOBALCB", GLOBALCB)
                        .put("TOTALMARGE", TOTALMARGE).put("GLOBALCQ", GLOBALCQ)
                        .put("GLOBAL", Double.valueOf(GLOBAL).intValue()).put("TOTALACHAT", TOTALACHAT)
                        .put("TOTALRATIO", rat).put("TOTALRATIO", rat);
                array.put(totaux);
            } catch (Exception e) {
                e.printStackTrace();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public JSONArray getBalanceExclude(String dt_start, String dt_end, String lgEmp) {

        JSONArray array = new JSONArray();
        LocalDate dtstart = LocalDate.parse(dt_start);
        LocalDate dtend = LocalDate.parse(dt_end);
        Period pd = Period.between(dtstart, dtend);
        if (pd.getMonths() > 1) {
            return getBalanceInterval(dt_start, dt_end, lgEmp);
        }
        EntityManager em = this.getEntityManager();
        boolean period = true;
        TParameters p;
        int isOk = 0;
        try {
            try {
                p = em.getReference(TParameters.class, "KEY_PARAMS");
                if (p != null) {
                    isOk = Integer.valueOf(p.getStrVALUE().trim());
                }

            } catch (Exception e) {
            }

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);

            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = root.join("lgUSERID", JoinType.INNER);
            Join<TPreenregistrement, TReglement> r = root.join("lgREGLEMENTID", JoinType.INNER);
            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            Predicate ge = cb.greaterThan(root.get(TPreenregistrement_.intPRICE), 0);
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            cq.multiselect(
                    cb.sum((isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER)
                            : root.get(TPreenregistrement_.intACCOUNT))),
                    // cb.sum(root.get(TPreenregistrement_.intPRICEREMISE)),
                    cb.sum((isOk == 1
                            ? cb.diff(root.get(TPreenregistrement_.intPRICEREMISE),
                                    root.get(TPreenregistrement_.intREMISEPARA))
                            : root.get(TPreenregistrement_.intPRICEREMISE))),
                    cb.sum(cb.diff((isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER)
                            : root.get(TPreenregistrement_.intACCOUNT)), root.get(
                                    TPreenregistrement_.intREMISEPARA))),
                    root.get(TPreenregistrement_.strTYPEVENTE), cb
                            .selectCase().when(
                                    cb.equal(root
                                            .get(TPreenregistrement_.strTYPEVENTE), "VO"),
                                    cb.sum(root.get(TPreenregistrement_.intCUSTPART)))
                            .otherwise(cb.sum(cb.diff(
                                    (isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER)
                                            : root.get(TPreenregistrement_.intACCOUNT)),
                                    root.get(TPreenregistrement_.intREMISEPARA)))),
                    cb.count(root),
                    cb.quot(cb.sum((isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER)
                            : root.get(TPreenregistrement_.intACCOUNT))), cb.count(root)),
                    cb.selectCase()
                            .when(cb.equal(root.get(TPreenregistrement_.strTYPEVENTE), "VO"),
                                    cb.sum(cb.diff(root.get(TPreenregistrement_.intACCOUNT),
                                            root.get(TPreenregistrement_.intCUSTPART))))
                            .otherwise(0))
                    .groupBy(root.get(TPreenregistrement_.strTYPEVENTE))
                    .orderBy(cb.desc(root.get(TPreenregistrement_.strTYPEVENTE)));
            cq.where(predicate, btw, ge);
            Query q = em.createQuery(cq);

            List<Object[]> list = q.getResultList();

            LocalDate x = LocalDate.parse(dt_start);
            LocalDate y = LocalDate.parse(dt_end);
            double percent = 0, Gbl = 0;
            int nb = 0;
            Integer totalcq = 0, totalcb = 0, totalEs = 0;
            for (Object[] t : list) {
                try {
                    // Integer TOTAL_DIFFERE = 0;
                    Integer VENTE_BRUT = Integer.valueOf(t[0] + ""), TOTAL_REMISE = Integer.valueOf(t[1] + ""),
                            VENTE_NET = Integer.valueOf(t[2] + ""), TOTAL_CAISSE = Integer.valueOf(t[4] + ""),
                            PANIER_MOYEN = Math.round(Double.valueOf(t[6] + "").intValue()),
                            PART_TIERSPAYANT = Integer.valueOf(t[7] + "");
                    Integer TOTAL_DIFFERE = getBalanceDiff(dt_start, dt_end, t[3] + "", lgEmp);
                    Integer montantES = getBalanceReglExclude(dt_start, dt_end, t[3] + "", lgEmp, isOk, "1");
                    montantES = (montantES != null ? montantES : 0);
                    montantES += getBalanceReglExclude(dt_start, dt_end, t[3] + "", lgEmp, isOk, "4");

                    Integer Cheques = getBalanceReglExclude(dt_start, dt_end, t[3] + "", lgEmp, isOk, "2");
                    Cheques = (Cheques != null ? Cheques : 0);
                    Integer cba = getBalanceReglExclude(dt_start, dt_end, t[3] + "", lgEmp, isOk, "3");
                    cba = (cba != null ? cba : 0);
                    if ("VO".equals(t[3] + "")) {
                        PART_TIERSPAYANT -= venteCarnetRemise(dt_start, dt_end, lgEmp);
                    }
                    if (y.compareTo(x) == 0) {
                        JSONObject json = getVenteAnnulerExclude(dt_end, t[3] + "");
                        VENTE_BRUT -= json.getInt("monantTTC");
                        TOTAL_REMISE -= json.getInt("remise");
                        VENTE_NET -= json.getInt("montant");
                        TOTAL_CAISSE -= json.getInt("montantES");
                        PART_TIERSPAYANT -= json.getInt("tp");
                        montantES -= json.getInt("montantES");
                        Cheques -= json.getInt("cheques");
                        cba -= json.getInt("cb");
                        TOTAL_DIFFERE -= json.getInt("differe");
                        Long _PANIER_MOYEN = Math.round(Double.valueOf(VENTE_BRUT) / Integer.valueOf(t[5] + ""));
                        PANIER_MOYEN = _PANIER_MOYEN.intValue();

                    }
                    Gbl += VENTE_NET;
                    totalcq += Cheques;
                    totalcb += cba;
                    totalEs += montantES;
                    nb += Integer.valueOf(t[5] + "");
                    JSONObject ob = new JSONObject();
                    ob.put("VENTE_BRUT", VENTE_BRUT).put("TOTAL_DIFFERE", TOTAL_DIFFERE)
                            .put("TOTAL_REMISE", TOTAL_REMISE).put("VENTE_NET", VENTE_NET);
                    ob.put("str_TYPE_VENTE", t[3] + "");
                    ob.put("TOTAL_CAISSE", TOTAL_CAISSE);
                    ob.put("NB", Integer.valueOf(t[5] + ""));
                    ob.put("PANIER_MOYEN", PANIER_MOYEN);
                    ob.put("PART_TIERSPAYANT", PART_TIERSPAYANT);
                    if ("VNO".equals(t[3] + "")) {
                        ob.put("PART_TIERSPAYANT", 0);
                    }

                    ob.put("TOTAL_ESPECE", montantES);
                    ob.put("TOTAL_CHEQUE", Cheques);
                    ob.put("TOTAL_CARTEBANCAIRE", cba);

                    array.put(ob);
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
            JSONObject totaux = new JSONObject();
            double ration;
            long achat = getMontantAchats(dt_start, dt_end, lgEmp);
            long marge = getMarge(dt_start, dt_end, lgEmp);
            double rat = 0.0;
            if (achat > 0) {
                ration = (Gbl / achat);
                rat = new BigDecimal(ration).setScale(2, RoundingMode.HALF_UP).doubleValue();
            }
            totaux.put("NB", nb).put("GLOBALESP", totalEs).put("GLOBALCB", totalcb).put("TOTALMARGE", marge)
                    .put("GLOBALCQ", totalcq).put("GLOBAL", Double.valueOf(Gbl).longValue()).put("TOTALACHAT", achat)
                    .put("TOTALRATIO", rat);
            array.put(totaux);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public JSONArray getBalanceExclude(LocalDate dt_start, LocalDate dt_end, String lgEmp, int isOk) {
        EntityManager em = this.getEntityManager();
        JSONArray array = new JSONArray();
        boolean period = true;
        TParameters p;

        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);

            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = root.join("lgUSERID", JoinType.INNER);
            Join<TPreenregistrement, TReglement> r = root.join("lgREGLEMENTID", JoinType.INNER);
            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            Predicate ge = cb.greaterThan(root.get(TPreenregistrement_.intPRICE), 0);
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            cq.multiselect(
                    cb.sum((isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER)
                            : root.get(TPreenregistrement_.intACCOUNT))),
                    cb.sum(root.get(TPreenregistrement_.intREMISEPARA)),
                    cb.sum(cb.diff((isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER)
                            : root.get(TPreenregistrement_.intACCOUNT)), root.get(
                                    TPreenregistrement_.intREMISEPARA))),
                    root.get(TPreenregistrement_.strTYPEVENTE), cb
                            .selectCase().when(
                                    cb.equal(root
                                            .get(TPreenregistrement_.strTYPEVENTE), "VO"),
                                    cb.sum(root.get(TPreenregistrement_.intCUSTPART)))
                            .otherwise(cb.sum(cb.diff(
                                    (isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER)
                                            : root.get(TPreenregistrement_.intACCOUNT)),
                                    root.get(TPreenregistrement_.intREMISEPARA)))),
                    cb.count(root),
                    cb.quot(cb.sum((isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER)
                            : root.get(TPreenregistrement_.intACCOUNT))), cb.count(root)),
                    cb.selectCase()
                            .when(cb.equal(root.get(TPreenregistrement_.strTYPEVENTE), "VO"),
                                    cb.sum(cb.diff(root.get(TPreenregistrement_.intACCOUNT),
                                            root.get(TPreenregistrement_.intCUSTPART))))
                            .otherwise(0))
                    .groupBy(root.get(TPreenregistrement_.strTYPEVENTE))
                    .orderBy(cb.desc(root.get(TPreenregistrement_.strTYPEVENTE)));
            cq.where(predicate, btw, ge);
            Query q = em.createQuery(cq);

            List<Object[]> list = q.getResultList();

            LocalDate x = dt_start;
            LocalDate y = dt_end;
            double percent = 0, Gbl = 0, vo = 0, vno = 0;
            int nb = 0;
            Integer totalcq = 0, totalcb = 0, totalEs = 0;
            for (Object[] t : list) {
                try {
                    Integer VENTE_BRUT = Integer.valueOf(t[0] + ""), TOTAL_REMISE = Integer.valueOf(t[1] + ""),
                            VENTE_NET = Integer.valueOf(t[2] + ""), TOTAL_CAISSE = Integer.valueOf(t[4] + ""),
                            PANIER_MOYEN = Math.round(Double.valueOf(t[6] + "").intValue()),
                            PART_TIERSPAYANT = Integer.valueOf(t[7] + "");
                    Integer TOTAL_DIFFERE = getBalanceDiff(dt_start.toString(), dt_end.toString(), t[3] + "", lgEmp);
                    Integer montantES = getBalanceReglExclude(dt_start.toString(), dt_end.toString(), t[3] + "", lgEmp,
                            isOk, "1");
                    montantES = (montantES != null ? montantES : 0);
                    montantES += getBalanceReglExclude(dt_start.toString(), dt_end.toString(), t[3] + "", lgEmp, isOk,
                            "4");

                    Integer Cheques = getBalanceReglExclude(dt_start.toString(), dt_end.toString(), t[3] + "", lgEmp,
                            isOk, "2");
                    Cheques = (Cheques != null ? Cheques : 0);
                    Integer cba = getBalanceReglExclude(dt_start.toString(), dt_end.toString(), t[3] + "", lgEmp, isOk,
                            "3");
                    cba = (cba != null ? cba : 0);

                    if (y.compareTo(x) == 0) {
                        JSONObject json = getVenteAnnulerExclude(dt_end.toString(), t[3] + "");
                        VENTE_BRUT -= json.getInt("monantTTC");
                        TOTAL_REMISE -= json.getInt("remise");
                        VENTE_NET -= json.getInt("montant");
                        TOTAL_CAISSE -= json.getInt("montantES");
                        PART_TIERSPAYANT -= json.getInt("tp");
                        montantES -= json.getInt("montantES");
                        Cheques -= json.getInt("cheques");
                        cba -= json.getInt("cb");
                        TOTAL_DIFFERE -= json.getInt("differe");
                        Long _PANIER_MOYEN = Math.round(Double.valueOf(VENTE_BRUT) / Integer.valueOf(t[5] + ""));
                        PANIER_MOYEN = _PANIER_MOYEN.intValue();

                    }
                    Gbl += VENTE_NET;
                    totalcq += Cheques;
                    totalcb += cba;
                    totalEs += montantES;
                    nb += Integer.valueOf(t[5] + "");
                    JSONObject ob = new JSONObject();
                    ob.put("VENTE_BRUT", VENTE_BRUT).put("TOTAL_DIFFERE", TOTAL_DIFFERE)
                            .put("TOTAL_REMISE", TOTAL_REMISE).put("VENTE_NET", VENTE_NET);
                    ob.put("str_TYPE_VENTE", t[3] + "");
                    ob.put("TOTAL_CAISSE", TOTAL_CAISSE);
                    ob.put("NB", Integer.valueOf(t[5] + ""));
                    ob.put("PANIER_MOYEN", PANIER_MOYEN);
                    ob.put("PART_TIERSPAYANT", PART_TIERSPAYANT);
                    if ("VNO".equals(t[3] + "")) {
                        ob.put("PART_TIERSPAYANT", 0);
                    }

                    ob.put("TOTAL_ESPECE", montantES);
                    ob.put("TOTAL_CHEQUE", Cheques);
                    ob.put("TOTAL_CARTEBANCAIRE", cba);

                    array.put(ob);
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
            JSONObject totaux = new JSONObject();
            double ration;
            long achat = getMontantAchats(dt_start.toString(), dt_end.toString(), lgEmp);
            long marge = getMarge(dt_start.toString(), dt_end.toString(), lgEmp);

            totaux.put("NB", nb).put("GLOBALESP", totalEs).put("GLOBALCB", totalcb).put("TOTALMARGE", marge)
                    .put("GLOBALCQ", totalcq).put("GLOBAL", Gbl).put("TOTALACHAT", achat);
            array.put(totaux);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    private JSONArray getBalanceIntervalEclu(String dt_start, String dt_end, String lgEmp) {
        JSONArray array = new JSONArray();
        String str_TYPE_VENTE = "", str_TYPE_VENTEVO = "";
        Integer NB = 0, NBT = 0, NBVO = 0;
        long PART_TIERSPAYANT = 0, TOTALMARGE = 0, TOTALACHAT = 0, GLOBALESP = 0, GLOBAL = 0, GLOBALCQ = 0,
                GLOBALCB = 0, PART_TIERSPAYANTVO = 0, TOTAL_REMISE = 0, VENTE_BRUT = 0, TOTAL_ESPECE = 0,
                TOTAL_CHEQUE = 0, TOTAL_CARTEBANCAIRE = 0, VENTE_NET = 0, TOTAL_DIFFERE = 0, TOTAL_CAISSE = 0,
                TOTAL_REMISEVO = 0, VENTE_BRUTVO = 0, TOTAL_ESPECEVO = 0, TOTAL_CHEQUEVO = 0, TOTAL_CARTEBANCAIREVO = 0,
                VENTE_NETVO = 0, TOTAL_DIFFEREVO = 0, TOTAL_CAISSEVO = 0;
        int isOk = 0;
        try {
            TParameters p;
            try {
                EntityManager em = this.getEntityManager();
                p = em.getReference(TParameters.class, "KEY_PARAMS");
                if (p != null) {
                    isOk = Integer.valueOf(p.getStrVALUE().trim());
                }
                LocalDate dtstart = LocalDate.parse(dt_start);
                LocalDate dtend = LocalDate.parse(dt_end);
                Period period = Period.between(dtstart, dtend);
                for (int i = 0; i < period.getMonths(); i++) {
                    LocalDate _dtStart = dtstart.plusMonths(i);
                    JSONArray _array = getBalanceExclude(_dtStart, _dtStart.plusDays(_dtStart.lengthOfMonth() - 1),
                            lgEmp, isOk);
                    JSONObject totaux = _array.getJSONObject((_array.length() - 1));
                    NBT += totaux.getInt("NB");
                    TOTALMARGE += totaux.getLong("TOTALMARGE");
                    TOTALACHAT += totaux.getLong("TOTALACHAT");
                    GLOBALESP += totaux.getLong("GLOBALESP");
                    GLOBAL += totaux.getLong("GLOBAL");
                    GLOBALCQ += totaux.getLong("GLOBALCQ");
                    GLOBALCB += totaux.getLong("GLOBALCB");
                    for (int j = 0; j < _array.length() - 1; j++) {
                        JSONObject object = _array.getJSONObject(j);
                        if (object.getString("str_TYPE_VENTE").equals("VNO")) {
                            TOTAL_REMISE += object.getInt("TOTAL_REMISE");
                            NB += object.getInt("NB");
                            VENTE_BRUT += object.getLong("VENTE_BRUT");
                            TOTAL_ESPECE += object.getLong("TOTAL_ESPECE");
                            TOTAL_CHEQUE += object.getLong("TOTAL_CHEQUE");
                            TOTAL_CARTEBANCAIRE += object.getLong("TOTAL_CARTEBANCAIRE");
                            VENTE_NET += object.getLong("VENTE_NET");
                            TOTAL_DIFFERE += object.getLong("TOTAL_DIFFERE");
                            TOTAL_CAISSE += object.getLong("TOTAL_CAISSE");
                            str_TYPE_VENTE = object.getString("str_TYPE_VENTE");
                        } else {
                            PART_TIERSPAYANTVO += object.getLong("PART_TIERSPAYANT");
                            TOTAL_REMISEVO += object.getInt("TOTAL_REMISE");
                            NBVO += object.getInt("NB");
                            VENTE_BRUTVO += object.getLong("VENTE_BRUT");
                            TOTAL_ESPECEVO += object.getLong("TOTAL_ESPECE");
                            TOTAL_CHEQUEVO += object.getLong("TOTAL_CHEQUE");
                            TOTAL_CARTEBANCAIREVO += object.getLong("TOTAL_CARTEBANCAIRE");
                            VENTE_NETVO += object.getLong("VENTE_NET");
                            TOTAL_DIFFEREVO += object.getLong("TOTAL_DIFFERE");
                            TOTAL_CAISSEVO += object.getLong("TOTAL_CAISSE");
                            str_TYPE_VENTEVO = object.getString("str_TYPE_VENTE");
                        }
                    }

                }
                // à revoir pour la date
                LocalDate dd = LocalDate.of(dtend.getYear(), dtend.getMonthValue(), 1);
                JSONArray endarray = getBalanceExclude(dd, dd.plusDays(dd.lengthOfMonth() - 1), lgEmp, isOk);
                JSONObject endtotaux = endarray.getJSONObject((endarray.length() - 1));
                NBT += endtotaux.getInt("NB");
                TOTALMARGE += endtotaux.getLong("TOTALMARGE");
                TOTALACHAT += endtotaux.getLong("TOTALACHAT");
                GLOBALESP += endtotaux.getLong("GLOBALESP");
                GLOBAL += endtotaux.getLong("GLOBAL");
                GLOBALCQ += endtotaux.getLong("GLOBALCQ");
                GLOBALCB += endtotaux.getLong("GLOBALCB");

                for (int j = 0; j < endarray.length() - 1; j++) {
                    JSONObject object = endarray.getJSONObject(j);
                    if (object.getString("str_TYPE_VENTE").equals("VNO")) {
                        TOTAL_REMISE += object.getInt("TOTAL_REMISE");
                        NB += object.getInt("NB");
                        VENTE_BRUT += object.getLong("VENTE_BRUT");
                        // PART_TIERSPAYANT+= object.getLong("PART_TIERSPAYANT");
                        TOTAL_ESPECE += object.getLong("TOTAL_ESPECE");
                        TOTAL_CHEQUE += object.getLong("TOTAL_CHEQUE");
                        TOTAL_CARTEBANCAIRE += object.getLong("TOTAL_CARTEBANCAIRE");
                        VENTE_NET += object.getLong("VENTE_NET");
                        TOTAL_DIFFERE += object.getLong("TOTAL_DIFFERE");
                        TOTAL_CAISSE += object.getLong("TOTAL_CAISSE");
                        str_TYPE_VENTE = object.getString("str_TYPE_VENTE");
                    } else {
                        PART_TIERSPAYANTVO += object.getLong("PART_TIERSPAYANT");
                        TOTAL_REMISEVO += object.getInt("TOTAL_REMISE");
                        NBVO += object.getInt("NB");
                        VENTE_BRUTVO += object.getLong("VENTE_BRUT");
                        TOTAL_ESPECEVO += object.getLong("TOTAL_ESPECE");
                        TOTAL_CHEQUEVO += object.getLong("TOTAL_CHEQUE");
                        TOTAL_CARTEBANCAIREVO += object.getLong("TOTAL_CARTEBANCAIRE");
                        VENTE_NETVO += object.getLong("VENTE_NET");
                        TOTAL_DIFFEREVO += object.getLong("TOTAL_DIFFERE");
                        TOTAL_CAISSEVO += object.getLong("TOTAL_CAISSE");
                        str_TYPE_VENTEVO = object.getString("str_TYPE_VENTE");
                    }
                }

                Long _PANIER_MOYEN = Math.round(Double.valueOf(VENTE_BRUT) / NB);
                JSONObject ob = new JSONObject();
                ob.put("VENTE_BRUT", VENTE_BRUT).put("TOTAL_DIFFERE", TOTAL_DIFFERE).put("TOTAL_REMISE", TOTAL_REMISE)
                        .put("VENTE_NET", VENTE_NET);
                ob.put("str_TYPE_VENTE", "VNO");
                ob.put("TOTAL_CAISSE", TOTAL_CAISSE);
                ob.put("NB", NB);
                ob.put("PANIER_MOYEN", _PANIER_MOYEN.intValue());
                ob.put("PART_TIERSPAYANT", 0);
                ob.put("TOTAL_ESPECE", TOTAL_ESPECE);
                ob.put("TOTAL_CHEQUE", TOTAL_CHEQUE);
                ob.put("TOTAL_CARTEBANCAIRE", TOTAL_CARTEBANCAIRE);
                array.put(ob);
                Long _PANIER_MOYENVO = Math.round(Double.valueOf(VENTE_BRUTVO) / NBVO);

                JSONObject obvo = new JSONObject();
                obvo.put("VENTE_BRUT", VENTE_BRUTVO).put("TOTAL_DIFFERE", TOTAL_DIFFEREVO)
                        .put("TOTAL_REMISE", TOTAL_REMISEVO).put("VENTE_NET", VENTE_NETVO);
                obvo.put("str_TYPE_VENTE", "VO");
                obvo.put("TOTAL_CAISSE", TOTAL_CAISSEVO);
                obvo.put("NB", NBVO);
                obvo.put("PANIER_MOYEN", _PANIER_MOYENVO.intValue());
                obvo.put("PART_TIERSPAYANT", PART_TIERSPAYANTVO);
                obvo.put("TOTAL_ESPECE", TOTAL_ESPECEVO);
                obvo.put("TOTAL_CHEQUE", TOTAL_CHEQUEVO);
                obvo.put("TOTAL_CARTEBANCAIRE", TOTAL_CARTEBANCAIREVO);
                array.put(obvo);
                double ration;
                double rat = 0.0;
                if (TOTALACHAT > 0) {
                    ration = (GLOBAL / TOTALACHAT);
                    rat = new BigDecimal(ration).setScale(2, RoundingMode.HALF_UP).doubleValue();
                }
                JSONObject totaux = new JSONObject();
                totaux.put("NB", NBT).put("GLOBALESP", GLOBALESP).put("GLOBALCB", GLOBALCB)
                        .put("TOTALMARGE", TOTALMARGE).put("GLOBALCQ", GLOBALCQ)
                        .put("GLOBAL", Double.valueOf(GLOBAL).intValue()).put("TOTALACHAT", TOTALACHAT)
                        .put("TOTALRATIO", rat).put("TOTALRATIO", rat);
                array.put(totaux);
            } catch (Exception e) {
                e.printStackTrace();
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return array;
    }

    public Integer getBalanceReglExclude(String dt_start, String dt_end, String typevente, String lgEmp, int AMOUNT2,
            String lgTYPEREGLEMENTID) {

        EntityManager em = getEntityManager();
        Integer diff = 0;
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TCashTransaction> root = cq.from(TCashTransaction.class);
            Join<TCashTransaction, TReglement> r = root.join("lgREGLEMENTID", JoinType.INNER);
            Subquery<String> sub = cq.subquery(String.class);
            Root<TPreenregistrement> pr = sub.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = pr.join("lgUSERID", JoinType.INNER);
            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.notLike(pr.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.bISCANCEL), false));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.strTYPEVENTE), typevente));
            predicate = cb.and(predicate, cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), lgTYPEREGLEMENTID));
            Predicate ge = cb.greaterThan(pr.get(TPreenregistrement_.intPRICE), 0);
            Predicate btw = cb.between(cb.function("DATE", Date.class, pr.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            sub.select(pr.get(TPreenregistrement_.lgPREENREGISTREMENTID)).where(predicate, btw, ge);

            Predicate ge2 = cb.greaterThan(root.get(TCashTransaction_.intAMOUNT), 0);

            cq.select(cb.sum(
                    (AMOUNT2 == 1 ? root.get(TCashTransaction_.intAMOUNT2) : root.get(TCashTransaction_.intACCOUNT))));

            cq.where(ge2, cb.in(root.get(TCashTransaction_.strRESSOURCEREF)).value(sub));

            Query q = em.createQuery(cq);
            diff = (Integer) q.getSingleResult();
            if (diff == null) {
                diff = 0;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return diff;

    }

    private EntityManager getEntityManager() {
        return OdataManager.getEm();
    }

    public JSONObject getVenteAnnuler(String dt_end, String typevente) {
        JSONObject json = new JSONObject();
        EntityManager em = this.getEntityManager();
        TCashTransaction cs = null;
        try {

            List<TPreenregistrement> list = em.createQuery(
                    "SELECT  o FROM TPreenregistrement o WHERE  FUNCTION('DATE', o.dtANNULER) =?1   AND o.lgTYPEVENTEID.lgTYPEVENTEID <> '5'  AND o.bISCANCEL=TRUE AND  FUNCTION('DATE',o.dtANNULER)> FUNCTION('DATE',o.dtUPDATED) AND o.strTYPEVENTE=?3 ")
                    .setParameter(1, java.sql.Date.valueOf(dt_end)).setParameter(3, typevente).getResultList();

            Integer montant = 0, montantES = 0, remise = 0, tp = 0, monantTTC = 0, cheques = 0, dif = 0, cb = 0;
            for (TPreenregistrement op : list) {
                Integer _amount;
                TPreenregistrementCompteClient diff = null;
                List<TRecettes> recetteses = new ArrayList<>();
                try {
                    diff = (TPreenregistrementCompteClient) em.createQuery(
                            "SELECT  o FROM TPreenregistrementCompteClient o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1 ")
                            .setParameter(1, op.getLgPREENREGISTREMENTID()).setMaxResults(1).getSingleResult();
                } catch (Exception e) {
                }

                try {
                    if (!op.getLgTYPEVENTEID().getLgTYPEVENTEID().equals("3")) {
                        recetteses = montantEspece(op.getLgPREENREGISTREMENTID(), em);
                    }

                } catch (Exception e) {
                }

                monantTTC += op.getIntACCOUNT();
                montant += (op.getIntACCOUNT() - op.getIntREMISEPARA());
                _amount = op.getIntACCOUNT() - op.getIntREMISEPARA();
                if (!recetteses.isEmpty()) {
                    String reg = op.getLgREGLEMENTID().getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID()
                            .getLgTYPEREGLEMENTID();
                    switch (reg) {
                    case "1":
                    case "4":
                        montantES += recetteses.stream().mapToInt((value) -> {
                            return value.getIntAMOUNT().intValue();
                        }).sum();
                        break;
                    case "2":
                        cheques += recetteses.stream().mapToInt((value) -> {
                            return value.getIntAMOUNT().intValue();
                        }).sum();
                        break;
                    case "3":
                        cb += recetteses.stream().mapToInt((value) -> {
                            return value.getIntAMOUNT().intValue();
                        }).sum();

                        break;

                    default:
                        break;

                    }

                }
                remise += op.getIntREMISEPARA();
                tp += (_amount - op.getIntCUSTPART());

                if (diff != null) {
                    dif += diff.getIntPRICERESTE();
                }

            }
            json.putOpt("montant", montant).putOpt("montantES", montantES).put("tp", tp).put("remise", remise)
                    .put("monantTTC", monantTTC).put("cb", cb).put("cheques", cheques).put("differe", dif);

        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getLocalizedMessage(), e);
        }
        return json;
    }

    private List<TRecettes> montantEspece(String lgTransactionID, EntityManager em) {
        List<TRecettes> recetteses = new ArrayList<>();
        try {
            TypedQuery<TRecettes> query = em.createQuery("SELECT o FROM TRecettes o WHERE o.strREFFACTURE = ?1",
                    TRecettes.class);
            query.setParameter(1, lgTransactionID);
            recetteses = query.getResultList();
        } catch (Exception e) {
        }

        return recetteses;
    }

    private JSONObject getVenteAnnulerExclude(String dt_end, String typevente) {
        JSONObject json = new JSONObject();
        EntityManager em = this.getEntityManager();
        TCashTransaction cs = null;
        try {

            List<TPreenregistrement> list = em.createQuery(
                    "SELECT  o FROM TPreenregistrement o WHERE  FUNCTION('DATE', o.dtANNULER) =?1   AND o.lgTYPEVENTEID.lgTYPEVENTEID <> '5'  AND o.bISCANCEL=TRUE AND  FUNCTION('DATE',o.dtANNULER)> FUNCTION('DATE',o.dtUPDATED) AND o.strTYPEVENTE=?3 ")
                    .setParameter(1, java.sql.Date.valueOf(dt_end)).setParameter(3, typevente).getResultList();

            Integer montant = 0, montantES = 0, remise = 0, tp = 0, monantTTC = 0, cheques = 0, dif = 0, cb = 0;
            for (TPreenregistrement op : list) {
                Integer _amount = 0;
                TPreenregistrementCompteClient diff = null;
                try {
                    diff = (TPreenregistrementCompteClient) em.createQuery(
                            "SELECT  o FROM TPreenregistrementCompteClient o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1 ")
                            .setParameter(1, op.getLgPREENREGISTREMENTID()).setMaxResults(1).getSingleResult();
                } catch (Exception e) {
                }

                try {
                    if (op.getLgTYPEVENTEID().getLgTYPEVENTEID().equals("3")) {
                        cs = (TCashTransaction) em
                                .createQuery("SELECT o FROM TCashTransaction o WHERE o.strRESSOURCEREF=?1")
                                .setParameter(1, op.getLgPREENREGISTREMENTID()).getSingleResult();
                    } else {
                        cs = (TCashTransaction) em.createQuery(
                                "SELECT o FROM TCashTransaction o WHERE o.strRESSOURCEREF=?1 AND o.intAMOUNTDEBIT =0 ")
                                .setParameter(1, op.getLgPREENREGISTREMENTID()).getSingleResult();
                    }

                } catch (Exception e) {
                }

                monantTTC += op.getIntACCOUNT();
                montant += (op.getIntACCOUNT() - op.getIntREMISEPARA());
                _amount = op.getIntACCOUNT() - op.getIntREMISEPARA();
                if (cs != null) {
                    String reg = cs.getLgTYPEREGLEMENTID();
                    switch (reg) {
                    case "1":
                    case "4":

                        montantES += (cs.getIntAMOUNT() > 0 ? cs.getIntACCOUNT() : 0);

                        break;
                    case "2":
                        cheques += (cs.getIntAMOUNT() > 0 ? cs.getIntACCOUNT() : 0);
                        break;
                    case "3":
                        cb += (cs.getIntAMOUNT() > 0 ? cs.getIntACCOUNT() : 0);
                        break;

                    default:
                        break;

                    }

                }
                remise += op.getIntREMISEPARA();
                tp += (_amount - op.getIntCUSTPART());

                if (diff != null) {
                    dif += diff.getIntPRICERESTE();
                }
            }
            json.putOpt("montant", montant).putOpt("montantES", montantES).put("tp", tp).put("remise", remise)
                    .put("monantTTC", monantTTC).put("cb", cb).put("cheques", cheques).put("differe", dif);

        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getLocalizedMessage(), e);
        }
        return json;
    }

    public JSONObject getBalanceRegl(String dt_start, String dt_end, String typevente, String lgEmp, int AMOUNT2) {
        JSONObject json = new JSONObject();
        EntityManager em = getEntityManager();

        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TCashTransaction> root = cq.from(TCashTransaction.class);
            Join<TCashTransaction, TReglement> r = root.join("lgREGLEMENTID", JoinType.INNER);
            Subquery<String> sub = cq.subquery(String.class);
            Root<TPreenregistrement> pr = sub.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = pr.join("lgUSERID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.notLike(pr.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.bISCANCEL), false));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.strTYPEVENTE), typevente));
            Predicate ge = cb.greaterThan(pr.get(TPreenregistrement_.intPRICE), 0);
            Predicate btw = cb.between(cb.function("DATE", Date.class, pr.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            sub.select(pr.get(TPreenregistrement_.lgPREENREGISTREMENTID)).where(predicate, btw, ge);
            Predicate ge2 = cb.greaterThan(root.get(TCashTransaction_.intAMOUNT), 0);
            cq.multiselect(
                    cb.selectCase()
                            .when(cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), "1"),
                                    cb.sum((AMOUNT2 == 1 ? root.get(TCashTransaction_.intAMOUNT2)
                                            : root.get(TCashTransaction_.intAMOUNT))))
                            .otherwise(0),
                    cb.selectCase()
                            .when(cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), "2"),
                                    cb.sum(root.get(TCashTransaction_.intAMOUNT)))
                            .otherwise(0),
                    cb.selectCase()
                            .when(cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), "3"),
                                    cb.sum(root.get(TCashTransaction_.intAMOUNT)))
                            .otherwise(0),
                    cb.selectCase().when(cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), "4"),
                            cb.sum(root.get(TCashTransaction_.intAMOUNT))).otherwise(0));
            cq.where(ge2, cb.in(root.get(TCashTransaction_.strRESSOURCEREF)).value(sub));

            Query q = em.createQuery(cq);

            List<Object[]> list = q.getResultList();
            list.forEach((t) -> {
                try {

                    json.putOpt("montantES", Integer.valueOf(t[0].toString()) + Integer.valueOf(t[3].toString()))
                            .put("Cheques", Integer.valueOf(t[1].toString()))
                            .put("cb", Integer.valueOf(t[2].toString()));

                } catch (JSONException ex) {
                    LOGGER.log(Level.SEVERE, ex.getLocalizedMessage(), ex);
                }
            });

        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getLocalizedMessage(), e);
        }
        return json;
    }

    public long getMontantAchats(String dt_start, String dt_end, String emp) {
        EntityManager em = this.getEntityManager();
        long achat = 0;
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();

            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TBonLivraison> root = cq.from(TBonLivraison.class);
            Join<TBonLivraison, TUser> us = root.join("lgUSERID", JoinType.INNER);
            Join<TBonLivraison, TOrder> or = root.join("lgORDERID", JoinType.INNER);
            Predicate criteria = cb.conjunction();

            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get("dtUPDATED")),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            criteria = cb.and(criteria, cb.equal(root.get(TBonLivraison_.strSTATUT), "is_Closed"));
            criteria = cb.and(criteria, cb.equal(us.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), emp));
            criteria = cb.and(criteria);

            cq.multiselect(cb.sumAsLong(root.get(TBonLivraison_.intHTTC)));
            cq.where(btw, criteria);

            Query q = em.createQuery(cq);
            Object _achat = (Object) q.getSingleResult();

            if (_achat != null) {
                achat = Long.valueOf(_achat.toString());
            }

        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getLocalizedMessage(), e);

        }

        return achat;
    }

    private long getMontantAchatsPara(String dt_start, String dt_end, String emp) {
        EntityManager em = this.getEntityManager();
        long achat = 0;
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();

            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TBonLivraisonDetail> root = cq.from(TBonLivraisonDetail.class);
            Join<TBonLivraisonDetail, TBonLivraison> us = root.join("lgBONLIVRAISONID", JoinType.INNER);

            Predicate criteria = cb.conjunction();

            Predicate btw = cb.between(cb.function("DATE", Date.class, us.get("dtUPDATED")),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            criteria = cb.and(criteria, cb.equal(us.get(TBonLivraison_.strSTATUT), "is_Closed"));
            criteria = cb.and(criteria, cb.equal(root.get("lgFAMILLEID").get("lgZONEGEOID").get("boolACCOUNT"), false));
            criteria = cb.and(criteria,
                    cb.equal(us.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), emp));
            criteria = cb.and(criteria);

            cq.multiselect(cb.sumAsLong(root.get(TBonLivraisonDetail_.intPAF)));
            cq.where(btw, criteria);

            Query q = em.createQuery(cq);
            Object _achat = (Object) q.getSingleResult();

            if (_achat != null) {
                achat = Long.valueOf(_achat.toString());
            }

        } catch (Exception e) {
            e.printStackTrace();

        }

        return achat;
    }

    private long getMarge(String dt_start, String dt_end, String emp) {
        EntityManager em = this.getEntityManager();
        long marge = 0;

        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();

            CriteriaQuery<TPreenregistrementDetail> cq = cb.createQuery(TPreenregistrementDetail.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> pr = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> prf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TCodeTva> tva = prf.join("lgCODETVAID", JoinType.INNER);
            Predicate criteria = cb.conjunction();

            Predicate btw = cb.between(
                    cb.function("DATE", Date.class, root.get("lgPREENREGISTREMENTID").get("dtUPDATED")),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            criteria = cb.and(criteria, cb.equal(root.get("lgPREENREGISTREMENTID").get("strSTATUT"), "is_Closed"));
            criteria = cb.and(criteria, cb.equal(root.get("lgPREENREGISTREMENTID").get("bISCANCEL"), false));
            criteria = cb.and(criteria,
                    cb.notLike(root.get("lgPREENREGISTREMENTID").get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            // criteria = cb.and(criteria,
            // cb.notLike(root.get("lgPREENREGISTREMENTID").get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "4"));
            Predicate pu = cb.greaterThan(root.get("lgPREENREGISTREMENTID").get("intPRICE"), 0);
            criteria = cb.and(criteria, cb.equal(
                    root.get("lgPREENREGISTREMENTID").get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    emp));

            cq.where(criteria, pu, btw);

            Query q = em.createQuery(cq);
            List<TPreenregistrementDetail> oblist = q.getResultList();

            Map<TCodeTva, List<TPreenregistrementDetail>> mysList = oblist.stream()
                    .collect(Collectors.groupingBy(s -> s.getLgFAMILLEID().getLgCODETVAID()));

            Double montHT2 = 0.0;
            Double TVA = 0.0;
            Integer montantAchat = 0;
            for (Map.Entry<TCodeTva, List<TPreenregistrementDetail>> entry : mysList.entrySet()) {
                TCodeTva key = entry.getKey();
                JSONObject json = new JSONObject();
                Double _montHT2 = 0.0;
                Double montTTC2 = 0.0;
                List<TPreenregistrementDetail> value = entry.getValue();
                for (TPreenregistrementDetail d : value) {

                    montHT2 += (Double.valueOf(d.getIntPRICE()) / (1 + (Double.valueOf(key.getIntVALUE()) / 100)));
                    montantAchat += (d.getLgFAMILLEID().getIntPAF() * d.getIntQUANTITY());
                }

            }

            marge = (Math.round(montHT2) - montantAchat);

        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, ex.getLocalizedMessage(), ex);
        }
        return marge;
    }

    private long getMargePara(String dt_start, String dt_end, String emp) {
        EntityManager em = this.getEntityManager();
        long marge = 0;

        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();

            CriteriaQuery<TPreenregistrementDetail> cq = cb.createQuery(TPreenregistrementDetail.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> pr = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> prf = root.join("lgFAMILLEID", JoinType.INNER);
            Join<TFamille, TCodeTva> tva = prf.join("lgCODETVAID", JoinType.INNER);
            Predicate criteria = cb.conjunction();

            Predicate btw = cb.between(
                    cb.function("DATE", Date.class, root.get("lgPREENREGISTREMENTID").get("dtUPDATED")),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            criteria = cb.and(criteria, cb.equal(root.get("lgPREENREGISTREMENTID").get("strSTATUT"), "is_Closed"));
            criteria = cb.and(criteria, cb.equal(root.get("lgPREENREGISTREMENTID").get("bISCANCEL"), false));
            criteria = cb.and(criteria,
                    cb.notLike(root.get("lgPREENREGISTREMENTID").get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            criteria = cb.and(criteria,
                    cb.notLike(root.get("lgPREENREGISTREMENTID").get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "2"));
            Predicate pu = cb.greaterThan(root.get("lgPREENREGISTREMENTID").get("intPRICE"), 0);
            criteria = cb.and(criteria, cb.equal(
                    root.get("lgPREENREGISTREMENTID").get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    emp));
            criteria = cb.and(criteria, cb.equal(root.get(TPreenregistrementDetail_.boolACCOUNT), false));
            cq.where(criteria, pu, btw);

            Query q = em.createQuery(cq);
            List<TPreenregistrementDetail> oblist = q.getResultList();

            Map<TCodeTva, List<TPreenregistrementDetail>> mysList = oblist.stream()
                    .collect(Collectors.groupingBy(s -> s.getLgFAMILLEID().getLgCODETVAID()));

            Double montHT2 = 0.0;
            Double TVA = 0.0;
            Integer montantAchat = 0;
            for (Map.Entry<TCodeTva, List<TPreenregistrementDetail>> entry : mysList.entrySet()) {
                TCodeTva key = entry.getKey();
                JSONObject json = new JSONObject();
                Double _montHT2 = 0.0;
                Double montTTC2 = 0.0;
                List<TPreenregistrementDetail> value = entry.getValue();
                for (TPreenregistrementDetail d : value) {

                    montHT2 += (Double.valueOf(d.getIntPRICE()) / (1 + (Double.valueOf(key.getIntVALUE()) / 100)));
                    montantAchat += (d.getLgFAMILLEID().getIntPAF() * d.getIntQUANTITY());
                }

            }

            marge = (Math.round(montHT2) - montantAchat);

        } catch (Exception ex) {
            LOGGER.log(Level.SEVERE, ex.getLocalizedMessage(), ex);
        }
        return marge;
    }

    private Integer getBalanceDiff(String dt_start, String dt_end, String typevente, String lgEmp) {
        EntityManager em = this.getEntityManager();
        Integer diff = 0;

        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);

            Root<TPreenregistrementCompteClient> root = cq.from(TPreenregistrementCompteClient.class);
            Join<TPreenregistrementCompteClient, TPreenregistrement> r = root.join("lgPREENREGISTREMENTID",
                    JoinType.INNER);
            Join<TPreenregistrementCompteClient, TUser> pu = root.join("lgUSERID", JoinType.INNER);

            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.equal(r.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.notLike(r.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            predicate = cb.and(predicate, cb.equal(r.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            Predicate ge = cb.greaterThan(r.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate, cb.equal(r.get(TPreenregistrement_.strTYPEVENTE), typevente));
            Predicate btw = cb.between(cb.function("DATE", Date.class, r.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            cq.select(cb.sum(root.get(TPreenregistrementCompteClient_.intPRICERESTE)));
            cq.where(predicate, btw, ge);
            Query q = em.createQuery(cq);

            diff = (Integer) q.getSingleResult();
            if (diff == null) {
                diff = 0;
            }

        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getLocalizedMessage(), e);
        }
        return diff;
    }

    public Integer getBalanceRegl(String dt_start, String dt_end, String typevente, String lgEmp, int AMOUNT2,
            String lgTYPEREGLEMENTID) {

        EntityManager em = getEntityManager();
        Integer diff = 0;
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TCashTransaction> root = cq.from(TCashTransaction.class);

            Join<TCashTransaction, TReglement> r = root.join("lgREGLEMENTID", JoinType.INNER);
            Subquery<String> sub = cq.subquery(String.class);
            Root<TPreenregistrement> pr = sub.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = pr.join("lgUSERID", JoinType.INNER);
            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.notLike(pr.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.bISCANCEL), false));
            predicate = cb.and(predicate, cb.equal(pr.get(TPreenregistrement_.strTYPEVENTE), typevente));
            predicate = cb.and(predicate, cb.equal(root.get(TCashTransaction_.lgTYPEREGLEMENTID), lgTYPEREGLEMENTID));
            Predicate ge = cb.greaterThan(pr.get(TPreenregistrement_.intPRICE), 0);
            Predicate btw = cb.between(cb.function("DATE", Date.class, pr.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            sub.select(pr.get(TPreenregistrement_.lgPREENREGISTREMENTID)).where(predicate, btw, ge);

            Predicate ge2 = cb.greaterThan(root.get(TCashTransaction_.intAMOUNT), 0);

            cq.select(cb.sum(
                    (AMOUNT2 == 1 ? root.get(TCashTransaction_.intAMOUNT2) : root.get(TCashTransaction_.intAMOUNT))));
            cq.where(ge2, cb.in(root.get(TCashTransaction_.strRESSOURCEREF)).value(sub));

            Query q = em.createQuery(cq);

            diff = (Integer) q.getSingleResult();
            if (diff == null) {
                diff = 0;
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getLocalizedMessage(), e);
        }
        return diff;

    }

    public JSONArray getBalance(LocalDate dt_start, LocalDate dt_end, String lgEmp, int isOk) {
        EntityManager em = this.getEntityManager();
        JSONArray array = new JSONArray();
        boolean period = true;

        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);

            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = root.join("lgUSERID", JoinType.INNER);
            Join<TPreenregistrement, TReglement> r = root.join("lgREGLEMENTID", JoinType.INNER);
            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            Predicate ge = cb.greaterThan(root.get(TPreenregistrement_.intPRICE), 0);
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            cq.multiselect(cb.sum(
                    (isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER) : root.get(TPreenregistrement_.intPRICE))),
                    cb.sum(root.get(TPreenregistrement_.intPRICEREMISE)), cb
                            .sum(cb.diff(
                                    (isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER)
                                            : root.get(TPreenregistrement_.intPRICE)),
                                    root.get(TPreenregistrement_.intPRICEREMISE))),
                    root.get(TPreenregistrement_.strTYPEVENTE), cb
                            .selectCase().when(
                                    cb.equal(root
                                            .get(TPreenregistrement_.strTYPEVENTE), "VO"),
                                    cb.sum(root.get(TPreenregistrement_.intCUSTPART)))
                            .otherwise(cb.sum(cb.diff(
                                    (isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER)
                                            : root.get(TPreenregistrement_.intPRICE)),
                                    root.get(TPreenregistrement_.intPRICEREMISE)))),
                    cb.count(root),
                    cb.quot(cb.sum((isOk == 1 ? root.get(TPreenregistrement_.intPRICEOTHER)
                            : root.get(TPreenregistrement_.intPRICE))), cb.count(root)),
                    cb.selectCase()
                            .when(cb.equal(root.get(TPreenregistrement_.strTYPEVENTE), "VO"),
                                    cb.sum(cb.diff(root.get(TPreenregistrement_.intPRICE),
                                            root.get(TPreenregistrement_.intCUSTPART))))
                            .otherwise(0))
                    .groupBy(root.get(TPreenregistrement_.strTYPEVENTE))
                    .orderBy(cb.desc(root.get(TPreenregistrement_.strTYPEVENTE)));
            cq.where(predicate, btw, ge);
            Query q = em.createQuery(cq);

            List<Object[]> list = q.getResultList();

            LocalDate x = dt_start;
            LocalDate y = dt_end;
            double percent = 0, Gbl = 0, vo = 0, vno = 0;
            int nb = 0;
            Integer totalcq = 0, totalcb = 0, totalEs = 0;
            for (Object[] t : list) {
                try {
                    // Integer TOTAL_DIFFERE = 0;
                    Integer VENTE_BRUT = Integer.valueOf(t[0] + ""), TOTAL_REMISE = Integer.valueOf(t[1] + ""),
                            VENTE_NET = Integer.valueOf(t[2] + ""), TOTAL_CAISSE = Integer.valueOf(t[4] + ""),
                            PANIER_MOYEN = Math.round(Double.valueOf(t[6] + "").intValue()),
                            PART_TIERSPAYANT = Integer.valueOf(t[7] + "");
                    Integer TOTAL_DIFFERE = getBalanceDiff(dt_start.toString(), dt_end.toString(), t[3] + "", lgEmp);

                    Integer montantES = getBalanceRegl(dt_start.toString(), dt_end.toString(), t[3] + "", lgEmp, isOk,
                            "1");
                    montantES = (montantES != null ? montantES : 0);
                    montantES += getBalanceRegl(dt_start.toString(), dt_end.toString(), t[3] + "", lgEmp, isOk, "4");

                    Integer Cheques = getBalanceRegl(dt_start.toString(), dt_end.toString(), t[3] + "", lgEmp, isOk,
                            "2");
                    Cheques = (Cheques != null ? Cheques : 0);
                    Integer cba = getBalanceRegl(dt_start.toString(), dt_end.toString(), t[3] + "", lgEmp, isOk, "3");
                    cba = (cba != null ? cba : 0);

                    if (y.compareTo(x) == 0) {
                        JSONObject json = getVenteAnnuler(dt_end.toString(), t[3] + "");

                        VENTE_BRUT -= json.getInt("monantTTC");
                        TOTAL_REMISE -= json.getInt("remise");
                        VENTE_NET -= json.getInt("montant");
                        TOTAL_CAISSE -= json.getInt("montantES");

                        PART_TIERSPAYANT -= json.getInt("tp");

                        montantES -= json.getInt("montantES");

                        Cheques -= json.getInt("cheques");
                        cba -= json.getInt("cb");
                        TOTAL_DIFFERE -= json.getInt("differe");
                        Long _PANIER_MOYEN = Math.round(Double.valueOf(VENTE_BRUT) / Integer.valueOf(t[5] + ""));
                        PANIER_MOYEN = _PANIER_MOYEN.intValue();

                    }
                    Gbl += VENTE_NET;
                    totalcq += Cheques;
                    totalcb += cba;
                    totalEs += montantES;

                    nb += Integer.valueOf(t[5] + "");
                    JSONObject ob = new JSONObject();
                    ob.put("VENTE_BRUT", VENTE_BRUT).put("TOTAL_DIFFERE", TOTAL_DIFFERE)
                            .put("TOTAL_REMISE", TOTAL_REMISE).put("VENTE_NET", VENTE_NET);
                    ob.put("str_TYPE_VENTE", t[3] + "");
                    ob.put("TOTAL_CAISSE", TOTAL_CAISSE);
                    ob.put("NB", Integer.valueOf(t[5] + ""));
                    ob.put("PANIER_MOYEN", PANIER_MOYEN);
                    ob.put("PART_TIERSPAYANT", PART_TIERSPAYANT);
                    if ("VNO".equals(t[3] + "")) {
                        ob.put("PART_TIERSPAYANT", 0);
                    }

                    ob.put("TOTAL_ESPECE", montantES);
                    ob.put("TOTAL_CHEQUE", Cheques);
                    ob.put("TOTAL_CARTEBANCAIRE", cba);

                    array.put(ob);
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, ex.getLocalizedMessage(), ex);
                }
            }
            JSONObject totaux = new JSONObject();
            double ration;
            long achat = getMontantAchats(dt_start.toString(), dt_end.toString(), lgEmp);
            long marge = getMarge(dt_start.toString(), dt_end.toString(), lgEmp);

            totaux.put("NB", nb).put("GLOBALESP", totalEs).put("GLOBALCB", totalcb).put("TOTALMARGE", marge)
                    .put("GLOBALCQ", totalcq).put("GLOBAL", Double.valueOf(Gbl).longValue()).put("TOTALACHAT", achat);
            array.put(totaux);
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getLocalizedMessage(), e);
        }
        return array;
    }

    public JSONArray getBalanceParaReport(String dt_start, String dt_end, String lgEmp) {
        EntityManager em = this.getEntityManager();
        JSONArray array = new JSONArray();
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);

            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = root.join("lgUSERID", JoinType.INNER);
            Join<TPreenregistrement, TReglement> r = root.join("lgREGLEMENTID", JoinType.INNER);
            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            predicate = cb.and(predicate, cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "2"));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            predicate = cb.and(predicate,
                    cb.notEqual(root.get(TPreenregistrement_.intPRICE), root.get(TPreenregistrement_.intACCOUNT)));

            Predicate ge = cb.greaterThan(root.get(TPreenregistrement_.intPRICE), 0);
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            cq.multiselect(
                    cb.sum(cb.diff(root.get(TPreenregistrement_.intPRICE), root.get(TPreenregistrement_.intACCOUNT))),
                    cb.sum(cb.diff(root.get(TPreenregistrement_.intPRICEREMISE),
                            root.get(TPreenregistrement_.intREMISEPARA))),
                    cb.sum(cb.diff(
                            cb.diff(root.get(TPreenregistrement_.intPRICE), root.get(TPreenregistrement_.intACCOUNT)),
                            cb.diff(root.get(TPreenregistrement_.intPRICEREMISE),
                                    root.get(TPreenregistrement_.intREMISEPARA)))),
                    root.get(TPreenregistrement_.strTYPEVENTE), cb.count(root),
                    cb.quot(cb.sum(
                            cb.diff(root.get(TPreenregistrement_.intPRICE), root.get(TPreenregistrement_.intACCOUNT))),
                            cb.count(root)),
                    cb.selectCase()
                            .when(cb.equal(root.get(TPreenregistrement_.strTYPEVENTE), "VO"),
                                    cb.sum(cb.diff(root.get(TPreenregistrement_.intPRICE),
                                            root.get(TPreenregistrement_.intACCOUNT))))
                            .otherwise(0))
                    .groupBy(root.get(TPreenregistrement_.strTYPEVENTE))
                    .orderBy(cb.desc(root.get(TPreenregistrement_.strTYPEVENTE)));
            cq.where(predicate, btw, ge);
            Query q = em.createQuery(cq);

            List<Object[]> list = q.getResultList();
            double percent = 0, Gbl = 0, vo = 0, vno = 0, VENTE_BRUT = 0;
            int nb = 0;

            for (Object[] t : list) {
                try {
                    // Integer TOTAL_DIFFERE = 0;
                    VENTE_BRUT = Integer.valueOf(t[0] + "");
                    Integer TOTAL_REMISE = Integer.valueOf(t[1] + ""), VENTE_NET = Integer.valueOf(t[2] + ""),
                            TOTAL_CAISSE = Integer.valueOf(t[4] + ""),
                            PANIER_MOYEN = Math.round(Double.valueOf(t[5] + "").intValue()),
                            PART_TIERSPAYANT = Integer.valueOf(t[6] + "");

                    nb += Integer.valueOf(t[4] + "");
                    JSONObject ob = new JSONObject();
                    ob.put("VENTE_BRUT", VENTE_BRUT).put("TOTAL_REMISE", 0).put("VENTE_NET", VENTE_BRUT);
                    ob.put("str_TYPE_VENTE", t[3] + "");
                    ob.put("TOTAL_CAISSE", TOTAL_CAISSE);
                    ob.put("NB", Integer.valueOf(t[4] + ""));
                    ob.put("PANIER_MOYEN", PANIER_MOYEN);
                    ob.put("PART_TIERSPAYANT", PART_TIERSPAYANT);
                    if ("VNO".equals(t[3] + "")) {
                        ob.put("PART_TIERSPAYANT", 0);
                    }
                    Gbl += VENTE_NET;
                    if (VENTE_BRUT > 0) {
                        array.put(ob);
                    }
                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, ex.getLocalizedMessage(), ex);
                }
            }

        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getLocalizedMessage(), e);
        }
        return array;
    }

    private Integer getCA(String dt_start, String dt_end, String lgEmp, boolean exclude) {
        Integer Amount = 0;
        try {
            EntityManager em = this.getEntityManager();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);

            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = root.join("lgUSERID", JoinType.INNER);
            // Join<TPreenregistrement, TReglement> pr = root.join("lgREGLEMENTID", JoinType.INNER);

            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            // predicate = cb.and(predicate, cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "4"));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            // predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.strTYPEVENTE), "VNO"));
            // predicate = cb.and(predicate, cb.or(cb.equal(pr.get("lgMODEREGLEMENTID").get("lgMODEREGLEMENTID"), "1"),
            // cb.equal(pr.get("lgMODEREGLEMENTID").get("lgMODEREGLEMENTID"), "2")));
            Predicate ge = cb.greaterThan(root.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate, ge);
            /*
             * if (exclude) { Predicate greaterThan = cb.greaterThan(cb.diff(root.get(TPreenregistrement_.intACCOUNT),
             * root.get(TPreenregistrement_.intREMISEPARA)), root.get(TPreenregistrement_.intPRICEOTHER)); predicate =
             * cb.and(predicate, greaterThan); } else { Predicate greaterthan =
             * cb.greaterThan(cb.diff(root.get(TPreenregistrement_.intPRICE),
             * root.get(TPreenregistrement_.intPRICEREMISE)), root.get(TPreenregistrement_.intPRICEOTHER)); predicate =
             * cb.and(predicate, greaterthan); }
             */
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtCREATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            predicate = cb.and(predicate, btw);
            /*
             * if (exclude) { cq.select(cb.sum(cb.diff(cb.diff(root.get(TPreenregistrement_.intACCOUNT),
             * root.get(TPreenregistrement_.intREMISEPARA)), root.get(TPreenregistrement_.intPRICEOTHER)))); } else {
             *
             * cq.select(cb.sum(cb.diff(cb.diff(root.get(TPreenregistrement_.intPRICE),
             * root.get(TPreenregistrement_.intPRICEREMISE)), root.get(TPreenregistrement_.intPRICEOTHER)))); }
             */
            cq.select(cb.sum(root.get(TPreenregistrement_.intPRICEOTHER)));

            cq.where(predicate);
            Query q = em.createQuery(cq);

            Amount = (Integer) q.getSingleResult();
            if (Amount == null) {
                Amount = 0;
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getLocalizedMessage(), e);
        }
        return Amount;
    }

    public JSONArray getTvaDatas(String dt_start, String dt_end) {
        JSONArray array = new JSONArray();
        TParameters KEY_PARAMS = null;
        boolean KEYTAKEINTOACCOUNT = false;
        Integer amountTORemove = 0;
        try {
            try {
                TParameters KEY_TAKE_INTO_ACCOUNT = this.getEntityManager().getReference(TParameters.class,
                        "KEY_TAKE_INTO_ACCOUNT");
                if (KEY_TAKE_INTO_ACCOUNT != null
                        && (Integer.valueOf(KEY_TAKE_INTO_ACCOUNT.getStrVALUE().trim()) == 1)) {
                    KEYTAKEINTOACCOUNT = true;
                }
                KEY_PARAMS = this.getEntityManager().getReference(TParameters.class, "KEY_PARAMS");

            } catch (Exception e) {
            }

            if (KEY_PARAMS != null && (Integer.valueOf(KEY_PARAMS.getStrVALUE().trim()) == 1)) {
                amountTORemove = getCA(dt_start, dt_end, "1", KEYTAKEINTOACCOUNT);
            }
            List<TPreenregistrementDetail> listprePreenregistrementsTVA18 = this.getTvaStatisticDatasByTVA(dt_start,
                    dt_end, KEYTAKEINTOACCOUNT, "2");

            long TVA = 0;
            long MONTANTTTC = 0;

            double MONTANTHT = 0.0;
            long GlobalTTC = 0;
            for (TPreenregistrementDetail value : listprePreenregistrementsTVA18) {
                MONTANTTTC += value.getIntPRICE();
                MONTANTHT += (value.getIntPRICE() / (1.18));
            }

            long _MONTANTHT = Math.round(MONTANTHT);
            TVA = MONTANTTTC - _MONTANTHT;
            JSONObject json = new JSONObject();
            json.put("id", 1);
            json.put("TAUX", 18);
            json.put("Total HT", _MONTANTHT);
            json.put("Total TVA", TVA);
            json.put("Total TTC", MONTANTTTC);
            GlobalTTC += MONTANTTTC;
            array.put(json);
            MONTANTTTC = 0;
            List<TPreenregistrementDetail> listprePreenregistrements = this.getTvaStatisticDatasByTVA(dt_start, dt_end,
                    KEYTAKEINTOACCOUNT, "1");
            MONTANTTTC = listprePreenregistrements.stream().mapToLong((value) -> {
                return value.getIntPRICE();
            }).sum();
            GlobalTTC += MONTANTTTC;
            long _ttc = GlobalTTC - amountTORemove;
            MONTANTTTC -= _ttc;
            json = new JSONObject();
            json.put("id", 2);
            json.put("TAUX", 0);
            json.put("Total HT", MONTANTTTC);
            json.put("Total TVA", 0);
            json.put("Total TTC", MONTANTTTC);
            array.put(json);

        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getLocalizedMessage(), e);
        }

        return array;
    }

    public List<TPreenregistrementDetail> getTvaStatisticDatasByTVA(String dt_start, String dt_end,
            boolean KEYTAKEINTOACCOUNT, String tva) {
        List<TPreenregistrementDetail> listprePreenregistrements = new ArrayList<>();

        try {
            EntityManager em = this.getEntityManager();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TPreenregistrementDetail> cq = cb.createQuery(TPreenregistrementDetail.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root.join("lgPREENREGISTREMENTID",
                    JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> products = root.join("lgFAMILLEID", JoinType.INNER);

            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate,
                    cb.equal(join.get(TPreenregistrement_.strSTATUT), commonparameter.statut_is_Closed));
            predicate = cb.and(predicate, cb.equal(join.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.equal(products.get("lgCODETVAID").get("lgCODETVAID"), tva));
            predicate = cb.and(predicate,
                    cb.notLike(join.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), Parameter.VENTE_DEPOT_EXTENSION));
            // predicate = cb.and(predicate, cb.notLike(join.get("lgTYPEVENTEID").get("lgTYPEVENTEID"),
            // Parameter.VENTE_DEPOT_AGREE));
            predicate = cb.and(predicate, cb.equal(
                    root.get("lgPREENREGISTREMENTID").get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    "1"));
            Predicate ge = cb.greaterThan(join.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate, ge);
            if (KEYTAKEINTOACCOUNT) {
                predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrementDetail_.boolACCOUNT), Boolean.TRUE));
            }
            Predicate btw = cb.between(cb.function("DATE", Date.class, join.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            predicate = cb.and(predicate, btw);
            cq.select(root);

            cq.where(predicate);

            Query q = em.createQuery(cq);

            listprePreenregistrements = q.getResultList();

        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getLocalizedMessage(), e);
        }

        return listprePreenregistrements;
    }

    public JSONArray getTvaDatasReport(String dt_start, String dt_end) {
        JSONArray array = new JSONArray();
        TParameters KEY_PARAMS = null;
        boolean KEYTAKEINTOACCOUNT = false;
        Integer amountTORemove = 0;
        try {
            try {
                TParameters KEY_TAKE_INTO_ACCOUNT = this.getEntityManager().getReference(TParameters.class,
                        "KEY_TAKE_INTO_ACCOUNT");
                if (KEY_TAKE_INTO_ACCOUNT != null
                        && (Integer.valueOf(KEY_TAKE_INTO_ACCOUNT.getStrVALUE().trim()) == 1)) {
                    KEYTAKEINTOACCOUNT = true;
                }
                KEY_PARAMS = this.getEntityManager().getReference(TParameters.class, "KEY_PARAMS");

            } catch (Exception e) {
            }

            if (KEY_PARAMS != null && (Integer.valueOf(KEY_PARAMS.getStrVALUE().trim()) == 1)) {
                amountTORemove = getCA(dt_start, dt_end, "1", KEYTAKEINTOACCOUNT);
            }
            List<TPreenregistrementDetail> listprePreenregistrementsTVA18 = this.getTvaStatisticDatasByTVA(dt_start,
                    dt_end, KEYTAKEINTOACCOUNT, "2");

            long TVA = 0;
            long MONTANTTTC = 0;

            double MONTANTHT = 0.0;
            long GlobalTTC = 0;
            for (TPreenregistrementDetail value : listprePreenregistrementsTVA18) {
                MONTANTTTC += value.getIntPRICE();
                MONTANTHT += (value.getIntPRICE() / (1.18));
            }

            long _MONTANTHT = Math.round(MONTANTHT);
            TVA = MONTANTTTC - _MONTANTHT;
            JSONObject json = new JSONObject();
            json.put("id", 1);
            json.put("TAUX", 18);
            json.put("TotalHT", _MONTANTHT);
            json.put("TotalTVA", TVA);
            json.put("TotalTTC", MONTANTTTC);
            GlobalTTC += MONTANTTTC;
            array.put(json);
            MONTANTTTC = 0;
            List<TPreenregistrementDetail> listprePreenregistrements = this.getTvaStatisticDatasByTVA(dt_start, dt_end,
                    KEYTAKEINTOACCOUNT, "1");
            MONTANTTTC = listprePreenregistrements.stream().mapToLong((value) -> {
                return value.getIntPRICE();
            }).sum();
            GlobalTTC += MONTANTTTC;
            long _ttc = GlobalTTC - amountTORemove;
            MONTANTTTC -= _ttc;
            json = new JSONObject();
            json.put("id", 2);
            json.put("TAUX", 0);
            json.put("TotalHT", MONTANTTTC);
            json.put("TotalTVA", 0);
            json.put("TotalTTC", MONTANTTTC);
            array.put(json);

        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getLocalizedMessage(), e);
        }

        return array;
    }

    private JSONArray getBalancePara(String dt_start, String dt_end, String lgEmp) {
        EntityManager em = this.getEntityManager();
        JSONArray array = new JSONArray();
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            Join<TPreenregistrement, TUser> pu = root.join("lgUSERID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(pu.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEmp));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            predicate = cb.and(predicate, cb.notLike(root.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "2"));
            predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            predicate = cb.and(predicate,
                    cb.notEqual(root.get(TPreenregistrement_.intPRICE), root.get(TPreenregistrement_.intACCOUNT)));
            Predicate ge = cb.greaterThan(root.get(TPreenregistrement_.intPRICE), 0);
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            cq.multiselect(
                    cb.sum(cb.diff(root.get(TPreenregistrement_.intPRICE), root.get(TPreenregistrement_.intACCOUNT))),
                    cb.sum(cb.diff(root.get(TPreenregistrement_.intPRICEREMISE),
                            root.get(TPreenregistrement_.intREMISEPARA))),
                    cb.sum(cb.diff(
                            cb.diff(root.get(TPreenregistrement_.intPRICE), root.get(TPreenregistrement_.intACCOUNT)),
                            cb.diff(root.get(TPreenregistrement_.intPRICEREMISE),
                                    root.get(TPreenregistrement_.intREMISEPARA)))),
                    root.get(TPreenregistrement_.strTYPEVENTE), cb.count(root),
                    cb.quot(cb.sum(
                            cb.diff(root.get(TPreenregistrement_.intPRICE), root.get(TPreenregistrement_.intACCOUNT))),
                            cb.count(root)),
                    cb.selectCase()
                            .when(cb.equal(root.get(TPreenregistrement_.strTYPEVENTE), "VO"),
                                    cb.sum(cb.diff(root.get(TPreenregistrement_.intPRICE),
                                            root.get(TPreenregistrement_.intACCOUNT))))
                            .otherwise(0))
                    .groupBy(root.get(TPreenregistrement_.strTYPEVENTE))
                    .orderBy(cb.desc(root.get(TPreenregistrement_.strTYPEVENTE)));
            cq.where(predicate, btw, ge);
            Query q = em.createQuery(cq);

            List<Object[]> list = q.getResultList();
            double percent = 0, Gbl = 0, vo = 0, vno = 0, VENTE_BRUT = 0;
            int nb = 0;

            for (Object[] t : list) {
                try {
                    // Integer TOTAL_DIFFERE = 0;
                    System.out.println("t[0] " + t[0] + " t[1] " + t[1] + " t[2] " + t[2]);
                    VENTE_BRUT = Integer.valueOf(t[0] + "");
                    Integer TOTAL_REMISE = Integer.valueOf(t[1] + ""), VENTE_NET = Integer.valueOf(t[2] + ""),
                            TOTAL_CAISSE = Integer.valueOf(t[4] + ""),
                            PANIER_MOYEN = Math.round(Double.valueOf(t[5] + "").intValue()),
                            PART_TIERSPAYANT = Integer.valueOf(t[6] + "");

                    nb += Integer.valueOf(t[4] + "");
                    JSONObject ob = new JSONObject();
                    if (VENTE_BRUT > 0) {
                        ob.put("VENTE_BRUT", VENTE_BRUT).put("TOTAL_REMISE", TOTAL_REMISE).put("VENTE_NET", VENTE_NET);
                        ob.put("str_TYPE_VENTE", t[3] + "");
                        ob.put("TOTAL_CAISSE", TOTAL_CAISSE);
                        ob.put("NB", Integer.valueOf(t[4] + ""));
                        ob.put("PANIER_MOYEN", PANIER_MOYEN);
                        ob.put("PART_TIERSPAYANT", PART_TIERSPAYANT);
                        if ("VNO".equals(t[3] + "")) {
                            ob.put("PART_TIERSPAYANT", 0);
                        }
                        Gbl += VENTE_NET;
                        array.put(ob);
                    }

                } catch (Exception ex) {
                    LOGGER.log(Level.SEVERE, ex.getLocalizedMessage(), ex);
                }
            }
            if (VENTE_BRUT > 0) {
                JSONObject totaux = new JSONObject();
                double ration;
                long achat = getMontantAchatsPara(dt_start, dt_end, lgEmp);
                long marge = getMargePara(dt_start, dt_end, lgEmp);
                double rat = 0.0;
                if (achat > 0) {
                    ration = (Gbl / achat);
                    rat = new BigDecimal(ration).setScale(2, RoundingMode.HALF_UP).doubleValue();
                }
                totaux.put("NB", nb).put("TOTALMARGE", marge).put("GLOBAL", Gbl).put("TOTALACHAT", achat)
                        .put("TOTALRATIO", rat);
                array.put(totaux);
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, e.getLocalizedMessage(), e);
        }
        return array;
    }

}
