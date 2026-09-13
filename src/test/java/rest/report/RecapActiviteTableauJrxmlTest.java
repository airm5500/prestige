package rest.report;

import commonTasks.dto.AchatDTO;
import commonTasks.dto.Params;
import commonTasks.dto.RecapActiviteCreditDTO;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import rest.report.pdf.EditionRecapActivite;

/**
 * Le tableau des onglets du rapport d'activite (achats, credits, reglements TP) se compile et se remplit avec ses trois
 * jeux d'en-tetes ; les colonnes de texte absentes ne s'impriment pas et les montants sont totalises.
 */
public class RecapActiviteTableauJrxmlTest {

    private static JasperReport modele() throws Exception {
        try (InputStream in = RecapActiviteTableauJrxmlTest.class
                .getResourceAsStream("/reports/recap_activite_tableau.jrxml")) {
            return JasperCompileManager.compileReport(in);
        }
    }

    private static void textes(List<JRPrintElement> elements, List<String> sortie) {
        for (JRPrintElement e : elements) {
            if (e instanceof JRPrintText) {
                sortie.add(((JRPrintText) e).getFullText());
            } else if (e instanceof JRPrintFrame) {
                textes(((JRPrintFrame) e).getElements(), sortie);
            }
        }
    }

    private static List<String> remplir(Map<String, Object> p, List<EditionRecapActivite.Ligne> lignes)
            throws Exception {
        p.put("P_H_INSTITUTION", "PHARMACIE TEST");
        p.put("P_PRINTED_BY", "KGA3");
        p.put("P_PERIODE", "Période du 01/09/2026 au 12/09/2026");
        JasperPrint print = JasperFillManager.fillReport(modele(), p, new JRBeanCollectionDataSource(lignes));
        List<String> t = new ArrayList<>();
        textes(print.getPages().get(0).getElements(), t);
        // les separateurs de milliers dependent de la locale du poste : on compare sans eux
        List<String> sans = new ArrayList<>();
        for (String x : t) {
            sans.add(x == null ? "" : x.replace(",", "").replace(" ", "").replace("\u00a0", ""));
        }
        return sans;
    }

    @Test
    public void achatsUneColonneDeTexteEtTotaux() throws Exception {
        Map<String, Object> p = new HashMap<>();
        AchatDTO a = new AchatDTO();
        a.setLibelleGroupeGrossiste("LABOREX");
        a.setMontantHT(1000);
        a.setMontantTVA(180);
        a.setMontantTTC(1180);
        AchatDTO b = new AchatDTO();
        b.setLibelleGroupeGrossiste("COPHARMED");
        b.setMontantHT(500);
        b.setMontantTVA(90);
        b.setMontantTTC(590);
        List<String> t = remplir(p, EditionRecapActivite.lignesAchats(p, Arrays.asList(a, b)));
        assertTrue(t.contains("ACHATSPARGROUPEDEGROSSISTES"), t.toString());
        assertTrue(t.contains("LABOREX") && t.contains("COPHARMED"));
        assertTrue(t.contains("TOTAL:2ligne(s)"));
        assertTrue(t.contains("1500") && t.contains("270") && t.contains("1770"), t.toString());
        assertFalse(t.contains("Type"), "pas de deuxieme colonne de texte pour les achats");
    }

    @Test
    public void creditsDeuxColonnesDeTexte() throws Exception {
        Map<String, Object> p = new HashMap<>();
        List<String> t = remplir(p, EditionRecapActivite.lignesCredits(p,
                Arrays.asList(new RecapActiviteCreditDTO("MUGEFCI", "ASSURANCE", 25000, 3, 4))));
        assertTrue(t.contains("CRÉDITSACCORDÉS"));
        assertTrue(t.contains("MUGEFCI") && t.contains("ASSURANCE"));
        assertTrue(t.contains("Nb.bons") && t.contains("Nb.clients"));
        assertTrue(t.contains("25000"), t.toString());
    }

    @Test
    public void reglementsTroisColonnesDeTexteEtSansDonnees() throws Exception {
        Map<String, Object> p = new HashMap<>();
        Params r = new Params("F-2026-12", 3000, 5000, 2000);
        r.setDescription("CNPS");
        r.setRefTwo("F-2026-12");
        r.setRef("ASSURANCE");
        List<String> t = remplir(p, EditionRecapActivite.lignesReglements(p, Arrays.asList(r)));
        assertTrue(t.contains("RÈGLEMENTSDESTIERSPAYANTS"));
        assertTrue(t.contains("CNPS") && t.contains("F-2026-12") && t.contains("Facture"));
        assertTrue(t.contains("5000") && t.contains("3000") && t.contains("2000"), t.toString());

        Map<String, Object> vide = new HashMap<>();
        List<String> tv = remplir(vide, EditionRecapActivite.lignesReglements(vide, new ArrayList<>()));
        assertTrue(tv.contains("Aucunelignesurlapériode."), tv.toString());
        assertEquals("Période du 01/09/2026 au 12/09/2026",
                EditionRecapActivite.periode(java.time.LocalDate.of(2026, 9, 1), java.time.LocalDate.of(2026, 9, 12)));
    }
}
