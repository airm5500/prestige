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
public class BonsParam {

    private boolean all;
    private boolean showAllAmount;
    private String dtStart;
    private String dtEnd;
    private String hStart;
    private String hEnd;
    private String search;
    private String tiersPayantId;
    private int start;
    private int limit;
    private String emplacementId;

}
