package rest.service.dto;

import dal.enumeration.CategorieMvtCaisse;
import dal.enumeration.CategorieTypeMvt;
import java.util.Date;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

/**
 *
 * @author koben
 */
@Getter
@Setter
@Builder
public class MvtCaisseDTO {

    private String id;
    private String numCompte;
    private String userAbrName;
    private String tiket;
    private String dateOpreration;
    private String heureOpreration;
    private String modeReglement;
    private long montant;
    private String typeMvtCaisse;
    private String commentaire;
    private String typeId;
    private Date dateMvt;
    private CategorieMvtCaisse categorieMvtCaisse;
}
