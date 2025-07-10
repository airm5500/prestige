/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.asc.prestige2.business.bonlivraisons.concrete;

import com.asc.prestige2.business.bonlivraisons.BLService;
import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TGrossiste;
import dal.TQuinzaine;
import dal.dataManager;
import java.util.Collection;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import toolkits.utils.date;

/**
 *
 * @author JZAGO
 */
public class PrestigeBLService implements BLService {

    private final dataManager _prestigeDataManager;

    public PrestigeBLService() {
        _prestigeDataManager = new dataManager();
        _prestigeDataManager.initEntityManager();
    }

    @Override
    public List<TQuinzaine> getQuinzaines() {
        List<TQuinzaine> quinzaines = null;
        EntityManager em = _prestigeDataManager.getEm();
        Query query = em.createNamedQuery("TQuinzaine.findAll", TQuinzaine.class);

        quinzaines = (List<TQuinzaine>) query.getResultList();

        return quinzaines;
    }

    @Override
    public List<TBonLivraison> getBLs() {
        List<TBonLivraison> bls = null;
        EntityManager em = _prestigeDataManager.getEm();
        Query query = em.createNamedQuery("TBonLivraison.findAll", TBonLivraison.class);

        bls = (List<TBonLivraison>) query.getResultList();

        return bls;
    }

    @Override
    public TBonLivraison getBL(String str_BL_ID) {
        TBonLivraison bl = null;
        EntityManager em = _prestigeDataManager.getEm();
        Query query = em.createNamedQuery("TBonLivraison.findByLgBONLIVRAISONID", TBonLivraison.class);
        query.setParameter("lgBONLIVRAISONID", str_BL_ID);
        bl = (TBonLivraison) query.getSingleResult();
        return bl;
    }

    @Override
    public Map<String, Object> getBLMap(String str_BL_ID) {
        Map<String, Object> resultMap = new HashMap();
        TBonLivraison bl = getBL(str_BL_ID);
        if (bl != null) {
            resultMap.put("lg_BONVRAISON_ID", bl.getLgBONLIVRAISONID());
            resultMap.put("dt_DATE_LIVRAISON", bl.getDtDATELIVRAISON());
            resultMap.put("dt_CREATED", bl.getDtCREATED());
            resultMap.put("dt_UPDATED", bl.getDtUPDATED());
            resultMap.put("int_HTTC", bl.getIntHTTC());
            resultMap.put("int_MHT", bl.getIntMHT());
            resultMap.put("int_TVA", bl.getIntTVA());
            resultMap.put("int_HTTC", bl.getIntHTTC());
            resultMap.put("lg_ORDER_ID", bl.getLgORDERID().getLgORDERID());
            resultMap.put("lg_GROSSISTE_ID", bl.getLgORDERID().getLgGROSSISTEID().getLgGROSSISTEID());
            resultMap.put("str_OPERATEUR", bl.getLgUSERID().getStrLOGIN());
            resultMap.put("str_REF_LIVRAISON", bl.getStrREFLIVRAISON());
            resultMap.put("str_STATUT", bl.getStrSTATUT());
            resultMap.put("str_STATUT_FACTURE", bl.getStrSTATUTFACTURE());

        }

        return resultMap;
    }

    @Override
    public Collection<TBonLivraisonDetail> getBLDetailsFor(TBonLivraison bl) {
        return bl.getTBonLivraisonDetailCollection();
    }

    @Override
    public Map<String, Object> getBLDetailsMapFor(TBonLivraisonDetail bld) {
        Map<String, Object> resultMap = new HashMap<>();
        resultMap.put("int_PAF", bld.getIntPAF());
        resultMap.put("int_PAREEL", bld.getIntPAREEL());
        resultMap.put("int_PRIXREFERENCE", bld.getIntPRIXREFERENCE());
        resultMap.put("int_INTPRIXVENTE", bld.getIntPRIXVENTE());
        resultMap.put("int_QTECMDE", bld.getIntQTECMDE());
        resultMap.put("int_QTEMANQUANT", bld.getIntQTEMANQUANT());
        resultMap.put("int_QTERECUE", bld.getIntQTERECUE());
        resultMap.put("int_QTERETURN", bld.getIntQTERETURN());
        resultMap.put("int_QTEUG", bld.getIntQTEUG());
        resultMap.put("lg_BONLIVRAISONDETAIL_ID", bld.getLgBONLIVRAISONDETAIL());
        resultMap.put("lg_GROSSISTE_ID", bld.getLgGROSSISTEID().getLgGROSSISTEID());
        resultMap.put("str_ETATARTICLE", bld.getStrETATARTICLE());
        resultMap.put("str_STATUT", bld.getStrSTATUT());
        resultMap.put("str_MANQUANT_FORCES", bld.getStrMANQUEFORCES());
        resultMap.put("lg_FAMILLE_ID", bld.getLgFAMILLEID().getLgFAMILLEID());
        resultMap.put("lg_lgZONEGEO_ID", bld.getLgZONEGEOID().getLgZONEGEOID());
        resultMap.put("str_LIBVRAISON_ADP", bld.getStrLIVRAISONADP());
        resultMap.put("dt_CREATED", bld.getDtCREATED());
        resultMap.put("dt_UPDATED", bld.getDtUPDATED());

        return resultMap;
    }

