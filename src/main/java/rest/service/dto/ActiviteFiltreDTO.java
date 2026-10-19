package rest.service.dto;

import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Filtres communs du journal et des analyses « Activité des équipes ». */
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class ActiviteFiltreDTO {

    private LocalDate debut;
    private LocalDate fin;
    /** vide : tous les employes */
    private String employeId;
    /** vide : tous les types */
    private String type;
    /** recherche dans la reference et le detail */
    private String recherche;
    private int start;
    private int limit;
}
