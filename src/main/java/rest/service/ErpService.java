/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.ErProduitDTO;
import commonTasks.dto.ErpAchatFournisseurDTO;
import commonTasks.dto.ErpCaComptant;
import commonTasks.dto.ErpFactureDTO;
import commonTasks.dto.ErpFournisseur;
import commonTasks.dto.ErpReglementDTO;
import commonTasks.dto.ErpTiersPayant;
import commonTasks.dto.ErpTiersPayantDTO;
import commonTasks.dto.StockDailyValueDTO;
import commonTasks.ws.CustomerDTO;
import commonTasks.ws.GroupeTiersPayantDTO;
import commonTasks.ws.TiersPayantDto;
import commonTasks.ws.WsCaAchatVente;
import java.util.List;

/**
 *
 * @author koben
 */
public interface ErpService {

    StockDailyValueDTO valorisation(String day);

    List<StockDailyValueDTO> valorisationAll(String dtStart, String dtEnd);

    List<ErpCaComptant> caComptant(String dtStart, String dtEnd);

    List<ErpCaComptant> caAll(String dtStart, String dtEnd);

    List<ErpTiersPayantDTO> rrpTiersPayant(String dtStart, String dtEnd);

    List<ErpReglementDTO> erpReglements(String dtStart, String dtEnd);

    List<ErpFactureDTO> erpFactures(String dtStart, String dtEnd);

    List<ErpFournisseur> fournisseurs();

    List<ErProduitDTO> produits();

    List<ErProduitDTO> checkproduit(String nom);

    List<ErpAchatFournisseurDTO> achatsFournisseurs(String dtStart, String dtEnd);

    List<ErpTiersPayant> allTiersPayants();

    List<GroupeTiersPayantDTO> allGroupeTiersPayants();

    List<TiersPayantDto> allWsTiersPayants();

    List<CustomerDTO> allWsClients();

    List<WsCaAchatVente> getCaAchatVente(String dtStart, String dtEnd);

}
