package rest.service;

import dal.PrixReference;
import dal.TCompteClientTiersPayant;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import javax.ejb.Local;
import rest.service.dto.PrixReferenceDTO;

/**
 *
 * @author koben
 */
@Local
public interface PrixReferenceService {

    void add(PrixReferenceDTO prixReferenceDTO);

    void changeStatut(String id, Boolean enabled);

    void delete(String id);

    List<PrixReferenceDTO> getByProduitId(String produitId);

    Optional<PrixReference> getByProduitIdAndTiersPayantId(String produitId, String tiersPayantId);

    Optional<PrixReference> getActifByProduitIdAndTiersPayantId(String produitId, String tiersPayantId);

    void update(PrixReferenceDTO prixReferenceDTO);

    void updatePrixReference(TPreenregistrementDetail preenregistrementDetail,
            List<TCompteClientTiersPayant> clientTiersPayants);

    List<PrixReference> getActifByProduitIdAndTiersPayantIds(String produitId, Set<String> tiersPayantId);

    void updatePrixReference(TPreenregistrementDetail preenregistrementDetail);

    void removeTiersPayantFromVente(TPreenregistrement preenregistrement, String tierspayantId);
}
