package rest.service;

import java.util.List;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.dto.BonsDTO;
import rest.service.dto.BonsParam;
import rest.service.dto.BonsTotauxDTO;

/**
 *
 * @author koben
 */
@Local
public interface ListDesBonService {

    List<BonsDTO> listAllBons(BonsParam bonsParam);

    JSONObject listBons(BonsParam bonsParam);

    BonsTotauxDTO listBonsTotaux(BonsParam bonsParam);

    /**
     * PDF de la liste des bons construit en code (sans gabarit jasper) — lot 3.
     *
     * @param avecProduits
     *            true : chaque bon est suivi de ses produits (liste avec produits) ; false : une ligne par bon (liste
     *            simple, utilisee quand le regroupement par groupe est demande).
     * @param parGroupe
     *            true : sections et totaux par groupe de tiers payant.
     * @param entete
     *            libelles d'entete (nom officine, periode, imprime par).
     */
    byte[] buildBonsPdf(BonsParam bonsParam, boolean avecProduits, boolean parGroupe, String entete, String periode,
            String imprimePar);
}
