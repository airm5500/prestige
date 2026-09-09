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
import rest.service.dto.AnalyseBalanceLigneDTO;
import rest.service.dto.ModeParPeriodeDTO;

/**
 * Le modele de l'analyse comparative (retour du 09/09, point 4) se compile et se remplit, tableau croise compris.
 */
public class BalanceAnalyseComparativeJrxmlTest {

    private JasperPrint remplir(List<AnalyseBalanceLigneDTO> periodes, List<ModeParPeriodeDTO> cellules, int nbModes)
            throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/reports/balance_analyse_comparative.jrxml")) {
            assertNotNull(in, "modele absent des ressources");
            JasperReport rapport = JasperCompileManager.compileReport(in);
            Map<String, Object> parametres = new HashMap<>();
            parametres.put("P_H_INSTITUTION", "PHARMACIE TEST");
            parametres.put("P_PRINTED_BY", "KGA3");
            parametres.put("P_PERIODE", "3 derniers mois, du 01/06/2026 au 09/09/2026");
            parametres.put("P_COMPARATIF", Boolean.TRUE);
            parametres.put("P_MODES", new JRBeanCollectionDataSource(cellules));
            parametres.put("P_NB_MODES", nbModes);
            return JasperFillManager.fillReport(rapport, parametres, new JRBeanCollectionDataSource(periodes));
        }
    }

    @Test
    public void seCompileEtSeRemplit() throws Exception {
        AnalyseBalanceLigneDTO juin = new AnalyseBalanceLigneDTO(new JSONObject().put("libelle", "06/2026")
                .put("debut", "2026-06-01").put("fin", "2026-06-30").put("nbreVente", 120).put("montantNet", 500000)
                .put("montantEsp", 300000).put("montantMobilePayment", 150000));
        AnalyseBalanceLigneDTO juillet = new AnalyseBalanceLigneDTO(new JSONObject().put("libelle", "07/2026")
                .put("debut", "2026-07-01").put("fin", "2026-07-31").put("nbreVente", 100).put("montantNet", 450000)
                .put("ecart", -50000).put("ecartPourcentage", -10.0).put("enCours", true));
        List<ModeParPeriodeDTO> cellules = List.of(new ModeParPeriodeDTO("06/2026", 0, "Espèces", 0, 300000),
                new ModeParPeriodeDTO("06/2026", 0, "ORANGE", 1, 150000),
                new ModeParPeriodeDTO("07/2026 (en cours)", 1, "Espèces", 0, 400000),
                new ModeParPeriodeDTO("07/2026 (en cours)", 1, "ORANGE", 1, 0));
        JasperPrint impression = remplir(List.of(juin, juillet), cellules, 2);
        assertEquals(1, impression.getPages().size());
        String texte = texte(impression);
        assertTrue(texte.contains("ANALYSE COMPARATIVE BALANCE VENTE / CAISSE"), texte);
        assertTrue(texte.contains("07/2026 (en cours)"), texte);
        assertTrue(texte.contains("ORANGE"), "le tableau croise doit porter les colonnes des modes : " + texte);
        assertTrue(texte.contains("700"), "total du croise");
    }

    @Test
    public void sansAucuneDonnee() throws Exception {
        JasperPrint impression = remplir(List.of(), List.of(), 0);
        assertEquals(1, impression.getPages().size());
    }

    /** Tout le texte imprime, cadres et tableau croise compris (leurs textes sont imbriques). */
    private static String texte(JasperPrint impression) {
        StringBuilder sb = new StringBuilder();
        impression.getPages().forEach(page -> ajouter(page.getElements(), sb));
        return sb.toString();
    }

    private static void ajouter(java.util.Collection<net.sf.jasperreports.engine.JRPrintElement> elements,
            StringBuilder sb) {
        for (net.sf.jasperreports.engine.JRPrintElement e : elements) {
            if (e instanceof net.sf.jasperreports.engine.JRPrintText) {
                sb.append(((net.sf.jasperreports.engine.JRPrintText) e).getFullText()).append('\n');
            } else if (e instanceof net.sf.jasperreports.engine.JRPrintFrame) {
                ajouter(((net.sf.jasperreports.engine.JRPrintFrame) e).getElements(), sb);
            }
        }
    }
}
