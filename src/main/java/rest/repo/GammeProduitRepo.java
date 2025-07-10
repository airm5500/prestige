/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.repo;

import dal.GammeProduit;
import dal.enumeration.Statut;
import java.time.LocalDateTime;
import java.util.UUID;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;

/**
 *
 * @author koben
 */
@Stateless
public class GammeProduitRepo extends AbstractRepoImpl<GammeProduit> {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public GammeProduitRepo() {
        super(GammeProduit.class);
    }

    @Override
    protected EntityManager getEntityManager() {
        return em;
    }

    public GammeProduit saveOrUpdate(GammeProduit gammeProduit) {
        try {
            if (StringUtils.isEmpty(gammeProduit.getId())) {
                gammeProduit.setId(UUID.randomUUID().toString());
                this.save(gammeProduit);
                return gammeProduit;
            }
            this.findById(gammeProduit.getId()).ifPresent(x -> {
                gammeProduit.setCreatedAt(x.getCreatedAt());
                gammeProduit.setModifiedAt(LocalDateTime.now());
                gammeProduit.setStatus(Statut.ENABLE);
                this.update(gammeProduit);
            });
            return gammeProduit;
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return null;
        }

    }
}
