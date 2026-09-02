package rest;

import java.util.Random;
import java.util.function.Predicate;

import org.apache.commons.lang3.StringUtils;

/**
 * Generateur de code CIP interne : un prefixe fixe suivi de chiffres tires au hasard, jusqu'a tomber sur un code que
 * l'officine n'utilise pas encore.
 *
 * <p>
 * Le prefixe vient du parametre KEY_PREFIXE_CIP_INTERNE (999 par defaut). Il distingue les codes internes des vrais CIP
 * fournisseurs : un code tire entierement au hasard pourrait percuter, des annees plus tard, le CIP d'un produit
 * reference par un grossiste. Avec trois chiffres de prefixe il reste quatre chiffres libres, soit 10 000 codes ; le
 * parametre se change le jour ou ils viennent a manquer.
 *
 * <p>
 * La classe ne touche pas a la base : c'est l'appelant qui dit si un code existe, ce qui permet de la tester seule.
 */
public final class CodeCipGenerateur {

    /** Longueur d'un CIP : sept chiffres, comme le champ de la fiche article l'impose. */
    public static final int LONGUEUR_CIP = 7;
    /** Prefixe applique quand le parametre est absent ou inutilisable. */
    public static final String PREFIXE_PAR_DEFAUT = "999";
    /** Nombre d'essais avant d'abandonner : la plage n'est pas infinie, il faut savoir s'arreter. */
    static final int ESSAIS_MAX = 200;

    private final String prefixe;
    private final Random hasard;
    private final Predicate<String> existe;

    /**
     * @param prefixe
     *            chiffres de tete, ou null pour le prefixe par defaut
     * @param hasard
     *            source d'alea (injectee pour les tests)
     * @param existe
     *            dit si un code est deja pris par un article, quel que soit son statut
     */
    public CodeCipGenerateur(String prefixe, Random hasard, Predicate<String> existe) {
        this.prefixe = prefixeUtilisable(prefixe);
        this.hasard = hasard;
        this.existe = existe;
    }

    /**
     * Prefixe reellement applique : celui recu s'il est fait de chiffres et laisse au moins un chiffre libre, sinon le
     * prefixe par defaut. Un parametre mal saisi ne doit pas bloquer la creation d'article.
     */
    public static String prefixeUtilisable(String prefixe) {
        String p = StringUtils.trimToEmpty(prefixe);
        if (p.isEmpty() || !StringUtils.isNumeric(p) || p.length() >= LONGUEUR_CIP) {
            return PREFIXE_PAR_DEFAUT;
        }
        return p;
    }

    /** Prefixe applique par ce generateur. */
    public String getPrefixe() {
        return prefixe;
    }

    /** Nombre de codes distincts que le prefixe permet. */
    public long capacite() {
        return (long) Math.pow(10, LONGUEUR_CIP - prefixe.length());
    }

    /**
     * Tire un code libre.
     *
     * @return un code de sept chiffres commencant par le prefixe et qu'aucun article ne porte
     *
     * @throws IllegalStateException
     *             quand aucun code libre n'a ete trouve apres {@link #ESSAIS_MAX} tirages : la plage du prefixe est
     *             probablement epuisee
     */
    public String generer() {
        int chiffresLibres = LONGUEUR_CIP - prefixe.length();
        long borne = (long) Math.pow(10, chiffresLibres);
        for (int essai = 0; essai < ESSAIS_MAX; essai++) {
            long tirage = (long) (hasard.nextDouble() * borne);
            String code = prefixe + StringUtils.leftPad(Long.toString(tirage), chiffresLibres, '0');
            if (!existe.test(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Aucun code CIP libre trouve avec le prefixe " + prefixe + " apres "
                + ESSAIS_MAX + " tirages : la plage est probablement epuisee, changez le parametre"
                + " KEY_PREFIXE_CIP_INTERNE.");
    }
}
