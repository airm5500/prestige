package rest.service.dto;

import java.math.BigDecimal;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 *
 * @author airman
 */
@Getter
@Setter
@Builder
public class InfoArticleDTO {
    private String grossiste;
    private String emplacement;
    private String produitId;
    private String codeCip;
    private String libelle;
    private Integer prixVente;
    private Integer prixAchat;
    private Integer stock;
    private BigDecimal quantiteVendue;
    private BigDecimal moyenne;
    private String quantiteMois; // Format "quantite1:mois1,quantite2:mois2,..."
    private BigDecimal moyenneJour; // Moyenne de vente par jour sur la periode demandee
    private String dateDerniereVente;
    private Integer qteDerniereVente;
    private String dateDernierAchat;
    private Integer qteDernierAchat;
    private String dateDernierInventaire;
    private Integer qteDernierInventaire;
    private String codeGeoArticle;
    private String classe;
    // Renseignes uniquement si le produit gere un stock reserve (bool_RESERVE)
    private Integer stockReserve;
    private Integer seuilReserve;
    private Integer seuilMiniRayon;
}
