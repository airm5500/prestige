package rest.service.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Page du journal d'activite : lignes de la page, total filtre, compteurs par type sur la periode. */
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class ActiviteJournalDTO {

    private long total;
    private List<ActiviteLigneDTO> lignes;
    private List<ActiviteCompteurDTO> compteurs;
}
