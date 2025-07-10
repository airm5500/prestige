package rest.service;

import dal.TUser;
import javax.ejb.Local;
import rest.service.dto.SessionHelperData;

/**
 *
 * @author koben
 */
@Local
public interface SessionHelperService {

    TUser getCurrentUser();

    void setCurrentUser(TUser user);

    void setData(SessionHelperData data);

    SessionHelperData getData();

}
