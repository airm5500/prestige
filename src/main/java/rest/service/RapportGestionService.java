/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import javax.ejb.Local;
import org.json.JSONObject;

/**
 *
 * @author kkoffi
 */
@Local
public interface RapportGestionService {
    JSONObject getAllArticle(String search_value, String emp, int maxResults, int firstResult);
}
