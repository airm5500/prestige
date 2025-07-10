package rest.service.dto;

import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author koben
 */
public class TicketRecapWrapper {

    private List<TicketRecap> datas = new ArrayList<>();
    private List<ModePaymentAmount> totaux = new ArrayList<>();

    public List<TicketRecap> getDatas() {
        return datas;
    }

    public void setDatas(List<TicketRecap> datas) {
        this.datas = datas;
    }

    public List<ModePaymentAmount> getTotaux() {
        return totaux;
    }

    public void setTotaux(List<ModePaymentAmount> totaux) {
        this.totaux = totaux;
    }

}
