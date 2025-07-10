/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.MedecinDTO;
import dal.Medecin;
import java.util.List;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.MedecinService;

/**
 *
 * @author koben
 */
@Stateless
public class MedecinImpl implements MedecinService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public JSONObject create(MedecinDTO dTO) throws JSONException {
        try {
            Medecin m = findByNumOrder(dTO.getNumOrdre());
            if (m != null) {
                return new JSONObject().put("success", false).put("msg",
                        "Le numéro ordre " + dTO.getNumOrdre() + " est utilisé par " + m.getNom());
            }
            m = save(dTO);

            return new JSONObject().put("success", true).put("ref", m.getId());
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return new JSONObject().put("success", false);
        }
    }

    @Override
    public JSONObject update(MedecinDTO dTO) throws JSONException {
        try {
            Medecin m = getEntityManager().find(Medecin.class, dTO.getId());
            m.setCommentaire(dTO.getCommentaire());
            m.setNom(dTO.getNom());
            m.setNumOrdre(dTO.getNumOrdre());
            return new JSONObject().put("success", true).put("ref", m.getId());
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return new JSONObject().put("success", false);
        }

    }

    @Override
    public Medecin save(MedecinDTO dTO) {
        try {
            Medecin m = new Medecin(dTO.getNumOrdre(), dTO.getNom(), dTO.getCommentaire());
            getEntityManager().persist(m);
            return m;

        } catch (Exception e) {
            e.printStackTrace(System.err);
            return null;
        }

    }

    @Override
    public Medecin findByNumOrder(String numOrder) {
        try {
            TypedQuery<Medecin> tq = getEntityManager().createNamedQuery("Medecin.findByNumOrder", Medecin.class);
            tq.setMaxResults(1);
            tq.setParameter("numorder", numOrder);
            return tq.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public JSONObject findAllByNonOrNumOrder(String query) throws JSONException {
        try {
            TypedQuery<Medecin> tq = getEntityManager().createNamedQuery("Medecin.findAllByNonOrNumOrder",
                    Medecin.class);
            tq.setParameter("numorder", query + "%");
            tq.setParameter("nom", query + "%");

            List<MedecinDTO> l = tq.getResultList().stream().map(MedecinDTO::new).collect(Collectors.toList());
            return new JSONObject().put("total", l.size()).put("data", new JSONArray(l));
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return new JSONObject().put("total", 0).put("data", new JSONArray());
        }
    }

}
