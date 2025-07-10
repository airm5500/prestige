/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.asc.prestige2.business.bonlivraisons;

import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TQuinzaine;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;

/**
 *
 * @author JZAGO
 */
public interface BLService {

    List<TBonLivraison> getBLs();

    TBonLivraison getBL(String str_BL_ID);

    List<TQuinzaine> getQuinzaines();

    Collection<TBonLivraisonDetail> getBLDetailsFor(TBonLivraison bl);

    boolean createBL(String str_REF_LIVRAISON, Date dt_DATE_LIVRAISON, int int_MHT, int int_TVA, int int_HTTC,
            String str_STATUT, String str_STATUT_FACTURE);

    public Map<String, Object> getBLDetailsMapFor(TBonLivraisonDetail bl);

    public Map<String, Object> getBLMap(String str_BL_ID);

    public boolean markNONREGLEBonLivraison(String lg_BON_LIVRAISON_ID);

    public boolean markREGLEBonLivraison(String lg_BON_LIVRAISON_ID, Date dt_REGLEMENT_DATE);

    public boolean markREGLEENPARTIEBonLivraison(String lg_BON_LIVRAISON_ID, Date dt_REGLEMENT_DATE,
            int int_MONTANT_REGLE);

    boolean deleteBonLivraison(TBonLivraison bl);

    boolean deleteBonLivraisonDetail(TBonLivraisonDetail detail);

    boolean createQuinzaine(final String lg_GROSSISTE_ID, final Date start, final Date end);

    TQuinzaine getQuinzaine(String quinzaineID);

    boolean updateQuinzaine(TQuinzaine quinzaine, Map<String, Object> values);

    boolean updateQuinzaine(String quinzaineID, Map<String, Object> values);

    boolean deleteQuinzaine(String quinzaineID);

    int binarySearch(int[] sortedNumbers, int number);

}
