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

    /** Identifiants des types de reglement mobile money (historiques + categorie MOBILE_MONEY en base), tries. */
    List<String> identifiantsMobileMoney();

    /** Types de reglement qui exigent un client sur la vente (point 12). */
    List<String> identifiantsClientRequis();
}
