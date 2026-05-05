package rest.service;

import dal.Licence;
import javax.ejb.Local;
import rest.service.dto.LicenceDTO;

/**
 *
 * @author koben
 */
@Local
public interface LicenceService {

    String getLicenceOnly();

    Licence getLicence();

    void save(String licence);

    String generateLicence(LicenceDTO licence);

}
