package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import rest.service.impl.CouvertureEquivalentsDci.Ligne;
import rest.service.impl.CouvertureEquivalentsDci.Produit;
import rest.service.impl.CouvertureEquivalentsDci.Resultat;

/**
 * Plan d'octobre, 1.1 : « quantite couverte = min(qte suggeree, somme des stocks des substituts directs) ; les a
 * adapter sont affiches mais ne comptent jamais ».
 */
public class CouvertureEquivalentsDciTest {

    private static Produit p(String id, String nom, String cle, int stock, int prix, String derniereVente) {
        Produit x = new Produit(id, nom);
        x.cle = cle;
        x.stock = stock;
        x.prix = prix;
        x.derniereVente = derniereVente;
        return x;
    }

    private static Map<String, List<Produit>> cand(Produit... ps) {
        Map<String, List<Produit>> m = new HashMap<>();
        for (Produit x : ps) {
            m.computeIfAbsent(x.cle, k -> new java.util.ArrayList<>()).add(x);
        }
        return m;
    }

    @Test
    public void quantiteCouverteEtOrdre() {
        Produit sugg = p("S", "AMOXICILLINE ARROW 500MG GELULE B/12", "D1", 0, 1500, null);
        Produit a = p("A", "AMOXICILLINE BIOGARAN 500MG GELULE B/12", "D1", 4, 1400, "2026-09-01 10:00:00");
        Produit b = p("B", "AMOXICILLINE MYLAN 500MG GELULE B/12", "D1", 4, 1300, "2026-10-01 10:00:00");
        Produit c = p("C", "AMOXICILLINE SANDOZ 1G CPR B/14", "D1", 50, 2500, null);
        List<Resultat> r = CouvertureEquivalentsDci.calculer(List.of(new Ligne("L1", sugg, 10, 1500)),
                cand(sugg, a, b, c), Set.of("S"));
        assertEquals(1, r.size());
        Resultat x = r.get(0);
        assertEquals(3, x.substituts.size());
        // directs d'abord, a stock egal la vente la plus recente d'abord ; le 1G est a adapter, en dernier
        assertEquals("B", x.substituts.get(0).produit.id);
        assertEquals("A", x.substituts.get(1).produit.id);
        assertEquals(SubstitutionArticle.ADAPTER, x.substituts.get(2).niveau);
        // 4 + 4 directs, le 1G (50 en stock) ne compte pas
        assertEquals(8, x.couverte);
        assertEquals(2, x.reste());
    }

    @Test
    public void couvertureBorneeParLaQuantiteSuggeree() {
        Produit sugg = p("S", "PARACETAMOL X 500MG CPR B/16", "D2", 0, 500, null);
        Produit a = p("A", "PARACETAMOL Y 500MG CPR B/16", "D2", 30, 450, null);
        Resultat x = CouvertureEquivalentsDci
                .calculer(List.of(new Ligne("L1", sugg, 6, 400)), cand(sugg, a), Set.of("S")).get(0);
        assertEquals(6, x.couverte);
        assertEquals(0, x.reste());
        assertEquals(6, x.substituts.get(0).utilise);
    }

    @Test
    public void unSubstitutPartageNEstPasCompteDeuxFois() {
        Produit s1 = p("S1", "PARACETAMOL X 500MG CPR B/16", "D2", 0, 500, null);
        Produit s2 = p("S2", "PARACETAMOL Z 500MG CPR B/16", "D2", 0, 500, null);
        Produit a = p("A", "PARACETAMOL Y 500MG CPR B/16", "D2", 5, 450, null);
        List<Resultat> r = CouvertureEquivalentsDci.calculer(
                List.of(new Ligne("L1", s1, 4, 400), new Ligne("L2", s2, 4, 400)), cand(s1, s2, a), Set.of("S1", "S2"));
        assertEquals(4, r.get(0).couverte);
        assertEquals(1, r.get(1).couverte);
    }

    @Test
    public void produitDeLaSuggestionDeconditionneOuSansStockNeCouvrentPas() {
        Produit s1 = p("S1", "PARACETAMOL X 500MG CPR B/16", "D2", 0, 500, null);
        Produit s2 = p("S2", "PARACETAMOL Z 500MG CPR B/16", "D2", 9, 500, null);
        Produit det = p("D", "PARACETAMOL W 500MG CPR B/16", "D2", 40, 50, null);
        det.detail = true;
        Produit vide = p("V", "PARACETAMOL V 500MG CPR B/16", "D2", 0, 400, null);
        Resultat x = CouvertureEquivalentsDci
                .calculer(List.of(new Ligne("L1", s1, 4, 400)), cand(s1, s2, det, vide), Set.of("S1", "S2")).get(0);
        assertEquals(0, x.couverte);
        assertEquals(2, x.substituts.size(), "le produit sans stock n'est pas propose");
        assertTrue(x.substituts.stream().allMatch(s -> !s.compte()));
    }

    @Test
    public void sansDciOuSansSubstitutAucuneEntree() {
        Produit s = p("S", "PRODUIT SANS DCI", null, 0, 500, null);
        Produit t = p("T", "AUTRE 10MG CPR", "D9", 0, 500, null);
        assertTrue(CouvertureEquivalentsDci
                .calculer(List.of(new Ligne("L1", s, 4, 0), new Ligne("L2", t, 4, 0)), cand(t), Set.of("S", "T"))
                .isEmpty());
    }
}
