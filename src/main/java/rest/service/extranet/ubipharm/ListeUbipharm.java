package rest.service.extranet.ubipharm;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Listes de l'onglet Ubipharm lues en lecture seule (releve des pages du 08/11) : ou la lire, comment, et quelles
 * colonnes garder. Les colonnes d'action de la page (menu, quantite a commander, bouton) ne sont jamais gardees.
 * <ul>
 * <li>HTML : la page porte toutes les lignes dans un tableau (le tri et la pagination sont faits par le navigateur)
 * ;</li>
 * <li>JSON_COMPLET : une adresse JSON rend toutes les lignes d'un coup ;</li>
 * <li>JSON_PAGINE : une adresse JSON rend les lignes page par page (DataTables cote serveur) ;</li>
 * <li>JSON_PAR_AGENCE : la page liste les agences (un tableau par agence), puis une adresse JSON par agence.</li>
 * </ul>
 */
public enum ListeUbipharm {

    PROMOTIONS("Produits", "Promotions", Mode.HTML, "/Promotions", null, "#promotions", null,
            col(0, "N° promotion", Genre.TEXTE, null), col(2, "Libellé", Genre.TEXTE, "libell"),
            col(3, "Type", Genre.TEXTE, "type"), col(4, "Début", Genre.TEXTE, "debut"),
            col(5, "Fin", Genre.TEXTE, "fin")),

    PRODUITS_UG("Produits", "Produits avec UG", Mode.JSON_COMPLET, "/ProduitsPromotionsJSON", "/ProduitsPromotions",
            null, "poform=U", col(2, "Produit", Genre.PRODUIT, null), col(3, "Disponibilité", Genre.DISPO, null),
            col(4, "Paliers (quantité → unités gratuites)", Genre.PALIERS, null)),

    PRODUITS_SUPPRIMES("Produits", "Produits supprimés", Mode.HTML, "/ProduitsSupprimes", null, "#produits", null,
            col(0, "Produit", Genre.PRODUIT, "libell"), col(1, "Date de suppression", Genre.TEXTE, "date"),
            col(2, "Statut", Genre.TEXTE, "statut"), col(3, "Disponibilité", Genre.DISPO, "dispo")),

    FACTURES("Vos documents", "Factures non relevées", Mode.HTML, "/ListeFactures", null, "#factures", null,
            col(1, "N° facture", Genre.TEXTE, "facture"), col(2, "Réf. commande", Genre.TEXTE, "commande"),
            col(3, "Date", Genre.TEXTE, "date"), col(4, "Montant (CFA)", Genre.TEXTE, "montant")),

    RELEVES("Vos documents", "Derniers relevés", Mode.JSON_PAGINE, "/GetRelevesJSON", "/ListeReleves", null, null,
            col(1, "N° relevé", Genre.TEXTE, null), col(2, "Date", Genre.TEXTE, null),
            col(3, "Montant TTC (CFA)", Genre.TEXTE, null)),

    AVOIRS("Vos documents", "Récapitulatifs d'avoirs", Mode.JSON_PAGINE, "/GetRecapAvoirsJSON", "/ListeAvoirsRecap",
            null, null, col(1, "N° relevé", Genre.TEXTE, null), col(2, "Date", Genre.TEXTE, null),
            col(3, "Montant TTC (CFA)", Genre.TEXTE, null)),

    DERNIERES_COMMANDES("Commandes", "Vos dernières commandes", Mode.JSON_PAR_AGENCE,
            "/ReturnDernieresCommandesEtabJSON", "/DernieresCommandes", "table.lastCde[id]", null,
            col(1, "N° commande", Genre.TEXTE, null), col(2, "Montant", Genre.TEXTE, null),
            col(3, "Type", Genre.TEXTE, null), col(4, "Statut", Genre.TEXTE, null), col(5, "Date", Genre.TEXTE, null)),

    COMMANDES_EXTRANET("Commandes", "Vos commandes extranet", Mode.HTML, "/DernieresCommandesExtranet", null,
            "#lastCdeExt", null, col(1, "N° commande", Genre.TEXTE, "commande"),
            col(2, "Établissement", Genre.TEXTE, "etablissement"), col(3, "Réf. commande", Genre.TEXTE, "ref"),
            col(4, "Description", Genre.TEXTE, "description"), col(5, "Utilisateur", Genre.TEXTE, "utilisateur"),
            col(6, "Date", Genre.TEXTE, "date")),

