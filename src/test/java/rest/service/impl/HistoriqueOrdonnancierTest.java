package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.Calendar;
import org.json.JSONObject;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Retour du 05/11 : criteres et mise en forme du menu « Historique ordonnancier ». */
class HistoriqueOrdonnancierTest {

    private static final LocalDate DU = LocalDate.of(2026, 11, 1);
    private static final LocalDate AU = LocalDate.of(2026, 11, 5);

    @Test
    @DisplayName("Sans categorie : produits sensibles OU de l'ordonnancier, periode bornes comprises")
    void lesDeux() {
        HistoriqueOrdonnancier.Criteres c = HistoriqueOrdonnancier.criteres(DU, AU, "", "");
        assertTrue(c.getWhere().contains("IFNULL(f.is_sensible, 0) = 1 OR (IFNULL(f.is_scheduled, 0) = 1"),
                c.getWhere());
        assertTrue(c.getWhere().contains("p.b_IS_CANCEL = 0"), "jamais les ventes annulees");
        assertEquals(2, c.getParametres().size());
        assertEquals(java.sql.Timestamp.valueOf("2026-11-06 00:00:00"), c.getParametres().get(1), "le 05 compris");
    }

    @Test
    @DisplayName("Categorie sensible ou ordonnancier : une seule des deux regles")
    void categories() {
        String s = HistoriqueOrdonnancier.criteres(DU, AU, null, "sensible").getWhere();
        assertTrue(s.contains("AND IFNULL(f.is_sensible, 0) = 1") && !s.contains("is_scheduled"), s);
        String o = HistoriqueOrdonnancier.criteres(DU, AU, null, "ordonnancier").getWhere();
        assertTrue(o.contains("is_scheduled") && o.contains("int_T") && !o.contains("is_sensible"), o);
    }

    @Test
    @DisplayName("Produit : debut de CIP ou partie du nom, parametres numerotes dans l'ordre")
    void produit() {
        HistoriqueOrdonnancier.Criteres c = HistoriqueOrdonnancier.criteres(DU, AU, " doli ", "");
        assertTrue(c.getWhere().contains("f.int_CIP LIKE ?3 OR UPPER(f.str_NAME) LIKE ?4"), c.getWhere());
        assertEquals("doli%", c.getParametres().get(2));
        assertEquals("%DOLI%", c.getParametres().get(3));
    }

    @Test
    @DisplayName("Ligne : le ticket est celui qui est imprime ; sans medecin, prescripteur vide")
    void ligne() {
        Calendar cal = Calendar.getInstance();
        cal.set(2026, Calendar.NOVEMBER, 5, 9, 7, 0);
        Object[] r = { cal.getTime(), "REF-1", "0042", "1234567", "DOLIPRANE", 2, "JEAN DUPONT", "", "AWA K", 1, 0 };
        JSONObject sansRef = HistoriqueOrdonnancier.ligne(r, false);
        assertEquals("0042", sansRef.getString("ticket"));
        assertEquals("05/11/2026 09:07", sansRef.getString("date"));
        assertEquals("", sansRef.getString("prescripteur"));
        assertEquals("Sensible", sansRef.getString("categorie"));
        assertEquals("REF-1", HistoriqueOrdonnancier.ligne(r, true).getString("ticket"));
        assertEquals("DOLIPRANE (1234567)", HistoriqueOrdonnancier.produit(sansRef));
        assertFalse(HistoriqueOrdonnancier.libelleCategorie("x").isEmpty());
    }
}
