package rest.service.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/** Demandes serveur (43) : gabarit d'empreinte d'un employe, tel que le lit un terminal de pointage. */
@Getter
@Setter
@Builder
public class EmpreinteDTO {

    private String id;
    private String employeId;
    private String format;
    private String capteur;
    private String doigt;
    /** gabarit dechiffre, en base64 (jamais journalise) */
    private String modele;
    private String dtCreation;
}
