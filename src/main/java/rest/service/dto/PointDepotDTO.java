
package rest.service.dto;

import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 *
 * @author airman
 */
@Builder
@Getter
@Setter
public class PointDepotDTO {
    private Long montantTotalNet;
    private Long credit;
    private Long especes;
    private String caissiere;
    private String depot;
    private String dateTransaction; // Peut être une date ou une période
}
