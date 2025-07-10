/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import bll.preenregistrement.Preenregistrement;
import com.itextpdf.text.pdf.Barcode128;
import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.Params;
import dal.MvtTransaction;
import dal.TAyantDroit;
import dal.TClient;
import dal.TDossierReglement;
import dal.TDossierReglementDetail;
import dal.TEmplacement;
import dal.TFacture;
import dal.TImprimante;
import dal.TOfficine;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClient;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementDetail;
import dal.TTiersPayant;
import dal.TTypeMvtCaisse;
import dal.TTypeReglement;
import dal.TUser;
import dal.VenteReglement;
import dal.dataManager;
import dal.enumeration.TypeTransaction;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.print.PrinterException;
import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.EnumSet;
import java.util.LinkedList;
import java.util.List;
import java.util.ListIterator;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.imageio.ImageIO;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.Tuple;
import javax.persistence.TypedQuery;
import javax.print.PrintService;
import javax.print.PrintServiceLookup;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.GenerateTicketService;
import rest.service.SessionHelperService;
import rest.service.SmsService;
import rest.service.VenteReglementService;
import rest.service.dto.ModePaymentAmount;
import rest.service.dto.TicketRecap;
import rest.service.dto.TicketRecapWrapper;
import rest.service.dto.TicketZDTO;
import toolkits.utils.Maths;
import toolkits.utils.StringComplexUtils.DataStringManager;
import toolkits.utils.jdom;
import util.Afficheur;
import util.CommonUtils;
import util.Constant;

import util.DateConverter;
import util.FunctionUtils;
import util.NumberUtils;

/**
 *
 * @author Kobena
 */
@Stateless
public class GenerateTicketServiceImpl implements GenerateTicketService {

    private static final Logger LOG = Logger.getLogger(GenerateTicketServiceImpl.class.getName());
    private static final String BREAK_LINE = "; F CFA;;0;1";
    private static final String BREAK_LINE2 = ";F CFA;;1;1";
    private static final String BREAK_LINE_FOOTER = "; F CFA;;1;1;G";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private VenteReglementService venteReglementService;
    @EJB
    private SessionHelperService sessionHelperService;
    @EJB
    private SmsService smsService;

    private File buildBarecode(String data) {
        try {
            Barcode128 barcode128 = new Barcode128();
            barcode128.setCode(data);
            barcode128.setBaseline(10);
            barcode128.setBarHeight(50);
            barcode128.setCodeType(Barcode128.CODE128);
            java.awt.Image img = barcode128.createAwtImage(Color.BLACK, Color.WHITE);
            BufferedImage bi = new BufferedImage(100, 70, BufferedImage.BITMASK);
            Graphics2D gd = bi.createGraphics();
            gd.drawImage(img, 4, 2, null);
            gd.setColor(Color.BLACK);
            gd.drawString(data, 10, 65);
            gd.dispose();
            File f = new File(jdom.barecode_file + "" + data + ".png");
            ImageIO.write(bi, "png", f);
            return f;

        } catch (IOException e) {
            LOG.log(Level.INFO,
                    "Le lien des barcode n'est pas correcte dans le fichier de configuration ----------- {0}",
                    jdom.barecode_file);

            return null;

        }
    }

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public String buildLineBarecode(String data) {
        String file = null;
        try {

            Barcode128 barcode128 = new Barcode128();
            barcode128.setCode(data);
            barcode128.setBaseline(10);
            barcode128.setBarHeight(50);
            barcode128.setCodeType(Barcode128.CODE128);
            java.awt.Image img = barcode128.createAwtImage(Color.BLACK, Color.WHITE);
            BufferedImage bi = new BufferedImage(100, 70, BufferedImage.BITMASK);
            Graphics2D gd = bi.createGraphics();
            gd.drawImage(img, 4, 2, null);
            gd.setColor(Color.BLACK);
            gd.drawString(data, 10, 65);
            gd.dispose();
            file = jdom.barecode_file + data + ".png";
            File f = new File(file);
            ImageIO.write(bi, "png", f);

        } catch (IOException ex) {
            //
        }
        return file;

    }

