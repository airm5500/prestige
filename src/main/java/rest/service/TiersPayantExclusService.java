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
import dal.TTiersPayant;
import dal.TUser;
import dal.enumeration.TypeReglementCarnet;
import dal.enumeration.TypeTiersPayant;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.ExtraitCompteClientDTO;
import rest.service.dto.VenteExclusDTO;

/**
 *
 * @author koben
 */
@Local
public interface TiersPayantExclusService {

    List<TiersPayantExclusDTO> all(int start, int size, String query, boolean all);

    JSONObject all(int start, int size, String query);

    void exclure(GenererFactureDTO datas);

    void exclure(String id);

    void inclure(String id);

    void update(String id, boolean toExclure);

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

    void updateTiersPayantAccount(TTiersPayant payant, int montant);

    List<ExtraitCompteClientDTO> extraitcompte(String tiersPayantId, TypeReglementCarnet typeReglementCarnet,
            LocalDate dtStart, LocalDate dtEnd);

    List<VenteExclusDTO> fetchVenteExclus(String tiersPayantId, LocalDate from, LocalDate to,
            TypeTiersPayant typeTiersPayant, int start, int size, boolean all);

    JSONObject allTiersPayant(int start, int size, String query);

}
