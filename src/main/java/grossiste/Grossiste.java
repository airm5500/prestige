/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package grossiste;

import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TGrossiste;
import dal.dataManager;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;

/**
 *
 * @author Kobena
 */
@WebServlet(name = "Grossiste", urlPatterns = { "/Grossiste" })
public class Grossiste extends HttpServlet {

    private final static Logger LOG = Logger.getLogger(Grossiste.class.getName());

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("text/html;charset=UTF-8");
        try (PrintWriter out = response.getWriter()) {
            dataManager OdataManager = new dataManager();
            OdataManager.initEntityManager();
            EntityManager entityManager = OdataManager.getEm();
            response.setContentType("application/json;charset=UTF-8");
            JSONObject json = createProduct(request.getParameter("lg_GROSSISTE_ID"),
                    request.getParameter("lg_FAMILLE_ID"), request.getParameter("str_CODE_ARTICLE"), entityManager);

            out.println(json);
        }
    }

    private TFamilleGrossiste findFamilleGrossiste(String lg_FAMILLE_ID, String lg_GROSSISTE_ID,
            EntityManager entityManager) {
        TFamilleGrossiste OTFamilleGrossiste = null;
        try {
            TypedQuery<TFamilleGrossiste> qry = entityManager.createQuery(
                    "SELECT DISTINCT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgGROSSISTEID.lgGROSSISTEID = ?2 OR t.lgGROSSISTEID.strDESCRIPTION = ?2) AND t.strSTATUT = ?3 ",
                    TFamilleGrossiste.class).setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_GROSSISTE_ID)
                    .setParameter(3, commonparameter.statut_enable);
            qry.setMaxResults(1);
            OTFamilleGrossiste = qry.getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();
        }

        return OTFamilleGrossiste;
    }

    private TGrossiste getGrossiste(String lg_GROSSISTE_ID, EntityManager entityManager) {

        try {
            TypedQuery<TGrossiste> OTGrossiste = entityManager.createQuery(
                    "SELECT t FROM TGrossiste t WHERE (t.lgGROSSISTEID = ?1 OR t.strLIBELLE = ?1 OR t.strCODE = ?1) AND t.strSTATUT = ?2",
                    TGrossiste.class).setParameter(1, lg_GROSSISTE_ID).setParameter(2, commonparameter.statut_enable);
            return OTGrossiste.getSingleResult();

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }

    }

    private JSONObject createProduct(String lg_GROSSISTE_ID, String lg_FAMILLE_ID, String str_CODE_ARTICLE,
            EntityManager entityManager) {
        JSONObject json = new JSONObject();
        boolean asError = false;
        try {
            if (str_CODE_ARTICLE.length() < 6) {
                asError = true;
                json.put("asError", asError);
                json.put("success", asError);
                json.put("msg", "Le code CIP doit avoir au minimum 6 caractères");
                return json;

            }
            TFamille OTFamille = entityManager.find(TFamille.class, lg_FAMILLE_ID);
            TGrossiste OTGrossiste = getGrossiste(lg_GROSSISTE_ID, entityManager);
            TFamilleGrossiste OTFamilleGrossiste = findFamilleGrossiste(OTFamille.getLgFAMILLEID(),
                    OTGrossiste.getLgGROSSISTEID(), entityManager);
            str_CODE_ARTICLE = generateCIP(str_CODE_ARTICLE);
            if (OTFamilleGrossiste != null) {
                entityManager.getTransaction().begin();
                OTFamilleGrossiste.setStrCODEARTICLE(str_CODE_ARTICLE);
                entityManager.merge(OTFamilleGrossiste);
                entityManager.getTransaction().commit();

            } else {
                OTFamilleGrossiste = new TFamilleGrossiste();
                OTFamilleGrossiste.setLgFAMILLEID(OTFamille);
                OTFamilleGrossiste.setIntPAF(OTFamille.getIntPAF());
                OTFamilleGrossiste.setIntPRICE(OTFamille.getIntPRICE());
                OTFamilleGrossiste.setLgGROSSISTEID(OTGrossiste);
                OTFamilleGrossiste.setStrCODEARTICLE(str_CODE_ARTICLE);
                entityManager.getTransaction().begin();
                entityManager.merge(OTFamilleGrossiste);
                entityManager.getTransaction().commit();
            }
            json.put("asError", asError);
            json.put("success", asError);
            json.put("msg", "Opération effectée avec success ");
        } catch (Exception e) {
            try {
                json.put("asError", true);
                json.put("success", true);
                json.put("msg", "Impossible de creer un code article ERROR :: " + e.getMessage());
                entityManager.getTransaction().rollback();
                LOG.log(Level.SEVERE, null, e);
            } catch (JSONException ex) {

                LOG.log(Level.SEVERE, null, ex);
            }
        }
        return json;
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        processRequest(request, response);
    }

    /**
     * Handles the HTTP <code>POST</code> method.
     *
     * @param request
     *            servlet request
     * @param response
     *            servlet response
     *
     * @throws ServletException
     *             if a servlet-specific error occurs
     * @throws IOException
     *             if an I/O error occurs
     */
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

    public String generateCIP(String int_CIP) {
        String result;
        int resultCIP = 0;

        char[] charArray = int_CIP.toCharArray();

        if (int_CIP.length() == 6) {
            for (int i = 1; i <= charArray.length; i++) {
                resultCIP += Integer.parseInt(charArray[(i - 1)] + "") * (i + 1);
            }

            int mod = resultCIP % 11;
            result = int_CIP + "" + mod;
        } else {
            result = int_CIP;
        }

        return result;
    }
}
