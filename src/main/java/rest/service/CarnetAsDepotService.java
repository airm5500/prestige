/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.GenererFactureDTO;
import commonTasks.dto.ReglementCarnetDTO;
import commonTasks.dto.TiersPayantExclusDTO;
import commonTasks.dto.VenteTiersPayantsDTO;
import dal.MvtTransaction;
import dal.TPreenregistrement;
import dal.TTiersPayant;
import dal.TUser;
import dal.enumeration.TypeReglementCarnet;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.DepotProduitVendusDTO;
import rest.service.dto.ExtraitCompteClientDTO;
import rest.service.dto.ProduitVenduDTO;

/**
 *
 * @author koben
 */
@Local
public interface CarnetAsDepotService {

    List<TiersPayantExclusDTO> all(int start, int size, String query, boolean all, Boolean exclude);

    JSONObject all(int start, int size, String query, Boolean exclude);

    JSONObject fetchVenteByTiersPayant(String tiersPayantId, String dtStart, String dtEnd, int start, int size);

    List<VenteTiersPayantsDTO> fetchVente(String tiersPayantId, LocalDate dtStart, LocalDate dtEnd, int start, int size,
            boolean all);

    TiersPayantExclusDTO fetchVenteSummary(String tiersPayantId, LocalDate dtStart, LocalDate dtEnd);

    JSONObject reglementsCarnet(String tiersPayantId, TypeReglementCarnet typeReglementCarnet, String dtStart,
            String dtEnd, int start, int size);

    List<ReglementCarnetDTO> reglementsCarnet(String tiersPayantId, TypeReglementCarnet typeReglementCarnet,
            String dtStart, String dtEnd, int start, int size, boolean all);

    ReglementCarnetDTO reglementsCarnetSummary(String tiersPayantId, TypeReglementCarnet typeReglementCarnet,
            LocalDate dtStart, LocalDate dtEnd);

    JSONObject faireReglement(ReglementCarnetDTO reglementCarnetDTO, TUser user);

    String getTiersPayantName(String tiersPayantId);

    void setAsDepot(GenererFactureDTO datas);

    void setAsDepot(String id);

    void unsetAsDepot(String id);

    void update(String id, boolean isDepot);

    List<ProduitVenduDTO> listeArticleByTiersPayant(String query, String tierspayantId, String dtStart, String dtEnd);

    JSONObject listArticleByTiersPayant(String query, String tierspayantId, String dtStart, String dtEnd);

    List<ProduitVenduDTO> listeArticleByTiersPayantByProduitId(String produitId, String tierspayantId, String dtStart,
            String dtEnd);

    JSONObject articleByTiersPayantByProduitId(String produitId, String tierspayantId, String dtStart, String dtEnd);

    List<ExtraitCompteClientDTO> extraitcompteAvecRetour(String tiersPayantId, LocalDate dtStart, LocalDate dtEnd,
            String query);

    void setToExcludeOrNot(String id, boolean isDepot);

    void create(TPreenregistrement preenregistrement, MvtTransaction mvtTransaction, TTiersPayant payant);

    void updateOldData();

    List<DepotProduitVendusDTO> produitVenduParDepot(String tiersPayantId, LocalDate dtStart, LocalDate dtEnd,
            String query, int start, int size, boolean all);

    JSONObject produitVenduParDepot(String tiersPayantId, LocalDate dtStart, LocalDate dtEnd, String query, int start,
            int size);

    DepotProduitVendusDTO produitVenduParDepotSummary(String tiersPayantId, LocalDate dtStart, LocalDate dtEnd,
            String query);

    List<ExtraitCompteClientDTO> extraitcompte(String tiersPayantId, TypeReglementCarnet typeReglementCarnet,
            LocalDate dtStart, LocalDate dtEnd);
}