    PLUS_ACHETES("Commandes", "Les plus achetés", Mode.JSON_COMPLET, "/ReturnProduitsAchetesJSON", "/ProduitsAchetes",
            null, null, col(0, "Produit", Genre.PRODUIT, null), col(1, "Quantité achetée", Genre.TEXTE, null),
            col(2, "Disponibilité", Genre.DISPO, null), col(3, "Prix", Genre.TEXTE, null));

    /** Facon de lire la liste. */
    public enum Mode {
        HTML, JSON_COMPLET, JSON_PAGINE, JSON_PAR_AGENCE
    }

    /** Lecture d'une cellule. */
    public enum Genre {
        /** texte affiche, bulles et champs de saisie retires */
        TEXTE,
        /** lien produit : designation, avec PSCODE (data-pscode) et CIP (detail « code - CIP ») */
        PRODUIT,
        /** disponibilite : etiquette, puis agence : disponibilite de la bulle */
        DISPO,
        /** paliers d'unites gratuites : un palier par bloc, separes par « ; » */
        PALIERS
    }

    /** Colonne gardee : position dans la ligne de la page, titre affiche, lecture, mot attendu dans le titre. */
    public static final class Colonne {
        public final int index;
        public final String titre;
        public final Genre genre;
        /** fragment attendu dans le titre de colonne de la page (sans accent, minuscules) ; null : pas de controle */
        public final String entete;

        Colonne(int index, String titre, Genre genre, String entete) {
            this.index = index;
            this.titre = titre;
            this.genre = genre;
            this.entete = entete;
        }
    }

    private static Colonne col(int index, String titre, Genre genre, String entete) {
        return new Colonne(index, titre, genre, entete);
    }

    public final String rubrique;
    public final String libelle;
    public final Mode mode;
    /** adresse lue (page HTML ou adresse JSON) */
    public final String chemin;
    /** page de l'extranet d'ou part l'appel JSON (referer) ; pour JSON_PAR_AGENCE, la page lue pour les agences */
    public final String pageOrigine;
    /** tableau de la page (HTML) ou tableaux des agences (JSON_PAR_AGENCE) */
    public final String selecteur;
    /** parametres fixes de l'adresse JSON (« a=b&c=d ») */
    public final String parametresFixes;
    private final List<Colonne> colonnes;

    ListeUbipharm(String rubrique, String libelle, Mode mode, String chemin, String pageOrigine, String selecteur,
            String parametresFixes, Colonne... colonnes) {
        this.rubrique = rubrique;
        this.libelle = libelle;
        this.mode = mode;
        this.chemin = chemin;
        this.pageOrigine = pageOrigine;
        this.selecteur = selecteur;
        this.parametresFixes = parametresFixes;
        this.colonnes = Collections.unmodifiableList(Arrays.asList(colonnes));
    }

    public List<Colonne> colonnes() {
        return colonnes;
    }

    /** Module du journal des collectes. */
    public String module() {
        return "LISTE_" + name();
    }

    /** La liste porte-t-elle une colonne produit (et donc PSCODE et CIP) ? */
    public boolean aProduit() {
        return colonnes.stream().anyMatch(c -> c.genre == Genre.PRODUIT);
    }

    /** Plus grande position de colonne lue : une ligne plus courte est refusee. */
    int indexMax() {
        return colonnes.stream().mapToInt(c -> c.index).max().orElse(0);
    }

    public Map<String, String> parametresFixes() {
        Map<String, String> m = new LinkedHashMap<>();
        if (parametresFixes != null) {
            for (String p : parametresFixes.split("&")) {
                int i = p.indexOf('=');
                m.put(p.substring(0, i), p.substring(i + 1));
            }
        }
        return m;
    }

    /** Liste par son code ; null si inconnu. */
    public static ListeUbipharm parCode(String code) {
        for (ListeUbipharm l : values()) {
            if (l.name().equals(code)) {
                return l;
            }
        }
        return null;
    }

    /** Description pour l'ecran : code, rubrique, libelle et titres des colonnes affichees. */
    public JSONObject description() {
        JSONArray t = new JSONArray();
        if (mode == Mode.JSON_PAR_AGENCE) {
            t.put("Agence");
        }
        if (aProduit()) {
            t.put("Référence");
        }
        for (Colonne c : colonnes) {
            t.put(c.titre);
            if (c.genre == Genre.PRODUIT) {
                t.put("CIP");
            }
        }
        return new JSONObject().put("code", name()).put("rubrique", rubrique).put("libelle", libelle).put("colonnes",
                t);
    }

    public static JSONArray catalogue() {
        JSONArray a = new JSONArray();
        for (ListeUbipharm l : values()) {
            a.put(l.description());
        }
        return a;
    }
}
