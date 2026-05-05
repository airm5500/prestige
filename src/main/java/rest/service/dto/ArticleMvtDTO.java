package rest.service.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ArticleMvtDTO {

    private String lgFamilleId; // VARCHAR
    private String codeCip; // VARCHAR
    private String strName; // VARCHAR
    private Integer prixVente; // INT
    private Integer prixAchat; // INT
}
