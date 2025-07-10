
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
public class PreenregistrementCompteClientDTO {
    private final String id;

    private final String dtUPDATED;

    private final Integer intPRICE;

    private final Integer intPRICERESTE;

    private final String lgPREENREGISTREMENTID;
}
