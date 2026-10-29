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

    /** Verrouille les produits de la vente et leur stock avant la cloture (ventes simultanees du meme article). */
    void verrouillerArticles(List<TPreenregistrementDetail> list, TEmplacement emplacement);

    void updateVenteStockDepot(TPreenregistrement tp, List<TPreenregistrementDetail> list, TEmplacement depot)
            throws Exception;

    void updateStockDepot(TUser ooTUser, TPreenregistrement op, TEmplacement emp) throws Exception;

    JSONObject creerAjustement(Params params) throws JSONException;

    JSONObject ajusterProduitAjustement(Params params) throws JSONException;

    JSONObject modifierProduitAjustement(Params params) throws JSONException;

    JSONObject cloreAjustement(Params params) throws JSONException;

    JSONObject removeAjustementDetail(String id) throws JSONException;

    JSONObject annulerAjustement(String id) throws JSONException;

    /** Identifiant de l'utilisateur qui a cree l'ajustement (null s'il n'existe pas). */
    String createurAjustement(String id);

    JSONObject ajsutements(SalesStatsParams params) throws JSONException;

    JSONObject ajsutementsDetails(SalesStatsParams params, String idAjustement) throws JSONException;

    JSONObject validerRetourFournisseur(Params params) throws JSONException;

    JSONObject mettreRetourEnAttente(Params params) throws JSONException;

    TFamilleStock updateStock(TFamille tf, TEmplacement emplacementId, int qty, int ug);

    int updateStockReturnInitStock(TFamille tf, TEmplacement emplacementId, int qty, int ug);

    JSONObject loadetourFournisseur(String dtStart, String dtEnd, int start, int limit, String fourId, String query,
            boolean cunRemove, String filtre) throws JSONException;

    /** Demande du 29/10 (point 1) : meme liste, filtree sur l'utilisateur du retour (vide : tous). */
    JSONObject loadetourFournisseur(String dtStart, String dtEnd, int start, int limit, String fourId, String query,
            boolean cunRemove, String filtre, String userId) throws JSONException;

    JSONObject validerRetourDepot(String retourId, TUser user) throws JSONException;

    List<AjustementDTO> getAllAjustements(SalesStatsParams params);

    List<AjustementDetailDTO> getAllAjustementDetailDTOs(SalesStatsParams params);

    List<RetourFournisseurDTO> loadretoursFournisseur(String dtStart, String dtEnd, int start, int limit, String fourId,
            String query, boolean cunRemove, String filtre);

    List<RetourDetailsDTO> loadretoursFournisseur(String dtStart, String dtEnd, String fourId, String query,
            String filtre);

    /** Demande du 29/10 (point 1) : memes details, filtres sur l'utilisateur du retour (vide : tous). */
    List<RetourDetailsDTO> loadretoursFournisseur(String dtStart, String dtEnd, String fourId, String query,
            String filtre, String userId);

    void validerFullBlRetourFournisseur(TRetourFournisseur fournisseur);

    void validerFullBlRetourFournisseur(TRetourFournisseur retourFournisseur, TMotifRetour motifRetour,
            List<TBonLivraisonDetail> bonLivraisonDetails);

    /**
     * Produits distincts contenus dans un ajustement.
     *
     * <p>
     * Sert a enchainer sur un inventaire ou une suggestion portant exactement sur ce qui vient d'etre ajuste.
     */
    java.util.Set<String> produitsDeLAjustement(String ajustementId);

    /**
     * Cree une suggestion de COMMANDE FOURNISSEUR sur les produits d'un ajustement.
     *
     * <p>
     * Reprend le mecanisme du bouton "Suggerer" de la liste des ajustements. Les produits sans grossiste sont ecartes :
     * sans fournisseur, il n'y a pas de commande a preparer.
     */
    org.json.JSONObject suggestionCommandeDepuisAjustement(dal.TUser user, String ajustementId);
}
