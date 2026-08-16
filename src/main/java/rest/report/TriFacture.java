package rest.report;

import org.apache.commons.lang3.StringUtils;

/**
 * Ordre des lignes d'une facture, tel qu'il est demandé sur la fiche du tiers payant.
 *
 * La fiche porte {@code str_MODE_TRI_FACTURE} : {@code DATE_BON} pour suivre l'ordre des bons, toute autre valeur (y
 * compris vide) pour l'ordre alphabétique, nom puis prénom.
 *
 * Le choix est transmis aux états sous forme d'un ENTIER lié (0 ou 1), et non d'un morceau de SQL. C'est délibéré :
 * l'ancien paramètre {@code P_ORDER_BY} injectait un fragment écrit avec l'alias « p », alors que quatre modèles
 * appellent {@code t_preenregistrement} « t ». Le jour où l'un d'eux aurait honoré ce paramètre, la requête serait
 * devenue invalide et la facture ne se serait plus imprimée du tout. Ici chaque état écrit son propre ORDER BY avec SES
 * alias ; le paramètre ne peut rien casser.
 *
 * @author koben
 */
public final class TriFacture {

    /**
     * Colonne qui porte le NOM de famille.
     *
     * Piège de cette base : les deux colonnes sont nommées à l'envers de leur contenu. La fiche client de l'application
     * libelle « Nom » le champ {@code strFIRSTNAME} et « Prénom » le champ {@code strLASTNAME} ; les états de facture
     * impriment {@code $F{str_FIRST_NAME}} sous la colonne « NOM » et {@code $F{str_LAST_NAME}} sous « PRÉNOM ». Trier
     * sur {@code str_LAST_NAME} revient donc à trier sur le PRÉNOM, ce qui donne au lecteur un ordre qui paraît
     * aléatoire — l'incident constaté en production.
     */
    public static final String COLONNE_NOM = "str_FIRST_NAME";

    /** Colonne qui porte les PRÉNOMS. Voir {@link #COLONNE_NOM} : les noms de colonnes sont inversés. */
    public static final String COLONNE_PRENOM = "str_LAST_NAME";

    /** Valeur portée par la fiche du tiers payant pour demander l'ordre des bons. */
    public static final String DATE_BON = "DATE_BON";

    /** Nom du paramètre attendu par les états de facture. */
    public static final String PARAMETRE = "P_TRI_DATE_BON";

    private TriFacture() {
    }

    /**
     * @param modeTri
     *            valeur de {@code t_tiers_payant.str_MODE_TRI_FACTURE}
     *
     * @return 1 pour trier par date de bon, 0 pour l'ordre alphabétique (nom puis prénom)
     */
    public static Integer parDateDeBon(String modeTri) {
        return DATE_BON.equalsIgnoreCase(StringUtils.trimToEmpty(modeTri)) ? 1 : 0;
    }
}
