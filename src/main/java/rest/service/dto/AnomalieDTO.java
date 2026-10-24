package rest.service.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/** Anomalie remontee par le navigateur (retour du 24/10) : refus affiche a l'employe ou erreur du logiciel. */
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class AnomalieDTO {

    /** REFUS ou LOGICIEL */
    private String famille;
    /** titre du message, type d'erreur */
    private String code;
    private String message;
    private String ecran;
    /** dernieres actions de l'employe (ecrans, boutons, codes scannes), les plus anciennes d'abord */
    private List<String> fil;
}
