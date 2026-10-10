package rest.service.impl.prevision;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Retours du 10/10 : parametres des previsions et du risque de rupture modifiables dans l'ecran. Catalogue unique (cle,
 * libelle, explication, valeur par defaut, bornes, ecrans concernes) : l'ecran l'affiche, le serveur s'en sert pour
 * valider et pour lire chaque valeur avec le meme defaut partout.
 */
public final class ParametresPrevision {

    public static final String PREVISIONS = "PREVISIONS", RISQUE = "RISQUE";

    /** Definition d'un parametre (valeurs entieres). */
    public static final class Definition {
        public final String cle, libelle, aide, unite;
        public final int defaut, min, max;
        public final List<String> ecrans;

        Definition(String cle, String libelle, String aide, String unite, int defaut, int min, int max,
                String... ecrans) {
            this.cle = cle;
            this.libelle = libelle;
            this.aide = aide;
            this.unite = unite;
            this.defaut = defaut;
            this.min = min;
            this.max = max;
            this.ecrans = Collections.unmodifiableList(Arrays.asList(ecrans));
        }
    }

    private static final Map<String, Definition> CATALOGUE = new LinkedHashMap<>();

    private static void ajouter(Definition d) {
        CATALOGUE.put(d.cle, d);
    }

    static {
        ajouter(new Definition("KEY_PREVISION_COUVERTURE_JOURS", "Couverture voulue",
                "Jours de ventes que l'on veut avoir en stock après la livraison.", "jours", 15, 1, 180, PREVISIONS,
                RISQUE));
        ajouter(new Definition("KEY_PREVISION_DELAI_JOURS", "Délai de livraison par défaut",
                "Utilisé quand la fiche du grossiste habituel n'a pas de délai de réapprovisionnement.", "jours", 3, 0,
                60, PREVISIONS, RISQUE));
        ajouter(new Definition("KEY_PREVISION_JOURS_EN_COURS", "Âge maximal d'une commande en cours",
                "Une commande en cours ou passée plus ancienne n'est plus comptée dans l'en-cours.", "jours", 45, 1,
                365, PREVISIONS, RISQUE));
        ajouter(new Definition("KEY_PREVISION_SURSTOCK_JOURS", "Surstock au-delà de",
                "Un produit dont le stock couvre plus de jours de ventes est signalé en surstock.", "jours", 90, 7, 730,
                PREVISIONS, RISQUE));
        ajouter(new Definition("KEY_PREVISION_ROTATION_LENTE_JOURS", "Rotation lente au-delà de",
                "Produit en stock sans vente depuis ce nombre de jours.", "jours", 180, 30, 1095, PREVISIONS));
        ajouter(new Definition("KEY_PREVISION_ECART_ABERRANT", "Quantité aberrante : plus de N fois",
                "Quantité proposée d'au moins 5 et supérieure à N fois le plus grand de (recommandé, prévision du mois).",
                "fois", 3, 2, 20, PREVISIONS));
        ajouter(new Definition("KEY_PREVISION_PRIX_ECART", "Écart de prix signalé",
                "Prix d'achat de la ligne qui s'écarte de plus de ce pourcentage du prix d'achat de la fiche.", "%", 15,
                1, 100, PREVISIONS));
        ajouter(new Definition("KEY_PREVISION_MOIS_TEST", "Mois d'essai des méthodes",
                "Chaque méthode prévoit les derniers mois connus ; celle qui s'est le moins trompée est retenue.",
                "mois", 6, 1, 12, PREVISIONS));
        ajouter(new Definition("KEY_PREVISION_PLAFOND_COUVERTURE", "Plafond de couverture (moyenne)",
                "Au-delà, la couverture d'un produit est ramenée à ce plafond dans la moyenne du tableau de bord.",
                "jours", 365, 30, 3650, PREVISIONS));
        ajouter(new Definition("KEY_PREVISION_SEUIL_PEU_FIABLE", "Prévision peu fiable sous",
                "Fiabilité (100 − erreur de la méthode retenue) en dessous de laquelle la prévision est signalée.", "%",
                50, 0, 100, PREVISIONS));
        ajouter(new Definition("KEY_RISQUE_SECURITE_JOURS", "Marge de sécurité",
                "Jours ajoutés au délai de livraison : en dessous, le produit est « critique ».", "jours", 2, 0, 60,
                RISQUE));
        ajouter(new Definition("KEY_RISQUE_SURVEILLANCE_JOURS", "Marge de surveillance",
                "Jours au-delà de la marge de sécurité : le produit est « à surveiller ».", "jours", 3, 0, 60, RISQUE));
        ajouter(new Definition("KEY_RISQUE_JOURS_RUPTURE_FOURNISSEUR", "Ruptures grossistes affichées depuis",
                "Une rupture annoncée par un grossiste reste affichée pendant ce nombre de jours.", "jours", 30, 1, 365,
                RISQUE));
    }

    private ParametresPrevision() {
    }

    public static Map<String, Definition> catalogue() {
        return Collections.unmodifiableMap(CATALOGUE);
    }

    public static Definition definition(String cle) {
        return CATALOGUE.get(cle);
    }

    /**
     * Valeur lue en base : defaut si absente ou illisible. Une valeur deja enregistree est gardee telle quelle (comme
     * avant) : les bornes ne s'appliquent qu'a la saisie dans l'ecran.
     */
    public static int valeur(String cle, String brute) {
        Definition d = CATALOGUE.get(cle);
        if (d == null) {
            throw new IllegalArgumentException("Paramètre inconnu : " + cle);
        }
        try {
            int v = Integer.parseInt(brute == null ? "" : brute.trim());
            return v;
        } catch (NumberFormatException e) {
            return d.defaut;
        }
    }

    /** Controle d'une saisie : null si acceptable, sinon le message a afficher. */
    public static String controler(String cle, String saisie) {
        Definition d = CATALOGUE.get(cle);
        if (d == null) {
            return "Paramètre inconnu.";
        }
        int v;
        try {
            v = Integer.parseInt(saisie == null ? "" : saisie.trim());
        } catch (NumberFormatException e) {
            return d.libelle + " : nombre entier attendu.";
        }
        if (v < d.min || v > d.max) {
            return d.libelle + " : valeur entre " + d.min + " et " + d.max + " (" + d.unite + ").";
        }
        return null;
    }
}
