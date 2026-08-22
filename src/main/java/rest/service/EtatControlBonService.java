package rest.service;

import java.io.IOException;
import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.AchatGrossisteMensuelDTO;
import rest.service.dto.EtatControlAnnuelWrapperDTO;
import rest.service.dto.EtatControlBon;
import rest.service.dto.EtatControlBonEditDto;

/**
 *
 * @author koben
 */
@Local
public interface EtatControlBonService {

    List<EtatControlBon> list(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId,
            int start, int limit, boolean all, String dateType);

    JSONObject list(boolean fullAuth, String search, String dtStart, String dtEnd, String grossisteId, int start,
            int limit, String dateType);

    EtatControlAnnuelWrapperDTO listBonAnnuel(String groupBy, String dtStart, String dtEnd, String grossisteId,
            Integer groupeId);

    JSONObject listBonAnnuelView(String groupBy, String dtStart, String dtEnd, String grossisteId, Integer groupeId);

    JSONObject etatLastThreeYears();

    List<AchatGrossisteMensuelDTO> listAchatsMensuels(String dtStart, String dtEnd, String type);

    JSONObject achatsMensuelsView(String dtStart, String dtEnd, String type);

    JSONObject updateBon(EtatControlBonEditDto bonEdit);

    /**
     * Identifiants des produits portes par les bons de livraison donnes, sans doublon.
     *
     * <p>
     * Un produit livre sur deux bons ne donnera donc qu'une ligne d'inventaire : c'est bien le meme article que l'on
     * recompte une fois.
     *
     * @param bonIds
     *            identifiants des bons de livraison
     *
     * @return les identifiants d'article, ou un ensemble vide si les bons sont introuvables ou sans ligne
     */
    java.util.Set<String> produitsDesBons(List<String> bonIds);

    byte[] generate(String search, String dtStart, String dtEnd, String grossisteId, String dateType)
            throws IOException;

    byte[] generate(String groupBy, String dtStart, String dtEnd, String grossisteId, Integer groupeId)
            throws IOException;

}
