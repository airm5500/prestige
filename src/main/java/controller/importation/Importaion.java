/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package controller.importation;

import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamilleStock;
import java.util.Collections;
import java.util.List;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.EntityNotFoundException;
import javax.persistence.NoResultException;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.transaction.Transactional;

/**
 *
 * @author koben
 */
@Stateless
public class Importaion {

    private static final Logger LOG = Logger.getLogger(Importaion.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Transactional(dontRollbackOn = { EntityNotFoundException.class, NoResultException.class })
    public List<TFamilleGrossiste> getFamilleGrossistesByFamille(String idFamille) {
        try {
            TypedQuery<TFamilleGrossiste> q = em.createQuery(
                    "SELECT o FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.lgFAMILLEID=?1", TFamilleGrossiste.class);
            q.setParameter(1, idFamille);
            return q.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    @Transactional(dontRollbackOn = { EntityNotFoundException.class, NoResultException.class })
    public List<TFamilleStock> getByFamille(String idFamille) {

        try {
            TypedQuery<TFamilleStock> q = em.createQuery(
                    "SELECT o FROM TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID=?1", TFamilleStock.class);
            q.setParameter(1, idFamille);
            return q.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    @Transactional(dontRollbackOn = { EntityNotFoundException.class, NoResultException.class })
    public TFamille findById(String produitId) {
        TFamille d = em.find(TFamille.class, produitId);
        return d;

    }
}
