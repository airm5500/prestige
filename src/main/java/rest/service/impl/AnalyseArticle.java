package rest.service.impl;

import commonTasks.dto.ArticleAnalyseDTO;
import commonTasks.dto.GardeProduitDTO;
import commonTasks.dto.GardeVenteLigneDTO;
import commonTasks.dto.PaireArticleDTO;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Analyse article : la matrice marge x rotation et les produits achetes ensemble. Calculs purs, sans base de donnees,
 * pour etre testes seuls.
 *
 * <p>
 * Le taux de marge est celui de la formule unique de l'application ({@link util.CalculMarge}). La rotation rapporte la
 * quantite vendue sur la periode au stock actuel. Les seuils « eleve / faible » sont, par defaut, les medianes de
 * l'assortiment vendu : la moitie des produits au-dessus, la moitie en dessous, quelle que soit l'officine.
 * </p>
 */
public final class AnalyseArticle {

    /** Les quatre quadrants, dans l'ordre d'affichage : code, libelle, decision pratique. */
    public static final String[][] QUADRANTS = {
            { "1", "Champions",
                    "Marge élevée et rotation élevée : sécurisez le stock et favorisez leur conseil actif." },
            { "2", "Rentables mais lents",
                    "Marge élevée et rotation faible : réduisez le stock de sécurité, commandez à la demande." },
            { "3", "Volume fort, peu rentable",
                    "Marge faible et rotation élevée : négociez le prix d'achat fournisseur." },
            { "4", "Produits à risque",
                    "Marge faible et rotation faible : liquidez le stock et envisagez le déréférencement." } };

    private AnalyseArticle() {
    }

    public static String libelleQuadrant(int quadrant) {
        return quadrant >= 1 && quadrant <= 4 ? QUADRANTS[quadrant - 1][1] : "";
    }

    public static String decisionQuadrant(int quadrant) {
        return quadrant >= 1 && quadrant <= 4 ? QUADRANTS[quadrant - 1][2] : "";
    }

    /**
     * Les lignes de vente cumulees par produit : quantite, tickets, montants, achat. Le nombre de jours sert a la
     * couverture. Aucun classement ici.
     */
    public static List<ArticleAnalyseDTO> agreger(List<GardeVenteLigneDTO> lignes, long jours) {
        Map<String, ArticleAnalyseDTO> table = new LinkedHashMap<>();
        Map<String, Set<String>> tickets = new HashMap<>();
        if (lignes == null) {
            return new ArrayList<>();
        }
        for (GardeVenteLigneDTO ligne : lignes) {
            ArticleAnalyseDTO article = table.computeIfAbsent(ligne.getProduitId(), id -> {
                ArticleAnalyseDTO a = new ArticleAnalyseDTO(id, ligne.getCip(), ligne.getLibelle());
                a.setRattachements(ligne.getFamilleId(), ligne.getRayonId(), ligne.getGrossisteId());
                a.setJours(Math.max(1, jours));
                return a;
            });
            article.setQuantite(article.getQuantite() + ligne.getQuantite());
            article.setMontant(article.getMontant() + ligne.getMontant());
            article.setRemise(article.getRemise() + ligne.getRemise());
            article.setTva(article.getTva() + ligne.getTva());
            article.setAchat(article.getAchat() + ligne.getPrixAchat() * ligne.getQuantite());
            tickets.computeIfAbsent(ligne.getProduitId(), k -> new HashSet<>()).add(ligne.getVenteId());
        }
        for (ArticleAnalyseDTO article : table.values()) {
            article.setTickets(tickets.getOrDefault(article.getProduitId(), Collections.emptySet()).size());
        }
        return new ArrayList<>(table.values());
    }

    /** La classe ABC de chaque produit (part cumulee du chiffre d'affaires), avec la regle de l'application. */
    public static void classerAbc(List<ArticleAnalyseDTO> articles, List<GardeVenteLigneDTO> lignes, double seuilA,
            double seuilB) {
        Map<String, String> classes = new HashMap<>();
        for (GardeProduitDTO p : AnalyseGarde.classifierAbc(lignes, seuilA, seuilB)) {
            classes.put(p.getProduitId(), p.getClasse());
        }
        for (ArticleAnalyseDTO a : articles) {
            a.setClasse(classes.getOrDefault(a.getProduitId(), ""));
        }
    }

