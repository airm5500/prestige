package rest.service.fne;

import java.util.List;

/**
 *
 * @author koben
 */
public class FneResponseInvoice {

    private String id;
    private String token;
    private String reference;
    private String type;
    private String subtype;
    private String date;
    private String paymentMethod;
    private Long amount;
    private Integer fiscalStamp;
    private Integer vatAmount;
    private Integer discount;
    private String clientNcc;
    private String clientCompanyName;
    private String clientPhone;
    private String clientEmail;
    private String clientTerminal;
    private String clientRccm;
    private String clientSellerName;
    private String clientEstablishment;
    private String clientPointOfSale;
    private String status;
    private String createdAt;
    private List<FneResponseInvoiceItem> items;

    public List<FneResponseInvoiceItem> getItems() {
        return items;
    }

    public void setItems(List<FneResponseInvoiceItem> items) {
        this.items = items;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getSubtype() {
        return subtype;
    }

    public void setSubtype(String subtype) {
        this.subtype = subtype;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public Long getAmount() {
        return amount;
    }

    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public Integer getFiscalStamp() {
        return fiscalStamp;
    }

    public void setFiscalStamp(Integer fiscalStamp) {
        this.fiscalStamp = fiscalStamp;
    }

    public Integer getVatAmount() {
        return vatAmount;
    }

    public void setVatAmount(Integer vatAmount) {
        this.vatAmount = vatAmount;
    }

    public Integer getDiscount() {
        return discount;
    }

    public void setDiscount(Integer discount) {
        this.discount = discount;
    }

    public String getClientNcc() {
        return clientNcc;
    }

    public void setClientNcc(String clientNcc) {
        this.clientNcc = clientNcc;
    }

    public String getClientCompanyName() {
        return clientCompanyName;
    }

    public void setClientCompanyName(String clientCompanyName) {
        this.clientCompanyName = clientCompanyName;
    }

    public String getClientPhone() {
        return clientPhone;
    }

    public void setClientPhone(String clientPhone) {
        this.clientPhone = clientPhone;
    }

    public String getClientEmail() {
        return clientEmail;
    }

    public void setClientEmail(String clientEmail) {
        this.clientEmail = clientEmail;
    }

    public String getClientTerminal() {
        return clientTerminal;
    }

    public void setClientTerminal(String clientTerminal) {
        this.clientTerminal = clientTerminal;
    }

    public String getClientRccm() {
        return clientRccm;
    }

    public void setClientRccm(String clientRccm) {
        this.clientRccm = clientRccm;
    }

    public String getClientSellerName() {
        return clientSellerName;
    }

    public void setClientSellerName(String clientSellerName) {
        this.clientSellerName = clientSellerName;
    }

    public String getClientEstablishment() {
        return clientEstablishment;
    }

    public void setClientEstablishment(String clientEstablishment) {
        this.clientEstablishment = clientEstablishment;
    }

    public String getClientPointOfSale() {
        return clientPointOfSale;
    }

    public void setClientPointOfSale(String clientPointOfSale) {
        this.clientPointOfSale = clientPointOfSale;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public String toString() {
        return "FneResponseInvoice{" + "id=" + id + ", token=" + token + ", reference=" + reference + ", type=" + type
                + ", subtype=" + subtype + ", date=" + date + ", paymentMethod=" + paymentMethod + ", amount=" + amount
                + ", fiscalStamp=" + fiscalStamp + ", vatAmount=" + vatAmount + ", discount=" + discount
                + ", clientNcc=" + clientNcc + ", clientCompanyName=" + clientCompanyName + ", clientPhone="
                + clientPhone + ", clientEmail=" + clientEmail + ", clientTerminal=" + clientTerminal + ", clientRccm="
                + clientRccm + ", clientSellerName=" + clientSellerName + ", clientEstablishment=" + clientEstablishment
                + ", clientPointOfSale=" + clientPointOfSale + ", status=" + status + ", createdAt=" + createdAt
                + ", items=" + items + '}';
    }

}
