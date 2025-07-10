/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.SalesParams;
import dal.TUser;
import javax.ejb.Local;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.v2.dto.DeconditionnementParamsDTO;

/**
 *
 * @author Kobena
 */
@Local
public interface DeconditionService {

    JSONObject deconditionnementVente(SalesParams params) throws JSONException;

    void deconditionner(DeconditionnementParamsDTO paramsDTO, TUser user) throws Exception;
}
