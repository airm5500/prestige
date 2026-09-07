package rest.service.impl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import commonTasks.dto.GardeProduitDTO;
import commonTasks.dto.GardeTrancheDTO;
import commonTasks.dto.GardeVenteLigneDTO;

/**
 * L'analyse d'une garde : ce qui s'est vendu, quand, et dans quelles proportions.
 *
 * <p>
 * Deux choses ne peuvent pas etre deleguees aux ecrans existants, et ce sont les seules que cette classe calcule :
 * </p>
 * <ul>
 * <li>la <b>repartition par tranche horaire</b>, qu'aucun ecran ne propose, et qui est precisement ce qu'on veut savoir
 * d'une nuit de garde : a quelle heure l'activite se concentre ;</li>
 * <li>la <b>classification ABC sur la fenetre exacte</b> de la garde. La procedure ABC de l'application travaille au
 * jour : une garde de 20 h a 8 h y deviendrait deux journees pleines, et le classement serait celui de l'activite
 * diurne, pas de la garde. Le calcul est donc refait ici, avec les MEMES seuils de cumul.</li>
 * </ul>
 *
 * <p>
 * Tout le reste -- chiffre d'affaires par type de vente, reglements, articles vendus -- est deja affiche par des ecrans
 * existants : la garde leur transmet sa periode plutot que de reconstruire des etats concurrents qui finiraient par
 * diverger.
 * </p>
 *
 * <p>
 * La classe ne connait ni la base ni le conteneur : elle transforme une liste de lignes de vente deja lue. C'est ce qui
 * permet de la verifier ligne a ligne, sans deploiement.
 * </p>
 */
public final class AnalyseGarde {

    /** Seuils de cumul par defaut, ceux de la procedure ABC de l'application. */
    public static final double SEUIL_A_DEFAUT = 80D;
    public static final double SEUIL_B_DEFAUT = 95D;

    private AnalyseGarde() {
    }

    /**
     * Repartition de l'activite par tranche horaire.
     *
     * <p>
     * Les tranches sont construites a partir du DEBUT de la garde, pas de minuit : une garde qui commence a 20 h 30
     * donne des tranches 20 h 30 - 22 h 30, 22 h 30 - 00 h 30, etc. Decouper sur les heures rondes couperait la
     * premiere tranche en deux et la rendrait incomparable aux suivantes.
     * </p>
     *
     * <p>
     * Toutes les tranches sont rendues, y compris celles sans aucune vente : une heure creuse est une information, et
     * l'omettre laisserait croire a une continuite qui n'existe pas.
     * </p>
     *
     * @param heuresParTranche
     *            largeur d'une tranche en heures ; une valeur nulle ou negative vaut une heure
     */
    public static List<GardeTrancheDTO> tranches(LocalDateTime debut, LocalDateTime fin,
            List<GardeVenteLigneDTO> lignes, int heuresParTranche) {
        List<GardeTrancheDTO> tranches = new ArrayList<>();
        if (debut == null || fin == null || !fin.isAfter(debut)) {
            return tranches;
        }
        int largeur = heuresParTranche > 0 ? heuresParTranche : 1;
        LocalDateTime borne = debut;
        while (borne.isBefore(fin)) {
            LocalDateTime suivante = borne.plusHours(largeur);
            if (suivante.isAfter(fin)) {
                suivante = fin;
            }
            GardeTrancheDTO tranche = new GardeTrancheDTO();
            tranche.setDebut(borne);
            tranche.setFin(suivante);
            tranches.add(tranche);
            borne = suivante;
        }
        if (lignes != null) {
            for (GardeVenteLigneDTO ligne : lignes) {
                GardeTrancheDTO tranche = trancheDe(tranches, ligne.getDateOperation());
                if (tranche != null) {
                    tranche.ajouter(ligne.getVenteId(), ligne.getQuantite(), ligne.getMontant());
                }
            }
        }
        return tranches;
    }

    /**
     * La tranche contenant cet instant.
     *
     * <p>
     * Bornes semi-ouvertes : une vente a exactement la borne appartient a la tranche qui commence, jamais aux deux. La
     * derniere tranche inclut sa borne de fin, faute de quoi une vente a la seconde de cloture de la garde serait
     * comptee dans les totaux et perdue dans les tranches -- un ecart d'une seule ligne, donc invisible.
     * </p>
     */
    private static GardeTrancheDTO trancheDe(List<GardeTrancheDTO> tranches, LocalDateTime instant) {
        if (instant == null || tranches.isEmpty()) {
            return null;
        }
        for (GardeTrancheDTO tranche : tranches) {
            if (!instant.isBefore(tranche.getDebut()) && instant.isBefore(tranche.getFin())) {
                return tranche;
            }
        }
        GardeTrancheDTO derniere = tranches.get(tranches.size() - 1);
        return instant.isEqual(derniere.getFin()) ? derniere : null;
    }

