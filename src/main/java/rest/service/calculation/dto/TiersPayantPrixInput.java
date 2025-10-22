package rest.service.calculation.dto;

import dal.PrixReferenceType;

public class TiersPayantPrixInput {
    private Integer price;
    private PrixReferenceType optionPrixType;
    private float rate;
    private String compteTiersPayantId;

    public float getRate() {
        return rate;
    }

    public void setRate(float rate) {
        this.rate = rate;
    }

    public String getCompteTiersPayantId() {
        return compteTiersPayantId;
    }

    public void setCompteTiersPayantId(String compteTiersPayantId) {
        this.compteTiersPayantId = compteTiersPayantId;
    }

    public Integer getPrice() {
        return price;
    }

    public void setPrice(Integer price) {
        this.price = price;
    }

    public PrixReferenceType getOptionPrixType() {
        return optionPrixType;
    }

    public void setOptionPrixType(PrixReferenceType optionPrixType) {
        this.optionPrixType = optionPrixType;
    }

    @Override
    public String toString() {
        return "TiersPayantPrixInput{" + "price=" + price + ", optionPrixType=" + optionPrixType + ", rate=" + rate
                + ", compteTiersPayantId=" + compteTiersPayantId + '}';
    }

}
