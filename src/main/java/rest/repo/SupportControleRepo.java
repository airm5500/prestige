/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.repo;

import dal.SupportControle;
import java.util.List;
import javax.annotation.security.PermitAll;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

/**
 *
 * @author koben
 */
@PermitAll
@Stateless
public class SupportControleRepo extends AbstractRepoImpl<SupportControle> {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    protected EntityManager getEntityManager() {
        return em;
    }

    public SupportControleRepo() {
        super(SupportControle.class);
    }

    public List<SupportControle> findActifs() {
        return em.createNamedQuery("SupportControle.actifs", SupportControle.class).getResultList();
    }
}
