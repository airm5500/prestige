package rest.service.fne;

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
    private Double amount;
    private Double fiscalStamp;
    private Double vatAmount;
    private Double totalTaxes;
    private Double totalAfterTaxes;
    private Double totalDue;
    private Double discount;
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
    // private List<FneResponseInvoiceItem> items;

    // public List<FneResponseInvoiceItem> getItems() {
    // return items;
    // }
    //
    // public void setItems(List<FneResponseInvoiceItem> items) {
    // this.items = items;
    // }

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

    public Double getAmount() {
        return amount;
    }

    public void setAmount(Double amount) {
        this.amount = amount;
    }

    public Double getFiscalStamp() {
        return fiscalStamp;
    }

    public void setFiscalStamp(Double fiscalStamp) {
        this.fiscalStamp = fiscalStamp;
    }

    public Double getVatAmount() {
        return vatAmount;
    }

    public void setVatAmount(Double vatAmount) {
        this.vatAmount = vatAmount;
    }

    public Double getTotalTaxes() {
        return totalTaxes;
    }

    public void setTotalTaxes(Double totalTaxes) {
        this.totalTaxes = totalTaxes;
    }

    public Double getTotalAfterTaxes() {
        return totalAfterTaxes;
    }

    public void setTotalAfterTaxes(Double totalAfterTaxes) {
        this.totalAfterTaxes = totalAfterTaxes;
    }

    public Double getTotalDue() {
        return totalDue;
    }

    public void setTotalDue(Double totalDue) {
        this.totalDue = totalDue;
    }

    public Double getDiscount() {
        return discount;
    }

    public void setDiscount(Double discount) {
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

    /*
     * { "ncc": "1428351F", "reference": "1428351F26000000010", "token":
     * "http://54.247.95.108/fr/verification/019bcc6f-f63c-7226-b8b1-93f9789fc2c9", "warning": false, "balance_funds":
     * 5700, "invoice": { "id": "b7e43291-1566-4198-87d5-ac43158f0176", "parentId": null, "parentReference": null,
     * "token": "019bcc6f-f63c-7226-b8b1-93f9789fc2c9", "reference": "1428351F26000000010", "type": "invoice",
     * "subtype": "normal", "date": "2026-01-17T14:50:48.203Z", "paymentMethod": "check", "amount": 10810.8,
     * "vatAmount": 1378.8, "fiscalStamp": 0, "discount": null, "totalBeforeTaxes": 9432, "totalDiscounted": 0,
     * "totalTaxes": 1378.8, "totalAfterTaxes": 10810.8, "totalCustomTaxes": 0, "totalDue": 10810.8, "clientNcc":
     * "1428351F", "clientCompanyName": "MUGEF CI", "clientPhone": "101010101", "clientEmail": "", "clientTerminal":
     * null, "clientMerchantName": null, "clientRccm": "CI-ABJ-03-2014-B12-12830", "clientSellerName": null,
     * "clientEstablishment": "GRANCE PHARMACIE DU COMMERCE-PLATEAU", "clientPointOfSale": "PHARMACIE",
     * "clientTaxRegime": "RNI", "status": "paid", "template": "B2B", "description": null, "footer": null,
     * "commercialMessage": null, "foreignCurrency": null, "foreignCurrencyRate": null, "isRne": false, "rne": null,
     * "source": "api", "createdAt": "2026-01-17T14:50:48.203Z", "updatedAt": "2026-01-17T14:50:48.203Z", "items": [ {
     * "id": "20adaad1-c28e-4ccf-9d9d-95c25dc75d30", "quantity": 1, "reference": "740", "description":
     * "FACTURATION DU 17/01/2026 AU 17/01/2026", "amount": 976, "createdAt": "2026-01-17T14:50:48.203Z", "updatedAt":
     * "2026-01-17T14:50:48.203Z", "taxes": [ { "invoiceItemId": "20adaad1-c28e-4ccf-9d9d-95c25dc75d30", "vatRateId":
     * "a67f826b-063e-4b0e-8fcc-a37c81c5e792", "amount": 0, "name":
     * "TVA exo.lég - Pas de TVA sur HT 00,00% - D (TEE, TCE, Microentreprise)", "shortName": "TVAD", "createdAt":
     * "2026-01-17T14:50:48.203Z", "updatedAt": "2026-01-17T14:50:48.203Z" } ], "customTaxes": [], "invoiceId":
     * "b7e43291-1566-4198-87d5-ac43158f0176", "parentId": null, "discount": null, "measurementUnit": null }, { "id":
     * "be4e049e-ab0a-495e-86c3-a2e8205f8775", "quantity": 1, "reference": "740", "description":
     * "FACTURATION DU 17/01/2026 AU 17/01/2026", "amount": 6864, "createdAt": "2026-01-17T14:50:48.203Z", "updatedAt":
     * "2026-01-17T14:50:48.203Z", "taxes": [ { "invoiceItemId": "be4e049e-ab0a-495e-86c3-a2e8205f8775", "vatRateId":
     * "cdb6c5b2-5f35-407d-b5f6-c712a0792451", "amount": 18, "name": "TVA normal - TVA sur HT 18,00% - A", "shortName":
     * "TVA", "createdAt": "2026-01-17T14:50:48.203Z", "updatedAt": "2026-01-17T14:50:48.203Z" } ], "customTaxes": [],
     * "invoiceId": "b7e43291-1566-4198-87d5-ac43158f0176", "parentId": null, "discount": null, "measurementUnit": null
     * }, { "id": "60f9a1a0-e2fd-4811-bd04-40ee3416b5c2", "quantity": 1, "reference": "740", "description":
     * "FACTURATION DU 17/01/2026 AU 17/01/2026", "amount": 1592, "createdAt": "2026-01-17T14:50:48.203Z", "updatedAt":
     * "2026-01-17T14:50:48.203Z", "taxes": [ { "invoiceItemId": "60f9a1a0-e2fd-4811-bd04-40ee3416b5c2", "vatRateId":
     * "94e4564a-1a8c-4c95-9470-2f69fdf8b4cd", "amount": 9, "name": "TVA réduite - TVA sur HT 09,00% - B", "shortName":
     * "TVAB", "createdAt": "2026-01-17T14:50:48.203Z", "updatedAt": "2026-01-17T14:50:48.203Z" } ], "customTaxes": [],
     * "invoiceId": "b7e43291-1566-4198-87d5-ac43158f0176", "parentId": null, "discount": null, "measurementUnit": null
     * } ], "customTaxes": [] } }
     */
}
