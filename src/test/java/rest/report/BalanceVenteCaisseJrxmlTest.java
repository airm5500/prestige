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
import org.json.JSONArray;
import org.json.JSONObject;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import rest.service.dto.BalanceEditionLigneDTO;
import rest.service.impl.EditionBalance;

/** La nouvelle edition de la balance (retour des tests du 09/09) : lignes depuis le JSON de l'ecran, modele rempli. */
public class BalanceVenteCaisseJrxmlTest {

    private static JSONObject vue() {
        JSONObject ventilation = new JSONObject()
                .put("comptant",
                        new JSONObject().put("ventes", 3).put("partVentes", 60.0).put("montant", 23000)
                                .put("partMontant", 43.4))
                .put("credit",
                        new JSONObject().put("ventes", 2).put("partVentes", 40.0).put("montant", 30000)
                                .put("partMontant", 56.6))
                .put("totalVentes", 5).put("chiffreAffaires", 53000)
                .put("especes",
                        new JSONObject().put("montant", 22000).put("part", 41.5).put("ventes", 4).put("partVentes",
                                80.0))
                .put("mobile", new JSONObject().put("montant", 9000).put("part", 17.0).put("ventes", 2)
                        .put("partVentes", 40.0).put("operateurs",
                                new JSONArray().put(new JSONObject().put("libelle", "WAVE").put("montant", 5000)
                                        .put("part", 9.4).put("ventes", 1).put("partVentes", 20.0))))
                .put("modes", new JSONArray()).put("creditCa", new JSONObject().put("montant", 22000).put("part", 41.5))
                .put("caisse",
                        new JSONObject().put("mouvements", new JSONObject().put("nombre", 3).put("montant", 2500))
                                .put("entrees", new JSONObject().put("nombre", 2).put("montant", 3000))
                                .put("sorties", new JSONObject().put("nombre", 1).put("montant", 500))
                                .put("reglementsTp", new JSONObject().put("nombre", 1).put("montant", 12000))
                                .put("reglementsDifferes", new JSONObject().put("nombre", 0).put("montant", 0))
                                .put("ventesCredit", new JSONObject().put("nombre", 2).put("montant", 30000)))
                .put("tva", new JSONArray().put(new JSONObject().put("taux", 0).put("montantHt", 53000)
                        .put("montantTva", 0).put("montantTtc", 53000).put("part", 100.0)));
        return new JSONObject()
                .put("data", new JSONArray()
                        .put(new JSONObject().put("typeVente", "VNO").put("nbreVente", 3).put("montantTTC", 23000)
                                .put("montantNet", 23000).put("montantEsp", 14000).put("montantMobilePayment", 9000))
                        .put(new JSONObject().put("typeVente", "VO").put("nbreVente", 2).put("montantTTC", 30000)
                                .put("montantNet", 30000).put("montantEsp", 8000)))
                .put("metaData",
                        new JSONObject().put("nbreVente", 5).put("montantTTC", 53000).put("montantNet", 53000)
                                .put("montantEsp", 22000).put("montantSortie", 500).put("ratioVA", 1.2))
                .put("ventilation", ventilation);
    }

    @Test
    public void lignesDepuisLeJson() {
        List<BalanceEditionLigneDTO> lignes = EditionBalance.lignes(vue());
        assertEquals("COMPTANT", lignes.get(0).getLibelle());
        assertEquals("3", lignes.get(0).getC1());
        assertEquals("23 000", lignes.get(0).getC2());
        assertTrue(lignes.stream().anyMatch(l -> l.getSection().equals(EditionBalance.S_PART)
                && l.getLibelle().trim().equals("WAVE") && l.isSecondaire()));
        assertTrue(lignes.stream().anyMatch(l -> l.getSection().equals(EditionBalance.S_TVA)
                && l.getLibelle().equals("0 %") && l.getC4().equals("100,0 %")));
        assertEquals("53 000", EditionBalance.n(53000));
        assertEquals("41,5 %", EditionBalance.p(41.5));
    }

    @Test
    public void seCompileEtSeRemplit() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/reports/balance_vente_caisse.jrxml")) {
            assertNotNull(in, "modele absent des ressources");
            JasperReport rapport = JasperCompileManager.compileReport(in);
            Map<String, Object> parametres = new HashMap<>();
            parametres.put("P_H_INSTITUTION", "PHARMACIE TEST");
            parametres.put("P_PRINTED_BY", "KGA3");
            parametres.put("P_PERIODE", "Du 01/05/2025 au 30/06/2025");
            parametres.put("P_ENTETES", EditionBalance.entetes());
            JasperPrint impression = JasperFillManager.fillReport(rapport, parametres,
                    new JRBeanCollectionDataSource(EditionBalance.lignes(vue())));
            assertEquals(1, impression.getPages().size());
            StringBuilder sb = new StringBuilder();
            impression.getPages().get(0).getElements().forEach(e -> ajouter(e, sb));
            String texte = sb.toString();
            assertTrue(texte.contains("BALANCE VENTE / CAISSE"), texte);
            assertTrue(texte.contains("CLIENTS ET VENTES") && texte.contains("RÉPARTITION PAR TAUX DE TVA"), texte);
            assertTrue(texte.contains("COMPTANT") && texte.contains("CRÉDIT") && texte.contains("WAVE"), texte);
            assertTrue(texte.contains("Part tiers payant (sur ventes à crédit)"), texte);
            assertTrue(texte.contains("% du CA"), texte);
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
