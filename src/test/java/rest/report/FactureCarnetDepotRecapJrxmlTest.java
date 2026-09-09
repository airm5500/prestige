package rest.report;

import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.json.JSONObject;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import rest.service.dto.FactureCarnetDepotRecapLigneDTO;

/** Le modele du recapitulatif des factures de carnet depot se compile et se remplit (retour des tests du 09/09). */
public class FactureCarnetDepotRecapJrxmlTest {

    @Test
    public void seCompileEtSeRemplit() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/reports/facture_carnet_depot_recap.jrxml")) {
            assertNotNull(in, "modele absent des ressources");
            JasperReport rapport = JasperCompileManager.compileReport(in);
            Map<String, Object> parametres = new HashMap<>();
            parametres.put("P_H_INSTITUTION", "PHARMACIE TEST");
            parametres.put("P_PRINTED_BY", "KGA3");
            parametres.put("P_CRITERES", "Période du 01/06/2026 au 30/06/2026 - Carnet : CARNET E2E");
            List<FactureCarnetDepotRecapLigneDTO> lignes = List.of(
                    new FactureCarnetDepotRecapLigneDTO(new JSONObject().put("strCODEFACTURE", "F-001")
                            .put("periode", "06/2026").put("strFULLNAME", "CARNET E2E")
                            .put("dtDATEFACTURE", "30/06/2026").put("nbDossier", 3).put("dblMONTANTCMDE", 41000)),
                    new FactureCarnetDepotRecapLigneDTO(new JSONObject().put("strCODEFACTURE", "F-002")
                            .put("periode", "07/2026").put("strFULLNAME", "CARNET E2E")
                            .put("dtDATEFACTURE", "31/07/2026").put("nbDossier", 2).put("dblMONTANTCMDE", 9000)));
            JasperPrint impression = JasperFillManager.fillReport(rapport, parametres,
                    new JRBeanCollectionDataSource(lignes));
            assertEquals(1, impression.getPages().size());
            StringBuilder sb = new StringBuilder();
            impression.getPages().get(0).getElements().forEach(e -> ajouter(e, sb));
            String texte = sb.toString();
            assertTrue(texte.contains("RÉCAPITULATIF DES FACTURES DE CARNET DÉPÔT"), texte);
            assertTrue(texte.contains("F-001") && texte.contains("F-002"), texte);
            assertTrue(texte.contains("TOTAL GÉNÉRAL (2 facture(s), 5 bon(s))"), texte);
            assertTrue(texte.contains("50,000"), texte);
        }
    }

    private static void ajouter(net.sf.jasperreports.engine.JRPrintElement e, StringBuilder sb) {
        if (e instanceof net.sf.jasperreports.engine.JRPrintText) {
            sb.append(((net.sf.jasperreports.engine.JRPrintText) e).getFullText()).append('\n');
        } else if (e instanceof net.sf.jasperreports.engine.JRPrintFrame) {
            ((net.sf.jasperreports.engine.JRPrintFrame) e).getElements().forEach(x -> ajouter(x, sb));
        }
    }
}
