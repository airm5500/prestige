package rest.service.extranet.tedis;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Listes de l'onglet TEDIS (demande du 08/11), relevees le 08/11 sur l'extranet connecte, en lecture seule (GET
 * uniquement). Rubriques comme sur l'extranet : Produits, Reclamations, Vos documents, Commandes.
 *
 * <p>
 * Formats releves : le catalogue, les sorties de rupture, les promotions et les documents arrivent en JSON
 * ({@code succes}, {@code data} : objets nommes) servi en « text/html » ; l'historique des commandes et des
 * reclamations arrive dans la page HTML ; les commandes en attente : liste HTML puis detail JSON de chacune.
 * </p>
 * <p>
 * « Nos mises en place » : la page de l'extranet charge le catalogue entier sans filtre ; la liste de Prestige garde
 * les produits du catalogue au statut « MISE EN PLACE ».
 * </p>
 */
public enum ListeTedis {

    TEDIS_CATALOGUE("Produits", "Notre catalogue produits", Mode.CATALOGUE, "/catalogueProduitTableData",
            "/catalogueProduit", null, Colonnes.CATALOGUE),
    TEDIS_MISES_EN_PLACE("Produits", "Nos mises en place", Mode.CATALOGUE, "/catalogueProduitTableData",
            "/catalogueProduit", "MISE EN PLACE", Colonnes.CATALOGUE),
    TEDIS_SORTIES_RUPTURE("Produits", "Nos sorties de rupture", Mode.CATALOGUE, "/NosReaprovisionnements",
            "/reapprovisionnement", null,
            Arrays.asList(Colonne.json("DateReceptionBonLivraison", "Date d'entrée", Genre.TEXTE),
                    Colonne.json("DesignationProduit", "Désignation", Genre.TEXTE),
                    Colonne.json("CodeCipProduit1", "CIP", Genre.CIP),
                    Colonne.json("CodeEanProduit", "EAN", Genre.TEXTE),
                    Colonne.json("LibelleFamilleProduit", "Famille", Genre.TEXTE),
                    Colonne.json("Nature", "Nature", Genre.TEXTE),
                    Colonne.json("NomLaboratoire", "Laboratoire", Genre.TEXTE),
                    Colonne.json("StockTheorique", "Dispo", Genre.DISPO),
                    Colonne.json("PrixCessionHT", "Cession HT", Genre.MONTANT),
                    Colonne.json("PrixVentePublicTTC", "Public TTC", Genre.MONTANT),
                    Colonne.json("ColisageProduit", "Colisage", Genre.MONTANT))),
    TEDIS_RECLAMATIONS("Réclamations", "Historique de vos réclamations", Mode.HTML, "/historiqueReclamation", null,
            "#reclamationListeTable",
            Arrays.asList(Colonne.html(1, "Date"), Colonne.html(2, "N° Réclamation"), Colonne.html(3, "Etape"),
                    Colonne.html(4, "Total HT"), Colonne.html(5, "Remise"), Colonne.html(6, "TVA"),
                    Colonne.html(7, "Total TTC"))),
    TEDIS_BL_QUINZAINE("Vos documents", "B.L.V par quinzaine", Mode.BL_QUINZAINE, "/donneequinzaine", "/blparquizaine",
            null,
            Arrays.asList(Colonne.json("DateFactureClient", "Date", Genre.TEXTE),
                    Colonne.json("LibelleTypeFactureClient", "Type", Genre.TEXTE),
                    Colonne.json("NumeroFactureClient", "N° Document", Genre.TEXTE),
                    Colonne.json("TotalHT", "Total HT", Genre.MONTANT),
                    Colonne.json("TotalRemise", "Remise", Genre.MONTANT),
                    Colonne.json("TotalTaxe", "TVA", Genre.MONTANT),
                    Colonne.json("TotalTTC", "Total TTC", Genre.MONTANT))),
    TEDIS_FACTURES_QUINZAINE("Vos documents", "Facture de quinzaine", Mode.FACTURES_ANNEES, "/releveFacture",
            "/factureDequinzaine", null,
            Arrays.asList(Colonne.json("Date", "Date", Genre.TEXTE),
                    Colonne.json("Quinzaine", "N° Facture", Genre.TEXTE), Colonne.json("P", "P", Genre.TEXTE),
                    Colonne.json("TotalHT", "Total HT", Genre.TEXTE), Colonne.json("Remise", "Remise", Genre.TEXTE),
                    Colonne.json("Tva", "TVA", Genre.TEXTE), Colonne.json("TotalTTC", "Total TTC", Genre.TEXTE))),
    TEDIS_COMMANDES_ATTENTE("Commandes", "Commandes en attente", Mode.COMMANDES_ATTENTE, "/DetailCommandeAttente",
            "/CommandeAttente", null,
            Arrays.asList(Colonne.json("Designation", "Désignation", Genre.TEXTE),
                    Colonne.json("QuantiteCommmande", "Qté", Genre.MONTANT),
                    Colonne.json("PrixCession", "Cession HT", Genre.TEXTE),
                    Colonne.json("PrixPublic", "Public TTC", Genre.TEXTE))),
    TEDIS_HISTORIQUE_COMMANDES("Commandes", "Historique de vos commandes", Mode.HTML, "/commandeHistorique", null,
            "#historiqueTable",
            Arrays.asList(Colonne.html(1, "Date"), Colonne.html(2, "N° Commande"), Colonne.html(3, "Type"),
                    Colonne.html(4, "Mode"), Colonne.html(5, "Etape"), Colonne.html(6, "Total HT"),
                    Colonne.html(7, "Remise"), Colonne.html(8, "TVA"), Colonne.html(9, "Total TTC"),
                    Colonne.html(10, "Nbre Ligne"), Colonne.html(11, "Nbre Boite"))),
    TEDIS_PROMOS_LABO("Commandes", "Promotions laboratoire", Mode.JSON, "/produitpromo", "/promolabo", null,
            Colonnes.PROMOTIONS),
    TEDIS_PROMOS_EXCLUSIVES("Commandes", "Promotions exclusives", Mode.JSON, "/produitpromoExclusive",
            "/promoExclusive", null, Colonnes.PROMOTIONS);

