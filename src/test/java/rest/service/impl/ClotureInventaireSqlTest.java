package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

/**
 * Les ordres de la cloture d'inventaire (13/09) ne touchent que les lignes retenues avec ecart, sauf l'historique qui
 * garde une ligne par ligne retenue, et reprennent les tables de la procedure stockee.
 */
public class ClotureInventaireSqlTest {

    @Test
    public void seulesLesLignesAvecEcartSontTouchees() {
        for (String sql : new String[] { ClotureInventaireSql.STOCK_RAYON, ClotureInventaireSql.STOCK_PAR_TYPE,
                ClotureInventaireSql.DERNIER_INVENTAIRE, ClotureInventaireSql.MOUVEMENT_CUMUL,
                ClotureInventaireSql.MOUVEMENT_CREATION, ClotureInventaireSql.INSTANTANE_MAJ,
                ClotureInventaireSql.INSTANTANE_CREATION, ClotureInventaireSql.LIGNES_CLOTUREES }) {
            assertTrue(sql.contains("i.int_NUMBER <> i.int_NUMBER_INIT"), sql);
            assertTrue(sql.contains("i.bool_INVENTAIRE = 1"), sql);
            assertTrue(sql.contains(":inventaire"), sql);
        }
        assertFalse(ClotureInventaireSql.HISTORIQUE.contains("<>"), "l historique garde toutes les lignes retenues");
        assertTrue(ClotureInventaireSql.HISTORIQUE.contains("'04'"), "type de mouvement inventaire");
    }

    @Test
    public void tablesDeLaProcedureStockee() {
        assertTrue(ClotureInventaireSql.STOCK_PAR_TYPE.contains("t_type_stock_famille"));
        assertTrue(ClotureInventaireSql.DERNIER_INVENTAIRE.contains("dt_LAST_INVENTAIRE"));
        assertTrue(ClotureInventaireSql.MOUVEMENT_CUMUL.contains("m.int_NUMBER = m.int_NUMBER + i.int_NUMBER"));
        assertTrue(ClotureInventaireSql.MOUVEMENT_CREATION.contains("'INVENTAIRE'"));
        assertTrue(ClotureInventaireSql.INSTANTANE_MAJ.contains("m.int_STOCK_JOUR = i.int_NUMBER"));
        assertTrue(ClotureInventaireSql.INSTANTANE_CREATION.contains("i.int_NUMBER, i.int_NUMBER_INIT"));
        assertEquals("1", ClotureInventaireSql.typeStockRayon("1"));
        assertEquals("3", ClotureInventaireSql.typeStockRayon("2"));
    }
}
