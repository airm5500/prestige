package util.paiements;

import util.paiements.FournisseurPaiement.Etat;
import util.paiements.FournisseurPaiement.Resultat;

/**
 * B3 : application d'un statut lu chez le fournisseur à un paiement. Idempotent (une notification répétée ne change
 * rien), montant et devise contrôlés, aucun retour en arrière.
 */
public final class TransitionsPaiement {

    private TransitionsPaiement() {
    }

    /** Résultat : nouveau statut (égal à l'ancien si rien ne change) et motif éventuel (anomalie). */
    public static final class Decision {
        public final StatutPaiement statut;
        public final String anomalie;

        Decision(StatutPaiement statut, String anomalie) {
            this.statut = statut;
            this.anomalie = anomalie;
        }

        public boolean change(StatutPaiement avant) {
            return statut != avant;
        }
    }

    public static Decision appliquer(StatutPaiement actuel, int montantAttendu, String deviseAttendue, Etat e) {
        if (e == null || e.resultat == Resultat.EN_ATTENTE) {
            return new Decision(actuel, null);
        }
        if (e.resultat == Resultat.ECHOUE) {
            return new Decision(actuel == StatutPaiement.EN_ATTENTE ? StatutPaiement.ECHOUE : actuel, null);
        }
        // PAYE : montant et devise doivent correspondre exactement (jamais le montant envoyé par un client).
        if (e.montant == null || e.montant != montantAttendu) {
            return new Decision(actuel,
                    "Montant payé (" + e.montant + ") différent du montant attendu (" + montantAttendu + ")");
        }
        if (e.devise != null && deviseAttendue != null && !deviseAttendue.equalsIgnoreCase(e.devise)) {
            return new Decision(actuel, "Devise payée (" + e.devise + ") différente de " + deviseAttendue);
        }
        switch (actuel) {
        case EN_ATTENTE:
        case ECHOUE:
            return new Decision(StatutPaiement.PAYE, null);
        case ANNULE:
        case EXPIRE:
            return new Decision(StatutPaiement.PAYE_APRES_ANNULATION, "Paiement reçu après annulation : à régulariser");
        default:
            return new Decision(actuel, null); // déjà payé : notification répétée
        }
    }

    /** Annulation demandée : seulement si le paiement est encore en attente. */
    public static StatutPaiement annuler(StatutPaiement actuel) {
        return actuel == StatutPaiement.EN_ATTENTE ? StatutPaiement.ANNULE : actuel;
    }

    /** Expiration : seulement si le paiement est encore en attente. */
    public static StatutPaiement expirer(StatutPaiement actuel) {
        return actuel == StatutPaiement.EN_ATTENTE ? StatutPaiement.EXPIRE : actuel;
    }
}
