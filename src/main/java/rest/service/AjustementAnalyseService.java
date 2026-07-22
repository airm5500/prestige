package rest.service;

import commonTasks.dto.AjustementAnalyseDTO;
import dal.TUser;
import java.io.IOException;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Analyse des ajustements de stock : produits les plus ajustes sur une periode, exports et actions associees
 * (suggestion, inventaire, impression). Le filtre motifId (motif_ajustement.id) est optionnel : vide = tous les motifs
 * ; il s'applique a la liste ET a toutes les actions pour rester coherent avec l'affichage.
 */
@Local
public interface AjustementAnalyseService {

    List<AjustementAnalyseDTO> analyse(TUser user, String dtStart, String dtEnd, String motifId);

    JSONObject fetchAnalyse(TUser user, String dtStart, String dtEnd, String motifId, int start, int limit);

    JSONObject fetchAnalyseDetails(TUser user, String familleId, String dtStart, String dtEnd, String motifId,
            int start, int limit);

    byte[] exportCsv(TUser user, String dtStart, String dtEnd, String motifId) throws IOException;

    byte[] exportExcel(TUser user, String dtStart, String dtEnd, String motifId) throws IOException;

    JSONObject createSuggestion(TUser user, String dtStart, String dtEnd, String motifId);

    JSONObject createInventaire(TUser user, String dtStart, String dtEnd, String motifId);

    String printPdf(TUser user, String dtStart, String dtEnd, String motifId);
}
