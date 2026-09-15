package rest.service;

import commonTasks.dto.ComboDTO;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.ArticleMvtDTO;
import rest.service.dto.ArticleMvtFilter;

@Local
public interface ArticleMvtService {

    JSONObject getAllArticleMvt(String dtStart, String dtEnd, String query, int limit, int start);

    JSONObject getAllArticleMvt(String dtStart, String dtEnd, String query);

    List<ArticleMvtDTO> getAllArticleMvt(String dtStart, String dtEnd, String query, int limit, int start, boolean all);

    JSONObject getAllArticleMvt(ArticleMvtFilter filtre, int limit, int start);

    /** Liste complete, sans pagination : alimente les exports et l'apercu global. */
    JSONObject getAllArticleMvt(ArticleMvtFilter filtre);

    List<ArticleMvtDTO> getAllArticleMvt(ArticleMvtFilter filtre, int limit, int start, boolean all);

    /** Types de mouvement disponibles, pour le combo "Mode" de l'ecran (entree "Tous" incluse). */
    List<ComboDTO> typesMouvement();

    JSONObject createInventaireFromSelection(String ids, String dtStart, String dtEnd);

    /**
     * Cree l'inventaire a partir de tous les articles correspondant aux criteres, sans passer par les coches : c'est le
     * parcours "je choisis un mode de mouvement et j'inventorie la liste".
     */
    JSONObject createInventaireFromFilter(ArticleMvtFilter filtre);

    byte[] exportToExcel(String dtStart, String dtEnd, String query);

    byte[] exportToExcel(ArticleMvtFilter filtre);

}
