package commonTasks.dto;

import java.io.Serializable;

/**
 * Ligne du registre des ventes ratees, prete pour la grille, l'edition PDF et les exports.
 */
public class VenteRateeDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String id;
    private String familleId;
    private String cip = "";
    private String designation = "";
    private int quantite;
    private String clientId;
    private String nomClient = "";
    private String telephone = "";
    private String motifId;
    private String motif = "";
    private String commentaire = "";
    private boolean commande;
    private String dateCommande = "";
    private String utilisateurCommande = "";
    private boolean rattache;
    private String produitRattache = "";
    private String date = "";
    private String utilisateur = "";
    /** Vrai quand la demande est liee a un produit de la base (des l'origine ou par rattachement). */
    private boolean connu;

    public String getId() {
        return id;
    }

    public VenteRateeDTO setId(String id) {
        this.id = id;
        return this;
    }

    public String getFamilleId() {
        return familleId;
    }

    public VenteRateeDTO setFamilleId(String familleId) {
        this.familleId = familleId;
        return this;
    }

    public String getCip() {
        return cip;
    }

    public VenteRateeDTO setCip(String cip) {
        this.cip = cip;
        return this;
    }

    public String getDesignation() {
        return designation;
    }

    public VenteRateeDTO setDesignation(String designation) {
        this.designation = designation;
        return this;
    }

    public int getQuantite() {
        return quantite;
    }

    public VenteRateeDTO setQuantite(int quantite) {
        this.quantite = quantite;
        return this;
    }

    public String getClientId() {
        return clientId;
    }

    public VenteRateeDTO setClientId(String clientId) {
        this.clientId = clientId;
        return this;
    }

    public String getNomClient() {
        return nomClient;
    }

    public VenteRateeDTO setNomClient(String nomClient) {
        this.nomClient = nomClient;
        return this;
    }

    public String getTelephone() {
        return telephone;
    }

    public VenteRateeDTO setTelephone(String telephone) {
        this.telephone = telephone;
        return this;
    }

    public String getMotifId() {
        return motifId;
    }

    public VenteRateeDTO setMotifId(String motifId) {
        this.motifId = motifId;
        return this;
    }

    public String getMotif() {
        return motif;
    }

    public VenteRateeDTO setMotif(String motif) {
        this.motif = motif;
        return this;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public VenteRateeDTO setCommentaire(String commentaire) {
        this.commentaire = commentaire;
        return this;
    }

    public boolean isCommande() {
        return commande;
    }

    public VenteRateeDTO setCommande(boolean commande) {
        this.commande = commande;
        return this;
    }

    public String getDateCommande() {
        return dateCommande;
    }

    public VenteRateeDTO setDateCommande(String dateCommande) {
        this.dateCommande = dateCommande;
        return this;
    }

    public String getUtilisateurCommande() {
        return utilisateurCommande;
    }

    public VenteRateeDTO setUtilisateurCommande(String utilisateurCommande) {
        this.utilisateurCommande = utilisateurCommande;
        return this;
    }

    public boolean isRattache() {
        return rattache;
    }

    public VenteRateeDTO setRattache(boolean rattache) {
        this.rattache = rattache;
        return this;
    }

    public String getProduitRattache() {
        return produitRattache;
    }

    public VenteRateeDTO setProduitRattache(String produitRattache) {
        this.produitRattache = produitRattache;
        return this;
    }

    public String getDate() {
        return date;
    }

    public VenteRateeDTO setDate(String date) {
        this.date = date;
        return this;
    }

    public String getUtilisateur() {
        return utilisateur;
    }

    public VenteRateeDTO setUtilisateur(String utilisateur) {
        this.utilisateur = utilisateur;
        return this;
    }

    public boolean isConnu() {
        return connu;
    }

    public VenteRateeDTO setConnu(boolean connu) {
        this.connu = connu;
        return this;
    }

    public String getEtat() {
        return commande ? "Commandé" : "Non commandé";
    }
}
