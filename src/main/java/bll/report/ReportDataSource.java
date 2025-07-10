/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.report;

import dal.TClient;
import dal.TCompteClientTiersPayant;
import dal.TFacture;
import dal.TOfficine;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TTiersPayant;
import dal.TTypeMvtCaisse;
import dal.dataManager;
import java.io.FileWriter;
import java.io.IOException;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.persistence.EntityManager;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.utils.Util;
import toolkits.utils.conversion;
import toolkits.utils.jdom;

/**
 *
 * @author KKOFFI
 */
public class ReportDataSource {

    static final DateFormat DATEFORMAT = new SimpleDateFormat("dd/MM/yyyy");
    static final DateFormat DATEFORMATYYYY = new SimpleDateFormat("yyyy-MM-dd");

    public static boolean generateJSON(String lgFACTURE, String fileName) {
        boolean isDouble = false;
        EntityManager em = getEntityManager();
        TFacture facture = em.find(TFacture.class, lgFACTURE);
        final TTiersPayant payant = em.find(TTiersPayant.class, facture.getStrCUSTOMER());
        JSONObject json = new JSONObject();

        List<TPreenregistrementCompteClientTiersPayent> clientTiersPayents = getDetails(lgFACTURE);
        Map<TPreenregistrement, List<TPreenregistrementCompteClientTiersPayent>> mapList = clientTiersPayents.stream()
                .sorted((e1, e2) -> e1.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID().getLgCLIENTID()
                        .getStrFIRSTNAME().compareToIgnoreCase(e2.getLgCOMPTECLIENTTIERSPAYANTID().getLgCOMPTECLIENTID()
                                .getLgCLIENTID().getStrFIRSTNAME()))
                .collect(Collectors.groupingBy(s -> s.getLgPREENREGISTREMENTID()));
        JSONArray datas = new JSONArray();

        clientTiersPayents.forEach((ps) -> {
            JSONObject line = new JSONObject();
            TPreenregistrementCompteClientTiersPayent other;
            TCompteClientTiersPayant cmother = null;
            String MATSECOND = "";
            Integer MontantSecond = 0;
            try {
                TPreenregistrement op = ps.getLgPREENREGISTREMENTID();
                other = getROPreenregistrement(op.getLgPREENREGISTREMENTID(),
                        ps.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());

                if (other != null) {
                    cmother = other.getLgCOMPTECLIENTTIERSPAYANTID();
                }
                line.put("Date", op.getDtUPDATED());
                TCompteClientTiersPayant cm = ps.getLgCOMPTECLIENTTIERSPAYANTID();
                TTiersPayant mcitp = cm.getLgTIERSPAYANTID();
                line.putOnce("Bon", ps.getStrREFBON());
                TClient cl = cm.getLgCOMPTECLIENTID().getLgCLIENTID();

                try {

                    if (other != null) {
                        MATSECOND = cmother.getStrNUMEROSECURITESOCIAL();
                        MontantSecond = other.getIntPRICE();
                    }
                    line.putOnce("MATSECOND", MATSECOND);
                    line.putOnce("MATRO", (cl.getStrADRESSE() != null ? cl.getStrADRESSE() : ""));
                    line.putOnce("MontantSecond", MontantSecond);

                    line.putOnce("MontantOwner", ps.getIntPRICE());
                    line.putOnce("SALARIE",
                            (cm.getStrNUMEROSECURITESOCIAL() != null ? cm.getStrNUMEROSECURITESOCIAL() : ""));
                    line.putOnce("FIRSTNAME", cl.getStrFIRSTNAME() + " " + cl.getStrLASTNAME());
                    line.putOnce("Montant", op.getIntPRICE());
                    line.putOnce("LGClient", cl.getLgCLIENTID());

                } catch (JSONException ex) {
                    ex.printStackTrace();
                }

            } catch (JSONException ex) {
                Logger.getLogger(ReportDataSource.class.getName()).log(Level.SEVERE, null, ex);
            }
            datas.put(line);
        });
        try {
            json.put("invoice", datas);

        } catch (JSONException ex) {

        }
        try (FileWriter file = new FileWriter("D:/invoice.json")) {

            file.write(json.toString());
            file.flush();

        } catch (IOException e) {
            e.printStackTrace();
        }
        return isDouble;
    }

