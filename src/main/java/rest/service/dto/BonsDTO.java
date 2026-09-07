package rest.service.dto;

import java.util.Collections;
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
     * Produits du bon, renseignes uniquement pour l'edition « avec produits ».
     *
     * L'etat les lit pour alimenter le tableau imbrique sous chaque bon. La grille de l'ecran et l'edition simple ne
     * les demandent pas : la liste reste alors vide, et aucune requete supplementaire n'est faite.
     */
    private List<ProduitBonDTO> produits;

    /**
     * Produits du bon, jamais null.
     *
     * L'etat construit une source de donnees a partir de cette liste : une valeur nulle ferait echouer l'edition du bon
     * concerne.
     */
    public List<ProduitBonDTO> getProduits() {
        return produits == null ? Collections.emptyList() : produits;
    }

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

    /**
     * Date du bon, sans l'heure : "05/08/2026".
     *
     * L'heure n'apporte rien a un releve destine a un organisme et elle imposait a la colonne une largeur qui manquait
     * ailleurs, notamment au numero de ticket. Les deux etats lisent ce champ ; getDateHeure reste disponible pour qui
     * a besoin des deux.
     */
    public String getDateSeule() {
        String valeur = getDateHeure().trim();
        return valeur.length() > 10 ? valeur.substring(0, 10) : valeur;
    }
}
