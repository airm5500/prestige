package rest.service.impl;

import dal.TEmplacement;
import dal.TPreenregistrement;
import dal.TUser;

/**
 * Emplacement d'une vente.
 *
 * <p>
 * Historiquement, l'emplacement d'une vente n'etait pas stocke : chaque site de lecture le deduisait de l'utilisateur
 * de la vente ({@code tp.getLgUSERID().getLgEMPLACEMENTID()}). Cette convention suffit a l'officine mais interdit qu'un
 * operateur de l'officine vende le stock d'un depot d'extension.
 *
 * <p>
 * Le champ {@code emplacementVente} de la vente porte desormais ce lieu explicitement. Il vaut {@code null} pour toutes
 * les ventes existantes et pour toute vente d'officine : l'ancienne regle s'applique alors mot pour mot. Un seul point
 * de decision, pour que tous les sites d'ecriture (destockage, references, controles de stock, UG, annulation) suivent
 * la meme regle.
 *
 * <p>
 * L'argent ne passe pas par ici : la caisse et le magasin du mouvement de caisse restent ceux de l'operateur connecte,
 * qu'un depot soit pose ou non.
 */
public final class ContexteVenteDepot {

    private ContexteVenteDepot() {
    }

    /**
     * Emplacement ou la vente se joue : le depot d'extension s'il est pose, sinon l'emplacement de l'utilisateur de la
     * vente, comme avant.
     */
    public static TEmplacement emplacementDeVente(TPreenregistrement vente) {
        if (vente == null) {
            return null;
        }
        TEmplacement depot = vente.getEmplacementVente();
        if (depot != null) {
            return depot;
        }
        return emplacementDe(vente.getLgUSERID());
    }

    /**
     * Emplacement ou la vente se joue, quand l'appelant ne dispose pas de l'utilisateur de la vente mais de celui qui
     * opere (cloture, annulation). Le depot pose sur la vente prime ; a defaut on garde l'utilisateur fourni, qui est
     * ce que le code faisait avant.
     */
    public static TEmplacement emplacementDeVente(TPreenregistrement vente, TUser operateur) {
        if (vente != null && vente.getEmplacementVente() != null) {
            return vente.getEmplacementVente();
        }
        return emplacementDe(operateur);
    }

    /** Vrai si la vente se joue dans un depot d'extension et non a l'officine. */
    public static boolean estEnContexteDepot(TPreenregistrement vente) {
        return vente != null && vente.getEmplacementVente() != null;
    }

    private static TEmplacement emplacementDe(TUser user) {
        return user == null ? null : user.getLgEMPLACEMENTID();
    }
}