    public static EntityManager getEntityManager() {
        dataManager m = new dataManager();
        m.initEntityManager();
        return m.getEm();
    }

    public static List<TPreenregistrementCompteClientTiersPayent> getDetails(String id) {
        try {
            EntityManager em = getEntityManager();
            return em.createQuery(
                    "SELECT p FROM TPreenregistrementCompteClientTiersPayent p, TFactureDetail o WHERE p.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID=o.strREF AND o.lgFACTUREID.lgFACTUREID=?1 ORDER BY p.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strFIRSTNAME,p.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.strLASTNAME ASC  ,p.lgCOMPTECLIENTTIERSPAYANTID.intPRIORITY DESC   ")
                    .setParameter(1, id).getResultList();
        } finally {
        }
    }

    public static JSONObject generateJSON(String lgFACTURE) {

        EntityManager em = getEntityManager();
        TFacture facture = em.find(TFacture.class, lgFACTURE);
        final TTiersPayant payant = em.find(TTiersPayant.class, facture.getStrCUSTOMER());
        JSONObject json = new JSONObject();

        List<TPreenregistrementCompteClientTiersPayent> clientTiersPayents = getDetails(lgFACTURE);

        JSONArray datas = new JSONArray();
        List<String> s = new ArrayList<>();
        clientTiersPayents.forEach((ps) -> {
            JSONObject line = new JSONObject();
            TPreenregistrementCompteClientTiersPayent other;
            TCompteClientTiersPayant cmother = null;
            String MATSECOND = "";
            Integer MontantSecond = 0;
            try {
                TPreenregistrement op = ps.getLgPREENREGISTREMENTID();
                other = getROPreenregistrement(op.getLgPREENREGISTREMENTID(),
                        ps.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());

                if (other != null) {
                    cmother = other.getLgCOMPTECLIENTTIERSPAYANTID();
                    if (s.size() == 0) {
                        s.add(cmother.getLgTIERSPAYANTID().getStrNAME());
                    }
                }
                // line.put("Date", DATEFORMAT.format(op.getDtUPDATED()));
                line.put("Date", LocalDate.parse(DATEFORMATYYYY.format(op.getDtUPDATED()), DateTimeFormatter.ISO_DATE));
                TCompteClientTiersPayant cm = ps.getLgCOMPTECLIENTTIERSPAYANTID();
                TTiersPayant mcitp = cm.getLgTIERSPAYANTID();
                line.putOnce("Bon", ps.getStrREFBON());
                TClient cl = cm.getLgCOMPTECLIENTID().getLgCLIENTID();

                try {

                    if (other != null) {
                        MATSECOND = cmother.getStrNUMEROSECURITESOCIAL();
                        MontantSecond = other.getIntPRICE();
                    }
                    line.putOnce("MATSECOND", MATSECOND);
                    line.putOnce("MATRO", (cl.getStrADRESSE() != null ? cl.getStrADRESSE() : ""));
                    line.putOnce("MontantSecond", Util.getFormattedIntegerValue(MontantSecond));

                    line.putOnce("MontantOwner", Util.getFormattedIntegerValue(ps.getIntPRICE()));
                    line.putOnce("SALARIE",
                            (cm.getStrNUMEROSECURITESOCIAL() != null ? cm.getStrNUMEROSECURITESOCIAL() : ""));
                    line.putOnce("FIRSTNAME", cl.getStrFIRSTNAME() + " " + cl.getStrLASTNAME());
                    line.putOnce("Montant", Util.getFormattedIntegerValue(op.getIntPRICE()));
                    line.putOnce("LGClient", cm.getLgCOMPTECLIENTTIERSPAYANTID());

                } catch (JSONException ex) {
                    ex.printStackTrace();
                }

            } catch (JSONException ex) {
                Logger.getLogger(ReportDataSource.class.getName()).log(Level.SEVERE, null, ex);
            }
            datas.put(line);
        });

        try {
            json.put("invoice", new JSONObject().put("invoice", datas));
            json.put("TPSHORTNAME", payant.getStrNAME());
            json.put("seconLabel", s.get(0));
        } catch (JSONException ex) {

        }

        return json;
    }

