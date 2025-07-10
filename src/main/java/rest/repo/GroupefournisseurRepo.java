/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.repo;

import dal.Groupefournisseur;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

/**
 *
 * @author koben
 */
@Stateless
public class GroupefournisseurRepo extends AbstractRepoImpl<Groupefournisseur> {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    protected EntityManager getEntityManager() {
        return em;
    }

    public GroupefournisseurRepo() {
        super(Groupefournisseur.class);
    }

    public Groupefournisseur saveOrUpdate(Groupefournisseur groupefournisseur) {

        try {
            if (groupefournisseur.getId() == null || groupefournisseur.getId() == 0) {
                groupefournisseur.setId(null);
                this.save(groupefournisseur);
                return groupefournisseur;
            }
            return this.update(groupefournisseur);
        } catch (Exception e) {

            return null;
        }

    }

}