    /** La mediane d'une serie ; 0 pour une serie vide. */
    public static double mediane(List<Double> valeurs) {
        if (valeurs == null || valeurs.isEmpty()) {
            return 0D;
        }
        List<Double> triees = new ArrayList<>(valeurs);
        Collections.sort(triees);
        int n = triees.size();
        double m = n % 2 == 1 ? triees.get(n / 2) : (triees.get(n / 2 - 1) + triees.get(n / 2)) / 2D;
        return Math.round(m * 100D) / 100D;
    }

    public static double medianeMarge(List<ArticleAnalyseDTO> articles) {
        List<Double> v = new ArrayList<>();
        for (ArticleAnalyseDTO a : articles) {
            v.add(a.getTauxMarge());
        }
        return mediane(v);
    }

    /**
     * La mediane des rotations, calculee sur les produits EN STOCK seulement.
     *
     * <p>
     * Un produit a stock zero n'a pas de rotation : sa « rotation » vaut sa quantite vendue (voir
     * {@link ArticleAnalyseDTO#getRotation()}), c'est-a-dire 2 pour deux boites vendues et 300 pour trois cents.
     * Laisser ces valeurs dans la mediane la gonflait : l'officine a vu un produit de classe A juge « rotation faible »
     * a 1,98 contre un seuil de 2,00 fait de ruptures (21/09). Les ruptures sont traitees a part, par
     * {@link Seuils#quantiteRupture}.
     */
    public static double medianeRotation(List<ArticleAnalyseDTO> articles) {
        List<Double> v = new ArrayList<>();
        for (ArticleAnalyseDTO a : articles) {
            if (a.getStock() > 0) {
                v.add(a.getRotation());
            }
        }
        return mediane(v);
    }

    /** La mediane des couvertures en jours, sur les produits en stock qui se vendent. */
    public static double medianeCouverture(List<ArticleAnalyseDTO> articles) {
        List<Double> v = new ArrayList<>();
        for (ArticleAnalyseDTO a : articles) {
            if (a.getStock() > 0 && a.getCouverture() >= 0) {
                v.add(a.getCouverture());
            }
        }
        return mediane(v);
    }

    /** La mediane des quantites vendues, sur tous les produits vendus : c'est l'aune des ruptures. */
    public static double medianeQuantite(List<ArticleAnalyseDTO> articles) {
        List<Double> v = new ArrayList<>();
        for (ArticleAnalyseDTO a : articles) {
            v.add((double) a.getQuantite());
        }
        return mediane(v);
    }

    /** Le mode de lecture de la rotation : en jours de couverture (par defaut) ou en ratio vendu / stock. */
    public static final String MODE_JOURS = "JOURS";
    public static final String MODE_RATIO = "RATIO";

    /**
     * Les seuils qui rangent un produit dans son quadrant, tels que l'en-tete de l'ecran les enonce.
     *
     * <ul>
     * <li>marge elevee : taux de marge superieur ou egal a {@link #margeMin} ;</li>
     * <li>rotation elevee, en mode {@link #MODE_JOURS} : couverture inferieure ou egale a {@link #couvertureMax} jours
     * - le stock tient peu de jours, donc il tourne ; en mode {@link #MODE_RATIO} : rotation superieure ou egale a
     * {@link #rotationMin} ;</li>
     * <li>produit EN RUPTURE (stock zero) : il n'a ni couverture ni rotation. Il est « rotation elevee » seulement si
     * sa quantite vendue atteint {@link #quantiteRupture} - la mediane des quantites - sans quoi deux boites vendues en
     * trois mois feraient un champion (21/09). {@code null} conserve l'ancienne regle, ou la quantite tenait lieu de
     * rotation.</li>
     * </ul>
     */
    public static final class Seuils {

        public final double margeMin;
        public final String modeRotation;
        public final double rotationMin;
        public final double couvertureMax;
        public final Double quantiteRupture;

        public Seuils(double margeMin, String modeRotation, double rotationMin, double couvertureMax,
                Double quantiteRupture) {
            this.margeMin = margeMin;
            this.modeRotation = MODE_RATIO.equalsIgnoreCase(modeRotation) ? MODE_RATIO : MODE_JOURS;
            this.rotationMin = rotationMin;
            this.couvertureMax = couvertureMax;
            this.quantiteRupture = quantiteRupture;
        }

        public boolean enJours() {
            return MODE_JOURS.equals(modeRotation);
        }

