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

    JSONObject diagnosticProduit(String query, int start, int limit) throws JSONException;

    JSONObject diagnosticManques(int start, int limit) throws JSONException;

    JSONObject creerSuggestionDepuisDiagnostic(List<String> famillesIds) throws JSONException;

    void makeSuggestionAuto(List<TPreenregistrementDetail> list, TEmplacement emplacementId);

    JSONObject fetchItems(String orderId, String search, int start, int limit);

    void cleanSuggestion(String suggestionId, TUser tUser);

    void deleteSuggestion(String suggestionId);

    boolean changeGrossiste(String suggestionId, String grossisteId);

    void mergeSuggestion(String suggestionId, String grossisteId);

    List<ArticleCsvDTO> buildBySuggestion(String suggestionId);

    JSONObject suggererQteReappro(Set<VenteDetailsDTO> datas);

    /** Cree une suggestion VIDE de type manuelle (statut is_Process) pour le grossiste donne. */
    JSONObject createSuggestionManuelle(String grossisteId);

    /**
     * Fusionne les suggestions cochees (au moins deux) comme la fusion des commandes en cours : les lignes s'ajoutent,
     * les doublons de produit additionnent leurs quantites, les suggestions sources sont supprimees, le resultat
     * devient manuelle (is_Process). Quand les suggestions melent plusieurs grossistes, grossisteCibleId designe celui
     * qui porte la fusion ; s'il manque, la reponse liste les grossistes possibles (choixGrossisteRequis) pour que
     * l'ecran fasse choisir.
     */
    JSONObject mergeSuggestionSelection(List<String> suggestionIds, String grossisteCibleId);

}
