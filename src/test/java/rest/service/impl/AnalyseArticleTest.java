package rest.service.impl;

import commonTasks.dto.ArticleAnalyseDTO;
import commonTasks.dto.GardeVenteLigneDTO;
import commonTasks.dto.PaireArticleDTO;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

/** Analyse article : agregation, medianes, quadrants, resume, filtres et paires, sans base de donnees. */
public class AnalyseArticleTest {

    private static GardeVenteLigneDTO ligne(String vente, String produit, long quantite, long montant,
            long achatUnitaire) {
        // TVA 0 et remise 0 : la marge vaut montant - achat, le taux se lit directement.
        GardeVenteLigneDTO l = new GardeVenteLigneDTO(vente, produit, "CIP" + produit, "Produit " + produit,
                LocalDateTime.of(2027, 4, 10, 10, 0), quantite, montant, 0, 0, achatUnitaire);
        l.setRattachements("F" + produit, "R1", "G1");
        return l;
    }

    /** Quatre produits taillés pour tomber chacun dans un quadrant, avec les medianes comme seuils. */
    private static List<ArticleAnalyseDTO> quatreProduits() {
        List<GardeVenteLigneDTO> lignes = Arrays.asList(
                // P1 : 10 vendus a 1 000 (achat 500) -> marge 50 % ; stock 2 -> rotation 5
                ligne("V1", "P1", 10, 10000, 500),
                // P2 : 1 vendu a 1 000 (achat 400) -> marge 60 % ; stock 20 -> rotation 0.05
                ligne("V2", "P2", 1, 1000, 400),
                // P3 : 8 vendus a 1 000 (achat 950) -> marge 5 % ; stock 1 -> rotation 8
                ligne("V3", "P3", 8, 8000, 950),
                // P4 : 1 vendu a 1 000 (achat 900) -> marge 10 % ; stock 50 -> rotation 0.02
                ligne("V4", "P4", 1, 1000, 900));
        List<ArticleAnalyseDTO> articles = AnalyseArticle.agreger(lignes, 90);
        long[] stocks = { 2, 20, 1, 50 };
        for (int i = 0; i < articles.size(); i++) {
            articles.get(i).setStock(stocks[i]);
        }
        AnalyseArticle.classerAbc(articles, lignes, 80, 95);
        return articles;
    }

    @Test
    public void agregeParProduitEtCompteLesTickets() {
        List<GardeVenteLigneDTO> lignes = Arrays.asList(ligne("V1", "P1", 2, 2000, 500),
                ligne("V1", "P1", 3, 3000, 500), ligne("V2", "P1", 1, 1000, 500), ligne("V2", "P2", 1, 500, 100));
        List<ArticleAnalyseDTO> articles = AnalyseArticle.agreger(lignes, 30);
        assertEquals(2, articles.size());
        ArticleAnalyseDTO p1 = articles.get(0);
        assertEquals(6, p1.getQuantite());
        assertEquals(2, p1.getTickets());
        assertEquals(6000, p1.getMontant());
        assertEquals(3000, p1.getAchat());
        assertEquals(3000, p1.getMarge());
        assertEquals(50.0, p1.getTauxMarge());
        assertEquals(30, p1.getJours());
    }

    @Test
    public void rotationEtCouvertureSuiventLeStockActuel() {
        ArticleAnalyseDTO a = new ArticleAnalyseDTO("P", "C", "L");
        a.setQuantite(30);
        a.setJours(90);
        a.setAchat(3000);
        a.setStock(10);
        assertEquals(3.0, a.getRotation());
        assertEquals(30.0, a.getCouverture()); // 10 en stock, 30 vendus en 90 jours : 30 jours
        assertEquals(1000, a.getValeurStock()); // 10 x 100 de prix d'achat moyen
        a.setStock(0);
        assertEquals(30.0, a.getRotation()); // epuise : la quantite vendue tient lieu de rotation
        assertEquals(0.0, a.getCouverture());
        a.setStock(5);
        a.setQuantite(0);
        assertEquals(0.0, a.getRotation());
        assertEquals(-1.0, a.getCouverture()); // du stock, aucune vente : couverture infinie
    }

    @Test
    public void lesMedianesPartagentLAssortimentEnDeux() {
        List<ArticleAnalyseDTO> articles = quatreProduits();
        // taux : 50, 60, 5, 10 -> mediane (10 + 50) / 2 = 30 ; rotations : 5, 0.05, 8, 0.02 -> (0.05 + 5) / 2 = 2.53
        assertEquals(30.0, AnalyseArticle.medianeMarge(articles));
        assertEquals(2.53, AnalyseArticle.medianeRotation(articles));
        assertEquals(0.0, AnalyseArticle.mediane(new ArrayList<>()));
        assertEquals(7.0, AnalyseArticle.mediane(Arrays.asList(9.0, 7.0, 1.0)));
    }

