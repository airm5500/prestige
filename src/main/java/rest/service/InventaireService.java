package rest.service;

import dal.TUser;
import java.util.List;
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

    List<DetailInventaireDTO> fetchDetails(String idInventaire, String idRayon, Integer page, Integer maxResult);

    void updateDetailQuantity(UpdateInventaireDetailDTO updateInventaire);
}
