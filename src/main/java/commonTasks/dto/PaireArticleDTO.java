package commonTasks.dto;

import java.io.Serializable;

/**
 * Deux produits presents sur les memes tickets : combien de fois ensemble, et la part que cela represente pour chacun.
 */
public class PaireArticleDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String produit1Id = "";
    private String cip1 = "";
    private String libelle1 = "";
    private String produit2Id = "";
    private String cip2 = "";
    private String libelle2 = "";
    /** Tickets portant les deux produits. */
    private long tickets;
    /** Tickets portant le produit 1 (resp. 2), tous confondus. */
    private long tickets1;
    private long tickets2;

    public PaireArticleDTO() {
    }

    public PaireArticleDTO(String produit1Id, String cip1, String libelle1, String produit2Id, String cip2,
            String libelle2, long tickets) {
        this.produit1Id = produit1Id;
        this.cip1 = cip1;
        this.libelle1 = libelle1;
        this.produit2Id = produit2Id;
        this.cip2 = cip2;
        this.libelle2 = libelle2;
        this.tickets = tickets;
    }

    /** Part des tickets du produit 1 qui contiennent aussi le produit 2, en %. */
    public double getPart1() {
        return tickets1 > 0 ? Math.round(tickets * 1000D / tickets1) / 10D : 0D;
    }

    public double getPart2() {
        return tickets2 > 0 ? Math.round(tickets * 1000D / tickets2) / 10D : 0D;
    }

    public String getProduit1Id() {
        return produit1Id;
    }

    public String getCip1() {
        return cip1;
    }

    public String getLibelle1() {
        return libelle1;
    }

    public String getProduit2Id() {
        return produit2Id;
    }

    public String getCip2() {
        return cip2;
    }

    public String getLibelle2() {
        return libelle2;
    }

    public long getTickets() {
        return tickets;
    }

    public long getTickets1() {
        return tickets1;
    }

    public void setTickets1(long tickets1) {
        this.tickets1 = tickets1;
    }

    public long getTickets2() {
        return tickets2;
    }

    public void setTickets2(long tickets2) {
        this.tickets2 = tickets2;
    }
}
