package rest.service.impl;

import dal.TUser;
import javax.ejb.Stateless;
import rest.service.SessionHelperService;
import rest.service.dto.SessionHelperData;

/**
 *
 * @author koben
 */
@Stateless
public class SessionHelperServiceImpl implements SessionHelperService {

    private TUser user;
    private SessionHelperData data;

    @Override
    public TUser getCurrentUser() {
        return this.user;
    }

    @Override
    public void setCurrentUser(TUser user) {
        this.user = user;

    }

    @Override
    public void setData(SessionHelperData data) {
        this.data = data;
    }

    @Override
    public SessionHelperData getData() {
        return data;
    }

}
