package rest.service;

import commonTasks.dto.ProduitExtraInfoDTO;
import java.util.Collection;
import java.util.Map;
import javax.ejb.Local;

/**
 * Fournit les infos complementaires d'un produit (derniere vente, dernier achat, dernier inventaire, code geo, classe
 * ABC, stock reserve et seuils) pour un emplacement donne. Utilise par les APIs v1/checkproduit et v1/info.
 */
@Local
public interface ProduitExtraInfoService {

    ProduitExtraInfoDTO getExtraInfo(String familleId, String emplacementId);

    /**
     * Meme calcul que {@link #getExtraInfo(String, String)} pour une liste de produits, en quelques requetes groupees
     * au lieu de 6 a 7 requetes par produit. Cles : {familleId, emplacementId} ; resultat indexe par
     * {@link #cle(String, String)}. Un produit absent de la base donne un DTO vide, comme getExtraInfo.
     */
    Map<String, ProduitExtraInfoDTO> getExtraInfos(Collection<String[]> cles);

    static String cle(String familleId, String emplacementId) {
        return familleId + "|" + emplacementId;
    }
}
