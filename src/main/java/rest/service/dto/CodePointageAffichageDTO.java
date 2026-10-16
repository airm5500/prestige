package rest.service.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 * Demande du 16/10 : QR de pointage mobile affiche sur la page de connexion des postes de l'officine. Le code et son
 * delai seulement (ni position, ni reglages).
 */
@Getter
@Setter
@Builder
public class CodePointageAffichageDTO {

    private boolean success;
    /** pointage mobile actif et QR exige : sinon le bouton est masque */
    private boolean actif;
    private String contenu;
    private String code;
    private Integer resteSec;
    private Integer periodeSec;
    private String msg;
}
