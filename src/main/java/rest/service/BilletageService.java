package rest.service;

import dal.TUser;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.BilletageDTO;
import rest.service.dto.CoffreCaisseDTO;
import rest.service.dto.UserCaisseDataDTO;
import rest.service.exception.CaisseUsingExeception;
import rest.service.exception.CashFundNotFoundExeception;

/**
 *
 * @author koben
 */
@Local
public interface BilletageService {

    UserCaisseDataDTO getUserCaisseData(String dtStart, String dtEnd, String hStart, String hEnd, TUser user);

    CoffreCaisseDTO getUserCoffreCaisseDTO(String dtStart, String dtEnd, String hStart, String hEnd, TUser user)
            throws CashFundNotFoundExeception;

    void cloturerCaisse(BilletageDTO billetage, TUser user) throws CaisseUsingExeception;

    CoffreCaisseDTO getUserCoffreCaisse(String dtStart, String dtEnd, String hStart, String hEnd, TUser user);

    JSONObject getListCoffreCaisses(String dtStart, String dtEnd, String search, int start, int limit);
}
