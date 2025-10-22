package rest.service.fne;

import java.util.ArrayList;
import java.util.List;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
public class FneInvoice {

    private final String invoiceType = "sale";
    private final String paymentMethod = "check";
    private final String template = "B2B";

    @NotNull
    private String clientNcc;
    @NotNull
    private String clientCompanyName;
    @NotNull
    private String clientPhone;

    @NotNull
    private String clientEmail;

    @NotNull
    private String pointOfSale;

    @NotNull
    private String establishment;

    private String commercialMessage;

    private String footer;

    private List<FneInvoiceItem> items = new ArrayList<>();

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

    public String getPointOfSale() {
        return pointOfSale;
    }

    public void setPointOfSale(String pointOfSale) {
        this.pointOfSale = pointOfSale;
    }

    public String getEstablishment() {
        return establishment;
    }

    public void setEstablishment(String establishment) {
        this.establishment = establishment;
    }

    public String getCommercialMessage() {
        return commercialMessage;
    }

    public void setCommercialMessage(String commercialMessage) {
        this.commercialMessage = commercialMessage;
    }

    public String getFooter() {
        return footer;
    }

    public void setFooter(String footer) {
        this.footer = footer;
    }

    public List<FneInvoiceItem> getItems() {
        return items;
    }

    public void setItems(List<FneInvoiceItem> items) {
        this.items = items;
    }

    public String getInvoiceType() {
        return invoiceType;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public String getTemplate() {
        return template;
    }

}
