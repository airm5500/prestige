package rest.service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 *
 * @author koben
 */
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class BonsDTO {

    private String strREFBON;
    private String refBonBase;
    private int intPERCENT;
    private int intPRICE;
    private String userFullName;
    private String dtUPDATED;
    private String heure;
    private Integer intPRICERESTE;
    private String strSTATUTFACTURE;
    private String tiersPayantLibelle;
    private String tiersPayantId;
    private String clientFullName;
    private String beneficiaireFullName;
    private String strREF;
    private String strNUMEROSECURITESOCIAL;
    private String lg_PREENREGISTREMENT_ID;
    private String typeTiersPayant;

}