    /** Facon de lire la liste. */
    public enum Mode {
        /** JSON {succes, data} d'objets, agence principale (AgenceId) lue sur la page du catalogue. */
        CATALOGUE,
        /** JSON {succes, data} d'objets, sans parametre. */
        JSON,
        /** Tableau de la page HTML. */
        HTML,
        /** Une reponse par quinzaine proposee sur la page (select SearchBlv), lignes dans DatabonLivraison. */
        BL_QUINZAINE,
        /** Une reponse par annee proposee sur la page (select envoiAnnee). */
        FACTURES_ANNEES,
        /** Liste HTML des commandes en attente, puis detail JSON de chacune. */
        COMMANDES_ATTENTE
    }

    public enum Genre {
        TEXTE, MONTANT, CIP, DISPO, REFERENCE
    }

    /** Colonne gardee : cle JSON, ou index de cellule (HTML) avec le titre attendu sur la page. */
    public static final class Colonne {
        public final String cle;
        public final int index;
        public final String titre;
        public final Genre genre;

        private Colonne(String cle, int index, String titre, Genre genre) {
            this.cle = cle;
            this.index = index;
            this.titre = titre;
            this.genre = genre;
        }

        static Colonne json(String cle, String titre, Genre genre) {
            return new Colonne(cle, -1, titre, genre);
        }

        static Colonne html(int index, String titre) {
            return new Colonne(null, index, titre, Genre.TEXTE);
        }
    }

