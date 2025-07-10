/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.asc.prestige2.business.promotions.concrete;

import dal.dataManager;
import java.util.Date;
import javax.persistence.EntityManager;
import com.asc.prestige2.business.promotions.PromotionService;
import dal.TFamille;
import dal.TPromotion;
import dal.TPromotionHistory;

import dal.TPromotionProduct;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.logging.Level;
import javax.persistence.Query;
import java.util.logging.Logger;
import toolkits.utils.logger;

/**
 *
 * @author JZAGO
 */
public class PrestigePromotion implements PromotionService {

    private final dataManager _dataManager;
    private final EntityManager _em;
    private static final Logger LOG = Logger.getAnonymousLogger();
    private String _logMessage;

    public PrestigePromotion() {
        _dataManager = new dataManager();
        _dataManager.initEntityManager();
        _em = _dataManager.getEm();
        initPromotionService();
    }

    boolean promotionBegan(TPromotion promotion) {
        Date startDate = promotion.getDtSTARTDATE();
        return (startDate.compareTo(new Date()) <= 0);
    }

    private void initPromotionService() {
        new logger().OCategory.info("Initializing promotion service.");

        Query query = _em.createNamedQuery("TPromotion.findAll", TPromotion.class);
        List<TPromotion> promotions = (List<TPromotion>) query.getResultList();
        if (promotions.isEmpty()) {
            return;
        } else {
            for (TPromotion promotion : promotions) {
                Query promotionProductsQuery = _em.createNamedQuery("TPromotionProduct.findByLgCODEPROMOTIONID",
                        TPromotionProduct.class);
                promotionProductsQuery.setParameter("lgCODEPROMOTIONID", promotion.getLgCODEPROMOTIONID());
                List<TPromotionProduct> promotionProducts = (List<TPromotionProduct>) promotionProductsQuery
                        .getResultList();
                if (!isValidPromotion(promotion) || !promotionBegan(promotion)) {

                    // make all products in this promotion available again
                    for (TPromotionProduct promotionProduct : promotionProducts) {
                        _dataManager.BeginTransaction();
                        TFamille product = promotionProduct.getLgFAMILLEID();
                        product.setBlPROMOTED(Boolean.FALSE);
                        _em.merge(product);
                        _em.flush();
                        _dataManager.CloseTransaction();
                    }
                }

                if (isValidPromotion(promotion) && promotionBegan(promotion)) {

                    for (TPromotionProduct promotionProduct : promotionProducts) {
                        _dataManager.BeginTransaction();
                        TFamille product = promotionProduct.getLgFAMILLEID();
                        product.setBlPROMOTED(Boolean.TRUE);
                        _em.merge(product);
                        _em.flush();
                        _dataManager.CloseTransaction();
                    }
                }
            }
        }
        new logger().OCategory.info("promotion service successfully initialized. ");
    }

    @Override
    public boolean createPromotion(final Date start, final Date end, String type) {
        boolean result = false;
        TPromotion promotion = new TPromotion();
        promotion.setDtSTARTDATE(start);
        promotion.setDtENDDATE(end);
        promotion.setStrTYPE(type);

        _dataManager.BeginTransaction();

        _em.persist(promotion); // add ptomotion to the managed objects
        result = _em.contains(promotion);
        _em.flush(); // save it
        _dataManager.CloseTransaction();

        _logMessage = "promotion created";
        LOG.info(_logMessage);

        return result;
    }

    @Override
    public boolean isValidPromotion(final TPromotion promotion) {
        Date endDate = promotion.getDtENDDATE();
        return (endDate.compareTo(new Date()) >= 0);
    }

