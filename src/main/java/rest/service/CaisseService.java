/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.CaisseParamsDTO;
import commonTasks.dto.GenericDTO;
import commonTasks.dto.MvtCaisseDTO;
import commonTasks.dto.Params;
import commonTasks.dto.RapportDTO;
import commonTasks.dto.ResumeCaisseDTO;
import commonTasks.dto.SumCaisseDTO;
import commonTasks.dto.VenteDetailsDTO;
import commonTasks.dto.VisualisationCaisseDTO;
import dal.MvtTransaction;
import dal.TOfficine;
import dal.TUser;
import dal.enumeration.TypeTransaction;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import javax.ejb.Local;

import org.json.JSONException;
import org.json.JSONObject;
import rest.service.dto.CoffreCaisseDTO;
import rest.service.dto.MvtCaisseSummaryDTO;
import rest.service.exception.CaisseUsingExeception;

/**
 * @author Kobena
 */
@Local
public interface CaisseService {

    /*
     * Expression<javax.sql.Date> date = cb.currentDate(); // date only
     *
     * // Create current time expression: Expression<javax.sql.Time> time = cb.currentTime(); // time only
     *
     * // Create current date & time expression: Expression<javax.sql.Timestamp> ts = cb.currentTimestamp(); // both //
     * Create expressions that extract date parts: Expression<Integer> year = cb.function("year", Integer.class, date);
     * Expression<Integer> month = cb.function("month", Integer.class, date); Expression<Integer> day =
     * cb.function("day", Integer.class, ts);
     *
     * // Create expressions that extract time parts: Expression<Integer> hour = cb.function("hour", Integer.class,
     * time); Expression<Integer> minute = cb.function("minute", Integer.class, time); Expression<Integer> second =
     * cb.function("second", Integer.class, ts); qry.setHint("javax.persistence.cache.retrieveMode", CacheRetrieveMode.
     * BYPASS); EntityGraph entityGraph = entityManager .getEntityGraph("author-books-graph"); Map<String, Object>
     * properties = new HashMap<>(); properties.put("javax.persistence.fetchgraph", entityGraph); Author author =
     * entityManager.find(Author.class, id, properties);
     */
    List<SumCaisseDTO> getCaisse(CaisseParamsDTO caisseParams);

    SumCaisseDTO cumul(CaisseParamsDTO caisseParams, boolean all);

    List<VisualisationCaisseDTO> findAllMvtCaisse(LocalDate dtStart, LocalDate dtEnd, boolean checked,
            String emplacementId);

    JSONObject getResumeCaisse(LocalDate dtStart, LocalDate dtEnd, TUser u, boolean cancel, boolean allActivite,
            int start, int limit, boolean all, String userId) throws JSONException;

    List<ResumeCaisseDTO> getResumeCaisse(LocalDate dtStart, LocalDate dtEnd, TUser u, boolean allActivite, int start,
            int limit, boolean cancel, String userId, boolean all);

    JSONObject rollbackcloseCaisse(TUser o, String idCaisse) throws JSONException;

    JSONObject closeCaisse(TUser o, String idCaisse) throws JSONException;

    JSONObject createMvt(MvtCaisseDTO caisseDTO, TUser user) throws Exception;

    boolean checkCaisse(TUser user);

    JSONObject attribuerFondDeCaisse(String idUser, TUser operateur, Integer amount) throws JSONException;

    JSONObject rapportGestionViewData(Params params) throws JSONException;

    Map<Params, List<RapportDTO>> rapportGestion(Params params);

    JSONObject donneeCaisses(CaisseParamsDTO caisseParams, boolean all);

    Integer totalVenteDepot(LocalDate dtStart, LocalDate dtEnd, String empl);

    List<MvtTransaction> venteDepot(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId);

    List<VisualisationCaisseDTO> mouvementCaisses(CaisseParamsDTO caisseParams, boolean all);

    JSONObject mouvementCaisses(CaisseParamsDTO caisseParams) throws JSONException;

    long montantCa(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId,
            TypeTransaction transaction, String typrReglement);

    MvtTransaction findByVenteId(String venteId);

    boolean getKeyParams();

    boolean getKeyTakeIntoAccount();

    long montantAccount(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId,
            TypeTransaction transaction, String typrReglement);

    TOfficine findOfficine();

    JSONObject venteUg(LocalDate dtStart, LocalDate dtEnd, String query);

    List<VenteDetailsDTO> venteUgDTO(LocalDate dtStart, LocalDate dtEnd, String query);

    JSONObject balancePara(LocalDate dtStart, LocalDate dtEnd, String emplacementId) throws JSONException;

    GenericDTO balanceVenteCaisseReportPara(LocalDate dtStart, LocalDate dtEnd, String emplacementId);

    long montantAccount(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId,
            TypeTransaction transaction, String typrReglement, String typeMvtCaisse);

    long montantAccount(LocalDate dtStart, LocalDate dtEnd, String emplacementId, TypeTransaction transaction,
            String typrReglement, String typeMvtCaisse);

    List<MvtTransaction> balanceVenteCaisse(LocalDate dtStart, boolean checked, String emplacementId);

    List<rest.service.dto.MvtCaisseDTO> getAllMvtCaisses(String dtStart, String dtEnd, boolean checked, String userId,
            int limit, int start, boolean all);

    MvtCaisseSummaryDTO getAllMvtCaissesSummary(String dtStart, String dtEnd, String userId, boolean checked);

    JSONObject getAllMvtCaisses(String dtStart, String dtEnd, boolean checked, String userId, int limit, int start);

    String ouvrirCaisse(TUser user, CoffreCaisseDTO coffreCaisse) throws CaisseUsingExeception;

}
