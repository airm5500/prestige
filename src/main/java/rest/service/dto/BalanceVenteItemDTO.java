package rest.service.dto;

import dal.enumeration.TypeTransaction;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 *
 * @author koben
 */
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class BalanceVenteItemDTO {

    private LocalDate mvtDate;
    private String typeVente;
    private String typeReglement;
    private BigDecimal montantAchat;
    private BigDecimal montantTva;
    private BigDecimal montantUg;
    private BigDecimal montantRemise;
    private TypeTransaction typeTransaction;
    private BigDecimal montantTTC;
    private BigDecimal montantNet;
    private BigDecimal montantCredit;
    private BigDecimal montantRegle;
    private BigDecimal montantPaye;
    private BigDecimal montantDiffere;
    private BigDecimal montantTTCDetatil;
    private BigDecimal montantAchatUg;
    private BigDecimal montantRemiseDetail;
    private int totalVente;
    private BigDecimal montantAcc;
    private String typeMvtCaisse;
    private BigDecimal montantNetUg;
    private BigDecimal montantTvaUg;
    private BigDecimal margeUg;
    private BigDecimal montantTTCDetatilToRemove;
    private BigDecimal flagedAmount;
    private BigDecimal montantTTCDetatilReal;
    private long montantAchatDetatilToRemove;

}
