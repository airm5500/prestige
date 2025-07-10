package rest.repo;

import dal.MotifReglement;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.logging.Level;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;

/**
 *
 * @author koben
 */
@Stateless
public class MotifReglementRepo extends AbstractRepoImpl<MotifReglement> {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    protected EntityManager getEntityManager() {
        return em;
    }

    public MotifReglementRepo() {
        super(MotifReglement.class);
    }

    public void saveOrUpdate(MotifReglement motifReglement) {
        try {
            if (Objects.isNull(motifReglement.getId()) || motifReglement.getId() == 0) {
                MotifReglement entity = new MotifReglement();
                entity.setLibelle(motifReglement.getLibelle());
                this.save(entity);

            }
            this.findById(motifReglement.getId()).ifPresent(x -> {

                this.update(motifReglement);
            });

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            throw e;
        }

    }

    public List<MotifReglement> fetch() {
        try {
            TypedQuery<MotifReglement> q = getEntityManager().createNamedQuery("MotifReglement.findAll",
                    MotifReglement.class);
            return q.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }
}
