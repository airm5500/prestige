package rest.service;

import commonTasks.dto.ComboDTO;
import java.util.List;
import java.util.Set;
import javax.ejb.Local;

/**
 *
 * @author koben
 */
@Local
public interface TypeReglementService {

    List<ComboDTO> findAll();

    List<ComboDTO> findAllWithoutEspece();

    List<ComboDTO> findAllExclude(Set<String> toExclude);
}