    @Override
    public boolean promoteProductWithDiscount(String productID, int promotionID, int discount, boolean mode,
            double price) throws Exception {
        boolean result = false;
        // verify that this product and promotion really exist.
        Query familleNamedQuery = _em.createNamedQuery("TFamille.findByLgFAMILLEID", TFamille.class);
        familleNamedQuery.setParameter("lgFAMILLEID", productID);

        Query promotionQuery = _em.createNamedQuery("TPromotion.findByLgCODEPROMOTIONID", TPromotion.class);
        promotionQuery.setParameter("lgCODEPROMOTIONID", promotionID);

        TFamille product = (TFamille) familleNamedQuery.getSingleResult();
        TPromotion promotion = (TPromotion) promotionQuery.getSingleResult();

        if (promotion != null) {// the promotion does exist.
            if (isValidPromotion(promotion)) {
                if (product != null) { // the product does exist.
                    TPromotionProduct promotionProduct = new TPromotionProduct();
                    TPromotionHistory promotionHistory = new TPromotionHistory();

                    promotionProduct.setLgFAMILLEID(product);
                    promotionProduct.setLgCODEPROMOTIONID(promotion);
                    promotionProduct.setDtPROMOTEDDATE(new Date());
                    promotionProduct.setIntDISCOUNT(discount);
                    promotionProduct.setBlMODE(mode);
                    promotionProduct.setDbPRICE(price);

                    product.setBlPROMOTED(true);

                    // set promotionHistory properties
                    promotionHistory.setDtSTARTDATE(promotionProduct.getLgCODEPROMOTIONID().getDtSTARTDATE());
                    promotionHistory.setDtENDDATE(promotionProduct.getLgCODEPROMOTIONID().getDtENDDATE());
                    promotionHistory.setLgCODEPROMOTIONID(promotion.getLgCODEPROMOTIONID());
                    promotionHistory.setStrTYPE(promotion.getStrTYPE());
                    promotionHistory.setDtPROMOTEDDATE(new Date());
                    promotionHistory.setLgFAMILLEID(product.getLgFAMILLEID());
                    promotionHistory.setStrNAME(product.getStrNAME());
                    promotionHistory.setIntCIP(promotionProduct.getLgFAMILLEID().getIntCIP());

                    promotionHistory.setBlMODE(mode);
                    promotionHistory.setIntDISCOUNT(discount);
                    promotionHistory.setDbPRICE(price);

                    _em.getTransaction().begin();
                    _em.persist(promotionProduct);
                    _em.persist(promotionHistory);
                    _em.merge(product);

                    result = (_em.contains(promotionProduct));
                    _em.flush();
                    _em.getTransaction().commit();

                } else { // the product does not exist.
                    throw new Exception("Product with id " + productID + " does not exist.");
                }
            } else {
                result = false;
            }

        } else { // the promotion does not exists
            throw new Exception("Promotion with id" + promotionID + " does not exist.");
        }

        return result;
    }

    @Override
    public boolean promoteProductWithSpecialPrice(String productID, int promotionID, double price) throws Exception {
        boolean result = false;
        // verify that this product and promotion really exist.
        Query familleNamedQuery = _em.createNamedQuery("TFamille.findByLgFAMILLEID", TFamille.class);
        familleNamedQuery.setParameter("lgFAMILLEID", productID);

        Query promotionQuery = _em.createNamedQuery("TPromotion.findByLgCODEPROMOTIONID", TPromotion.class);
        promotionQuery.setParameter("lgCODEPROMOTIONID", promotionID);

        TFamille product = (TFamille) familleNamedQuery.getSingleResult();
        TPromotion promotion = (TPromotion) promotionQuery.getSingleResult();

        if (promotion != null) {// the promotion does exist.
            if (isValidPromotion(promotion)) {
                if (product != null) { // the product does exist.
                    TPromotionProduct promotionProduct = new TPromotionProduct();
                    TPromotionHistory promotionHistory = new TPromotionHistory();
                    promotionProduct.setLgFAMILLEID(product);
                    promotionProduct.setLgCODEPROMOTIONID(promotion);
                    promotionProduct.setDtPROMOTEDDATE(new Date());
                    promotionProduct.setDbPRICE(price);

                    product.setBlPROMOTED(true);

                    // set promotionHistory properties
                    promotionHistory.setDtSTARTDATE(promotionProduct.getLgCODEPROMOTIONID().getDtSTARTDATE());
                    promotionHistory.setDtENDDATE(promotionProduct.getLgCODEPROMOTIONID().getDtENDDATE());
                    promotionHistory.setLgCODEPROMOTIONID(promotion.getLgCODEPROMOTIONID());
                    promotionHistory.setStrTYPE(promotion.getStrTYPE());
                    promotionHistory.setDtPROMOTEDDATE(new Date());
                    promotionHistory.setLgFAMILLEID(product.getLgFAMILLEID());
                    promotionHistory.setStrNAME(product.getStrNAME());
                    promotionHistory.setIntCIP(promotionProduct.getLgFAMILLEID().getIntCIP());

                    promotionHistory.setDbPRICE(price);

                    _em.getTransaction().begin();
                    _em.persist(promotionProduct);
                    _em.persist(promotionHistory);
                    _em.merge(product);
                    result = (_em.contains(promotionProduct));
                    _em.flush();
                    _em.getTransaction().commit();

                } else { // the product does not exist.
                    throw new Exception("Product with id " + productID + " does not exist.");
                }
            } else {
                result = false;
            }

        } else { // the promotion does not exists
            throw new Exception("Promotion with id" + promotionID + " does not exist.");
        }

        return result;

    }

