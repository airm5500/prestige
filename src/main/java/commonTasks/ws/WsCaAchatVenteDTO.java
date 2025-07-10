package commonTasks.ws;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 *
 * @author koben
 */
public class WsCaAchatVenteDTO {

    private final String type;

    private final LocalDate mvtDay;
    private final BigDecimal montant;

    public WsCaAchatVenteDTO(String type, LocalDate mvtDay, BigDecimal montant) {
        this.type = type;
        this.mvtDay = mvtDay;
        this.montant = montant;

    }

    public String getType() {
        return type;
    }

    public LocalDate getMvtDay() {
        return mvtDay;
    }

    public BigDecimal getMontant() {
        return montant;
    }

}
