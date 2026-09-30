package rest.service.impl;

import org.apache.commons.lang3.StringUtils;

/**
 * RECHERCHE D'UN CLIENT depuis les ordonnances (retour du 30/09) : par le nom, comme partout, et aussi par le numero de
 * telephone, en « contient » (« 8897 » trouve 07 48 89 78 08).
 *
 * <p>
 * Propre aux ordonnances : la recherche commune des clients (v1/client/list), utilisee par d'autres ecrans, garde sa
 * regle « commence par ».
 */
final class RechercheClientOrdonnance {

    /** En deca, des chiffres tapes ne sont pas cherches dans les telephones : trop de clients sortiraient. */
    static final int MIN_CHIFFRES = 3;

    /** Un telephone : chiffres, espaces, points, tirets, « + » ; 8 chiffres au moins. */
    private static final String FORME_TELEPHONE = "[0-9 +.\\-]*";

    private RechercheClientOrdonnance() {
    }

    /** Le texte cherche dans les noms, « commence par » : vide si rien n'est tape. */
    static String nom(String saisie) {
        return StringUtils.normalizeSpace(StringUtils.defaultString(saisie));
    }

    /**
     * Les chiffres cherches dans les telephones, ou null. Seulement si la saisie ressemble a un numero (aucune lettre)
     * et compte assez de chiffres.
     */
    static String chiffres(String saisie) {
        String s = StringUtils.trimToEmpty(saisie);
        if (s.isEmpty() || !s.matches(FORME_TELEPHONE)) {
            return null;
        }
        String c = s.replaceAll("[^0-9]", "");
        return c.length() >= MIN_CHIFFRES ? c : null;
    }

    /**
     * Le telephone a afficher : le numero normalise s'il existe, sinon l'ancien champ « adresse » des qu'il a la forme
     * d'un numero (c'est la que la caisse et les SMS le lisent). Une vraie adresse n'est pas montree comme un numero.
     */
    static String telephone(String telephone, String adresse) {
        if (StringUtils.isNotBlank(telephone)) {
            return telephone.trim();
        }
        String a = StringUtils.trimToEmpty(adresse);
        return a.matches(FORME_TELEPHONE) && a.replaceAll("[^0-9]", "").length() >= 8 ? a : "";
    }
}
