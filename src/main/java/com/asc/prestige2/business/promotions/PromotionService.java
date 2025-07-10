/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.asc.prestige2.business.promotions;

import dal.TFamille;
import dal.TPromotion;
import dal.TPromotionHistory;
import dal.TPromotionProduct;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 * This service provides a set of procedures and functions to perfrom a promotion The Concrete services must keep track
 * of the eligible products for promotions
 *
 * @author JZAGO
 */
public interface PromotionService {

    /**
     * Creates a promotion
     *
     * @param start
     * @param end
     * @param type
     *
     * @return
     */
    boolean createPromotion(final Date start, final Date end, String type);

    /**
     * Return whether the promotion is valid or not.
     *
     * @param promotion
     *
     * @return
     */
    boolean isValidPromotion(final TPromotion promotion);

    /**
     * Returns whether a product is promoted in a promotion of some type
     *
     * @param productID
     *
     * @return
     */
    boolean productAlreadyInValidPromotion(String productID);

    /**
     * Returns whether or not a product is promoted
     *
     * @param productID
     * @param promotionID
     *
     * @return
     *
     * @throws Exception
     */
    boolean isPromotionProduct(final String productID, final Integer promotionID) throws Exception;

    /**
     * Return the promotions available
     *
     * @return
     */
    List<TPromotion> getPromotions();

    /**
     * Returns the list of promotions that are available between given start date en end date
     *
     * @param start
     * @param end
     *
     * @return
     */
    List<TPromotion> getPromotion(final Date start, final Date end);

    /**
     * Get a promotion by its id
     *
     * @param id
     *
     * @return
     */
    TPromotion getPromotionById(final Integer id);

    /**
     * Returns the list of products associated with a given promotion
     *
     * @param promotionID
     *
     * @return
     */
    List<TFamille> getPromotionProducts(final Integer promotionID);

    /**
     *
     * @param promotionID
     *
     * @return
     */
    List<TPromotionProduct> getPromotionProductsWithAssociation(final Integer promotionID);

    /**
     *
     * @param promotionID
     * @param strTYPE
     * @param search_value
     *
     * @return
     */
    List<TPromotionProduct> getPromotionProducts(final Integer promotionID, String strTYPE, String search_value);

    // List<TPromotionHasTFamille> getPromotionProducts(final Integer promotionID, String search_value);
    List<TPromotionProduct> getPromotionProducts(final Integer promotionID, String search_value);

    /**
     *
     * @param productID
     * @param promotionID
     * @param discount
     * @param mode
     * @param price
     *
     * @return
     *
     * @throws java.lang.Exception
     */
    boolean promoteProductWithDiscount(String productID, int promotionID, int discount, boolean mode, double price)
            throws Exception;

    /**
     *
     * @param productID
     * @param promotionID
     * @param price
     *
     * @return
     *
     * @throws java.lang.Exception
     */
    boolean promoteProductWithSpecialPrice(String productID, int promotionID, double price) throws Exception;

    /**
     *
     * @param productID
     * @param promotionID
     * @param activeAT
     * @param packNumber
     *
     * @return
     *
     * @throws java.lang.Exception
     */
    boolean promoteProductWithPackNumber(String productID, int promotionID, int activeAT, int packNumber)
            throws Exception;

    /**
     * Sets the promotion price for some given product ID and promotion ID
     *
     * @param productID
     * @param promotionID
     * @param price
     *
     * @return
     *
     * @throws java.lang.Exception
     */
    // boolean setPromotionPriceForProduct(String productID, int promotionID, double price) throws Exception;

    /**
     *
     * @param promotionCode
     * @param promotionMap
     *
     * @return
     */

    boolean updatePromotion(int promotionCode, Map<String, Object> promotionMap);

    /**
     * Remove a promotion given its code.
     *
     * @param promotionCode
     *
     * @return
     */
    boolean removePromotion(int promotionCode);

    /**
     * Removes a product from a promotion.
     *
     * @param productID
     * @param promotionCode
     *
     * @return
     */
    boolean removeProductFromPromotion(String productID, int promotionCode);

    /**
     * Returns whether a promotion of some type, exists for some period
     *
     * @param start
     * @param end
     * @param type
     *
     * @return
     */
    boolean promotionExists(final Date start, final Date end, String type);

    /**
     * Returns whether the promotion is included into another promotion or not.
     *
     * @param startDate
     * @param endDate
     * @param str_TYPE
     *
     * @return
     */
    boolean promotionIncluded(final Date startDate, final Date endDate, final String str_TYPE);

    /**
     * remove all promoted products from their promoted state.
     *
     * @return
     */
    boolean backAllPromotedToNonPromoted();

    /**
     * Retrieve PromotionProduct information for a given product.
     *
     * @param productID
     *
     * @return
     */
    TPromotionProduct getPromotionProduct(final String productID);

    /**
     * Gets promotions from a given start date and an end date
     *
     * @param startDate
     * @param endDate
     *
     * @return
     */
    List<TPromotion> getPromotionsFromTo(final Date startDate, final Date endDate);

    /**
     * Return a list of promotions for a given type, a start date and an end date.
     *
     * @param strType
     * @param startDate
     * @param endDate
     *
     * @return
     */
    List<TPromotion> getPromotionsFromTo(final Date startDate, final Date endDate, final String strType);

    /**
     * Get promotions for a given type
     *
     * @param strType
     *
     * @return
     */
    List<TPromotion> getPromotionsForType(final String strType);

    /**
     * Checks whether a promotion is valid
     *
     * @param promotion
     *
     * @return
     */
    boolean isPromotionValid(TPromotion promotion);

    // history staff

    /**
     * Get the promotion history
     *
     * @param search_value
     *
     * @return
     */
    List<TPromotionHistory> getPromotionHistories(String search_value);

}
