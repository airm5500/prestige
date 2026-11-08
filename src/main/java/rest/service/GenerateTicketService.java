/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.Params;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementDetail;
import dal.TUser;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.dto.TicketRecapWrapper;

/**
 *
 * @author Kobena
 */
@Local

public interface GenerateTicketService {

    JSONObject lunchPrinterForTicket(String idVente) throws JSONException;

    String buildLineBarecode(String data);

    JSONObject printerForTicket(String p, TUser user) throws JSONException;

    JSONObject lunchPrinterForTicket(ClotureVenteParams clotureVenteParams) throws JSONException;

    JSONObject lunchPrinterForTicketVo(ClotureVenteParams clotureVenteParams) throws JSONException;

    JSONObject lunchPrinterForTicketDepot(ClotureVenteParams clotureVenteParams) throws JSONException;

    JSONObject lunchPrinterForTicketVo(String p) throws JSONException;

    /**
     * Ticket synthetique d'une prevente : reference, date, heure, vendeur, montants selon le type de vente et QR code
     * encodant l'identifiant. Sans les produits. Sert a l'impression a l'enregistrement et a la reimpression.
     */
    JSONObject imprimerTicketPrevente(String venteId) throws JSONException;

    JSONObject ticketReglementDiffere(String idDossier) throws JSONException;

    List<TPreenregistrementDetail> listeVenteByIdVente(String id);

    List<TPreenregistrementCompteClientTiersPayent> listeVenteTiersPayantsByIdVente(String id);

    List<String> generateDataSeller(TPreenregistrement p);

    /** Ticket de reimpression de la vente, construit sans l'imprimer (tests de rapprochement du 05/11). */
    List<rest.service.ticket.TicketDocument> apercuTicketVo(String id) throws JSONException;

    /**
     * Ticket client combine (vente assurance + vente comptant liee) construit sans l'imprimer, par le meme chemin que
     * la cloture (tests de rapprochement du cas 1). Vide sans vente liee.
     */
    List<rest.service.ticket.TicketDocument> apercuTicketCombine(String voId);

    /**
     * Tickets de la premiere impression d'une vente assurance (appel de l'ecran apres la cloture, avec ses parametres),
     * construits sans les imprimer : test de la monnaie des ventes liees du 08/11.
     */
    List<rest.service.ticket.TicketDocument> apercuTicketVoCloture(ClotureVenteParams clotureVenteParams)
            throws JSONException;

    /** Idem pour une vente au comptant (tests de rapprochement des promotions, audit 05 PR-01). */
    List<rest.service.ticket.TicketDocument> apercuTicketVno(String id) throws JSONException;

    List<String> generateDataVenteSupprime(TPreenregistrement p);

    List<String> generateDataTiersPayant(TPreenregistrement p);

    List<String> generateDataTiersPayant(TPreenregistrement p, List<TPreenregistrementCompteClientTiersPayent> lstT);

    JSONObject lunchPrinterForTicketDepot(String id) throws JSONException;

    JSONObject ticketZ(Params params) throws JSONException;

    JSONObject ticketReglementCarnet(String idDossier) throws JSONException;

    void printMvtCaisse(String mvtCaisseId, TUser user);

    JSONObject fetchTicketZ(Params params) throws JSONException;

    TicketRecapWrapper buildTicketZ(Params params);

    JSONObject printReglementFacture(String lgDossierReglementId, TUser user);

    void sendToSms(Params params) throws JSONException;

}
