package rest.report;

import commonTasks.dto.ArticleAnalyseDTO;
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

/** L'edition de l'analyse article se compile et se remplit : quadrants nommes, couverture infinie, total. */
public class AnalyseArticleJrxmlTest {

    private static ArticleAnalyseDTO article(String id, int quadrant, long quantite, long montant, long achat,
            long stock, String classe) {
        ArticleAnalyseDTO a = new ArticleAnalyseDTO(id, "CIP" + id, "Produit " + id);
        a.setQuantite(quantite);
        a.setMontant(montant);
        a.setAchat(achat);
        a.setStock(stock);
        a.setJours(90);
        a.setClasse(classe);
        a.setQuadrant(quadrant);
        return a;
    }

    @Test
    public void seCompileEtSeRemplit() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/reports/analyse_article.jrxml")) {
            assertNotNull(in, "modele absent des ressources");
            JasperReport rapport = JasperCompileManager.compileReport(in);
            Map<String, Object> parametres = new HashMap<>();
            parametres.put("P_H_INSTITUTION", "PHARMACIE TEST");
            parametres.put("P_PRINTED_BY", "KGA3");
            parametres.put("P_PERIODE", "Du 01/04/2027 au 30/06/2027");
            parametres.put("P_SEUILS", "Seuils : taux de marge 30.0 %  -  rotation 2.53");
            parametres.put("P_RESUME", "Champions : 1 produit(s)\nProduits à risque : 1 produit(s)");
            List<ArticleAnalyseDTO> lignes = new ArrayList<>();
            lignes.add(article("P1", 1, 10, 10000, 5000, 2, "A"));
            lignes.add(article("P4", 4, 0, 0, 0, 50, "C"));
            JasperPrint impression = JasperFillManager.fillReport(rapport, parametres,
                    new JRBeanCollectionDataSource(lignes));
            assertEquals(1, impression.getPages().size());
            StringBuilder sb = new StringBuilder();
            impression.getPages().get(0).getElements().forEach(e -> ajouter(e, sb));
            String texte = sb.toString();
            assertTrue(texte.contains("ANALYSE ARTICLE - MARGE × ROTATION"), texte);
            assertTrue(texte.contains("Champions") && texte.contains("Produits à risque"), texte);
            assertTrue(texte.contains("Produit P1") && texte.contains("Produit P4"), texte);
            assertTrue(texte.contains("∞"), texte); // stock sans vente : couverture infinie
            assertTrue(texte.contains("TOTAL : 2 produit(s)"), texte);
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
