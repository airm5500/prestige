/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package controller;

import dal.TBonLivraison;
import dal.TBonLivraison_;
import dal.dataManager;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
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
import toolkits.parameters.commonparameter;

@WebServlet(name = "RetourFournisseur", urlPatterns = { "/RetourFournisseur" })
public class RetourFournisseur extends HttpServlet {

    private final static Logger LOGGER = Logger.getLogger(RetourFournisseur.class.getName());

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        dataManager OdataManager = new dataManager();
        OdataManager.initEntityManager();
        EntityManager entityManager = OdataManager.getEm();
        response.setContentType("application/json;charset=UTF-8");
        try (PrintWriter out = response.getWriter()) {
            String search = "";
            if (request.getParameter("query") != null) {
                search = request.getParameter("query");
            }
            int start = 0;
            int limit = 10;

            if (request.getParameter("start") != null) {
                start = Integer.parseInt(request.getParameter("start"));
            }
            if (request.getParameter("limit") != null) {
                limit = Integer.parseInt(request.getParameter("limit"));
            }

            JSONObject json = findRetourBl(search, start, limit, entityManager);
            out.println(json);
        }
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

    private JSONObject findRetourBl(String search, int start, int limit, EntityManager em) {
        JSONObject json = new JSONObject();
        JSONArray data = new JSONArray();
        try {
            int count = findRetourBl(search, em);
            if (count > 0) {
                CriteriaBuilder cb = em.getCriteriaBuilder();
                CriteriaQuery<TBonLivraison> cq = cb.createQuery(TBonLivraison.class);
                Root<TBonLivraison> root = cq.from(TBonLivraison.class);
                cq.select(root).orderBy(cb.desc(root.get(TBonLivraison_.dtUPDATED)));
                Predicate predicate = cb.conjunction();
                predicate = cb.and(predicate,
                        cb.equal(root.get(TBonLivraison_.strSTATUT), commonparameter.statut_is_Closed));

                if (!"".equals(search)) {
                    predicate = cb.and(predicate,
                            cb.or(cb.like(root.get(TBonLivraison_.strREFLIVRAISON), search + "%")));

                }

                cq.where(predicate);
                Query q = em.createQuery(cq);
                q.setFirstResult(start);
                q.setMaxResults(limit);
                List<TBonLivraison> bonLivraisons = q.getResultList();

                bonLivraisons.forEach(p -> {
                    JSONObject js = new JSONObject();
                    try {
                        js.put("lg_BON_LIVRAISON_ID", p.getLgBONLIVRAISONID());
                        js.put("str_REF_LIVRAISON", p.getStrREFLIVRAISON());
                        js.put("str_GROSSISTE_LIBELLE", p.getLgORDERID().getLgGROSSISTEID().getStrLIBELLE());

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

    private int findRetourBl(String search, EntityManager em) throws Exception {

        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<TBonLivraison> root = cq.from(TBonLivraison.class);

        cq.select(cb.count(root));
        Predicate predicate = cb.conjunction();

        predicate = cb.and(predicate, cb.equal(root.get(TBonLivraison_.strSTATUT), commonparameter.statut_is_Closed));

        if (!"".equals(search)) {
            predicate = cb.and(predicate, cb.or(cb.like(root.get(TBonLivraison_.strREFLIVRAISON), search + "%")));

        }
        cq.where(predicate);
        Query q = em.createQuery(cq);
        return ((Long) q.getSingleResult()).intValue();

    }
}
