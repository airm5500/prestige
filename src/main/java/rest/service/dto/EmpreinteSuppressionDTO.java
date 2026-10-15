package rest.service.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/** Demandes serveur (43) : gabarit retire (suppression ou employe devenu inactif), a effacer sur le terminal. */
@Getter
@Setter
@Builder
public class EmpreinteSuppressionDTO {

    private String id;
    private String employeId;
    private String dtSuppression;
}
