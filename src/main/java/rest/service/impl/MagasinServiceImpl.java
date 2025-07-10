/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.MagasinDTO;
import dal.TEmplacement;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.MagasinService;

/**
 *
 * @author DICI
 */
@Stateless
public class MagasinServiceImpl implements MagasinService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    // @PostConstruct
    // public void init() {
    // dataManager manager = new dataManager();
    // manager.initEntityManager();
    // em = manager.getEm();
    //
    // }

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public JSONObject findAllDepots(String query) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TypedQuery<TEmplacement> q = getEntityManager().createQuery(
                    "SELECT o FROM TEmplacement o WHERE o.lgEMPLACEMENTID <>'1' AND o.strSTATUT='enable' ",
                    TEmplacement.class);
            List<MagasinDTO> re = q.getResultList().stream().map(MagasinDTO::new).collect(Collectors.toList());
            json.put("total", re.size());
            json.put("data", new JSONArray(re));
        } catch (Exception e) {
            json.put("total", 0);
            json.put("data", new JSONArray(Collections.EMPTY_LIST));
        }
        return json;
    }

    @Override
    public JSONObject findAllDepots(String query, String type) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            TypedQuery<TEmplacement> q = getEntityManager().createQuery(
                    "SELECT o FROM TEmplacement o WHERE o.lgTYPEDEPOTID.lgTYPEDEPOTID =?1 AND o.strSTATUT='enable' ",
                    TEmplacement.class);
            q.setParameter(1, type);
            List<MagasinDTO> re = q.getResultList().stream().map(MagasinDTO::new).collect(Collectors.toList());
            json.put("total", re.size());
            json.put("data", new JSONArray(re));
        } catch (Exception e) {
            json.put("total", 0);
            json.put("data", new JSONArray(Collections.EMPTY_LIST));
        }
        return json;
    }

}
