package rest.report;

import commonTasks.dto.GardeVendeurDTO;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

/** Retours des tests 3 : l'edition des vendeurs d'une garde se compile et se remplit (nom, part, total). */
public class GardeVendeursJrxmlTest {

    @Test
    public void seCompileEtSeRemplit() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/reports/garde_vendeurs.jrxml")) {
            assertNotNull(in, "modele absent des ressources");
            JasperReport rapport = JasperCompileManager.compileReport(in);
            Map<String, Object> parametres = new HashMap<>();
            parametres.put("P_H_INSTITUTION", "PHARMACIE TEST");
            parametres.put("P_PRINTED_BY", "KGA3");
            parametres.put("P_GARDE", "GARDE : nuit test");
            parametres.put("P_PERIODE", "Du 2027-03-05 20:00 au 2027-03-06 08:00");
            List<GardeVendeurDTO> vendeurs = new ArrayList<>();
            GardeVendeurDTO a = new GardeVendeurDTO("1", "16 - AUTRE");
            a.ajouter("V2", "C2", 4000, 2000);
            a.setPart(61.54);
            GardeVendeurDTO b = new GardeVendeurDTO("2", "12 - KGA3");
            b.ajouter("V1", "C1", 1000, 500);
            b.ajouter("V3", "C1", 1500, 750);
            b.setPart(38.46);
            vendeurs.add(a);
            vendeurs.add(b);
            JasperPrint impression = JasperFillManager.fillReport(rapport, parametres,
                    new JRBeanCollectionDataSource(vendeurs));
            assertEquals(1, impression.getPages().size());
            StringBuilder sb = new StringBuilder();
            impression.getPages().get(0).getElements().forEach(e -> ajouter(e, sb));
            String texte = sb.toString();
            assertTrue(texte.contains("VENDEURS DE LA GARDE"), texte);
            assertTrue(texte.contains("16 - AUTRE") && texte.contains("12 - KGA3"), texte);
            assertTrue(texte.contains("% du chiffre") && texte.contains("TOTAL"), texte);
            assertTrue(texte.replaceAll("[^0-9\\n]", "").contains("6500"), texte);
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
