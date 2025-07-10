package rest.service.dto;

/**
 *
 * @author koben
 */
public class EtatProduit {
    private int enSuggestion;
    private int enCommande;
    private int entree;

    public int getEnSuggestion() {
        return enSuggestion;
    }

    public void setEnSuggestion(int enSuggestion) {
        this.enSuggestion = enSuggestion;
    }

    public int getEnCommande() {
        return enCommande;
    }

    public void setEnCommande(int enCommande) {
        this.enCommande = enCommande;
    }

    public int getEntree() {
        return entree;
    }

    public void setEntree(int entree) {
        this.entree = entree;
    }

}
