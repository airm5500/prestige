/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.SalesParams;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.RetourFourService;

/**
 *
 * @author kkoffi
 */
// @Stateless
public class RetourFourImpl implements RetourFourService {
    // @PersistenceContext(unitName = "JTA_UNIT")
    // private EntityManager em;
    // public EntityManager getEntityManager() {
    // return em;
    // }
    @Override
    public JSONObject creerRetourFournisseur(SalesParams salesParams) throws JSONException {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
                                                                       // Tools | Templates.
    }

    @Override
    public JSONObject ajouterProduit(SalesParams params) throws JSONException {
        throw new UnsupportedOperationException("Not supported yet."); // To change body of generated methods, choose
                                                                       // Tools | Templates.
    }

}
