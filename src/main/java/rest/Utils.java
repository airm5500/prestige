package rest;

import dal.TPrivilege;
import dal.TUser;
import java.util.List;
import java.util.Objects;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import toolkits.parameters.commonparameter;
import util.Constant;

/**
 *
 * @author koben
 */
public class Utils {

    private final HttpServletRequest servletRequest;

    public Utils(HttpServletRequest servletRequest) {
        this.servletRequest = servletRequest;
    }

    public boolean hasConnectedUser() {
        HttpSession hs = servletRequest.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        return Objects.nonNull(tu);
    }

    public static List<TPrivilege> getconnectedUserPrivileges(HttpServletRequest servlet) {
        return (List<TPrivilege>) servlet.getSession().getAttribute(commonparameter.USER_LIST_PRIVILEGE);
    }

    public static boolean hasAuthorityByName(List<TPrivilege> privileges, String authorityName) {
        java.util.function.Predicate<TPrivilege> p = e -> e.getStrNAME().equalsIgnoreCase(authorityName);
        return privileges.stream().anyMatch(p);
    }

    public static TUser getConnectedUser(HttpServletRequest request) {
        HttpSession hs = request.getSession();
        TUser tu = (TUser) hs.getAttribute(Constant.AIRTIME_USER);
        if (Objects.nonNull(tu))
            return tu;
        return null;
    }
}