    public static JSONObject generateJSON(TFacture facture) {

        EntityManager em = getEntityManager();

        final TTiersPayant payant = em.find(TTiersPayant.class, facture.getStrCUSTOMER());
        JSONObject json = new JSONObject();

        List<TPreenregistrementCompteClientTiersPayent> clientTiersPayents = getDetails(facture.getLgFACTUREID());

        JSONArray datas = new JSONArray();
        List<String> s = new ArrayList<>();
        clientTiersPayents.forEach((ps) -> {
            JSONObject line = new JSONObject();
            TPreenregistrementCompteClientTiersPayent other;
            TCompteClientTiersPayant cmother = null;
            String MATSECOND = "";
            Integer MontantSecond = 0;
            try {
                TPreenregistrement op = ps.getLgPREENREGISTREMENTID();
                other = getROPreenregistrement(op.getLgPREENREGISTREMENTID(),
                        ps.getLgPREENREGISTREMENTCOMPTECLIENTPAYENTID());

                if (other != null) {
                    cmother = other.getLgCOMPTECLIENTTIERSPAYANTID();
                    if (s.size() == 0) {
                        s.add(cmother.getLgTIERSPAYANTID().getStrNAME());
                    }
                }
                // line.put("Date", DATEFORMAT.format(op.getDtUPDATED()));
                line.put("Date", LocalDate.parse(DATEFORMATYYYY.format(op.getDtUPDATED()), DateTimeFormatter.ISO_DATE));
                TCompteClientTiersPayant cm = ps.getLgCOMPTECLIENTTIERSPAYANTID();
                TTiersPayant mcitp = cm.getLgTIERSPAYANTID();
                line.putOnce("Bon", ps.getStrREFBON());
                TClient cl = cm.getLgCOMPTECLIENTID().getLgCLIENTID();

                try {

                    if (other != null) {
                        MATSECOND = cmother.getStrNUMEROSECURITESOCIAL();
                        MontantSecond = other.getIntPRICE();
                    }
                    line.putOnce("MATSECOND", MATSECOND);
                    line.putOnce("MATRO", (cl.getStrADRESSE() != null ? cl.getStrADRESSE() : ""));
                    line.putOnce("MontantSecond", Util.getFormattedIntegerValue(MontantSecond));

                    line.putOnce("MontantOwner", Util.getFormattedIntegerValue(ps.getIntPRICE()));
                    line.putOnce("SALARIE",
                            (cm.getStrNUMEROSECURITESOCIAL() != null ? cm.getStrNUMEROSECURITESOCIAL() : ""));
                    line.putOnce("FIRSTNAME", cl.getStrFIRSTNAME() + " " + cl.getStrLASTNAME());
                    line.putOnce("Montant", Util.getFormattedIntegerValue(op.getIntPRICE()));
                    line.putOnce("LGClient", cm.getLgCOMPTECLIENTTIERSPAYANTID());

                } catch (JSONException ex) {
                    ex.printStackTrace();
                }

            } catch (JSONException ex) {
                Logger.getLogger(ReportDataSource.class.getName()).log(Level.SEVERE, null, ex);
            }
            datas.put(line);
        });

        try {
            json.put("invoice", new JSONObject().put("invoice", datas));
            json.put("TPSHORTNAME", payant.getStrNAME());
            json.put("seconLabel", s.get(0));
        } catch (JSONException ex) {

        }

        return json;
    }

