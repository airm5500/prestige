
package rest.service;

import java.util.List;
import javax.ejb.Local;
import rest.service.dto.OfficineDTO;

/**
 *
 * @author airman
 */

@Local
public interface OfficineService {

    List<OfficineDTO> getAllOfficines();

    OfficineDTO getOfficine();

}
