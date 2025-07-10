/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.ArticleDTO;
import commonTasks.dto.EntreeStockDetailFiltre;
import commonTasks.dto.GenererFactureDTO;
import commonTasks.dto.Params;
import commonTasks.dto.RuptureDTO;
import commonTasks.dto.RuptureDetailDTO;
import dal.Rupture;
import dal.RuptureDetail;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TGrossiste;
import dal.TOrder;
import dal.TOrderDetail;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.ejb.Local;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.dto.*;

/**
 *
 * @author DICI
 */
@Local
public interface OrderService {

    List<RuptureDetail> ruptureDetaisDtoByRupture(String idRupture);

    JSONObject creerBonLivraison(Params params) throws JSONException;

    TOrder findByRef(String reference, String idCommande);

    List<TOrderDetail> findByOrderId(String idCommande);

    TOrderDetail findByCipAndOrderId(String codeCip, String idCommande);

    Rupture creerRupture(TOrder order);

    void creerRuptureItem(Rupture rupture, TFamille famille, int qty);

    JSONObject removeRupture(String id);

    List<RuptureDTO> listeRuptures(LocalDate dtStart, LocalDate dtEnd, String query, String grossisteId, int start,
            int limit, boolean all);

    JSONObject listeRuptures(LocalDate dtStart, LocalDate dtEnd, String query, String grossisteId, int start, int limit)
            throws JSONException;

    List<RuptureDetailDTO> listeRuptures(LocalDate dtStart, LocalDate dtEnd, String query, String grossisteId,
            String emplacementId);

    int findProduitStock(String idProduit, String emplacementId);

    JSONObject creerRupture(GenererFactureDTO datas) throws JSONException;

    TFamilleGrossiste findOrCreateFamilleGrossiste(TFamille famille, TGrossiste grossiste);

    TFamilleGrossiste finFamilleGrossisteByIdFamilleAndIdGrossiste(String id, String grossisteId);

    TFamilleGrossiste finFamilleGrossisteByFamilleCipAndIdGrossiste(String id, String grossisteId);

    TOrder createOrder(TGrossiste grossiste, TUser u);

    RuptureDetail ruptureDetaisByRuptureAndProduitId(String idRupture, String produitCip);

    TOrderDetail modificationProduitCommandeEncours(ArticleDTO dto, TUser user);

    TFamilleGrossiste finFamilleGrossisteByByFamilleAndIdGrossiste(String idFamille, String grossisteId);

    TFamilleGrossiste findOrCreateFamilleGrossisteByFamilleAndGrossiste(TFamille famille, TGrossiste grossiste);

    TGrossiste findGrossiste(String id);

    JSONObject updateScheduled(String idProduit, boolean scheduled) throws JSONException;

    List<CommandeEncourDetailDTO> fetchOrderItems(CommandeFiltre filtre, String orderId, String query, int start,
            int limit, boolean all);

    JSONObject fetchOrderItems(CommandeFiltre filtre, String orderId, String query, int start, int limit);

    String modifierProduitPrixVenteCommandeEnCours(ArticleDTO dto, TUser user);

    JSONObject fetch(String query, Set<String> status, int start, int limit);

    void removeItem(String itemId);

    JSONObject getCommandeAmount(String commandeId);

    JSONObject addItem(OrderDetailDTO orderDetail, TUser user);

    Map<String, List<CommandeCsvDTO>> commandeEncoursCsv(String idCommande);

    void passerLaCommande(String orderId);

    void changerEnCommandeEnCours(String orderId);

    void transformSuggestionToOrder(String suggestionId, TUser user);

    void removeOrder(String orderId);

    void mergeOrder(CommandeIdsDTO commandeIds);

    void changeGrossiste(String idCommande, String grossisteId);

    JSONObject getListBons(String statut, String search);

    void deleteBonLivraison(String id);

    JSONObject getListBonsDetails(String bonId, String search, int start, int limit, EntreeStockDetailFiltre filtre,
            Boolean checkDatePeremption);

    void removeLot(DeleteLot deleteLot);

    JSONObject addLot(AddLot lot);

    JSONObject getListBonsDetailsByProduits(String produits, String search, String dtStart, String dtEnd, int start,
            int limit, String grossisteId);
}
