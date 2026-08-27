package rest;

import java.util.Locale;

/**
 * Mode de recherche de la fiche article.
 *
 * <p>
 * La requete de l'ecran ajoute elle-meme le joker final ({@code LIKE 'texte%'}) : passer du mode « commence par » au
 * mode « contient » revient donc a placer un joker DEVANT le texte, et rien d'autre. Cette classe ne fait que cela, a
 * partir de la valeur du parametre {@link #PARAMETRE}, pour que la regle soit testable hors conteneur.
 *
 * <p>
 * Seule la fiche article lit ce parametre. Les recherches de la commande et de la vente, qui passent par les memes
 * requetes, ne sont pas transformees.
 */
public final class RechercheArticle {

    /** Cle du parametre systeme portant le mode. */
    public static final String PARAMETRE = "MODE_RECHERCHE_FICHE_ARTICLE";

    /** Valeur demandant le comportement historique. */
    public static final String COMMENCE_PAR = "commence par";

    private RechercheArticle() {
    }

    /**
     * Seule une valeur explicitement « commence par » (ou « commence ») ramene le comportement historique. Tout le
     * reste - « contient », valeur absente, vide ou inattendue - est le mode par defaut : une faute de frappe dans le
     * parametre ne doit pas priver l'ecran de la recherche large.
     */
    public static boolean estCommencePar(String valeurParametre) {
        if (valeurParametre == null) {
            return false;
        }
        String normalise = valeurParametre.trim().toLowerCase(Locale.ROOT);
        return normalise.equals(COMMENCE_PAR) || normalise.equals("commence");
    }

    /**
     * Texte a passer a la requete : inchange en mode « commence par », precede d'un joker en mode « contient ». Un
     * texte vide reste vide - la requete saura qu'il n'y a pas de filtre.
     */
    public static String motif(String recherche, String valeurParametre) {
        if (recherche == null || recherche.trim().isEmpty()) {
            return recherche;
        }
        return estCommencePar(valeurParametre) ? recherche : "%" + recherche;
    }
}
