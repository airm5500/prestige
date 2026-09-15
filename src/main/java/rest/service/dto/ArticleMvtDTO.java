package rest.service.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ArticleMvtDTO {

    private String lgFamilleId; // VARCHAR
    private String codeCip; // VARCHAR
    private String strName; // VARCHAR
    private Integer prixVente; // INT
    private Integer prixAchat; // INT
    /**
     * Libelles des types de mouvement rencontres sur la periode pour cet article, concatenes : la grille reste a une
     * seule ligne par article meme quand l'article a bouge de plusieurs facons (vente + entree + ajustement...).
     */
    private String typesMvt;
    /** Emplacement de l'article (t_zone_geographique.str_LIBELLEE), sur lequel porte le filtre "Emplacement". */
    private String emplacement;
    /** Famille de l'article (t_famillearticle.str_LIBELLE), sur laquelle porte le filtre "Famille". */
    private String famille;
}
