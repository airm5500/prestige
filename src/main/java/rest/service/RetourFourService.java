/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.SalesParams;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author kkoffi
 */

public interface RetourFourService {

    JSONObject creerRetourFournisseur(SalesParams salesParams) throws JSONException;

    JSONObject ajouterProduit(SalesParams params) throws JSONException;
}
