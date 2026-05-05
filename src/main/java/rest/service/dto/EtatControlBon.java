package rest.service.dto;

import commonTasks.dto.ErpFournisseur;
import commonTasks.dto.UserDTO;
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
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class EtatControlBon {

    private boolean returnFullBl;

    private String lgBONLIVRAISONID;

    private String strREFLIVRAISON;

    private String dtDATELIVRAISON;

    private Integer intMHT;

    private Integer intTVA;

    private Integer intHTTC;

    private String strSTATUT;

    private String dtCREATED;

    private String dtUPDATED;

    private String strSTATUTFACTURE;

    private UserDTO user;

    private String orderId;
    private String orderRef;
    private List<BonLivraisonDetail> bonLivraisonDetails;
    private String dtREGLEMENTDATE;

    private String strSTATUS;

    private Integer intMONTANTREGLE;

    private Integer intMONTANTRESTANT;
    private String items;
    private ErpFournisseur fournisseur;

    private String fournisseurLibelle;

    private String userName;
    private int montantAvoir;
    private String dateLivraison;

    private String checked;

}
