package rest.service.impl;

import java.util.UUID;
import javax.persistence.EntityManager;
import org.apache.commons.lang3.StringUtils;

/**
 * Transmission du 07/11 : etats d'un retour fournisseur et transitions permises. Regles pures (verifiees par
 * {@code RetourEtatsCoherenceTest}) et trace de l'historique.
 *
 * <pre>
 * is_Process --mettre en attente--> is_Waiting --valider--> enable (seule sortie de stock)
 *                                   is_Waiting --refuser--> is_Refused --remettre en attente--> is_Waiting
 *                                                           is_Refused --abandonner--> is_Abandoned
 * </pre>
 */
public final class RetourEtats {

    public static final String SAISIE = "is_Process";
    public static final String EN_ATTENTE = "is_Waiting";
    public static final String REFUSE = "is_Refused";
    public static final String ABANDONNE = "is_Abandoned";
    public static final String VALIDE = "enable";

    public static final String MISE_EN_ATTENTE = "MISE_EN_ATTENTE";
    public static final String REFUS = "REFUS";
    public static final String REMISE_EN_ATTENTE = "REMISE_EN_ATTENTE";
    public static final String ABANDON = "ABANDON";
    public static final String VALIDATION = "VALIDATION";

    /** Longueur maximale du motif de refus (colonne str_MOTIF_REFUS). */
    public static final int MOTIF_MAX = 500;

    private RetourEtats() {
    }

    /** Validation (sortie du stock) : en saisie ou en attente, comme avant ; jamais un retour refuse ou abandonne. */
    public static boolean peutValider(String statut) {
        return SAISIE.equals(statut) || EN_ATTENTE.equals(statut);
    }

    public static boolean peutRefuser(String statut) {
        return EN_ATTENTE.equals(statut);
    }

    public static boolean peutRemettreEnAttente(String statut) {
        return REFUSE.equals(statut);
    }

    public static boolean peutAbandonner(String statut) {
        return REFUSE.equals(statut);
    }

    /** Un retour refuse est corrige par son auteur, ou par un profil qui a le droit de validation (choix 1). */
    public static boolean peutCorriger(String utilisateurId, String auteurId, String auteurAttenteId,
            boolean valideur) {
        return valideur || (StringUtils.isNotBlank(utilisateurId)
                && (utilisateurId.equals(auteurId) || utilisateurId.equals(auteurAttenteId)));
    }

    /** Motif nettoye, ou null s'il est vide (le refus exige un motif). */
    public static String motif(String brut) {
        String m = StringUtils.trimToNull(brut);
        return m == null ? null : StringUtils.left(m, MOTIF_MAX);
    }

    /** Libelle de l'etat, tel que la liste le montre. */
    public static String libelle(String statut) {
        if (EN_ATTENTE.equals(statut)) {
            return "En attente de validation";
        }
        if (REFUSE.equals(statut)) {
            return "Refusé";
        }
        if (ABANDONNE.equals(statut)) {
            return "Abandonné";
        }
        if (SAISIE.equals(statut)) {
            return "En saisie";
        }
        return VALIDE.equals(statut) ? "Validé" : StringUtils.defaultString(statut);
    }

    /** Une ligne d'historique, dans la transaction en cours. */
    public static void tracer(EntityManager em, String retourId, String action, String motif, String userId) {
        em.createNativeQuery("INSERT INTO t_retour_fournisseur_historique (id, lg_RETOUR_FRS_ID, action, motif,"
                + " lg_USER_ID, dt_ACTION) VALUES (?1, ?2, ?3, ?4, ?5, NOW())").setParameter(1,
                        UUID.randomUUID().toString())
                .setParameter(2, retourId).setParameter(3, action).setParameter(4, motif).setParameter(5, userId)
                .executeUpdate();
    }
}
