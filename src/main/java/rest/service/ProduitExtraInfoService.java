package rest.service;

import commonTasks.dto.ProduitExtraInfoDTO;
import javax.ejb.Local;

/**
 * Fournit les infos complementaires d'un produit (derniere vente, dernier achat, dernier inventaire, code geo, classe
 * ABC, stock reserve et seuils) pour un emplacement donne. Utilise par les APIs v1/checkproduit et v1/info.
 */
@Local
public interface ProduitExtraInfoService {

    ProduitExtraInfoDTO getExtraInfo(String familleId, String emplacementId);
}