    @Test
    public void chaqueProduitTombeDansSonQuadrantAvecSaDecision() {
        List<ArticleAnalyseDTO> articles = quatreProduits();
        AnalyseArticle.affecterQuadrants(articles, 30, 2.53);
        assertEquals(1, articles.get(0).getQuadrant()); // marge 50 >= 30, rotation 5 >= 2.53 : champion
        assertEquals(2, articles.get(1).getQuadrant()); // marge 60, rotation 0.05 : rentable mais lent
        assertEquals(3, articles.get(2).getQuadrant()); // marge 5, rotation 8 : volume fort peu rentable
        assertEquals(4, articles.get(3).getQuadrant()); // marge 10, rotation 0.02 : a risque
        assertEquals("Champions", AnalyseArticle.libelleQuadrant(1));
        assertTrue(AnalyseArticle.decisionQuadrant(4).contains("déréférencement"));
        assertTrue(AnalyseArticle.decisionQuadrant(3).contains("prix d'achat"));
        assertEquals("", AnalyseArticle.libelleQuadrant(0));
        // la classe ABC vit a cote du quadrant, lue sur le cumul ATTEINT AVANT la ligne (regle de l application) :
        // P1 (cumul avant 0 %) et P3 (cumul avant 50 %) sont en A, P2 (90 %) en B, P4 (95 %) en C
        assertEquals("A", articles.get(0).getClasse());
        assertEquals("A", articles.get(2).getClasse());
        assertEquals("B", articles.get(1).getClasse());
        assertEquals("C", articles.get(3).getClasse());
    }

    @Test
    public void leResumeCumuleParQuadrantEtLeFiltreIsole() {
        List<ArticleAnalyseDTO> articles = quatreProduits();
        AnalyseArticle.affecterQuadrants(articles, 30, 2.53);
        JSONArray resume = AnalyseArticle.resume(articles);
        assertEquals(4, resume.length());
        JSONObject champions = resume.getJSONObject(0);
        assertEquals(1, champions.getInt("quadrant"));
        assertEquals(1, champions.getLong("produits"));
        assertEquals(10000, champions.getLong("montant"));
        assertEquals(5000, champions.getLong("marge"));
        assertEquals(1000, champions.getLong("valeurStock")); // stock 2 x achat moyen 500
        assertEquals(50.0, champions.getDouble("partCa")); // 10 000 sur 20 000
        assertEquals(1, AnalyseArticle.filtrer(articles, 3, "", "", "", "").size());
        assertEquals("P3", AnalyseArticle.filtrer(articles, 3, "", "", "", "").get(0).getProduitId());
        assertEquals(4, AnalyseArticle.filtrer(articles, 0, "", "R1", "", "").size());
        assertEquals(1, AnalyseArticle.filtrer(articles, 0, "FP2", "", "", "").size());
        assertEquals(1, AnalyseArticle.filtrer(articles, 0, "", "", "", "cipp4").size());
        assertEquals(0, AnalyseArticle.filtrer(articles, 0, "", "", "G9", "").size());
        AnalyseArticle.trier(articles);
        assertEquals("P1", articles.get(0).getProduitId());
        assertEquals("P4", articles.get(3).getProduitId());
        JSONObject json = AnalyseArticle.json(articles.get(0));
        assertEquals("Champions", json.getString("quadrantLibelle"));
        assertEquals(5.0, json.getDouble("rotation"));
    }

    @Test
    public void lesPairesPortentLaPartDesTicketsDeChaqueProduit() {
        List<ArticleAnalyseDTO> articles = AnalyseArticle.agreger(Arrays.asList(ligne("V1", "P1", 1, 100, 10),
                ligne("V2", "P1", 1, 100, 10), ligne("V3", "P1", 1, 100, 10), ligne("V4", "P1", 1, 100, 10),
                ligne("V1", "P2", 1, 100, 10), ligne("V2", "P2", 1, 100, 10)), 30);
        PaireArticleDTO paire = new PaireArticleDTO("P1", "CIPP1", "Produit P1", "P2", "CIPP2", "Produit P2", 2);
        List<PaireArticleDTO> paires = new ArrayList<>();
        paires.add(paire);
        AnalyseArticle.completerPaires(paires, articles);
        assertEquals(4, paire.getTickets1());
        assertEquals(2, paire.getTickets2());
        assertEquals(50.0, paire.getPart1()); // 2 tickets communs sur 4 tickets de P1
        assertEquals(100.0, paire.getPart2());
        assertEquals(50.0, AnalyseArticle.json(paire).getDouble("part1"));
    }
}
