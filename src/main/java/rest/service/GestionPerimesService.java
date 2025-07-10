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

    JSONObject completePerimes(String id, TUser user);

    JSONObject getPerimesSaisiEnCours(int start, int limit);
}
