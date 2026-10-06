package rest.service.impl.prevision;

/**
 * Quantite recommandee a commander (plan d'octobre, section 5, lot L12), sans base de donnees :
 *
 * <pre>
 * besoin    = ventes prevues par jour x (delai de livraison + couverture voulue)
 * securite  = z x ecart type journalier x racine(delai de livraison)        (z = 1,65 : 95 % de service)
 * recommande = arrondi superieur (besoin + securite) - stock - commandes en cours - equivalents directs en stock
 * </pre>
 *
 * jamais negatif. L'ecart type journalier vient de l'ecart type mensuel (/ racine(30)).
 */
public final class Recommandation {

    public static final double Z_95 = 1.65;

    private Recommandation() {
    }

    public static int quantite(double ventesParJour, double ecartTypeMois, int delaiJours, int couvertureJours,
            int stock, int enCours, int equivalents) {
        double besoin = Math.max(0, ventesParJour) * (Math.max(0, delaiJours) + Math.max(0, couvertureJours));
        double securite = Z_95 * (Math.max(0, ecartTypeMois) / Math.sqrt(30)) * Math.sqrt(Math.max(1, delaiJours));
        double brut = Math.ceil(besoin + securite - 1e-9);
        return (int) Math.max(0, brut - Math.max(0, stock) - Math.max(0, enCours) - Math.max(0, equivalents));
    }

    /** Couverture en jours du stock (et des commandes en cours) au rythme prevu ; -1 si rien ne se vend. */
    public static int couverture(int stock, int enCours, double ventesParJour) {
        if (ventesParJour <= 0) {
            return -1;
        }
        return (int) Math.floor((Math.max(0, stock) + Math.max(0, enCours)) / ventesParJour);
    }
}
