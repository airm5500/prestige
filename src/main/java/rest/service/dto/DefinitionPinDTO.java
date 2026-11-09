package rest.service.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Plan du 08/11, point 14 : definition du code PIN du badge depuis Mon compte (mot de passe actuel exige). Ni le mot de
 * passe ni le code ne sont traces.
 */
@Getter
@Setter
@NoArgsConstructor
public class DefinitionPinDTO {

    private String motDePasse;
    private String pin;
}
