package rest.report;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import net.sf.jasperreports.engine.JRPrintElement;
import net.sf.jasperreports.engine.JRPrintFrame;
import net.sf.jasperreports.engine.JRPrintText;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import rest.report.pdf.EditionMouvementsCaisse;
import rest.service.dto.MvtCaisseDTO;
import rest.service.dto.MvtCaisseModeDTO;
import rest.service.dto.MvtCaisseSummaryDTO;

/**
 * La nouvelle liste des mouvements de caisse (retours du 12/09, point 3) se compile et se remplit : groupes par type
 * avec sous-total, date du mouvement saisie distincte de la date de creation, total general, modes de reglement.
 */
public class MouvementsCaisseJrxmlTest {

    private static MvtCaisseDTO mouvement(String type, String dateMouvement, String creeLe, long montant,
            String commentaire) {
        return MvtCaisseDTO.builder().typeMvtCaisse(type).dateMouvement(dateMouvement).dateOpreration(creeLe)
                .heureOpreration("10:15:00").tiket("T-1").numCompte("531").modeReglement("ESPECES").userAbrName("K.GUY")
                .montant(montant).commentaire(commentaire).build();
    }

    @Test
    public void seCompileEtSeRemplit() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/reports/mouvements_caisse.jrxml")) {
            assertNotNull(in, "modele absent des ressources");
            JasperReport rapport = JasperCompileManager.compileReport(in);
            Map<String, Object> parametres = new HashMap<>();
            parametres.put("P_H_INSTITUTION", "PHARMACIE TEST");
            parametres.put("P_PRINTED_BY", "KGA3");
            parametres.put("P_PERIODE", "Du 01/09/2026 au 12/09/2026");
            parametres.put("P_FILTRES", EditionMouvementsCaisse.filtresLisibles("", "", false));
            MvtCaisseSummaryDTO resume = MvtCaisseSummaryDTO.builder().build();
            resume.getModes().add(MvtCaisseModeDTO.builder().modeReglement("ESPECES").montant(3500).build());
            parametres.put("P_MODES", EditionMouvementsCaisse.modesLisibles(resume));
            List<MvtCaisseDTO> lignes = new ArrayList<>();
            lignes.add(mouvement("Entrée de caisse", "05/09/2026", "12/09/2026", 3000, "Apport"));
            lignes.add(mouvement("Sortie de caisse", null, "12/09/2026", 500, "Achat de fournitures"));
            lignes.add(mouvement("Entrée de caisse", "06/09/2026", "12/09/2026", 1000, ""));
            JasperPrint impression = JasperFillManager.fillReport(rapport, parametres,
                    new JRBeanCollectionDataSource(lignes));
            assertEquals(1, impression.getPages().size());
            StringBuilder sb = new StringBuilder();
            impression.getPages().get(0).getElements().forEach(e -> ajouter(e, sb));
            String texte = sb.toString();
            assertTrue(texte.contains("LISTE DES MOUVEMENTS DE CAISSE"), texte);
            assertTrue(texte.contains("ENTRÉE DE CAISSE") && texte.contains("SORTIE DE CAISSE"), texte);
            assertTrue(texte.contains("05/09/2026") && texte.contains("12/09/2026 10:15:00"), texte);
            assertTrue(texte.contains("Sous-total Entrée de caisse : 2 mouvement(s)"), texte);
            assertTrue(texte.contains("TOTAL GÉNÉRAL : 3 mouvement(s)"), texte);
            assertTrue(texte.contains("Par mode de règlement : ESPECES : 3"), texte);
            assertTrue(texte.contains("Mouvements non contrôlés"), texte);
        }
    }

    private static void ajouter(JRPrintElement e, StringBuilder sb) {
        if (e instanceof JRPrintText) {
            sb.append(((JRPrintText) e).getFullText()).append('\n');
        } else if (e instanceof JRPrintFrame) {
            ((JRPrintFrame) e).getElements().forEach(x -> ajouter(x, sb));
        }
    }
}
