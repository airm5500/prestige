package util.paiements;

import commonTasks.dto.VenteReglementDTO;
import java.util.Collection;

/**
 * Demande 62 (point 3b) : une prevente deja payee par mobile money a la borne, et pas encore cloturee (cloture
 * automatique non demandee, ou refusee : caisse de la borne fermee, net modifie), est terminee au comptoir AVEC ce
 * paiement, sans redemander l'argent.
 *
 * <p>
 * Regle de la cloture au comptoir : le mode de l'operateur porte exactement le montant paye. Avec des reglements
 * detailles, la somme des lignes de ce mode doit valoir le montant paye (un complement dans un autre mode reste
 * possible si le net a augmente) ; sans detail, le mode de la vente doit etre celui de l'operateur. Sinon la cloture
 * est refusee : l'argent serait demande une seconde fois, ou le paiement recu ne serait pas compte. Classe sans base,
 * verifiee par ClotureComptoirCoherenceTest.
 * </p>
 */
public final class ClotureComptoir {

    private ClotureComptoir() {
    }

    /** Nom de l'operateur pour l'ecran et les messages. */
    public static String libelle(Operateur op) {
        if (op == null) {
            return "mobile money";
        }
        switch (op) {
        case ORANGE:
            return "Orange Money";
        case MOOV:
            return "Moov Money";
        case MTN:
            return "MTN MoMo";
        default:
            return "Wave";
        }
    }

    /** Montant porte par le mode {@code typeReglement} dans la cloture (0 si aucun). */
    public static long montantDuMode(String typeReglement, String typeRegleId, Collection<VenteReglementDTO> reglements,
            int montantSansDetail) {
        if (reglements == null || reglements.isEmpty()) {
            return typeReglement.equals(typeRegleId == null ? null : typeRegleId.trim()) ? montantSansDetail : 0;
        }
        long somme = 0;
        for (VenteReglementDTO r : reglements) {
            String t = r == null ? null : r.getTypeReglement();
            if (t != null && typeReglement.equals(t.trim())) {
                somme += r.getMontant();
            }
        }
        return somme;
    }

    /**
     * Motif du refus, ou null si la cloture compte bien le paiement recu. {@code montantSansDetail} : montant de la
     * vente quand la cloture ne detaille pas ses reglements.
     */
    public static String refus(Operateur op, int montantPaye, String reference, String typeRegleId,
            Collection<VenteReglementDTO> reglements, int montantSansDetail) {
        if (op == null || montantPaye <= 0) {
            return null;
        }
        long porte = montantDuMode(op.typeReglement, typeRegleId, reglements, montantSansDetail);
        if (porte == montantPaye) {
            return null;
        }
        return "Cette prévente est déjà payée par " + libelle(op) + " : " + montantPaye + " F"
                + (reference == null || reference.isEmpty() ? "" : " (n° " + reference + ")")
                + ". Terminez-la avec le mode " + libelle(op) + " pour ce montant, sans encaisser à nouveau.";
    }

    /**
     * Demande 64 : refus d'une modification du panier d'une vente qui porte un paiement mobile money recu
     * ({@code paye}) ou en cours. La vente se termine au comptoir avec ce paiement, au meme montant.
     */
    public static String refusModificationPanier(Operateur op, int montant, boolean paye) {
        if (paye) {
            return "Cette prévente est déjà payée par " + libelle(op) + " (" + montant + " F) : le panier ne peut"
                    + " plus être modifié. Terminez-la au comptoir avec ce paiement, sans encaisser à nouveau.";
        }
        return "Un paiement " + libelle(op) + " de " + montant + " F est en cours sur cette prévente : le panier ne"
                + " peut pas être modifié pendant le paiement.";
    }

    /** Demande 64 : paiement mobile money refuse avant tout encaissement, la vente ne pourrait pas etre cloturee. */
    public static String refusPaiement(String motif) {
        return "Paiement mobile money impossible : " + motif + " Le client paie à la caisse.";
    }
}
