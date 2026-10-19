package rest.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Nombre d'actions d'un type sur la periode (pastilles du journal). */
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class ActiviteCompteurDTO {

    private String type;
    private String libelle;
    private long nombre;
}
