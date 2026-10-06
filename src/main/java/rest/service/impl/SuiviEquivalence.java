package rest.service.impl;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;

/**
 * SUIVI EQUIVALENCE (plan d'octobre, section 9, lot L7) : le calcul, sans base de donnees.
 *
 * <p>
 * Les produits actifs sont regroupes par ENSEMBLE EXACT de DCI (meme cle que les equivalents de la suggestion, 1.1).
 * Dans chaque groupe, ils sont classes du plus vendu au moins vendu sur la periode (quantite, puis chiffre d'affaires,
 * puis libelle) ; le premier est le MENEUR. Chaque produit est situe par rapport au meneur par la regle de substitution
 * de 1.1 : « Direct » (meme dosage, meme forme), « À adapter » (dosage ou forme differents), ou hors voie.
 *
 * <p>
 * REPERE « À NE PLUS COMMANDER » : un equivalent DIRECT du meneur qui se vend peu alors que le meneur se vend - sa
 * quantite est inferieure au seuil (en % de celle du meneur, 20 % par defaut). C'est un doublon d'assortiment : la meme
 * molecule, au meme dosage, sous la meme forme, qui immobilise du stock pour peu de ventes. Un produit « à adapter »
 * n'est jamais repere : ce n'est pas un doublon, il repond a un autre besoin (autre dosage, autre forme).
 */
public final class SuiviEquivalence {

    public static final String MENEUR = "meneur";
    public static final int SEUIL_DEFAUT = 20;

    private SuiviEquivalence() {
    }

    /** Un produit et ses chiffres sur la periode. */
    public static class Produit {

        public final String id, nom;
        public String cip, cle, dci, derniereVente;
        public long quantite, montant, marge, stock;
        public int prixAchat;
        /** Rempli par le calcul. */
        public int rang;
        public double part, couverture;
        public String equivalence, raison;
        public boolean candidat;

        public Produit(String id, String nom) {
            this.id = id;
            this.nom = nom == null ? "" : nom.trim();
        }

        /** Valeur du stock au prix d'achat. */
        public long valeurStock() {
            return Math.max(0, stock) * (long) Math.max(0, prixAchat);
        }
    }

    /** Un groupe d'equivalents (meme ensemble de DCI). */
    public static class Groupe {

        public final String cle, dci;
        public final List<Produit> produits = new ArrayList<>();
        public long quantite, montant, stock, valeurStock;
        public int candidats;

        Groupe(String cle, String dci) {
            this.cle = cle;
            this.dci = dci;
        }

        public Produit meneur() {
            return produits.isEmpty() ? null : produits.get(0);
        }
    }

    /** Filtres de l'onglet. */
    public static class Criteres {

        public String dci = "";
        public int minProduits = 2;
        public boolean stockPositif;
        public boolean seulementCandidats;
        public int seuil = SEUIL_DEFAUT;
        public long jours = 90;
    }

    static final Comparator<Produit> ORDRE = Comparator.<Produit> comparingLong(p -> p.quantite).reversed()
            .thenComparing(Comparator.<Produit> comparingLong(p -> p.montant).reversed()).thenComparing(p -> p.nom);

    /**
     * Groupes classes : d'abord ceux qui ont des produits a ne plus commander, puis par quantite vendue du groupe.
     */
    public static List<Groupe> calculer(List<Produit> produits, Criteres c) {
        Map<String, Groupe> parCle = new LinkedHashMap<>();
        for (Produit p : produits) {
            if (StringUtils.isBlank(p.cle)) {
                continue;
            }
            parCle.computeIfAbsent(p.cle, k -> new Groupe(k, StringUtils.defaultString(p.dci))).produits.add(p);
        }
        String filtreDci = StringUtils.stripAccents(StringUtils.trimToEmpty(c.dci)).toUpperCase(Locale.FRANCE);
        int seuil = c.seuil <= 0 ? SEUIL_DEFAUT : Math.min(100, c.seuil);
        List<Groupe> sortie = new ArrayList<>();
        for (Groupe g : parCle.values()) {
            if (!filtreDci.isEmpty()
                    && !StringUtils.stripAccents(g.dci).toUpperCase(Locale.FRANCE).contains(filtreDci)) {
                continue;
            }
            if (c.stockPositif) {
                g.produits.removeIf(p -> p.stock <= 0);
            }
            if (g.produits.size() < Math.max(2, c.minProduits)) {
                continue;
            }
            g.produits.sort(ORDRE);
            for (Produit p : g.produits) {
                g.quantite += p.quantite;
                g.montant += p.montant;
                g.stock += Math.max(0, p.stock);
                g.valeurStock += p.valeurStock();
            }
            Produit meneur = g.meneur();
            int rang = 0;
            for (Produit p : g.produits) {
                p.rang = ++rang;
                p.part = g.quantite == 0 ? 0 : arrondi(p.quantite * 100.0 / g.quantite);
                p.couverture = couverture(p, c.jours);
                p.candidat = false;
                if (p == meneur) {
                    p.equivalence = MENEUR;
                    p.raison = p.quantite > 0 ? "le plus vendu du groupe"
                            : "aucune vente sur la période dans ce groupe";
                    continue;
                }
                SubstitutionArticle.Verdict v = SubstitutionArticle.comparer(meneur.nom, p.nom);
                p.equivalence = v == null ? "" : v.niveau;
                p.raison = v == null ? "autre voie d'administration que le meneur" : v.raison;
                if (v != null && SubstitutionArticle.DIRECT.equals(v.niveau) && meneur.quantite > 0
                        && p.quantite * 100 < (long) seuil * meneur.quantite) {
                    p.candidat = true;
                    p.raison = "équivalent direct de " + meneur.nom + " : " + p.quantite + " vendu(s) contre "
                            + meneur.quantite + " ("
                            + un(meneur.quantite == 0 ? 0 : p.quantite * 100.0 / meneur.quantite) + " %), stock "
                            + p.stock + " — candidat à ne plus commander";
                    g.candidats++;
                }
            }
            if (c.seulementCandidats && g.candidats == 0) {
                continue;
            }
            sortie.add(g);
        }
        sortie.sort(Comparator.<Groupe> comparingInt(g -> g.candidats > 0 ? 0 : 1)
                .thenComparing(Comparator.<Groupe> comparingLong(g -> g.quantite).reversed())
                .thenComparing(g -> g.dci));
        return sortie;
    }

    /** Couverture en jours au rythme de la periode ; -1 = stock sans aucune vente (infinie) ; 0 = rupture. */
    static double couverture(Produit p, long jours) {
        if (p.stock <= 0) {
            return 0;
        }
        if (p.quantite <= 0) {
            return -1;
        }
        return arrondi(p.stock * (double) Math.max(1, jours) / p.quantite);
    }

    static double arrondi(double v) {
        return Math.round(v * 10) / 10.0;
    }

    private static String un(double v) {
        return String.format(Locale.FRANCE, "%.1f", v).replace(",0", "");
    }

    /** Libelle de l'equivalence pour l'ecran et les editions. */
    public static String libelleEquivalence(String e) {
        if (MENEUR.equals(e)) {
            return "Meneur";
        }
        if (SubstitutionArticle.DIRECT.equals(e)) {
            return "Direct";
        }
        if (SubstitutionArticle.ADAPTER.equals(e)) {
            return "À adapter";
        }
        return "Autre voie";
    }
}