    /**
     * Classification ABC des produits vendus pendant la garde.
     *
     * <p>
     * Meme regle que la procedure de l'application : les produits sont ranges par chiffre d'affaires decroissant, et la
     * classe se lit sur le cumul ATTEINT AVANT la ligne. Un produit qui fait a lui seul 90 % du chiffre reste donc en
     * A, au lieu de basculer en C parce que son propre cumul depasse le seuil.
     * </p>
     *
     * @param seuilA
     *            part cumulee en dessous de laquelle un produit est en classe A (80 par defaut)
     * @param seuilB
     *            part cumulee en dessous de laquelle un produit est en classe B (95 par defaut)
     */
    public static List<GardeProduitDTO> classifierAbc(List<GardeVenteLigneDTO> lignes, double seuilA, double seuilB) {
        List<GardeProduitDTO> produits = cumulerParProduit(lignes);
        long total = 0L;
        for (GardeProduitDTO produit : produits) {
            total += produit.getMontant();
        }
        produits.sort(Comparator.comparingLong(GardeProduitDTO::getMontant).reversed()
                .thenComparing(Comparator.comparingLong(GardeProduitDTO::getQuantite).reversed())
                .thenComparing(GardeProduitDTO::getLibelle));
        long cumul = 0L;
        for (GardeProduitDTO produit : produits) {
            long avant = cumul;
            cumul += produit.getMontant();
            if (total <= 0L) {
                // Aucun chiffre d'affaires : parler de classes n'aurait pas de sens. Les produits
                // restent listes, sans classe, plutot que tous ranges en A par division par zero.
                produit.setPart(0D);
                produit.setCumulPart(0D);
                produit.setClasse("");
                continue;
            }
            produit.setPart(produit.getMontant() * 100D / total);
            produit.setCumulPart(cumul * 100D / total);
            double partAvant = avant * 100D / total;
            produit.setClasse(partAvant < seuilA ? "A" : (partAvant < seuilB ? "B" : "C"));
        }
        return produits;
    }

    /** Les lignes regroupees par produit, sans classement ni part. */
    private static List<GardeProduitDTO> cumulerParProduit(List<GardeVenteLigneDTO> lignes) {
        Map<String, GardeProduitDTO> table = new LinkedHashMap<>();
        if (lignes == null) {
            return new ArrayList<>();
        }
        for (GardeVenteLigneDTO ligne : lignes) {
            // Le produit est identifie par sa cle interne : deux homonymes restent deux lignes,
            // et un produit renomme entre deux gardes ne se dedouble pas.
            GardeProduitDTO produit = table.computeIfAbsent(ligne.getProduitId(), id -> {
                GardeProduitDTO p = new GardeProduitDTO();
                p.setProduitId(id);
                p.setCip(ligne.getCip());
                p.setLibelle(ligne.getLibelle());
                return p;
            });
            produit.setQuantite(produit.getQuantite() + ligne.getQuantite());
            produit.setMontant(produit.getMontant() + ligne.getMontant());
            produit.setLignes(produit.getLignes() + 1);
        }
        return new ArrayList<>(table.values());
    }

    /** Les indicateurs d'ensemble d'une garde. */
    public static final class Indicateurs {

        private int ventes;
        private int lignes;
        private int produitsDistincts;
        private long quantite;
        private long montant;
        private long dureeMinutes;

        public int getVentes() {
            return ventes;
        }

        public int getLignes() {
            return lignes;
        }

        public int getProduitsDistincts() {
            return produitsDistincts;
        }

        public long getQuantite() {
            return quantite;
        }

        public long getMontant() {
            return montant;
        }

        public long getDureeMinutes() {
            return dureeMinutes;
        }

        /**
         * Chiffre d'affaires ramene a l'heure.
         *
         * <p>
         * C'est le seul indicateur qui permette de comparer deux gardes de durees differentes : une garde de week-end
         * de 36 h fera toujours plus qu'une nuit de 12 h, sans rien dire de son intensite.
         * </p>
         */
        public long getMontantParHeure() {
            return dureeMinutes > 0 ? Math.round(montant * 60D / dureeMinutes) : 0L;
        }
    }

    public static Indicateurs indicateurs(LocalDateTime debut, LocalDateTime fin, List<GardeVenteLigneDTO> lignes) {
        Indicateurs i = new Indicateurs();
        if (debut != null && fin != null && fin.isAfter(debut)) {
            i.dureeMinutes = java.time.Duration.between(debut, fin).toMinutes();
        }
        if (lignes == null || lignes.isEmpty()) {
            return i;
        }
        java.util.Set<String> ventes = new java.util.HashSet<>();
        java.util.Set<String> produits = new java.util.HashSet<>();
        for (GardeVenteLigneDTO ligne : lignes) {
            i.lignes++;
            i.quantite += ligne.getQuantite();
            i.montant += ligne.getMontant();
            ventes.add(String.valueOf(ligne.getVenteId()));
            produits.add(String.valueOf(ligne.getProduitId()));
        }
        i.ventes = ventes.size();
        i.produitsDistincts = produits.size();
        return i;
    }
}
