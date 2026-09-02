/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.MedecinDTO;
import commonTasks.dto.QueryDTO;
import commonTasks.dto.SalesParams;
import dal.TPreenregistrement;
import dal.TUser;

import org.json.JSONException;
import org.json.JSONObject;
import rest.service.dto.UpdateVenteParamDTO;

/**
 * @author Kobena
 */
public interface SalesService {

    JSONObject annulerVente(TUser ooTUser, String id);

    JSONObject createPreVente(SalesParams salesParams);

    JSONObject createPreVenteVo(SalesParams salesParams);

    JSONObject transformerVente(SalesParams salesParams);

    JSONObject addPreenregistrementItem(SalesParams params);

    JSONObject updateTPreenregistrementDetail(SalesParams params);

    JSONObject controleDetailVente(String venteId) throws JSONException;

    JSONObject stockVendableProduit(String produitId) throws JSONException;

    TPreenregistrement removePreenregistrementDetail(String itemId);

    JSONObject updateayantdroit(SalesParams params);

    JSONObject updateclient(SalesParams params) throws JSONException;

    JSONObject updateVenteClotureComptant(ClotureVenteParams clotureVenteParams);

    JSONObject updateVenteClotureAssurance(ClotureVenteParams clotureVenteParams);

    /**
     * Etat d'une vente : est-elle encaissee ?
     *
     * <p>
     * Sert au poste qui n'a pas recu la reponse de sa cloture - reseau coupe, delai depasse - et qui doit savoir s'il
     * doit proposer le ticket ou proposer de recommencer. La lecture est SCALAIRE et sans verrou : elle doit repondre
     * meme quand le serveur est deja charge, c'est justement dans ce cas qu'on l'interroge.
     *
     * @param venteId
     *            identifiant de la vente
     */
    JSONObject statutVente(String venteId);

    /**
     * Verrou de rappel d'une vente en attente (lot 3) : marque la vente comme rappelee par la caisse donnee. Refuse si
     * une autre caisse la detient (verrou non expire) ou si la vente est deja cloturee.
     */
    JSONObject rappelerVenteEnAttente(String venteId, dal.TUser tu);

    /** Libere le verrou de rappel si la caisse donnee le detient (ou s'il est deja vide). */
    JSONObject libererRappelVente(String venteId, dal.TUser tu);

    JSONObject clotureravoir(String id, TUser tUser);

    JSONObject closeventeBon(String id);

    JSONObject removetierspayant(SalesParams params);

    JSONObject shownetpayVno(SalesParams params) throws JSONException;

    JSONObject shownetpayVno(TPreenregistrement p) throws JSONException;

    JSONObject addRemise(SalesParams params);

    JSONObject faireDevis(SalesParams params) throws JSONException;

    JSONObject produits(QueryDTO params, boolean all) throws JSONException;

    JSONObject detailsVente(QueryDTO params, boolean all) throws JSONException;

    JSONObject addtierspayant(String venteId, SalesParams params);

    JSONObject removetierspayant(String comptClientTpId, String venteId);

    Integer nbreProduitsByVente(String venteId);

    JSONObject updatRemiseVenteDepot(String venteId, int valueRemise) throws JSONException;

    JSONObject clotureVenteDepot(ClotureVenteParams clotureVenteParams) throws JSONException;

    JSONObject clotureVenteDepotAgree(ClotureVenteParams clotureVenteParams) throws JSONException;

    JSONObject shownetpaydepotAgree(SalesParams params) throws JSONException;

    JSONObject shownetpaydepotAgree(TPreenregistrement p) throws JSONException;

    boolean checkCaisse(TUser ooTUser);

    JSONObject produits(String produitId) throws JSONException;

    JSONObject findOneproduit(String produitId, String emplacementId) throws JSONException;

    JSONObject removeClientToVente(String venteId) throws JSONException;

    JSONObject modifiertypevente(String venteId, ClotureVenteParams params) throws JSONException;

    JSONObject mettreAjourDonneesClientVenteExistante(String venteId, SalesParams params) throws JSONException;

    JSONObject modificationVenteCloturee(String venteId);

    JSONObject supprimerCopieVente(String venteId) throws JSONException;

    JSONObject modificationVentetierpayantprincipal(String venteId, ClotureVenteParams params) throws JSONException;

    JSONObject updateMedecin(String idVente, MedecinDTO medecinDTO) throws JSONException;

    JSONObject updateMedecin(String idVente, String medecinId) throws JSONException;

    boolean checkParameterByKey(String key);

    JSONObject updateClientOrTierpayant(SalesParams salesParams) throws JSONException;

    JSONObject findVenteForUpdationg(String venteId) throws JSONException;

    void annulerVenteAnterieur(TUser ooTUser, TPreenregistrement tp);

    JSONObject closePreventeVente(TUser ooTUser, String id);

    JSONObject clonerDevis(TUser ooTUser, String devisId) throws JSONException;

    void updateVenteDate(UpdateVenteParamDTO param);

    JSONObject computeVONet(SalesParams params);

    void updateVNOClient(String venteId, String clientId);
}
