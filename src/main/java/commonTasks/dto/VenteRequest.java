/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.util.Date;
import java.util.List;
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
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Getter
@Setter
public class VenteRequest {

    private String lgPREENREGISTREMENTID;
    private String strREF;
    private String strREFTICKET;
    private Integer intPRICE;
    private Integer intPRICEREMISE;
    private String strTYPEVENTE;
    private Integer intCUSTPART, montantCredit;
    private Integer montantPaye, montantRegle, montantRestant;
    private Date dtUPDATED;
    private AyantDroitDTO ayantDroit;
    private ClientDTO client;
    private String strREFBON, lgCLIENTID, typeRemiseId;
    private String lgREMISEID, lgUSERVENDEURID, lgTYPEVENTEID, userFullName, userVendeurName;
    private List<TiersPayantParams> tierspayants;

}
