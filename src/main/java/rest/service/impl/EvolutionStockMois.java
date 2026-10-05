package rest.service.impl;

import commonTasks.dto.StockDailyValueDTO;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * EVOLUTION DU STOCK PAR MOIS (demande de l'officine du 05/10) : un point par mois, la valeur du DERNIER jour connu du
 * mois (la photo du stock en fin de mois, ou au dernier jour disponible pour le mois en cours). Les jours sont lus tels
 * que l'API journaliere les rend ; rien n'est recalcule.
 */
public final class EvolutionStockMois {

    private EvolutionStockMois() {
    }

    /**
     * @param jours
     *            les valeurs journalieres, dates au format AAAA-MM-JJ, dans l'ordre chronologique
     *
     * @return une valeur par mois, date « MM/AAAA », dans l'ordre chronologique
     */
    public static List<StockDailyValueDTO> parMois(List<StockDailyValueDTO> jours) {
        Map<String, StockDailyValueDTO> dernierParMois = new LinkedHashMap<>();
        for (StockDailyValueDTO j : jours) {
            if (j.getDate() == null || j.getDate().length() < 7) {
                continue;
            }
            String mois = j.getDate().substring(0, 7);
            StockDailyValueDTO actuel = dernierParMois.get(mois);
            if (actuel == null || j.getDate().compareTo(actuel.getDate()) >= 0) {
                dernierParMois.put(mois, j);
            }
        }
        List<StockDailyValueDTO> sortie = new ArrayList<>();
        for (Map.Entry<String, StockDailyValueDTO> e : dernierParMois.entrySet()) {
            StockDailyValueDTO m = new StockDailyValueDTO();
            m.setDate(e.getKey().substring(5, 7) + "/" + e.getKey().substring(0, 4));
            m.setValeurAchat(e.getValue().getValeurAchat());
            m.setValeurVente(e.getValue().getValeurVente());
            sortie.add(m);
        }
        return sortie;
    }
}
