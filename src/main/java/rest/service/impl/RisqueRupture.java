package rest.service.impl;

import java.time.LocalDate;

/**
 * Retours du 09/10 (3) : risque de rupture officine, par la couverture.
 *
 * <pre>
 * ventes par jour (VMJ)  = prevision mensuelle / 30 (calcul de la nuit, t_prevision_produit)
 * couverture (jours)     = stock vendable / VMJ
 * horizon de protection  = delai du grossiste + jours de securite
 *
 * stock <= 0                          -> RUPTURE
 * couverture <= delai                 -> CRITIQUE   (epuise avant une livraison normale)
 * couverture <= delai + securite      -> RISQUE
 * couverture <= horizon + surveillance-> A_SURVEILLER
 * couverture  > surstock              -> SURSTOCK
 * sinon                               -> CORRECT
 * VMJ = 0, stock > 0, aucune vente sur 12 mois -> DORMANT
 * </pre>
 *
 * Une commande deja passee qui arrive a temps (stock + en cours - VMJ x delai >= VMJ x securite) transforme RUPTURE,
 * CRITIQUE ou RISQUE en COUVERT (« couvert par commande en cours ») : on ne propose pas de recommander. La quantite a
 * commander couvre le delai, la securite et la couverture voulue apres livraison, moins le stock et les commandes en
 * cours. Le seuil d'alerte en unites (VMJ x horizon) est rendu pour information. Classe pure, sans base.
 */
public final class RisqueRupture {

    public enum Statut {
        RUPTURE, CRITIQUE, RISQUE, COUVERT, A_SURVEILLER, CORRECT, SURSTOCK, DORMANT
    }

    /** Reglages (parametres de l'officine). */
    public static class Reglages {

        public int delaiDefaut = 3;
        public int securite = 2;
        public int surveillance = 3;
        public int surstock = 90;
        public int couvertureCible = 15;
    }

    public static class Calcul {

        public Statut statut;
        /** null quand la VMJ est nulle (couverture infinie, non affichee). */
        public Double couverture;
        public int delai, horizon, seuil, aCommander;
        public LocalDate epuisement;
    }

    private RisqueRupture() {
    }

    public static Calcul evaluer(double parJour, int stock, int enCours, Integer delaiGrossiste, int ventes12Mois,
            Reglages r, LocalDate aujourdhui) {
        Calcul c = new Calcul();
        int vendable = Math.max(0, stock);
        int commande = Math.max(0, enCours);
        c.delai = delaiGrossiste != null && delaiGrossiste > 0 ? delaiGrossiste : Math.max(0, r.delaiDefaut);
        c.horizon = c.delai + Math.max(0, r.securite);
        if (!(parJour > 0)) {
            c.statut = vendable > 0 && ventes12Mois <= 0 ? Statut.DORMANT : Statut.CORRECT;
            return c;
        }
        c.couverture = Math.round(vendable / parJour * 10) / 10.0;
        c.seuil = (int) Math.ceil(parJour * c.horizon);
        c.epuisement = aujourdhui.plusDays((long) Math.floor(vendable / parJour));
        if (vendable <= 0) {
            c.statut = Statut.RUPTURE;
        } else if (c.couverture <= c.delai) {
            c.statut = Statut.CRITIQUE;
        } else if (c.couverture <= c.horizon) {
            c.statut = Statut.RISQUE;
        } else if (c.couverture <= c.horizon + Math.max(0, r.surveillance)) {
            c.statut = Statut.A_SURVEILLER;
        } else if (c.couverture > r.surstock) {
            c.statut = Statut.SURSTOCK;
        } else {
            c.statut = Statut.CORRECT;
        }
        double besoin = parJour * (c.horizon + Math.max(0, r.couvertureCible));
        int manque = (int) Math.ceil(besoin - vendable - commande - 1e-9);
        boolean aRisque = c.statut == Statut.RUPTURE || c.statut == Statut.CRITIQUE || c.statut == Statut.RISQUE;
        if (aRisque && commande > 0 && vendable + commande - parJour * c.delai >= parJour * Math.max(0, r.securite)) {
            c.statut = Statut.COUVERT;
        }
        c.aCommander = c.statut == Statut.SURSTOCK || c.statut == Statut.COUVERT ? 0 : Math.max(0, manque);
        return c;
    }
}
