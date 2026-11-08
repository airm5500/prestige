package rest.service.promotion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * Plan du 06/11, point 3.5 : coherence des ventes en promotion et de leur analyse, sur des milliers de lignes tirees au
 * hasard (graine fixe) : types et options varies, quantite 1 a 24, zero offerte, prix d'avant inconnu (vente ancienne),
 * plusieurs vendeurs, jours et promotions. Les attendus sont recalcules ici autrement (boucles simples).
 */
class PromotionAnalyseCoherenceTest {

    private static final long GRAINE = 20261108L;
    private static final String[] TYPES = { PromotionLigne.REMISE, PromotionLigne.PRIX_SPECIAL,
            PromotionLigne.UNITES_GRATUITES };

    private static List<PromotionAnalyse.Ligne> tirer(Random r, int n) {
        List<PromotionAnalyse.Ligne> l = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            String type = TYPES[r.nextInt(3)];
            int prixAvant = 5 * (100 + r.nextInt(2000));
            int q = 1 + r.nextInt(24);
            int s = 1 + r.nextInt(6), g = 1 + r.nextInt(3);
            String mode = null;
            int off = 0, pu = prixAvant;
            Integer seuil = null, grat = null;
            if (PromotionLigne.UNITES_GRATUITES.equals(type)) {
                boolean palier = r.nextBoolean();
                mode = palier ? PromotionLigne.MODE_PALIER : PromotionLigne.MODE_A_PARTIR;
                seuil = s;
                grat = g;
                if (palier) {
                    off = PromotionLigne.offertesParPalier(q, s, g);
                    q += off;
                } else {
                    off = PromotionLigne.unitesOffertes(q, s, g);
                }
            } else {
                Integer p = PromotionLigne.prixUnitaire(type, 5 + r.nextInt(40),
                        (double) (prixAvant - 5 * r.nextInt(50)), prixAvant);
                pu = p != null ? p : prixAvant;
            }
            int montant = PromotionLigne.montant(pu, q, off);
            boolean ancienne = r.nextInt(10) == 0; // vendue avant que la ligne garde son prix d'avant
            l.add(new PromotionAnalyse.Ligne(LocalDate.of(2026, 11, 1 + r.nextInt(7)), "10:00",
                    "V" + r.nextInt(n / 2 + 1), "Vendeur " + r.nextInt(4), String.valueOf(1000000 + r.nextInt(40)),
                    "Produit " + r.nextInt(40), "Promotion " + r.nextInt(5), type, mode, seuil, grat, q, off,
                    ancienne ? null : prixAvant, pu, montant));
        }
        return l;
    }

    @Test
    void lignePayeesPlusOffertesEtRemise() {
        Random r = new Random(GRAINE);
        for (PromotionAnalyse.Ligne l : tirer(r, 20000)) {
            assertEquals(l.quantite, l.payees() + l.offertes);
            assertTrue(l.payees() >= 0 && l.offertes >= 0 && l.remise() >= 0);
            assertEquals(l.prixVendu * l.payees(), l.montant, "montant = prix vendu x payees");
            if (l.prixAvant == null) {
                assertEquals(0, l.remise(), "prix d'avant inconnu : remise inconnue (0)");
            } else {
                assertEquals(l.prixAvant * l.quantite - l.montant, l.remise());
                if (PromotionLigne.UNITES_GRATUITES.equals(l.type)) {
                    assertEquals(l.prixVendu * l.offertes, l.remise(),
                            "unites gratuites : remise = valeur des offertes");
                }
            }
        }
    }

    @Test
    void sommeDesGroupesEgaleLeTotal() {
        Random r = new Random(GRAINE + 1);
        for (int essai = 0; essai < 200; essai++) {
            List<PromotionAnalyse.Ligne> lignes = tirer(r, 1 + r.nextInt(300));
            PromotionAnalyse.Resultat a = PromotionAnalyse.analyser(lignes);
            long montant = 0, remise = 0;
            int payees = 0, offertes = 0;
            Set<String> refs = new HashSet<>();
            for (PromotionAnalyse.Ligne l : lignes) {
                montant += l.montant;
                remise += l.remise();
                payees += l.payees();
                offertes += l.offertes;
                refs.add(l.refVente);
            }
            assertEquals(montant, a.total.montant);
            assertEquals(remise, a.total.remise);
            assertEquals(payees, a.total.payees);
            assertEquals(offertes, a.total.offertes);
            assertEquals(refs.size(), a.total.ventes());
            assertEquals(lignes.size(), a.total.lignes);
            for (List<PromotionAnalyse.Groupe> gs : List.of(a.parType, a.parPromotion, a.parVendeur, a.parJour)) {
                assertEquals(montant, gs.stream().mapToLong(g -> g.montant).sum());
                assertEquals(remise, gs.stream().mapToLong(g -> g.remise).sum());
                assertEquals(payees, gs.stream().mapToInt(g -> g.payees).sum());
                assertEquals(offertes, gs.stream().mapToInt(g -> g.offertes).sum());
                assertEquals(lignes.size(), gs.stream().mapToInt(g -> g.lignes).sum());
            }
            // jours dans l'ordre
            for (int i = 1; i < a.parJour.size(); i++) {
                assertTrue(a.parJour.get(i - 1).cle.compareTo(a.parJour.get(i).cle) < 0);
            }
        }
    }

    @Test
    void lesDixProduitsQuiRapportentLePlus() {
        Random r = new Random(GRAINE + 2);
        for (int essai = 0; essai < 200; essai++) {
            List<PromotionAnalyse.Ligne> lignes = tirer(r, 1 + r.nextInt(400));
            PromotionAnalyse.Resultat a = PromotionAnalyse.analyser(lignes);
            Map<String, Long> parProduit = new HashMap<>();
            for (PromotionAnalyse.Ligne l : lignes) {
                parProduit.merge(l.cip + " " + l.produit, (long) l.montant, Long::sum);
            }
            assertEquals(Math.min(PromotionAnalyse.TOP, parProduit.size()), a.top.size());
            for (int i = 1; i < a.top.size(); i++) {
                assertTrue(a.top.get(i - 1).montant >= a.top.get(i).montant, "classement par montant");
            }
            for (PromotionAnalyse.Groupe g : a.top) {
                assertEquals(parProduit.get(g.cle).longValue(), g.montant);
            }
            // aucun produit hors du classement ne rapporte plus que le dernier classe
            long dernier = a.top.get(a.top.size() - 1).montant;
            Set<String> classes = new HashSet<>();
            a.top.forEach(g -> classes.add(g.cle));
            parProduit.forEach((k, v) -> assertTrue(classes.contains(k) || v <= dernier, k));
        }
    }
}
