package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import rest.service.impl.SuiviEquivalence.Criteres;
import rest.service.impl.SuiviEquivalence.Groupe;
import rest.service.impl.SuiviEquivalence.Produit;

/** Plan d'octobre, section 9 : groupes par ensemble exact de DCI, classement, repere « à ne plus commander ». */
public class SuiviEquivalenceTest {

    private static Produit p(String id, String nom, String cle, long qte, long ca, long stock) {
        Produit x = new Produit(id, nom);
        x.cle = cle;
        x.dci = cle.equals("D1") ? "AMOXICILLINE" : "PARACETAMOL";
        x.quantite = qte;
        x.montant = ca;
        x.stock = stock;
        x.prixAchat = 100;
        return x;
    }

    private static List<Produit> jeu() {
        List<Produit> l = new ArrayList<>();
        l.add(p("A", "AMOXICILLINE ARROW 500MG GELULE B/12", "D1", 50, 75000, 10));
        l.add(p("B", "AMOXICILLINE BIOGARAN 500MG GELULE B/12", "D1", 4, 6000, 20));
        l.add(p("C", "AMOXICILLINE MYLAN 1G CPR B/6", "D1", 2, 4000, 5));
        l.add(p("D", "AMOXICILLINE SANDOZ 500MG GELULE B/12", "D1", 30, 45000, 0));
        l.add(p("E", "PARACETAMOL ARROW 500MG CPR B/16", "D2", 10, 5000, 3));
        l.add(p("F", "PARACETAMOL BIOGARAN 500MG CPR B/16", "D2", 9, 4500, 3));
        l.add(p("G", "IBUPROFENE SEUL 400MG CPR B/20", "D3", 7, 3000, 2));
        return l;
    }

    @Test
    public void classementEtMeneur() {
        List<Groupe> g = SuiviEquivalence.calculer(jeu(), new Criteres());
        assertEquals(2, g.size(), "le produit seul dans son groupe n'est pas montre");
        Groupe amox = g.get(0);
        assertEquals("D1", amox.cle, "le groupe avec un candidat passe en tete");
        assertEquals(List.of("A", "D", "B", "C"),
                amox.produits.stream().map(x -> x.id).collect(java.util.stream.Collectors.toList()));
        assertEquals(SuiviEquivalence.MENEUR, amox.produits.get(0).equivalence);
        assertEquals(1, amox.produits.get(0).rang);
        assertEquals(86L, amox.quantite);
        assertEquals(58.1, amox.produits.get(0).part, 0.001);
    }

    @Test
    public void repereDoublonDirectSeulement() {
        Groupe amox = SuiviEquivalence.calculer(jeu(), new Criteres()).get(0);
        Produit b = amox.produits.stream().filter(x -> x.id.equals("B")).findFirst().get();
        Produit c = amox.produits.stream().filter(x -> x.id.equals("C")).findFirst().get();
        Produit d = amox.produits.stream().filter(x -> x.id.equals("D")).findFirst().get();
        assertTrue(b.candidat, "direct, 4 vendus contre 50 (8 %) : candidat");
        assertTrue(b.raison.contains("candidat à ne plus commander"), b.raison);
        assertEquals(SubstitutionArticle.ADAPTER, c.equivalence, "1 g comprime : autre dosage, autre forme");
        assertFalse(c.candidat, "un produit a adapter n'est jamais un doublon");
        assertFalse(d.candidat, "30 vendus contre 50 : au-dessus du seuil");
        assertEquals(1, amox.candidats);
    }

    @Test
    public void seuilEtFiltres() {
        Criteres c = new Criteres();
        c.seuil = 95;
        Groupe para = SuiviEquivalence.calculer(jeu(), c).stream().filter(x -> x.cle.equals("D2")).findFirst().get();
        assertTrue(para.produits.get(1).candidat, "9 contre 10 (90 %) sous un seuil de 95 %");

        Criteres seul = new Criteres();
        seul.seulementCandidats = true;
        assertEquals(1, SuiviEquivalence.calculer(jeu(), seul).size());

        Criteres dci = new Criteres();
        dci.dci = "paracétamol";
        List<Groupe> g = SuiviEquivalence.calculer(jeu(), dci);
        assertEquals(1, g.size());
        assertEquals("D2", g.get(0).cle);

        Criteres stock = new Criteres();
        stock.stockPositif = true;
        Groupe amox = SuiviEquivalence.calculer(jeu(), stock).get(0);
        assertFalse(amox.produits.stream().anyMatch(x -> x.id.equals("D")), "stock 0 retire");

        Criteres trois = new Criteres();
        trois.minProduits = 3;
        assertEquals(1, SuiviEquivalence.calculer(jeu(), trois).size());
    }

    @Test
    public void couverture() {
        Produit x = p("X", "X", "D1", 0, 0, 5);
        assertEquals(-1, SuiviEquivalence.couverture(x, 90), 0.001);
        x.quantite = 30;
        assertEquals(15, SuiviEquivalence.couverture(x, 90), 0.001);
        x.stock = 0;
        assertEquals(0, SuiviEquivalence.couverture(x, 90), 0.001);
    }

    @Test
    public void meneurSansVenteAucunCandidat() {
        List<Produit> l = new ArrayList<>();
        l.add(p("A", "AMOXICILLINE ARROW 500MG GELULE B/12", "D1", 0, 0, 10));
        l.add(p("B", "AMOXICILLINE BIOGARAN 500MG GELULE B/12", "D1", 0, 0, 20));
        Groupe g = SuiviEquivalence.calculer(l, new Criteres()).get(0);
        assertEquals(0, g.candidats);
        assertEquals(0, g.produits.get(0).part, 0.001);
    }
}
