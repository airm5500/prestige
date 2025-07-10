package rest.service.dto;

/**
 *
 * @author koben
 */
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class SuggestionOrderDetailDTO {

    private String familleId;
    private String suggestionId;
    private Integer qte;
    private String itemId;
    private Integer seuil;
    private Integer prixPaf;
    private Integer prixVente;

}
