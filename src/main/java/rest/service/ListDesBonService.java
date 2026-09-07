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
     * Les bons ranges pour l'edition PDF, produits compris quand l'etat les demande.
     *
     * L'ordre est fixe ICI, et non par l'etat : celui-ci ouvre une nouvelle section des que la valeur groupee change
     * d'une ligne a la suivante, si bien qu'une liste mal rangee ferait apparaitre le meme organisme a plusieurs
     * endroits, chacun avec son propre total.
     *
     * @param avecProduits
     *            true : chaque bon porte ses produits (edition « avec produits ») ; false : la liste reste simple et
     *            aucune requete de produits n'est faite.
     * @param parGroupe
     *            true : les bons sont d'abord ranges par groupe de tiers payant.
     */
    List<BonsDTO> bonsPourEdition(BonsParam bonsParam, boolean avecProduits, boolean parGroupe);
}
