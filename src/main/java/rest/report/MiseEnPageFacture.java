package rest.report;

/**
 * Les deux reglages de mise en page de la facture d'un tiers payant : combien de bons par page, et en quelle taille de
 * police.
 *
 * <p>
 * Les deux valent <b>0 = automatique</b>, et 0 signifie « exactement comme avant » :
 * </p>
 * <ul>
 * <li>bons par page : la page se remplit d'elle-meme, la coupure tombe ou elle tombe ;</li>
 * <li>taille de police : chaque modele conserve la taille qui lui est propre (de 6 a 8 points selon le nombre de
 * colonnes qu'il doit faire tenir).</li>
 * </ul>
 *
 * <p>
 * C'est ce qui garantit qu'aucune facture ne change de presentation tant que l'officine n'a rien saisi. Les modeles
 * .jrxml lisent ces deux valeurs dans les parametres {@link #PARAMETRE_BONS_PAR_PAGE} et
 * {@link #PARAMETRE_TAILLE_POLICE} ; un modele qui ne les declare pas les ignore simplement.
 * </p>
 */
public final class MiseEnPageFacture {

    /** Nom du parametre lu par les modeles .jrxml pour le nombre de bons par page. */
    public static final String PARAMETRE_BONS_PAR_PAGE = "P_BONS_PAR_PAGE";

    /** Nom du parametre lu par les modeles .jrxml pour la taille de police des lignes de bon. */
    public static final String PARAMETRE_TAILLE_POLICE = "P_TAILLE_POLICE";

    /** Valeur des deux reglages quand l'officine n'a rien choisi : on ne touche a rien. */
    public static final int AUTOMATIQUE = 0;

    /** En dessous de 5 bons par page une facture deviendrait illisible et interminable. */
    public static final int BONS_PAR_PAGE_MINIMUM = 5;

    /** Au dela de 500 bons par page le reglage n'a plus d'effet : la page est pleine bien avant. */
    public static final int BONS_PAR_PAGE_MAXIMUM = 500;

    /** En dessous de 5 points le texte n'est plus lisible a l'impression. */
    public static final int TAILLE_POLICE_MINIMUM = 5;

    /** Au dela de 12 points les colonnes des modeles les plus charges ne tiennent plus. */
    public static final int TAILLE_POLICE_MAXIMUM = 12;

    private MiseEnPageFacture() {
    }

    /**
     * Nombre de bons par page reellement utilisable. Toute valeur absente, negative, trop petite ou trop grande revient
     * a {@link #AUTOMATIQUE}, donc au comportement d'aujourd'hui.
     */
    public static int bonsParPage(Integer valeur) {
        if (valeur == null || valeur < BONS_PAR_PAGE_MINIMUM || valeur > BONS_PAR_PAGE_MAXIMUM) {
            return AUTOMATIQUE;
        }
        return valeur;
    }

    /**
     * Taille de police reellement utilisable. Toute valeur absente ou hors des bornes revient a {@link #AUTOMATIQUE},
     * donc a la taille propre au modele.
     */
    public static int taillePolice(Integer valeur) {
        if (valeur == null || valeur < TAILLE_POLICE_MINIMUM || valeur > TAILLE_POLICE_MAXIMUM) {
            return AUTOMATIQUE;
        }
        return valeur;
    }

    /**
     * Transmet les deux reglages a l'edition, <b>et seulement s'ils ont ete choisis</b>.
     *
     * <p>
     * C'est le point delicat : « automatique » ne se transmet pas comme 0, il ne se transmet pas du tout. Dix des
     * modeles livres coupent deja la page tous les 18 bons, valeur inscrite dans le modele lui-meme ; envoyer 0
     * remplacerait cette valeur et supprimerait leur coupure. En n'envoyant rien, chaque modele garde sa propre valeur
     * par defaut, et la fiche du tiers payant ne fait que la remplacer quand l'officine l'a decide.
     * </p>
     */
    public static void appliquer(java.util.Map<String, Object> parametres, Integer nbBonsParPage,
            Integer taillePolice) {
        int bons = bonsParPage(nbBonsParPage);
        if (bons != AUTOMATIQUE) {
            parametres.put(PARAMETRE_BONS_PAR_PAGE, Integer.valueOf(bons));
        }
        int taille = taillePolice(taillePolice);
        if (taille != AUTOMATIQUE) {
            parametres.put(PARAMETRE_TAILLE_POLICE, Integer.valueOf(taille));
        }
    }
}
