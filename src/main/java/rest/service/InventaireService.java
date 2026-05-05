package rest.service;

import dal.TUser;
import java.util.List;
import java.util.Set;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.inventaire.dto.DetailInventaireDTO;
import rest.service.inventaire.dto.InventaireDTO;
import rest.service.inventaire.dto.RayonDTO;
import rest.service.inventaire.dto.UpdateInventaireDetailDTO;

/**
 *
 * @author koben
 */
@Local
public interface InventaireService {

    JSONObject createInventaireFromCanceledList(String dtStart, String dtEnd, String userId, TUser tUser);

    List<InventaireDTO> fetch(Integer maxResult);

    List<RayonDTO> fetchRayon(String idInventaire, Integer page, Integer maxResult);

    List<DetailInventaireDTO> fetchDetails(String idInventaire, String idRayon, String query, Integer page,
            Integer maxResult);

    List<DetailInventaireDTO> fetchDetailsUntouchedRayon(String idInventaire, String idRayon, String query,
            Integer page, Integer maxResult);

    List<DetailInventaireDTO> fetchDetailsTouchedRayon(String idInventaire, String idRayon, String query, Integer page,
            Integer maxResult);

    List<DetailInventaireDTO> fetchDetailsAllTouched(String idInventaire, String query, Integer page,
            Integer maxResult);

    List<DetailInventaireDTO> fetchDetailsAll(String idInventaire, String query, Integer page, Integer maxResult);

    List<DetailInventaireDTO> fetchDetailsAllUntouched(String idInventaire, String query, Integer page,
            Integer maxResult);

    List<DetailInventaireDTO> fetchDetailsAllEcarts(String idInventaire, String query, Integer page, Integer maxResult);

    void updateDetailQuantity(UpdateInventaireDetailDTO updateInventaire);

    void refreshStockLigneInventaire(String inventaireId);

    int create(Set<String> produitIds, String description);
}
