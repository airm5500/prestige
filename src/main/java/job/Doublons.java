/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package job;

import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TBonLivraison_;
import dal.TEmplacement;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TFamille_;
import dal.TInventaire;
import dal.TInventaireFamille;
import dal.TInventaire_;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrement_;
import dal.TUser;

import java.io.IOException;
import java.io.PrintWriter;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
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
 * @author KKOFFI
 */
public class Doublons extends HttpServlet {

    private static final Logger LOG = Logger.getLogger(Doublons.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    TUser user = null;

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");

        HttpSession session = request.getSession();
        user = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
        TEmplacement emplacement = user.getLgEMPLACEMENTID();
        String action = request.getParameter("action");
        String familleStock = request.getParameter("lg_FAMILLE_STOCK_ID");

        String lgEMPLACEMENTID = "";
        if (request.getParameter("lgEMPLACEMENTID") != null) {
            lgEMPLACEMENTID = request.getParameter("lgEMPLACEMENTID");
        }
        String search = "";
        if (request.getParameter("search") != null) {
            search = request.getParameter("search");
        }
        JSONObject json;
        try (PrintWriter out = response.getWriter()) {
            switch (action) {
            case "officine":
                json = getDoublonsProducts(emplacement.getLgEMPLACEMENTID(), search);
                out.println(json);
                break;
            case "stock":
                json = getStockProducts(lgEMPLACEMENTID, search);
                out.println(json);
                break;
            case "updateStock":
                json = updateStockProducts(familleStock);
                out.println(json);
                break;
            case "update":
                json = updateFamille(familleStock);
                out.println(json);
                break;

            default:
                break;
            }
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

    @Override
    public String getServletInfo() {
        return "Short description";
    }

    private JSONObject getDoublonsProducts(String empl, String search) {
        JSONObject json = new JSONObject();
        SimpleDateFormat dateFormat = new SimpleDateFormat("dd-MM-yyyy HH:mm:ss");

        List<TFamille> finalList = new ArrayList<>();
        JSONArray myarray = new JSONArray();
        try {
            List<String> lg = em.createQuery(
                    "SELECT  o.intCIP  FROM TFamille o WHERE o.strSTATUT='enable' AND (o.strNAME LIKE ?1 OR o.intCIP LIKE ?1)   GROUP BY o.intCIP HAVING COUNT(o.intCIP) >1 ")
                    .setParameter(1, "%" + search + "%").getResultList();
            lg.forEach((t) -> {
                List<TFamille> myList = em
                        .createQuery("SELECT o FROM TFamille o WHERE o.strSTATUT='enable'  AND o.intCIP=?1 ")
                        .setParameter(1, t).getResultList();
                if (myList.isEmpty()) {
                    finalList.addAll(myList);
                }
            });
            finalList.forEach((t) -> {
                JSONObject _json = new JSONObject();
                try {
                    _json.put("lg_FAMILLE_ID", t.getLgFAMILLEID());
                    _json.put("str_LIB", t.getStrNAME());
                    _json.put("CIP", t.getIntCIP());
                    _json.put("STOCK", getStock(t.getLgFAMILLEID(), empl));
                    _json.put("PU", t.getIntPRICE());
                    _json.put("PA", t.getIntPAF());
                    _json.put("PA", t.getIntPAF());
                    _json.put("DATECREATION", dateFormat.format(t.getDtCREATED()));

                    try {
                        _json.put("DATEINVENTAIRE", dateDerniereInventare(t.getLgFAMILLEID(), empl));
                    } catch (Exception e) {
                        LOG.log(Level.SEVERE, null, e);
                    }

                    try {

                        String dateVente = dateDerniereVente(t.getLgFAMILLEID(), empl);
                        _json.put("DATEVENTE", dateVente);
                    } catch (Exception e) {
                        LOG.log(Level.SEVERE, null, e);
                    }

                    try {
                        String dateEntree = dateEntree(t.getLgFAMILLEID(), empl);
                        _json.put("DATEENTREE", dateEntree);
                    } catch (Exception e) {
                        LOG.log(Level.SEVERE, null, e);
                    }

                } catch (JSONException ex) {

                }
                myarray.put(_json);
            });
            json.put("data", myarray);
            json.put("total", myarray.length());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return json;
    }

    private int getStock(String id, String empl) {
        Integer stock = 0;
        try {

            stock = (Integer) em.createQuery(
                    "SELECT o.intNUMBERAVAILABLE FROM TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID =?1 AND o.strSTATUT='enable' AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?2")
                    .setParameter(1, id).setParameter(2, empl).setFirstResult(0).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return stock;
    }

    public String dateDerniereVente(String lgFAMILLEID, String empl) {
        String date = "";
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<String> cq = cb.createQuery(String.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate,
                    cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), empl));
            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            Predicate ge = cb.greaterThan(jp.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate, ge);
            predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lgFAMILLEID));
            cq.select(cb.function("DATE_FORMAT", String.class, jp.get(TPreenregistrement_.dtUPDATED),
                    cb.literal("%d/%m/%Y %H:%i"))).orderBy(cb.desc(jp.get(TPreenregistrement_.dtUPDATED)));

            cq.where(predicate);
            Query q = em.createQuery(cq);

            q.setFirstResult(0);
            q.setMaxResults(1);
            date = (String) q.getSingleResult();

        } catch (Exception e) {
            // LOG.log(Level.SEVERE, null, e);
        }
        return date;
    }

    public String dateEntree(String lgFAMILLEID, String empl) {
        String date = "";
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<String> cq = cb.createQuery(String.class);

            Root<TBonLivraisonDetail> root = cq.from(TBonLivraisonDetail.class);
            Join<TBonLivraisonDetail, TBonLivraison> j = root.join("lgBONLIVRAISONID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);

            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(j.get(TBonLivraison_.strSTATUT), commonparameter.statut_is_Closed));
            predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lgFAMILLEID));
            cq.select(cb.function("DATE_FORMAT", String.class, j.get(TBonLivraison_.dtUPDATED),
                    cb.literal("%d/%m/%Y %H:%i"))).orderBy(cb.desc(j.get(TBonLivraison_.dtUPDATED)));

            cq.where(predicate);
            Query q = em.createQuery(cq);

            q.setFirstResult(0);
            q.setMaxResults(1);
            date = (String) q.getSingleResult();

        } catch (Exception e) {
            // LOG.log(Level.SEVERE, null, e);

        }
        return date;
    }

    public String dateDerniereInventare(String lgFAMILLEID, String empl) {
        String date = "";
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<String> cq = cb.createQuery(String.class);
            Root<TInventaireFamille> root = cq.from(TInventaireFamille.class);
            Join<TInventaireFamille, TInventaire> jp = root.join("lgINVENTAIREID", JoinType.INNER);
            Join<TInventaireFamille, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate,
                    cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), empl));
            predicate = cb.and(predicate, cb.equal(jp.get(TInventaire_.strSTATUT), "is_Closed"));
            predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lgFAMILLEID));
            cq.select(cb.function("DATE_FORMAT", String.class, jp.get(TInventaire_.dtUPDATED),
                    cb.literal("%d/%m/%Y %H:%i"))).orderBy(cb.desc(jp.get(TInventaire_.dtUPDATED)));

            cq.where(predicate);
            Query q = em.createQuery(cq);

            q.setFirstResult(0);
            q.setMaxResults(1);
            date = (String) q.getSingleResult();

        } catch (Exception e) {
            // LOG.log(Level.SEVERE, null, e);
        }
        return date;
    }

    private JSONObject getStockProducts(String empl, String search) {
        JSONObject json = new JSONObject();
        SimpleDateFormat dateFormat = new SimpleDateFormat("dd-MM-yyyy HH:mm:ss");

        List<TFamilleStock> finalList = new ArrayList<>();
        JSONArray myarray = new JSONArray();
        try {
            List<String> lg = em.createQuery(
                    "SELECT  o.lgFAMILLEID.lgFAMILLEID   FROM TFamilleStock o WHERE o.strSTATUT='enable' AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?1 AND  (o.lgFAMILLEID.strNAME LIKE ?2 OR o.lgFAMILLEID.intCIP LIKE ?2)   GROUP BY o.lgFAMILLEID.lgFAMILLEID HAVING COUNT(o.lgFAMILLEID.lgFAMILLEID) >1 ")
                    .setParameter(2, "%" + search + "%").setParameter(1, empl).getResultList();
            // System.out.println("lg "+lg);
            lg.forEach((t) -> {
                List<TFamilleStock> myList = em.createQuery(
                        "SELECT o FROM TFamilleStock o WHERE o.strSTATUT='enable'  AND o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?2 ")
                        .setParameter(1, t).setParameter(2, empl).getResultList();
                if (!myList.isEmpty()) {
                    finalList.addAll(myList);
                }
            });
            finalList.forEach((t) -> {
                JSONObject _json = new JSONObject();
                try {
                    _json.put("lg_FAMILLE_ID", t.getLgFAMILLEID().getLgFAMILLEID());
                    _json.put("lg_FAMILLESTOCK_ID", t.getLgFAMILLESTOCKID());
                    _json.put("str_LIB", t.getLgFAMILLEID().getStrNAME());
                    _json.put("CIP", t.getLgFAMILLEID().getIntCIP());
                    _json.put("STOCK", t.getIntNUMBERAVAILABLE());
                    _json.put("PU", t.getLgFAMILLEID().getIntPRICE());
                    _json.put("PA", t.getLgFAMILLEID().getIntPAF());

                    _json.put("DATECREATION", dateFormat.format(t.getDtCREATED()));

                    try {
                        _json.put("DATEINVENTAIRE", dateDerniereInventare(t.getLgFAMILLEID().getLgFAMILLEID(), empl));
                    } catch (Exception e) {
                    }

                    try {

                        String dateVente = dateDerniereVente(t.getLgFAMILLEID().getLgFAMILLEID(), empl);
                        _json.put("DATEVENTE", dateVente);
                    } catch (Exception e) {
                    }

                    try {
                        String dateEntree = dateEntree(t.getLgFAMILLEID().getLgFAMILLEID(), empl);
                        _json.put("DATEENTREE", dateEntree);
                    } catch (Exception e) {
                    }

                } catch (JSONException ex) {

                }
                myarray.put(_json);
            });
            json.put("data", myarray);
            json.put("total", myarray.length());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return json;
    }

    private JSONObject updateStockProducts(String lg_FAMILLE_STOCK_ID) {
        JSONObject json = new JSONObject();

        try {

            TFamilleStock familleStock = em.find(TFamilleStock.class, lg_FAMILLE_STOCK_ID);
            familleStock.setStrSTATUT(commonparameter.statut_delete);
            em.merge(familleStock);

            json.put("result", 1);

        } catch (Exception e) {
            try {
                json.put("result", 0);
            } catch (JSONException ex) {
            }
            LOG.log(Level.SEVERE, null, e);

        }
        return json;
    }

    private JSONObject updateFamille(String lg_FAMILLE_ID) {
        JSONObject json = new JSONObject();

        try {

            TFamille familleStock = em.find(TFamille.class, lg_FAMILLE_ID);
            familleStock.setStrSTATUT(commonparameter.statut_delete);
            em.merge(familleStock);

            json.put("result", 1);

        } catch (Exception e) {
            try {
                json.put("result", 0);
            } catch (JSONException ex) {
            }
            LOG.log(Level.SEVERE, null, e);

        }
        return json;
    }

}
