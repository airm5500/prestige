package rest.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Une action d'un employe dans le journal « Activité des équipes ». Aucune donnee de client. */
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class ActiviteLigneDTO {

    /** dd/MM/yyyy HH:mm */
    private String date;
    /** code du type (VENTE, PREVENTE, ANNULATION...) */
    private String type;
    private String libelleType;
    private String employeId;
    private String employe;
    private String reference;
    private Long montant;
    private String detail;
}
