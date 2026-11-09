package rest.service.extranet.dpci;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Listes de l'onglet DPCI (demande du 08/11, releve le 08/11 sur l'extranet connecte), lues en GET seulement :
 * <ul>
 * <li>Mes offres en cours : /module/offre/AllListOffres.action puis GetOffre.action par offre (produits et paliers)
 * ;</li>
 * <li>Mes commandes : /module/commande/ListCommandes.action (DataTables, avec l'etat de chaque commande) ;</li>
 * <li>Mes documents : /module/geide/ListDocuments.action, avec le formulaire de la page /geide?typeDocument=... ;</li>
 * <li>Mes reclamations : /module/reclamation/DonneListReclamationClient.action (consultation seulement).</li>
 * </ul>
 */
public enum ListeDpci {

    DPCI_OFFRES("Mes offres en cours", "Offres en cours", null,
            Arrays.asList("Offre", "Laboratoire", "Début", "Fin", "Désignation", "Code", "Code facture",
                    "Paliers (UG, remise)")),
    DPCI_COMMANDES("Mes commandes", "Mes commandes", null,
            Arrays.asList("Date", "N° commande", "Référence client", "Type", "Agence", "État", "Date de l'état",
                    "Lignes", "Quantité")),
    DPCI_BL("Mes documents", "Bons de livraison", "BL",
            Arrays.asList("Date", "N° BL", "N° commande", "N° facture", "Agence")),
    DPCI_FACTURES("Mes documents", "Factures", "FACTURE",
            Arrays.asList("Date", "N° facture", "N° commande", "N° BL", "N° relevé", "Montant HT", "Montant TTC")),
    DPCI_RELEVES("Mes documents", "Relevés", "RELEVE", Arrays.asList("Date", "N° relevé")),
    DPCI_AVOIRS("Mes documents", "Avoirs", "AVOIR",
            Arrays.asList("Date", "N° facture", "N° commande", "N° BL", "N° relevé", "Montant HT", "Montant TTC")),
    DPCI_RECLAMATIONS("Mes réclamations", "Mes réclamations", null,
            Arrays.asList("N° réclamation", "N° commande", "Agence", "Statut", "Créée le", "Modifiée le")),
    /*
     * Retour du 09/11 (« je n'ai pas l'onglet produits »), releve du 09/11 : page /produits, liste DataTables
     * /module/catalogue/RechercheCatalogue.action (GET accepte, 100 lignes par page au plus : 200 repond 500).
     */
    DPCI_PRODUITS("Produits", "Tous les produits", null, Arrays.asList("Désignation", "Code", "Laboratoire", "Agence",
            "Statut", "Colisage", "Prix", "Prix remisé", "Prix public", "TVA", "Offre"));

    public final String rubrique;
    public final String libelle;
    /** Type de document de la page /geide (BL, FACTURE, RELEVE, AVOIR) ; null hors documents. */
    public final String typeDocument;
    public final List<String> colonnes;

    ListeDpci(String rubrique, String libelle, String typeDocument, List<String> colonnes) {
        this.rubrique = rubrique;
        this.libelle = libelle;
        this.typeDocument = typeDocument;
        this.colonnes = Collections.unmodifiableList(colonnes);
    }

    public String module() {
        return "LISTE_" + name();
    }

    public JSONObject description() {
        return new JSONObject().put("code", name()).put("source", "DPCI").put("rubrique", rubrique)
                .put("libelle", libelle).put("colonnes", new JSONArray(colonnes));
    }

    public static ListeDpci parCode(String code) {
        for (ListeDpci l : values()) {
            if (l.name().equalsIgnoreCase(code == null ? "" : code.trim())) {
                return l;
            }
        }
        return null;
    }

    public static JSONArray catalogue() {
        JSONArray a = new JSONArray();
        for (ListeDpci l : values()) {
            a.put(l.description());
        }
        return a;
    }
}
