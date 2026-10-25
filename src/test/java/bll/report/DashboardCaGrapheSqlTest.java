package bll.report;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Locale;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DashboardCaGrapheSqlTest {

    @Test
    @DisplayName("Le Net TTC mensuel exclut les ventes annulees")
    void excludesCancelledSales() {
        String sql = Dashboard.CA_GRAPHE_QUERY.toLowerCase(Locale.ROOT).replaceAll("\\s+", "");

        assertTrue(sql.contains("coalesce(o.`b_is_cancel`,0)=0"));
    }

    @Test
    @DisplayName("Une remise absente ne supprime pas la vente de la somme")
    void treatsNullDiscountAsZero() {
        String sql = Dashboard.CA_GRAPHE_QUERY.toLowerCase(Locale.ROOT).replaceAll("\\s+", "");

        assertTrue(sql.contains("o.`int_price`-coalesce(o.`int_price_remise`,0)"));
    }
}
