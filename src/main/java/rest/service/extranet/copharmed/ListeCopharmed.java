package rest.service.extranet.copharmed;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Listes de l'onglet Copharmed (demande du 08/11, releve le 08/11 sur l'extranet connecte), lues en GET seulement.
 * Promotions : liste ViewPromotion-ShowAll (Promotion, Debut, Fin, Type) puis le detail de chacune (produits et paliers
 * d'unites gratuites « 10 U.G. / 50 »). Catalogue : /fr/products/ par pages (PageSize, PageNumber).
 */
public enum ListeCopharmed {

    COPHARMED_PROMOTIONS("Promotions", "Promotions",
            Arrays.asList("Promotion", "Début", "Fin", "Type", "Désignation", "Code", "DCI", "Colisage", "Prix HT",
                    "Taux TVA", "Prix TTC", "Prix public", "Unités gratuites")),
    /*
     * 08/11 : la 2e et la 3e valeur de prix de Copharmed sont le taux de TVA (0, 9 ou 18 %) et le prix TTC (prix HT x
     * (1 + taux), verifie sur les 10 581 lignes gardees), et non une remise et un prix net HT.
     */
    COPHARMED_CATALOGUE("Produits", "Catalogue produits",
            Arrays.asList("Désignation", "Code", "DCI", "Colisage", "Prix HT", "Taux TVA", "Prix TTC", "Prix public",
                    "Disponibilité", "Promotion", "Unités gratuites")),
    /*
     * Demande du 09/11, point 4 : Mon espace > Factures et Avoirs (releve du 09/11 : tableau N° / Date / Montant HT,
     * pages de 25, icones PDF, CSV et XLS par ligne). Les fichiers CSV et XLS se telechargent depuis l'onglet.
     */
    COPHARMED_FACTURES("Mes documents", "Factures", Arrays.asList("N° facture", "Date", "Montant HT")),
    COPHARMED_AVOIRS("Mes documents", "Avoirs", Arrays.asList("N° avoir", "Date", "Montant HT")),
    /*
     * Retour du 09/11 (« je n'ai que les onglets promotions et produits »), releve du 09/11 sur l'extranet connecte :
     * Mon espace > Releves (Date / Numero de releve / PDF, pages de 25), Commandes > E-Commandes (liste de 10 par page
     * : date, numero, quantites, etat, total ; le nom d'utilisateur n'est pas garde), Tous les produits commandes
     * (pages de 25), et les blocs Arrivages et Nouveautes de l'accueil (les pages « Voir tout » renvoient tout le
     * catalogue ou une page remplie par script).
     */
    COPHARMED_RELEVES("Mes documents", "Relevés", Arrays.asList("Date", "N° relevé")),
    COPHARMED_COMMANDES("Mes commandes", "E-Commandes",
            Arrays.asList("Date", "N° e-commande", "Quantité commandée", "Quantité à livrer", "État", "Total")),
    COPHARMED_PRODUITS_COMMANDES("Mes commandes", "Tous les produits commandés",
            Arrays.asList("Date", "Code article", "Libellé article", "Quantité commandée", "Quantité livrée",
                    "Montant total", "N° facture")),
    COPHARMED_ARRIVAGES("Produits", "Arrivages",
            Arrays.asList("Désignation", "Code", "DCI", "Colisage", "Prix HT", "Taux TVA", "Prix TTC", "Prix public",
                    "Disponibilité", "Promotion", "Unités gratuites")),
    COPHARMED_NOUVEAUTES("Produits", "Nouveautés", Arrays.asList("Désignation", "Code", "DCI", "Colisage", "Prix HT",
            "Taux TVA", "Prix TTC", "Prix public", "Disponibilité", "Promotion", "Unités gratuites"));

    public final String rubrique;
    public final String libelle;
    public final List<String> colonnes;

    ListeCopharmed(String rubrique, String libelle, List<String> colonnes) {
        this.rubrique = rubrique;
        this.libelle = libelle;
        this.colonnes = Collections.unmodifiableList(colonnes);
    }

    public String module() {
        return "LISTE_" + name();
    }

    public JSONObject description() {
        return new JSONObject().put("code", name()).put("source", "COPHARMED").put("rubrique", rubrique)
                .put("libelle", libelle).put("colonnes", new JSONArray(colonnes));
    }

    public static ListeCopharmed parCode(String code) {
        for (ListeCopharmed l : values()) {
            if (l.name().equalsIgnoreCase(code == null ? "" : code.trim())) {
                return l;
            }
        }
        return null;
    }

    public static JSONArray catalogue() {
        JSONArray a = new JSONArray();
        for (ListeCopharmed l : values()) {
            a.put(l.description());
        }
        return a;
    }
}
