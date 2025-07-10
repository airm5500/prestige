package rest.service.fne;

import org.json.JSONPropertyName;

/**
 *
 * @author koben
 */
public class FneResponse {

    private String ncc;
    private String reference;
    private String token;
    private Boolean warning;

    private Integer balanceSticker;
    private FneResponseInvoice invoice;

    public String getNcc() {
        return ncc;
    }

    public void setNcc(String ncc) {
        this.ncc = ncc;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Boolean getWarning() {
        return warning;
    }

    public void setWarning(Boolean warning) {
        this.warning = warning;
    }

    @JSONPropertyName("balance_sticker")
    public Integer getBalanceSticker() {
        return balanceSticker;
    }

    public void setBalanceSticker(Integer BalanceSticker) {
        this.balanceSticker = BalanceSticker;
    }

    public FneResponseInvoice getInvoice() {
        return invoice;
    }

    public void setInvoice(FneResponseInvoice invoice) {
        this.invoice = invoice;
    }

    @Override
    public String toString() {
        return "FneResponse{" + "ncc=" + ncc + ", reference=" + reference + ", token=" + token + ", warning=" + warning
                + ", balanceSticker=" + balanceSticker + ", invoice=" + invoice + '}';
    }

}
