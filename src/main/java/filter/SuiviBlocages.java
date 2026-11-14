package filter;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Rapport d'exploitation du 13/11, point 10 : une impression bloquee 7 h 09 avait ete signalee 134 fois par le guetteur
 * (une photographie complete des threads toutes les 5 minutes), sans jamais dire quand elle s'etait terminee ni sa
 * duree totale.
 * <p>
 * Regles, a chaque passage du guetteur :
 * </p>
 * <ul>
 * <li>une requete en traitement depuis plus de {@code seuilMs} est signalee UNE fois (DEBUT, avec la photographie)
 * ;</li>
 * <li>deux photographies sont espacees d'au moins {@code delaiEntreRapportsMs} : une requete bloquee pendant ce delai
 * est signalee au passage suivant, si elle dure encore ;</li>
 * <li>une requete signalee qui n'est plus en cours donne UN avis de FIN, avec sa duree totale (a un passage pres)
 * ;</li>
 * <li>jamais de FIN sans DEBUT ; rien pour une requete terminee avant d'avoir ete signalee.</li>
 * </ul>
 * Logique pure, sans horloge ni serveur : testee par {@code SuiviBlocagesCoherenceTest}.
 */
final class SuiviBlocages {

    enum Nature {
        DEBUT, FIN
    }

    static final class Signal {
        final Nature nature;
        final SlowRequestFilter.RequeteEnCours requete;
        /** age de la requete au signal (DEBUT) ou duree totale (FIN), en ms */
        final long dureeMs;

        Signal(Nature nature, SlowRequestFilter.RequeteEnCours requete, long dureeMs) {
            this.nature = nature;
            this.requete = requete;
            this.dureeMs = dureeMs;
        }
    }

    private final long seuilMs;
    private final long delaiEntreRapportsMs;
    /** requetes signalees, encore en cours au dernier passage */
    private final Map<String, SlowRequestFilter.RequeteEnCours> signalees = new LinkedHashMap<>();
    private long dernierRapportMs = Long.MIN_VALUE / 2;

    SuiviBlocages(long seuilMs, long delaiEntreRapportsMs) {
        this.seuilMs = seuilMs;
        this.delaiEntreRapportsMs = delaiEntreRapportsMs;
    }

    static String cle(SlowRequestFilter.RequeteEnCours r) {
        return r.nomThread + '|' + r.debutMs + '|' + r.methode + ' ' + r.uri;
    }

    /** Signaux de ce passage : les fins d'abord, puis au plus un debut (la plus ancienne requete non signalee). */
    synchronized List<Signal> passage(List<SlowRequestFilter.RequeteEnCours> enCours, long maintenant) {
        List<Signal> signaux = new ArrayList<>();
        Set<String> presentes = new HashSet<>();
        for (SlowRequestFilter.RequeteEnCours r : enCours) {
            presentes.add(cle(r));
        }
        signalees.entrySet().removeIf(e -> {
            if (presentes.contains(e.getKey())) {
                return false;
            }
            signaux.add(new Signal(Nature.FIN, e.getValue(), maintenant - e.getValue().debutMs));
            return true;
        });
        SlowRequestFilter.RequeteEnCours candidate = null;
        for (SlowRequestFilter.RequeteEnCours r : enCours) {
            if (maintenant - r.debutMs >= seuilMs && !signalees.containsKey(cle(r))
                    && (candidate == null || r.debutMs < candidate.debutMs)) {
                candidate = r;
            }
        }
        if (candidate != null && maintenant - dernierRapportMs >= delaiEntreRapportsMs) {
            dernierRapportMs = maintenant;
            signalees.put(cle(candidate), candidate);
            signaux.add(new Signal(Nature.DEBUT, candidate, maintenant - candidate.debutMs));
        }
        return signaux;
    }

    /** « 7 h 09 min », « 3 min 12 s », « 42 s » */
    static String duree(long ms) {
        long s = Math.max(0, ms) / 1000;
        if (s >= 3600) {
            return (s / 3600) + " h " + String.format("%02d", (s % 3600) / 60) + " min";
        }
        if (s >= 60) {
            return (s / 60) + " min " + String.format("%02d", s % 60) + " s";
        }
        return s + " s";
    }
}
