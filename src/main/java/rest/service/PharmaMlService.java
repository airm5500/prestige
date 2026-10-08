/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import java.time.LocalDate;
import javax.ejb.Local;
import org.json.JSONObject;

/**
 *
 * @author kkoffi
 */
@Local
public interface PharmaMlService {

    JSONObject envoiPharmaInfosProduit(String commandeId);

    JSONObject envoiCommande(String commandeId, LocalDate dateLivraisonSouhaitee, int typeCommande,
            String typeCommandeExecptionel, String commentaire);

    JSONObject renvoiPharmaCommande(String ruptureId, String grossiste, LocalDate dateLivraisonSouhaitee);

    /**
     * Reponses differees (specification v4.8 § 4.1.3) : demande de VIDAGE du depot de chaque grossiste ayant des envois
     * en attente (ou de celui donne), traitement de chaque reponse recue puis ACQUITTEMENT. {@code auto} : appel du
     * planificateur (silencieux si rien n'est en attente).
     */
    JSONObject recupererReponses(String grossisteId, boolean auto);

    /** Usage interne (transaction propre) : applique une reponse recue par vidage a l'envoi qu'elle concerne. */
    JSONObject appliquerReponseDifferee(String grossisteId, String xml, String archive);

    /** Reponse archivee « non rattachee » reprise depuis son archive (rattachement par Ref_Cde_Client). */
    JSONObject reprendreOrpheline(String idOrpheline);

    /** Envois en attente de reponse (ecran des commandes). */
    JSONObject attentes();

    /** Point 5 du 08/10 : equivalents proposes (EP) en attente de decision. */
    JSONObject remplacementsProposes();

    /** Retours du 08/10 (7) : historique des substitutions (onglet « Substitutions » de la liste des ruptures). */
    JSONObject substitutions(String statut, String grossisteId, java.time.LocalDate du, java.time.LocalDate au,
            String recherche);

    JSONObject substitutionsCommande(String commandeId);

    JSONObject annulerAcceptation(String id, dal.TUser user);

    JSONObject retirerSubstitution(String id, dal.TUser user);

    JSONObject choixMemorises();

    /** Retours du 08/10 (10) : demande d'avancement d'une commande au grossiste (tableau 11). */
    JSONObject avancementCommande(String commandeId, dal.TUser user);

    /** Dernier avancement connu (sans interroger le grossiste). */
    JSONObject avancementConnu(String commandeId);

    /** Retours du 08/10 (11) : BLV proposes pour la saisie du bon de livraison d'une commande. */
    JSONObject blvsCommande(String commandeId);

    /** Detail d'un BLV rapproche de la commande (ecarts de quantite et de prix). */
    JSONObject blv(String blvId, String commandeId);

    /** Alertes reglementaires et commerciales recues (non lues d'abord). */
    JSONObject alertes(boolean nonLuesSeulement);

    /** Prise de connaissance d'une alerte. */
    JSONObject alerteLue(String alerteId, dal.TUser user);

    /** Tableau de bord PharmaML (lecture seule). */
    JSONObject tableauBord();

    /** Vidage des grossistes actifs (BLV et alertes deposes sans demande). */
    JSONObject recupererMessages();

    JSONObject supprimerChoixMemorise(String familleId, String code, dal.TUser user);

    /** Retours du 08/10 : derniere reponse du grossiste a une commande, lisible a l'ecran. */
    JSONObject reponseGrossiste(String commandeId);

    /** Accepte (la ligne de rupture passe sur l'equivalent) ou refuse ; memoriser = meme choix a l'avenir. */
    JSONObject deciderRemplacement(String id, boolean accepter, boolean memoriser, dal.TUser user);
}
