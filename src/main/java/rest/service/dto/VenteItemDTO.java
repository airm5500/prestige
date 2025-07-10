package rest.service.dto;

import commonTasks.dto.FamilleDTO;
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
public class VenteItemDTO {

    private final String id;

    private final Integer intQUANTITY;

    private final Integer intQUANTITYSERVED;

    private final Integer intAVOIR;

    private final Integer intAVOIRSERVED;

    private final Integer intPRICE;

    private final Integer intPRICEUNITAIR;

    private final Integer intNUMBER;
    private final String lgGRILLEREMISEID;

    private final Integer intPRICEREMISE;

    private final boolean bISAVOIR;

    private final Integer intFREEPACKNUMBER;

    private final Integer intPRICEOTHER;

    private final Integer intPRICEDETAILOTHER;

    private final String parentId;

    private final Boolean boolACCOUNT;

    private final Integer intUG;

    private final Integer montantTva;

    private final Integer valeurTva;

    private final Integer prixAchat;

    private final Integer montantTvaUg;

    private final Integer cmuPrice;
    private final FamilleDTO produit;
}
