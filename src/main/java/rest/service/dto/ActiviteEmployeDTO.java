package rest.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Employe (utilisateur de Prestige) proposé dans les filtres. */
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class ActiviteEmployeDTO {

    private String id;
    private String nom;
    private boolean actif;
}
