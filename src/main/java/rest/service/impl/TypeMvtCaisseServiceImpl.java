/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rest.service.impl;

import dal.TTypeMvtCaisse;
import dal.TTypeMvtCaisse_;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.TypeMvtCaisseService;
import util.Constant;

/**
 *
 * @author koben
 */
@Stateless
public class TypeMvtCaisseServiceImpl implements TypeMvtCaisseService {

    private static final Logger LOG = Logger.getLogger(TypeMvtCaisseServiceImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public JSONObject fetchList(int start, int limit, String search) {
        JSONObject data = new JSONObject();
        List<TTypeMvtCaisse> list = showAllOrOne(search, start, limit);

        data.put("total", list.size());
        JSONArray jsonarray = new JSONArray();
        for (TTypeMvtCaisse caisse : list) {
            JSONObject json = new JSONObject();
            json.put("str_DESCRIPTION", caisse.getStrDESCRIPTION());
            json.put("str_CODE_COMPTABLE", caisse.getStrCODECOMPTABLE());
            json.put("str_CODE_REGROUPEMENT", caisse.getStrCODEREGROUPEMENT());
            json.put("str_NAME", caisse.getStrNAME());
            json.put("lg_TYPE_MVT_CAISSE_ID", caisse.getLgTYPEMVTCAISSEID());
            jsonarray.put(json);
        }
        data.put("data", jsonarray);
        return data;
    }

    private List<TTypeMvtCaisse> showAllOrOne(String search, int start, int limit) {
        List<TTypeMvtCaisse> list = new ArrayList<>();

        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TTypeMvtCaisse> cq = cb.createQuery(TTypeMvtCaisse.class);
            Root<TTypeMvtCaisse> root = cq.from(TTypeMvtCaisse.class);

            cq.select(root).orderBy(cb.asc(root.get(TTypeMvtCaisse_.strNAME)));
            List<Predicate> predicates = predicates(search, cb, root);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TTypeMvtCaisse> q = em.createQuery(cq);

            q.setFirstResult(start);
            q.setMaxResults(limit);

            list = q.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return list;
    }

    private List<Predicate> predicates(String search, CriteriaBuilder cb, Root<TTypeMvtCaisse> root) {
        List<Predicate> predicates = new ArrayList<>();

        predicates.add(cb.equal(root.get(TTypeMvtCaisse_.strSTATUT), Constant.STATUT_ENABLE));

        if (StringUtils.isNotEmpty(search)) {
            search = search + "%";
            predicates.add(cb.or(cb.like(root.get(TTypeMvtCaisse_.strNAME), search),
                    cb.like(root.get(TTypeMvtCaisse_.strDESCRIPTION), search)));

        }

        return predicates;
    }
}
