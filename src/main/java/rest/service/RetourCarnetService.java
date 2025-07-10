/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import dal.RetourCarnet;
import java.time.LocalDate;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.dto.RetourCarnetDTO;
import rest.service.dto.RetourCarnetDetailDTO;

/**
 *
 * @author koben
 */
@Local
public interface RetourCarnetService {

    RetourCarnet createRetourCarnet(RetourCarnetDTO retourCarnetDTO, int qty, Integer motifId, String produitId)
            throws Exception;

    void updateRetourCarnet(Integer id, String libelle);

    Integer addDetailRetour(int qty, String produitId, Integer motifId, Integer idRetour) throws Exception;

    Integer updateDetailRetour(int qty, Integer id) throws Exception;

    void removeDetailRetour(Integer id);

    List<RetourCarnetDetailDTO> findByRetourCarnetId(Integer retourCarnetId, String query);

    RetourCarnetDetailDTO retourCarnetSummary(String idTierspayant, LocalDate dtStart, LocalDate dtEnd, String query);

    List<RetourCarnetDTO> listRetourByTierspayantIdAndPeriode(String idTierspayant, String query, LocalDate dtStart,
            LocalDate dtEnd, int start, int limit, boolean all);

    JSONObject listRetourByTierspayantIdAndPeriode(String idTierspayant, String query, LocalDate dtStart,
            LocalDate dtEnd, int start, int limit) throws JSONException;

    JSONObject findByRetourCarnetId(Integer retourCarnetId, String query, int start, int limit);

    List<RetourCarnetDTO> listRetourByTierspayantIdAndPeriode(String idTierspayant, String query, LocalDate dtStart,
            LocalDate dtEnd);

    List<RetourCarnetDTO> fetchRetourByTierspayantIdAndPeriode(String idTierspayant, String query, LocalDate dtStart,
            LocalDate dtEnd);

}
