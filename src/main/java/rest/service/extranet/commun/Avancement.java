package rest.service.extranet.commun;

/**
 * Avancement d'une lecture en arriere-plan (option A du 09/11) : chaque appel a l'extranet fait sur le fil de la
 * lecture est compte, et les lecteurs qui connaissent la suite annoncent le nombre d'appels restants. L'ecran affiche
 * alors « appel n / N » au lieu d'une simple duree. Rien n'est ecrit en base ; aucune adresse, aucun parametre n'est
 * garde.
 */
public final class Avancement {

    private static final ThreadLocal<EtatLectures.Lecture> COURANTE = new ThreadLocal<>();

    private Avancement() {
    }

    /** La lecture suivie sur ce fil ; null pour ne plus suivre. */
    public static void suivre(EtatLectures.Lecture l) {
        if (l == null) {
            COURANTE.remove();
        } else {
            COURANTE.set(l);
        }
    }

    public static void finir() {
        COURANTE.remove();
    }

    /** Un appel de plus a l'extranet (sans effet hors d'une lecture suivie). */
    static void appel() {
        EtatLectures.Lecture l = COURANTE.get();
        if (l != null) {
            l.appels.incrementAndGet();
        }
    }

    /**
     * Appels encore prevus a partir de maintenant (estimation : relectures non comptees) ; le total affiche devient
     * appels deja faits + restants.
     */
    public static void restants(int n) {
        EtatLectures.Lecture l = COURANTE.get();
        if (l != null && n >= 0) {
            l.prevus = l.appels.get() + n;
        }
    }
}
