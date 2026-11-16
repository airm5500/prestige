package bll.tierspayantManagement;

import java.util.Objects;

/**
 * Regles de conservation de la fiche d'un tiers payant : enregistrer la fiche sans rien modifier ne doit rien reecrire
 * en base (demande du 15/11).
 *
 * La fiche montre certaines valeurs autrement qu'elles ne sont stockees : un delai absent (NULL) s'affiche vide et
 * revient a 0, un nombre de bons ou un montant de facture a -1 (aucune limite) s'affiche 0, un code paiement absent
 * revient en chaine vide. Ces valeurs ont le meme sens que celles de la base ; on garde donc celle de la base quand la
 * valeur recue n'en differe que par cette presentation. Une vraie modification passe toujours.
 */
public final class ConservationFicheTiersPayant {

    private ConservationFicheTiersPayant() {
    }

    /** Texte : vide recu et absent en base = inchange (NULL conserve). */
    public static String texte(String recu, String enBase) {
        if ((recu == null || recu.isEmpty()) && enBase == null) {
            return null;
        }
        return recu == null ? enBase : recu;
    }

    /** Delai de paiement : 0 recu (champ vide) et absent en base = inchange (NULL conserve). */
    public static Integer delai(int recu, Integer enBase) {
        return recu == 0 && enBase == null ? null : Integer.valueOf(recu);
    }

    /**
     * Limite (nombre de bons, montant de facture) : toute valeur nulle ou negative veut dire « aucune limite » pour la
     * facturation (les lecteurs testent &gt; 0) ; si la valeur recue et celle de la base sont toutes deux sans limite,
     * la base est conservee.
     */
    public static Integer limite(Integer recu, Integer enBase) {
        if (sansLimite(recu) && sansLimite(enBase)) {
            return enBase;
        }
        return recu;
    }

    public static boolean sansLimite(Integer v) {
        return v == null || v <= 0;
    }

    /**
     * Code d'edition du bordereau : il accompagne le modele de facture. Modele inchange = code inchange (meme s'il ne
     * correspond plus au modele, c'est l'etat enregistre) ; modele change = code demande. Code sans modele connu :
     * comme avant, le code demande est pose (vide recu et absent en base = inchange).
     */
    public static String codeBordereau(String demande, String enBase, String modeleEnBase, String modeleDemande) {
        if (modeleDemande == null) {
            return texte(demande, enBase);
        }
        return Objects.equals(modeleEnBase, modeleDemande) ? enBase : demande;
    }
}
