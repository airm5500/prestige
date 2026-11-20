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
    /** Retours du 10/10 (Q11) : controle fait dans l'application mobile — resume, qui, quand, ecarts. */
    private String controleResume;
    private String controlePar;
    private String controleLe;
    private int controleEcarts;
    /**
     * Demande 59 : BL entre au reçu ({@code validerbl?mode=RECU}) — boites manquantes, lignes en ecart et detail
     * (« produit : n »). Zero / vide pour un BL entre en entier.
     */
    private int manquants;
    private int lignesManquantes;
    private String manquantsDetail;
    /**
     * Demande du 14/11 : la liste ne porte plus les lignes du bon. Ce qu'on en tirait (ecart, nombre de lignes) est
     * calcule en base et porte ici ; les lignes se chargent a la demande.
     */
    private boolean avecEcart;
    private int nombreLignes;
    /**
     * Plan du 19/11, point 16 : reste a payer, comme l'onglet « Reglements fournisseurs » (TTC − regle ; 0 pour un BL
     * date d'avant le debut du suivi, considere comme regle) ; null pour un BL annule.
     */
    private Integer resteAPayer;
    private boolean avantSuivi;

}
