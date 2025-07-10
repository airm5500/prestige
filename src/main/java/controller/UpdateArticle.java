/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package controller;

import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamillearticle;
import dal.TGrossiste;
import java.io.BufferedWriter;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.concurrent.atomic.LongAdder;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.servlet.ServletException;
import javax.servlet.annotation.MultipartConfig;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.Part;
import javax.transaction.HeuristicMixedException;
import javax.transaction.HeuristicRollbackException;
import javax.transaction.NotSupportedException;
import javax.transaction.RollbackException;
import javax.transaction.Status;
import javax.transaction.SystemException;
import javax.transaction.UserTransaction;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVPrinter;
import org.apache.commons.csv.CSVRecord;
import org.json.JSONObject;
import util.DateConverter;

/**
 *
 * @author kkoffi
 */
@MultipartConfig(fileSizeThreshold = 5242880, maxFileSize = 20971520L, maxRequestSize = 41943040L)
public class UpdateArticle extends HttpServlet {

    private static final Logger LOG = Logger.getLogger(UpdateArticle.class.getName());
    private final DateFormat df = new SimpleDateFormat("ddMMyy");
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public EntityManager getEm() {
        return em;
    }

    @Inject
    private UserTransaction userTransaction;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("text/html;charset=UTF-8");
        try (PrintWriter out = response.getWriter()) {
            String option = request.getParameter("option");
            Part part = request.getPart("fichier");
            if (option.contains("F")) {
                JSONObject json = bulkInsertFamille(part);
                out.print(json.toString());
            } else {
                JSONObject json = bulkInsertGrossiste(part);
                out.print(json.toString());
            }

        } catch (Exception ex) {
            Logger.getLogger(UpdateArticle.class.getName()).log(Level.SEVERE, null, ex);
        }
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

    /**
     * Returns a short description of the servlet.
     *
     * @return a String containing servlet description
     */
    @Override
    public String getServletInfo() {
        return "Short description";
    }// </editor-fold>

    private JSONObject bulkInsertFamille(Part part) throws Exception {

        JSONObject json = new JSONObject();
        CSVParser parser = null;
        CSVPrinter printer = null;
        BufferedWriter writer = null;
        try {
            parser = new CSVParser(new InputStreamReader(part.getInputStream()), CSVFormat.EXCEL.withDelimiter(';'));

            writer = Files.newBufferedWriter(
                    Paths.get(System.getProperty("user.home") + File.separator + "Desktop" + File.separator
                            + part.getSubmittedFileName()),
                    StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING,
                    StandardOpenOption.WRITE);
            printer = CSVFormat.EXCEL.withDelimiter(';').print(writer);

            userTransaction.begin();
            LongAdder count = new LongAdder();
            LongAdder ligne = new LongAdder();
            for (CSVRecord cSVRecord : parser) {
                ligne.increment();
                TFamille tf = findByCip(cSVRecord.get(1).trim());
                TFamillearticle famillearticle = findByCode(cSVRecord.get(8));
                Date mydate = null;
                try {
                    String _date = cSVRecord.get(14);
                    mydate = df.parse(_date);

                } catch (Exception e) {
                }

                if (tf != null && famillearticle != null) {
                    tf.setLgFAMILLEARTICLEID(famillearticle);
                    count.increment();
                } else {

                    printer.printRecord(cSVRecord);
                }
                if (tf != null) {
                    if (!findFamilleIn(tf.getLgFAMILLEID())) {
                        tf.setDtDATELASTENTREE(mydate);
                    }
                    getEm().merge(tf);
                }

                if (count.intValue() > 0 && count.intValue() % 20 == 0) {
                    getEm().flush();
                    getEm().clear();

                }

            }
            userTransaction.commit();
            json.put("count", count.intValue());
            json.put("ligne", ligne.intValue());
            json.put("success", true);

        } catch (NotSupportedException | SystemException e) {
            json.put("success", false);

            LOG.log(Level.SEVERE, null, e);
            try {
                if (userTransaction.getStatus() == Status.STATUS_ACTIVE
                        || userTransaction.getStatus() == Status.STATUS_MARKED_ROLLBACK) {
                    userTransaction.rollback();
                }
            } catch (SystemException ex) {
                LOG.log(Level.SEVERE, null, ex);
            }

        } catch (RollbackException | HeuristicMixedException | HeuristicRollbackException | SecurityException
                | IllegalStateException ex) {
            LOG.log(Level.SEVERE, null, ex);
        } finally {
            if (parser != null) {
                parser.close();
            }
            if (writer != null) {
                writer.close();
            }
            if (printer != null) {
                printer.close();
            }
        }

        return json;
    }

