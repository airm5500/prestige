package rest.service.dto;

/**
 * Ligne de la valorisation d'un depot ventilee par EMPLACEMENT des articles (retour du 17/09).
 *
 * <p>
 * « Emplacement » designe le rayon de l'article ({@code t_zone_geographique}) et non le depot : le depot, lui, est deja
 * choisi. Deux grandeurs distinctes cohabitent sur une ligne, et l'officine a eu raison de demander a quoi servait la
 * seconde : {@code articles} compte les REFERENCES presentes dans le rayon, {@code unites} additionne les QUANTITES
 * detenues. Un rayon peut porter 40 references pour 900 unites ; les deux chiffres ne disent pas la meme chose et aucun
 * ne se deduit de l'autre.
 */
public class DepotEmplacementLigneDTO {

    private String emplacement;
    private int articles;
    private int unites;
    private long valeurAchat;
    private long valeurVente;

    public DepotEmplacementLigneDTO() {
    }

    public DepotEmplacementLigneDTO(String emplacement, int articles, int unites, long valeurAchat, long valeurVente) {
        this.emplacement = emplacement;
        this.articles = articles;
        this.unites = unites;
        this.valeurAchat = valeurAchat;
        this.valeurVente = valeurVente;
    }

    public String getEmplacement() {
        return emplacement;
    }

    public void setEmplacement(String emplacement) {
        this.emplacement = emplacement;
    }

    public int getArticles() {
        return articles;
    }

    public void setArticles(int articles) {
        this.articles = articles;
    }

    public int getUnites() {
        return unites;
    }

    public void setUnites(int unites) {
        this.unites = unites;
    }

    public long getValeurAchat() {
        return valeurAchat;
    }

    public void setValeurAchat(long valeurAchat) {
        this.valeurAchat = valeurAchat;
    }

    public long getValeurVente() {
        return valeurVente;
    }

    public void setValeurVente(long valeurVente) {
        this.valeurVente = valeurVente;
    }
}
