package rest.service.dto;

/**
 * Un produit prescrit, avec l'identite de l'ordonnance qui le porte (evolution 6, point 2, vague 3).
 *
 * <p>
 * C'est la forme de l'export Excel : UNE LIGNE PAR PRODUIT, les colonnes de l'ordonnance repetees. L'officine peut
 * ainsi trier, filtrer et faire un tableau croise sur les produits prescrits, ce qu'un fichier a une ligne par
 * ordonnance avec les produits concatenes n'aurait pas permis.
 *
 * <p>
 * Sert aussi a la fiche imprimee, ou seules les colonnes du produit sont utilisees.
 */
public class OrdonnanceProduitDTO {

    private String numero;
    private String date;
    private String client;
    private String typeClient;
    private String medecin;
    private String etablissement;
    private String produit;
    private String cip;
    private int quantite;
    private String posologie;
    private String duree;
    private String statut;
    /** Quantite servie (22/09) : null = pas encore renseignee, distinct de 0 = non servie. */
    private Integer qteServie;

    public OrdonnanceProduitDTO() {
    }

    public OrdonnanceProduitDTO(String numero, String date, String client, String typeClient, String medecin,
            String etablissement, String produit, String cip, int quantite, String posologie, String duree,
            String statut) {
        this.numero = numero;
        this.date = date;
        this.client = client;
        this.typeClient = typeClient;
        this.medecin = medecin;
        this.etablissement = etablissement;
        this.produit = produit;
        this.cip = cip;
        this.quantite = quantite;
        this.posologie = posologie;
        this.duree = duree;
        this.statut = statut;
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

    public String getProduit() {
        return produit;
    }

    public String getCip() {
        return cip;
    }

    public int getQuantite() {
        return quantite;
    }

    public String getPosologie() {
        return posologie;
    }

    public String getDuree() {
        return duree;
    }

    public String getStatut() {
        return statut;
    }

    public String getEtat() {
        return "annulee".equals(statut) ? "Annulée" : "";
    }

    public Integer getQteServie() {
        return qteServie;
    }

    /** Libelle imprime : le nombre, ou un tiret quand le service n'est pas renseigne. */
    public String getQteServieLibelle() {
        return qteServie == null ? "—" : String.valueOf(qteServie);
    }

    public OrdonnanceProduitDTO qteServie(Integer qteServie) {
        this.qteServie = qteServie;
        return this;
    }
}
