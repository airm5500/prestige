package rest.service.dto;

/**
 * Ligne de l'edition « stock avec reserve » (evolution 5, point 4), partagee par les deux ecrans de stock : «
 * comparaison stock article » et « etat de stock ».
 *
 * <p>
 * Les trois quantites sont portees separement - rayon, reserve et total - et les valorisations sont calculees sur le
 * TOTAL, seule quantite qui represente ce que l'officine detient reellement sur l'emplacement. Le modele Jasper ne
 * calcule rien : il met en page ce que cette classe a deja etabli.
 * </p>
 */
public class StockReserveLigneDTO {

    private String code;
    private String libelle;
    private String emplacement;
    private String famille;
    private int rayon;
    private int reserve;
    private int prixAchat;
    private int prixVente;

    public StockReserveLigneDTO() {
    }

    public StockReserveLigneDTO(String code, String libelle, String emplacement, String famille, int rayon, int reserve,
            int prixAchat, int prixVente) {
        this.code = code;
        this.libelle = libelle;
        this.emplacement = emplacement;
        this.famille = famille;
        this.rayon = rayon;
        this.reserve = reserve;
        this.prixAchat = prixAchat;
        this.prixVente = prixVente;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getEmplacement() {
        return emplacement;
    }

    public void setEmplacement(String emplacement) {
        this.emplacement = emplacement;
    }

    public String getFamille() {
        return famille;
    }

    public void setFamille(String famille) {
        this.famille = famille;
    }

    public int getRayon() {
        return rayon;
    }

    public void setRayon(int rayon) {
        this.rayon = rayon;
    }

    public int getReserve() {
        return reserve;
    }

    public void setReserve(int reserve) {
        this.reserve = reserve;
    }

    public int getPrixAchat() {
        return prixAchat;
    }

    public void setPrixAchat(int prixAchat) {
        this.prixAchat = prixAchat;
    }

    public int getPrixVente() {
        return prixVente;
    }

    public void setPrixVente(int prixVente) {
        this.prixVente = prixVente;
    }

    /** Total detenu sur l'emplacement : rayon plus reserve. Calcule, donc toujours coherent avec ses deux termes. */
    public int getTotal() {
        return rayon + reserve;
    }

    /** Valorisation d'achat du total detenu (et non du seul rayon). */
    public long getValeurAchat() {
        return (long) getTotal() * prixAchat;
    }

    /** Valorisation de vente du total detenu. */
    public long getValeurVente() {
        return (long) getTotal() * prixVente;
    }
}
