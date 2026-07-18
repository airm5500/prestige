package rest.service;

import dal.TUser;
import java.util.List;
import java.util.Set;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.SurstockDTO;

/**
 * Nouvel ecran "Gestion des surstocks" (calculs corriges), independant de l'ancien ecran "Articles en sur-stock" qui
 * reste inchange pour comparaison.
 *
 * Regles : un article est en surstock si son stock disponible depasse (moyenne mensuelle de vente x nombre de mois de
 * projection). La moyenne mensuelle = quantites vendues sur la periode d'historique / nombre de mois d'historique.
 */
@Local
public interface SurstockService {

    JSONObject fetch(TUser user, int moisHistorique, int moisProjection, String query, String codeRayon,
            String codeGrossiste, String codeFamille, int start, int limit);

    List<SurstockDTO> fetchAll(TUser user, int moisHistorique, int moisProjection, String query, String codeRayon,
            String codeGrossiste, String codeFamille);

    Set<String> produitIds(TUser user, int moisHistorique, int moisProjection, String query, String codeRayon,
            String codeGrossiste, String codeFamille);

    byte[] exportExcel(TUser user, int moisHistorique, int moisProjection, String query, String codeRayon,
            String codeGrossiste, String codeFamille) throws java.io.IOException;

    String printPdf(TUser user, int moisHistorique, int moisProjection, String query, String codeRayon,
            String codeGrossiste, String codeFamille);
}
