package util;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Rapport d'exploitation du 13/11, point 4 : de 07:24 a 07:42, les premieres requetes de chaque caisse prenaient 6 a 16
 * s ; le prechauffage (factory JPA, scripts des ecrans) tournait en meme temps que les premieres connexions.
 * <p>
 * Etat du prechauffage, lu par la page de connexion (api/v1/app/info) : tant qu'une etape n'est pas finie, la page
 * affiche « Demarrage en cours » et la connexion demandee part des que tout est pret. Une etape en echec compte comme
 * finie (la premiere requete la refera, comme avant) : la connexion n'est jamais bloquee pour de bon.
 * </p>
 */
public final class EtatDemarrage {

    private static final Set<String> EN_COURS = Collections.synchronizedSet(new LinkedHashSet<>());
    private static volatile long debut = System.currentTimeMillis();
    private static volatile long fin = debut;

    private EtatDemarrage() {
    }

    /** Debut du demarrage de l'application, avec les etapes de prechauffage lancees. */
    public static void commencer(String... etapes) {
        synchronized (EN_COURS) {
            EN_COURS.clear();
            EN_COURS.addAll(Arrays.asList(etapes));
            debut = System.currentTimeMillis();
            fin = 0;
        }
    }

    /** Une etape est finie (reussie ou en echec). */
    public static void terminer(String etape) {
        synchronized (EN_COURS) {
            if (EN_COURS.remove(etape) && EN_COURS.isEmpty()) {
                fin = System.currentTimeMillis();
            }
        }
    }

    public static boolean pret() {
        return EN_COURS.isEmpty();
    }

    /** Etapes encore en cours, dans l'ordre de lancement. */
    public static Set<String> enCours() {
        synchronized (EN_COURS) {
            return new LinkedHashSet<>(EN_COURS);
        }
    }

    /** Duree du demarrage : jusqu'a maintenant s'il est en cours, sinon sa duree totale (ms). */
    public static long dureeMs() {
        long f = fin;
        return (f == 0 ? System.currentTimeMillis() : f) - debut;
    }
}