    @Override
    public boolean promoteProductWithPackNumber(String productID, int promotionID, int activeAT, int packNumber)
            throws Exception {
        boolean result = false;
        // verify that this product and promotion really exist.
        Query familleNamedQuery = _em.createNamedQuery("TFamille.findByLgFAMILLEID", TFamille.class);
        familleNamedQuery.setParameter("lgFAMILLEID", productID);

        Query promotionQuery = _em.createNamedQuery("TPromotion.findByLgCODEPROMOTIONID", TPromotion.class);
        promotionQuery.setParameter("lgCODEPROMOTIONID", promotionID);

        TFamille product = (TFamille) familleNamedQuery.getSingleResult();
        TPromotion promotion = (TPromotion) promotionQuery.getSingleResult();

        if (promotion != null) {// the promotion does exist.
            if (isValidPromotion(promotion)) {
                if (product != null) { // the product does exist.
                    TPromotionProduct promotionProduct = new TPromotionProduct();
                    TPromotionHistory promotionHistory = new TPromotionHistory();

                    promotionProduct.setLgFAMILLEID(product);
                    promotionProduct.setLgCODEPROMOTIONID(promotion);
                    promotionProduct.setDtPROMOTEDDATE(new Date());
                    promotionProduct.setIntACTIVEAT(activeAT);
                    promotionProduct.setIntPACKNUMBER(packNumber);

                    product.setBlPROMOTED(true);

                    // set promotionHistory properties
                    promotionHistory.setDtSTARTDATE(promotionProduct.getLgCODEPROMOTIONID().getDtSTARTDATE());
                    promotionHistory.setDtENDDATE(promotionProduct.getLgCODEPROMOTIONID().getDtENDDATE());
                    promotionHistory.setDtPROMOTEDDATE(new Date());
                    promotionHistory.setLgCODEPROMOTIONID(promotion.getLgCODEPROMOTIONID());
                    promotionHistory.setStrTYPE(promotion.getStrTYPE());
                    promotionHistory.setLgFAMILLEID(product.getLgFAMILLEID());
                    promotionHistory.setStrNAME(product.getStrNAME());
                    promotionHistory.setIntCIP(promotionProduct.getLgFAMILLEID().getIntCIP());

                    promotionHistory.setIntACTIVEAT(activeAT);
                    promotionHistory.setIntPACKNUMBER(packNumber);

                    _em.getTransaction().begin();

                    _em.persist(promotionProduct);
                    _em.merge(product);
                    _em.persist(promotionHistory);
                    result = (_em.contains(promotionProduct));
                    _em.flush();
                    _em.getTransaction().commit();

                } else { // the product does not exist.
                    throw new Exception("Product with id " + productID + " does not exist.");
                }
            } else {
                return false;
            }

        } else { // the promotion does not exists
            throw new Exception("Promotion with id" + promotionID + " does not exist.");
        }

        return result;

    }

    @Override
    public boolean isPromotionProduct(String productID, Integer promotionID) throws Exception {
        Query query = _em.createNamedQuery("TPromotionProduct.findByLgFAMILLEID");
        // query.setParameter("lgCODEPROMOTIONID", promotionID);
        query.setParameter("lgFAMILLEID", productID);
        List<TPromotionProduct> results = query.getResultList();
        return !results.isEmpty();

    }

    @Override
    public List<TPromotionProduct> getPromotionProductsWithAssociation(final Integer promotionID) {
        List<TPromotionProduct> promotionProducts = null;

        Query query = _em.createQuery(
                "SELECT t FROM TPromotionProduct t WHERE t.lgCODEPROMOTIONID.lgCODEPROMOTIONID = :lgCODEPROMOTIONID");
        query.setParameter("lgCODEPROMOTIONID", promotionID);
        promotionProducts = (List<TPromotionProduct>) query.getResultList();

        return promotionProducts;
    }

