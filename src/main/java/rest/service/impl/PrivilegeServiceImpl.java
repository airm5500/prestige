package rest.service.impl;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import rest.service.PrivilegeService;

/**
 *
 * @author koben
 */
@Stateless
public class PrivilegeServiceImpl implements PrivilegeService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public Set<String> getPrivilegeByNames(Set<String> privilegeNames, String userId) {

        try {
            Query q = em.createNativeQuery(
                    "SELECT distinct p.str_NAME AS privilgeName FROM  t_privilege p JOIN t_role_privelege rp ON rp.lg_PRIVILEGE_ID=p.lg_PRIVELEGE_ID JOIN t_role r ON r.lg_ROLE_ID=rp.lg_ROLE_ID JOIN t_role_user ru ON ru.lg_ROLE_ID=r.lg_ROLE_ID WHERE ru.lg_USER_ID=?1 AND p.str_NAME IN ?2 ");
            q.setParameter(1, userId).setParameter(2, privilegeNames);
            List<Tuple> list = q.getResultList();
            Set<String> privileges = new HashSet<>();
            for (Tuple t : list) {
                privileges.add(t.get(0, String.class));
            }
            return privileges;

        } catch (Exception e) {
            return Set.of();
        }
    }

}
