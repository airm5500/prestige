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

    /** Envois en attente de reponse (ecran des commandes). */
    JSONObject attentes();

    /** Point 5 du 08/10 : equivalents proposes (EP) en attente de decision. */
    JSONObject remplacementsProposes();

    /** Accepte (la ligne de rupture passe sur l'equivalent) ou refuse ; memoriser = meme choix a l'avenir. */
    JSONObject deciderRemplacement(String id, boolean accepter, boolean memoriser, dal.TUser user);
}
