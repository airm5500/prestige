package commonTasks.dto;

import java.io.Serializable;

/**
 * Une ligne de l'onglet « Liste des produits détaillés » du menu Détails : le produit principal, son produit détail
 * s'il existe, la contenance (unités par boîte) et les stocks des deux.
 */
public class ProduitDetailleDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String familleIdPP;
    private String cipPP;
    private String nomPP;
    private long stockPP;
    private String familleIdPD;
    private String cipPD;
    private String nomPD;
    private long contenance;
    private long stockPD;

    public String getFamilleIdPP() {
        return familleIdPP;
    }

    public void setFamilleIdPP(String familleIdPP) {
        this.familleIdPP = familleIdPP;
    }

    public String getCipPP() {
        return cipPP;
    }

    public void setCipPP(String cipPP) {
        this.cipPP = cipPP;
    }

    public String getNomPP() {
        return nomPP;
    }

    public void setNomPP(String nomPP) {
        this.nomPP = nomPP;
    }

    public long getStockPP() {
        return stockPP;
    }

    public void setStockPP(long stockPP) {
        this.stockPP = stockPP;
    }

    public String getFamilleIdPD() {
        return familleIdPD;
    }

    public void setFamilleIdPD(String familleIdPD) {
        this.familleIdPD = familleIdPD;
    }

    public String getCipPD() {
        return cipPD;
    }

    public void setCipPD(String cipPD) {
        this.cipPD = cipPD;
    }

    public String getNomPD() {
        return nomPD;
    }

    public void setNomPD(String nomPD) {
        this.nomPD = nomPD;
    }

    public long getContenance() {
        return contenance;
    }

    public void setContenance(long contenance) {
        this.contenance = contenance;
    }

    public long getStockPD() {
        return stockPD;
    }

    public void setStockPD(long stockPD) {
        this.stockPD = stockPD;
    }
}
