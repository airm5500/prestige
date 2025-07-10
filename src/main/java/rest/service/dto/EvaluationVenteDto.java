package rest.service.dto;

/**
 *
 * @author koben
 */
public class EvaluationVenteDto {

    private String id;
    private String codeCip;
    private String libelle;
    private String grossisteId;
    private int stock;
    private float moyenne;
    private int quantiteVendue;
    private int quantiteVendueCurrentMonth;
    private int totalvente;
    private int totalAchat;
    private int quantiteVendueMonthMinusOne;
    private int quantiteVendueMonthMinusTwo;
    private int quantiteVendueMonthMinusThree;

    public String getGrossisteId() {
        return grossisteId;
    }

    public void setGrossisteId(String grossisteId) {
        this.grossisteId = grossisteId;
    }

    public String getCodeCip() {
        return codeCip;
    }

    public void setCodeCip(String codeCip) {
        this.codeCip = codeCip;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public int getStock() {
        return stock;
    }

    public void setStock(int stock) {
        this.stock = stock;
    }

    public float getMoyenne() {
        return moyenne;
    }

    public void setMoyenne(float moyenne) {
        this.moyenne = moyenne;
    }

    public int getQuantiteVendue() {
        return quantiteVendue;
    }

    public void setQuantiteVendue(int quantiteVendue) {
        this.quantiteVendue = quantiteVendue;
    }

    public int getQuantiteVendueCurrentMonth() {
        return quantiteVendueCurrentMonth;
    }

    public void setQuantiteVendueCurrentMonth(int quantiteVendueCurrentMonth) {
        this.quantiteVendueCurrentMonth = quantiteVendueCurrentMonth;
    }

    public int getTotalvente() {
        return totalvente;
    }

    public void setTotalvente(int totalvente) {
        this.totalvente = totalvente;
    }

    public int getTotalAchat() {
        return totalAchat;
    }

    public void setTotalAchat(int totalAchat) {
        this.totalAchat = totalAchat;
    }

    public int getQuantiteVendueMonthMinusOne() {
        return quantiteVendueMonthMinusOne;
    }

    public void setQuantiteVendueMonthMinusOne(int quantiteVendueMonthMinusOne) {
        this.quantiteVendueMonthMinusOne = quantiteVendueMonthMinusOne;
    }

    public int getQuantiteVendueMonthMinusTwo() {
        return quantiteVendueMonthMinusTwo;
    }

    public void setQuantiteVendueMonthMinusTwo(int quantiteVendueMonthMinusTwo) {
        this.quantiteVendueMonthMinusTwo = quantiteVendueMonthMinusTwo;
    }

    public int getQuantiteVendueMonthMinusThree() {
        return quantiteVendueMonthMinusThree;
    }

    public void setQuantiteVendueMonthMinusThree(int quantiteVendueMonthMinusThree) {
        this.quantiteVendueMonthMinusThree = quantiteVendueMonthMinusThree;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

}