    @Override
    public boolean createBL(String str_REF_LIVRAISON, Date dt_DATE_LIVRAISON, int int_MHT, int int_TVA, int int_HTTC,
            String str_STATUT, String str_STATUT_FACTURE) {

        EntityManager em = _prestigeDataManager.getEm();

        String lg_BONLIVRAISON_ID = new date().getComplexId();

        TBonLivraison bl = new TBonLivraison(lg_BONLIVRAISON_ID);

        bl.setStrREFLIVRAISON(str_REF_LIVRAISON);
        bl.setDtDATELIVRAISON(dt_DATE_LIVRAISON);
        bl.setIntHTTC(int_HTTC);
        bl.setIntMHT(int_MHT);
        bl.setIntTVA(int_TVA);
        bl.setStrSTATUT(str_STATUT);
        bl.setStrSTATUTFACTURE(str_STATUT_FACTURE);

        _prestigeDataManager.BeginTransaction();
        em.persist(bl);
        _prestigeDataManager.CloseTransaction();
        return em.contains(bl);
    }

    @Override
    public boolean deleteBonLivraison(TBonLivraison bl) {
        EntityManager em = _prestigeDataManager.getEm();
        _prestigeDataManager.BeginTransaction();
        em.remove(bl);
        _prestigeDataManager.CloseTransaction();
        return !em.contains(bl);
    }

    @Override
    public boolean deleteBonLivraisonDetail(TBonLivraisonDetail detail) {
        EntityManager em = _prestigeDataManager.getEm();
        _prestigeDataManager.BeginTransaction();
        em.remove(detail);
        _prestigeDataManager.CloseTransaction();
        return !em.contains(detail);
    }

    @Override
    public boolean createQuinzaine(final String lg_GROSSISTE_ID, final Date start, final Date end) {
        EntityManager em = _prestigeDataManager.getEm();
        Query query = em.createNamedQuery("TGrossiste.findByLgGROSSISTEID", TGrossiste.class);
        query.setParameter("lgGROSSISTEID", lg_GROSSISTE_ID);
        TGrossiste foundGrossiste = (TGrossiste) query.getSingleResult();
        if (foundGrossiste == null) {
            return false;
        }
        TQuinzaine quinzaine = new TQuinzaine(foundGrossiste, start, end);
        _prestigeDataManager.BeginTransaction();
        em.persist(quinzaine);
        _prestigeDataManager.CloseTransaction();
        return (em.contains(quinzaine));
    }

    @Override
    public boolean updateQuinzaine(TQuinzaine quinzaine, Map<String, Object> values) {
        if (quinzaine == null) {
            System.err.println("quinzaine is null");
            return false;
        }
        String quinzaineID = quinzaine.getLgQUINZAINEID();
        return updateQuinzaine(quinzaineID, values);
    }

    @Override
    public boolean updateQuinzaine(String quinzaineID, Map<String, Object> values) {
        EntityManager em = _prestigeDataManager.getEm();
        TQuinzaine quinzaine = null;
        TQuinzaine updatedQuinzaine = null;
        quinzaine = getQuinzaine(quinzaineID);
        Date startDate = null;
        Date startEnd = null;
        String lg_GROSSISTE_ID_VALUE = null;
        if (quinzaine == null) {
            return false;
        }
        if (values.get("dt_DATE_START") != null) {
            startDate = (Date) values.get("dt_DATE_START");
            quinzaine.setDtDATESTART(startDate);
        }
        if (values.get("dt_DATE_END") != null) {
            startEnd = (Date) values.get("dt_DATE_END");
            quinzaine.setDtDATEEND(startEnd);
        }
        if (values.get("lg_GROSSISTE_ID") != null) {
            lg_GROSSISTE_ID_VALUE = (String) values.get("lg_GROSSISTE_ID");
            Query query = em.createNamedQuery("TGrossiste.findByLgGROSSISTEID", TGrossiste.class);
            query.setParameter("lgGROSSISTEID", lg_GROSSISTE_ID_VALUE);
            TGrossiste lg_GROSSISTE_ID = (TGrossiste) query.getSingleResult();
            if (lg_GROSSISTE_ID == null) {
                return false;
            }
            quinzaine.setLgGROSSISTEID(lg_GROSSISTE_ID);
        }
        System.out.printf("lg_GROSSISTE_ID: %s, dt_DATE_END: %s, dt_DATE_START: %s\n", lg_GROSSISTE_ID_VALUE, startDate,
                startEnd);
        _prestigeDataManager.BeginTransaction();
        updatedQuinzaine = em.merge(quinzaine);
        _prestigeDataManager.CloseTransaction();
        return em.contains(updatedQuinzaine);

    }

