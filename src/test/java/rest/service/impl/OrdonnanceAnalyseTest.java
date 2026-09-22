package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Retours du 22/09 : service ligne par ligne, etat de l'ordonnance et analyse (taux, satisfaction, ventilations).
 *
 * <p>
 * Satisfaction = part des lignes prescrites servies EN ENTIER, sur les lignes dont le service est renseigne. Les lignes
 * « a renseigner » ne comptent ni pour ni contre.
 */
public class OrdonnanceAnalyseTest {

    private static OrdonnanceAnalyse.Ordonnance ord(String statut, String client, String medecin, int lignes,
            int renseignees, int servies, int qte) {
        return new OrdonnanceAnalyse.Ordonnance(statut, client, medecin, "CHU", "CARNET", lignes, renseignees, servies,
                qte);
    }

    @Test
    public void etatDeServiceLigneParLigne() {
        assertEquals("a_renseigner", OrdonnanceClientSaisie.etatService(3, 0, 0, 0));
        assertEquals("servie", OrdonnanceClientSaisie.etatService(3, 3, 3, 6));
        assertEquals("partielle", OrdonnanceClientSaisie.etatService(3, 3, 1, 2));
        assertEquals("non_servie", OrdonnanceClientSaisie.etatService(3, 3, 0, 0));
        // Une ligne servie en partie seulement, les autres a renseigner : partielle, pas servie.
        assertEquals("partielle", OrdonnanceClientSaisie.etatService(2, 1, 0, 1));
        assertEquals("a_renseigner", OrdonnanceClientSaisie.etatService(0, 0, 0, 0));
    }

    @Test
    public void tauxEtSatisfaction() {
        List<OrdonnanceAnalyse.Ordonnance> l = Arrays.asList(ord("enable", "C1", "DR A", 2, 2, 2, 4),
                ord("enable", "C1", "DR A", 2, 2, 1, 1), ord("enable", "C2", "", 1, 0, 0, 0),
                ord("annulee", "C3", "DR B", 5, 5, 0, 0));
        JSONObject r = OrdonnanceAnalyse.analyser(l, new JSONArray());
        JSONObject s = r.getJSONObject("synthese");
        assertEquals(4, s.getInt("ordonnances"));
        assertEquals(3, s.getInt("clients"));
        assertEquals(1, s.getInt("annulees"));
        assertEquals(25.0, s.getDouble("tauxAnnulation"), 0.001);
        // L'annulee est ecartee : 5 lignes, 4 renseignees, 3 servies en entier.
        assertEquals(5, s.getInt("lignes"));
        assertEquals(4, s.getInt("lignesRenseignees"));
        assertEquals(1, s.getInt("lignesARenseigner"));
        assertEquals(75.0, s.getDouble("satisfaction"), 0.001);
        assertEquals(1, s.getInt("servies"));
        assertEquals(1, s.getInt("partielles"));
        assertEquals(1, s.getInt("aRenseigner"));
        // Taux de service : 1 servie sur 2 ordonnances renseignees.
        assertEquals(50.0, s.getDouble("tauxService"), 0.001);
    }

    @Test
    public void sansDonneeLeTauxEstAbsentEtNonNul() {
        JSONObject s = OrdonnanceAnalyse.analyser(Arrays.asList(ord("enable", "C1", "", 2, 0, 0, 0)), null)
                .getJSONObject("synthese");
        assertTrue(s.isNull("satisfaction"));
        assertTrue(s.isNull("tauxService"));
        assertEquals(0.0, s.getDouble("tauxAnnulation"), 0.001);
    }

    @Test
    public void ventilationParPrescripteurTrieeEtNonRenseigneCompte() {
        List<OrdonnanceAnalyse.Ordonnance> l = Arrays.asList(ord("enable", "C1", "DR B", 1, 1, 1, 1),
                ord("enable", "C2", "DR A", 1, 1, 0, 0), ord("enable", "C3", "DR A", 1, 1, 1, 1),
                ord("enable", "C4", null, 1, 0, 0, 0));
        JSONArray v = OrdonnanceAnalyse.analyser(l, null).getJSONArray("parPrescripteur");
        assertEquals(3, v.length());
        assertEquals("DR A", v.getJSONObject(0).getString("libelle"));
        assertEquals(2, v.getJSONObject(0).getInt("ordonnances"));
        assertEquals(50.0, v.getJSONObject(0).getDouble("part"), 0.001);
        assertEquals(50.0, v.getJSONObject(0).getDouble("satisfaction"), 0.001);
        assertEquals("DR B", v.getJSONObject(1).getString("libelle"));
        assertEquals("Non renseigné", v.getJSONObject(2).getString("libelle"));
    }

    @Test
    public void produitPrescrit() {
        JSONObject p = OrdonnanceAnalyse.produit("DOLIPRANE", 4, 8, 3, 2, 5);
        assertEquals(66.7, p.getDouble("satisfaction"), 0.001);
    }

    @Test
    public void quantiteServieControleeCoteServeur() {
        JSONObject o = new JSONObject().put("clientId", "C").put("dateOrdonnance", "2026-09-18").put("produits",
                new JSONArray().put(new JSONObject().put("libelle", "X").put("quantite", 2).put("qteServie", 3)));
        LocalDate jour = LocalDate.of(2026, 9, 22);
        assertFalse(OrdonnanceClientSaisie.valider(o, jour).isEmpty());
        o.getJSONArray("produits").getJSONObject(0).put("qteServie", 2);
        assertTrue(OrdonnanceClientSaisie.valider(o, jour).isEmpty());
        o.getJSONArray("produits").getJSONObject(0).put("qteServie", -1);
        assertFalse(OrdonnanceClientSaisie.valider(o, jour).isEmpty());
        // Vide = a renseigner : accepte, et lu comme null (distinct de 0).
        o.getJSONArray("produits").getJSONObject(0).put("qteServie", "");
        assertTrue(OrdonnanceClientSaisie.valider(o, jour).isEmpty());
        assertEquals(null, OrdonnanceClientSaisie.qteServie(o.getJSONArray("produits").getJSONObject(0)));
    }

    @Test
    public void contexteClinique() {
        JSONObject o = new JSONObject().put("clientId", "C").put("dateOrdonnance", "2026-09-18").put("produits",
                new JSONArray().put(new JSONObject().put("libelle", "X").put("quantite", 1)));
        LocalDate jour = LocalDate.of(2026, 9, 22);
        o.put("agePatient", 1980);
        assertFalse(OrdonnanceClientSaisie.valider(o, jour).isEmpty());
        o.put("agePatient", 45);
        assertTrue(OrdonnanceClientSaisie.valider(o, jour).isEmpty());
        o.put("agePatient", "");
        assertTrue(OrdonnanceClientSaisie.valider(o, jour).isEmpty());
        assertEquals("F", OrdonnanceClientSaisie.sexePatient(new JSONObject().put("sexePatient", "f")));
        assertEquals(null, OrdonnanceClientSaisie.sexePatient(new JSONObject().put("sexePatient", "X")));
    }

    @Test
    public void requetesDAnalyse() {
        OrdonnanceClientSql.Criteres c = new OrdonnanceClientSql.Criteres(null, null, "T1", null,
                LocalDate.of(2026, 1, 1), null, true);
        String sql = OrdonnanceClientSql.analyse(c);
        assertTrue(sql.contains(":typeClientId"));
        assertTrue(sql.contains(":debut"));
        assertFalse(sql.contains(":annulee"));
        assertTrue(OrdonnanceClientSql.analyseProduits(c).contains("o.str_STATUT <> 'annulee'"));
    }
}
