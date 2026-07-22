/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.repo;

import dal.SupportDemande;
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
public class SupportDemandeRepo extends AbstractRepoImpl<SupportDemande> {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    protected EntityManager getEntityManager() {
        return em;
    }

    public SupportDemandeRepo() {
        super(SupportDemande.class);
    }
}
