/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.AjustementDTO;
import commonTasks.dto.AjustementDetailDTO;
import commonTasks.dto.Params;
import commonTasks.dto.RetourDetailsDTO;
import commonTasks.dto.RetourFournisseurDTO;
import commonTasks.dto.SalesStatsParams;
import dal.TBonLivraisonDetail;
import dal.TEmplacement;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TMotifRetour;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TRetourFournisseur;
import dal.TUser;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author Kobena
 */
@Local
public interface MvtProduitService {

    void updateVenteStock(TPreenregistrement tp, List<TPreenregistrementDetail> list);

    void updateVenteStockDepot(TPreenregistrement tp, List<TPreenregistrementDetail> list, TEmplacement depot)
            throws Exception;

    void updateStockDepot(TUser ooTUser, TPreenregistrement op, TEmplacement emp) throws Exception;

    JSONObject creerAjustement(Params params) throws JSONException;

    JSONObject ajusterProduitAjustement(Params params) throws JSONException;

    JSONObject modifierProduitAjustement(Params params) throws JSONException;

    JSONObject cloreAjustement(Params params) throws JSONException;

    JSONObject removeAjustementDetail(String id) throws JSONException;

    JSONObject annulerAjustement(String id) throws JSONException;

    JSONObject ajsutements(SalesStatsParams params) throws JSONException;

    JSONObject ajsutementsDetails(SalesStatsParams params, String idAjustement) throws JSONException;

    JSONObject validerRetourFournisseur(Params params) throws JSONException;

    TFamilleStock updateStock(TFamille tf, TEmplacement emplacementId, int qty, int ug);

    int updateStockReturnInitStock(TFamille tf, TEmplacement emplacementId, int qty, int ug);

    JSONObject loadetourFournisseur(String dtStart, String dtEnd, int start, int limit, String fourId, String query,
            boolean cunRemove, String filtre) throws JSONException;

    JSONObject validerRetourDepot(String retourId, TUser user) throws JSONException;

    List<AjustementDTO> getAllAjustements(SalesStatsParams params);

    List<AjustementDetailDTO> getAllAjustementDetailDTOs(SalesStatsParams params);

    List<RetourFournisseurDTO> loadretoursFournisseur(String dtStart, String dtEnd, int start, int limit, String fourId,
            String query, boolean cunRemove, String filtre);

    List<RetourDetailsDTO> loadretoursFournisseur(String dtStart, String dtEnd, String fourId, String query,
            String filtre);

    void validerFullBlRetourFournisseur(TRetourFournisseur fournisseur);

    void validerFullBlRetourFournisseur(TRetourFournisseur retourFournisseur, TMotifRetour motifRetour,
            List<TBonLivraisonDetail> bonLivraisonDetails);

}
