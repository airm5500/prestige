package avisclients;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limite les envois de la page publique : un nombre d'avis par heure et par adresse, et un plafond par jour pour toute
 * la page (une attaque depuis de nombreuses adresses ne remplit pas la base). En memoire : un redemarrage remet a zero,
 * ce qui suffit pour freiner les abus.
 */
public final class Limiteur {

    private static final long HEURE = 3_600_000L, JOUR = 24 * HEURE;
    private final Map<String, Deque<Long>> parAdresse = new ConcurrentHashMap<>();
    private final Deque<Long> tous = new ArrayDeque<>();
    private final int maxJour;

    public Limiteur(int maxJour) {
        this.maxJour = maxJour;
    }

    /** Vrai si l'envoi est accepte (et alors compte) ; faux si la limite est atteinte. */
    public synchronized boolean accepter(String empreinte, int maxHeure, long maintenant) {
        purger(tous, maintenant - JOUR);
        if (tous.size() >= maxJour) {
            return false;
        }
        Deque<Long> d = parAdresse.computeIfAbsent(empreinte, k -> new ArrayDeque<>());
        purger(d, maintenant - HEURE);
        if (d.size() >= Math.max(1, maxHeure)) {
            return false;
        }
        d.addLast(maintenant);
        tous.addLast(maintenant);
        if (parAdresse.size() > 10_000) {
            Iterator<Map.Entry<String, Deque<Long>>> it = parAdresse.entrySet().iterator();
            while (it.hasNext()) {
                Deque<Long> x = it.next().getValue();
                purger(x, maintenant - HEURE);
                if (x.isEmpty()) {
                    it.remove();
                }
            }
        }
        return true;
    }

    private static void purger(Deque<Long> d, long avant) {
        while (!d.isEmpty() && d.peekFirst() < avant) {
            d.pollFirst();
        }
    }
}
