package rest.service.impl;

import commonTasks.dto.BalanceDTO;
import commonTasks.dto.SummaryDTO;
import java.math.BigDecimal;
import java.util.List;
import org.json.JSONObject;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import rest.service.dto.BalanceVenteItemDTO;
import rest.service.dto.ModeReglementMontantDTO;
import util.Constant;
import util.DateConverter;

/**
 * La ventilation de la balance (retour du 09/09, point 4), verifiee a la main sur des montants choisis.
 */
public class VentilationBalanceTest {

    private static BalanceDTO ligne(String type, long ventes, long net) {
        BalanceDTO b = new BalanceDTO();
        b.setTypeVente(type);
        b.setNbreVente(ventes);
        b.setMontantNet(net);
        return b;
    }

    private static BalanceVenteItemDTO mouvement(String type, long nombre, long montant) {
        return BalanceVenteItemDTO.builder().typeMvtCaisse(type).nombre(nombre).montantTTC(BigDecimal.valueOf(montant))
                .build();
    }

    private JSONObject exemple() {
        SummaryDTO resume = new SummaryDTO();
        resume.setMontantNet(100000);
        resume.setMontantTp(20000);
        List<BalanceDTO> balances = List.of(ligne(Constant.VENTE_COMPTANT, 30, 75000),
                ligne(Constant.VENTE_ASSURANCE, 10, 25000));
        List<ModeReglementMontantDTO> modes = List.of(new ModeReglementMontantDTO("1", "Espèces", false, 60000),
                new ModeReglementMontantDTO("7", "ORANGE", true, 12000),
                new ModeReglementMontantDTO("10", "WAVE", true, 8000),
                new ModeReglementMontantDTO("3", "Carte bancaire", false, 5000));
        List<BalanceVenteItemDTO> mouvements = List.of(mouvement(DateConverter.MVT_ENTREE_CAISSE, 2, 3000),
                mouvement(DateConverter.MVT_SORTIE_CAISSE, 3, 1000), mouvement(DateConverter.MVT_REGLE_TP, 4, 15000),
                mouvement(DateConverter.MVT_FOND_CAISSE, 1, 50000));
        return VentilationBalance.construire(balances, resume, modes, mouvements);
    }

    @Test
    public void partsClientsEtVentes() {
        JSONObject v = exemple();
        assertEquals(40, v.getLong("totalVentes"));
        assertEquals(100000, v.getLong("chiffreAffaires"));
        assertEquals(75.0, v.getJSONObject("comptant").getDouble("partVentes"), 0.001);
        assertEquals(25.0, v.getJSONObject("credit").getDouble("partVentes"), 0.001);
        assertEquals(75.0, v.getJSONObject("comptant").getDouble("partMontant"), 0.001);
        assertEquals(25.0, v.getJSONObject("credit").getDouble("partMontant"), 0.001);
    }

    @Test
    public void modesEtMobile() {
        JSONObject v = exemple();
        // du plus encaisse au moins encaisse
        assertEquals("1", v.getJSONArray("modes").getJSONObject(0).getString("modeId"));
        assertEquals(60.0, v.getJSONObject("especes").getDouble("part"), 0.001);
        JSONObject mobile = v.getJSONObject("mobile");
        assertEquals(20000, mobile.getLong("montant"));
        assertEquals(20.0, mobile.getDouble("part"), 0.001);
        assertEquals(2, mobile.getJSONArray("operateurs").length());
        assertEquals("ORANGE", mobile.getJSONArray("operateurs").getJSONObject(0).getString("libelle"));
        assertEquals(12.0, mobile.getJSONArray("operateurs").getJSONObject(0).getDouble("part"), 0.001);
        assertEquals(20.0, v.getJSONObject("creditCa").getDouble("part"), 0.001);
    }

    @Test
    public void caisse() {
        JSONObject caisse = exemple().getJSONObject("caisse");
        assertEquals(5, caisse.getJSONObject("mouvements").getLong("nombre"));
        assertEquals(2000, caisse.getJSONObject("mouvements").getLong("montant"));
        assertEquals(4, caisse.getJSONObject("reglementsTp").getLong("nombre"));
        assertEquals(15000, caisse.getJSONObject("reglementsTp").getLong("montant"));
        assertEquals(10, caisse.getJSONObject("ventesCredit").getLong("nombre"));
        assertEquals(25000, caisse.getJSONObject("ventesCredit").getLong("montant"));
        assertEquals(50000, caisse.getJSONObject("fondCaisse").getLong("montant"));
    }

    @Test
    public void sansDonnees() {
        JSONObject v = VentilationBalance.construire(List.of(), null, null, null);
        assertEquals(0, v.getLong("totalVentes"));
        assertEquals(0.0, v.getJSONObject("comptant").getDouble("partVentes"), 0.001);
        assertTrue(v.getJSONArray("modes").isEmpty());
        assertEquals(0.0, VentilationBalance.pourcentage(5, 0), 0.001);
        assertEquals(33.3, VentilationBalance.pourcentage(1, 3), 0.001);
    }
}
