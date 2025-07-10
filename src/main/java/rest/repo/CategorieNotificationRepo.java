/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.repo;

import dal.CategorieNotification;
import dal.Groupefournisseur;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;

/**
 *
 * @author koben
 */
@Stateless
public class CategorieNotificationRepo extends AbstractRepoImpl<CategorieNotification> {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    protected EntityManager getEntityManager() {
        return em;
    }

    public CategorieNotificationRepo() {
        super(CategorieNotification.class);
    }

    public CategorieNotification updatecategorieNotification(CategorieNotification categorieNotification) {

        try {
            return this.update(categorieNotification);
        } catch (Exception e) {

            return null;
        }

    }

}