    @Override
    public List<TPromotionProduct> getPromotionProducts(Integer promotionID, String strTYPE, String search_value) {

        List<TPromotionProduct> products = new ArrayList<>();
        // Query query = _em.createNamedQuery("TPromotionProduct.findByLgCODEPROMOTIONID");
        if (search_value.equalsIgnoreCase("") || search_value == null) {
            search_value = "%%";
        }
        Query query = _em.createQuery(
                "SELECT t FROM TPromotionProduct t WHERE (t.lgCODEPROMOTIONID.lgCODEPROMOTIONID= :lgCODEPROMOTIONID AND t.lgCODEPROMOTIONID.strTYPE= :strTYPE) AND (t.lgFAMILLEID.intCIP LIKE :SEARCH_VALUE  OR t.lgFAMILLEID.strNAME LIKE :SEARCH_VALUE)");
        // Query query = _em.createQuery("SELECT t FROM TPromotionProduct t WHERE t.lgCODEPROMOTIONID
        // =:lgCODEPROMOTIONID");
        query.setParameter("lgCODEPROMOTIONID", promotionID);
        query.setParameter("strTYPE", strTYPE);
        query.setParameter("SEARCH_VALUE", search_value + "%");
        products = (List<TPromotionProduct>) query.getResultList();

        return products;
    }

    @Override
    public List<TFamille> getPromotionProducts(Integer promotionID) {
        List<TFamille> products = new ArrayList<>();
        // Query query = _em.createNamedQuery("TPromotionProduct.findByLgCODEPROMOTIONID");
        Query query = _em.createQuery(
                "SELECT t FROM TPromotionProduct t WHERE t.lgCODEPROMOTIONID.lgCODEPROMOTIONID =:lgCODEPROMOTIONID");
        query.setParameter("lgCODEPROMOTIONID", promotionID);

        List<TPromotionProduct> promotionProducts = (List<TPromotionProduct>) query.getResultList();

        for (TPromotionProduct promotionProduct : promotionProducts) {
            Query productQuery = _em.createNamedQuery("TFamille.findByLgFAMILLEID", TFamille.class);
            System.out.println("lg_FAMILLE_ID: " + promotionProduct.getLgFAMILLEID().getLgFAMILLEID());
            productQuery.setParameter("lgFAMILLEID", promotionProduct.getLgFAMILLEID().getLgFAMILLEID());
            TFamille product = (TFamille) productQuery.getSingleResult();
            products.add(product);
        }
        return products;
    }

    @Override
    public List<TPromotion> getPromotions() {
        List<TPromotion> promotions = null;
        Query query = _em.createNamedQuery("TPromotion.findAll", TPromotion.class);
        promotions = (List<TPromotion>) query.getResultList();

        return promotions;
    }

    @Override
    public List<TPromotion> getPromotion(Date start, Date end) {
        List<TPromotion> promotions = null;
        // Query query = _em.createNamedQuery("TPromotion.findBYSTARTDATEANDENDDATE", TPromotion.class);
        Query query = _em.createQuery(
                "SELECT t FROM TPromotion t WHERE t.dtSTARTDATE =:dtSTARTDATE AND t.dtENDDATE =:dtENDDATE",
                TPromotion.class);

        query.setParameter("dtSTARTDATE", start);
        query.setParameter("dtENDDATE", end);
        promotions = (List<TPromotion>) query.getResultList();

        return promotions;
    }

    @Override
    public TPromotion getPromotionById(Integer id) {
        TPromotion promotion = null;
        promotion = _em.find(TPromotion.class, id);
        return promotion;
    }

    @Override
    public boolean updatePromotion(int promotionCode, Map<String, Object> promotionMap) {
        boolean result = false;

        TPromotion promotion = null;
        promotion = getPromotionById(promotionCode);
        if (promotion == null) {
            LOG.log(Level.SEVERE, "promotion with ID: {0} does not exist.", promotionCode);
        } else {
            // promotionMap.replace(key, promotion, result);
            SimpleDateFormat formatter = new SimpleDateFormat("yyyy-mm-dd hh:mm:ss.s", Locale.FRENCH);

            _em.getTransaction().begin();

            try {
                if (promotionMap.containsKey("dt_START_DATE")) {
                    Date startDate = formatter.parse((String) promotionMap.get("dt_START_DATE"));
                    promotion.setDtSTARTDATE(startDate);
                }

                if (promotionMap.containsKey("dt_END_DATE")) {
                    Date endDate = formatter.parse((String) promotionMap.get("dt_END_DATE"));
                    promotion.setDtENDDATE(endDate);
                }

                if (promotionMap.containsKey("str_TYPE")) {
                    promotion.setStrTYPE((String) promotionMap.get("str_TYPE"));
                }

            } catch (ParseException e) {
                Logger.getLogger(PrestigePromotion.class.getName()).log(Level.SEVERE, null, e);
            }

            _em.getTransaction().commit();
        }

        return result;
    }

