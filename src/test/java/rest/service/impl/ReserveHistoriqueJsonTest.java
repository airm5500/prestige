package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Calendar;
import java.util.Collections;
import java.util.Date;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Contrat JSON du detail des mouvements de reserve (fenetre "Mouvements internes reserve" du suivi complet et ecran
 * Historique du module Reserve) : libelles metier, stocks avant/apres et drapeaux d'annulation.
 */
public class ReserveHistoriqueJsonTest {

    /**
     * Ligne au format HISTORIQUE_SELECT : dt, cip, nom, type, qte, ravant, rapres, resavant, resapres, user, id,
     * sourceId, motif, annulePar.
     */
    private static Object[] ligne(String type, String sourceId, String motif, int annulePar) {
        Calendar cal = Calendar.getInstance();
        cal.set(2026, Calendar.AUGUST, 5, 14, 30, 0);
        Date dt = cal.getTime();
        return new Object[] { dt, "123456", "DOLIPRANE 500MG", type, 10, 30, 20, 5, 15, "Jean K", "MVT1", sourceId,
                motif, annulePar };
    }

    @Test
    public void libellesMetierDesTypesTechniques() {
        assertEquals("REAPPRO RESERVE", ReserveServiceImpl.libelleMouvement("ASSORT"));
        assertEquals("REAPPRO RAYON", ReserveServiceImpl.libelleMouvement("REASSORT"));
        assertEquals("AJUSTEMENT RESERVE", ReserveServiceImpl.libelleMouvement("AJUSTEMENT"));
        // Type non mappe : rendu tel quel plutot que masque, historique oblige.
        assertEquals("DESTOCKAGE", ReserveServiceImpl.libelleMouvement("DESTOCKAGE"));
        assertEquals("", ReserveServiceImpl.libelleMouvement(null));
    }

    @Test
    public void mouvementNormalCompletementRenseigne() {
        JSONArray out = ReserveServiceImpl
                .lignesHistoriqueJson(Collections.singletonList(ligne("ASSORT", null, null, 0)));

        assertEquals(1, out.length());
        JSONObject o = out.getJSONObject(0);
        assertEquals("05/08/2026 14:30", o.getString("dt_CREATED"));
        assertEquals("123456", o.getString("int_CIP"));
        assertEquals("DOLIPRANE 500MG", o.getString("str_NAME"));
        assertEquals("ASSORT", o.getString("str_TYPE"));
        assertEquals("REAPPRO RESERVE", o.getString("str_MOUVEMENT"));
        assertEquals(10, o.getInt("int_QTE"));
        assertEquals(30, o.getInt("int_STOCK_RAYON_AVANT"));
        assertEquals(20, o.getInt("int_STOCK_RAYON_APRES"));
        assertEquals(5, o.getInt("int_STOCK_RESERVE_AVANT"));
        assertEquals(15, o.getInt("int_STOCK_RESERVE_APRES"));
        assertEquals("Jean K", o.getString("str_USER"));
        assertFalse(o.getBoolean("bl_EST_ANNULATION"));
        assertFalse(o.getBoolean("bl_ANNULE"));
    }

    @Test
    public void mouvementDAnnulationPorteSourceEtMotif() {
        JSONArray out = ReserveServiceImpl
                .lignesHistoriqueJson(Collections.singletonList(ligne("REASSORT", "MVT0", "Erreur de saisie", 0)));

        JSONObject o = out.getJSONObject(0);
        assertTrue(o.getBoolean("bl_EST_ANNULATION"));
        assertEquals("MVT0", o.getString("lg_MOUVEMENT_SOURCE_ID"));
        assertEquals("Erreur de saisie", o.getString("str_MOTIF_ANNULATION"));
    }

    @Test
    public void mouvementDefaitEstMarqueAnnule() {
        JSONArray out = ReserveServiceImpl
                .lignesHistoriqueJson(Collections.singletonList(ligne("ASSORT", null, null, 1)));

        JSONObject o = out.getJSONObject(0);
        assertTrue(o.getBoolean("bl_ANNULE"));
        assertFalse(o.getBoolean("bl_EST_ANNULATION"));
    }

    @Test
    public void valeursNullesRenduesNeutres() {
        Object[] r = new Object[] { null, null, null, null, null, null, null, null, null, null, null, null, null, 0 };
        JSONObject o = ReserveServiceImpl.lignesHistoriqueJson(Collections.singletonList(r)).getJSONObject(0);

        assertEquals("", o.getString("dt_CREATED"));
        assertEquals("", o.getString("str_USER"));
        assertEquals(0, o.getInt("int_QTE"));
        assertEquals("", o.getString("str_MOUVEMENT"));
    }
}
