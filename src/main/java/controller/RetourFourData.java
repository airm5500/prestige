/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package controller;

import dal.TBonLivraisonDetail;
import dal.TBonLivraisonDetail_;
import dal.TBonLivraison_;
import dal.TFamille;
import dal.TFamille_;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author Kobena
 */
@WebServlet(name = "RetourFourData", urlPatterns = { "/RetourFourData" })
public class RetourFourData extends HttpServlet {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager entityManager;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");
        try (PrintWriter out = response.getWriter()) {
            String search = "";
            if (request.getParameter("query") != null) {
                search = request.getParameter("query");
            }
            int start = 0;
            int limit = 10;
            String lg_BON_LIVRAISON_ID = "", search_value = "";
            if (request.getParameter("start") != null) {
                start = Integer.valueOf(request.getParameter("start"));
            }
            if (request.getParameter("limit") != null) {
                limit = Integer.valueOf(request.getParameter("limit"));
            }
            if (request.getParameter("lg_BON_LIVRAISON_ID") != null) {
                lg_BON_LIVRAISON_ID = request.getParameter("lg_BON_LIVRAISON_ID");

            }

            if (request.getParameter("search_value") != null && !"".equals(request.getParameter("search_value"))) {
                search_value = request.getParameter("search_value");

            }
            JSONObject json = findRetourBl(lg_BON_LIVRAISON_ID, search, start, limit, entityManager);
            out.println(json);
        }
    }

    private JSONObject findRetourBl(String lgBONLIVRAISONID, String search, int start, int limit, EntityManager em) {
        JSONObject json = new JSONObject();
        JSONArray data = new JSONArray();
        try {
            int count = findRetourBl(search, lgBONLIVRAISONID, em);
            if (count > 0) {
                CriteriaBuilder cb = em.getCriteriaBuilder();
                CriteriaQuery<TBonLivraisonDetail> cq = cb.createQuery(TBonLivraisonDetail.class);
                Root<TBonLivraisonDetail> root = cq.from(TBonLivraisonDetail.class);
                Join<TBonLivraisonDetail, TFamille> j = root.join("lgFAMILLEID", JoinType.INNER);
                cq.select(root);
                Predicate predicate = cb.conjunction();
                predicate = cb.and(predicate,
                        cb.equal(root.get(TBonLivraisonDetail_.lgBONLIVRAISONID).get(TBonLivraison_.strREFLIVRAISON),
                                lgBONLIVRAISONID));
                predicate = cb.and(predicate, cb.equal(
                        root.get(TBonLivraisonDetail_.lgBONLIVRAISONID).get(TBonLivraison_.strSTATUT), "is_Closed"));

                if (!"".equals(search)) {
                    predicate = cb.and(predicate, cb.or(cb.like(j.get(TFamille_.intCIP), search + "%"),
                            cb.like(j.get(TFamille_.strNAME), search + "%")));

                }

                cq.where(predicate);
                Query q = em.createQuery(cq);
                q.setFirstResult(start);
                q.setMaxResults(limit);
                List<TBonLivraisonDetail> bonLivraisons = q.getResultList();

                bonLivraisons.forEach(p -> {
                    JSONObject js = new JSONObject();
                    try {
                        js.put("lg_FAMILLE_ID", p.getLgFAMILLEID().getLgFAMILLEID());
                        js.put("str_NAME", p.getLgFAMILLEID().getStrDESCRIPTION());
                        js.put("str_DESCRIPTION", p.getLgFAMILLEID().getStrDESCRIPTION());
                        js.put("int_CIP", p.getLgFAMILLEID().getIntCIP());
                        js.put("str_DESCRIPTION_PLUS", p.getLgFAMILLEID().getStrNAME());
                        js.put("int_PAF", p.getLgFAMILLEID().getIntPAF());
                        js.put("lg_GROSSISTE_ID",
                                p.getLgBONLIVRAISONID().getLgORDERID().getLgGROSSISTEID().getLgGROSSISTEID());

                        data.put(js);
                    } catch (JSONException ex) {

                    }
                });
            }
            json.put("results", data);
            json.put("total", count);
        } catch (Exception e) {
            LOGGER.log(Level.ALL, null, e);
        }
        return json;
    }

    private int findRetourBl(String search, String lgBONLIVRAISONID, EntityManager em) throws Exception {

        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);

        Root<TBonLivraisonDetail> root = cq.from(TBonLivraisonDetail.class);
        Join<TBonLivraisonDetail, TFamille> j = root.join("lgFAMILLEID", JoinType.INNER);
        cq.select(cb.count(root));
        Predicate predicate = cb.conjunction();
        predicate = cb.and(predicate, cb.equal(
                root.get(TBonLivraisonDetail_.lgBONLIVRAISONID).get(TBonLivraison_.strREFLIVRAISON), lgBONLIVRAISONID));
        predicate = cb.and(predicate,
                cb.equal(root.get(TBonLivraisonDetail_.lgBONLIVRAISONID).get(TBonLivraison_.strSTATUT), "is_Closed"));
        if (!"".equals(search)) {
            predicate = cb.and(predicate, cb.or(cb.like(j.get(TFamille_.intCIP), search + "%"),
                    cb.like(j.get(TFamille_.strNAME), search + "%")));

        }

        cq.where(predicate);
        Query q = em.createQuery(cq);
        return ((Long) q.getSingleResult()).intValue();

    }

    // <editor-fold defaultstate="collapsed" desc="HttpServlet methods. Click on the + sign on the left to edit the
    // code.">
    /**
     * Handles the HTTP <code>GET</code> method.
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

    private final static Logger LOGGER = Logger.getLogger(RetourFourData.class.getName());
}
