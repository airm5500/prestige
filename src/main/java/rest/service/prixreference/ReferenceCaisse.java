package rest.service.prixreference;

import dal.PrixReference;
import dal.PrixReferenceJournal;
import dal.PrixReferenceJournalAction;
import dal.PrixReferenceType;
import dal.TUser;
import org.apache.commons.lang3.StringUtils;

/**
 * Regles pures du cas 2 du 03/11/2026 (sans base ni session), testables a l'unite :
 * <ul>
 * <li>bornes de la saisie a la caisse : prix de reference entier de 5 au prix de vente de la ligne, taux entier de 5 a
 * 100 ;</li>
 * <li>construction d'une ligne de journal a partir de l'etat avant / apres d'un prix de reference.</li>
 * </ul>
 */
public final class ReferenceCaisse {

    public static final String CLE_PARAMETRE = "KEY_PRIX_REF_CAISSE";
    public static final int VALEUR_MINI = 5;
    public static final int TAUX_MINI = 5;
    public static final int TAUX_MAXI = 100;

    private ReferenceCaisse() {
    }

    /**
     * Motif de refus de la saisie, ou {@code null} si elle est acceptable.
     *
     * @param valeur
     *            prix de reference saisi
     * @param taux
     *            taux saisi (pour cent)
     * @param prixVente
     *            prix de vente unitaire de la ligne (borne haute du prix de reference)
     */
    public static String motifRefus(Integer valeur, Integer taux, int prixVente) {
        if (valeur == null || taux == null) {
            return "Le prix de référence et le taux sont obligatoires.";
        }
        if (valeur < VALEUR_MINI) {
            return "Le prix de référence (" + valeur + ") doit être d'au moins " + VALEUR_MINI + ".";
        }
        if (prixVente > 0 && valeur > prixVente) {
            return "Le prix de référence (" + format(valeur) + ") dépasse le prix de vente (" + format(prixVente)
                    + ").";
        }
        if (taux < TAUX_MINI || taux > TAUX_MAXI) {
            return "Le taux (" + taux + ") doit être compris entre " + TAUX_MINI + " et " + TAUX_MAXI + ".";
        }
        return null;
    }

    static String format(int montant) {
        return String.format(java.util.Locale.ROOT, "%,d", montant).replace(',', ' ');
    }

    /**
     * Ligne de journal pour une action : {@code avant} est l'etat du prix de reference avant l'action (null pour un
     * ajout), {@code apres} l'etat apres (null pour une suppression). Les identifiants sont copies, l'utilisateur est
     * nomme (prenom et nom, sinon identifiant), jamais de donnee de patient.
     */
    public static PrixReferenceJournal journal(PrixReferenceJournalAction action, PrixReference avant,
            PrixReference apres, TUser utilisateur, String venteId, String poste) {
        PrixReference reference = apres != null ? apres : avant;
        PrixReferenceJournal j = new PrixReferenceJournal();
        j.setAction(action);
        if (reference != null) {
            j.setPrixReferenceId(reference.getId());
            j.setProduitId(reference.getProduit() == null ? null : reference.getProduit().getLgFAMILLEID());
            j.setTiersPayantId(
                    reference.getTiersPayant() == null ? null : reference.getTiersPayant().getLgTIERSPAYANTID());
        }
        if (avant != null) {
            j.setAncienneValeur(avant.getValeur());
            j.setAncienTaux(avant.getValeurTaux());
            j.setAncienType(avant.getType());
        }
        if (apres != null) {
            j.setNouvelleValeur(apres.getValeur());
            j.setNouveauTaux(apres.getValeurTaux());
            j.setNouveauType(apres.getType());
        }
        if (utilisateur != null) {
            j.setUtilisateurId(utilisateur.getLgUSERID());
            String nom = StringUtils.trimToEmpty(StringUtils.trimToEmpty(utilisateur.getStrFIRSTNAME()) + " "
                    + StringUtils.trimToEmpty(utilisateur.getStrLASTNAME()));
            j.setUtilisateur(StringUtils.defaultIfBlank(nom, utilisateur.getStrLOGIN()));
        }
        j.setVenteId(StringUtils.trimToNull(venteId));
        j.setPoste(StringUtils.left(poste, 80));
        return j;
    }

    /** Copie detachee de l'etat d'un prix de reference, prise AVANT de le modifier. */
    public static PrixReference copie(PrixReference source) {
        if (source == null) {
            return null;
        }
        PrixReference c = new PrixReference();
        c.setId(source.getId());
        c.setProduit(source.getProduit());
        c.setTiersPayant(source.getTiersPayant());
        c.setValeur(source.getValeur());
        c.setValeurTaux(source.getValeurTaux());
        c.setType(source.getType());
        c.setEnabled(source.isEnabled());
        return c;
    }

    /** Vrai si l'etat change reellement (sinon on ne journalise pas une modification a l'identique). */
    public static boolean change(PrixReference avant, PrixReference apres) {
        if (avant == null || apres == null) {
            return true;
        }
        return avant.getValeur() != apres.getValeur() || avant.getType() != apres.getType()
                || !equivalents(avant.getValeurTaux(), apres.getValeurTaux()) || avant.isEnabled() != apres.isEnabled();
    }

    private static boolean equivalents(Float a, Float b) {
        if (a == null || b == null) {
            return a == null && b == null;
        }
        return Math.abs(a - b) < 0.0001f;
    }

    /** Le type ecrit par la caisse, quelle que soit l'option precedente de la fiche (Q2.3). */
    public static PrixReferenceType typeCaisse() {
        return PrixReferenceType.MIX_TAUX_PRIX;
    }
}
