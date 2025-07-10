/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.QueryDTO;
import commonTasks.dto.SalesParams;
import dal.TPreenregistrement;
import dal.TUser;
import javax.ejb.Local;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author DICI
 */
@Local
// @Remote
public interface VenteService {

    JSONObject annulerVente(TUser ooTUser, String lg_PREENREGISTREMENT_ID);

    boolean updateSnapshotVenteSociete(String lg_PREENREGISTREMENT_ID, String lg_COMPTE_CLIENT_ID);

    JSONObject createPreVente(SalesParams salesParams);

    JSONObject createPreVenteVo(SalesParams salesParams);

    JSONObject transformerVente(SalesParams salesParams);

    JSONObject addPreenregistrementItem(SalesParams params);

    JSONObject updateTPreenregistrementDetail(SalesParams params);

    TPreenregistrement removePreenregistrementDetail(String itemId);

    void displayData(String data);

    JSONObject updateayantdroit(SalesParams params);

    JSONObject updateclient(SalesParams params) throws JSONException;

    JSONObject updateVenteClotureComptant(ClotureVenteParams clotureVenteParams);

    JSONObject updateVenteClotureAssurance(ClotureVenteParams clotureVenteParams);

    JSONObject clotureravoir(String lg_PREENREGISTREMENT_ID, TUser tUser);

    JSONObject updateVenteBonVente(String idCompteClientItem, String str_REF_BON);

    JSONObject closeventeBon(String lg_PREENREGISTREMENT_ID);

    JSONObject addtierspayant(SalesParams params);

    JSONObject removetierspayant(SalesParams params);

    JSONObject shownetpayVno(SalesParams params) throws JSONException;

    JSONObject shownetpayVno(TPreenregistrement p) throws JSONException;

    JSONObject shownetpayVo(SalesParams params) throws JSONException;

    JSONObject addRemisse(SalesParams params) throws JSONException;

    JSONObject faireDevis(SalesParams params) throws JSONException;

    JSONObject produits(QueryDTO params, Boolean all) throws JSONException;

    JSONObject detailsVente(QueryDTO params, Boolean all) throws JSONException;

    JSONObject addtierspayant(String venteId, SalesParams params);

    JSONObject removetierspayant(String comptClientTpId, String venteId);

    Integer productQtyByVente(String venteId);

    Integer nbreProduitsByVente(String venteId);

    JSONObject annulerVenteDepot(TUser ooTUser, String lg_PREENREGISTREMENT_ID) throws JSONException;

    JSONObject updatRemiseVenteDepot(String venteId, int valueRemise) throws JSONException;

    JSONObject clotureVenteDepot(ClotureVenteParams clotureVenteParams) throws JSONException;

    JSONObject clotureVenteDepotAgree(ClotureVenteParams clotureVenteParams) throws JSONException;

    JSONObject shownetpaydepotAgree(SalesParams params) throws JSONException;

    boolean checkCaisse(TUser ooTUser);

    JSONObject produits(String produitId, String emplacementId) throws JSONException;

    JSONObject findOneproduit(String produitId, String emplacementId) throws JSONException;
}