        /** La rotation d'un produit est-elle « elevee » au sens de ces seuils ? */
        public boolean rotationHaute(ArticleAnalyseDTO a) {
            if (a.getStock() <= 0) {
                return quantiteRupture == null ? a.getRotation() >= rotationMin : a.getQuantite() >= quantiteRupture;
            }
            if (enJours()) {
                double c = a.getCouverture();
                return c >= 0 && c <= couvertureMax;
            }
            return a.getRotation() >= rotationMin;
        }
    }

    /** Range chaque produit dans son quadrant selon les seuils. */
    public static void affecterQuadrants(List<ArticleAnalyseDTO> articles, Seuils seuils) {
        for (ArticleAnalyseDTO a : articles) {
            boolean margeHaute = a.getTauxMarge() >= seuils.margeMin;
            boolean rotationHaute = seuils.rotationHaute(a);
            a.setQuadrant(margeHaute ? (rotationHaute ? 1 : 2) : (rotationHaute ? 3 : 4));
        }
    }

    /** L'ancienne lecture, en ratio et sans regle de rupture : « eleve » signifie superieur ou egal au seuil. */
    public static void affecterQuadrants(List<ArticleAnalyseDTO> articles, double seuilMarge, double seuilRotation) {
        affecterQuadrants(articles, new Seuils(seuilMarge, MODE_RATIO, seuilRotation, 0, null));
    }

    /**
     * Une borne numerique de filtre : un operateur et une valeur, « stock ≥ 1 » ou « quantite > 10 ». Demande du 21/09
     * : « ajouter un filtre sur le stock avec des operateurs », et sur la quantite, pour ecarter d'un geste les
     * produits passes a zero le jour meme ou les ventes anecdotiques.
     */
    public static final class Borne {

        public final String operateur;
        public final double valeur;

        private Borne(String operateur, double valeur) {
            this.operateur = operateur;
            this.valeur = valeur;
        }

        /** {@code null} si l'operateur ou la valeur manquent : aucun filtre. */
        public static Borne de(String operateur, String valeur) {
            if (operateur == null || valeur == null || valeur.trim().isEmpty()) {
                return null;
            }
            String op = operateur.trim();
            if (!(op.equals(">=") || op.equals("<=") || op.equals("=") || op.equals(">") || op.equals("<")
                    || op.equals("!="))) {
                return null;
            }
            try {
                return new Borne(op, Double.parseDouble(valeur.trim().replace(',', '.')));
            } catch (NumberFormatException e) {
                return null;
            }
        }

        public boolean accepte(double v) {
            switch (operateur) {
            case ">=":
                return v >= valeur;
            case "<=":
                return v <= valeur;
            case ">":
                return v > valeur;
            case "<":
                return v < valeur;
            case "!=":
                return v != valeur;
            default:
                return v == valeur;
            }
        }

        @Override
        public String toString() {
            return operateur + " "
                    + (valeur == Math.floor(valeur) ? String.valueOf((long) valeur) : String.valueOf(valeur));
        }
    }

    /** Le resume des quatre quadrants : produits, quantite, chiffre, marge, valeur de stock, decision. */
    public static JSONArray resume(List<ArticleAnalyseDTO> articles) {
        JSONArray resume = new JSONArray();
        long totalMontant = 0L;
        for (ArticleAnalyseDTO a : articles) {
            totalMontant += a.getMontant();
        }
        for (int q = 1; q <= 4; q++) {
            long produits = 0, quantite = 0, montant = 0, marge = 0, stock = 0, valeurStock = 0;
            for (ArticleAnalyseDTO a : articles) {
                if (a.getQuadrant() != q) {
                    continue;
                }
                produits++;
                quantite += a.getQuantite();
                montant += a.getMontant();
                marge += a.getMarge();
                stock += a.getStock();
                valeurStock += a.getValeurStock();
            }
            resume.put(new JSONObject().put("quadrant", q).put("libelle", libelleQuadrant(q))
                    .put("decision", decisionQuadrant(q)).put("produits", produits).put("quantite", quantite)
                    .put("montant", montant).put("marge", marge).put("stock", stock).put("valeurStock", valeurStock)
                    .put("partCa", totalMontant > 0 ? Math.round(montant * 1000D / totalMontant) / 10D : 0D));
        }
        return resume;
    }

    /** Filtre par quadrant (0 = tous), famille, rayon, grossiste et texte (CIP ou libelle). */
    public static List<ArticleAnalyseDTO> filtrer(List<ArticleAnalyseDTO> articles, int quadrant, String famille,
            String rayon, String grossiste, String recherche) {
        return filtrer(articles, quadrant, famille, rayon, grossiste, recherche, null, null);
    }

