
package rest.service.dto;

import commonTasks.dto.TiersPayantDTO;
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
public class VenteTiersPayantItemDTO {
    private final String id;

    private final Integer intPERCENT;

    private final Integer intPRICE;

    private final Integer intPRICERESTE;

    private final String strSTATUTFACTURE;

    private final String strREFBON;

    private final TiersPayantDTO tiersPayant;

    private final String lgPREENREGISTREMENTID;
}
