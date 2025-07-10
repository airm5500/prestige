/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.ArticleDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.*;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.dto.SuggestionDTO;
import rest.service.dto.SuggestionOrderDetailDTO;

import javax.ejb.Local;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import rest.service.dto.ArticleCsvDTO;

/**
 *
 * @author Kobena
 */
@Local

public interface SuggestionService {

    void makeSuggestionAuto(TFamilleStock familleStock, TFamille famille);

    void makeSuggestionAuto(String preenregistrement);

    Integer getQuantityReapportByCodeGestionArticle(TFamilleStock familleStock, TFamille famille);

    List<TCalendrier> nombresJourVente(LocalDate begin);

    List<TSuggestionOrderDetails> findFamillesBySuggestion(String suggestionId);

    JSONObject makeSuggestion(List<VenteDetailsDTO> datas) throws JSONException;

    JSONObject makeSuggestionFromArticleInvendus(List<ArticleDTO> datas, TUser tu) throws JSONException;

    JSONObject makeSuggestion(Set<VenteDetailsDTO> datas) throws JSONException;

    JSONObject findCHDetailStock(String idProduit, String emplacement);

    void proccessSuggetion(TFamille famille, TEmplacement emplacementId);

    void removeItem(String itemId);

    SuggestionDTO getSuggestionAmount(String suggestionId);

    void addItem(SuggestionOrderDetailDTO suggestionOrderDetail);

    void updateItemSeuil(SuggestionOrderDetailDTO suggestionOrderDetail);

    void updateItemQteCmde(SuggestionOrderDetailDTO suggestionOrderDetail);

    void updateItemQtePrixPaf(SuggestionOrderDetailDTO suggestionOrderDetail);

    void updateItemQtePrixVente(SuggestionOrderDetailDTO suggestionOrderDetail);

    SuggestionDTO create(SuggestionDTO suggestion);

    JSONObject fetch(String query, int start, int limit);

    void setToPending(String id);

    void makeSuggestionAuto(List<TPreenregistrementDetail> list, TEmplacement emplacementId);

    JSONObject fetchItems(String orderId, String search, TUser tUser, int start, int limit);

    void deleteSuggestion(String suggestionId);

    boolean changeGrossiste(String suggestionId, String grossisteId);

    void mergeSuggestion(String suggestionId, String grossisteId);

    List<ArticleCsvDTO> buildBySuggestion(String suggestionId);

    JSONObject suggererQteReappro(Set<VenteDetailsDTO> datas);

}
