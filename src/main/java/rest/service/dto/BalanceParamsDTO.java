package rest.service.dto;

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
public class BalanceParamsDTO {

    private String dtStart;
    private String dtEnd;
    private boolean checked;
    private String emplacementId;
    private Boolean excludeSome;
    private boolean toPrint;
    @Builder.Default
    private boolean excludeStatement = true;
    @Builder.Default
    private boolean flagedStatement = true;
    private boolean removeUg;
    private boolean vnoOnly;
    private boolean byDay;
    private boolean byMonth;
    private boolean showAllAmount;
    private String query;
    private int start;
    private int limi;
    private boolean all;
}
