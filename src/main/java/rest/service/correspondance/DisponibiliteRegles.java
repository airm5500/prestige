package rest.service.correspondance;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Lot 5 : disponibilite a la demande d'un produit chez un grossiste. Logique pure, sans requete.
 * <ul>
 * <li>source(s) interrogee(s), reglee par grossiste ({@code t_grossiste.int_SOURCE_DISPO}) : 0 = PharmaML seul
 * (comportement d'avant, et valeur de tout reglage inconnu), 1 = extranet seul, 2 = les deux, chacun avec son resultat
 * et sa source ;</li>
 * <li>cache court : une lecture de moins de {@link #CACHE_MINUTES} minutes est rendue telle quelle (avec sa date de
 * lecture), sauf demande expresse ; une date de lecture dans le futur (horloge) n'est jamais un cache valide.</li>
 * </ul>
 */
public final class DisponibiliteRegles {

    public enum Source {
        PHARMAML, EXTRANET
    }

    public static final int CACHE_MINUTES = 15;

    private DisponibiliteRegles() {
    }

    /** Sources a interroger pour le reglage lu (null, illisible ou hors 0..2 : PharmaML seul). */
    public static List<Source> sources(Number reglage) {
        int r = reglage == null ? 0 : reglage.intValue();
        switch (r) {
        case 1:
            return Collections.singletonList(Source.EXTRANET);
        case 2:
            return Arrays.asList(Source.PHARMAML, Source.EXTRANET);
        default:
            return Collections.singletonList(Source.PHARMAML);
        }
    }

    /**
     * Valeur booleenne lue en base : une colonne {@code tinyint(1)} arrive en {@link Boolean}, une comparaison SQL en
     * nombre ; null et tout autre type valent faux.
     */
    public static boolean vrai(Object v) {
        if (v instanceof Boolean) {
            return (Boolean) v;
        }
        return v instanceof Number && ((Number) v).intValue() != 0;
    }

    /** Reglage enregistrable : 0, 1 ou 2 seulement. */
    public static boolean reglageValide(int reglage) {
        return reglage >= 0 && reglage <= 2;
    }

    /**
     * La derniere lecture (millisecondes, null : aucune) peut-elle etre rendue a l'instant {@code maintenant} ?
     */
    public static boolean cacheValide(Long lecture, long maintenant, boolean forcer) {
        if (forcer || lecture == null || lecture > maintenant) {
            return false;
        }
        return maintenant - lecture < CACHE_MINUTES * 60_000L;
    }
}
