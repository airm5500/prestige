package rest.service.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Demande du 16/10 : contenu lu du QR code d'un badge RH ({@code PRESTIGE-BADGE|1|numero|login|secret}) pour se
 * connecter. Porte le secret du badge : ne jamais le tracer.
 */
@Getter
@Setter
@NoArgsConstructor
public class ConnexionBadgeDTO {

    private String contenu;

    /** Plan du 08/11, point 14 : code PIN tape apres le badge (si le parametre le demande). Jamais trace. */
    private String pin;
}
