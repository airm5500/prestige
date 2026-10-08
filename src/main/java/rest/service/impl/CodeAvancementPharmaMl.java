package rest.service.impl;

import java.util.List;
import org.apache.commons.lang3.StringUtils;

/**
 * Retours du 08/10 (10) : codes d'avancement de la commande (specification CSRP v4.8, tableau 11). 0001 A faire (recue,
 * non traitee), 0002 En cours, 0003 Preparee (entree dans le processus de livraison), 0004 Annulee ; 1000 a 9999 :
 * codes propres au grossiste (son libelle est repris).
 */
public final class CodeAvancementPharmaMl {

    public static final String A_FAIRE = "A_FAIRE", EN_COURS = "EN_COURS", PREPAREE = "PREPAREE", ANNULEE = "ANNULEE",
            AUTRE = "AUTRE";

    private CodeAvancementPharmaMl() {
    }

    /** Etat normalise d'une ligne. */
    public static String etat(String code) {
        Integer v = CodeReponsePharmaMl.valeur(code);
        if (v == null) {
            return AUTRE;
        }
        switch (v) {
        case 1:
            return A_FAIRE;
        case 2:
            return EN_COURS;
        case 3:
            return PREPAREE;
        case 4:
            return ANNULEE;
        default:
            return AUTRE;
        }
    }

    public static String libelle(String code, String libelleGrossiste) {
        switch (etat(code)) {
        case A_FAIRE:
            return "À faire (reçue, non traitée)";
        case EN_COURS:
            return "En cours de traitement";
        case PREPAREE:
            return "Préparée (en livraison)";
        case ANNULEE:
            return "Annulée";
        default:
            return StringUtils.defaultIfBlank(StringUtils.trimToNull(libelleGrossiste),
                    StringUtils.isBlank(code) ? "Inconnu" : "Code " + code.trim());
        }
    }

    /**
     * Etat de la commande a partir des lignes : toutes annulees = ANNULEE ; sinon l'etat le MOINS avance des lignes non
     * annulees (la commande n'est preparee que si toutes ses lignes le sont). Les lignes annulees sont comptees a part.
     */
    public static String global(List<String> etats) {
        if (etats == null || etats.isEmpty()) {
            return AUTRE;
        }
        if (etats.stream().allMatch(ANNULEE::equals)) {
            return ANNULEE;
        }
        for (String o : new String[] { A_FAIRE, EN_COURS, PREPAREE }) {
            if (etats.contains(o)) {
                return o;
            }
        }
        return AUTRE;
    }
}
