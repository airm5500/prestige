package util.horloge;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Suivi de l'heure réelle par le serveur (cahier des charges du 24/11, point 1). Chaque minute, l'heure réelle estimée
 * avance du temps réellement écoulé, mesuré par l'horloge monotone de la machine ({@code System.nanoTime()}), que le
 * réglage de la date de Windows ne touche pas. La décision ({@link DecisionHorloge}) compare l'horloge murale à cette
 * estimation, ou à l'heure d'Internet quand elle répond.
 * <p>
 * Le suivi rend aussi les événements à tracer, une seule fois chacun : apparition du blocage, changement de cause,
 * levée, régularisation arrivée à son terme. Sans état partagé hors de cet objet ; les accès sont synchronisés.
 */
public final class SuiviHorloge {

    public enum Evenement {
        APPARITION, CHANGEMENT, LEVEE, REGULARISATION_EXPIREE
    }

    public static final class Passage {
        public final DecisionHorloge.Resultat resultat;
        public final List<Evenement> evenements;
        /** heure réelle retenue, à enregistrer ; null si aucune n'est connue */
        public final Long estimationMs;

        Passage(DecisionHorloge.Resultat resultat, List<Evenement> evenements) {
            this.resultat = resultat;
            this.evenements = Collections.unmodifiableList(evenements);
            this.estimationMs = resultat.estimationRetenueMs;
        }
    }

    static final int SEUIL_MAX_MIN = 120;
    private static final long NS_PAR_MS = 1_000_000L;

    /*
     * Ancre : heure réelle connue à un instant monotone donné. L'estimation se calcule toujours depuis l'ancre (jamais
     * en ajoutant minute après minute un temps arrondi à la milliseconde, qui perdrait jusqu'à 1 ms par passage).
     */
    private Long ancreMs;
    private long ancreNanos;
    private Long nanosPrecedent;
    private DecisionHorloge.Resultat precedent;

    /** Seuil d'écart ou de recul, en minutes : 1 à 120, 30 si la valeur n'est pas positive. */
    public static int bornerSeuil(int v) {
        return v <= 0 ? DecisionHorloge.SEUIL_DEFAUT_MIN : Math.min(v, SEUIL_MAX_MIN);
    }

    /** Durée d'ouverture de la régularisation, en heures : 1 à 24. */
    public static int bornerDureeH(int v) {
        return v <= 0 ? DecisionHorloge.REGULARISATION_DUREE_DEFAUT_H
                : Math.min(v, DecisionHorloge.REGULARISATION_DUREE_DEFAUT_H);
    }

    /** Recul maximal admis pendant la régularisation, en jours : 1 à 7. */
    public static int bornerReculJours(int v) {
        return v <= 0 ? DecisionHorloge.REGULARISATION_RECUL_DEFAUT_J
                : Math.min(v, DecisionHorloge.REGULARISATION_RECUL_DEFAUT_J);
    }

    private Long estimationA(long nanos) {
        if (ancreMs == null) {
            return null;
        }
        return ancreMs + (nanos - ancreNanos) / NS_PAR_MS;
    }

    /**
     * Passage de la minute : décide, retient l'heure réelle et rend les événements.
     *
     * @param e
     *            horloge murale, écart avec Internet, paramètres (l'estimation et le démarrage sont posés ici)
     * @param nanos
     *            horloge monotone de la machine
     * @param estimationStockee
     *            heure réelle enregistrée en base, lue au premier passage seulement (null : première installation)
     */
    public synchronized Passage passer(DecisionHorloge.Entree e, long nanos, Long estimationStockee) {
        boolean demarrage = nanosPrecedent == null;
        e.demarrage = demarrage;
        e.estimationMs = demarrage ? estimationStockee : estimationA(nanos);
        DecisionHorloge.Resultat r = DecisionHorloge.decider(e);

        List<Evenement> ev = new ArrayList<>();
        boolean avant = precedent != null && precedent.bloque;
        if (r.bloque && !avant) {
            ev.add(Evenement.APPARITION);
        } else if (!r.bloque && avant) {
            ev.add(Evenement.LEVEE);
        } else if (r.bloque && !r.causes.equals(precedent.causes)) {
            ev.add(Evenement.CHANGEMENT);
        }
        if (r.regularisationExpiree) {
            ev.add(Evenement.REGULARISATION_EXPIREE);
        }
        /* l'ancre ne bouge que si la décision a retenu une autre heure (Internet, démarrage, première heure connue) */
        if (r.estimationRetenueMs == null) {
            ancreMs = null;
        } else if (!r.estimationRetenueMs.equals(e.estimationMs) || ancreMs == null) {
            ancreMs = r.estimationRetenueMs;
            ancreNanos = nanos;
        }
        nanosPrecedent = nanos;
        precedent = r;
        return new Passage(r, ev);
    }

    /** Décision à l'instant, sans rien retenir (lecture par les postes entre deux passages). */
    public synchronized DecisionHorloge.Resultat apercu(DecisionHorloge.Entree e, long nanos) {
        e.demarrage = nanosPrecedent == null;
        e.estimationMs = nanosPrecedent == null ? null : estimationA(nanos);
        return DecisionHorloge.decider(e);
    }

    /** Décision avant le premier passage (démarrage en cours), sur l'heure réelle enregistrée en base. */
    public synchronized DecisionHorloge.Resultat apercuInitial(DecisionHorloge.Entree e, Long estimationStockee) {
        if (nanosPrecedent != null) {
            throw new IllegalStateException("suivi déjà démarré");
        }
        e.demarrage = true;
        e.estimationMs = estimationStockee;
        return DecisionHorloge.decider(e);
    }

    /** Vrai après le premier passage. */
    public synchronized boolean demarre() {
        return nanosPrecedent != null;
    }

    /** Dernière décision du passage de la minute, ou null avant le premier. */
    public synchronized DecisionHorloge.Resultat dernier() {
        return precedent;
    }
}
