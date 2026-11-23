package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 * Plan du 19/11, point 16 : reglements fournisseurs (onglet « Reglements fournisseurs » de l'etat de controle des
 * achats). Regles : {@link rest.service.impl.achats.ReglementFournisseurRegles}.
 */
@Local
public interface ReglementFournisseurService {

    /** Date de depart du suivi ; modifiable dit si l'utilisateur a le droit de la changer. */
    JSONObject depart(boolean modifiable);

    /** Change la date de depart (droit verifie par la ressource) ; une ligne de journal, aucun BL modifie. */
    JSONObject changerDepart(TUser user, String date);

    /** Du par grossiste, en tranches d'age (BL suivis seulement). */
    JSONObject aRegler();

    /**
     * Retour du 22/11 (lot 9) : du par grossiste, limite aux grossistes d'un groupe (groupeId vide : tous) ; chaque
     * ligne porte son groupe (groupeId, groupe) et la reponse les totaux par groupe (groupes).
     */
    JSONObject aRegler(String groupeId);

    /** BL d'un grossiste qui restent a regler, les plus anciens d'abord. */
    JSONObject bls(String grossisteId);

    /**
     * Enregistre un reglement : grossisteId, montant, date (AAAA-MM-JJ), mode, reference, bls (facultatif : BL coches,
     * dans l'ordre de l'ecran).
     */
    JSONObject regler(TUser user, JSONObject demande);

    /** Annule un reglement : rend exactement ses parts aux BL, et la sortie de caisse s'il y en a eu une. */
    JSONObject annuler(TUser user, String reglementId);

    /** Reglements de la periode (date du reglement), avec leur repartition. */
    JSONObject historique(String dtStart, String dtEnd, String grossisteId);

    /** Retour du 22/11 (lot 9) : historique limite aux grossistes d'un groupe (groupeId vide : tous). */
    JSONObject historique(String dtStart, String dtEnd, String grossisteId, String groupeId);

    /** Releve d'un grossiste : BL suivis de la periode et reglements de la periode, avec les totaux. */
    JSONObject releve(String grossisteId, String dtStart, String dtEnd);

    String officine();

    /**
     * Ancienne fenetre « Regler les BL » : message de refus si le montant regle voulu baisserait des parts de l'onglet,
     * null sinon.
     */
    String refusAncienEcran(String blId, int cible);

    /**
     * Ancienne fenetre « Regler les BL » : amene le regle du BL a la cible par le cumul et l'historique (reglement «
     * Regler les BL » pour ce qui manque ; annulation des reglements « Regler les BL » pour une baisse).
     */
    void ajusterAncienEcran(TUser user, String blId, int cible, java.time.LocalDate date);
}
