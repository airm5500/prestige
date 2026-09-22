package rest.service.dto;

/**
 * Une ordonnance dans l'historique imprime ou exporte (evolution 6, point 2, vague 3).
 *
 * <p>
 * Les memes lignes que la grille : l'edition et l'ecran lisent la meme requete, avec les memes criteres. Un total
 * imprime qui ne compte pas les memes lignes que celles affichees serait pire qu'une absence d'edition.
 */
public class OrdonnanceLigneDTO {

    private String numero;
    private String date;
    private String client;
    private String typeClient;
    private String medecin;
    private String etablissement;
    private int nbProduits;
    private int nbPieces;
    private String statut;
    private String creePar;

    public OrdonnanceLigneDTO() {
    }

    public OrdonnanceLigneDTO(String numero, String date, String client, String typeClient, String medecin,
            String etablissement, int nbProduits, int nbPieces, String statut, String creePar) {
        this.numero = numero;
        this.date = date;
        this.client = client;
        this.typeClient = typeClient;
        this.medecin = medecin;
        this.etablissement = etablissement;
        this.nbProduits = nbProduits;
        this.nbPieces = nbPieces;
        this.statut = statut;
        this.creePar = creePar;
    }

    public String getNumero() {
        return numero;
    }

    public String getDate() {
        return date;
    }

    public String getClient() {
        return client;
    }

    public String getTypeClient() {
        return typeClient;
    }

    public String getMedecin() {
        return medecin;
    }

    public String getEtablissement() {
        return etablissement;
    }

    public int getNbProduits() {
        return nbProduits;
    }

    public int getNbPieces() {
        return nbPieces;
    }

    public String getStatut() {
        return statut;
    }

    public String getCreePar() {
        return creePar;
    }

    /** « Annulée » ou vide : l'etat s'imprime en clair, une ordonnance annulee ne doit pas se lire comme les autres. */
    public String getEtat() {
        return "annulee".equals(statut) ? "Annulée" : "";
    }

    /** Etat de service (22/09) : servie, partielle, non_servie, a_renseigner. */
    private String etatService;

    public OrdonnanceLigneDTO etatService(String etatService) {
        this.etatService = etatService;
        return this;
    }

    public String getEtatService() {
        return etatService;
    }

    /** Libelle imprime de l'etat de service ; vide pour une annulee, dont l'etat dit deja tout. */
    public String getServiceLibelle() {
        if ("annulee".equals(statut) || etatService == null) {
            return "";
        }
        switch (etatService) {
        case "servie":
            return "Servie";
        case "partielle":
            return "Partielle";
        case "non_servie":
            return "Non servie";
        default:
            return "À renseigner";
        }
    }
}