    /** Le meme filtre, avec une borne sur le stock et une sur la quantite vendue ({@code null} : sans). */
    public static List<ArticleAnalyseDTO> filtrer(List<ArticleAnalyseDTO> articles, int quadrant, String famille,
            String rayon, String grossiste, String recherche, Borne stock, Borne quantite) {
        List<ArticleAnalyseDTO> retenus = new ArrayList<>();
        String texte = recherche == null ? "" : recherche.trim().toLowerCase(Locale.FRENCH);
        for (ArticleAnalyseDTO a : articles) {
            if (quadrant > 0 && a.getQuadrant() != quadrant) {
                continue;
            }
            if (stock != null && !stock.accepte(a.getStock())) {
                continue;
            }
            if (quantite != null && !quantite.accepte(a.getQuantite())) {
                continue;
            }
            if (renseigne(famille) && !famille.equals(a.getFamilleId())) {
                continue;
            }
            if (renseigne(rayon) && !rayon.equals(a.getRayonId())) {
                continue;
            }
            if (renseigne(grossiste) && !grossiste.equals(a.getGrossisteId())) {
                continue;
            }
            if (!texte.isEmpty() && !(a.getLibelle().toLowerCase(Locale.FRENCH).contains(texte)
                    || a.getCip().toLowerCase(Locale.FRENCH).contains(texte))) {
                continue;
            }
            retenus.add(a);
        }
        return retenus;
    }

    private static boolean renseigne(String valeur) {
        return valeur != null && !valeur.trim().isEmpty();
    }

    /** Tri de la liste : par quadrant puis chiffre decroissant, pour que la liste se lise comme la matrice. */
    public static void trier(List<ArticleAnalyseDTO> articles) {
        articles.sort((x, y) -> {
            int c = Integer.compare(x.getQuadrant(), y.getQuadrant());
            if (c != 0) {
                return c;
            }
            c = Long.compare(y.getMontant(), x.getMontant());
            return c != 0 ? c : x.getLibelle().compareToIgnoreCase(y.getLibelle());
        });
    }

    /**
     * Complete les paires avec le nombre de tickets de chacun des deux produits, pour la part « x % des ventes de A
     * contiennent B ». Les paires dont un produit est inconnu de l'analyse gardent une part a 0.
     */
    public static void completerPaires(List<PaireArticleDTO> paires, List<ArticleAnalyseDTO> articles) {
        Map<String, Long> tickets = new HashMap<>();
        for (ArticleAnalyseDTO a : articles) {
            tickets.put(a.getProduitId(), a.getTickets());
        }
        for (PaireArticleDTO p : paires) {
            p.setTickets1(tickets.getOrDefault(p.getProduit1Id(), 0L));
            p.setTickets2(tickets.getOrDefault(p.getProduit2Id(), 0L));
        }
    }

    /** Le JSON d'un article, tel que l'ecran et les editions le lisent. */
    public static JSONObject json(ArticleAnalyseDTO a) {
        return new JSONObject().put("produitId", a.getProduitId()).put("cip", a.getCip()).put("libelle", a.getLibelle())
                .put("familleId", a.getFamilleId()).put("rayonId", a.getRayonId())
                .put("grossisteId", a.getGrossisteId()).put("quantite", a.getQuantite()).put("tickets", a.getTickets())
                .put("montant", a.getMontant()).put("montantHt", a.getMontantHt()).put("achat", a.getAchat())
                .put("marge", a.getMarge()).put("tauxMarge", a.getTauxMarge()).put("stock", a.getStock())
                .put("rotation", a.getRotation()).put("couverture", a.getCouverture())
                .put("valeurStock", a.getValeurStock()).put("classe", a.getClasse()).put("quadrant", a.getQuadrant())
                .put("quadrantLibelle", libelleQuadrant(a.getQuadrant()))
                .put("decision", decisionQuadrant(a.getQuadrant()));
    }

    public static JSONObject json(PaireArticleDTO p) {
        return new JSONObject().put("produit1Id", p.getProduit1Id()).put("cip1", p.getCip1())
                .put("libelle1", p.getLibelle1()).put("produit2Id", p.getProduit2Id()).put("cip2", p.getCip2())
                .put("libelle2", p.getLibelle2()).put("tickets", p.getTickets()).put("tickets1", p.getTickets1())
                .put("tickets2", p.getTickets2()).put("part1", p.getPart1()).put("part2", p.getPart2());
    }
}
