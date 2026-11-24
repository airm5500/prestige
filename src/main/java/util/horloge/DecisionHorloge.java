package util.horloge;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

/**
 * Décision de blocage de l'application sur la date et l'heure du serveur (cahier des charges du 24/11, point 1).
 * Fonction pure, sans base ni horloge : tous les instants sont des millisecondes depuis 1970 (indépendants du fuseau).
 * <p>
 * L'« estimation » est l'heure réelle telle que le serveur la suit lui-même : corrigée par Internet quand il répond,
 * sinon avancée chaque minute du temps réellement écoulé (horloge monotone de la machine), jamais par l'horloge murale.
 * Elle ne recule donc jamais sans Internet, et une heure reculée ou avancée à la main se voit.
 * <ul>
 * <li><b>Avec Internet</b>, l'heure d'Internet fait foi : blocage si l'écart dépasse le seuil (30 min par défaut).</li>
 * <li><b>Sans Internet</b> : blocage si l'horloge est en retard sur l'estimation au-delà du seuil de recul (RECUL), si
 * elle est en avance au-delà du même seuil pendant le fonctionnement (SAUT), ou si elle dépasse la date plausible
 * (PLAFOND : date de construction de Prestige + quelques années ; cas des opérations datées de 2174 à 2189). Au
 * démarrage, une avance n'est pas un saut (serveur éteint un week-end, base restaurée).</li>
 * <li><b>Régularisation</b> (paramètre à 1, ouverte par le super administrateur) : pendant la durée permise (24 h en
 * heure réelle), un retard jusqu'à la borne (7 jours) n'est plus bloquant, ni sur l'écart ni sur le recul. Une avance
 * reste toujours bloquante.</li>
 * </ul>
 */
public final class DecisionHorloge {

    public enum Cause {
        /** écart avec l'heure d'Internet au-delà du seuil */
        ECART,
        /** horloge en retard sur l'heure réelle estimée, sans Internet */
        RECUL,
        /** horloge partie dans le futur pendant le fonctionnement, sans Internet */
        SAUT,
        /** date au-delà de la date plausible, sans Internet */
        PLAFOND
    }

    static final int SEUIL_DEFAUT_MIN = 30;
    static final int REGULARISATION_DUREE_DEFAUT_H = 24;
    static final int REGULARISATION_RECUL_DEFAUT_J = 7;
    private static final long MIN = 60_000L, H = 60 * MIN, J = 24 * H;

    /** Ce que le serveur sait à l'instant de la décision. */
    public static final class Entree {
        /** horloge murale du serveur */
        public long maintenantMs;
        /** heure réelle estimée par le serveur ; null à la première installation */
        public Long estimationMs;
        /** heure d'Internet moins heure du serveur ; null sans Internet */
        public Long ecartInternetMs;
        /** première décision après le démarrage de Prestige */
        public boolean demarrage;
        /** au-delà, la date n'est pas plausible */
        public long plafondMs = Long.MAX_VALUE;
        public int seuilEcartMin = SEUIL_DEFAUT_MIN;
        public int seuilReculMin = SEUIL_DEFAUT_MIN;
        /** paramètre d'autorisation de la régularisation : 1 ouvert, toute autre valeur fermé */
        public int regularisation;
        /** heure réelle de l'ouverture de la régularisation */
        public Long regularisationOuvertureMs;
        public int regularisationDureeH = REGULARISATION_DUREE_DEFAUT_H;
        public int regularisationReculMaxJours = REGULARISATION_RECUL_DEFAUT_J;
    }

    public static final class Resultat {
        public final boolean bloque;
        public final Set<Cause> causes;
        public final boolean regularisationEnCours;
        /** paramètre à 1 mais délai écoulé (ou jamais ouvert) : à refermer et tracer */
        public final boolean regularisationExpiree;
        /** heure réelle à retenir ; null si aucune n'est connue */
        public final Long estimationRetenueMs;

        Resultat(Set<Cause> causes, boolean enCours, boolean expiree, Long estimation) {
            this.causes = Collections.unmodifiableSet(causes);
            this.bloque = !causes.isEmpty();
            this.regularisationEnCours = enCours;
            this.regularisationExpiree = expiree;
            this.estimationRetenueMs = estimation;
        }
    }

    private DecisionHorloge() {
    }

    private static int positif(int v, int defaut) {
        return v > 0 ? v : defaut;
    }

    public static Resultat decider(Entree e) {
        long maintenant = e.maintenantMs;
        long seuilEcart = positif(e.seuilEcartMin, SEUIL_DEFAUT_MIN) * MIN;
        long seuilRecul = positif(e.seuilReculMin, SEUIL_DEFAUT_MIN) * MIN;
        long reculMax = positif(e.regularisationReculMaxJours, REGULARISATION_RECUL_DEFAUT_J) * J;
        long duree = positif(e.regularisationDureeH, REGULARISATION_DUREE_DEFAUT_H) * H;
        Long internet = e.ecartInternetMs == null ? null : maintenant + e.ecartInternetMs;

        /* heure réelle de référence pour compter le délai de la régularisation (jamais l'horloge reculée) */
        long reelle = internet != null ? internet : e.estimationMs != null ? e.estimationMs : maintenant;
        boolean enCours = false, expiree = false;
        if (e.regularisation == 1) {
            if (e.regularisationOuvertureMs != null && reelle - e.regularisationOuvertureMs < duree) {
                enCours = true;
            } else {
                expiree = true;
            }
        }

        EnumSet<Cause> causes = EnumSet.noneOf(Cause.class);
        Long estimation;
        if (internet != null) {
            long ecart = e.ecartInternetMs;
            /* écart positif : Internet en avance, donc le serveur en retard (seul cas que la régularisation couvre) */
            boolean couvert = enCours && ecart > 0 && ecart <= reculMax;
            if (Math.abs(ecart) > seuilEcart && !couvert) {
                causes.add(Cause.ECART);
            }
            estimation = internet;
        } else {
            boolean plausible = maintenant <= e.plafondMs;
            if (!plausible) {
                causes.add(Cause.PLAFOND);
            }
            if (e.estimationMs == null) {
                estimation = plausible ? Long.valueOf(maintenant) : null;
            } else {
                long recul = e.estimationMs - maintenant;
                if (recul > seuilRecul && !(enCours && recul <= reculMax)) {
                    causes.add(Cause.RECUL);
                }
                if (!e.demarrage && -recul > seuilRecul) {
                    causes.add(Cause.SAUT);
                }
                /* au démarrage, une avance plausible est le temps passé serveur éteint */
                estimation = e.demarrage && recul < 0 && plausible ? Long.valueOf(maintenant) : e.estimationMs;
            }
        }
        return new Resultat(causes, enCours, expiree, estimation);
    }
}
