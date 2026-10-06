package rest.service.impl.prevision;

import java.util.ArrayList;
import java.util.List;

/**
 * Alertes sur une ligne de suggestion ou de commande (plan d'octobre, section 5.3), sans base de donnees. Limitees a la
 * DECISION DE STOCK (Q14) : rien de clinique.
 */
public final class AlertesLigne {

    public static final String ABERRANTE = "ABERRANTE";
    public static final String INSUFFISANTE = "INSUFFISANTE";
    public static final String SURSTOCK = "SURSTOCK";
    public static final String EQUIVALENT = "EQUIVALENT";
    public static final String INDISPONIBLE = "INDISPONIBLE";
    public static final String PRIX = "PRIX";
    public static final String LENTE = "LENTE";

    private AlertesLigne() {
    }

    /** Seuils (parametres KEY_PREVISION_*). */
    public static final class Seuils {
        public int surstockJours = 90, rotationLenteJours = 180, ecartAberrant = 3, prixEcartPct = 15;
    }

    /** Ce que l'on sait de la ligne et du produit. */
    public static final class Ligne {
        public int quantite, recommande, stock, enCours, equivalents;
        public double prevuMois;
        /** jours depuis la derniere vente ; -1 si jamais vendu */
        public int joursSansVente = -1;
        public boolean indisponible;
        public int prixLigne, prixDernierAchat;
        /** un produit sans historique (nouveau) n'est pas juge sur sa rotation */
        public boolean nouveau;
    }

    public static final class Alerte {
        public final String code, texte;
        public final boolean grave;

        Alerte(String code, String texte, boolean grave) {
            this.code = code;
            this.texte = texte;
            this.grave = grave;
        }
    }

    public static List<Alerte> alertes(Ligne l, Seuils s) {
        List<Alerte> a = new ArrayList<>();
        double parJour = l.prevuMois / 30.0;
        double reference = Math.max(l.recommande, l.prevuMois);
        if (l.quantite >= 5 && l.quantite > s.ecartAberrant * reference) {
            a.add(new Alerte(ABERRANTE, "Quantité aberrante : " + l.quantite + " proposés pour environ "
                    + arrondi(l.prevuMois) + " vendus par mois (recommandé " + l.recommande + ")", true));
        } else if (l.recommande > 0 && l.quantite * 2 < l.recommande) {
            a.add(new Alerte(INSUFFISANTE, "Quantité insuffisante : " + l.quantite + " proposés, " + l.recommande
                    + " recommandés (risque de rupture)", false));
        }
        int dispo = Math.max(0, l.stock) + Math.max(0, l.enCours);
        if (dispo > 0) {
            if (parJour > 0) {
                int couverture = (int) Math.floor(dispo / parJour);
                if (couverture > s.surstockJours) {
                    a.add(new Alerte(SURSTOCK, "Déjà en surstock : " + dispo + " en stock ou en commande, soit "
                            + couverture + " jours de vente", true));
                }
            } else if (!l.nouveau) {
                a.add(new Alerte(SURSTOCK, "Déjà en stock (" + dispo + ") et aucune vente prévue", true));
            }
        }
        if (l.equivalents > 0) {
            a.add(new Alerte(EQUIVALENT, "Équivalent DCI direct en stock : " + l.equivalents + " unité(s)", false));
        }
        if (l.indisponible) {
            a.add(new Alerte(INDISPONIBLE, "Indisponible chez le grossiste (dernière vérification)", true));
        }
        if (l.prixLigne > 0 && l.prixDernierAchat > 0) {
            long ecart = Math.round((l.prixLigne - l.prixDernierAchat) * 100.0 / l.prixDernierAchat);
            if (Math.abs(ecart) > s.prixEcartPct) {
                a.add(new Alerte(PRIX, "Prix d'achat anormal : " + l.prixLigne + " contre " + l.prixDernierAchat
                        + " au dernier achat (" + (ecart > 0 ? "+" : "") + ecart + " %)", ecart > 0));
            }
        }
        if (!l.nouveau && (l.joursSansVente < 0 || l.joursSansVente > s.rotationLenteJours)) {
            a.add(new Alerte(LENTE, l.joursSansVente < 0 ? "Rotation lente : jamais vendu"
                    : "Rotation lente : aucune vente depuis " + l.joursSansVente + " jours", false));
        }
        return a;
    }

    private static String arrondi(double v) {
        return v == Math.floor(v) ? String.valueOf((long) v) : String.format(java.util.Locale.FRANCE, "%.1f", v);
    }
}
