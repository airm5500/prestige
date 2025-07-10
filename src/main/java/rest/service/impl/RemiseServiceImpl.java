package rest.service.impl;

import commonTasks.dto.SalesParams;
import dal.TFamille;
import dal.TGrilleRemise;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TRemise;
import dal.TWorkflowRemiseArticle;
import java.util.Collection;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.RemiseService;
import static util.Constant.STATUT_ENABLE;
import static util.Constant.VENTE_ASSURANCE_ID;
import static util.Constant.VENTE_AVEC_CARNET;

/**
 *
 * @author koben
 */
@Stateless
public class RemiseServiceImpl implements RemiseService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public JSONObject addRemise(SalesParams params) {
        // A revoir pour le calcul du net à payer
        JSONObject json = new JSONObject();

        try {

            TPreenregistrement preenregistrement = em.find(TPreenregistrement.class, params.getVenteId());
            preenregistrement.setLgREMISEID(params.getRemiseId());
            removeRemise(preenregistrement, findTRemise(params.getRemiseId()));
            em.merge(preenregistrement);
            json.put("success", true).put("msg", "Opération effectuée avec success");
        } catch (Exception e) {

            json.put("success", false).put("msg", "Erreur::: L'Opération n'a pas aboutie");
        }
        return json;

    }

    private TRemise findTRemise(String id) {
        if (StringUtils.isEmpty(id)) {
            return null;
        }
        try {
            return em.find(TRemise.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private void removeRemise(TPreenregistrement preenregistrement, TRemise newRemise) {
        TRemise oldRemise = preenregistrement.getRemise();
        preenregistrement.setRemise(newRemise);

        if (oldRemise != null) {

            preenregistrement.setIntPRICEREMISE(0);
            preenregistrement.setIntREMISEPARA(0);
            Collection<TPreenregistrementDetail> tPreenregistrementDetailCollection = preenregistrement
                    .getTPreenregistrementDetailCollection();
            if (!CollectionUtils.isEmpty(tPreenregistrementDetailCollection)) {
                tPreenregistrementDetailCollection.forEach(it -> {
                    it.setIntPRICEREMISE(0);
                    em.merge(it);
                });
            }

        }

    }

    private TWorkflowRemiseArticle findByArticleRemise(String strCODEREMISE) {
        if (StringUtils.isEmpty(strCODEREMISE)) {
            return null;
        }
        try {
            TypedQuery<TWorkflowRemiseArticle> q = em.createQuery(
                    "SELECT t FROM TWorkflowRemiseArticle t WHERE t.strCODEREMISEARTICLE = ?1  AND t.strSTATUT = ?2 ",
                    TWorkflowRemiseArticle.class);
            q.setParameter(1, strCODEREMISE).setParameter(2, STATUT_ENABLE);
            q.setMaxResults(1);
            return q.getSingleResult();

        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public TGrilleRemise getGrilleRemiseRemiseFromWorkflow(TPreenregistrement preenregistrement, TFamille oFamille,
            String remiseId) {
        int grilleRemise;
        TGrilleRemise oTGrilleRemise;
        try {
            TWorkflowRemiseArticle workflowRemiseArticle = findByArticleRemise(oFamille.getStrCODEREMISE());
            if (workflowRemiseArticle == null) {
                return null;
            }
            if ((preenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(VENTE_ASSURANCE_ID))
                    || (preenregistrement.getLgTYPEVENTEID().getLgTYPEVENTEID().equals(VENTE_AVEC_CARNET))) {
                grilleRemise = workflowRemiseArticle.getStrCODEGRILLEVO();
                oTGrilleRemise = (TGrilleRemise) em.createQuery(
                        "SELECT t FROM TGrilleRemise t WHERE t.strCODEGRILLE = ?1  AND t.strSTATUT = ?2  AND t.lgREMISEID.lgREMISEID = ?3 ")
                        .setParameter(1, grilleRemise).setParameter(2, STATUT_ENABLE).setParameter(3, remiseId)
                        .getSingleResult();

                return oTGrilleRemise;
            } else {
                grilleRemise = workflowRemiseArticle.getStrCODEGRILLEVNO();
                oTGrilleRemise = (TGrilleRemise) em.createQuery(
                        "SELECT t FROM TGrilleRemise t WHERE t.strCODEGRILLE  = ?1  AND t.strSTATUT = ?2 AND t.lgREMISEID.lgREMISEID = ?3 ")
                        .setParameter(1, grilleRemise).setParameter(2, STATUT_ENABLE).setParameter(3, remiseId)
                        .getSingleResult();
                return oTGrilleRemise;
            }

        } catch (Exception e) {
            return null;
        }

    }

}
