package rest.service.dto;

import commonTasks.dto.AyantDroitDTO;
import commonTasks.dto.ClientDTO;
import commonTasks.dto.MedecinDTO;
import commonTasks.dto.UserDTO;
import commonTasks.dto.VenteReglementReportDTO;
import java.util.ArrayList;
import java.util.List;
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
public class VenteDTO {

    private final String id;

    private final String strREF;

    private final String strREFTICKET;

    private final Integer intPRICE;

    private final Integer intPRICEREMISE;

    private final Integer intCUSTPART;

    private final String strSTATUT;

    private final String dtCREATED;

    private final String dtUPDATED;

    private final String strMEDECIN;

    private final String strREFBON;

    private final String strORDONNANCE;
    private final String strINFOSCLT;
    private final String strSTATUTVENTE;

    private final String strTYPEVENTE;

    private final String lgREMISEID;

    private final Integer intSENDTOSUGGESTION;

    private final Boolean bISCANCEL;

    private final String strFIRSTNAMECUSTOMER;

    private final String strLASTNAMECUSTOMER;

    private final String strNUMEROSECURITESOCIAL;

    private final String strPHONECUSTOME;

    private final String lgPREENGISTREMENTANNULEID;

    private final String dtANNULER;

    private final boolean bISAVOIR;

    private final boolean bWITHOUTBON;

    private final Integer intPRICEOTHER;

    private final UserDTO caissier;

    private final UserDTO vendeur;

    private final CodeInfo typeVente;

    private final CodeInfo natureVente;

    private final UserDTO user;

    private final Integer intACCOUNT;

    private final Integer intREMISEPARA;

    private final String pkBrand;

    private final ClientDTO client;

    private final AyantDroitDTO ayantDroit;

    private final MedecinDTO medecin;

    private final Integer montantTva;

    private final Boolean checked;

    private final Boolean copy;

    private final boolean imported;

    private final Integer margeug;

    private final Integer montantttcug;

    private final Integer montantnetug;

    private final Integer montantTvaUg;

    private final String completionDate;

    private final Integer cmuAmount;
    private final List<PreenregistrementCompteClientDTO> differes;
    private final List<VenteTiersPayantItemDTO> assurances;
    private final TransactionDTO reglement;
    private final List<VenteItemDTO> items;
    @Builder.Default
    private List<VenteReglementReportDTO> reglements = new ArrayList<>();
}
