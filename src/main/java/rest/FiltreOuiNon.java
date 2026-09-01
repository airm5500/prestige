package rest;

/**
 * Filtre a trois etats des ecrans : « Tous », « Oui », « Non ».
 *
 * <p>
 * L'ecran envoie une chaine, le service attend un {@link Boolean} dont la valeur nulle veut dire « pas de filtre ». La
 * distinction compte : confondre « Non » et « Tous » ne fait pas planter l'ecran, il montre simplement plus de lignes
 * que demande - d'ou cette conversion isolee et testee.
 */
public final class FiltreOuiNon {

    private FiltreOuiNon() {
    }

    /**
     * @param valeur
     *            ce que l'ecran envoie : vide, « tous », « oui »/« true »/« 1 », « non »/« false »/« 0 »
     *
     * @return VRAI, FAUX, ou null quand aucun filtre n'est demande
     */
    public static Boolean lire(String valeur) {
        if (valeur == null) {
            return null;
        }
        String v = valeur.trim().toLowerCase();
        if (v.isEmpty() || "tous".equals(v) || "null".equals(v)) {
            return null;
        }
        if ("oui".equals(v) || "true".equals(v) || "1".equals(v)) {
            return Boolean.TRUE;
        }
        if ("non".equals(v) || "false".equals(v) || "0".equals(v)) {
            return Boolean.FALSE;
        }
        // Valeur inattendue : on ne filtre pas plutot que de masquer des lignes a tort.
        return null;
    }
}