    private JSONObject bulkInsertGrossiste(Part part) throws Exception {

        JSONObject json = new JSONObject();
        CSVParser parser = null;
        CSVPrinter printer = null;
        BufferedWriter writer = null;
        try {
            parser = new CSVParser(new InputStreamReader(part.getInputStream()), CSVFormat.EXCEL.withDelimiter(';'));
            writer = Files.newBufferedWriter(
                    Paths.get(System.getProperty("user.home") + File.separator + "Desktop" + File.separator
                            + part.getSubmittedFileName()),
                    StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING,
                    StandardOpenOption.WRITE);
            printer = CSVFormat.EXCEL.withDelimiter(';').print(writer);
            userTransaction.begin();
            LongAdder count = new LongAdder();
            LongAdder ligne = new LongAdder();
            for (CSVRecord cSVRecord : parser) {
                ligne.increment();
                TFamille tf = findByCip(cSVRecord.get(1).trim());
                TGrossiste grossiste = findGrossisteByCode(cSVRecord.get(7));
                if (tf != null && grossiste != null) {
                    tf.setLgGROSSISTEID(grossiste);
                    getEm().merge(tf);
                    TFamilleGrossiste familleGrossiste = findFamilleGrossiste(tf.getLgFAMILLEID(),
                            grossiste.getLgGROSSISTEID());
                    if (familleGrossiste == null) {
                        createFamilleGrossiste(tf, grossiste);
                    }
                    count.increment();
                } else {
                    printer.printRecord(cSVRecord);
                }

                if (count.intValue() > 0 && count.intValue() % 20 == 0) {
                    getEm().flush();
                    getEm().clear();

                }

            }
            userTransaction.commit();
            json.put("count", count.intValue());
            json.put("ligne", ligne.intValue());
            json.put("success", true);
        } catch (NotSupportedException | SystemException e) {
            json.put("success", false);

            LOG.log(Level.SEVERE, null, e);
            try {
                if (userTransaction.getStatus() == Status.STATUS_ACTIVE
                        || userTransaction.getStatus() == Status.STATUS_MARKED_ROLLBACK) {
                    userTransaction.rollback();
                }
            } catch (SystemException ex) {
                LOG.log(Level.SEVERE, null, ex);
            }

        } catch (RollbackException | HeuristicMixedException | HeuristicRollbackException | SecurityException
                | IllegalStateException ex) {
            LOG.log(Level.SEVERE, null, ex);
        } finally {
            if (parser != null) {
                parser.close();
            }
            if (writer != null) {
                writer.close();
            }
            if (printer != null) {
                printer.close();
            }
        }

        return json;
    }

    private TFamille findByCip(String cip) {
        try {
            TypedQuery<TFamille> q = getEm().createQuery("SELECT o FROM TFamille o WHERE o.strNAME  LIKE ?1 ",
                    TFamille.class);
            q.setMaxResults(1);
            q.setParameter(1, cip + "%");
            return q.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private TFamillearticle findByCode(String code) {
        try {
            TypedQuery<TFamillearticle> q = getEm()
                    .createQuery("SELECT o FROM TFamillearticle o WHERE o.strCODEFAMILLE =?1 ", TFamillearticle.class);
            q.setMaxResults(1);
            q.setParameter(1, code);
            return q.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private TGrossiste findGrossisteByCode(String code) {
        try {
            TypedQuery<TGrossiste> q = getEm().createQuery("SELECT o FROM TGrossiste o WHERE o.strCODE =?1 ",
                    TGrossiste.class);
            q.setMaxResults(1);
            q.setParameter(1, code);
            return q.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private boolean findFamilleIn(String id) {
        try {
            TypedQuery<TFamille> q = getEm().createQuery(
                    "SELECT o.lgFAMILLEID FROM TWarehouse o WHERE o.lgFAMILLEID.lgFAMILLEID =?1 ", TFamille.class);
            q.setMaxResults(1);
            q.setParameter(1, id);
            return q.getSingleResult() == null;
        } catch (Exception e) {
            // e.printStackTrace(System.err);
            return false;
        }
    }

    private TFamilleGrossiste findFamilleGrossiste(String lg_FAMILLE_ID, String lg_GROSSISTE_ID) {
        TFamilleGrossiste OTFamilleGrossiste = null;
        try {
            TypedQuery<TFamilleGrossiste> qry = getEm().createQuery(
                    "SELECT DISTINCT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgGROSSISTEID.lgGROSSISTEID = ?2  AND t.strSTATUT = ?3 ",
                    TFamilleGrossiste.class).setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_GROSSISTE_ID)
                    .setParameter(3, DateConverter.STATUT_ENABLE);
            qry.setMaxResults(1);
            OTFamilleGrossiste = qry.getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();
        }

        return OTFamilleGrossiste;
    }

    private void createFamilleGrossiste(TFamille OTFamille, TGrossiste g) {
        TFamilleGrossiste OTFamilleGrossiste = new TFamilleGrossiste();
        OTFamilleGrossiste.setLgFAMILLEID(OTFamille);
        OTFamilleGrossiste.setIntPAF(OTFamille.getIntPAF());
        OTFamilleGrossiste.setIntPRICE(OTFamille.getIntPRICE());
        OTFamilleGrossiste.setLgGROSSISTEID(g);
        OTFamilleGrossiste.setDtUPDATED(new Date());
        OTFamilleGrossiste.setDtCREATED(new Date());
        OTFamilleGrossiste.setStrCODEARTICLE(OTFamille.getIntCIP());
        getEm().persist(OTFamilleGrossiste);
    }

}
