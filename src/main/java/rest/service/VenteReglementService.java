package rest.service;

import commonTasks.dto.VenteReglementDTO;
import commonTasks.dto.VenteReglementReportDTO;
import dal.MvtTransaction;
import dal.TPreenregistrement;
import dal.TTypeReglement;
import dal.VenteReglement;
import java.time.LocalDateTime;
import java.util.List;
import javax.ejb.Local;

/**
 *
 * @author koben
 */
@Local
public interface VenteReglementService {

    List<VenteReglement> getByVenteId(String venteId);

    void createNew(TPreenregistrement preenregistrement, TTypeReglement typeReglement, MvtTransaction mt);

    void createVenteReglement(TPreenregistrement tp, VenteReglementDTO p, TTypeReglement typeReglement,
            LocalDateTime mvtDate);

    void createCopyVenteReglement(TPreenregistrement tp, VenteReglement venteReglement);

    List<VenteReglementReportDTO> buildFromEntities(List<VenteReglement> reglements);
}
