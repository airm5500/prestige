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
}
