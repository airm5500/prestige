package rest.service.dto;

import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author koben
 */
public class TicketRecap {

    private String user;
    private List<ModePaymentAmount> modePaymentAmounts = new ArrayList<>();
    private List<ModePaymentAmount> totaux = new ArrayList<>();

    public String getUser() {
        return user;
    }

    public List<ModePaymentAmount> getModePaymentAmounts() {
        return modePaymentAmounts;
    }

    public void setModePaymentAmounts(List<ModePaymentAmount> modePaymentAmounts) {
        this.modePaymentAmounts = modePaymentAmounts;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public List<ModePaymentAmount> getTotaux() {
        return totaux;
    }

    public void setTotaux(List<ModePaymentAmount> totaux) {
        this.totaux = totaux;
    }

}
