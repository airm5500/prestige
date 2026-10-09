package rest.service.impl;

import java.util.ArrayList;
import java.util.List;

/**
 * Retours du 09/10 (6) : regles de la fidelite clients, sans base.
 * <ul>
 * <li>base d'une vente = montant net des produits eligibles x part payee par le client (net - tiers payants) / net
 * ;</li>
 * <li>points = base x coefficient du palier / montant pour un point (arrondi a l'inferieur) ;</li>
 * <li>palier = celui du plus haut seuil atteint par les points acquis sur les 12 derniers mois ;</li>
 * <li>utilisation et expiration : les points les plus anciens d'abord.</li>
 * </ul>
 */
public final class FideliteCalcul {

    /** Palier : seuil de points acquis sur 12 mois, coefficient applique aux points gagnes. */
    public static class Palier {

        public final String id, libelle;
        public final int seuil;
        public final double coefficient;

        public Palier(String id, String libelle, int seuil, double coefficient) {
            this.id = id;
            this.libelle = libelle;
            this.seuil = seuil;
            this.coefficient = coefficient;
        }
    }

    /** Points restants d'un gain (pour l'utilisation et l'expiration). */
    public static class Reste {

        public final String id;
        public final int restants;

        public Reste(String id, int restants) {
            this.id = id;
            this.restants = restants;
        }
    }

    private FideliteCalcul() {
    }

    /**
     * Base de points d'une vente : part du client sur les produits eligibles.
     *
     * @param net
     *            montant net de la vente (prix - remise)
     * @param eligible
     *            montant net des produits eligibles
     * @param tiersPayants
     *            part prise en charge par les tiers payants
     */
    public static long base(long net, long eligible, long tiersPayants) {
        if (net <= 0 || eligible <= 0) {
            return 0;
        }
        long partClient = Math.max(0, net - Math.max(0, tiersPayants));
        long e = Math.min(eligible, net);
        return partClient >= net ? e : e * partClient / net;
    }

    /** Points gagnes : base x coefficient / montant pour un point, arrondi a l'inferieur. */
    public static int points(long base, int montantPoint, double coefficient) {
        if (base <= 0 || montantPoint <= 0 || coefficient <= 0) {
            return 0;
        }
        return (int) Math.floor(base * coefficient / montantPoint + 1e-9);
    }

    /** Palier du plus haut seuil atteint ; null si aucun seuil n'est atteint (coefficient 1). */
    public static Palier palier(List<Palier> paliers, long cumul12Mois) {
        Palier p = null;
        for (Palier x : paliers) {
            if (x.seuil <= cumul12Mois && (p == null || x.seuil > p.seuil)) {
                p = x;
            }
        }
        return p;
    }

    /** Prochain palier (seuil superieur au cumul), null s'il n'y en a pas. */
    public static Palier prochain(List<Palier> paliers, long cumul12Mois) {
        Palier p = null;
        for (Palier x : paliers) {
            if (x.seuil > cumul12Mois && (p == null || x.seuil < p.seuil)) {
                p = x;
            }
        }
        return p;
    }

    /**
     * Retrait de points sur les gains (les plus anciens d'abord). Rend, pour chaque gain entame, les points pris. Les
     * gains doivent etre fournis du plus ancien au plus recent.
     */
    public static List<Reste> consommer(List<Reste> gains, int points) {
        List<Reste> pris = new ArrayList<>();
        int reste = Math.max(0, points);
        for (Reste g : gains) {
            if (reste == 0) {
                break;
            }
            int p = Math.min(reste, Math.max(0, g.restants));
            if (p > 0) {
                pris.add(new Reste(g.id, p));
                reste -= p;
            }
        }
        return pris;
    }

    /** Valeur en FCFA de points. */
    public static long valeur(long points, int valeurPoint) {
        return Math.max(0, points) * Math.max(0, valeurPoint);
    }

    /** Message d'erreur des parametres, null s'ils sont valables. */
    public static String controleParametres(int montantPoint, int valeurPoint, int seuil, int expirationMois) {
        if (montantPoint < 1 || montantPoint > 1_000_000) {
            return "Montant pour 1 point : entre 1 et 1 000 000 FCFA.";
        }
        if (valeurPoint < 0 || valeurPoint > 100_000) {
            return "Valeur d'un point : entre 0 et 100 000 FCFA.";
        }
        if (seuil < 0 || seuil > 10_000_000) {
            return "Seuil d'utilisation : entre 0 et 10 000 000 points.";
        }
        if (expirationMois < 0 || expirationMois > 120) {
            return "Expiration : entre 0 (jamais) et 120 mois.";
        }
        if ((double) valeurPoint / montantPoint > 0.5) {
            return "Valeur d'un point trop élevée : plus de 50 % du montant d'achat rendu au client.";
        }
        return null;
    }
}
