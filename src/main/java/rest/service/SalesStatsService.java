/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.Params;
import commonTasks.dto.SalesStatsParams;
import commonTasks.dto.TicketDTO;
import commonTasks.dto.TiersPayantParams;
import commonTasks.dto.TvaDTO;
import commonTasks.dto.VenteDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.TPreenregistrement;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author Kobena
 */
@Local
//@Remote
public interface SalesStatsService {
    
    JSONObject getListeTPreenregistrement(SalesStatsParams params) throws JSONException;
    
    long countListeTPreenregistrement(SalesStatsParams params);
    
    JSONObject delete(String venteId) throws JSONException;
    
    JSONObject trash(String venteId, String statut) throws JSONException;
    
    JSONObject findVenteById(String venteId) throws JSONException;
    
    JSONObject reloadVenteById(String venteId) throws JSONException;
    
    JSONObject annulations(SalesStatsParams params) throws JSONException;
    
    long countListeAnnulations(SalesStatsParams params);
    
    JSONObject listeVentes(SalesStatsParams params) throws JSONException;

    List<VenteDTO> listeVentesReport(SalesStatsParams params);
    
    long countListeVentes(SalesStatsParams params);
    
    JSONObject tvasViewData(Params params) throws JSONException;
    
    TPreenregistrement findOneById(String venteId);
    
    List<TvaDTO> tvasRapport(Params params);
    
    List<TvaDTO> tvasRapportJournalier(Params params);
    
    List<VenteDetailsDTO> venteDetailsByVenteId(String venteId);
    
    List<VenteDTO> annulationVente(SalesStatsParams params);
    
    JSONObject modifiertypevente(String venteId, ClotureVenteParams params) throws JSONException;
    
    List<TiersPayantParams> venteTierspayantData(String venteId);
    
    JSONObject chargerClientLorsModificationVnete(String venteId) throws JSONException;
    
    TicketDTO getVenteById(String venteId);
    
    TicketDTO getVenteById(TPreenregistrement p);
    
    public long montantVenteAnnulees(SalesStatsParams params);
}