    @Override
    public JSONObject lunchPrinterForTicket(String id) throws JSONException {
        JSONObject json = new JSONObject();
        int counter = 40;
        int k = 0;
        int page;
        int pageCurrent = 0;
        int diff;
        int counterConstante = 40;
        String title;
        List<String> lstDataFinal = new ArrayList<>();
        List<String> infoClientAvoir = new ArrayList<>();
        boolean isReedit = true;

        try {
            TPreenregistrement oTPreenregistrement = getEntityManager().find(TPreenregistrement.class, id);
            String idVente = id;
            MvtTransaction mvtTransaction = findByPkey(idVente);
            boolean isNotCash = !mvtTransaction.getReglement().getLgTYPEREGLEMENTID()
                    .equals(Constant.TYPE_REGLEMENT_ESPECE);

            String fileBarecode = buildLineBarecode(oTPreenregistrement.getStrREFTICKET());
            TEmplacement te = oTPreenregistrement.getLgUSERID().getLgEMPLACEMENTID();
            boolean voirNumTicket = voirNumeroTicket();
            PrintService printService = findPrintService();
            TImprimante imprimante = findImprimanteByName();
            TOfficine officine = findOfficine();
            if (voirNumTicket) {
                title = oTPreenregistrement.getStrREF();
            } else {
                title = oTPreenregistrement.getStrREFTICKET();
            }
            List<String> datas = generateData(oTPreenregistrement);
            List<String> infoSellers = generateDataSeller(oTPreenregistrement);
            ImpressionServiceImpl imp = new ImpressionServiceImpl();
            imp.setOTImprimante(imprimante);
            imp.setOfficine(officine);
            imp.setService(printService);
            imp.setTitle(FunctionUtils.RECEIT_TITLE + title);
            imp.setTypeTicket(Constant.TICKET_VENTE);
            imp.setShowCodeBar(true);
            imp.setEmplacement(te);
            imp.setOperation(oTPreenregistrement.getDtUPDATED());
            imp.setIntBegin(0);
            if (oTPreenregistrement.getStrSTATUTVENTE().equalsIgnoreCase(Constant.DIFFERE)
                    || oTPreenregistrement.getBISAVOIR()) {
                infoClientAvoir = generateDataTiersPayant(oTPreenregistrement);
            }
            if (datas.size() <= counter) {
                imp.buildTicket(datas, infoSellers, infoClientAvoir,
                        generateDataSummaryVno(oTPreenregistrement, mvtTransaction),
                        generateCommentaire(oTPreenregistrement, mvtTransaction), fileBarecode);

                printCashierReceipt(oTPreenregistrement, imp, isReedit);
            } else {
                page = datas.size() / counter;
                while (page != pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(datas.get(i));
                    }
                    imp.buildTicket(lstDataFinal, infoSellers, infoClientAvoir, Collections.emptyList(),
                            Collections.emptyList(), fileBarecode);
                    printCashierReceipt(oTPreenregistrement, imp, isReedit);

                    k = counter;
                    diff = datas.size() - counter;
                    if (diff > counterConstante) {
                        counter = counter + counterConstante;
                    } else {
                        counter = counter + diff;
                    }

                    pageCurrent++;
                    lstDataFinal.clear();
                }
                if (page == pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(datas.get(i));
                    }
                    imp.buildTicket(lstDataFinal, infoSellers, infoClientAvoir,
                            generateDataSummaryVno(oTPreenregistrement, mvtTransaction),
                            generateCommentaire(oTPreenregistrement, mvtTransaction), fileBarecode);
                }
                printCashierReceipt(oTPreenregistrement, imp, isReedit);

            }
            json.put("success", true);
        } catch (PrinterException | JSONException e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false).put("msg", "Impression n'a pas aboutie");
        }
        return json;
    }

    @Override
    public JSONObject lunchPrinterForTicketVo(String id) throws JSONException {
        JSONObject json = new JSONObject();
        int counter = 40;
        int k = 0;
        int page;
        int pageCurrent = 0;
        int diff;
        int counterConstante = 40;
        String title;
        List<String> lstDataFinal = new ArrayList<>();
        List<String> infotiersPayants;

        try {
            TPreenregistrement oTPreenregistrement = getEntityManager().find(TPreenregistrement.class, id);
            String oldId = id;
            MvtTransaction mvtTransaction = findByPkey(oldId);
            String fileBarecode = buildLineBarecode(oTPreenregistrement.getStrREFTICKET());
            TEmplacement te = oTPreenregistrement.getLgUSERID().getLgEMPLACEMENTID();
            boolean voirNumTicket = voirNumeroTicket();
            PrintService printService = findPrintService();
            TImprimante imprimante = findImprimanteByName();
            TOfficine officine = findOfficine();
            if (voirNumTicket) {
                title = oTPreenregistrement.getStrREF();
            } else {
                title = oTPreenregistrement.getStrREFTICKET();
            }
            List<String> datas = generateData(oTPreenregistrement);
            List<TPreenregistrementCompteClientTiersPayent> listeVenteTiersPayants = listeVenteTiersPayantsByIdVente(
                    oTPreenregistrement.getLgPREENREGISTREMENTID());
            List<String> infoSellers = generateDataSeller(oTPreenregistrement);
            ImpressionServiceImpl imp = new ImpressionServiceImpl();
            imp.setOTImprimante(imprimante);
            imp.setOfficine(officine);
            imp.setService(printService);
            imp.setTypeTicket(Constant.ACTION_VENTE);
            imp.setShowCodeBar(true);
            imp.setEmplacement(te);
            imp.setOperation(oTPreenregistrement.getDtUPDATED());
            imp.setIntBegin(0);
            infotiersPayants = this.generateDataTiersPayant(oTPreenregistrement, listeVenteTiersPayants);
            title = title + " | Bon N°:: " + oTPreenregistrement.getStrREFBON();
            imp.setTitle("Ticket N° " + title);

            if (datas.size() <= counter) {
                imp.buildTicket(datas, infoSellers, infotiersPayants,
                        generateDataSummaryVo(oTPreenregistrement, mvtTransaction),
                        generateCommentaire(oTPreenregistrement, mvtTransaction), fileBarecode);
                print(imp, oTPreenregistrement);
            } else {
                page = datas.size() / counter;
                while (page != pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(datas.get(i));
                    }
                    imp.buildTicket(lstDataFinal, infoSellers, infotiersPayants, Collections.emptyList(),
                            Collections.emptyList(), fileBarecode);
                    print(imp, oTPreenregistrement);

                    k = counter;
                    diff = datas.size() - counter;
                    if (diff > counterConstante) {
                        counter = counter + counterConstante;
                    } else {
                        counter = counter + diff;
                    }

                    pageCurrent++;
                    lstDataFinal.clear();
                }
                if (page == pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(datas.get(i));
                    }
                    imp.buildTicket(lstDataFinal, infoSellers, infotiersPayants,
                            generateDataSummaryVo(oTPreenregistrement, mvtTransaction),
                            generateCommentaire(oTPreenregistrement, mvtTransaction), fileBarecode);
                }
                print(imp, oTPreenregistrement);

            }
            json.put("success", true);
        } catch (PrinterException | JSONException e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false).put("msg", "Impression n'a pas aboutie");
        }
        return json;

    }

    @Override
    public List<TPreenregistrementDetail> listeVenteByIdVente(String id) {
        return getEntityManager().createQuery(
                "SELECT o FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1 ")
                .setParameter(1, id).getResultList();
    }

    @Override
    public List<TPreenregistrementCompteClientTiersPayent> listeVenteTiersPayantsByIdVente(String id) {

        return getEntityManager().createQuery(
                "SELECT t FROM TPreenregistrementCompteClientTiersPayent t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1   ORDER BY t.intPERCENT DESC ")
                .setParameter(1, id).getResultList();
    }

    @Override
    public List<String> generateDataSeller(TPreenregistrement opreenregistrement) {
        List<String> datas = new ArrayList<>();
        try {
            datas.add("Caissier(e):: "
                    + DataStringManager.subStringData(opreenregistrement.getLgUSERCAISSIERID().getStrFIRSTNAME(), 0, 1)
                    + "." + opreenregistrement.getLgUSERCAISSIERID().getStrLASTNAME() + "   |   " + "Vendeur:: "
                    + DataStringManager.subStringData(opreenregistrement.getLgUSERVENDEURID().getStrFIRSTNAME(), 0, 1)
                    + "." + opreenregistrement.getLgUSERVENDEURID().getStrLASTNAME());
            if (opreenregistrement.getBISCANCEL() || opreenregistrement.getIntPRICE() < 0) {
                datas.add("Annulée par :: "
                        + DataStringManager.subStringData(opreenregistrement.getLgUSERID().getStrFIRSTNAME(), 0, 1)
                        + "." + opreenregistrement.getLgUSERID().getStrLASTNAME());
            }
            if (opreenregistrement.getLgNATUREVENTEID().getLgNATUREVENTEID()
                    .equalsIgnoreCase(Constant.KEY_NATURE_VENTE_DEPOT)) {
                TEmplacement oEmplacement = getEntityManager().find(TEmplacement.class,
                        opreenregistrement.getPkBrand());
                datas.add(oEmplacement != null ? "Dépôt: " + oEmplacement.getStrDESCRIPTION() : " ");
                datas.add("Client(e):: "
                        + (oEmplacement != null ? oEmplacement.getStrFIRSTNAME() + " " + oEmplacement.getStrLASTNAME()
                                : opreenregistrement.getStrFIRSTNAMECUSTOMER() + " "
                                        + opreenregistrement.getStrLASTNAMECUSTOMER()));

            }
        } catch (Exception e) {

        }
        return datas;
    }

    private List<String> generateData(TPreenregistrement op) {

        if (op.getIntPRICE() < 0) {
            return generateDataVenteSupprime(op);
        }
        List<String> datas = new ArrayList<>();
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = listeVenteByIdVente(op.getLgPREENREGISTREMENTID());
        lstTPreenregistrementDetail.sort(Comparator.comparing(TPreenregistrementDetail::getDtCREATED));
        lstTPreenregistrementDetail.forEach(opr -> {
            datas.add(
                    " " + opr.getIntQUANTITY() + "; *;"
                            + DataStringManager.subStringData(opr.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(), 0,
                                    20)
                            + ";" + DateConverter.amountFormat(opr.getIntPRICEUNITAIR()) + ";"
                            + DateConverter.amountFormat(opr.getIntPRICE()));
        });

        datas.add(";;;;------");
        datas.add(";;;;"
                + DateConverter.amountFormat((op.getIntPRICE() >= 0) ? op.getIntPRICE() : (-1) * op.getIntPRICE()));
        return datas;
    }

    @Override
    public List<String> generateDataVenteSupprime(TPreenregistrement opr) {
        List<String> datas = new ArrayList<>();
        List<TPreenregistrementDetail> lstTPreenregistrementDetail = listeVenteByIdVente(
                opr.getLgPREENREGISTREMENTID());
        lstTPreenregistrementDetail.sort(Comparator.comparing(TPreenregistrementDetail::getDtCREATED));
        lstTPreenregistrementDetail.forEach((ot) -> {
            datas.add(
                    " " + (-1 * ot.getIntQUANTITY()) + ";*;"
                            + DataStringManager.subStringData(ot.getLgFAMILLEID().getStrDESCRIPTION().toUpperCase(), 0,
                                    16)
                            + ";" + DateConverter.amountFormat(ot.getIntPRICEUNITAIR()) + ";"
                            + DateConverter.amountFormat(ot.getIntPRICE() * (-1)));
        });
        datas.add(";;;;------");
        datas.add(";;;;"
                + DateConverter.amountFormat((opr.getIntPRICE() >= 0) ? opr.getIntPRICE() : (-1) * opr.getIntPRICE()));
        return datas;
    }

    @Override
    public List<String> generateDataTiersPayant(TPreenregistrement op) {
        List<String> datas = new ArrayList<>();
        TClient client = op.getClient();
        datas.add("Nom du Client:: " + client.getStrFIRSTNAME() + " " + client.getStrLASTNAME());
        return datas;
    }

    private TClient findClientById(String id) {
        try {
            return getEntityManager().find(TClient.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private TTiersPayant findTiersPayantById(String id) {
        try {
            return getEntityManager().find(TTiersPayant.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public List<String> generateDataTiersPayant(TPreenregistrement p,
            List<TPreenregistrementCompteClientTiersPayent> lstT) {
        List<String> datas = new ArrayList<>();
        TClient c = p.getClient();
        String bb = c.getStrFIRSTNAME() + " " + c.getStrLASTNAME();
        TAyantDroit ayantDroit = p.getAyantDroit();
        if (ayantDroit != null) {
            bb = ayantDroit.getStrFIRSTNAME() + " " + ayantDroit.getStrLASTNAME();
        }
        datas.add("Matricule Assuré:: " + c.getStrNUMEROSECURITESOCIAL());
        datas.add("Bénéficiaire:: " + bb);
        int partClt = p.getIntCUSTPART();
        if (partClt < 0) {
            partClt = (-1) * DateConverter.arrondiModuloOfNumber(Math.abs(partClt), 5);
        } else {
            partClt = DateConverter.arrondiModuloOfNumber(partClt, 5);
        }
        datas.add("Part du Client:: " + DateConverter.amountFormat(partClt) + "  CFA");
        for (int i = 0; i < lstT.size(); i++) {
            if (Objects.isNull(p.getTypePriceOption())) {
                datas.add(lstT.get(i).getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrNAME() + "   "
                        + lstT.get(i).getIntPERCENT() + "%" + " :: "
                        + DateConverter.amountFormat(lstT.get(i).getIntPRICE()) + "  CFA");
            } else {
                datas.add(lstT.get(i).getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID().getStrNAME() + " :: "
                        + DateConverter.amountFormat(lstT.get(i).getIntPRICE()) + "  CFA");

            }

        }
        return datas;
    }

    private MvtTransaction findByPkey(String pkey) {
        try {
            TypedQuery<MvtTransaction> query = getEntityManager()
                    .createQuery("SELECT o FROM MvtTransaction o WHERE o.pkey=?1 ", MvtTransaction.class);
            query.setMaxResults(1);
            query.setParameter(1, pkey);
            return query.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private List<String> generateDataSummaryVno(TPreenregistrement p, MvtTransaction mvtTransaction) {
        TTypeReglement tTypeReglement = mvtTransaction.getReglement();
        List<VenteReglement> venteReglements = p.getVenteReglements();
        List<String> datas = new ArrayList<>();
        int remise = Math.abs(mvtTransaction.getMontantRemise());
        if (remise > 0) {
            datas.add("* ;(-) " + DateConverter.amountFormat(remise) + "; F CFA;1");
        }
        Integer venteNet = mvtTransaction.getMontantNet();
        if (venteNet > 0) {
            venteNet = DateConverter.arrondiModuloOfNumber(venteNet, 5);
        } else {
            venteNet = (-1) * DateConverter.arrondiModuloOfNumber(((-1) * venteNet), 5);
        }
        datas.add("Net à payer: ;     " + DateConverter.amountFormat(venteNet) + "; F CFA;1");
        if (venteReglements.size() > 1) {
            for (VenteReglement vers : venteReglements) {
                datas.add(vers.getTypeReglement().getStrNAME() + ": ;     "
                        + NumberUtils.formatIntToString(vers.getMontant()) + "; ;0");
            }

        } else {
            datas.add("Règlement: ;     " + tTypeReglement.getStrNAME() + "; ;0");
        }

        if (p.getIntPRICE() > 0) {
            datas.add("Montant Versé: ;     " + DateConverter.amountFormat(Math.abs(mvtTransaction.getMontantVerse()))
                    + "; F CFA;0");
            datas.add("Monnaie: ;     "
                    + DateConverter.amountFormat((Math.abs(mvtTransaction.getMontantVerse()) - venteNet > 0
                            ? Math.abs(mvtTransaction.getMontantVerse()) - Math.abs(mvtTransaction.getMontantPaye())
                            : 0))
                    + "; F CFA;0");

        }
        return datas;
    }

    private List<String> generateCommentaire(TPreenregistrement p, MvtTransaction mvtTransaction) {
        TOfficine officine = findOfficine();
        List<String> datas = new ArrayList<>();
        if (p.getBISAVOIR()) {
            List<TPreenregistrementDetail> items = listeVenteByIdVente(p.getLgPREENREGISTREMENTID());
            List<TPreenregistrementDetail> lstPreenregistrementDetail = items.stream().filter(v -> v.getBISAVOIR())
                    .collect(Collectors.toList());
            int intAMOUNTACCOMPTE = lstPreenregistrementDetail.stream()
                    .map((oP) -> oP.getIntAVOIR() * oP.getIntPRICEUNITAIR()).reduce(0, Integer::sum);
            datas.add(" ;0");
            datas.add("ACOMPTE: " + DateConverter.amountFormat(intAMOUNTACCOMPTE, ' ') + " F CFA;1");
            datas.add(" ;0");
        }

        if (p.getStrSTATUTVENTE().equalsIgnoreCase(Constant.DIFFERE) && p.getIntPRICE() > 0) {
            datas.add(" ;0");
            datas.add(
                    "MONTANT RESTANT: "
                            + DateConverter.amountFormat(
                                    Maths.arrondiModuloOfNumber(mvtTransaction.getMontantRestant(), 5), ' ')
                            + " F CFA;1");
            datas.add(" ;0");
        }

        if (!officine.getStrCOMMENTAIRE1().equals("") && officine.getStrCOMMENTAIRE1() != null) {
            datas.add(officine.getStrCOMMENTAIRE1() + ";0");
        }
        if (!officine.getStrCOMMENTAIRE2().equals("") && officine.getStrCOMMENTAIRE2() != null) {
            datas.add(officine.getStrCOMMENTAIRE2() + ";0");
        }

        return datas;

    }

    public TPreenregistrementCompteClient getTPreenregistrementCompteClient(String lgPREENREGISTREMENTID) {
        TPreenregistrementCompteClient ctl = null;
        try {
            ctl = (TPreenregistrementCompteClient) getEntityManager().createQuery(
                    "SELECT t FROM TPreenregistrementCompteClient t WHERE t.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID = ?1")
                    .setParameter(1, lgPREENREGISTREMENTID).getSingleResult();

        } catch (Exception e) {

        }
        return ctl;
    }

    @Override
    public JSONObject lunchPrinterForTicket(ClotureVenteParams clotureVenteParams) throws JSONException {
        JSONObject json = new JSONObject();
        int counter = 40;
        int k = 0;
        int page;
        int pageCurrent = 0;
        int diff;
        int counterconstante = 40;
        String title;
        List<String> lstDataFinal = new ArrayList<>();
        List<String> infoClientAvoir = new ArrayList<>();
        boolean isReedit = false;
        try {
            TPreenregistrement oTPreenregistrement = getEntityManager().find(TPreenregistrement.class,
                    clotureVenteParams.getVenteId());
            String idPrevente = oTPreenregistrement.getLgPREENREGISTREMENTID();
            MvtTransaction mvtTransaction = findByPkey(idPrevente);
            boolean isNotCash = !mvtTransaction.getReglement().getLgTYPEREGLEMENTID()
                    .equals(Constant.TYPE_REGLEMENT_ESPECE);

            String fileBarecode = buildLineBarecode(oTPreenregistrement.getStrREFTICKET());
            TEmplacement te = oTPreenregistrement.getLgUSERID().getLgEMPLACEMENTID();
            boolean voirNumTicket = voirNumeroTicket();
            PrintService printService = findPrintService();
            TImprimante imprimante = findImprimanteByName();
            TOfficine officine = findOfficine();
            if (voirNumTicket) {
                title = oTPreenregistrement.getStrREF();
            } else {
                title = oTPreenregistrement.getStrREFTICKET();
            }
            List<String> datas = generateData(oTPreenregistrement);
            List<String> infoSellers = generateDataSeller(oTPreenregistrement);
            ImpressionServiceImpl imp = new ImpressionServiceImpl();
            imp.setOTImprimante(imprimante);
            imp.setOfficine(officine);
            imp.setService(printService);
            imp.setTitle("Ticket N° " + title);
            imp.setTypeTicket(Constant.ACTION_VENTE);
            imp.setShowCodeBar(true);
            imp.setEmplacement(te);
            imp.setOperation(oTPreenregistrement.getDtUPDATED());
            imp.setIntBegin(0);
            List<String> generateDataSummaryVno = generateDataSummaryVno(oTPreenregistrement, mvtTransaction);
            List<String> generateCommentaire = generateCommentaire(oTPreenregistrement, mvtTransaction);
            if (oTPreenregistrement.getStrSTATUTVENTE().equalsIgnoreCase(Constant.DIFFERE)
                    || oTPreenregistrement.getBISAVOIR()) {
                infoClientAvoir = generateDataTiersPayant(oTPreenregistrement);
            }
            if (datas.size() <= counter) {
                imp.buildTicket(datas, infoSellers, infoClientAvoir, generateDataSummaryVno, generateCommentaire,
                        fileBarecode);
                printCashierReceipt(oTPreenregistrement, imp, isReedit);

            } else {
                page = datas.size() / counter;
                while (page != pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(datas.get(i));
                    }
                    imp.buildTicket(lstDataFinal, infoSellers, infoClientAvoir, Collections.emptyList(),
                            Collections.emptyList(), fileBarecode);
                    printCashierReceipt(oTPreenregistrement, imp, isReedit);

                    k = counter;
                    diff = datas.size() - counter;
                    if (diff > counterconstante) {
                        counter = counter + counterconstante;
                    } else {
                        counter = counter + diff;
                    }

                    pageCurrent++;
                    lstDataFinal.clear();
                }
                if (page == pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(datas.get(i));
                    }
                    imp.buildTicket(lstDataFinal, infoSellers, infoClientAvoir, generateDataSummaryVno,
                            generateCommentaire, fileBarecode);
                }
                printCashierReceipt(oTPreenregistrement, imp, isReedit);

            }
            json.put("success", true);
            afficheurWellComeMessage();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false).put("msg", "Impression n'a pas aboutie");
        }
        return json;
    }

    private boolean printUniqueTicket() {
        try {
            TParameters p = getEntityManager().find(TParameters.class, Constant.KEY_NOMBRE_TICKETS_VNO);
            return Integer.valueOf(p.getStrVALUE()).compareTo(0) == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private void print(ImpressionServiceImpl impressionService, TPreenregistrement oTPreenregistrement,
            List<TPreenregistrementCompteClientTiersPayent> listeVenteTiersPayants, boolean printUniqueTicket,
            MvtTransaction mvtTransaction, boolean isReedit) throws PrinterException {
        if (oTPreenregistrement.getIntPRICE() < 0) {
            impressionService.printTicketVente(1);
        } else {
            if (!printUniqueTicket) {
                for (TPreenregistrementCompteClientTiersPayent b : listeVenteTiersPayants) {
                    impressionService.printTicketVente(1);
                }
            }
            if (Objects.nonNull(mvtTransaction)) {

                printCashierReceipt(oTPreenregistrement, impressionService, isReedit);
            } else {
                int copies = nbreDeCopiesOranges(oTPreenregistrement, 1);
                for (int i = 0; i < copies; i++) {
                    impressionService.printTicketVente(1);
                }
            }
        }
    }

    private void printCashierReceipt(TPreenregistrement oTPreenregistrement, ImpressionServiceImpl impressionService,
            boolean isReedit) throws PrinterException {
        int copies = isReedit ? 1 : nbreDeCopiesOranges(oTPreenregistrement, 1);
        for (int i = 0; i < copies; i++) {
            impressionService.printTicketVente(1);

        }
    }

    @Override
    public JSONObject lunchPrinterForTicketVo(ClotureVenteParams clotureVenteParams) throws JSONException {
        JSONObject json = new JSONObject();
        int counter = 40;
        int k = 0;
        int page;
        int pageCurrent = 0;
        int diff;
        int counterConstante = 40;
        String title;
        List<String> lstDataFinal = new ArrayList<>();
        List<String> infotiersPayants;
        boolean isReedit = false;
        try {
            TPreenregistrement oTPreenregistrement = getEntityManager().find(TPreenregistrement.class,
                    clotureVenteParams.getVenteId());
            String id0 = clotureVenteParams.getVenteId();
            boolean printUniqueTicket = printUniqueTicket();
            MvtTransaction mvtTransaction = findByPkey(id0);
            String fileBarecode = buildLineBarecode(oTPreenregistrement.getStrREFTICKET());
            TEmplacement te = oTPreenregistrement.getLgUSERID().getLgEMPLACEMENTID();
            boolean voirNumTicket = voirNumeroTicket();
            PrintService printService = findPrintService();
            TImprimante imprimante = findImprimanteByName();
            TOfficine officine = findOfficine();
            if (voirNumTicket) {
                title = oTPreenregistrement.getStrREF();
            } else {
                title = oTPreenregistrement.getStrREFTICKET();
            }
            List<String> datas = generateData(oTPreenregistrement);
            List<TPreenregistrementCompteClientTiersPayent> listeVenteTiersPayants = listeVenteTiersPayantsByIdVente(
                    oTPreenregistrement.getLgPREENREGISTREMENTID());
            List<String> infoSellers = generateDataSeller(oTPreenregistrement);
            ImpressionServiceImpl imp = new ImpressionServiceImpl();
            imp.setOTImprimante(imprimante);
            imp.setOfficine(officine);
            imp.setService(printService);
            imp.setTypeTicket(Constant.ACTION_VENTE);
            imp.setShowCodeBar(true);
            imp.setEmplacement(te);
            imp.setOperation(oTPreenregistrement.getDtUPDATED());
            imp.setIntBegin(0);
            infotiersPayants = this.generateDataTiersPayant(oTPreenregistrement, listeVenteTiersPayants);
            title = title + " | Bon N°:: " + oTPreenregistrement.getStrREFBON();
            imp.setTitle("Ticket N° " + title);
            List<String> generateDataSummarys = generateDataSummaryVo(oTPreenregistrement, clotureVenteParams);
            List<String> commentaires = generateCommentaire(oTPreenregistrement, mvtTransaction);
            if (datas.size() <= counter) {
                imp.buildTicket(datas, infoSellers, infotiersPayants, generateDataSummarys, commentaires, fileBarecode);
                print(imp, oTPreenregistrement, listeVenteTiersPayants, printUniqueTicket, mvtTransaction, isReedit);

            } else {
                page = datas.size() / counter;
                while (page != pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(datas.get(i));
                    }
                    imp.buildTicket(lstDataFinal, infoSellers, infotiersPayants, Collections.emptyList(),
                            Collections.emptyList(), fileBarecode);
                    print(imp, oTPreenregistrement, listeVenteTiersPayants, printUniqueTicket, mvtTransaction,
                            isReedit);
                    k = counter;
                    diff = datas.size() - counter;
                    if (diff > counterConstante) {
                        counter = counter + counterConstante;
                    } else {
                        counter = counter + diff;
                    }

                    pageCurrent++;
                    lstDataFinal.clear();
                }
                if (page == pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(datas.get(i));
                    }
                    imp.buildTicket(lstDataFinal, infoSellers, infotiersPayants, generateDataSummarys, commentaires,
                            fileBarecode);
                }
                print(imp, oTPreenregistrement, listeVenteTiersPayants, printUniqueTicket, mvtTransaction, isReedit);

            }
            json.put("success", true);
            afficheurWellComeMessage();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false).put("msg", "Impression n'a pas aboutie");
        }
        return json;

    }

    private List<String> generateDataSummaryVo(TPreenregistrement oPreenregistrement,
            ClotureVenteParams clotureVenteParams) {
        List<String> datas = new ArrayList<>();
        TTypeReglement reglement = oPreenregistrement.getLgREGLEMENTID().getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID();
        List<VenteReglement> venteReglements = oPreenregistrement.getVenteReglements();
        String lgTyvente = oPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID();
        if (oPreenregistrement.getIntCUSTPART() == 0) {
            if (oPreenregistrement.getIntPRICEREMISE() > 0) {
                datas.add("* ;(-) " + DateConverter.amountFormat(oPreenregistrement.getIntPRICEREMISE()) + "; F CFA;1");
            }

            if (lgTyvente.equals(Constant.VENTE_ASSURANCE_ID) || lgTyvente.equals(Constant.VENTE_AVEC_CARNET)) {
                datas.add("Vente à terme: ;    " + DateConverter.amountFormat(clotureVenteParams.getPartTP())
                        + "; F CFA;1");
            } else {
                datas.add("Vente à terme: ;    " + DateConverter.amountFormat(clotureVenteParams.getTotalRecap())
                        + "; F CFA;1");
            }

        } else {
            Integer venteNet = oPreenregistrement.getIntCUSTPART();
            if (venteNet > 0) {
                venteNet = DateConverter.arrondiModuloOfNumber(oPreenregistrement.getIntCUSTPART(), 5);
            } else {
                venteNet = (-1) * DateConverter.arrondiModuloOfNumber(Math.abs(oPreenregistrement.getIntCUSTPART()), 5);
            }

            if (oPreenregistrement.getIntPRICEREMISE() > 0) {
                datas.add("* ;(-) " + DateConverter.amountFormat(oPreenregistrement.getIntPRICEREMISE()) + "; F CFA;1");
            }
            int montantApayer = venteNet;
            if (!(lgTyvente.equals(Constant.VENTE_AVEC_CARNET) && isTauxZero(oPreenregistrement))) {
                montantApayer = venteNet - oPreenregistrement.getIntPRICEREMISE();
            }
            datas.add("Net à payer: ;     " + DateConverter.amountFormat(Maths.arrondiModuloOfNumber(montantApayer, 5))
                    + "; F CFA;1");
            if (venteReglements.size() > 1) {
                for (VenteReglement vers : venteReglements) {
                    datas.add(vers.getTypeReglement().getStrNAME() + ": ;     "
                            + NumberUtils.formatIntToString(vers.getMontant()) + "; ;0");
                }

            } else {
                datas.add("Règlement: ;     " + reglement.getStrNAME() + "; ;0");
            }

            if (oPreenregistrement.getIntPRICE() >= 0) {

                datas.add(
                        "Montant Versé: ;     "
                                + DateConverter.amountFormat(
                                        Maths.arrondiModuloOfNumber(clotureVenteParams.getMontantRecu(), 5))
                                + "; F CFA;0");
                final Integer change = clotureVenteParams.getMontantRecu()
                        - (DateConverter.arrondiModuloOfNumber(oPreenregistrement.getIntCUSTPART(), 5)
                                - oPreenregistrement.getIntPRICEREMISE());
                datas.add("Monnaie: ;     " + DateConverter.amountFormat((change >= 0 ? change : 0)) + "; F CFA;0");

            }
        }
        return datas;
    }

    private boolean isTauxZero(TPreenregistrement oPreenregistrement) {
        return oPreenregistrement.getTPreenregistrementCompteClientTiersPayentCollection().stream()
                .mapToInt(TPreenregistrementCompteClientTiersPayent::getIntPERCENT).sum() == 0;
    }

    private List<String> generateDataSummaryVo(TPreenregistrement oPreenregistrement,
            MvtTransaction clotureVenteParams) {
        List<String> datas = new ArrayList<>();
        TTypeReglement reglement = clotureVenteParams.getReglement();
        List<VenteReglement> venteReglements = oPreenregistrement.getVenteReglements();
        int remise = clotureVenteParams.getMontantRemise();
        String lgTyvente = oPreenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID();
        if (oPreenregistrement.getIntCUSTPART() == 0) {

            remise = Math.abs(remise);
            if (remise > 0) {
                datas.add("* ;(-) " + DateConverter.amountFormat(remise) + "; F CFA;1");
            }

            if (lgTyvente.equals(Constant.VENTE_ASSURANCE_ID) || lgTyvente.equals(Constant.VENTE_AVEC_CARNET)) {

                datas.add("Vente à terme: ;    " + DateConverter.amountFormat(clotureVenteParams.getMontantCredit())
                        + "; F CFA;1");
            } else {
                datas.add("Vente à terme: ;    " + DateConverter.amountFormat(clotureVenteParams.getMontantNet())
                        + "; F CFA;1");
            }

        } else {
            Integer venteNet = oPreenregistrement.getIntCUSTPART();
            if (remise > 0) {
                datas.add("* ;(-) " + DateConverter.amountFormat(remise) + "; F CFA;1");
            }
            if (venteNet >= 0) {
                venteNet = DateConverter.arrondiModuloOfNumber(venteNet, 5);
            } else {
                venteNet = (-1) * DateConverter.arrondiModuloOfNumber((-1) * venteNet, 5);
            }
            int montantApayer = venteNet;
            if (!(lgTyvente.equals(Constant.VENTE_AVEC_CARNET) && isTauxZero(oPreenregistrement))) {
                montantApayer = venteNet - remise;
            }
            datas.add("Net à payer: ;     " + DateConverter.amountFormat(Maths.arrondiModuloOfNumber(montantApayer, 5))
                    + "; F CFA;1");
            if (venteReglements.size() > 1) {
                for (VenteReglement vers : venteReglements) {
                    datas.add(vers.getTypeReglement().getStrNAME() + ": ;     "
                            + NumberUtils.formatIntToString(vers.getMontant()) + "; ;0");
                }

            } else {
                datas.add("Règlement: ;     " + reglement.getStrNAME() + "; ;0");
            }

            if (oPreenregistrement.getIntPRICE() >= 0) {

                datas.add("Montant Versé: ;     "
                        + DateConverter.amountFormat(
                                Maths.arrondiModuloOfNumber(Math.abs(clotureVenteParams.getMontantVerse()), 5))
                        + "; F CFA;0");
                final Integer change = Math.abs(clotureVenteParams.getMontantVerse())
                        - Math.abs(clotureVenteParams.getMontantPaye());
                datas.add("Monnaie: ;     " + DateConverter.amountFormat((change >= 0 ? change : 0)) + "; F CFA;0");

            }
        }
        return datas;
    }

    @Override
    public JSONObject printerForTicket(String p, TUser user) throws JSONException {
        dataManager manager = new dataManager();
        manager.initEntityManager();
        TPreenregistrement tp = manager.getEm().find(TPreenregistrement.class, p);
        File f = buildBarecode(tp.getStrREFTICKET());
        Preenregistrement preenregistrement = new Preenregistrement(manager, user);
        try {
            preenregistrement.lunchPrinterForTicket(tp, (f != null) ? f.getAbsolutePath() : "");
        } catch (Exception e) {
        }
        return new JSONObject().put("success", true);
    }

    @Override
    public JSONObject ticketReglementDiffere(String idDossier) throws JSONException {
        JSONObject json = new JSONObject();
        List<String> infotiersPayants;
        try {
            TDossierReglement dossierReglement = getEntityManager().find(TDossierReglement.class, idDossier);
            List<TDossierReglementDetail> lstTDossierReglementDetail = getListeDossierReglementDetail(idDossier);
            int numbretiket = nombreExemplaireMvtCaisseTicket("KEY_TICKET_COUNT");
            MvtTransaction mvtTransaction = findByPkey(idDossier);
            TEmplacement emplacement = mvtTransaction.getMagasin();
            String num = DateConverter.getShortId(10);
            String fileBarecode = buildLineBarecode(num);
            PrintService printService = findPrintService();
            TImprimante imprimante = findImprimanteByName();
            TOfficine officine = findOfficine();
            List<String> datas = generateData(lstTDossierReglementDetail, dossierReglement);
            List<String> infoSellers = generateDataOperateur(mvtTransaction.getUser());
            ImpressionServiceImpl imp = new ImpressionServiceImpl();
            imp.setOTImprimante(imprimante);
            imp.setEmplacement(emplacement);
            imp.setOfficine(officine);
            imp.setService(printService);
            imp.setTypeTicket(Constant.TICKET_REGLEMENT);
            imp.setShowCodeBar(true);
            imp.setOperation(dossierReglement.getDtCREATED());
            imp.setIntBegin(0);
            infotiersPayants = generateDataClient(findClientById(mvtTransaction.getOrganisme()));
            imp.setTitle("");
            imp.buildTicket(datas, infoSellers, infotiersPayants, generateDataSummary(dossierReglement, mvtTransaction),
                    Collections.emptyList(), fileBarecode);
            for (int i = 0; i < numbretiket; i++) {
                imp.printTicketVente(1);
            }
            json.put("success", true);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false).put("msg", "Impression n'a pas aboutie");
        }
        return json;
    }

    public List<TDossierReglementDetail> getListeDossierReglementDetail(String idDossier) {
        try {
            TypedQuery<TDossierReglementDetail> q = getEntityManager().createQuery(
                    "SELECT t FROM TDossierReglementDetail t WHERE t.lgDOSSIERREGLEMENTID.lgDOSSIERREGLEMENTID =?1",
                    TDossierReglementDetail.class);
            q.setParameter(1, idDossier);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    private List<String> generateData(List<TDossierReglementDetail> lstTDossierReglementDetail,
            TDossierReglement dossierReglement) {
        List<String> datas = new ArrayList<>();

        double amount;
        double reste;

        amount = dossierReglement.getDblAMOUNT();
        reste = dossierReglement.getDblMONTANTATTENDU() - amount;
        datas.add("NBRE DOSSIER(S);VERSE;RESTANT");
        datas.add(lstTDossierReglementDetail.size() + ";" + DateConverter.amountFormat((int) amount, ' ') + "F CFA;"
                + DateConverter.amountFormat((int) reste, ' ') + "F CFA");
        datas.add(" ; ; ");

        return datas;
    }

    public List<String> generateDataClient(TClient client) {
        List<String> datas = new ArrayList<>();
        datas.add("Client :: " + client.getStrFIRSTNAME() + " " + client.getStrLASTNAME());
        return datas;
    }

    public List<String> generateDataOperateur(TUser u) {
        List<String> datas = new ArrayList<>();
        datas.add(
                "Opérateur:: " + DataStringManager.subStringData(u.getStrFIRSTNAME(), 0, 1) + "." + u.getStrLASTNAME());
        return datas;
    }

    public List<String> generateDataSummary(TDossierReglement dossierReglement, MvtTransaction mvtTransaction) {
        List<String> datas = new ArrayList<>();
        datas.add("Net à payer: ;     "
                + DateConverter.amountFormat(
                        DateConverter.arrondiModuloOfNumber(dossierReglement.getDblMONTANTATTENDU().intValue(), 5))
                + "; F CFA;1");
        datas.add("Règlement: ;     " + mvtTransaction.getReglement().getStrNAME() + "; ;0");
        datas.add("Montant Versé: ;     "
                + DateConverter.amountFormat(DateConverter.arrondiModuloOfNumber(mvtTransaction.getMontantVerse(), 5))
                + "; F CFA;0");
        final Integer change = Math.abs(mvtTransaction.getMontantVerse()) - Math.abs(mvtTransaction.getMontantPaye());

        datas.add("Monnaie: ;     " + DateConverter.amountFormat((change >= 0 ? change : 0)) + "; F CFA;0");
        return datas;
    }

    public void lunchPrinterForTicketVo(TPreenregistrement oTPreenregistrement) {

        int counter = 40, k = 0, page, pageCurrent = 0, diff, counterConstante = 40;
        String title;
        List<String> lstDataFinal = new ArrayList<>();
        List<String> infotiersPayants;

        try {

            MvtTransaction mvtTransaction = findByPkey(oTPreenregistrement.getLgPREENREGISTREMENTID());
            String fileBarecode = buildLineBarecode(oTPreenregistrement.getStrREFTICKET());
            TEmplacement te = oTPreenregistrement.getLgUSERID().getLgEMPLACEMENTID();
            boolean voirNumTicket = voirNumeroTicket();
            PrintService printService = findPrintService();
            TImprimante imprimante = findImprimanteByName();
            TOfficine officine = findOfficine();
            if (voirNumTicket) {
                title = oTPreenregistrement.getStrREF();
            } else {
                title = oTPreenregistrement.getStrREFTICKET();
            }
            List<String> datas = generateData(oTPreenregistrement);
            List<TPreenregistrementCompteClientTiersPayent> listeVenteTiersPayants = listeVenteTiersPayantsByIdVente(
                    oTPreenregistrement.getLgPREENREGISTREMENTID());
            List<String> infoSellers = generateDataSeller(oTPreenregistrement);
            ImpressionServiceImpl imp = new ImpressionServiceImpl();
            imp.setOTImprimante(imprimante);
            imp.setOfficine(officine);
            imp.setService(printService);
            imp.setTypeTicket(Constant.ACTION_VENTE);
            imp.setShowCodeBar(true);
            imp.setEmplacement(te);
            imp.setOperation(oTPreenregistrement.getDtUPDATED());
            imp.setIntBegin(0);
            infotiersPayants = this.generateDataTiersPayant(oTPreenregistrement, listeVenteTiersPayants);
            title = title + " | Bon N°:: " + oTPreenregistrement.getStrREFBON();
            imp.setTitle("Ticket N° " + title);

            if (datas.size() <= counter) {
                imp.buildTicket(datas, infoSellers, infotiersPayants,
                        generateDataSummaryVo(oTPreenregistrement, mvtTransaction),
                        generateCommentaire(oTPreenregistrement, mvtTransaction), fileBarecode);
                imp.printTicketVente(1);
            } else {
                page = datas.size() / counter;
                while (page != pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(datas.get(i));
                    }
                    imp.buildTicket(lstDataFinal, infoSellers, infotiersPayants, Collections.emptyList(),
                            Collections.emptyList(), fileBarecode);
                    imp.printTicketVente(1);

                    k = counter;
                    diff = datas.size() - counter;
                    if (diff > counterConstante) {
                        counter = counter + counterConstante;
                    } else {
                        counter = counter + diff;
                    }

                    pageCurrent++;
                    lstDataFinal.clear();
                }
                if (page == pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(datas.get(i));
                    }
                    imp.buildTicket(lstDataFinal, infoSellers, infotiersPayants,
                            generateDataSummaryVno(oTPreenregistrement, mvtTransaction),
                            generateCommentaire(oTPreenregistrement, mvtTransaction), fileBarecode);
                }
                imp.printTicketVente(1);

            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }

    }

    private List<String> infoDepot(TPreenregistrement oTPreenregistrement) throws Exception {
        List<String> datas = new ArrayList<>();
        datas.add("Caissier(e):: "
                + DataStringManager.subStringData(oTPreenregistrement.getLgUSERCAISSIERID().getStrFIRSTNAME(), 0, 1)
                + "." + oTPreenregistrement.getLgUSERCAISSIERID().getStrLASTNAME() + "   |   " + "Vendeur:: "
                + DataStringManager.subStringData(oTPreenregistrement.getLgUSERVENDEURID().getStrFIRSTNAME(), 0, 1)
                + "." + oTPreenregistrement.getLgUSERVENDEURID().getStrLASTNAME());
        if (oTPreenregistrement.getBISCANCEL() || oTPreenregistrement.getIntPRICE() < 0) {
            datas.add("Annulée par :: "
                    + DataStringManager.subStringData(oTPreenregistrement.getLgUSERID().getStrFIRSTNAME(), 0, 1) + "."
                    + oTPreenregistrement.getLgUSERID().getStrLASTNAME());
        }
        TEmplacement oTEmplacement = getEntityManager().find(TEmplacement.class, oTPreenregistrement.getPkBrand());
        datas.add(oTEmplacement != null ? "Dépôt: " + oTEmplacement.getStrDESCRIPTION() : " ");
        datas.add("Client(e):: " + (oTEmplacement != null
                ? oTEmplacement.getStrFIRSTNAME() + " " + oTEmplacement.getStrLASTNAME()
                : oTPreenregistrement.getStrFIRSTNAMECUSTOMER() + " " + oTPreenregistrement.getStrLASTNAMECUSTOMER()));

        return datas;
    }

    @Override
    public JSONObject lunchPrinterForTicketDepot(String id) throws JSONException {
        JSONObject json = new JSONObject();
        int counter = 40, k = 0, page, pageCurrent = 0, diff, counterConstante = 40;
        String title;
        List<String> lstDataFinal = new ArrayList<>();
        try {
            TPreenregistrement oTPreenregistrement = getEntityManager().find(TPreenregistrement.class, id);
            String id0 = id;
            MvtTransaction mvtTransaction = findByPkey(id0);
            String fileBarecode = buildLineBarecode(oTPreenregistrement.getStrREFTICKET());
            TEmplacement te = oTPreenregistrement.getLgUSERID().getLgEMPLACEMENTID();
            boolean voirNumTicket = voirNumeroTicket();
            PrintService printService = findPrintService();
            TImprimante imprimante = findImprimanteByName();
            TOfficine officine = findOfficine();
            if (voirNumTicket) {
                title = oTPreenregistrement.getStrREF();
            } else {
                title = oTPreenregistrement.getStrREFTICKET();
            }
            List<String> datas = generateData(oTPreenregistrement);
            List<String> infoSellers = infoDepot(oTPreenregistrement);
            ImpressionServiceImpl imp = new ImpressionServiceImpl();
            imp.setOTImprimante(imprimante);
            imp.setOfficine(officine);
            imp.setService(printService);
            imp.setTypeTicket(Constant.ACTION_VENTE);
            imp.setShowCodeBar(true);
            imp.setEmplacement(te);
            imp.setOperation(oTPreenregistrement.getDtUPDATED());
            imp.setIntBegin(0);
            imp.setTitle("Ticket N° " + title);
            if (datas.size() <= counter) {
                imp.buildTicket(datas, infoSellers, Collections.emptyList(),
                        generateDataSummaryDepot(oTPreenregistrement, mvtTransaction),
                        generateCommentaire(oTPreenregistrement, mvtTransaction), fileBarecode);
                if (oTPreenregistrement.getIntPRICE() < 0) {
                    imp.printTicketVente(1);
                } else {

                    imp.printTicketVente(1);
                }
            } else {
                page = datas.size() / counter;
                while (page != pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(datas.get(i));
                    }
                    imp.buildTicket(lstDataFinal, infoSellers, Collections.emptyList(), Collections.emptyList(),
                            Collections.emptyList(), fileBarecode);
                    if (oTPreenregistrement.getIntPRICE() < 0) {
                        imp.printTicketVente(1);
                    } else {

                        imp.printTicketVente(1);
                    }

                    k = counter;
                    diff = datas.size() - counter;
                    if (diff > counterConstante) {
                        counter = counter + counterConstante;
                    } else {
                        counter = counter + diff;
                    }

                    pageCurrent++;
                    lstDataFinal.clear();
                }
                if (page == pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(datas.get(i));
                    }
                    imp.buildTicket(lstDataFinal, infoSellers, Collections.emptyList(),
                            generateDataSummaryDepot(oTPreenregistrement, mvtTransaction),
                            generateCommentaire(oTPreenregistrement, mvtTransaction), fileBarecode);
                }
                if (oTPreenregistrement.getIntPRICE() < 0) {
                    imp.printTicketVente(1);
                } else {

                    imp.printTicketVente(1);
                }

            }
            json.put("success", true);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false).put("msg", "Impression n'a pas aboutie");
        }
        return json;
    }

    public List<String> generateDataSummaryDepot(TPreenregistrement preenregistrement,
            MvtTransaction clotureVenteParams) {
        List<String> datas = new ArrayList<>();
        int remise = clotureVenteParams.getMontantRemise();
        remise = Math.abs(remise);
        if (remise > 0) {
            datas.add("* ;(-) " + DateConverter.amountFormat(remise) + "; F CFA;1");
        }
        datas.add(
                "Vente à terme: ;    " + DateConverter.amountFormat(clotureVenteParams.getMontantNet()) + "; F CFA;1");

        return datas;
    }

    public List<String> generateDataSummaryDepot(TPreenregistrement oPreenregistrement) {
        List<String> datas = new ArrayList<>();

        if (oPreenregistrement.getIntPRICEREMISE() > 0) {
            datas.add("* ;(-) " + DateConverter.amountFormat(oPreenregistrement.getIntPRICEREMISE()) + "; F CFA;1");
        }
        datas.add("Vente à terme: ;    "
                + DateConverter.amountFormat(oPreenregistrement.getIntPRICE() - oPreenregistrement.getIntPRICEREMISE())
                + "; F CFA;1");

        return datas;
    }

    @Override
    public JSONObject lunchPrinterForTicketDepot(ClotureVenteParams clotureVenteParams) throws JSONException {
        JSONObject json = new JSONObject();
        int counter = 40;
        int k = 0;
        int page;
        int pageCurrent = 0;
        int diff;
        int counterConstante = 40;
        String title;
        List<String> lstDataFinal = new ArrayList<>();
        try {
            TPreenregistrement oTPreenregistrement = getEntityManager().find(TPreenregistrement.class,
                    clotureVenteParams.getVenteId());
            String idVente = clotureVenteParams.getVenteId();
            MvtTransaction mvtTransaction = findByPkey(idVente);
            String fileBarecode = buildLineBarecode(oTPreenregistrement.getStrREFTICKET());
            TEmplacement te = oTPreenregistrement.getLgUSERID().getLgEMPLACEMENTID();
            boolean voirNumTicket = voirNumeroTicket();
            PrintService printService = findPrintService();
            TImprimante imprimante = findImprimanteByName();
            TOfficine officine = findOfficine();
            if (voirNumTicket) {
                title = oTPreenregistrement.getStrREF();
            } else {
                title = oTPreenregistrement.getStrREFTICKET();
            }
            List<String> datas = generateData(oTPreenregistrement);
            List<String> infoSellers = infoDepot(oTPreenregistrement);
            ImpressionServiceImpl imp = new ImpressionServiceImpl();
            imp.setOTImprimante(imprimante);
            imp.setOfficine(officine);
            imp.setService(printService);
            imp.setTypeTicket(Constant.ACTION_VENTE);
            imp.setShowCodeBar(true);
            imp.setEmplacement(te);
            imp.setOperation(oTPreenregistrement.getDtUPDATED());
            imp.setIntBegin(0);
            imp.setTitle("Ticket N° " + title);
            List<String> generateDataSummarys = generateDataSummaryDepot(oTPreenregistrement);
            List<String> commentaires = generateCommentaire(oTPreenregistrement, mvtTransaction);
            if (datas.size() <= counter) {
                imp.buildTicket(datas, infoSellers, Collections.emptyList(), generateDataSummarys, commentaires,
                        fileBarecode);
                print(imp, oTPreenregistrement);

            } else {
                page = datas.size() / counter;
                while (page != pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(datas.get(i));
                    }
                    imp.buildTicket(lstDataFinal, infoSellers, Collections.emptyList(), Collections.emptyList(),
                            Collections.emptyList(), fileBarecode);

                    print(imp, oTPreenregistrement);
                    k = counter;
                    diff = datas.size() - counter;
                    if (diff > counterConstante) {
                        counter = counter + counterConstante;
                    } else {
                        counter = counter + diff;
                    }

                    pageCurrent++;
                    lstDataFinal.clear();
                }
                if (page == pageCurrent) {
                    for (int i = k; i < counter; i++) {
                        lstDataFinal.add(datas.get(i));
                    }
                    imp.buildTicket(lstDataFinal, infoSellers, Collections.emptyList(), generateDataSummarys,
                            commentaires, fileBarecode);
                }
                print(imp, oTPreenregistrement);

            }
            json.put("success", true);
            afficheurWellComeMessage();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false).put("msg", "Impression n'a pas aboutie");
        }
        return json;

    }

    private void print(ImpressionServiceImpl imp, TPreenregistrement p) throws PrinterException {
        if (p.getIntPRICE() < 0) {
            imp.printTicketVente(1);
        } else {
            int copies = nbreDeCopiesOranges(p, 1);
            for (int i = 0; i < copies; i++) {
                imp.printTicketVente(1);
            }

        }
    }

    void afficheurWellComeMessage() {
        if (afficheurActif()) {
            try {
                Afficheur afficheur = Afficheur.getInstance();
                afficheur.affichage(DataStringManager.subStringData(findOfficine().getStrNOMABREGE(), 0, 20));
                afficheur.affichage(DataStringManager.subStringData("  BIENVENUE A VOUS", 0, 20));
            } catch (Exception e) {
            }
        }

    }

    public boolean voirNumeroTicket() {
        try {

            TParameters tp = getEntityManager().find(TParameters.class, Constant.KEY_SHOW_NUMERO_TICKET);
            return (Integer.parseInt(tp.getStrVALUE()) == 1);

        } catch (Exception e) {

            return false;
        }
    }

    public boolean afficheurActif() {

        try {
            TParameters tp = getEntityManager().find(TParameters.class, "KEY_ACTIVATE_DISPLAYER");
            return (tp != null && tp.getStrVALUE().trim().equals("1"));
        } catch (Exception e) {
            return false;
        }
    }

    public TOfficine findOfficine() {

        return getEntityManager().find(TOfficine.class, "1");

    }

    public PrintService findPrintService() {

        return PrintServiceLookup.lookupDefaultPrintService();

    }

    public TImprimante findImprimanteByName() {

        try {

            Query qry = getEntityManager().createQuery("SELECT t FROM TImprimante t WHERE t.strNAME = ?1 ")
                    .setParameter(1, findPrintService().getName());
            qry.setMaxResults(1);
            return (TImprimante) qry.getSingleResult();

        } catch (Exception e) {
            return null;
        }

    }

    @Override
    public JSONObject ticketReglementCarnet(String idDossier) throws JSONException {
        JSONObject json = new JSONObject();

        try {
            TDossierReglement dossierReglement = getEntityManager().find(TDossierReglement.class, idDossier);
            List<TDossierReglementDetail> lstTDossierReglementDetail = getListeDossierReglementDetail(idDossier);
            int numbretiket = nombreExemplaireMvtCaisseTicket("KEY_TICKET_COUNT");
            MvtTransaction mvtTransaction = findByPkey(idDossier);
            TEmplacement emplacement = mvtTransaction.getMagasin();
            String num = DateConverter.getShortId(10);
            String fileBarecode = buildLineBarecode(num);
            PrintService printService = findPrintService();
            TImprimante imprimante = findImprimanteByName();
            TOfficine officine = findOfficine();
            List<String> datas = generateData(lstTDossierReglementDetail, dossierReglement);
            List<String> infoSellers = generateDataOperateur(mvtTransaction.getUser());
            ImpressionServiceImpl imp = new ImpressionServiceImpl();
            imp.setOTImprimante(imprimante);
            imp.setEmplacement(emplacement);
            imp.setOfficine(officine);
            imp.setService(printService);
            imp.setTypeTicket(Constant.TICKET_REGLEMENT_CARNET_DEPOT);
            imp.setShowCodeBar(true);
            imp.setOperation(dossierReglement.getDtCREATED());
            imp.setIntBegin(0);
            List<String> infotiersPayants = generateDataTiersPayant(findTiersPayantById(mvtTransaction.getOrganisme()));
            imp.setTitle("");
            imp.buildTicket(datas, infoSellers, infotiersPayants, generateDataSummary(dossierReglement, mvtTransaction),
                    Collections.emptyList(), fileBarecode);
            for (int i = 0; i < numbretiket; i++) {
                imp.printTicketVente(1);
            }
            json.put("success", true);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false).put("msg", "Impression n'a pas aboutie");
        }
        return json;
    }

    public List<String> generateDataTiersPayant(TTiersPayant payant) {
        List<String> datas = new ArrayList<>();
        datas.add("Tiers-payant :: " + payant.getStrFULLNAME());
        return datas;
    }

    private Optional<Integer> findOrangeNumberOfTicket() {
        try {
            return Optional.ofNullable(Integer.valueOf(this.getEntityManager()
                    .find(TParameters.class, Constant.KEY_NOMBRE_TICKET_OTHER_ESPECE).getStrVALUE()));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Optional.empty();
        }
    }

    private int nbreDeCopiesOranges(TPreenregistrement p, int copies) {
        boolean hasMobile = p.getVenteReglements().stream()
                .anyMatch(r -> CommonUtils.isMobileTypeReglement(r.getTypeReglement().getLgTYPEREGLEMENTID()));

        if (hasMobile) {
            return findOrangeNumberOfTicket().orElse(copies);

        }
        return copies;
    }

    @Override
    public JSONObject ticketZ(Params params) {
        JSONObject json = new JSONObject();
        try {
            Set<TicketZDTO> tickets = dataPerUser(params);
            LinkedList<String> body = buildBody(tickets);
            LinkedList<String> footer = buildFooter(tickets);

            if (tickets.isEmpty()) {
                return json.put("success", false).put("msg",
                        "Aucune donnée trouvée . Veuillez choisir une autre option");
            }
            ImpressionServiceImpl serviceImpression = new ImpressionServiceImpl();
            TEmplacement emplacement = params.getOperateur().getLgEMPLACEMENTID();
            PrintService printService = findPrintService();
            TImprimante imprimante = findImprimanteByName();
            TOfficine officine = findOfficine();
            serviceImpression.setEmplacement(emplacement);
            serviceImpression.setDatas(new ArrayList<>());
            serviceImpression.setOperation(new Date());
            serviceImpression.setOperationLocalTime(LocalDateTime.now());
            serviceImpression.setSubtotal(new ArrayList<>());
            serviceImpression.setInfoTiersPayants(new ArrayList<>());
            serviceImpression.setTitle(getTicketZTitle(params));
            serviceImpression.setInfoSellers(new ArrayList<>());
            serviceImpression.setCommentaires(new ArrayList<>());
            serviceImpression.setShowCodeBar(false);
            serviceImpression.setOTImprimante(imprimante);
            serviceImpression.setOfficine(officine);
            serviceImpression.setService(printService);
            printTicketZ(serviceImpression, body, footer);

            return json.put("success", true).put("msg", "Opération effectuée ");
        } catch (PrinterException | JSONException e) {
            LOG.log(Level.SEVERE, null, e);
            return json.put("success", false).put("msg", "Erreur du serveur");

        }
    }

    private void printTicketZ(ImpressionServiceImpl serviceImpression, LinkedList<String> body,
            LinkedList<String> footer) throws PrinterException {

        int bodySize = body.size();
        int size = bodySize + footer.size();
        int breaking = breakingTicketZParam();

        if (size <= breaking) {

            body.addAll(footer);
            serviceImpression.setTypeTicket(Constant.TICKET_ZZ);
            serviceImpression.setTicketZdatas(body);
            serviceImpression.printTicketVente(1);
        } else {
            int counter = breaking;

            int k = 0;
            int page = (int) (Math.ceil(Double.valueOf(bodySize) / counter));

            int begin = 0;
            while (k < page) {
                if (bodySize <= counter) {
                    serviceImpression.setTypeTicket(Constant.TICKET_ZZ);
                    serviceImpression.setTicketZdatas(body);
                } else {
                    serviceImpression.setTypeTicket(Constant.TICKET_Z);
                    int rest = bodySize - begin;
                    if (rest < bodySize) {

                        serviceImpression.setDatas(body.subList(begin, counter));
                    } else if (rest == bodySize) {
                        serviceImpression.setDatas(body.subList(begin, rest - 1));
                    } else {
                        serviceImpression.setDatas(body.subList(begin, bodySize - 1));
                    }

                }
                serviceImpression.printTicketVente(1);
                k++;
                begin += breaking;
                counter += breaking;

            }
            serviceImpression.setTypeTicket(Constant.TICKET_Z);
            serviceImpression.setDatas(footer);
            serviceImpression.printTicketVente(1);
        }

    }

    private String getTicketZTitle(Params params) {
        LocalDate dtStart = LocalDate.parse(params.getDtStart());
        LocalDate dtEnd = LocalDate.parse(params.getDtEnd());
        String dtTitle = dtStart.format(DateTimeFormatter.ofPattern("dd/MM/YYYY"));
        String title;
        if (Objects.equals(params.getDtStart(), params.getDtEnd())) {
            if (StringUtils.isAllEmpty(params.getHrEnd(), params.getHrStart())) {
                if (dtStart.isEqual(LocalDate.now())) {
                    title = "TICKET Z DU " + dtTitle + "  A  "
                            + LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm"));
                } else {

                    title = "TICKET Z DU " + dtTitle;

                }
            } else if (StringUtils.isEmpty(params.getHrStart())) {
                title = "TICKET Z DU " + dtTitle + " AU " + dtEnd.format(DateTimeFormatter.ofPattern("dd/MM/YYYY"))
                        + " A  " + LocalTime.parse(params.getHrEnd()).format(DateTimeFormatter.ofPattern("HH:mm"));
            } else if (StringUtils.isEmpty(params.getHrEnd())) {
                title = "TICKET Z DU " + dtTitle + "  A  "
                        + LocalTime.parse(params.getHrStart()).format(DateTimeFormatter.ofPattern("HH:mm")) + " AU "
                        + dtEnd.format(DateTimeFormatter.ofPattern("dd/MM/YYYY"));
            } else {
                title = "TICKET Z DU " + dtTitle + "  A  "
                        + LocalTime.parse(params.getHrStart()).format(DateTimeFormatter.ofPattern("HH:mm")) + " AU "
                        + dtEnd.format(DateTimeFormatter.ofPattern("dd/MM/YYYY")) + " A  "
                        + LocalTime.parse(params.getHrEnd()).format(DateTimeFormatter.ofPattern("HH:mm"));
            }

        } else {
            if (StringUtils.isAllEmpty(params.getHrEnd(), params.getHrStart())) {
                title = "TICKET Z DU " + dtTitle + " AU " + dtEnd.format(DateTimeFormatter.ofPattern("dd/MM/YYYY"));
            } else {
                if (StringUtils.isEmpty(params.getHrStart())) {
                    title = "TICKET Z DU " + dtTitle + " AU " + dtEnd.format(DateTimeFormatter.ofPattern("dd/MM/YYYY"))
                            + " A  " + LocalTime.parse(params.getHrEnd()).format(DateTimeFormatter.ofPattern("HH:mm"));
                } else if (StringUtils.isEmpty(params.getHrEnd())) {
                    title = "TICKET Z DU " + dtTitle + "  A  "
                            + LocalTime.parse(params.getHrStart()).format(DateTimeFormatter.ofPattern("HH:mm")) + " AU "
                            + dtEnd.format(DateTimeFormatter.ofPattern("dd/MM/YYYY"));
                } else {
                    title = "TICKET Z DU " + dtTitle + "  A  "
                            + LocalTime.parse(params.getHrStart()).format(DateTimeFormatter.ofPattern("HH:mm")) + " AU "
                            + dtEnd.format(DateTimeFormatter.ofPattern("dd/MM/YYYY")) + " A  "
                            + LocalTime.parse(params.getHrEnd()).format(DateTimeFormatter.ofPattern("HH:mm"));
                }
            }

        }
        return title;
    }

    private void updateParameters(TypedQuery<MvtTransaction> q, Params params) {

        LocalDateTime dtStart = LocalDate.parse(params.getDtStart(), DateTimeFormatter.ISO_DATE)
                .atTime(LocalTime.parse(params.getHrStart()));
        LocalDateTime dtEnd = LocalDate.parse(params.getDtEnd(), DateTimeFormatter.ISO_DATE)
                .atTime(LocalTime.parse(params.getHrEnd().concat(":59")));
        q.setParameter("empl", params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
        q.setParameter("dtStart", java.sql.Timestamp.valueOf(dtStart), TemporalType.TIMESTAMP);
        q.setParameter("dtEnd", java.sql.Timestamp.valueOf(dtEnd), TemporalType.TIMESTAMP);
        if (StringUtils.isNotEmpty(params.getUserId()) && !"ALL".equals(params.getUserId())) {
            q.setParameter("userId", params.getUserId());
        }
    }

    List<MvtTransaction> ticketZVenteData(Params params) {
        String sql = "SELECT o FROM MvtTransaction o WHERE TIMESTAMP(o.createdAt)  BETWEEN :dtStart AND :dtEnd AND o.checked=TRUE AND o.magasin.lgEMPLACEMENTID=:empl AND  o.typeTransaction IN :typetransac {userId} AND o.pkey IN (SELECT p.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID FROM TPreenregistrementDetail p) ";

        try {
            TypedQuery<MvtTransaction> q = getEntityManager().createQuery(replaceSql(params, sql),
                    MvtTransaction.class);
            q.setParameter("typetransac", EnumSet.of(TypeTransaction.VENTE_COMPTANT, TypeTransaction.VENTE_CREDIT));
            updateParameters(q, params);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    List<MvtTransaction> ticketZSortieData(Params params) {
        String sql = "SELECT o FROM MvtTransaction o WHERE TIMESTAMP(o.createdAt)  BETWEEN :dtStart AND :dtEnd AND o.checked=TRUE AND o.magasin.lgEMPLACEMENTID=:empl AND  o.typeTransaction=:typetransac {userId}";

        try {
            TypedQuery<MvtTransaction> q = getEntityManager().createQuery(replaceSql(params, sql),
                    MvtTransaction.class);
            q.setParameter("typetransac", TypeTransaction.SORTIE);
            updateParameters(q, params);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private String replaceSql(Params params, String sql) {
        if (StringUtils.isNotEmpty(params.getUserId()) && !"ALL".equals(params.getUserId())) {
            return sql.replace("{userId}", " AND o.caisse.lgUSERID=:userId");
        } else {
            return sql.replace("{userId}", "");
        }

    }

    List<MvtTransaction> ticketZEntreesData(Params params) {
        String sql = "SELECT o FROM MvtTransaction o WHERE TIMESTAMP(o.createdAt)  BETWEEN :dtStart AND :dtEnd AND o.checked=TRUE AND o.magasin.lgEMPLACEMENTID=:empl AND  o.typeTransaction=:typetransac {userId}";

        try {
            TypedQuery<MvtTransaction> q = getEntityManager().createQuery(replaceSql(params, sql),
                    MvtTransaction.class);
            q.setParameter("typetransac", TypeTransaction.ENTREE);
            updateParameters(q, params);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private void updateTicket(TicketZDTO ticket, List<VenteReglement> venteReglements) {
        for (VenteReglement b : venteReglements) {
            String typeReglement = b.getTypeReglement().getLgTYPEREGLEMENTID();
            int montant = b.getMontant();
            switch (typeReglement) {
            case DateConverter.MODE_ESP:
                ticket.setTotalEsp(ticket.getTotalEsp() + montant);
                break;
            case DateConverter.MODE_VIREMENT:
                ticket.setTotalVirement(montant + ticket.getTotalVirement());

                break;
            case DateConverter.MODE_CHEQUE:
                ticket.setTotalCheque(montant + ticket.getTotalCheque());

                break;
            case DateConverter.MODE_CB:
                ticket.setTotalCB(montant + ticket.getTotalCB());

                break;
            case DateConverter.MODE_MOOV:
                ticket.setMontantMoov(montant + ticket.getMontantMoov());
                break;
            case DateConverter.MODE_MTN:
                ticket.setMontantMtn(montant + ticket.getMontantMtn());
                break;
            case DateConverter.TYPE_REGLEMENT_ORANGE:
                ticket.setMontantOrange(montant + ticket.getMontantOrange());
                break;
            case DateConverter.MODE_WAVE:
                ticket.setMontantWave(montant + ticket.getMontantWave());
                break;
            case DateConverter.MODE_REGL_DIFFERE:
                ticket.setDiffere(montant + ticket.getDiffere());
                break;
            default:
                break;
            }
        }
    }

    private void computeVenteTicketZDataByUser(TicketZDTO ticket, List<MvtTransaction> list) {

        for (MvtTransaction b : list) {
            if (b.getTypeTransaction() == TypeTransaction.VENTE_CREDIT) {
                ticket.setTotalCredit(ticket.getTotalCredit() + b.getMontantCredit());
            }
            switch (b.getReglement().getLgTYPEREGLEMENTID()) {
            case DateConverter.MODE_ESP:

                if (b.getTypeTransaction() == TypeTransaction.VENTE_COMPTANT) {
                    TTypeMvtCaisse mvtCaisse = b.gettTypeMvtCaisse();
                    if (mvtCaisse.getLgTYPEMVTCAISSEID().equals(DateConverter.MVT_REGLE_DIFF)) {
                        ticket.setDiffere(ticket.getDiffere() + b.getMontantRestant());
                    }
                }
                if (Objects.nonNull(b.getMontantRestant()) && b.getMontantRestant() > 0) {
                    ticket.setDiffere(ticket.getDiffere() + b.getMontantRestant());
                }
                List<VenteReglement> venteReglements = this.venteReglementService.getByVenteId(b.getPkey());
                if (CollectionUtils.isNotEmpty(venteReglements) && venteReglements.size() > 1) {
                    updateTicket(ticket, venteReglements);
                } else {
                    ticket.setTotalEsp(ticket.getTotalEsp() + b.getMontantRegle());
                }

                break;
            case DateConverter.MODE_VIREMENT:
                ticket.setTotalVirement(b.getMontantRegle() + ticket.getTotalVirement());

                break;
            case DateConverter.MODE_CHEQUE:
                ticket.setTotalCheque(b.getMontantRegle() + ticket.getTotalCheque());

                break;
            case DateConverter.MODE_CB:
                ticket.setTotalCB(b.getMontantRegle() + ticket.getTotalCB());

                break;
            case DateConverter.MODE_MOOV:
                ticket.setMontantMoov(b.getMontantRegle() + ticket.getMontantMoov());
                break;
            case DateConverter.MODE_MTN:
                ticket.setMontantMtn(b.getMontantRegle() + ticket.getMontantMtn());
                break;
            case DateConverter.TYPE_REGLEMENT_ORANGE:
                ticket.setMontantOrange(b.getMontantRegle() + ticket.getMontantOrange());
                break;
            case DateConverter.MODE_WAVE:
                ticket.setMontantWave(b.getMontantRegle() + ticket.getMontantWave());
                break;
            case DateConverter.MODE_REGL_DIFFERE:
                ticket.setDiffere(b.getMontantRestant() + ticket.getDiffere());
                break;
            default:
                break;
            }
        }

    }

    private boolean mvtIsReglement(TTypeMvtCaisse mvtCaisse) {
        return mvtCaisse.getLgTYPEMVTCAISSEID().equals(DateConverter.MVT_REGLE_TP)
                || mvtCaisse.getLgTYPEMVTCAISSEID().equals(DateConverter.MVT_REGLE_DIFF);
    }

    private void computeReglementTicketZDataByUser(TicketZDTO ticket, List<MvtTransaction> list) {

        for (MvtTransaction b : list) {
            TTypeMvtCaisse mvtCaisse = b.gettTypeMvtCaisse();
            switch (b.getReglement().getLgTYPEREGLEMENTID()) {

            case DateConverter.MODE_ESP:

                if (mvtIsReglement(mvtCaisse)) {
                    ticket.setTotalReglementEsp(b.getMontant() + ticket.getTotalReglementEsp());
                } else {
                    ticket.setTotalEntreeEsp(b.getMontant() + ticket.getTotalEntreeEsp());

                }

                break;
            case DateConverter.MODE_VIREMENT:

                if (mvtIsReglement(mvtCaisse)) {
                    ticket.setTotalReglementVirement(b.getMontant() + ticket.getTotalReglementVirement());
                } else {

                    ticket.setTotalEntreeVirement(b.getMontant() + ticket.getTotalEntreeVirement());
                }

                break;
            case DateConverter.MODE_CHEQUE:
                if (mvtIsReglement(mvtCaisse)) {

                    ticket.setTotalReglementCheque(b.getMontant() + ticket.getTotalReglementCheque());
                } else {

                    ticket.setTotalEntreeCheque(b.getMontant() + ticket.getTotalEntreeCheque());
                }

                break;
            case DateConverter.MODE_CB:
                if (mvtIsReglement(mvtCaisse)) {

                    ticket.setTotalReglementCB(b.getMontant() + ticket.getTotalReglementCB());
                } else {
                    ticket.setTotalEntreeCB(b.getMontant() + ticket.getTotalEntreeCB());
                }

                break;
            case DateConverter.MODE_MOOV:
                if (mvtIsReglement(mvtCaisse)) {
                    ticket.setMontantReglementMoov(b.getMontant() + ticket.getMontantReglementMoov());
                } else {
                    ticket.setMontantEntreeMoov(b.getMontant() + ticket.getMontantEntreeMoov());
                }
                break;
            case DateConverter.MODE_MTN:
                if (mvtIsReglement(mvtCaisse)) {
                    ticket.setMontantReglementMtn(b.getMontant() + ticket.getMontantReglementMtn());
                } else {
                    ticket.setMontantEntreeMtn(b.getMontant() + ticket.getMontantEntreeMtn());
                }
                break;
            case DateConverter.TYPE_REGLEMENT_ORANGE:
                if (mvtIsReglement(mvtCaisse)) {
                    ticket.setMontantReglementOrange(b.getMontant() + ticket.getMontantReglementOrange());
                } else {
                    ticket.setMontantEntreeOrange(b.getMontant() + ticket.getMontantEntreeOrange());
                }
                break;
            case DateConverter.MODE_WAVE:
                if (mvtIsReglement(mvtCaisse)) {
                    ticket.setMontantReglementWave(b.getMontant() + ticket.getMontantReglementWave());
                } else {
                    ticket.setMontantEntreeWave(b.getMontant() + ticket.getMontantEntreeWave());
                }
                break;
            default:
                break;

            }
        }

    }

    private void computeSortiesTicketZDataByUser(TicketZDTO ticket, List<MvtTransaction> list) {

        for (MvtTransaction b : list) {
            switch (b.getReglement().getLgTYPEREGLEMENTID()) {
            case DateConverter.MODE_ESP:
                ticket.setTotalSortieEsp(ticket.getTotalSortieEsp() + b.getMontant());
                break;
            case DateConverter.MODE_VIREMENT:
                ticket.setTotalVirement(ticket.getTotalVirement() + b.getMontant());
                ticket.setTotalSortieVirement(ticket.getTotalSortieVirement() + b.getMontant());

                break;
            case DateConverter.MODE_CHEQUE:

                ticket.setTotalSortieCheque(ticket.getTotalSortieCheque() + b.getMontant());

                break;
            case DateConverter.MODE_CB:

                ticket.setTotalSortieCB(ticket.getTotalSortieCB() + b.getMontant());
                break;
            case DateConverter.MODE_MOOV:
                ticket.setMontantSortieMoov(b.getMontant() + ticket.getMontantSortieMoov());
                break;
            case DateConverter.MODE_MTN:
                ticket.setMontantSortieMtn(b.getMontant() + ticket.getMontantSortieMtn());
                break;
            case DateConverter.TYPE_REGLEMENT_ORANGE:
                ticket.setMontantSortieOrange(b.getMontant() + ticket.getMontantSortieOrange());
                break;
            case DateConverter.MODE_WAVE:
                ticket.setMontantSortieWave(b.getMontant() + ticket.getMontantSortieWave());
                break;
            default:
                break;
            }
        }

    }

    private Set<TicketZDTO> dataPerUser(Params params) {
        List<TicketZDTO> tickes = new LinkedList<>();

        if (params.getDescription().equals("ALL")) {

            ticketZEntreesData(params).stream().collect(Collectors.groupingBy(MvtTransaction::getCaisse))
                    .forEach((user, trans) -> {
                        TicketZDTO userData = addUserInfo(user);
                        computeReglementTicketZDataByUser(userData, trans);
                        tickes.add(userData);

                    });
            ticketZSortieData(params).stream().collect(Collectors.groupingBy(MvtTransaction::getCaisse))
                    .forEach((user, trans) -> {
                        TicketZDTO userData = null;
                        ListIterator<TicketZDTO> listIterator = tickes.listIterator();
                        while (listIterator.hasNext()) {
                            TicketZDTO oldValue = listIterator.next();
                            if (oldValue.getUserId().equals(user.getLgUSERID())) {
                                userData = oldValue;
                                break;
                            }

                        }
                        if (Objects.isNull(userData)) {
                            userData = addUserInfo(user);
                        }

                        computeSortiesTicketZDataByUser(userData, trans);
                        tickes.add(userData);

                    });

        }

        ticketZVenteData(params).stream().collect(Collectors.groupingBy(MvtTransaction::getCaisse))
                .forEach((user, trans) -> {
                    TicketZDTO userData = null;
                    ListIterator<TicketZDTO> listIterator = tickes.listIterator();
                    while (listIterator.hasNext()) {
                        TicketZDTO oldValue = listIterator.next();
                        if (oldValue.getUserId().equals(user.getLgUSERID())) {
                            userData = oldValue;
                            break;
                        }

                    }
                    if (Objects.isNull(userData)) {
                        userData = addUserInfo(user);
                    }

                    computeVenteTicketZDataByUser(userData, trans);
                    tickes.add(userData);

                });

        return tickes.stream().collect(Collectors.toSet());

    }

    private TicketZDTO addUserInfo(TUser user) {
        TicketZDTO userData = new TicketZDTO();
        userData.setUserId(user.getLgUSERID());
        userData.setUser(String.format("%s.%s", user.getStrFIRSTNAME().substring(0, 1).toUpperCase(),
                user.getStrLASTNAME().toUpperCase()));
        return userData;
    }

    private LinkedList<String> buildBody(Set<TicketZDTO> tickets) {

        LinkedList<String> lstData = new LinkedList<>();
        if (tickets.isEmpty()) {
            return lstData;
        }
        for (TicketZDTO v : tickets) {
            long totalEspUser = (v.getTotalEsp() + v.getTotalEntreeEsp() + v.getTotalReglementEsp()
                    + v.getTotalSortieEsp());

            lstData.add("RECAPITULATIF DE CAISSE: " + v.getUser() + " ; ; ; ;1;0");
            lstData.add(" ; ".repeat(6));

            if (v.getTotalEsp() != 0) {
                lstData.add("Espèce(vno/vo):;" + NumberUtils.formatLongToString(v.getTotalEsp()) + BREAK_LINE);
            }
            if (v.getTotalCredit() != 0) {
                lstData.add("Crédit(vno/vo):;" + NumberUtils.formatLongToString(v.getTotalCredit()) + BREAK_LINE);
            }

            if (v.getTotalEntreeEsp() != 0) {
                lstData.add("Espèce Entrée:;" + NumberUtils.formatLongToString(v.getTotalEntreeEsp()) + BREAK_LINE);
            }
            if (v.getTotalReglementEsp() != 0) {
                lstData.add("Espèce Regl:;" + NumberUtils.formatLongToString(v.getTotalReglementEsp()) + BREAK_LINE);
            }
            if (v.getTotalSortieEsp() != 0) {
                lstData.add("Espèce Sortie:;" + NumberUtils.formatLongToString(v.getTotalSortieEsp()) + BREAK_LINE);
            }
            if (v.getDiffere() != 0) {
                lstData.add("Différé:;" + NumberUtils.formatLongToString(v.getDiffere()) + BREAK_LINE);
            }

            if (v.getMontantOrange() != 0) {
                lstData.add("OM (vno/vo):;" + NumberUtils.formatLongToString(v.getMontantOrange()) + BREAK_LINE);
            }
            if (v.getMontantWave() != 0) {
                lstData.add("WAVE (vno/vo):;" + NumberUtils.formatLongToString(v.getMontantWave()) + BREAK_LINE);
            }
            if (v.getMontantMtn() != 0) {
                lstData.add("MTN (vno/vo):;" + NumberUtils.formatLongToString(v.getMontantMtn()) + BREAK_LINE);
            }
            if (v.getMontantMoov() != 0) {
                lstData.add("MOOV (vno/vo):;" + NumberUtils.formatLongToString(v.getMontantMoov()) + BREAK_LINE);
            }
            if (totalEspUser != 0) {
                lstData.add("Total espèce: ;" + NumberUtils.formatLongToString(totalEspUser) + BREAK_LINE2);
            }

            if (v.getTotalCheque() != 0) {
                lstData.add("Total Ch (vno/vo): ;" + NumberUtils.formatLongToString(v.getTotalCheque()) + BREAK_LINE2);
            }

            if (v.getTotalCB() != 0) {
                lstData.add("Total CB (vno/vo): ;" + NumberUtils.formatLongToString(v.getTotalCB()) + BREAK_LINE2);
            }
            if (v.getTotalVirement() != 0) {
                lstData.add(
                        "Total Vir. (vno/vo): ;" + NumberUtils.formatLongToString(v.getTotalVirement()) + BREAK_LINE2);
            }
            if (v.getTotalEntreeCheque() != 0) {
                lstData.add("Total Entrée Chèque : ;" + NumberUtils.formatLongToString(v.getTotalEntreeCheque())
                        + BREAK_LINE2);
            }
            if (v.getMontantEntreeOrange() != 0) {
                lstData.add("Total Entrée OM : ;" + NumberUtils.formatLongToString(v.getMontantEntreeOrange())
                        + BREAK_LINE2);
            }

            if (v.getMontantEntreeWave() != 0) {
                lstData.add("Total Entrée WAVE : ;" + NumberUtils.formatLongToString(v.getMontantEntreeWave())
                        + BREAK_LINE2);
            }
            if (v.getMontantEntreeMtn() != 0) {
                lstData.add(
                        "Total Entrée MTN : ;" + NumberUtils.formatLongToString(v.getMontantEntreeMtn()) + BREAK_LINE2);
            }
            if (v.getMontantEntreeMoov() != 0) {
                lstData.add("Total Entrée MOOV : ;" + NumberUtils.formatLongToString(v.getMontantEntreeMoov())
                        + BREAK_LINE2);
            }
            if (v.getTotalEntreeCB() != 0) {
                lstData.add("Total Entrée CB : ;" + NumberUtils.formatLongToString(v.getTotalEntreeCB()) + BREAK_LINE2);
            }
            if (v.getTotalEntreeVirement() != 0) {
                lstData.add("Total entrée.Vir: ;" + NumberUtils.formatLongToString(v.getTotalEntreeVirement())
                        + BREAK_LINE2);
            }
            if (v.getTotalReglementCheque() != 0) {
                lstData.add(
                        "Total Regl Ch: ;" + NumberUtils.formatLongToString(v.getTotalReglementCheque()) + BREAK_LINE2);
            }
            if (v.getMontantReglementOrange() != 0) {
                lstData.add("Total.Regl.OM: ;" + NumberUtils.formatLongToString(v.getMontantReglementOrange())
                        + BREAK_LINE2);
            }
            if (v.getMontantReglementWave() != 0) {
                lstData.add("Total.Regl.WAVE: ;" + NumberUtils.formatLongToString(v.getMontantReglementWave())
                        + BREAK_LINE2);
            }
            if (v.getMontantReglementMtn() != 0) {
                lstData.add(
                        "Total.Regl.MTN: ;" + NumberUtils.formatLongToString(v.getMontantReglementMtn()) + BREAK_LINE2);
            }
            if (v.getMontantReglementMoov() != 0) {
                lstData.add("Total.Regl.MOOV: ;" + NumberUtils.formatLongToString(v.getMontantReglementMoov())
                        + BREAK_LINE2);
            }
            if (v.getTotalReglementCB() != 0) {
                lstData.add("Total Regl CB: ;" + NumberUtils.formatLongToString(v.getTotalReglementCB()) + BREAK_LINE2);
            }
            if (v.getTotalReglementVirement() != 0) {
                lstData.add("Total Regl Vir: ;" + NumberUtils.formatLongToString(v.getTotalReglementVirement())
                        + BREAK_LINE2);
            }

            if (v.getTotalSortieCheque() != 0) {
                lstData.add(
                        "Total Sortie Ch: ;" + NumberUtils.formatLongToString(v.getTotalSortieCheque()) + BREAK_LINE2);
            }
            if (v.getTotalSortieCB() != 0) {
                lstData.add("Total Sortie CB: ;" + NumberUtils.formatLongToString(v.getTotalSortieCB()) + BREAK_LINE2);
            }
            if (v.getMontantSortieOrange() != 0) {
                lstData.add("Total.Sortie.OM: ;" + NumberUtils.formatLongToString(v.getMontantSortieOrange())
                        + BREAK_LINE2);
            }
            if (v.getMontantSortieWave() != 0) {
                lstData.add("Total.Sortie.WAVE: ;" + NumberUtils.formatLongToString(v.getMontantSortieWave())
                        + BREAK_LINE2);
            }
            if (v.getMontantSortieMtn() != 0) {
                lstData.add(
                        "Total.Sortie.MTN: ;" + NumberUtils.formatLongToString(v.getMontantSortieMtn()) + BREAK_LINE2);
            }
            if (v.getMontantSortieMoov() != 0) {
                lstData.add("Total.Sortie.MOOV: ;" + NumberUtils.formatLongToString(v.getMontantSortieMoov())
                        + BREAK_LINE2);
            }
            if (v.getTotalSortieVirement() != 0) {
                lstData.add("Total Sortie Vir: ;" + NumberUtils.formatLongToString(v.getTotalSortieVirement())
                        + BREAK_LINE2);
            }
            lstData.add(" ; ".repeat(6));
        }
        return lstData;
    }

    private LinkedList<String> buildFooter(Set<TicketZDTO> tickets) {
        LinkedList<String> lstData = new LinkedList<>();
        if (tickets.isEmpty()) {
            return lstData;
        }
        long totalEsp = 0;
        long totalCredit = 0;
        long totalCheque = 0;
        long totalVirement = 0;
        long totalCB = 0;
        long differe = 0;
        long montantMtn = 0;
        long montantOrange = 0;
        long montantMoov = 0;
        long montantWave = 0;
        for (TicketZDTO v : tickets) {
            totalEsp += (v.getTotalEsp() + v.getTotalEntreeEsp() + v.getTotalReglementEsp() + v.getTotalSortieEsp());

            totalCredit += (v.getTotalCredit() + v.getTotalEntreeCredit() + v.getTotalReglementCredit()
                    + v.getTotalSortieCredit());
            totalCheque += (v.getTotalCheque() + v.getTotalEntreeCheque() + v.getTotalReglementCheque()
                    + v.getTotalSortieCheque());
            totalVirement += (v.getTotalVirement() + v.getTotalEntreeVirement() + v.getTotalReglementVirement()
                    + v.getTotalSortieVirement());
            totalCB += (v.getTotalCB() + v.getTotalEntreeCB() + v.getTotalReglementCB() + v.getTotalSortieCB());
            differe += v.getDiffere();
            montantWave += (v.getMontantWave() + v.getMontantSortieWave() + v.getMontantEntreeWave());
            montantMtn += (v.getMontantMtn() + v.getMontantSortieMtn() + v.getMontantEntreeMtn());
            montantMoov += (v.getMontantMoov() + v.getMontantSortieMoov() + v.getMontantEntreeMoov());
            montantOrange += (v.getMontantOrange() + v.getMontantSortieOrange() + v.getMontantEntreeOrange());

        }

        if (totalEsp != 0) {

            lstData.add("TOTAL ESP: ; " + NumberUtils.formatLongToString(totalEsp) + BREAK_LINE_FOOTER);
        }

        if (montantOrange != 0) {

            lstData.add("TOTAL OM: ; " + NumberUtils.formatLongToString(montantOrange) + BREAK_LINE_FOOTER);
        }
        if (montantWave != 0) {

            lstData.add("TOTAL WAVE: ; " + NumberUtils.formatLongToString(montantWave) + BREAK_LINE_FOOTER);
        }
        if (montantMtn != 0) {

            lstData.add("TOTAL MTN: ; " + NumberUtils.formatLongToString(montantMtn) + BREAK_LINE_FOOTER);
        }
        if (montantMoov != 0) {

            lstData.add("TOTAL MOOV: ; " + NumberUtils.formatLongToString(montantMoov) + BREAK_LINE_FOOTER);
        }
        if (totalCredit != 0) {

            lstData.add("TOTAL (VNO/VO): ;" + NumberUtils.formatLongToString(totalCredit) + BREAK_LINE_FOOTER);
        }

        if (totalCheque != 0) {
            lstData.add("TOTAL CH: ;" + NumberUtils.formatLongToString(totalCheque) + BREAK_LINE_FOOTER);
        }

        if (totalCB != 0) {
            lstData.add("TOTAL CB: ; " + NumberUtils.formatLongToString(totalCB) + BREAK_LINE_FOOTER);
        }

        if (totalVirement != 0) {
            lstData.add("TOTAL VIR: ; " + NumberUtils.formatLongToString(totalVirement) + BREAK_LINE_FOOTER);
        }
        if (differe != 0) {
            lstData.add("TOTAL DIFFERE: ; " + NumberUtils.formatLongToString(differe) + BREAK_LINE_FOOTER);
        }
        return lstData;
    }

    private int breakingTicketZParam() {
        try {

            return Integer
                    .parseInt(getEntityManager().find(TParameters.class, "BREAKING_TICKET_Z").getStrVALUE().trim());
        } catch (NumberFormatException e) {
            return 40;
        }
    }

    @Override
    public void printMvtCaisse(String mvtCaisseId, TUser user) {

        try {

            rest.service.dto.MvtCaisseDTO mvtCaisse = getMvtCaisse(mvtCaisseId);

            int numbretiket = nombreExemplaireMvtCaisseTicket("KEY_TICKET_COUNTMVT");

            String fileBarecode = buildLineBarecode(mvtCaisse.getTiket());
            PrintService printService = findPrintService();
            TImprimante imprimante = findImprimanteByName();
            TOfficine officine = findOfficine();
            List<String> datas = generateData(mvtCaisse);

            ImpressionServiceImpl imp = new ImpressionServiceImpl();
            imp.setOTImprimante(imprimante);
            imp.setEmplacement(user.getLgEMPLACEMENTID());
            imp.setOfficine(officine);
            imp.setService(printService);
            imp.setTypeTicket(Constant.ACTION_OTHER);
            imp.setShowCodeBar(true);
            imp.setOperation(mvtCaisse.getDateMvt());
            imp.setIntBegin(0);

            imp.setTitle(mvtCaisse.getTypeMvtCaisse());
            imp.buildTicket(datas, Collections.emptyList(), Collections.emptyList(), Collections.emptyList(),
                    buildComment(mvtCaisse.getCommentaire()), fileBarecode);
            for (int i = 0; i < numbretiket; i++) {
                imp.printTicketVente(1);
            }

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    private List<String> generateData(rest.service.dto.MvtCaisseDTO mvtCaisse) {
        List<String> datas = new ArrayList<>();
        datas.add("Code comptable: ;" + mvtCaisse.getNumCompte() + "; ");
        datas.add("Libellé: ;" + mvtCaisse.getModeReglement() + "; ");
        datas.add("Montant: ;" + NumberUtils.formatLongToString(mvtCaisse.getMontant()) + "; F CFA");
        datas.add("Opérateur: ;" + mvtCaisse.getUserAbrName() + "; ");

        return datas;
    }

    private List<String> buildComment(String comment) {
        List<String> commentSection = new ArrayList<>();
        if (StringUtils.isNotEmpty(comment)) {
            commentSection.add(" " + ";0");
            commentSection.add(comment + ";0");
        }
        return commentSection;
    }

    private rest.service.dto.MvtCaisseDTO buildMvtCaisse(Tuple t) {

        long amount = t.get("montant", Double.class).longValue();

        return rest.service.dto.MvtCaisseDTO.builder().montant(amount)
                .typeMvtCaisse(t.get("typeMvtCaisse", String.class)).modeReglement(t.get("modeReglement", String.class))
                .userAbrName(t.get("userAbrName", String.class)).numCompte(t.get("numCompte", String.class))
                .tiket(t.get("tiket", String.class)).heureOpreration(t.get("heureOpreration", String.class))
                .dateOpreration(t.get("dateOpreration", java.sql.Date.class).toLocalDate()
                        .format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                .commentaire(t.get("commentaire", String.class)).dateMvt(t.get("dateMvt", java.sql.Date.class)).build();
    }

    private rest.service.dto.MvtCaisseDTO getMvtCaisse(String id) {
        String sql = " SELECT DATE(m.dt_CREATED) AS dateMvt, tm.`lg_TYPE_MVT_CAISSE_ID` AS typeId, m.`str_COMMENTAIRE` as commentaire, tm.categorie AS categorie, m.str_NUM_COMPTE AS numCompte,DATE(m.dt_CREATED) AS dateOpreration,DATE_FORMAT(m.dt_CREATED,'%H:%i:%s') AS heureOpreration,m.int_AMOUNT AS montant,tm.str_DESCRIPTION AS typeMvtCaisse,CONCAT(SUBSTR(u.str_FIRST_NAME, 1, 1), '.', u.str_LAST_NAME)   AS userAbrName,tr.str_NAME AS modeReglement,m.str_REF_TICKET AS tiket FROM t_mvt_caisse m,t_type_mvt_caisse tm,t_user u, t_mode_reglement modeReglement,t_type_reglement tr  WHERE m.lg_TYPE_MVT_CAISSE_ID=tm.lg_TYPE_MVT_CAISSE_ID AND u.lg_USER_ID=m.lg_USER_ID AND m.lg_MODE_REGLEMENT_ID=modeReglement.lg_MODE_REGLEMENT_ID AND modeReglement.lg_TYPE_REGLEMENT_ID=tr.lg_TYPE_REGLEMENT_ID  AND m.`lg_MVT_CAISSE_ID`=?1";

        try {
            Query query = em.createNativeQuery(sql, Tuple.class).setParameter(1, id).setMaxResults(1);

            return Optional.ofNullable((Tuple) query.getSingleResult()).map(this::buildMvtCaisse).orElseThrow();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            throw e;

        }
    }

    private int nombreExemplaireMvtCaisseTicket(String key) {

        try {
            TParameters nbreTicket = getEntityManager().find(TParameters.class, key);

            if (nbreTicket != null) {
                return Integer.parseInt(nbreTicket.getStrVALUE().trim());
            }
            return 1;
        } catch (NumberFormatException e) {
            return 1;
        }

    }

    @Override
    public JSONObject fetchTicketZ(Params params) throws JSONException {
        JSONObject json = new JSONObject();
        TicketRecapWrapper recapWrapper = buildTicketZ(params);
        if (recapWrapper != null) {
            json.put("data", new JSONObject(recapWrapper));
        }

        return json;
    }

    @Override
    public TicketRecapWrapper buildTicketZ(Params params) {
        Set<TicketZDTO> tickes = dataPerUser(params);
        if (tickes.isEmpty()) {
            return null;
        }
        return buildTicketBody(tickes);
    }

    private TicketRecapWrapper buildTicketBody(Set<TicketZDTO> tickets) {

        if (tickets.isEmpty()) {
            return null;
        }
        TicketRecapWrapper wrapper = new TicketRecapWrapper();

        List<TicketRecap> lstData = new ArrayList<>();
        long totalEsp = 0;
        long totalCredit = 0;
        long totalCheque = 0;
        long totalVirement = 0;
        long totalCB = 0;
        long differe = 0;
        long montantMtn = 0;
        long montantOrange = 0;
        long montantMoov = 0;
        long montantWave = 0;
        List<ModePaymentAmount> totauxGl = new ArrayList<>();
        for (TicketZDTO v : tickets) {
            TicketRecap ticketRecap = new TicketRecap();
            List<ModePaymentAmount> modePaymentAmounts = new ArrayList<>();
            List<ModePaymentAmount> totaux = new ArrayList<>();
            long totalEspUser = (v.getTotalEsp() + v.getTotalEntreeEsp() + v.getTotalReglementEsp()
                    + v.getTotalSortieEsp());
            totalEsp += totalEspUser;
            totalCredit += (v.getTotalCredit() + v.getTotalEntreeCredit() + v.getTotalReglementCredit()
                    + v.getTotalSortieCredit());
            totalCheque += (v.getTotalCheque() + v.getTotalEntreeCheque() + v.getTotalReglementCheque()
                    + v.getTotalSortieCheque());
            totalVirement += (v.getTotalVirement() + v.getTotalEntreeVirement() + v.getTotalReglementVirement()
                    + v.getTotalSortieVirement());
            totalCB += (v.getTotalCB() + v.getTotalEntreeCB() + v.getTotalReglementCB() + v.getTotalSortieCB());
            differe += v.getDiffere();
            montantWave += (v.getMontantWave() + v.getMontantSortieWave() + v.getMontantEntreeWave());
            montantMtn += (v.getMontantMtn() + v.getMontantSortieMtn() + v.getMontantEntreeMtn());
            montantMoov += (v.getMontantMoov() + v.getMontantSortieMoov() + v.getMontantEntreeMoov());
            montantOrange += (v.getMontantOrange() + v.getMontantSortieOrange() + v.getMontantEntreeOrange());

            ticketRecap.setUser(v.getUser());
            if (v.getTotalEsp() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Espèce(vno/vo)",
                        NumberUtils.formatLongToString(v.getTotalEsp()));
                modePaymentAmounts.add(modePaymentAmount);

            }
            if (v.getTotalCredit() != 0) {

                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Crédit(vno/vo)",
                        NumberUtils.formatLongToString(v.getTotalCredit()));
                modePaymentAmounts.add(modePaymentAmount);
            }

            if (v.getTotalEntreeEsp() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Espèce Entrée",
                        NumberUtils.formatLongToString(v.getTotalEntreeEsp()));
                modePaymentAmounts.add(modePaymentAmount);
            }
            if (v.getTotalReglementEsp() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Espèce Règlement",
                        NumberUtils.formatLongToString(v.getTotalReglementEsp()));
                modePaymentAmounts.add(modePaymentAmount);

            }
            if (v.getTotalSortieEsp() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Espèce Sortie",
                        NumberUtils.formatLongToString(v.getTotalSortieEsp()));
                modePaymentAmounts.add(modePaymentAmount);
            }

            if (v.getMontantOrange() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("OM (vno/vo)",
                        NumberUtils.formatLongToString(v.getMontantOrange()));
                modePaymentAmounts.add(modePaymentAmount);
            }
            if (v.getMontantWave() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("WAVE (vno/vo)",
                        NumberUtils.formatLongToString(v.getMontantWave()));
                modePaymentAmounts.add(modePaymentAmount);
            }
            if (v.getMontantMtn() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("MTN (vno/vo)",
                        NumberUtils.formatLongToString(v.getMontantMtn()));
                modePaymentAmounts.add(modePaymentAmount);
            }
            if (v.getMontantMoov() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("MOOV (vno/vo)",
                        NumberUtils.formatLongToString(v.getMontantMoov()));
                modePaymentAmounts.add(modePaymentAmount);
            }
            if (v.getDiffere() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Différé",
                        NumberUtils.formatLongToString(v.getDiffere()));
                modePaymentAmounts.add(modePaymentAmount);
            }
            if (totalEspUser != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total espèce",
                        NumberUtils.formatLongToString(totalEspUser));
                totaux.add(modePaymentAmount);
            }

            if (v.getTotalCheque() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total Ch (vno/vo)",
                        NumberUtils.formatLongToString(v.getTotalCheque()));
                totaux.add(modePaymentAmount);
            }

            if (v.getTotalCB() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total CB (vno/vo)",
                        NumberUtils.formatLongToString(v.getTotalCB()));
                totaux.add(modePaymentAmount);
            }
            if (v.getTotalVirement() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total Vir",
                        NumberUtils.formatLongToString(v.getTotalVirement()));
                totaux.add(modePaymentAmount);
            }
            if (v.getTotalEntreeCheque() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total Entrée Chèque",
                        NumberUtils.formatLongToString(v.getTotalEntreeCheque()));
                totaux.add(modePaymentAmount);
            }
            if (v.getMontantEntreeOrange() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total Entrée OM",
                        NumberUtils.formatLongToString(v.getMontantEntreeOrange()));
                totaux.add(modePaymentAmount);
            }

            if (v.getMontantEntreeWave() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total Entrée WAVE",
                        NumberUtils.formatLongToString(v.getMontantEntreeWave()));
                totaux.add(modePaymentAmount);
            }
            if (v.getMontantEntreeMtn() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total Entrée MTN",
                        NumberUtils.formatLongToString(v.getMontantEntreeMtn()));
                totaux.add(modePaymentAmount);
            }
            if (v.getMontantEntreeMoov() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total Entrée MOOV",
                        NumberUtils.formatLongToString(v.getMontantEntreeMoov()));
                totaux.add(modePaymentAmount);
            }
            if (v.getTotalEntreeCB() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total Entrée CB",
                        NumberUtils.formatLongToString(v.getTotalEntreeCB()));
                totaux.add(modePaymentAmount);
            }
            if (v.getTotalEntreeVirement() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total entrée.Vir",
                        NumberUtils.formatLongToString(v.getTotalEntreeVirement()));
                totaux.add(modePaymentAmount);
            }
            if (v.getTotalReglementCheque() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total Regl Ch",
                        NumberUtils.formatLongToString(v.getTotalReglementCheque()));
                totaux.add(modePaymentAmount);
            }
            if (v.getMontantReglementOrange() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total.Regl.OM",
                        NumberUtils.formatLongToString(v.getMontantReglementOrange()));
                totaux.add(modePaymentAmount);
            }
            if (v.getMontantReglementWave() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total.Regl.WAVE",
                        NumberUtils.formatLongToString(v.getMontantReglementWave()));
                totaux.add(modePaymentAmount);
            }
            if (v.getMontantReglementMtn() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total.Regl.MTN",
                        NumberUtils.formatLongToString(v.getMontantReglementMtn()));
                totaux.add(modePaymentAmount);
            }
            if (v.getMontantReglementMoov() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total.Regl.MOOV",
                        NumberUtils.formatLongToString(v.getMontantReglementMoov()));
                totaux.add(modePaymentAmount);
            }
            if (v.getTotalReglementCB() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total Regl CB",
                        NumberUtils.formatLongToString(v.getTotalReglementCB()));
                totaux.add(modePaymentAmount);
            }
            if (v.getTotalReglementVirement() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total Regl Vir",
                        NumberUtils.formatLongToString(v.getTotalReglementVirement()));
                totaux.add(modePaymentAmount);
            }

            if (v.getTotalSortieCheque() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total Sortie Ch",
                        NumberUtils.formatLongToString(v.getTotalSortieCheque()));
                totaux.add(modePaymentAmount);
            }
            if (v.getTotalSortieCB() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total Sortie CB",
                        NumberUtils.formatLongToString(v.getTotalSortieCB()));
                totaux.add(modePaymentAmount);
            }
            if (v.getMontantSortieOrange() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total.Sortie.OM",
                        NumberUtils.formatLongToString(v.getMontantSortieOrange()));
                totaux.add(modePaymentAmount);
            }
            if (v.getMontantSortieWave() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total.Sortie.WAVE",
                        NumberUtils.formatLongToString(v.getMontantSortieWave()));
                totaux.add(modePaymentAmount);
            }
            if (v.getMontantSortieMtn() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total.Sortie.MTN",
                        NumberUtils.formatLongToString(v.getMontantSortieMtn()));
                totaux.add(modePaymentAmount);
            }
            if (v.getMontantSortieMoov() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total.Sortie.MOOV",
                        NumberUtils.formatLongToString(v.getMontantSortieMoov()));
                totaux.add(modePaymentAmount);
            }
            if (v.getTotalSortieVirement() != 0) {
                ModePaymentAmount modePaymentAmount = new ModePaymentAmount("Total Sortie Vir",
                        NumberUtils.formatLongToString(v.getTotalSortieVirement()));
                totaux.add(modePaymentAmount);
            }
            ticketRecap.setModePaymentAmounts(modePaymentAmounts);
            ticketRecap.setTotaux(totaux);
            lstData.add(ticketRecap);
        }

        if (totalEsp != 0) {
            ModePaymentAmount modePaymentAmount = new ModePaymentAmount("TOTAL ESP",
                    NumberUtils.formatLongToString(totalEsp));
            totauxGl.add(modePaymentAmount);
        }

        if (montantOrange != 0) {
            ModePaymentAmount modePaymentAmount = new ModePaymentAmount("TOTAL OM",
                    NumberUtils.formatLongToString(montantOrange));
            totauxGl.add(modePaymentAmount);

        }
        if (montantWave != 0) {
            ModePaymentAmount modePaymentAmount = new ModePaymentAmount("TOTAL WAVE",
                    NumberUtils.formatLongToString(montantWave));
            totauxGl.add(modePaymentAmount);

        }
        if (montantMtn != 0) {
            ModePaymentAmount modePaymentAmount = new ModePaymentAmount("TOTAL MTN",
                    NumberUtils.formatLongToString(montantMtn));
            totauxGl.add(modePaymentAmount);
        }
        if (montantMoov != 0) {
            ModePaymentAmount modePaymentAmount = new ModePaymentAmount("TOTAL MOOV",
                    NumberUtils.formatLongToString(montantMoov));
            totauxGl.add(modePaymentAmount);
        }

        if (totalCheque != 0) {
            ModePaymentAmount modePaymentAmount = new ModePaymentAmount("TOTAL CH",
                    NumberUtils.formatLongToString(totalCheque));
            totauxGl.add(modePaymentAmount);
        }

        if (totalCB != 0) {
            ModePaymentAmount modePaymentAmount = new ModePaymentAmount("TOTAL CB",
                    NumberUtils.formatLongToString(totalCB));
            totauxGl.add(modePaymentAmount);
        }

        if (totalVirement != 0) {
            ModePaymentAmount modePaymentAmount = new ModePaymentAmount("TOTAL VIR",
                    NumberUtils.formatLongToString(totalVirement));
            totauxGl.add(modePaymentAmount);
        }
        if (differe != 0) {
            ModePaymentAmount modePaymentAmount = new ModePaymentAmount("TOTAL DIFFERE",
                    NumberUtils.formatLongToString(differe));
            totauxGl.add(modePaymentAmount);
        }
        if (totalCredit != 0) {
            ModePaymentAmount modePaymentAmount = new ModePaymentAmount("TOTAL (VNO/VO)",
                    NumberUtils.formatLongToString(totalCredit));
            totauxGl.add(modePaymentAmount);
        }
        wrapper.setDatas(lstData);
        wrapper.setTotaux(totauxGl);
        return wrapper;
    }

    @Override
    public JSONObject printReglementFacture(String lgDossierReglementId, TUser user) {
        JSONObject json = new JSONObject();
        try {
            TDossierReglement dossierReglement = getEntityManager().find(TDossierReglement.class, lgDossierReglementId);
            List<TDossierReglementDetail> lstTDossierReglementDetail = getListDossierReglementDetail(
                    lgDossierReglementId);

            int numbretiket = nombreExemplaireMvtCaisseTicket("KEY_TICKET_COUNT");
            MvtTransaction mvtTransaction = findByPkey(lgDossierReglementId);
            TEmplacement emplacement = mvtTransaction.getMagasin();

            PrintService printService = findPrintService();
            TImprimante imprimante = findImprimanteByName();
            TOfficine officine = findOfficine();
            List<String> datas = generateData(lstTDossierReglementDetail, dossierReglement);
            List<String> infoSellers = generateDataOperateur(mvtTransaction.getUser());
            ImpressionServiceImpl imp = new ImpressionServiceImpl();
            imp.setOTImprimante(imprimante);
            imp.setEmplacement(emplacement);
            imp.setOfficine(officine);
            imp.setService(printService);
            imp.setTypeTicket(Constant.TICKET_REGLEMENT);
            imp.setShowCodeBar(false);
            imp.setOperation(dossierReglement.getDtCREATED());
            imp.setIntBegin(0);
            TFacture facture = dossierReglement.getLgFACTUREID();
            List<String> infotiersPayants = generateDataTiersPayant(facture.getTiersPayant());
            imp.setTitle("Règlement de la facture N°" + facture.getStrCODEFACTURE());
            imp.buildTicket(datas, infoSellers, infotiersPayants, generateDataSummary(dossierReglement, mvtTransaction),
                    Collections.emptyList(), null);
            for (int i = 0; i < numbretiket; i++) {
                imp.printTicketVente(1);
            }
            json.put("success", true);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false);
        }
        return json;
    }

    private List<TDossierReglementDetail> getListDossierReglementDetail(String lgDossierReglementId) {

        try {
            return em.createQuery(
                    "SELECT t FROM TDossierReglementDetail t WHERE t.lgDOSSIERREGLEMENTID.lgDOSSIERREGLEMENTID = ?1 AND t.strSTATUT = ?2",
                    TDossierReglementDetail.class).setParameter(1, lgDossierReglementId)
                    .setParameter(2, Constant.STATUT_IS_CLOSED).getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    // @Asynchronous
    @Override
    public void sendToSms(Params params) throws JSONException {
        params.setOperateur(this.sessionHelperService.getCurrentUser());
        TicketRecapWrapper recapWrapper = buildTicketZ(params);
        StringBuilder sb = new StringBuilder();
        recapWrapper.getDatas().forEach(ticketRecap -> {
            sb.append("RECAPITULATIF DE ").append(ticketRecap.getUser()).append("\n\n");
            ticketRecap.getModePaymentAmounts().forEach((modePaymentAmount) -> {
                sb.append(modePaymentAmount.getModeLibelle()).append(": ").append(modePaymentAmount.getMontant())
                        .append("\n");
            });
            sb.append("\n").append("TOTAL ").append(ticketRecap.getUser()).append("\n");
            ticketRecap.getTotaux().forEach((modePaymentAmount) -> {
                sb.append(modePaymentAmount.getModeLibelle()).append(": ").append(modePaymentAmount.getMontant())
                        .append("\n");
            });
        });

        sb.append("\n").append("TOTAL GENERAL").append("\n\n");
        recapWrapper.getTotaux().forEach((modePaymentAmount) -> {
            sb.append(modePaymentAmount.getModeLibelle()).append(": ").append(modePaymentAmount.getMontant())
                    .append("\n");
        });
        this.smsService.sendSMS(sb.toString());

    }
}
