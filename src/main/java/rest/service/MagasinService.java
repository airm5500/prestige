/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import javax.ejb.Local;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author DICI
 */
@Local

public interface MagasinService {
    JSONObject findAllDepots(String query) throws JSONException;

    JSONObject findAllDepots(String query, String type) throws JSONException;
}
