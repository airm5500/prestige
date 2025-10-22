package rest.service;

import commonTasks.dto.BalanceDTO;
import commonTasks.dto.GenericDTO;
import commonTasks.dto.TableauBaordPhDTO;
import commonTasks.dto.TableauBaordSummary;
import commonTasks.dto.TvaDTO;
import java.util.List;
import java.util.Map;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.BalanceParamsDTO;

/**
 *
 * @author koben
 */
@Local
public interface BalanceService {

    List<BalanceDTO> buildBalanceFromPreenregistrement(BalanceParamsDTO balanceParams);

    GenericDTO getBalanceVenteCaisseData(BalanceParamsDTO balanceParams);

    JSONObject getBalanceVenteCaisseDataView(BalanceParamsDTO balanceParams);

    JSONObject statistiqueTvaView(BalanceParamsDTO balanceParams);

    long montantToRemove(BalanceParamsDTO balanceParams);

    List<TvaDTO> statistiqueTva(BalanceParamsDTO balanceParams);

    List<TvaDTO> statistiqueTvaGroupingByDay(BalanceParamsDTO balanceParams);

    boolean useLastUpdateStats();

    Map<TableauBaordSummary, List<TableauBaordPhDTO>> getTableauBoardData(BalanceParamsDTO balanceParams);

    JSONObject tableauBoardDatas(BalanceParamsDTO balanceParams);

    List<TvaDTO> statistiqueTvaPeriodique(BalanceParamsDTO balanceParams);

    List<BalanceDTO> recapBalance(BalanceParamsDTO balanceParams);

    JSONObject etatLastThreeYears();

    /**
     * Calcule et retourne la balance agrégée pour tous les dépôts (sauf le principal).
     *
     * @param balanceParams
     *            Les paramètres de date. L'emplacementId est ignoré.
     *
     * @return Un JSONObject contenant les données agrégées.
     */
    JSONObject getBalanceForAllDepots(BalanceParamsDTO balanceParams);

    /**
     * Génère un rapport PDF de la balance des ventes.
     *
     * @param balanceParams
     *            Les paramètres de filtre (dépôt, dates).
     *
     * @return Un tableau de bytes représentant le fichier PDF.
     *
     * @throws Exception
     *             En cas d'erreur de génération.
     */
    byte[] generateBalanceReport(BalanceParamsDTO balanceParams) throws Exception;

}
