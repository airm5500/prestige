package rest.service.impl;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * EQUIVALENTS DCI D'UNE SUGGESTION (plan d'octobre, 1.1) : le calcul, sans base de donnees.
 *
 * <p>
 * Pour chaque produit suggere : tous ses substituts EN STOCK (meme ensemble exact de DCI, verdict de
 * {@link SubstitutionArticle}), classes : equivalents directs d'abord, puis le plus de stock, puis la vente la plus
 * recente, puis le moins cher. La quantite couverte est la plus petite de la quantite suggeree et du stock des
 * equivalents DIRECTS encore disponible.
 *
 * <p>
 * Ne comptent jamais dans la couverture : les substituts « a adapter », les articles vendus a l'unite (deconditionnes,
 * stock en unites), et les produits qui sont eux-memes dans la suggestion (leur stock est deja juge insuffisant). Un
 * meme substitut peut servir a plusieurs lignes : son stock est reparti, ligne apres ligne, pour ne jamais etre compte
 * deux fois.
 */
public final class CouvertureEquivalentsDci {

    private CouvertureEquivalentsDci() {
    }

    /** Un produit (suggere ou candidat). Les dates sont au format triable « yyyy-MM-dd HH:mm:ss » ou null. */
    public static class Produit {

        public String id, nom, cip, cle, dci, derniereEntree, derniereVente;
        public int stock, prix, paf, qteDerniereEntree, qteDerniereVente;
        public boolean detail;

        public Produit(String id, String nom) {
            this.id = id;
            this.nom = nom;
        }
    }

    /** Une ligne de la suggestion. */
    public static class Ligne {

        public final String itemId;
        public final Produit produit;
        public final int qteSuggeree, pafLigne;

        public Ligne(String itemId, Produit produit, int qteSuggeree, int pafLigne) {
            this.itemId = itemId;
            this.produit = produit;
            this.qteSuggeree = qteSuggeree;
            this.pafLigne = pafLigne;
        }
    }

    /** Un substitut propose pour une ligne. */
    public static class Substitut {

        public final Produit produit;
        public final String niveau, raison;
        public final boolean dansSuggestion;
        /** Unites de ce substitut retenues pour couvrir la ligne. */
        public int utilise;

        Substitut(Produit produit, String niveau, String raison, boolean dansSuggestion) {
            this.produit = produit;
            this.niveau = niveau;
            this.raison = raison;
            this.dansSuggestion = dansSuggestion;
        }

        public boolean compte() {
            return SubstitutionArticle.DIRECT.equals(niveau) && !produit.detail && !dansSuggestion && produit.stock > 0;
        }
    }

    /** Resultat pour une ligne. */
    public static class Resultat {

        public final Ligne ligne;
        public final List<Substitut> substituts = new ArrayList<>();
        public int couverte;

        Resultat(Ligne ligne) {
            this.ligne = ligne;
        }

        /** Reliquat a commander si la ligne est retiree. */
        public int reste() {
            return Math.max(0, ligne.qteSuggeree - couverte);
        }
    }

    static final Comparator<Substitut> ORDRE = Comparator
            .<Substitut> comparingInt(s -> SubstitutionArticle.DIRECT.equals(s.niveau) ? 0 : 1)
            .thenComparing(Comparator.<Substitut> comparingInt(s -> s.produit.stock).reversed())
            .thenComparing(s -> s.produit.derniereVente, Comparator.nullsLast(Comparator.reverseOrder()))
            .thenComparingInt(s -> s.produit.prix).thenComparing(s -> s.produit.nom == null ? "" : s.produit.nom);

    /**
     * @param lignes
     *            lignes de la suggestion, dans l'ordre ou la couverture est repartie
     * @param candidatsParCle
     *            produits en stock regroupes par cle de DCI (liste triee des identifiants)
     * @param famillesDeLaSuggestion
     *            produits presents dans la suggestion
     *
     * @return une entree par ligne ayant au moins un substitut
     */
    public static List<Resultat> calculer(List<Ligne> lignes, Map<String, List<Produit>> candidatsParCle,
            Set<String> famillesDeLaSuggestion) {
        List<Resultat> sortie = new ArrayList<>();
        Map<String, Integer> restant = new HashMap<>();
        for (Ligne l : lignes) {
            Produit p = l.produit;
            if (p.cle == null || p.cle.isEmpty()) {
                continue;
            }
            Resultat r = new Resultat(l);
            for (Produit c : candidatsParCle.getOrDefault(p.cle, List.of())) {
                if (c.id.equals(p.id) || c.stock <= 0) {
                    continue;
                }
                SubstitutionArticle.Verdict v = SubstitutionArticle.comparer(p.nom, c.nom);
                if (v == null) {
                    continue;
                }
                String raison = c.detail ? v.raison + " ; vente à l'unité (déconditionné), non compté" : v.raison;
                r.substituts.add(new Substitut(c, v.niveau, raison, famillesDeLaSuggestion.contains(c.id)));
            }
            if (r.substituts.isEmpty()) {
                continue;
            }
            r.substituts.sort(ORDRE);
            int besoin = Math.max(0, l.qteSuggeree);
            for (Substitut s : r.substituts) {
                if (besoin == 0 || !s.compte()) {
                    continue;
                }
                int dispo = restant.computeIfAbsent(s.produit.id, k -> s.produit.stock);
                int pris = Math.min(dispo, besoin);
                if (pris > 0) {
                    s.utilise = pris;
                    restant.put(s.produit.id, dispo - pris);
                    besoin -= pris;
                    r.couverte += pris;
                }
            }
            sortie.add(r);
        }
        return sortie;
    }
}
