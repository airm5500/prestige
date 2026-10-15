package rest.service.dto;

import java.util.List;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 * Demandes serveur (43) : reponse de GET v1/rh/empreintes. horodatage : a renvoyer comme « depuis » a la lecture
 * suivante.
 */
@Getter
@Setter
@Builder
public class EmpreintesLectureDTO {

    private boolean success;
    private String code;
    private String msg;
    private String horodatage;
    private List<EmpreinteDTO> modeles;
    private List<EmpreinteSuppressionDTO> suppressions;
}
