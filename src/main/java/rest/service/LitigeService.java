package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Litiges tiers payant en REST (audit 05 LI-01..08, notice litiges L1..L5) : un litige est rattache a un dossier tiers
 * payant (ligne t_preenregistrement_compte_client_tiers_payent) ; tant qu'il est ouvert, le dossier est hors
 * facturation (str_STATUT_FACTURE = 'is_Litige'). Une seule facon d'ecrire t_litige, dans une seule transaction par
 * action.
 */
@Local
public interface LitigeService {

    /** Types de litige actifs. */
    JSONObject types();

    /** Liste paginee ; filtre : ouverts (defaut), clos, annules, tous. */
    JSONObject liste(String search, String typeId, String filtre, int start, int limit);

    /**
     * Dossiers tiers payant qui peuvent etre mis en litige : vente cloturee non annulee, part organisme &gt; 0, dossier
     * non facture, ou facture sans aucun reglement.
     */
    JSONObject dossiers(String tiersPayantId, String compteClientTiersPayantId, String search, int start, int limit);

    /** Litige, dossier lie et lignes de la vente. */
    JSONObject detail(String litigeId);

    JSONObject creer(TUser user, String dossierId, String typeId, String libelle, String etat, String consequence,
            String description, String commentaire, String montantConteste);

    /** Annulation d'un litige ouvert : le dossier revient dans son etat de facturation d'avant. */
    JSONObject annuler(TUser user, String litigeId);

    /**
     * Cloture d'un litige ouvert, une seule fois. Avec remboursement : 0 &lt; montant &lt;= part d'origine ; sans
     * remboursement : motif obligatoire, montant accorde 0. L'ecart est trace sur le litige.
     */
    JSONObject cloturer(TUser user, String litigeId, boolean remboursement, String montant, String motif);
}
