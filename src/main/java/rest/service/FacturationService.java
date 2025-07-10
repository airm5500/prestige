/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.FactureDTO;
import commonTasks.dto.FactureDetailDTO;
import commonTasks.dto.Mode;
import commonTasks.dto.ModelFactureDTO;
import commonTasks.dto.VenteDetailsDTO;
import dal.TFacture;
import dal.TModelFacture;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author kkoffi
 */
@Local
public interface FacturationService {

    List<ModelFactureDTO> getAll();

    TFacture findFactureById(String idFacture);

    List<TFacture> findArangeOfFacture(List<String> ids);

    JSONObject update(String id, ModelFactureDTO modelFactureDTO) throws JSONException;

    JSONObject groupetierspayant(String query) throws JSONException;

    JSONObject provisoires(Mode mode, String groupTp, String typetp, String tpid, String codegroup, String dtStart,
            String dtEnd, String query, int start, int limit) throws JSONException;

    List<FactureDTO> provisoires10(String groupTp, String typetp, String tpid, String codegroup, boolean isTemplate,
            boolean all, int start, int limit);

    JSONObject provisoires10(String groupTp, String typetp, String tpid, String codegroup, boolean isTemplate,
            int start, int limit) throws JSONException;

    void removeFacture(String idFacture);

    List<FactureDetailDTO> findFacturesDetailsByFactureId(String id);

    List<VenteDetailsDTO> findArticleByFactureDetailsId(String id);

    List<VenteDetailsDTO> findArticleByFacturId(String id);

    TModelFacture modelFactureById(String lgMODELFACTUREID);
}
