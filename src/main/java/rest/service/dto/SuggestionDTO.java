
package rest.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * @author koben
 */
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class SuggestionDTO {
    private long montantAchat;
    private long montantVente;
    private String id;
    private String grossisteId;
    private SuggestionOrderDetailDTO item;
}
