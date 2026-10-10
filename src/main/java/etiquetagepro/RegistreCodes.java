package etiquetagepro;

/**
 * Etiquettage Pro : source des codes propres aux etiquettes 2D (jamais reproduits). Dans Prestige, le registre de la
 * base (t_etiquette_code) ; dans l'application autonome, un registre local prefixe par installation.
 */
public interface RegistreCodes {

    /** Nouveau code, jamais donne ; null si aucun code libre (l'etiquette part alors sans code). */
    String attribuer(String cip);

    /** Sans registre : pas de code d'etiquette. */
    RegistreCodes AUCUN = cip -> null;
}
