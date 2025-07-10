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

    JSONObject ticketReglementDiffere(String idDossier) throws JSONException;

    List<TPreenregistrementDetail> listeVenteByIdVente(String id);

    List<TPreenregistrementCompteClientTiersPayent> listeVenteTiersPayantsByIdVente(String id);

    List<String> generateDataSeller(TPreenregistrement p);

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
