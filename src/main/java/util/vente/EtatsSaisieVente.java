package util.vente;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * États d'une vente en saisie (vente et vente en dépôt), cahier des charges du 24/11, point 2.
 * <p>
 * Une vente est toujours dans un seul état. Tout passage d'un état à l'autre est décidé ici, et seulement ici : le
 * service qui l'applique écrit l'état et la ligne du journal de preuve dans la même transaction. Fonction pure, sans
 * base.
 *
 * <pre>
 *  EN_COURS ── mettre en attente (droit) ──▶ EN_ATTENTE ── reprendre (droit, jour même) ──▶ EN_COURS
 *  EN_COURS ── Retour : supprimer ─────────▶ ABANDONNEE (lignes gardées)
 *  EN_COURS ── interruption (système) ─────▶ INTERROMPUE ── reprise (auteur, ou droit ; jour même) ──▶ EN_COURS
 *                                            INTERROMPUE ── signal retrouvé (même poste, jour même) ──▶ EN_COURS
 *                                            INTERROMPUE ── fin du décompte du bandeau (auteur, jour même) ──▶ ABANDONNEE
 *  EN_COURS ── clôture ────────────────────▶ CLOTUREE
 *  EN_COURS, EN_ATTENTE, INTERROMPUE ── le lendemain (système) ──▶ ABANDONNEE
 * </pre>
 *
 * Une vente EN_COURS n'est jamais rappelable : aucun geste de reprise ne part de cet état.
 */
public final class EtatsSaisieVente {

    public enum Etat {
        EN_COURS("En cours de saisie"), EN_ATTENTE("En attente"), INTERROMPUE("Saisie interrompue"),
        ABANDONNEE("Abandonnée"), CLOTUREE("Clôturée");

        public final String libelle;

        Etat(String libelle) {
            this.libelle = libelle;
        }
    }

    public enum Droit {
        /** P_VENTE_METTRE_EN_ATTENTE */
        METTRE_EN_ATTENTE("Mettre une vente en attente"),
        /** P_VENTE_REPRENDRE_ATTENTE */
        REPRENDRE_ATTENTE("Reprendre une vente en attente"),
        /** P_VENTE_VOIR_EN_COURS */
        VOIR_EN_COURS("Voir les ventes en cours de saisie"),
        /** P_VENTE_REPRENDRE_INTERROMPUE_AUTRUI */
        REPRENDRE_INTERROMPUE_AUTRUI("Reprendre une saisie interrompue d'un autre utilisateur");

        public final String libelle;

        Droit(String libelle) {
            this.libelle = libelle;
        }
    }

    public enum Geste {
        METTRE_EN_ATTENTE(false), REPRENDRE_ATTENTE(false), RETOUR_SUPPRIMER(false), INTERROMPRE(true),
        SIGNAL_RETROUVE(false), REPRENDRE_INTERROMPUE(false), EXPIRER(true), CLOTURER(false),
        /** fin du décompte de 30 s du bandeau « Saisie interrompue » (retour du 25/11) : l'auteur, le jour même */
        ABANDONNER_INTERROMPUE(false);

        /** geste du serveur lui-même (jamais demandé par un utilisateur) */
        public final boolean systeme;

        Geste(boolean systeme) {
            this.systeme = systeme;
        }
    }

    /** État d'arrivée de chaque geste admis. */
    public static final Map<Geste, Etat> CIBLE;

    static {
        EnumMap<Geste, Etat> m = new EnumMap<>(Geste.class);
        m.put(Geste.METTRE_EN_ATTENTE, Etat.EN_ATTENTE);
        m.put(Geste.REPRENDRE_ATTENTE, Etat.EN_COURS);
        m.put(Geste.RETOUR_SUPPRIMER, Etat.ABANDONNEE);
        m.put(Geste.INTERROMPRE, Etat.INTERROMPUE);
        m.put(Geste.SIGNAL_RETROUVE, Etat.EN_COURS);
        m.put(Geste.REPRENDRE_INTERROMPUE, Etat.EN_COURS);
        m.put(Geste.EXPIRER, Etat.ABANDONNEE);
        m.put(Geste.CLOTURER, Etat.CLOTUREE);
        m.put(Geste.ABANDONNER_INTERROMPUE, Etat.ABANDONNEE);
        CIBLE = Collections.unmodifiableMap(m);
    }

    /** Qui fait le geste, et dans quelles conditions. */
    public static final class Contexte {
        public final Set<Droit> droits;
        /** l'utilisateur est celui qui a commencé la saisie */
        public final boolean auteur;
        /** la vente a été commencée le jour même */
        public final boolean memeJour;
        /** la vente est ouverte sur ce poste, dans cette session */
        public final boolean tenueParCePoste;
        /** geste du serveur (interruption, expiration) */
        public final boolean systeme;

        public Contexte(Set<Droit> droits, boolean auteur, boolean memeJour, boolean tenueParCePoste, boolean systeme) {
            this.droits = droits == null ? EnumSet.noneOf(Droit.class) : droits;
            this.auteur = auteur;
            this.memeJour = memeJour;
            this.tenueParCePoste = tenueParCePoste;
            this.systeme = systeme;
        }
    }

