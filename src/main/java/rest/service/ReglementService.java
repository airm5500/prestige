/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.DelayedDTO;
import commonTasks.dto.Params;
import commonTasks.dto.ReglementCarnetDTO;
import dal.TUser;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.dto.DossierReglementDTO;

/**
 *
 * @author DICI
 */
@Local
public interface ReglementService {

    JSONObject listeDifferesData(Params params, boolean pairclient) throws JSONException;

    List<DelayedDTO> listeDifferes(Params params, boolean pairclient);

    JSONObject reglerDiffereAll(ClotureVenteParams clotureVenteParams) throws JSONException;

    JSONObject reglerDiffere(ClotureVenteParams clotureVenteParams) throws JSONException;

    JSONObject reglementsDifferes(LocalDate dtStart, LocalDate dtEnd, boolean checked, String clientId)
            throws JSONException;

    List<DelayedDTO> reglementsDifferesDto(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId,
            String clientId);

    JSONObject detailsReglmentDiffere(String refReglement) throws JSONException;

    boolean checkCaisse(TUser user);

    JSONObject faireReglementCarnetDepot(ReglementCarnetDTO reglementCarnetDTO, TUser user);

    List<DossierReglementDTO> listeReglementFactures(String dtStart, String dtEnd, String tiersPayantId);

}