    public static Map<String, Object> getParametters(String lg_FACTURE_ID) {

        Map<String, Object> parameters = new HashMap<>();
        try {
            EntityManager em = getEntityManager();

            TOfficine oTOfficine = em.find(dal.TOfficine.class, "1");
            TFacture OFacture = em.find(TFacture.class, lg_FACTURE_ID);
            TTiersPayant OTiersPayant = em.find(TTiersPayant.class, OFacture.getStrCUSTOMER());
            TTypeMvtCaisse OTypeMvtCaisse = em.find(TTypeMvtCaisse.class,
                    OFacture.getLgTYPEFACTUREID().getLgTYPEFACTUREID());
            String P_H_INSTITUTION = oTOfficine.getStrNOMABREGE();
            String P_INSTITUTION_ADRESSE = oTOfficine.getStrADRESSSEPOSTALE();
            String P_H_CLT_INFOS = "PERIODE DU " + DATEFORMAT.format(OFacture.getDtDEBUTFACTURE()) + " AU "
                    + DATEFORMAT.format(OFacture.getDtFINFACTURE());
            String P_H_LOGO = jdom.scr_report_file_logo;
            parameters.put("P_H_LOGO", P_H_LOGO);
            parameters.put("P_H_INSTITUTION", P_H_INSTITUTION);

            parameters.put("P_PRINTED_BY", " LE PHARMACIEN ");
            parameters.put("P_AUTRE_DESC", oTOfficine.getStrFIRSTNAME() + " " + oTOfficine.getStrLASTNAME());
            parameters.put("P_H_CLT_INFOS", P_H_CLT_INFOS);

            parameters.put("P_LG_FACTURE_ID", lg_FACTURE_ID);

            parameters.put("P_LG_TIERS_PAYANT_ID", OTiersPayant.getLgTIERSPAYANTID());
            parameters.put("P_CODE_FACTURE",
                    "FACTURE N° " + OFacture.getStrCODEFACTURE() + " (" + OTiersPayant.getStrNAME() + ")");
            parameters.put("P_TIERS_PAYANT_NAME", OTiersPayant.getStrFULLNAME());
            parameters.put("P_CODE_COMPTABLE", "CODE COMPTABLE : " + OTypeMvtCaisse.getStrCODECOMPTABLE());
            String P_FOOTER_RC = "";
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
                        ? "Tel: " + conversion.PhoneNumberFormat("+225", oTOfficine.getStrPHONE()) : "";
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
            parameters.put("P_CODE_POSTALE",
                    (OTiersPayant.getStrADRESSE() != null && !"".equals(OTiersPayant.getStrADRESSE()))
                            ? OTiersPayant.getStrADRESSE() : "");
            parameters.put("P_COMPTE_CONTRIBUABLE",
                    (OTiersPayant.getStrCOMPTECONTRIBUABLE() != null
                            && !"".equals(OTiersPayant.getStrCOMPTECONTRIBUABLE()))
                                    ? "N ° CC :" + OTiersPayant.getStrCOMPTECONTRIBUABLE() : "");
            parameters.put("P_CODE_OFFICINE",
                    (OTiersPayant.getStrCODEOFFICINE() != null && !"".equals(OTiersPayant.getStrCODEOFFICINE()))
                            ? "N ° CO :" + OTiersPayant.getStrCODEOFFICINE() : "");
            parameters.put("P_REGISTRE_COMMERCE",
                    (OTiersPayant.getStrREGISTRECOMMERCE() != null && !"".equals(OTiersPayant.getStrREGISTRECOMMERCE()))
                            ? "N ° RC :" + OTiersPayant.getStrREGISTRECOMMERCE() : "");

        } catch (Exception e) {
        }
        return parameters;
    }

    public static TPreenregistrementCompteClientTiersPayent getROPreenregistrement(String idVente, String lgPree) {
        TPreenregistrementCompteClientTiersPayent payent = null;
        try {
            EntityManager em = getEntityManager();
            payent = em.createQuery(
                    "SELECT o FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1 AND o.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID <> ?2",
                    TPreenregistrementCompteClientTiersPayent.class).setParameter(1, idVente).setParameter(2, lgPree)
                    .getSingleResult();
        } catch (Exception e) {
            // e.printStackTrace();
        }
        return payent;
    }
}
