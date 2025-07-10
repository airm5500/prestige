package util;

import dal.TOrderDetail;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.function.Predicate;
import org.apache.commons.collections4.CollectionUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
public final class FunctionUtils {

    private static final String TOTAL = "total";
    private static final String DATA = "data";
    public static final String RECEIT_TITLE = "Ticket N° ";

    public static final int VALEUR_TABLEAU = 30;
    public static final Predicate<TOrderDetail> ECART_PRIX_VENTE_30 = t -> {
        if (Objects.isNull(t.getPrixUnitaire())) {
            int diff = Math.abs(t.getLgFAMILLEID().getIntPRICE() - t.getIntPRICEDETAIL());
            return diff != 30 && diff != 0;
        }
        int diff = Math.abs(t.getLgFAMILLEID().getIntPRICE() - t.getPrixUnitaire());
        return diff != 30 && diff != 0;
    };

    public static JSONObject returnData(List<?> data, long total) {
        if (CollectionUtils.isEmpty(data)) {
            return new JSONObject().put(TOTAL, 0).put(DATA, new JSONArray(Collections.emptyList()));
        }
        return new JSONObject().put(TOTAL, total).put(DATA, new JSONArray(data));
    }

    public static JSONObject returnData(List<?> data) {
        if (CollectionUtils.isEmpty(data)) {
            return new JSONObject().put(TOTAL, 0).put(DATA, new JSONArray(Collections.emptyList()));
        }
        return new JSONObject().put(TOTAL, data.size()).put(DATA, new JSONArray(data));
    }

    public static JSONObject returnData(List<?> data, long total, Object summary) {
        JSONObject json = new JSONObject();
        if (CollectionUtils.isEmpty(data)) {
            json.put(TOTAL, 0).put(DATA, new JSONArray(Collections.emptyList()));
        } else {
            json.put(TOTAL, total).put(DATA, new JSONArray(data));
        }
        if (summary != null) {
            json.put("metaData", new JSONObject(summary));
        }
        return json;
    }

    public static JSONObject returnData(List<?> data, Object summary) {
        JSONObject json = new JSONObject();
        if (CollectionUtils.isEmpty(data)) {
            json.put(TOTAL, 0).put(DATA, new JSONArray(Collections.emptyList()));
        } else {
            json.put(TOTAL, data.size()).put(DATA, new JSONArray(data));
        }
        if (summary != null) {
            json.put("metaData", new JSONObject(summary));
        }
        return json;
    }

    public static JSONObject returnData(Object o) {

        return new JSONObject().put(DATA, new JSONObject(o));

    }

    public static JSONObject returnData(JSONArray data) {

        return new JSONObject().put(TOTAL, data.length()).put(DATA, data);
    }

    private FunctionUtils() {

    }
}
