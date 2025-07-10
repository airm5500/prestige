package commonTasks.ws;

import java.math.BigDecimal;

/**
 *
 * @author koben
 */
public class WsCaAchatVente {
    private final String dateMvt;
    private final BigDecimal montantVente;
    private final BigDecimal montantAchat;

    public WsCaAchatVente(String dateMvt, BigDecimal montantVente, BigDecimal montantAchat) {
        this.dateMvt = dateMvt;
        this.montantVente = montantVente;
        this.montantAchat = montantAchat;
    }

    public String getDateMvt() {
        return dateMvt;
    }

    public BigDecimal getMontantVente() {
        return montantVente;
    }

    public BigDecimal getMontantAchat() {
        return montantAchat;
    }

}