    public static final class Decision {
        public final boolean admis;
        public final Etat etat;
        /** raison du refus, lisible par la caissière ; null si admis */
        public final String motif;

        private Decision(boolean admis, Etat etat, String motif) {
            this.admis = admis;
            this.etat = etat;
            this.motif = motif;
        }
    }

    private EtatsSaisieVente() {
    }

    private static Decision refus(Etat e, String motif) {
        return new Decision(false, e, motif);
    }

    private static Decision droitManquant(Etat e, Droit d) {
        return refus(e, "Droit manquant : " + d.libelle + ".");
    }

    /** Seule une vente mise en attente se rappelle depuis la liste « Ventes en attente ». */
    public static boolean rappelable(Etat e) {
        return e == Etat.EN_ATTENTE;
    }

    /** État lu en base ; null si la valeur n'est pas un état (ancienne vente, statut historique). */
    public static Etat lire(String v) {
        if (v == null) {
            return null;
        }
        for (Etat e : Etat.values()) {
            if (e.name().equals(v)) {
                return e;
            }
        }
        return null;
    }

    public static Decision decider(Etat e, Geste g, Contexte c) {
        if (e == null || g == null || c == null) {
            return refus(e, "Geste impossible : vente ou geste inconnu.");
        }
        if (e == Etat.CLOTUREE) {
            return refus(e, "Cette vente est déjà clôturée.");
        }
        if (e == Etat.ABANDONNEE) {
            return refus(e, "Cette vente a été abandonnée : elle ne peut plus être reprise.");
        }
        if (g.systeme != c.systeme) {
            return refus(e, g.systeme ? "Ce geste est réservé au serveur." : "Geste réservé à un utilisateur.");
        }
        Etat cible = CIBLE.get(g);
        switch (g) {
        case METTRE_EN_ATTENTE:
            if (e != Etat.EN_COURS) {
                return refus(e, "Seule une vente en cours de saisie peut être mise en attente.");
            }
            if (!c.tenueParCePoste) {
                return refus(e, "Cette vente n'est pas ouverte sur ce poste.");
            }
            if (!c.droits.contains(Droit.METTRE_EN_ATTENTE)) {
                return droitManquant(e, Droit.METTRE_EN_ATTENTE);
            }
            break;
        case REPRENDRE_ATTENTE:
            if (e != Etat.EN_ATTENTE) {
                return refus(e,
                        e == Etat.EN_COURS
                                ? "Cette vente est en cours de saisie sur un poste : elle ne peut pas être rappelée."
                                : "Cette vente n'est pas en attente.");
            }
            if (!c.droits.contains(Droit.REPRENDRE_ATTENTE)) {
                return droitManquant(e, Droit.REPRENDRE_ATTENTE);
            }
            if (!c.memeJour) {
                return refus(e, "Une vente en attente se reprend le jour même seulement.");
            }
            break;
        case RETOUR_SUPPRIMER:
        case CLOTURER:
            if (e != Etat.EN_COURS) {
                return refus(e, "Cette vente n'est pas en cours de saisie.");
            }
            if (!c.tenueParCePoste) {
                return refus(e, "Cette vente n'est pas ouverte sur ce poste.");
            }
            break;
        case INTERROMPRE:
            if (e != Etat.EN_COURS) {
                return refus(e, "Seule une saisie en cours peut être interrompue.");
            }
            break;
        case SIGNAL_RETROUVE:
            if (e != Etat.INTERROMPUE) {
                return refus(e, "Cette saisie n'est pas interrompue.");
            }
            if (!c.tenueParCePoste || !c.memeJour) {
                return refus(e, "Le signal ne vient pas du poste qui tenait la saisie, le jour même.");
            }
            break;
        case REPRENDRE_INTERROMPUE:
            if (e != Etat.INTERROMPUE) {
                return refus(e,
                        e == Etat.EN_COURS
                                ? "Cette vente est en cours de saisie sur un poste : elle ne peut pas être reprise."
                                : "Cette saisie n'est pas interrompue.");
            }
            if (!c.memeJour) {
                return refus(e, "Une saisie interrompue se reprend le jour même seulement : elle est abandonnée.");
            }
            if (!c.auteur && !c.droits.contains(Droit.REPRENDRE_INTERROMPUE_AUTRUI)) {
                return droitManquant(e, Droit.REPRENDRE_INTERROMPUE_AUTRUI);
            }
            break;
        case ABANDONNER_INTERROMPUE:
            if (e != Etat.INTERROMPUE) {
                return refus(e, "Cette saisie n'est pas interrompue.");
            }
            if (!c.auteur) {
                return refus(e, "Seul l'auteur de la saisie interrompue peut la laisser abandonner.");
            }
            if (!c.memeJour) {
                return refus(e, "Saisie d'un autre jour : elle est abandonnée par le traitement de nuit.");
            }
            break;
        case EXPIRER:
            if (c.memeJour) {
                return refus(e, "Une saisie du jour n'expire pas.");
            }
            break;
        default:
            return refus(e, "Geste inconnu.");
        }
        return new Decision(true, cible, null);
    }
}
