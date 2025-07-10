package rest.service.impl;

import dal.TParameters;
import java.util.Objects;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import rest.service.ParametreService;

/**
 *
 * @author koben
 */
@Stateless
public class ParametreServiceImpl implements ParametreService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public boolean isEnable(String key) {
        try {
            return getParam(key);
        } catch (Exception e) {
            return true;
        }
    }

    @Override
    public boolean chekIsEnable(String key) {
        try {

            return getParam(key);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean getParam(String key) {

        TParameters tp = em.find(TParameters.class, key);
        return Objects.nonNull(tp) && tp.getStrVALUE().trim().equals("1");

    }
}
