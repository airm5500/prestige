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
    /** Libelle du groupe de tiers payant (vide si le tiers payant n'a pas de groupe) — lot 3. */
    private String groupeLibelle;

    /**
     * Date et heure du bon reunies : "05/08/2026 10:20".
     *
     * L'etat PDF affichait la date et l'heure dans deux colonnes, ce qui consommait de la largeur au detriment des
     * noms. Ce champ calcule permet a l'etat de n'en garder qu'une ($F{dateHeure}), sans toucher a la requete ni aux
     * deux champs d'origine, toujours utilises par la grille de l'ecran.
     *
     * Ce n'est pas un attribut : Lombok ne l'ajoute donc ni au constructeur ni au builder, et aucun appelant existant
     * n'est modifie.
     */
    public String getDateHeure() {
        if (dtUPDATED == null) {
            return heure == null ? "" : heure;
        }
        return heure == null || heure.trim().isEmpty() ? dtUPDATED : dtUPDATED + " " + heure;
    }
}
