package rest.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 *
 * @author koben
 */
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class TransactionDTO {

    private final String id;
    private final Integer montant;
    private final Integer montantRestant;
    private final Integer montantRegle;
    private final Integer montantCredit;
    private final Integer montantVerse;

    private final Integer montantNet;

    private final Integer montantRemise;

    private final Integer montantPaye;

    private final Integer montantAcc;

    private final Boolean checked;

    private final CodeInfo reglement;

    private final Integer montantTva;

    private final Integer marge;

    private final Integer margeug;

    private final Integer montantttcug;

    private final Integer montantnetug;

    private final Integer montantTvaUg;

    private final String preenregistrement;

    private final Boolean flaged;

    private final int montantflag;

    private final Integer cmuAmount;
}
