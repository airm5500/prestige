package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import commonTasks.dto.StockDailyValueDTO;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;

class EvolutionStockMoisTest {

    private static StockDailyValueDTO jour(String date, long achat, long vente) {
        StockDailyValueDTO d = new StockDailyValueDTO();
        d.setDate(date);
        d.setValeurAchat(achat);
        d.setValeurVente(vente);
        return d;
    }

    @Test
    void unPointParMoisAvecLaValeurDuDernierJourConnu() {
        List<StockDailyValueDTO> mois = EvolutionStockMois.parMois(Arrays.asList(jour("2026-08-01", 10, 15),
                jour("2026-08-31", 20, 25), jour("2026-09-01", 30, 35), jour("2026-09-14", 40, 45)));
        assertEquals(2, mois.size());
        assertEquals("08/2026", mois.get(0).getDate());
        assertEquals(20, mois.get(0).getValeurAchat());
        assertEquals(25, mois.get(0).getValeurVente());
        assertEquals("09/2026", mois.get(1).getDate());
        assertEquals(40, mois.get(1).getValeurAchat());
    }

    @Test
    void ordreChronologiqueEtChangementDAnnee() {
        List<StockDailyValueDTO> mois = EvolutionStockMois
                .parMois(Arrays.asList(jour("2025-12-31", 1, 1), jour("2026-01-31", 2, 2), jour("2026-02-28", 3, 3)));
        assertEquals("12/2025", mois.get(0).getDate());
        assertEquals("01/2026", mois.get(1).getDate());
        assertEquals("02/2026", mois.get(2).getDate());
    }

    @Test
    void joursSansDateIgnoresEtListeVide() {
        assertEquals(0, EvolutionStockMois.parMois(Collections.emptyList()).size());
        assertEquals(1, EvolutionStockMois.parMois(Arrays.asList(jour(null, 5, 5), jour("2026-03-10", 6, 6))).size());
    }
}