    private static final class Colonnes {
        static final List<Colonne> CATALOGUE = Arrays.asList(
                Colonne.json("CodeInterneProduit", "Référence", Genre.REFERENCE),
                Colonne.json("DesignationProduit", "Désignation", Genre.TEXTE),
                Colonne.json("CodeCipProduit1", "CIP", Genre.CIP), Colonne.json("CodeEanProduit", "EAN", Genre.TEXTE),
                Colonne.json("Statut", "Statut", Genre.TEXTE), Colonne.json("Famille", "Famille", Genre.TEXTE),
                Colonne.json("Nature", "Nature", Genre.TEXTE), Colonne.json("Laboratoire", "Laboratoire", Genre.TEXTE),
                Colonne.json("produitEnStock", "Dispo", Genre.DISPO),
                Colonne.json("PrixCessionHT", "Cession HT", Genre.MONTANT),
                Colonne.json("PrixVentePublicTTC", "Public TTC", Genre.MONTANT),
                Colonne.json("ColisageProduit", "Colisage", Genre.MONTANT));
        static final List<Colonne> PROMOTIONS = Arrays.asList(
                Colonne.json("DesignationProduit", "Désignation", Genre.TEXTE),
                Colonne.json("CodeCipProduit1", "CIP", Genre.CIP), Colonne.json("CodeEanProduit", "EAN", Genre.TEXTE),
                Colonne.json("NomLaboratoire", "Laboratoire", Genre.TEXTE),
                Colonne.json("DateDebutUG", "Date début", Genre.TEXTE),
                Colonne.json("DateFinUG", "Date fin", Genre.TEXTE),
                Colonne.json("PrixCessionHT", "Cession HT", Genre.MONTANT),
                Colonne.json("PrixVentePublicHT", "Public HT", Genre.MONTANT));
    }

    public final String rubrique;
    public final String libelle;
    public final Mode mode;
    public final String chemin;
    /** Page de l'extranet qui affiche la liste (referer ; agences, quinzaines, annees, commandes y sont lues). */
    public final String pageOrigine;
    /** Statut garde (mises en place) ou selecteur du tableau (HTML). */
    public final String filtre;
    public final List<Colonne> colonnes;

    ListeTedis(String rubrique, String libelle, Mode mode, String chemin, String pageOrigine, String filtre,
            List<Colonne> colonnes) {
        this.rubrique = rubrique;
        this.libelle = libelle;
        this.mode = mode;
        this.chemin = chemin;
        this.pageOrigine = pageOrigine == null ? chemin : pageOrigine;
        this.filtre = filtre;
        this.colonnes = Collections.unmodifiableList(colonnes);
    }

    /** Module du journal des collectes. */
    public String module() {
        return "LISTE_" + name();
    }

    /** Titre de la premiere colonne ajoutee (agence, quinzaine, annee, commande), null s'il n'y en a pas. */
    public String colonneContexte() {
        switch (mode) {
        case CATALOGUE:
            return "Agence";
        case BL_QUINZAINE:
            return "Quinzaine";
        case FACTURES_ANNEES:
            return "Année";
        case COMMANDES_ATTENTE:
            return "Commande du";
        default:
            return null;
        }
    }

    public JSONObject description() {
        JSONArray t = new JSONArray();
        if (colonneContexte() != null) {
            t.put(colonneContexte());
        }
        for (Colonne c : colonnes) {
            t.put(c.titre);
        }
        return new JSONObject().put("code", name()).put("source", "TEDIS").put("rubrique", rubrique)
                .put("libelle", libelle).put("colonnes", t);
    }

    public static ListeTedis parCode(String code) {
        for (ListeTedis l : values()) {
            if (l.name().equalsIgnoreCase(code == null ? "" : code.trim())) {
                return l;
            }
        }
        return null;
    }

    public static JSONArray catalogue() {
        JSONArray a = new JSONArray();
        for (ListeTedis l : values()) {
            a.put(l.description());
        }
        return a;
    }
}
