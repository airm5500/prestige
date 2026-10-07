package rest.service.impl;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import rest.service.PrivilegeService;

/**
 *
 * @author koben
 */
@Stateless
public class PrivilegeServiceImpl implements PrivilegeService {

    private static final Logger LOG = Logger.getLogger(PrivilegeServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public Set<String> getPrivilegeByNames(Set<String> privilegeNames, String userId) {
        /*
         * Retours du 07/10 : la requete ne rend qu'une colonne, donc des chaines et non des Tuple ; la conversion en
         * Tuple levait une exception, avalee ci-dessous, et la methode rendait TOUJOURS un ensemble vide : les
         * utilisateurs des chemins mobiles (en-tete X-User-Info) n'avaient jamais « modifier le prix », « voir les
         * ventes » ni « toute l'activite », meme quand leur role les donne.
         */
        if (privilegeNames == null || privilegeNames.isEmpty() || userId == null) {
            return Set.of();
        }
        try {
            List<?> list = em
                    .createNativeQuery("SELECT DISTINCT p.str_NAME FROM t_privilege p"
                            + " JOIN t_role_privelege rp ON rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID"
                            + " JOIN t_role r ON r.lg_ROLE_ID = rp.lg_ROLE_ID"
                            + " JOIN t_role_user ru ON ru.lg_ROLE_ID = r.lg_ROLE_ID"
                            + " WHERE ru.lg_USER_ID = :utilisateur AND p.str_NAME IN (:noms)")
                    .setParameter("utilisateur", userId).setParameter("noms", privilegeNames).getResultList();
            Set<String> privileges = new HashSet<>();
            for (Object o : list) {
                if (o != null) {
                    privileges.add(o instanceof Object[] ? String.valueOf(((Object[]) o)[0]) : String.valueOf(o));
                }
            }
            return privileges;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "lecture des droits", e);
            return Set.of();
        }
    }

}
