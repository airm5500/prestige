
package rest.service;

import commonTasks.dto.AddLot;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.LotDTO;

/**
 *
 * @author Hermann N'ZI
 */
@Local
public interface LotService {

    JSONObject getAllLots(String dtStart, String dtEnd, String searchValue, int start, int limit);

    JSONObject getAllLots();

    List<LotDTO> getAllLots(String dtStart, String dtEnd, int limit, int start, boolean all);

    void pickLot(String produitId, int quantitVendue);

    /** audit 06 AJ-02 : lot du produit designe par son identifiant ou son numero ; null si absent */
    dal.TLot trouverLot(String produitId, String lotIdOuNumero);

    /**
     * Audit 06 AJ-02 : sortie de boites des lots. Le lot choisi d'abord (s'il est donne), puis, pour ce qu'il ne couvre
     * pas, la regle de {@link #pickLot(String, int)}.
     */
    void sortirLots(String produitId, dal.TLot lotChoisi, int quantite);

    /** audit 06 AJ-02 : lots du produit encore en stock, peremption la plus proche d'abord (liste « Lot ») */
    JSONObject lotsEnStock(String produitId);

    /**
     * Retours du 10/10 (lecture GS1, mode B) : sortie de la vente en commencant par les lots des boites scannees (un
     * par boite, s'ils ont encore du stock et ne sont pas perimes), le reste comme {@link #pickLot(String, int)}.
     */
    void pickLot(String produitId, int quantitVendue, java.util.List<String> lotsScannes);

    void addLot(AddLot addLot);

    /**
     * Supprime un lot. Renvoie success=false avec un message si le lot est introuvable.
     */
    JSONObject supprimerLot(String lotId);
}
