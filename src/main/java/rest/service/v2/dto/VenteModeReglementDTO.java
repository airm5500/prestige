package rest.service.v2.dto;

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
public class VenteModeReglementDTO {

    private int mobile;
    private int espece;
    private int carteBancaire;
    private int cheque;
    private int differe;
    private int virement;
}
