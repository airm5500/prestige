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

    /**
     * Le chiffre d'affaires net et le nombre de ventes de chaque JOUR de la periode, sur le perimetre de la balance
     * (retour des tests du 09/09 : graphiques de l'analyse comparative). Chaque element : jour, montantNet, ventes.
     */
    org.json.JSONArray chiffreParJour(BalanceParamsDTO balanceParams);

    /** Les trois series par jour prises separement (net TTC et ventes ; credit et achats ; especes et mobile). */
    Map<String, JSONObject> serieCaParJour(BalanceParamsDTO balanceParams);

    Map<String, JSONObject> serieCreditEtAchatsParJour(BalanceParamsDTO balanceParams);

    Map<String, JSONObject> serieModesParJour(BalanceParamsDTO balanceParams);

    /**
     * Retours des tests 3 : les memes calculs, lances en parallele pour l'analyse comparative (chaque appel sur son
     * propre fil et sa propre connexion). Les resultats sont strictement ceux des methodes synchrones.
     */
    java.util.concurrent.Future<JSONObject> getBalanceVenteCaisseDataViewAsync(BalanceParamsDTO balanceParams);

    java.util.concurrent.Future<Map<String, JSONObject>> serieCaParJourAsync(BalanceParamsDTO balanceParams);

    java.util.concurrent.Future<Map<String, JSONObject>> serieCreditEtAchatsParJourAsync(
            BalanceParamsDTO balanceParams);

    java.util.concurrent.Future<Map<String, JSONObject>> serieModesParJourAsync(BalanceParamsDTO balanceParams);

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
