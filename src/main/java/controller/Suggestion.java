/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package controller;

import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamilleStock;
import dal.TFamille_;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrementDetail_;
import dal.TSuggestionOrder;
import dal.TSuggestionOrderDetails;
import dal.TSuggestionOrder_;
import dal.TUser;
import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
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
import rest.service.ProductStateService;
import toolkits.parameters.commonparameter;

/**
 *
 * @author user
 */
public class Suggestion extends HttpServlet {

    static final Logger LOGGER = Logger.getLogger(Suggestion.class.getName());
    TUser OTUser = null;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private ProductStateService productStateService;

    public TFamilleStock getTProductItemStock(String lgId, String lgEMPLACEMENTID) {
        TFamilleStock productItemStock = null;

        try {
            productItemStock = em.createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2 AND t.strSTATUT='enable'",
                    TFamilleStock.class).setParameter(1, lgId).setParameter(2, lgEMPLACEMENTID).setFirstResult(0)
                    .setMaxResults(1).getSingleResult();

        } catch (Exception e) {

            LOGGER.log(Level.SEVERE, null, e);
        }
        return productItemStock;
    }

    public TFamilleGrossiste findFamilleGrossiste(String lgFAMILLEID, String lgGROSSISTEID) {
        TFamilleGrossiste familleGrossiste = null;

        try {
            Query qry = em.createQuery(
                    "SELECT DISTINCT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgGROSSISTEID.lgGROSSISTEID = ?2  AND t.strSTATUT = ?3 ")
                    .setParameter(1, lgFAMILLEID).setParameter(2, lgGROSSISTEID)
                    .setParameter(3, commonparameter.statut_enable);
            qry.setMaxResults(1);
            familleGrossiste = (TFamilleGrossiste) qry.getSingleResult();

        } catch (Exception e) {
            LOGGER.log(Level.INFO, "findFamilleGrossiste id produit {0} grossiste {1}",
                    new Object[] { lgFAMILLEID, lgGROSSISTEID });
            LOGGER.log(Level.SEVERE, null, e);
        }

        return familleGrossiste;
    }

    public int isOnAnotherSuggestion(String lgFamilleID) {

        int status = 0;
        try {

            long count = (long) em
                    .createQuery(
                            "SELECT COUNT(o)  FROM TSuggestionOrderDetails o WHERE  o.lgFAMILLEID.lgFAMILLEID =?1 ")
                    .setParameter(1, lgFamilleID).setMaxResults(1).getSingleResult();

            if (count > 1) {

                status = 1;

            }
            count = (long) em.createQuery(
                    "SELECT COUNT(p) FROM TOrder r,TOrderDetail p WHERE p.lgORDERID.lgORDERID=r.lgORDERID AND (p.lgFAMILLEID.intORERSTATUS =?2 OR p.lgFAMILLEID.intORERSTATUS =?3 OR p.lgFAMILLEID.intORERSTATUS =?4 ) AND  p.lgFAMILLEID.lgFAMILLEID =?1  ORDER BY p.lgFAMILLEID.intORERSTATUS DESC")
                    .setParameter(1, lgFamilleID).setParameter(2, (short) 2).setParameter(3, (short) 3)
                    .setParameter(4, (short) 4).setMaxResults(1).getSingleResult();

            if (count > 0) {
                status = 2;
            }

        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, null, e);
        }

        return status;
    }

    protected void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json;charset=UTF-8");
        HttpSession session = request.getSession();
        OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
        String searchValue = "";
        String lgSUGGESTIONORDERID = "";
        if (request.getParameter("search_value") != null) {
            searchValue = request.getParameter("search_value");

        }
        if (request.getParameter("lg_SUGGESTION_ORDER_ID") != null) {
            lgSUGGESTIONORDERID = request.getParameter("lg_SUGGESTION_ORDER_ID");

        }

        int start = Integer.parseInt(request.getParameter("start"));
        int limit = Integer.parseInt(request.getParameter("limit"));
        List<TSuggestionOrderDetails> detailses = listeSuggestionOrderDetails(searchValue, lgSUGGESTIONORDERID, start,
                limit);

        int count = listeSuggestionOrderDetails(searchValue, lgSUGGESTIONORDERID);
        JSONObject data = new JSONObject();

        JSONArray arrayObj = new JSONArray();
        Integer intACHAT = 0;
        Integer intVENTE = 0;
        String empl = OTUser.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        LocalDate today = LocalDate.now();
        LocalDate moisUn = LocalDate.of(today.getYear(), today.getMonthValue(), 1);
        LocalDate nMoinsUn = moisUn.minusMonths(1);
        LocalDate nMoinsDeux = moisUn.minusMonths(2);
        LocalDate nMoinsTrois = moisUn.minusMonths(3);
        try (PrintWriter out = response.getWriter()) {
            data.put("total", count);
            for (TSuggestionOrderDetails order : detailses) {
                TFamille famille = order.getLgFAMILLEID();
                JSONObject json = new JSONObject();
                TFamilleStock oTFamillestock = getTProductItemStock(famille.getLgFAMILLEID(), empl);
                if (oTFamillestock == null) {
                    continue;
                }
                TFamilleGrossiste familleGrossiste = findFamilleGrossiste(famille.getLgFAMILLEID(),
                        order.getLgSUGGESTIONORDERID().getLgGROSSISTEID().getLgGROSSISTEID());
                json.put("lg_SUGGESTION_ORDER_DETAILS_ID", order.getLgSUGGESTIONORDERDETAILSID());
                json.put("lg_FAMILLE_ID", famille.getLgFAMILLEID());
                json.put("bool_DECONDITIONNE_EXIST", famille.getBoolDECONDITIONNEEXIST());
                json.put("lg_GROSSISTE_ID", order.getLgGROSSISTEID().getLgGROSSISTEID());
                json.put("str_FAMILLE_CIP",
                        (familleGrossiste != null ? familleGrossiste.getStrCODEARTICLE() : famille.getIntCIP()));
                json.put("str_FAMILLE_NAME", famille.getStrDESCRIPTION());
                json.put("int_DATE_BUTOIR_ARTICLE", (famille.getLgCODEGESTIONID() != null
                        ? famille.getLgCODEGESTIONID().getIntDATEBUTOIRARTICLE() : 0));
                json.put("int_STOCK", oTFamillestock.getIntNUMBERAVAILABLE());

                json.put("int_NUMBER", order.getIntNUMBER());

                json.put("produitState", new JSONObject(productStateService.getEtatProduit(famille.getLgFAMILLEID())));
                json.put("int_SEUIL", famille.getIntSEUILMIN());
                json.put("str_STATUT", order.getStrSTATUT());
                json.put("lg_FAMILLE_PRIX_VENTE", order.getIntPRICEDETAIL());
                json.put("lg_FAMILLE_PRIX_ACHAT", famille.getIntPAT());
                json.put("int_PAF_SUGG", order.getIntPAFDETAIL());
                json.put("int_PRIX_REFERENCE", famille.getIntPRICETIPS());
                json.put("lg_SUGGESTION_ORDER_ID", order.getLgSUGGESTIONORDERID().getLgSUGGESTIONORDERID());

                int intQTEREASSORT = 0;
                try {
                    intQTEREASSORT = oTFamillestock.getIntNUMBERAVAILABLE() - famille.getIntSEUILMIN();

                    if (intQTEREASSORT < 0) {
                        intQTEREASSORT = -1 * intQTEREASSORT;
                    } else {
                        intQTEREASSORT = 0;
                    }
                } catch (Exception e) {
                }
                json.put("int_QTE_REASSORT", intQTEREASSORT);

                intACHAT = intACHAT + order.getIntPAFDETAIL();

                intVENTE = intVENTE + order.getIntPRICEDETAIL();

                json.put("int_ACHAT", intACHAT);
                json.put("int_VENTE", intVENTE);

                json.put("int_VALUE0",
                        getProduitQuantity(famille.getLgFAMILLEID(), moisUn.getMonthValue(), moisUn.getYear(), empl));
                json.put("int_VALUE1", getProduitQuantity(famille.getLgFAMILLEID(), nMoinsUn.getMonthValue(),
                        nMoinsUn.getYear(), empl));
                json.put("int_VALUE2", getProduitQuantity(famille.getLgFAMILLEID(), nMoinsDeux.getMonthValue(),
                        nMoinsDeux.getYear(), empl));
                json.put("int_VALUE3", getProduitQuantity(famille.getLgFAMILLEID(), nMoinsTrois.getMonthValue(),
                        nMoinsTrois.getYear(), empl));
                arrayObj.put(json);

            }
            data.put("results", arrayObj);
            out.println(data);
        } catch (JSONException e) {
            LOGGER.log(Level.SEVERE, null, e);
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
    }// </editor-fold>

    private List<TSuggestionOrderDetails> listeSuggestionOrderDetails(String searchValue, String suggOrder, int start,
            int limit) {

        List<TSuggestionOrderDetails> detailses = new ArrayList<>();
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TSuggestionOrderDetails> cq = cb.createQuery(TSuggestionOrderDetails.class);
            Root<TSuggestionOrderDetails> root = cq.from(TSuggestionOrderDetails.class);
            Join<TSuggestionOrderDetails, TSuggestionOrder> join = root.join("lgSUGGESTIONORDERID", JoinType.INNER);
            Join<TSuggestionOrderDetails, TFamille> f = root.join("lgFAMILLEID", JoinType.INNER);
            cq.select(root).orderBy(cb.asc(f.get(TFamille_.strNAME)));
            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(join.get(TSuggestionOrder_.lgSUGGESTIONORDERID), suggOrder));
            if (!"".equals(searchValue)) {
                searchValue = searchValue + "%";
                predicate = cb.and(predicate,
                        cb.or(cb.like(f.get(TFamille_.intCIP), searchValue),
                                cb.like(f.get(TFamille_.strNAME), searchValue),
                                cb.like(f.get(TFamille_.intEAN13), searchValue)));

            }
            cq.where(predicate);
            TypedQuery<TSuggestionOrderDetails> q = em.createQuery(cq);

            q.setFirstResult(start);
            q.setMaxResults(limit);

            detailses = q.getResultList();

        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, null, e);
        }
        return detailses;
    }

    private int listeSuggestionOrderDetails(String searchValue, String suggOrder) {

        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TSuggestionOrderDetails> root = cq.from(TSuggestionOrderDetails.class);
            Join<TSuggestionOrderDetails, TSuggestionOrder> join = root.join("lgSUGGESTIONORDERID", JoinType.INNER);
            Join<TSuggestionOrderDetails, TFamille> f = root.join("lgFAMILLEID", JoinType.INNER);
            cq.select(cb.count(root));
            Predicate predicate = cb.conjunction();

            predicate = cb.and(predicate, cb.equal(join.get(TSuggestionOrder_.lgSUGGESTIONORDERID), suggOrder));
            if (!"".equals(searchValue)) {
                searchValue = searchValue + "%";
                predicate = cb.and(predicate,
                        cb.or(cb.like(f.get(TFamille_.intCIP), searchValue),
                                cb.like(f.get(TFamille_.strNAME), searchValue),
                                cb.like(f.get(TFamille_.intEAN13), searchValue)));

            }
            cq.where(predicate);
            Query q = em.createQuery(cq);
            return ((Long) q.getSingleResult()).intValue();

        } catch (Exception e) {

            LOGGER.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private int getProduitQuantity(String lgFamille, int month, int year, String empl) {

        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TFamille> prf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate criteria = cb.conjunction();
            criteria = cb.and(criteria, cb.equal(root.get("lgPREENREGISTREMENTID").get("bISCANCEL"), false));
            criteria = cb.and(criteria,
                    cb.notLike(root.get("lgPREENREGISTREMENTID").get("lgTYPEVENTEID").get("lgTYPEVENTEID"), "5"));
            criteria = cb.and(criteria, cb.equal(root.get("lgPREENREGISTREMENTID").get("strSTATUT"), "is_Closed"));
            criteria = cb.and(criteria, cb.equal(
                    root.get("lgPREENREGISTREMENTID").get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    empl));
            Predicate pu = cb.greaterThan(root.get("lgPREENREGISTREMENTID").get("intPRICE"), 0);
            cb.and(criteria, pu);
            Predicate pu2 = cb.greaterThan(root.get(TPreenregistrementDetail_.intQUANTITY), 0);
            criteria = cb.and(criteria, cb.equal(prf.get(TFamille_.lgFAMILLEID), lgFamille));
            Predicate btw = cb.equal(cb.function("MONTH", Integer.class, root.get("dtCREATED")), month);
            Predicate btw2 = cb.equal(cb.function("YEAR", Integer.class, root.get("dtCREATED")), year);
            cq.select(cb.sumAsLong(root.get(TPreenregistrementDetail_.intQUANTITY)));
            cq.where(criteria, btw, pu2, btw2, pu);
            Query q = em.createQuery(cq);
            Long r = (Long) q.getSingleResult();
            return (r != null ? r.intValue() : 0);
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, null, e);
            return 0;
        }

    }

}
