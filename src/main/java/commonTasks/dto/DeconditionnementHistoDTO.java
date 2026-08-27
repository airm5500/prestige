package commonTasks.dto;

import java.io.Serializable;

/**
 * Une ligne de l'onglet « Historique des déconditionnements » du menu Détails : le mouvement du produit principal
 * (chapeau), le produit détail alimenté, les stocks du principal avant et après, et l'opérateur.
 */
public class DeconditionnementHistoDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String date;
    private String codeCh;
    private String nomCh;
    private long qteDet;
    private String codeDet;
    private String nomDet;
    private long stockAvant;
    private long stockApres;
    private String utilisateur;

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getCodeCh() {
        return codeCh;
    }

    public void setCodeCh(String codeCh) {
        this.codeCh = codeCh;
    }

    public String getNomCh() {
        return nomCh;
    }

    public void setNomCh(String nomCh) {
        this.nomCh = nomCh;
    }

    public long getQteDet() {
        return qteDet;
    }

    public void setQteDet(long qteDet) {
        this.qteDet = qteDet;
    }

    public String getCodeDet() {
        return codeDet;
    }

    public void setCodeDet(String codeDet) {
        this.codeDet = codeDet;
    }

    public String getNomDet() {
        return nomDet;
    }

    public void setNomDet(String nomDet) {
        this.nomDet = nomDet;
    }

    public long getStockAvant() {
        return stockAvant;
    }

    public void setStockAvant(long stockAvant) {
        this.stockAvant = stockAvant;
    }

    public long getStockApres() {
        return stockApres;
    }

    public void setStockApres(long stockApres) {
        this.stockApres = stockApres;
    }

    public String getUtilisateur() {
        return utilisateur;
    }

    public void setUtilisateur(String utilisateur) {
        this.utilisateur = utilisateur;
    }
}
