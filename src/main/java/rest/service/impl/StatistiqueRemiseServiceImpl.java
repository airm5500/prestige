package rest.service.impl;

import commonTasks.dto.SalesStatsParams;
import commonTasks.dto.SummaryDTO;
import commonTasks.dto.VenteDTO;
import java.util.List;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import org.apache.commons.lang3.tuple.Pair;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.SalesStatsService;
import rest.service.StatistiqueRemiseService;

/**
 *
 * @author koben
 */
@Stateless
public class StatistiqueRemiseServiceImpl implements StatistiqueRemiseService {

    private @EJB SalesStatsService salesStatsService;

    @Override
    public JSONObject suiviRemise(SalesStatsParams params) throws JSONException {
        long count = salesStatsService.countListeVentes(params);
        if (count == 0) {
            return new JSONObject().put("total", count).put("data", new JSONArray()).put("metaData",
                    new JSONObject(new SummaryDTO()));
        }

        List<VenteDTO> datas = salesStatsService.listVentes(params);
        SummaryDTO summary = salesStatsService.summarySales(params);
        return new JSONObject().put("total", count).put("data", new JSONArray(datas)).put("metaData",
                new JSONObject(summary));
    }

    @Override
    public Pair<SummaryDTO, List<VenteDTO>> exportationSuiviRemise(SalesStatsParams params) {
        List<VenteDTO> datas = salesStatsService.venteAvecRemise(params);
        SummaryDTO summary = salesStatsService.summarySales(params);
        return Pair.of(summary, datas);
    }

}