    @Override
    public boolean removePromotion(int promotionCode) {
        boolean removed = false;
        TPromotion promotion = getPromotionById(promotionCode);
        if (promotion == null) {
            removed = false;
        } else {
            _em.getTransaction().begin();
            // pre conditions
            List<TPromotionProduct> promotionProducts = getPromotionProductsWithAssociation(promotionCode);
            if (!promotionProducts.isEmpty()) {
                for (TPromotionProduct promotionProduct : promotionProducts) {
                    TFamille product = promotionProduct.getLgFAMILLEID();
                    product.setBlPROMOTED(false);
                    _em.merge(product);
                }
            }
            _em.remove(promotion);
            _em.flush();
            _em.getTransaction().commit();
        }
        removed = !(_em.contains(promotion));
        return removed;
    }

    @Override
    public boolean productAlreadyInValidPromotion(String productID) {
        // Query query = _em.createNamedQuery("TPromotionProduct.findByLgFAMILLEID", TPromotionProduct.class);
        Query query = _em.createQuery(
                "SELECT t FROM TPromotionProduct t WHERE t.lgFAMILLEID.lgFAMILLEID = :lgFAMILLEID",
                TPromotionProduct.class);
        query.setParameter("lgFAMILLEID", productID);

        List<TPromotionProduct> promotionProducts = (List<TPromotionProduct>) query.getResultList();
        if (promotionProducts.isEmpty()) {
            return false;
        } else {
            for (TPromotionProduct promotionProduct : promotionProducts) {
                TPromotion promotion = promotionProduct.getLgCODEPROMOTIONID();
                if (isValidPromotion(promotion)) {
                    return true;
                }
            }
        }

        return false;
    }

    @Override
    public boolean removeProductFromPromotion(String productID, int promotionCode) {
        // boolean result = false;
        // Query query = _em.createNamedQuery("TPromotionProduct.findByFAMILLEIDANDCODEPROMOTIONID",
        // TPromotionProduct.class);
        Query query = _em.createQuery(
                "SELECT t FROM TPromotionProduct t WHERE t.lgFAMILLEID.lgFAMILLEID = :lgFAMILLEID AND t.lgCODEPROMOTIONID.lgCODEPROMOTIONID = :lgCODEPROMOTIONID",
                TPromotionProduct.class);
        query.setParameter("lgFAMILLEID", productID);
        query.setParameter("lgCODEPROMOTIONID", promotionCode);

        TPromotionProduct promotionProduct = (TPromotionProduct) query.getResultList().get(0);
        // Pre condition
        TFamille product = promotionProduct.getLgFAMILLEID();
        _em.getTransaction().begin();

        product.setBlPROMOTED(false);
        _em.merge(product);
        _em.remove(promotionProduct);

        _em.flush();
        _em.getTransaction().commit();

        return !(_em.contains(promotionProduct));
    }

    @Override
    public boolean promotionExists(final Date start, final Date end, String type) {
        // Query query = _em.createNamedQuery("TPromotion.findBySTARTDATEANDENDDATEANDSTRTYPE", TPromotion.class);
        Query query = _em.createQuery(
                "SELECT t FROM TPromotion t WHERE t.dtSTARTDATE = :dtSTARTDATE AND t.dtENDDATE = :dtENDDATE AND t.strTYPE = :strTYPE",
                TPromotion.class);

        query.setParameter("dtSTARTDATE", start);
        query.setParameter("dtENDDATE", end);
        query.setParameter("strTYPE", type);
        List<TPromotion> promotions = query.getResultList();

        return !promotions.isEmpty();
    }

    @Override
    public boolean promotionIncluded(final Date startDate, final Date endDate, final String str_TYPE) {
        boolean include = false;
        List<TPromotion> promotions = getPromotions();
        for (TPromotion promotion : promotions) {
            if (promotion.getStrTYPE().equalsIgnoreCase(str_TYPE)
                    && (promotion.getDtSTARTDATE().getTime() <= startDate.getTime())
                    && (promotion.getDtENDDATE().getTime() >= endDate.getTime())) {
                include = true;
            }
        }
        return include;
    }

