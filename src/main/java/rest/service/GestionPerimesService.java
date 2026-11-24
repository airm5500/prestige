/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.Params;
import dal.TUser;
import org.json.JSONObject;

/**
 *
 * @author koben
 */
public interface GestionPerimesService {

    JSONObject addPerime(String lg_FAMILLE_ID, Integer int_NUMBER, String int_NUM_LOT, String dt_peremption,
            TUser user);

    JSONObject updatePerime(Params params);

    void removePerime(String id);

    /** Recherche des produits de la saisie des perimes (retour du 22/11, lot 11 : remplace ws_article_list.jsp). */
    JSONObject rechercherProduits(String query, int start, int limit, TUser user);

    /** Retire une ligne encore en attente de la saisie en cours (retour du 22/11, lot 11). */
    JSONObject retirerLigneEnCours(String id);

    JSONObject completePerimes(String id, TUser user);

    JSONObject getPerimesSaisiEnCours(int start, int limit);

    /**
     * Saisie en cours de l'emplacement de l'utilisateur, quelle que soit la date des lignes (audit 06 PE-02, PE-04).
     */
    JSONObject getPerimesSaisiEnCours(int start, int limit, TUser user);

    boolean hasCloturePrivilege(TUser user);
}
