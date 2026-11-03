package rest.report;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import commonTasks.dto.OrdonnancierLigneDTO;
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
import org.junit.jupiter.api.Test;

/**
 * L'edition du registre de l'ordonnancier se compile et se remplit, avec la colonne « Motif » (cas 3 du 03/11/2026).
 *
 * <p>
 * Le test lit le modele embarque dans le war (src/main/resources/reports). Sur un poste, un modele plus ancien range
 * dans le dossier REPORTS de l'officine passe devant lui : c'est ce modele-la qu'il faut remplacer au deploiement.
 * </p>
 */
public class OrdonnancierJrxmlTest {

    private static OrdonnancierLigneDTO ligne(String produit, String tableau, String motif) {
        OrdonnancierLigneDTO l = new OrdonnancierLigneDTO();
        l.setDate("03/11/2026");
        l.setHeure("16:23");
        l.setReference("261103_00008");
        l.setClient("CLIENT ESSAI");
        l.setMedecin("DOCTEUR ESSAI");
        l.setNumeroOrdre("9002");
        l.setCip("0203253");
        l.setProduit(produit);
        l.setCodeTableau(tableau);
        l.setMotif(motif);
        l.setQuantite(1);
        l.setMontant(1500);
        l.setVendeur("E2E");
        return l;
    }

    @Test
    public void seCompileEtPorteLeMotif() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/reports/ordonnancier.jrxml")) {
            assertNotNull(in, "modele absent des ressources");
            JasperReport rapport = JasperCompileManager.compileReport(in);
            Map<String, Object> parametres = new HashMap<>();
            parametres.put("P_H_INSTITUTION", "PHARMACIE TEST");
            parametres.put("P_PRINTED_BY", "E2E");
            parametres.put("P_PERIODE", "Du 2026-11-03 au 2026-11-03");
            List<OrdonnancierLigneDTO> lignes = new ArrayList<>();
            lignes.add(ligne("PRODUIT SENSIBLE", "", "Sensible"));
            lignes.add(ligne("PRODUIT TABLEAU A", "A", "Ordonnancier"));
            JasperPrint impression = JasperFillManager.fillReport(rapport, parametres,
                    new JRBeanCollectionDataSource(lignes));
            assertEquals(1, impression.getPages().size());
            StringBuilder sb = new StringBuilder();
            impression.getPages().get(0).getElements().forEach(e -> ajouter(e, sb));
            String texte = sb.toString();
            assertTrue(texte.contains("Motif"), "en-tete Motif attendu : " + texte);
            assertTrue(texte.contains("Sensible"), "motif Sensible attendu : " + texte);
            assertTrue(texte.contains("Ordonnancier"), "motif Ordonnancier attendu : " + texte);
            assertTrue(texte.contains("PRODUIT SENSIBLE") && texte.contains("PRODUIT TABLEAU A"), texte);
            assertTrue(texte.contains("Tabl."), "la colonne Tableau est conservee : " + texte);
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
