package rest.service.impl;

import dal.TModeReglement;
import dal.TTypeReglement;
import java.io.IOException;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.servlet.http.Part;
import org.apache.commons.io.IOUtils;
import org.json.JSONObject;
import rest.service.ModeReglementService;
import rest.service.dto.ModeReglementTDO;
import util.Constant;
import util.FunctionUtils;

@Stateless
public class ModeReglementServiceImpl implements ModeReglementService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public void addQrCode(String id, Part filePart) throws IOException {
        TModeReglement modeReglement = em.find(TModeReglement.class, id);
        byte[] bytes = IOUtils.toByteArray(filePart.getInputStream());
        modeReglement.setQrCode(bytes);
        em.merge(modeReglement);

    }

    @Override
    public List<ModeReglementTDO> fetchAll() {
        TypedQuery<TModeReglement> typedQuery = em.createNamedQuery("TModeReglement.findByStrSTATUT",
                TModeReglement.class);
        Set<String> excluidIds = Set.of("3", "4", "6");
        typedQuery.setParameter("strSTATUT", Constant.STATUT_ENABLE);
        return typedQuery.getResultStream().filter(r -> !excluidIds.contains(r.getLgMODEREGLEMENTID()))
                .sorted(Comparator.comparing(TModeReglement::getStrNAME)).map(e -> {
                    ModeReglementTDO modeReglement = new ModeReglementTDO();
                    TTypeReglement reglement = e.getLgTYPEREGLEMENTID();
                    modeReglement.setId(e.getLgMODEREGLEMENTID());
                    modeReglement.setName(reglement.getStrNAME());
                    modeReglement.setTypeReglementId(reglement.getLgTYPEREGLEMENTID());
                    modeReglement.setQrCode(e.getQrCode());

                    return modeReglement;
                }).collect(Collectors.toList());
    }

    @Override
    public JSONObject fetch() {
        return FunctionUtils.returnData(fetchAll());
    }

}
