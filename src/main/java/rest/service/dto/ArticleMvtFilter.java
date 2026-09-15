package rest.service.dto;

import java.time.LocalDate;
import lombok.Builder;
import lombok.Getter;
import org.apache.commons.lang3.StringUtils;

/**
 * Criteres de l'ecran "Articles en mouvement". Les champs vides (ou la valeur "ALL" renvoyee par les combos communs)
 * signifient "pas de filtre".
 */
@Getter
@Builder
public class ArticleMvtFilter {

    /** Valeur renvoyee par les combos de v1/common pour l'entree "Tous". */
    public static final String TOUS = "ALL";

    private String dtStart;
    private String dtEnd;
    private String query;
    /** typemvtproduit.ID : le "mode" de mouvement (vente, entree, inventaire, ajustement...). */
    private String typeMvt;
    /** t_famille.lg_ZONE_GEO_ID : l'emplacement de l'article. */
    private String emplacementId;
    /** t_famille.lg_FAMILLEARTICLE_ID : la famille de l'article. */
    private String familleId;

    private static String normaliser(String valeur) {
        String v = StringUtils.trimToNull(valeur);
        return (v == null || TOUS.equalsIgnoreCase(v)) ? null : v;
    }

    public String typeMvtOuNull() {
        return normaliser(typeMvt);
    }

    public String emplacementOuNull() {
        return normaliser(emplacementId);
    }

    public String familleOuNull() {
        return normaliser(familleId);
    }

    /**
     * Bornes resolues de la periode. L'ecran peut les laisser vides (le bouton Reinitialiser vide les deux champs) : la
     * periode vaut alors la journee du jour, comme a l'ouverture de l'ecran. Ces bornes resolues sont aussi celles qui
     * nomment l'inventaire cree et le fichier exporte, pour qu'aucun des deux ne porte une periode vide.
     */
    public LocalDate debut() {
        return jour(dtStart, LocalDate.now());
    }

    public LocalDate fin() {
        return jour(dtEnd, debut());
    }

    public String debutTexte() {
        return debut().toString();
    }

    public String finTexte() {
        return fin().toString();
    }

    private static LocalDate jour(String valeur, LocalDate defaut) {
        try {
            return LocalDate.parse(StringUtils.trimToEmpty(valeur));
        } catch (Exception e) {
            return defaut;
        }
    }

    public String rechercheLike() {
        String v = StringUtils.trimToNull(query);
        return v == null ? null : "%" + v + "%";
    }
}