    @Override
    public int binarySearch(int[] sortedNumbers, int number) {
        int start, end, mid;
        start = 0;
        end = (sortedNumbers.length - 1);
        mid = (sortedNumbers.length / 2);

        while (start < end) {
            if (sortedNumbers[mid] == number) {
                return mid;
            } else if (sortedNumbers[mid] < number) {
                end = mid - 1;
            } else {
                start = mid + 1;
            }
        }
        return -1;
    }

    @Override
    public TQuinzaine getQuinzaine(String quinzaineID) {
        TQuinzaine quinzaine = null;
        EntityManager em = _prestigeDataManager.getEm();
        Query query = em.createNamedQuery("TQuinzaine.findByLgQUINZAINEID", TQuinzaine.class);
        query.setParameter("lgQUINZAINEID", quinzaineID);
        quinzaine = (TQuinzaine) query.getSingleResult();
        return quinzaine;
    }

    @Override
    public boolean deleteQuinzaine(String quinzaineID) {
        EntityManager em = _prestigeDataManager.getEm();
        TQuinzaine quinzaine = null;
        quinzaine = getQuinzaine(quinzaineID);
        if (quinzaine == null) {
            System.err.printf("There is no Quinzaine with ID %s", quinzaineID);
            return false;
        }
        _prestigeDataManager.BeginTransaction();
        em.remove(quinzaine);
        _prestigeDataManager.CloseTransaction();

        return !(em.contains(quinzaine));
    }

    @Override
    public boolean markNONREGLEBonLivraison(String lg_BON_LIVRAISON_ID) {
        EntityManager em = _prestigeDataManager.getEm();
        Query query = null;
        TBonLivraison bl = null;
        boolean result = false;

        query = em.createNamedQuery("TBonLivraison.findByLgBONLIVRAISONID", TBonLivraison.class);
        query.setParameter("lgBONLIVRAISONID", lg_BON_LIVRAISON_ID);
        bl = (TBonLivraison) query.getSingleResult();
        /*
         * bl.setSTATUS("NON REGLE"); bl.setIntMONTANTRESTANT(bl.getIntMHT());
         */
        _prestigeDataManager.BeginTransaction();
        em.merge(bl);
        _prestigeDataManager.CloseTransaction();
        result = em.contains(bl);

        return result;
    }

    @Override
    public boolean markREGLEBonLivraison(String lg_BON_LIVRAISON_ID, Date dt_REGLEMENT_DATE) {
        EntityManager em = _prestigeDataManager.getEm();
        Query query = null;
        TBonLivraison bl = null;
        query = em.createNamedQuery("TBonLivraison.findByLgBONLIVRAISONID", TBonLivraison.class);
        query.setParameter("lgBONLIVRAISONID", lg_BON_LIVRAISON_ID);
        bl = (TBonLivraison) query.getSingleResult();
        /*
         * bl.setSTATUS("REGLE"); bl.setDtREGLEMENTDATE(dt_REGLEMENT_DATE); bl.setIntMONTANTREGLE(bl.getIntMHT());
         * bl.setIntMONTANTRESTANT(0);
         */
        _prestigeDataManager.BeginTransaction();
        em.merge(bl);
        _prestigeDataManager.CloseTransaction();
        em.contains(bl);
        return em.contains(bl);
    }

    @Override
    public boolean markREGLEENPARTIEBonLivraison(String lg_BON_LIVRAISON_ID, Date dt_REGLEMENT_DATE,
            int int_MONTANT_REGLE) {
        EntityManager em = _prestigeDataManager.getEm();
        Query query = null;
        TBonLivraison bl = null;
        query = em.createNamedQuery("TBonLivraison.findByLgBONLIVRAISONID", TBonLivraison.class);
        query.setParameter("lgBONLIVRAISONID", lg_BON_LIVRAISON_ID);
        bl = (TBonLivraison) query.getSingleResult();
        /*
         * bl.setSTATUS("REGLE EN PARTIE"); bl.setDtREGLEMENTDATE(dt_REGLEMENT_DATE);
         * bl.setIntMONTANTREGLE(int_MONTANT_REGLE); bl.setIntMONTANTRESTANT(bl.getIntMHT() - int_MONTANT_REGLE);
         */
        _prestigeDataManager.BeginTransaction();
        em.merge(bl);
        _prestigeDataManager.CloseTransaction();
        em.contains(bl);
        return em.contains(bl);
    }

}
