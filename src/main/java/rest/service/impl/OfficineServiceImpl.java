
package rest.service.impl;

import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import java.util.ArrayList;
import java.util.List;
import javax.ejb.Stateless;
import rest.service.OfficineService;
import rest.service.dto.OfficineDTO;

/**
 *
 * @author airman
 */

@Stateless
public class OfficineServiceImpl implements OfficineService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public List<OfficineDTO> getAllOfficines() {
        List<OfficineDTO> result = new ArrayList<>();

        String jpql = "SELECT o.lg_OFFICINE_ID, CONCAT(o.str_FIRST_NAME, ' ', o.str_LAST_NAME) AS full_name, o.str_NOM_COMPLET "
                + "FROM t_officine o";

        Query query = em.createNativeQuery(jpql);

        List<Object[]> results = query.getResultList();

        for (Object[] row : results) {
            String id = ((String) row[0]);
            String fullName = (String) row[1];
            String nomComplet = (String) row[2];

            result.add(new OfficineDTO(id, fullName, nomComplet));
        }

        return result;
    }
}