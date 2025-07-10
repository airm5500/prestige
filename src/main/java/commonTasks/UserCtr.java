/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks;

import dal.TEmplacement;
import dal.TEmplacement_;
import dal.TUser;
import dal.TUser_;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Collections;
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
import javax.servlet.http.HttpSession;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;

/**
 *
 * @author Kobena
 */
@WebServlet(name = "UserCtr", urlPatterns = { "/UserCtr" })
public class UserCtr extends HttpServlet {

    private static final long serialVersionUID = 1L;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException, JSONException {
        response.setContentType("application/json;charset=UTF-8");
        try (PrintWriter out = response.getWriter()) {
            String query = "";
            if (request.getParameter("query") != null & !"".equals(request.getParameter("query"))) {
                query = request.getParameter("query");
            }
            HttpSession session = request.getSession();
            TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
            int start = Integer.valueOf(request.getParameter("start"));
            int limit = Integer.valueOf(request.getParameter("limit"));
            JSONObject data = new JSONObject();
            String emp = OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            int count = findUsersCount(query, emp);
            data.put("total", count);
            JSONArray arrayObj = new JSONArray();
            List<TUser> tUsers = findUsers(query, emp, start, limit);
            for (TUser tUser : tUsers) {
                JSONObject json = new JSONObject();
                json.put("lg_USER_ID", tUser.getLgUSERID());
                json.put("str_FIRST_NAME", tUser.getStrFIRSTNAME());
                json.put("str_LAST_NAME", tUser.getStrLASTNAME());
                json.put("str_FIRST_LAST_NAME", tUser.getStrFIRSTNAME() + " " + tUser.getStrLASTNAME());
                arrayObj.put(json);
            }
            data.put("data", arrayObj);
            out.println(data);

        }
    }

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (JSONException ex) {
            Logger.getLogger(UserCtr.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        try {
            processRequest(request, response);
        } catch (JSONException ex) {
            Logger.getLogger(UserCtr.class.getName()).log(Level.SEVERE, null, ex);
        }
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

    private int findUsersCount(String query, String emp) {
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TUser> root = cq.from(TUser.class);
            Join<TUser, TEmplacement> pr = root.join("lgEMPLACEMENTID", JoinType.INNER);
            Predicate criteria = cb.conjunction();
            criteria = cb.and(criteria, cb.equal(root.get(TUser_.strSTATUT), "enable"));
            criteria = cb.and(criteria, cb.equal(pr.get(TEmplacement_.lgEMPLACEMENTID), emp));
            if (!"".equals(query)) {
                criteria = cb.and(criteria,
                        cb.or(cb.like(root.get(TUser_.strFIRSTNAME), query + "%"),
                                cb.like(root.get(TUser_.strLASTNAME), query + "%")),
                        cb.like(cb.concat(cb.concat(root.get(TUser_.strFIRSTNAME), " "), root.get(TUser_.strLASTNAME)),
                                query + "%"));
            }
            cq.select(cb.count(root));
            cq.where(criteria);

            Query q = em.createQuery(cq);

            return ((Long) q.getSingleResult()).intValue();
        } catch (Exception e) {
            return 0;
        }
    }

    private List<TUser> findUsers(String query, String emp, int start, int limit) {
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TUser> cq = cb.createQuery(TUser.class);
            Root<TUser> root = cq.from(TUser.class);
            Join<TUser, TEmplacement> pr = root.join("lgEMPLACEMENTID", JoinType.INNER);
            Predicate criteria = cb.conjunction();
            criteria = cb.and(criteria, cb.equal(root.get(TUser_.strSTATUT), "enable"));
            criteria = cb.and(criteria, cb.equal(pr.get(TEmplacement_.lgEMPLACEMENTID), emp));
            if (!"".equals(query)) {
                criteria = cb.and(criteria,
                        cb.or(cb.like(root.get(TUser_.strFIRSTNAME), query + "%"),
                                cb.like(root.get(TUser_.strLASTNAME), query + "%")),
                        cb.like(cb.concat(cb.concat(root.get(TUser_.strFIRSTNAME), " "), root.get(TUser_.strLASTNAME)),
                                query + "%"));
            }
            cq.select(root).orderBy(cb.asc(root.get(TUser_.strFIRSTNAME)), cb.asc(root.get(TUser_.strLASTNAME)));
            cq.where(criteria);

            Query q = em.createQuery(cq);
            q.setFirstResult(start);
            q.setMaxResults(limit);
            return q.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
