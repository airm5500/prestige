package rest.service.report;

import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.ArticleVenduDTO;
import rest.service.dto.StatistiqueProduitAnnuelleDTO;

/**
 *
 * @author koben
 */
@Local
public interface StatistiqueProduitService {

    JSONObject getIntervalAnnees();

    List<StatistiqueProduitAnnuelleDTO> getVenteProduits(Integer year, String search, String userEmplacement,
            String rayonId, int start, int limit, boolean all);

    JSONObject getVenteProduits(Integer year, String search, String userEmplacement, String rayonId, int start,
            int limit);

    List<ArticleVenduDTO> fetchListProduitAnnule(String dtStart, String dtEnd, String userId, int start, int limit,
            boolean all);

    JSONObject fetchListProduitAnnule(String dtStart, String dtEnd, String userId, int start, int limit);
}
