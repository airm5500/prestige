/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package fileupload;

import dal.OrderDetailLot;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamilleGrossiste_;
import dal.TFamille_;
import dal.TGrossiste;
import dal.TOrder;
import dal.TOrderDetail;
import dal.TParameters;
import dal.TUser;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.inject.Inject;
import javax.json.Json;
import javax.json.JsonBuilderFactory;
import javax.json.JsonObjectBuilder;
import javax.persistence.EntityManager;
import javax.persistence.NoResultException;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.annotation.MultipartConfig;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import javax.servlet.http.Part;
import javax.transaction.UserTransaction;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.apache.commons.lang.RandomStringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.utils.jdom;
import util.Constant;
import util.DateConverter;
import util.DateUtil;

/**
 *
 * @author KKOFFI
 */
@WebServlet(name = "FileFormaManager", urlPatterns = { "/commande" })
@MultipartConfig(fileSizeThreshold = 5242880, maxFileSize = 20971520L, maxRequestSize = 41943040L)
public class FileFormaManager extends HttpServlet {

    private static final Logger LOG = Logger.getLogger(FileFormaManager.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @Inject
    private UserTransaction userTransaction;
    private List<OrderItem> items;

    private enum Format {
        LABOREX, COPHARMED, TEDIS, DPCI, CIP_QTE, CIP_QTE_CIP_QTER_PA, TEDIS_2
    }

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("application/json;charset=UTF-8");

        String lgGROSSISTEID = "";

        if (request.getParameter("lg_GROSSISTE_ID") != null) {
            lgGROSSISTEID = request.getParameter("lg_GROSSISTE_ID");
        }

        String modeBL = request.getParameter("modeBL");
        items = new ArrayList<>();

        JsonBuilderFactory factory = Json.createBuilderFactory(null);
        JsonObjectBuilder json = factory.createObjectBuilder();
        Part part = request.getPart("fichier");
        String fileName = part.getSubmittedFileName();
        String extension = fileName.substring(fileName.indexOf(".") + 1, fileName.length());
        HttpSession session = request.getSession();
        TUser user = (TUser) session.getAttribute(Constant.AIRTIME_USER);

        JSONObject responseJson = new JSONObject();
        try (PrintWriter out = response.getWriter()) {
            switch (extension) {
            case "csv":
                responseJson = bulkInsertFormatCSV(part, lgGROSSISTEID, Format.valueOf(modeBL), user);
                break;

            case "txt":
                responseJson = bulkInsertTxt(part, lgGROSSISTEID, user);
                break;
            default:

                break;
            }
            if (!items.isEmpty()) {

                json.add("toBe", true);
                String finalFile = fichierReponse(request.getServletContext(),
                        fileName.substring(0, fileName.indexOf('.') - 1), Format.valueOf(modeBL), items);
                jdom.InitRessource();
                json.add("success", "<span style='color:blue;font-weight:800;'>" + responseJson.getInt("count") + "/"
                        + responseJson.getInt("ligne")
                        + "\n</span> produits mis à jour <a href=\"../VericationCommande?fileName=" + finalFile
                        + " \" style=\"color:red !important;\">Cliquer sur le lien pour télécharger les produits non pris en compte</a>");
            } else {
                json.add("toBe", false);
                json.add("success", "<span style='color:blue;font-weight:800;'>" + responseJson.getInt("count") + "/"
                        + responseJson.getInt("ligne") + "</span> produits mis à jour");
            }
            json.add("statut", 1);

            out.println(json.build());
        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);

        }
    }

    public String buildCommandeRef(LocalDate myDate) throws JSONException {
        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy/MM/dd");
        TParameters oParameters = em.find(TParameters.class, "KEY_LAST_ORDER_COMMAND_NUMBER");
        TParameters orderNumberParam = em.find(TParameters.class, "KEY_SIZE_ORDER_NUMBER");
        String stringDate = DateUtil.convertToString(myDate, dateTimeFormatter);
        String jsondata = oParameters.getStrVALUE();
        int intLastCode = 0;
        intLastCode = intLastCode + 1;

        try {
            JSONArray jsonArray = new JSONArray(jsondata);
            JSONObject jsonObject = jsonArray.getJSONObject(0);
            String strlastdate = jsonObject.getString("str_last_date");
            intLastCode = Integer.parseInt(jsonObject.getString("int_last_code"));
            LocalDate dtLastDate = DateUtil.convertStringToLocalDate(strlastdate, dateTimeFormatter);

            String strLasd = dtLastDate.format(dateTimeFormatter);
            String strActd = stringDate;

            if (!strLasd.equals(strActd)) {
                intLastCode = 0;
            }

        } catch (Exception e) {
            LOG.log(Level.INFO, null, e);
        }

        // KEY_SIZE_ORDER_NUMBER
        LocalDate now = LocalDate.now();

        int mois = now.getMonthValue() + 1;
        int jour = now.getDayOfMonth();
        String moisTostring = "";

        int intsize = ((intLastCode + 1) + "").length();
        int intsizeTobuild = Integer.parseInt(orderNumberParam.getStrVALUE());
        String strLastCode = "";
        for (int i = 0; i < (intsizeTobuild - intsize); i++) {
            strLastCode = strLastCode + "0";
        }

        strLastCode = strLastCode + (intLastCode + 1) + "";

        if (mois < 10) {
            moisTostring = "0" + mois;
        } else {
            moisTostring = String.valueOf(mois);
        }
        String strCode = jour + "" + moisTostring + "" + myDate.getYear() + "_" + strLastCode;
        JSONObject json = new JSONObject();
        JSONArray arrayObj = new JSONArray();
        json.put("int_last_code", strLastCode);
        json.put("str_last_date", myDate.format(dateTimeFormatter));
        arrayObj.put(json);
        String jsonData = arrayObj.toString();

        oParameters.setStrVALUE(jsonData);
        this.em.merge(oParameters);

        return strCode;
    }

    private TOrder createOrder(TGrossiste grossiste, TUser user) {
        TOrder order = new TOrder();
        order.setLgORDERID(RandomStringUtils.randomAlphanumeric(20));
        order.setLgUSERID(user);
        try {

            if (grossiste != null) {
                order.setLgGROSSISTEID(grossiste);
                order.setStrREFORDER(this.buildCommandeRef(LocalDate.now()));
            }
        } catch (Exception e) {
            LOG.log(Level.INFO, null, e);
        }
        order.setStrSTATUT(Constant.STATUT_IS_PROGRESS);
        order.setDtCREATED(new Date());
        order.setDtUPDATED(order.getDtCREATED());
        order.setDirectImport(Boolean.TRUE);
        em.persist(order);

        return order;

    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

    private JSONObject bulkInsertTxt(Part part, String lgGROSSISTE, TUser user) throws Exception {
        int count = 0;
        int i = 0;
        JSONObject json = new JSONObject();

        TGrossiste grossiste = em.find(TGrossiste.class, lgGROSSISTE);
        userTransaction.begin();
        TOrder order = createOrder(grossiste, user);
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(part.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String[] row = line.split("\t");
                int ligne = createOrderDetailViaCsv(order, row[1], Integer.parseInt(row[3]), Integer.parseInt(row[2]),
                        Integer.parseInt(row[5]), 0, null, null);
                i += ligne;
                if (ligne == 0) {
                    /*
                     * items.add(new OrderItem(row[1], Integer.valueOf(row[3]), row[1], Integer.valueOf(row[3]),
                     * Double.valueOf(row[5])));
                     */
                }
                if ((count % 20) == 0) {
                    em.flush();
                    em.clear();
                }
                count++;
            }
            userTransaction.commit();
            json.put("count", i);
            json.put("ligne", count);
        } catch (IOException e) {
            throw new Exception(e);
        }

        return json;
    }

    private JSONObject bulkInsertFormatCSV(Part part, String lgGROSSISTE, Format mode, TUser user) throws Exception {
        int count = 0;
        int i = 0;
        JSONObject json = new JSONObject();
        try {
            TGrossiste grossiste = em.find(TGrossiste.class, lgGROSSISTE);
            userTransaction.begin();
            TOrder order = createOrder(grossiste, user);
            CSVParser parser = new CSVParser(new InputStreamReader(part.getInputStream()),
                    CSVFormat.EXCEL.withDelimiter(';'));
            switch (mode) {
            case LABOREX:

                for (CSVRecord cSVRecord : parser) {
                    if (count > 0) {
                        int ligne = buildOrderDetailFromLaborexRecord(order, cSVRecord);
                        if (ligne == 0) {
                            buildOrderItemFromLaborexRecord(cSVRecord);
                        }
                        i += ligne;
                    }
                    if ((count % 20) == 0) {
                        em.flush();
                        em.clear();

                    }
                    count++;
                }
                userTransaction.commit();
                json.put("count", i);
                json.put("ligne", count - 1);
                break;
            case COPHARMED:

                for (CSVRecord cSVRecord : parser) {
                    if (count > 0) {
                        int ligne = createOrderDetailViaCsv(order, cSVRecord.get(4), Integer.parseInt(cSVRecord.get(9)),
                                Double.valueOf(cSVRecord.get(11)).intValue(), Integer.parseInt(cSVRecord.get(13)),
                                Integer.parseInt(cSVRecord.get(10)), null, null);
                        i += ligne;
                        if (ligne == 0) {
                            OrderItem orderItem = new OrderItem().dateBl(cSVRecord.get(0))
                                    .ug(Integer.valueOf(cSVRecord.get(10))).facture(cSVRecord.get(1))
                                    .cip(cSVRecord.get(4)).libelle(cSVRecord.get(6))
                                    .cmdeL(Integer.valueOf(cSVRecord.get(9))).ligne(Integer.valueOf(cSVRecord.get(2)))
                                    .prixUn(Integer.valueOf(cSVRecord.get(13))).cmde(Integer.valueOf(cSVRecord.get(8)))
                                    .prixAchat(Double.valueOf(cSVRecord.get(11)).intValue());
                            items.add(orderItem);
                        }

                    }
                    if ((count % 20) == 0) {
                        em.flush();
                        em.clear();

                    }
                    count++;
                }
                userTransaction.commit();
                json.put("count", i);
                json.put("ligne", count - 1);
                break;
            case TEDIS:
                for (CSVRecord cSVRecord : parser) {
                    // int ligne,String cip,int prixAchat, Integer cmdeL,double tva, int prixUn
                    int ligne = buildOrderDetailTedisRecord(order, cSVRecord);
                    i += ligne;
                    if (ligne == 0) {
                        items.add(new OrderItem(Integer.parseInt(cSVRecord.get(0)), cSVRecord.get(1),
                                new BigDecimal(cSVRecord.get(2)).intValue(),
                                new BigDecimal(cSVRecord.get(3)).intValue(), Double.parseDouble(cSVRecord.get(4)),
                                new BigDecimal(cSVRecord.get(5)).intValue()));
                    }

                    if ((count % 20) == 0) {
                        em.flush();
                        em.clear();

                    }
                    count++;
                }
                userTransaction.commit();
                json.put("count", i);
                json.put("ligne", count);
                break;

            case TEDIS_2:
                for (CSVRecord cSVRecord : parser) {
                    // int ligne,String cip,int prixAchat, Integer cmdeL,double tva, int prixUn
                    int ligne = buildOrderDetailTedis2Record(order, cSVRecord);
                    i += ligne;
                    if (ligne == 0) {
                        items.add(new OrderItem(Integer.parseInt(cSVRecord.get(0)), cSVRecord.get(1),
                                Integer.parseInt(cSVRecord.get(2)), Integer.valueOf(cSVRecord.get(3)),
                                Double.parseDouble(cSVRecord.get(4)), Integer.parseInt(cSVRecord.get(5))).ug(0)
                                        .setDatePeremption(DateUtil.convertStringToDate(cSVRecord.get(7))));
                    }

                    if ((count % 20) == 0) {
                        em.flush();
                        em.clear();

                    }
                    count++;
                }
                userTransaction.commit();
                json.put("count", i);
                json.put("ligne", count);
                break;

            case DPCI:

                for (CSVRecord cSVRecord : parser) {
                    int ligne = createOrderDetailViaCsv(order, cSVRecord.get(2), Integer.parseInt(cSVRecord.get(6)),
                            Double.valueOf(cSVRecord.get(3)).intValue(), Double.valueOf(cSVRecord.get(4)).intValue(), 0,
                            null, null);
                    i += ligne;
                    if (ligne == 0) {
                        OrderItem orderItem = new OrderItem().refBl(cSVRecord.get(8)).cip(cSVRecord.get(2))
                                .libelle(cSVRecord.get(1)).tva(Double.valueOf(cSVRecord.get(5)))
                                .cmdeL(Integer.valueOf(cSVRecord.get(6))).ligne(Integer.valueOf(cSVRecord.get(0)))
                                .prixUn(Double.valueOf(cSVRecord.get(4)).intValue())
                                .cmde(Integer.valueOf(cSVRecord.get(7)))// c'est valeur n'est pas explique a cette
                                // date19/12/2020
                                .prixAchat(Double.valueOf(cSVRecord.get(3)).intValue());
                        items.add(orderItem);
                    }
                    if ((count % 20) == 0) {
                        em.flush();
                        em.clear();
                    }
                    count++;
                }
                userTransaction.commit();
                json.put("count", i);
                json.put("ligne", count);
                break;
            case CIP_QTE:
                int isFirstLigne = Integer.MAX_VALUE;
                for (CSVRecord cSVRecord : parser) {
                    isFirstLigne = skipFirstLigne(cSVRecord, count);
                    if (isFirstLigne < 0) {
                        continue;
                    }

                    int qty = Integer.parseInt(cSVRecord.get(1));
                    int ligne = createTOrderDetailViaCsv(order, cSVRecord.get(0), qty, null);
                    i += ligne;
                    if (ligne == 0) {

                        items.add(new OrderItem().cip(cSVRecord.get(0)).cmde(qty));
                    }

                    if ((count % 20) == 0) {
                        em.flush();
                        em.clear();

                    }
                    count++;
                }
                userTransaction.commit();
                json.put("count", i);
                json.put("ligne", isFirstLigne < 0 ? (count - 1) : count);
                break;

            case CIP_QTE_CIP_QTER_PA:
                int firstLigne = Integer.MAX_VALUE;
                for (CSVRecord cSVRecord : parser) {
                    firstLigne = skipFirstLigne(cSVRecord, count);
                    if (firstLigne < 0) {
                        continue;
                    }
                    int qty = Integer.parseInt(cSVRecord.get(3));
                    int prixAchat = Integer.parseInt(cSVRecord.get(4));
                    int ligne = createTOrderDetailViaCsv(order, cSVRecord.get(0), qty, prixAchat);
                    i += ligne;
                    if (ligne == 0) {

                        items.add(new OrderItem().cip(cSVRecord.get(0)).cmde(Integer.valueOf(cSVRecord.get(1)))
                                .cmdeL(qty).prixAchat(prixAchat));
                    }

                    if ((count % 20) == 0) {
                        em.flush();
                        em.clear();

                    }
                    count++;
                }
                userTransaction.commit();
                json.put("count", i);
                json.put("ligne", firstLigne < 0 ? (count - 1) : count);
                break;
            default:
                break;
            }

        } catch (IOException ex) {
            throw new Exception(ex);
        }

        return json;
    }

    private int buildOrderDetailTedisRecord(TOrder order, CSVRecord cSVRecord) {

        return createOrderDetailViaCsv(order, cSVRecord.get(1), new BigDecimal(cSVRecord.get(3)).intValue(),
                new BigDecimal(cSVRecord.get(2)).intValue(), new BigDecimal(cSVRecord.get(5)).intValue(), 0, null,
                null);
    }

    private int buildOrderDetailTedis2Record(TOrder order, CSVRecord cSVRecord) {
        String datePeremption = DateUtil.convert(DateUtil.convertStringToDate(cSVRecord.get(7)));

        return createOrderDetailViaCsv(order, cSVRecord.get(1), Integer.parseInt(cSVRecord.get(3)),
                Integer.parseInt(cSVRecord.get(2)), Integer.parseInt(cSVRecord.get(5)), 0, cSVRecord.get(6),
                datePeremption);
    }

    public TOrderDetail findFamilleInTOrderDetail(String lgOrderId, String lgFAMILLEID) {
        TOrderDetail oTOrderDetail = null;
        try {

            Query qry = em.createQuery(
                    "SELECT t FROM TOrderDetail t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgORDERID.lgORDERID = ?2 ")
                    .setParameter(1, lgFAMILLEID).setParameter(2, lgOrderId);
            if (!qry.getResultList().isEmpty()) {
                oTOrderDetail = (TOrderDetail) qry.getSingleResult();
            }
        } catch (Exception e) {
            LOG.log(Level.INFO, null, e);
        }
        return oTOrderDetail;
    }

    public int createOrderDetailViaCsv(TOrder order, String codeCip, int qty, int intPafDetail, int pu, int ug,
            String numeroLot, String datePeremption) {
        TOrderDetail oTOrderDetail;
        TFamille oTFamille = null;
        TFamilleGrossiste oTFamilleGrossiste = null;
        try {
            try {
                oTFamilleGrossiste = getTFamilleGrossiste(codeCip.trim());
                if (oTFamilleGrossiste != null) {
                    oTFamille = oTFamilleGrossiste.getLgFAMILLEID();
                }
            } catch (Exception e) {

            }
            if (oTFamille != null) {
                oTOrderDetail = findFamilleInTOrderDetail(order.getLgORDERID(), oTFamille.getLgFAMILLEID());
                if (oTOrderDetail == null) {
                    oTOrderDetail = new TOrderDetail();
                    oTOrderDetail.setLgORDERDETAILID(RandomStringUtils.randomAlphanumeric(20));
                    oTOrderDetail.setLgORDERID(order);
                    oTOrderDetail.setLgFAMILLEID(oTFamille);
                    oTOrderDetail.setLgGROSSISTEID(order.getLgGROSSISTEID());
                    oTOrderDetail.setIntNUMBER(qty);
                    oTOrderDetail.setIntQTEREPGROSSISTE(qty);
                    oTOrderDetail.setIntQTEMANQUANT(0);
                    oTOrderDetail.setIntPRICE(qty * intPafDetail);
                    oTOrderDetail.setIntPRICEDETAIL((pu == 0 ? oTFamilleGrossiste.getIntPRICE() : pu));
                    oTOrderDetail.setIntPAFDETAIL(intPafDetail);
                    oTOrderDetail.setPrixAchat(oTOrderDetail.getIntPAFDETAIL());
                    oTOrderDetail.setStrSTATUT(Constant.STATUT_IS_PROGRESS);
                    oTOrderDetail.setDtCREATED(order.getDtCREATED());
                    oTOrderDetail.setUg(ug);
                    oTOrderDetail.setDtUPDATED(oTOrderDetail.getDtCREATED());
                    addLot(oTOrderDetail, qty, numeroLot, datePeremption);
                    em.persist(oTOrderDetail);
                } else {
                    oTOrderDetail.setUg(oTOrderDetail.getUg() + ug);
                    oTOrderDetail.setIntNUMBER(oTOrderDetail.getIntNUMBER() + qty);
                    oTOrderDetail.setIntQTEMANQUANT(0);
                    oTOrderDetail.setIntPRICE(oTOrderDetail.getIntNUMBER() * intPafDetail);
                    oTOrderDetail.setIntQTEREPGROSSISTE(oTOrderDetail.getIntNUMBER());
                    addLot(oTOrderDetail, qty, numeroLot, datePeremption);
                    em.merge(oTOrderDetail);

                }
                return 1;

            } else {

                return 0;
            }
        } catch (Exception e) {

            LOG.log(Level.INFO, null, e);
            return 0;
        }
    }

    private void addLot(TOrderDetail orderDetail, int qty, String numeroLot, String datePeremption) {
        orderDetail.getLots().add(new OrderDetailLot(numeroLot, datePeremption, qty));
    }

    public TFamilleGrossiste getTFamilleGrossiste(String codeCip) {

        TFamilleGrossiste familleGrossiste = null;
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TFamilleGrossiste> cq = cb.createQuery(TFamilleGrossiste.class);
            Root<TFamilleGrossiste> root = cq.from(TFamilleGrossiste.class);
            Join<TFamilleGrossiste, TFamille> j = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate criteria = cb.conjunction();
            codeCip = codeCip + "%";
            criteria = cb.and(criteria, cb.or(cb.like(j.get("intCIP"), codeCip), cb.like(j.get("intEAN13"), codeCip),
                    cb.like(root.get("strCODEARTICLE"), codeCip)));
            criteria = cb.and(criteria, cb.equal(j.get("boolDECONDITIONNE"), Short.valueOf("0")));
            criteria = cb.and(criteria, cb.equal(root.get(TFamilleGrossiste_.strSTATUT), "enable"));
            criteria = cb.and(criteria, cb.equal(j.get(TFamille_.strSTATUT), "enable"));
            cq.where(criteria);
            TypedQuery<TFamilleGrossiste> q = em.createQuery(cq);
            q.setFirstResult(0).setMaxResults(1);
            familleGrossiste = q.getSingleResult();

        } catch (Exception e) {
            LOG.info(e.getLocalizedMessage());
        }
        return familleGrossiste;
    }

    private String fichierReponse(ServletContext context, String fileName, Format mode, List<OrderItem> list)
            throws IOException {
        try (BufferedWriter writer = Files.newBufferedWriter(
                Paths.get(context.getRealPath("WEB-INF") + File.separator + fileName + ".csv"),
                StandardCharsets.UTF_8)) {
            CSVPrinter printer = CSVFormat.EXCEL.withDelimiter(';').print(writer);

            switch (mode) {
            case LABOREX:

                printer.printRecord("N° Facture", "N° ligne", "CIP/EAN13", "Libellé du produit", "Qté commandée",
                        "Qté livrée", "Prix de cession", "Prix public", "N° commande", "Tva");
                for (OrderItem item : list) {
                    printer.printRecord(item.getFacture(), item.getLigne(), item.getCip(), item.getLibelle(),
                            item.getCmde(), item.getCmdeL(), item.getMontant(), item.getPrixUn(), item.getRefBl(),
                            item.getTva());

                }
                break;
            case COPHARMED:
                // Date Code Cip Description Laboratoire Quantite Demandee Quantitee livree Unite Gratuite Prix de
                // Cession Hors Taxe Taux Taxe Prix public Prix TTC
                printer.printRecord("Date", "Numero Facture", "Numero Ligne", "Code Interne", "Code CIP",
                        "Code CIP Alternatif", "Description", "Laboratoire", "Quantité demandée", "Quantitee livree",
                        "Unite Gratuite", "Prix de Cession Hors Taxe", "Taux Taxe", "Prix public", "Prix TTC");
                for (OrderItem item : list) {
                    printer.printRecord(item.getDateBl(), item.getFacture(), item.getLigne(), "", item.getCip(), "",
                            item.getLibelle(), "", +item.getCmde(), item.getCmdeL(), item.getUg(), item.getPrixAchat(),
                            "", item.getPrixUn(), "");

                }
                break;
            case TEDIS:
                for (OrderItem item : list) {

                    printer.printRecord(item.getLigne(), item.getCip(), item.getPrixAchat(), item.getCmdeL(),
                            item.getTva(), item.getPrixUn());

                }
                break;
            case TEDIS_2:
                for (OrderItem item : list) {
                    // ligne ; code; prix achat; quantité, tva; prix vente; numero lot ; date de
                    // peremption
                    printer.printRecord(item.getLigne(), item.getCip(), item.getPrixAchat(), item.getCmdeL(),
                            item.getTva(), item.getPrixUn(), item.getNumeroLot(),
                            DateUtil.convertDateToString(item.getDatePeremption()));

                }
                break;
            case DPCI:
                for (OrderItem item : list) {
                    printer.printRecord(item.getLigne(), item.getLibelle(), item.getCip(), item.getPrixAchat(),
                            item.getPrixUn(), item.getTva(), item.getCmdeL(), item.getCmde(), item.getRefBl());

                }
                break;
            case CIP_QTE:
                for (OrderItem item : list) {
                    printer.printRecord(item.getCip(), item.getCmde());

                }
                break;
            case CIP_QTE_CIP_QTER_PA:
                for (OrderItem item : list) {
                    printer.printRecord(item.getCip(), item.getCmde(), item.getCip(), item.getCmdeL(),
                            item.getPrixAchat());

                }
                break;
            default:
                break;
            }

            printer.flush();
            jdom.InitRessource();
            String dirDisk = jdom.path_commande + fileName + ".csv";
            Files.copy(Paths.get(context.getRealPath("WEB-INF") + File.separator + fileName + ".csv"),
                    Paths.get(dirDisk), StandardCopyOption.REPLACE_EXISTING);

        } catch (IOException ex) {
            Logger.getLogger(FileFormaManager.class.getName()).log(Level.SEVERE, null, ex);
        }

        return fileName;
    }

    public int createTOrderDetailViaCsv(TOrder order, String codeCip, int qty, Integer prixAchat) {
        TOrderDetail oTOrderDetail;
        TFamille oTFamille = null;
        TFamilleGrossiste oTFamilleGrossiste;
        try {
            try {
                oTFamilleGrossiste = getTFamilleGrossiste(codeCip.trim());
                if (oTFamilleGrossiste != null) {
                    oTFamille = oTFamilleGrossiste.getLgFAMILLEID();
                }
            } catch (Exception e) {

            }
            if (oTFamille == null) {
                oTFamille = findByCodeCipOrEan(codeCip.trim());
            }
            if (oTFamille != null) {
                oTOrderDetail = findFamilleInTOrderDetail(order.getLgORDERID(), oTFamille.getLgFAMILLEID());
                if (oTOrderDetail == null) {
                    oTOrderDetail = new TOrderDetail();
                    oTOrderDetail.setLgORDERDETAILID(RandomStringUtils.randomAlphanumeric(20));
                    oTOrderDetail.setLgORDERID(order);
                    oTOrderDetail.setLgFAMILLEID(oTFamille);
                    oTOrderDetail.setLgGROSSISTEID(order.getLgGROSSISTEID());
                    oTOrderDetail.setIntNUMBER(qty);
                    oTOrderDetail.setIntQTEREPGROSSISTE(qty);
                    oTOrderDetail.setIntQTEMANQUANT(0);
                    oTOrderDetail.setIntPRICEDETAIL(oTFamille.getIntPRICE());
                    oTOrderDetail.setIntPAFDETAIL(prixAchat == null ? oTFamille.getIntPAF() : prixAchat);
                    oTOrderDetail.setPrixAchat(oTOrderDetail.getIntPAFDETAIL());
                    // oTOrderDetail.setPrixUnitaire(oTOrderDetail.getIntPRICEDETAIL());
                    oTOrderDetail.setIntPRICE(qty * oTOrderDetail.getIntPAFDETAIL());
                    oTOrderDetail.setStrSTATUT(DateConverter.STATUT_PROCESS);
                    oTOrderDetail.setDtCREATED(new Date());
                    oTOrderDetail.setDtUPDATED(oTOrderDetail.getDtCREATED());
                    oTOrderDetail.setUg(0);
                    em.persist(oTOrderDetail);
                } else {

                    oTOrderDetail.setIntNUMBER(oTOrderDetail.getIntNUMBER() + qty);
                    oTOrderDetail.setIntQTEMANQUANT(0);
                    oTOrderDetail.setIntPRICE(oTOrderDetail.getIntNUMBER() * oTOrderDetail.getIntPAFDETAIL());
                    oTOrderDetail.setIntQTEREPGROSSISTE(oTOrderDetail.getIntNUMBER());
                    oTOrderDetail.setDtUPDATED(new Date());
                    em.merge(oTOrderDetail);

                }
                return 1;

            } else {

                return 0;
            }
        } catch (NoResultException e) {

            LOG.log(Level.INFO, null, e);
            return 0;
        }
    }

    private TFamille findByCodeCipOrEan(String codeCipOrCodeEan) {
        try {
            TypedQuery<TFamille> query = em.createQuery(
                    "SELECT o FROM TFamille o WHERE o.intCIP LIKE ?1 OR o.intEAN13 LIKE ?1", TFamille.class);
            query.setParameter(1, codeCipOrCodeEan + "%");
            query.setMaxResults(1);
            return query.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private int skipFirstLigne(CSVRecord cSVRecord, int index) {
        if (index < 1) {
            try {
                return Integer.parseInt(cSVRecord.get(1));
            } catch (Exception e) {
                return -1;
            }

        }
        return 0;
    }

    private int buildOrderDetailFromLaborexRecord(TOrder order, CSVRecord cSVRecord) {
        return createOrderDetailViaCsv(order, cSVRecord.get(3), Integer.parseInt(cSVRecord.get(7)),
                Double.valueOf(cSVRecord.get(8)).intValue(), Double.valueOf(cSVRecord.get(9)).intValue(),
                Integer.parseInt(cSVRecord.get(6)), null, null);
    }

    private void buildOrderItemFromLaborexRecord(CSVRecord cSVRecord) {

        // String etablissement, String facture, Integer ligne, String cip, String libelle, Integer cmde, int ug,
        // Integer cmdeL,
        // Double montant, Double prixUn, String refBl, Double tva
        items.add(new OrderItem(cSVRecord.get(0), cSVRecord.get(1), Integer.valueOf(cSVRecord.get(2)), cSVRecord.get(3),
                cSVRecord.get(4), Integer.valueOf(cSVRecord.get(5)), Integer.parseInt(cSVRecord.get(6)),
                Integer.valueOf(cSVRecord.get(7)), Double.valueOf(cSVRecord.get(8)), Double.valueOf(cSVRecord.get(9)),
                cSVRecord.get(10), Double.valueOf(cSVRecord.get(11))));
    }
}
