package commonTasks.dto;

/**
 * Ligne produit de la classification ABC (Lot 1).
 *
 * Les noms de getters correspondent aux clefs JSON attendues par la grille
 * ExtJS et la specification (section 11).
 */
public class AbcProduitDTO {

    private String produitId;
    private String cip;
    private String ean;
    private String libelle;
    private String classe;
    private String famille;
    private String rayon;
    private String codeGeoArticle;
    private String grossisteId;
    private int stockDisponible;
    private int seuilMini;
    private int quantiteReappro;
    private long quantiteVendue;
    private long chiffreAffaires;
    private long marge;
    private double partPourcentage;
    private double cumulPourcentage;
    private Integer q1;
    private Integer q2;
    private Integer q3;
    private String uniteCalcul;
    /** Consommation (equivalent boite) par mois : index 0 = mois courant, 1 = M-1, ... */
    private long[] consoMois;

    public String getProduitId() {
        return produitId;
    }

    public void setProduitId(String produitId) {
        this.produitId = produitId;
    }

    public String getCip() {
        return cip;
    }

    public void setCip(String cip) {
        this.cip = cip;
    }

    public String getEan() {
        return ean;
    }

    public void setEan(String ean) {
        this.ean = ean;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getClasse() {
        return classe;
    }

    public void setClasse(String classe) {
        this.classe = classe;
    }

    public String getFamille() {
        return famille;
    }

    public void setFamille(String famille) {
        this.famille = famille;
    }

    public String getRayon() {
        return rayon;
    }

    public void setRayon(String rayon) {
        this.rayon = rayon;
    }

    public String getCodeGeoArticle() {
        return codeGeoArticle;
    }

    public void setCodeGeoArticle(String codeGeoArticle) {
        this.codeGeoArticle = codeGeoArticle;
    }

    public String getGrossisteId() {
        return grossisteId;
    }

    public void setGrossisteId(String grossisteId) {
        this.grossisteId = grossisteId;
    }

    public int getStockDisponible() {
        return stockDisponible;
    }

    public void setStockDisponible(int stockDisponible) {
        this.stockDisponible = stockDisponible;
    }

    public int getSeuilMini() {
        return seuilMini;
    }

    public void setSeuilMini(int seuilMini) {
        this.seuilMini = seuilMini;
    }

    public int getQuantiteReappro() {
        return quantiteReappro;
    }

    public void setQuantiteReappro(int quantiteReappro) {
        this.quantiteReappro = quantiteReappro;
    }

    public long getQuantiteVendue() {
        return quantiteVendue;
    }

    public void setQuantiteVendue(long quantiteVendue) {
        this.quantiteVendue = quantiteVendue;
    }

    public long getChiffreAffaires() {
        return chiffreAffaires;
    }

    public void setChiffreAffaires(long chiffreAffaires) {
        this.chiffreAffaires = chiffreAffaires;
    }

    public long getMarge() {
        return marge;
    }

    public void setMarge(long marge) {
        this.marge = marge;
    }

    public double getPartPourcentage() {
        return partPourcentage;
    }

    public void setPartPourcentage(double partPourcentage) {
        this.partPourcentage = partPourcentage;
    }

    public double getCumulPourcentage() {
        return cumulPourcentage;
    }

    public void setCumulPourcentage(double cumulPourcentage) {
        this.cumulPourcentage = cumulPourcentage;
    }

    public Integer getQ1() {
        return q1;
    }

    public void setQ1(Integer q1) {
        this.q1 = q1;
    }

    public Integer getQ2() {
        return q2;
    }

    public void setQ2(Integer q2) {
        this.q2 = q2;
    }

    public Integer getQ3() {
        return q3;
    }

    public void setQ3(Integer q3) {
        this.q3 = q3;
    }

    public String getUniteCalcul() {
        return uniteCalcul;
    }

    public void setUniteCalcul(String uniteCalcul) {
        this.uniteCalcul = uniteCalcul;
    }

    public long[] getConsoMois() {
        return consoMois;
    }

    public void setConsoMois(long[] consoMois) {
        this.consoMois = consoMois;
    }
}
