/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.asc.prestige2.business.litiges.concrete;

import com.asc.prestige2.business.litiges.LitigeService;
import dal.TLitige;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TTiersPayant;
import dal.TTypelitige;
import dal.dataManager;
import java.util.List;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import toolkits.utils.date;

/**
 *
 * @author JZAGO
 */
public class PrestigeLitige implements LitigeService {
    private final dataManager _prestigeDataManager;

    public PrestigeLitige() {
        _prestigeDataManager = new dataManager();
        _prestigeDataManager.initEntityManager();
    }

    @Override
    public boolean createTypeLitige(String strNAME, String str_DESCRIPTION) {
        EntityManager em = _prestigeDataManager.getEm();
        String lgTYPELITIGEID = new date().getComplexId();
        TTypelitige litigeType = new TTypelitige(lgTYPELITIGEID);
        litigeType.setStrDESCRIPTION(str_DESCRIPTION);
        litigeType.setStrNAME(strNAME);

        _prestigeDataManager.BeginTransaction();
        em.persist(litigeType);
        _prestigeDataManager.CloseTransaction();

        return em.contains(litigeType);
    }

    @Override
    public boolean createLitige(String str_LITIGE_TYPE, String strCLIENTNAME, String strREFERENCEVENTELITIGE,
            String str_TIERS_PAYANT_ID, String strLIBELLELITIGE, String strETATLITIGE, String strCONSEQUENCELITIGE,
            String strDESCRIPTIONLITIGE, String strCOMMENTAIRELITIGE) {
        EntityManager em = _prestigeDataManager.getEm();

        String lgLITIGEID = new date().getComplexId();
        System.out.println("lgLITIGEID: " + lgLITIGEID);
        // TLitige litige = new TLitige(lgLITIGEID, strCLIENTFIRSTNAME, strREFERENCEVENTELITIGE, strETATLITIGE,
        // strDESCRIPTIONLITIGE);

        // to be set up properly to support the service
        TLitige litige = new TLitige(strCLIENTNAME, strREFERENCEVENTELITIGE, strLIBELLELITIGE, strETATLITIGE,
                strCONSEQUENCELITIGE, strDESCRIPTIONLITIGE);

        Query query = em.createNamedQuery("TTypelitige.findByLgTYPELITIGEID", TTypelitige.class);
        query.setParameter("lgTYPELITIGEID", str_LITIGE_TYPE);
        TTypelitige lgTYPELITIGEID = (TTypelitige) query.getSingleResult();

        Query tiersPayantQuery = em.createNamedQuery("TTiersPayant.findByLgTIERSPAYANTID", TTiersPayant.class);
        tiersPayantQuery.setParameter("lgTIERSPAYANTID", str_TIERS_PAYANT_ID);

        TTiersPayant tiersPayant = (TTiersPayant) tiersPayantQuery.getSingleResult();

        litige.setLgTYPELITIGEID(lgTYPELITIGEID);
        litige.setLgTIERSPAYANTID(tiersPayant);
        litige.setStrCOMMENTAIRELITIGE(strCOMMENTAIRELITIGE);

        _prestigeDataManager.BeginTransaction();
        em.persist(litige);
        _prestigeDataManager.CloseTransaction();
        return em.contains(litige);
    }

    @Override
    public boolean deleteLitige(String lgLITIGEID) {
        EntityManager em = _prestigeDataManager.getEm();
        TLitige litige = getLitige(lgLITIGEID);
        if (litige != null) {
            em.remove(litige);
        }
        return em.contains(litige);
    }

    @Override
    public TLitige getLitige(String lgLITIGEID) {
        EntityManager em = _prestigeDataManager.getEm();
        TLitige litige = null;
        Query query = em.createNamedQuery("TLitige.findByLgLITIGEID", TLitige.class);
        query.setParameter("lgLITIGEID", lgLITIGEID);
        litige = (TLitige) query.getSingleResult();

        return litige;
    }

    @Override
    public TTiersPayant findTiersPayantById(String strTIERSPAYANTID) {
        EntityManager em = _prestigeDataManager.getEm();
        TTiersPayant tiersPayant = null;
        Query query = em.createNamedQuery("TTiersPayant.findByLgTIERSPAYANTID", TTiersPayant.class);
        tiersPayant = (TTiersPayant) query.getSingleResult();
        return tiersPayant;
    }

    @Override
    public List<TLitige> getAllLitiges() {
        EntityManager em = _prestigeDataManager.getEm();
        List<TLitige> litiges = null;
        Query query = em.createNamedQuery("TLitige.findAll", TLitige.class);
        litiges = (List<TLitige>) query.getResultList();

        return litiges;
    }

    @Override
    public List<TPreenregistrementCompteClientTiersPayent> getVentesForTiersPayantsAndCompteClients(
            String tiersPayantID, String compteClientID) {
        EntityManager em = _prestigeDataManager.getEm();
        List<TPreenregistrementCompteClientTiersPayent> results = null;
        Query query = em.createQuery(
                "SELECT c FROM TPreenregistrementCompteClientTiersPayent c WHERE c.lgCOMPTECLIENTTIERSPAYANTID.lgTIERSPAYANTID.lgTIERSPAYANTID =:lgTIERSPAYANTID AND  c.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID =:lgCOMPTECLIENTID ",
                TPreenregistrementCompteClientTiersPayent.class);
        query.setParameter("lgTIERSPAYANTID", tiersPayantID);
        query.setParameter("lgCOMPTECLIENTID", compteClientID);
        results = (List<TPreenregistrementCompteClientTiersPayent>) query.getResultList();

        return results;
    }

}
