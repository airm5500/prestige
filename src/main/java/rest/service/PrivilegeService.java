package rest.service;

import java.util.Set;
import javax.ejb.Local;

/**
 *
 * @author koben
 */
@Local
public interface PrivilegeService {

    Set<String> getPrivilegeByNames(Set<String> privilegeNames, String userId);
}
