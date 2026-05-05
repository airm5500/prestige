package rest.service.dto;

import commonTasks.dto.FamilleDTO;
import dal.TZoneGeographique;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 *
 * @author koben
 */
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class BonLivraisonDetail {

    private String lgBONLIVRAISONDETAIL;

    private Integer intQTECMDE;

    private Integer intQTEUG;

    private Integer intQTERECUE;

    private Integer intPRIXREFERENCE;

    private String strLIVRAISONADP;

    private String strMANQUEFORCES;

    private String strETATARTICLE;

    private Integer intPRIXVENTE;

    private Integer intPAF;

    private Integer intPAREEL;

    private String strSTATUT;

    private String dtUPDATED;

    private Integer intQTEMANQUANT;

    private Integer intQTERETURN;

    private Integer intINITSTOCK;

    private String lgBONLIVRAISONID;

    private FamilleDTO produit;

    private Integer prixTarif;

    private Integer prixUni;

    private int montantAvoir;

    private Integer quantiteControle;

    private Boolean checked;

    private TZoneGeographique lgZONEGEOID;

    private String lgZONEGEONom;
}