    @Override
    public boolean backAllPromotedToNonPromoted() {
        boolean result;
        Query query = _em.createNamedQuery("TFamille.findByBlPromoted", TFamille.class);
        query.setParameter("blPROMOTED", true);
        List<TFamille> products = (List<TFamille>) query.getResultList();
        if (products.isEmpty()) {
            new logger().OCategory.info("Products list is empty");
            return false;
        } else {
            _em.getTransaction().begin();
            for (TFamille product : products) {
                if (product.getBlPROMOTED() == true) {
                    product.setBlPROMOTED(false);
                    _em.merge(product);
                }
            }
            _em.flush();
            _em.getTransaction().commit();
            List<TFamille> products2 = (List<TFamille>) query.getResultList();
            result = (products2.get(0).getBlPROMOTED());
            for (int i = 1; i < products2.size(); i++) {
                TFamille product = products2.get(i);
                result = (result && product.getBlPROMOTED());
            }

        }

        return result;
    }

    @Override
    public TPromotionProduct getPromotionProduct(final String productID) {
        TPromotionProduct promotionProduct = null;
        Query query = _em.createQuery(
                "SELECT t FROM TPromotionProduct t WHERE t.lgFAMILLEID.lgFAMILLEID = :lgFAMILLEID",
                TPromotionProduct.class);

        // Query query = _em.createNamedQuery("TPromotionProduct.findByLgFAMILLEID", TPromotionProduct.class);
        query.setParameter("lgFAMILLEID", productID);
        promotionProduct = (TPromotionProduct) query.getSingleResult();

        return promotionProduct;
    }

    @Override
    public List<TPromotion> getPromotionsFromTo(Date startDate, Date endDate) {
        List<TPromotion> allPromotions = getPromotions();
        List<TPromotion> selectedPromotions = new ArrayList();
        for (TPromotion promotion : allPromotions) {
            if ((promotion.getDtSTARTDATE().getTime() >= startDate.getTime())
                    && (promotion.getDtENDDATE().getTime() <= endDate.getTime())) {
                selectedPromotions.add(promotion);
            }
        }

        new logger().OCategory.info(selectedPromotions.size() + " Promotions found between " + startDate.toString()
                + " and " + endDate.toString());
        return selectedPromotions;
    }

    @Override
    public List<TPromotion> getPromotionsFromTo(Date startDate, Date endDate, String strType) {
        List<TPromotion> allPromotions = getPromotionsFromTo(startDate, endDate);
        List<TPromotion> selectedPromotions = new ArrayList<>();
        for (TPromotion promotion : allPromotions) {
            if (promotion.getStrTYPE().equals(strType)) {
                selectedPromotions.add(promotion);
            }
        }

        if (allPromotions.isEmpty() || selectedPromotions.isEmpty()) {
            new logger().OCategory.info(
                    "No " + strType + " promotions between " + startDate.toString() + " and " + endDate.toString());
        } else {
            new logger().OCategory.info(selectedPromotions.size() + " promotions found between " + startDate.toString()
                    + " and " + endDate.toString());

        }

        return selectedPromotions;
    }

    @Override
    public List<TPromotion> getPromotionsForType(String strType) {
        List<TPromotion> allPromotions = getPromotions();
        List<TPromotion> selectedPromotions = new ArrayList();
        for (TPromotion promotion : allPromotions) {
            if (promotion.getStrTYPE().equalsIgnoreCase(strType)) {
                selectedPromotions.add(promotion);
            }
        }

        new logger().OCategory.info(selectedPromotions.size() + " Promotions of type " + strType + " found ");
        return selectedPromotions;
    }

    @Override
    public boolean isPromotionValid(TPromotion promotion) {
        Long currentDateTime = new Date().getTime();
        Long promotionEndDateTime = promotion.getDtENDDATE().getTime();
        return promotionEndDateTime <= currentDateTime;
    }

    @Override
    public List<TPromotionHistory> getPromotionHistories(String search_value) {
        if (search_value.equalsIgnoreCase("") || search_value == null) {
            search_value = "%%";
        }

        Query query = _em.createQuery("SELECT t FROM TPromotionHistory t WHERE  t.strNAME LIKE :SEARCH_VALUE ");
        query.setParameter("SEARCH_VALUE", search_value + "%");
        List<TPromotionHistory> promotionHistories = (List<TPromotionHistory>) query.getResultList();
        return promotionHistories;
    }

    @Override
    public List<TPromotionProduct> getPromotionProducts(Integer promotionID, String search_value) {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
                                                                       // Tools | Templates.
    }

}
