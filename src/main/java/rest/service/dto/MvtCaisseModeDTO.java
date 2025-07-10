
package rest.service.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 *
 * @author koben
 */
@Getter
@Setter
@Builder
public class MvtCaisseModeDTO {
    private String modeReglement;
    private long montant;
}
