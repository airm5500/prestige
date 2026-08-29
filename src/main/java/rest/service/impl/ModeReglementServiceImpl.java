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
                    // client par defaut (mobile money) pour l'affichage du menu Mode reglement
                    if (e.getLgCLIENTDEFAUTID() != null && !e.getLgCLIENTDEFAUTID().trim().isEmpty()) {
                        modeReglement.setClientDefautId(e.getLgCLIENTDEFAUTID());
                        dal.TClient client = em.find(dal.TClient.class, e.getLgCLIENTDEFAUTID());
                        if (client != null) {
                            modeReglement.setClientDefautNom(
                                    (client.getStrFIRSTNAME() == null ? "" : client.getStrFIRSTNAME()) + " "
                                            + (client.getStrLASTNAME() == null ? "" : client.getStrLASTNAME()));
                        }
                    }

                    return modeReglement;
                }).collect(Collectors.toList());
    }

    @Override
    public JSONObject fetch() {
        return FunctionUtils.returnData(fetchAll());
    }

    /** Types de reglement mobile money — memes identifiants que mobileModeIds de l'ecran de vente. */
    private static final Set<String> TYPES_MOBILE_MONEY = Set.of("7", "8", "9", "10", "19", "70", "80");

    @Override
    public JSONObject clientsMobileMoney() {
        org.json.JSONArray data = new org.json.JSONArray();
        try {
            List<TModeReglement> modes = em
                    .createQuery("SELECT m FROM TModeReglement m WHERE m.strSTATUT = :statut", TModeReglement.class)
                    .setParameter("statut", Constant.STATUT_ENABLE).getResultList();
            for (TModeReglement mode : modes) {
                TTypeReglement type = mode.getLgTYPEREGLEMENTID();
                if (type == null || !TYPES_MOBILE_MONEY.contains(type.getLgTYPEREGLEMENTID())
                        || mode.getLgCLIENTDEFAUTID() == null || mode.getLgCLIENTDEFAUTID().trim().isEmpty()) {
                    continue;
                }
                dal.TClient client = em.find(dal.TClient.class, mode.getLgCLIENTDEFAUTID());
                if (client == null) {
                    continue;
                }
                data.put(new JSONObject().put("typeReglementId", type.getLgTYPEREGLEMENTID())
                        .put("modeLibelle", type.getStrNAME()).put("clientId", client.getLgCLIENTID())
                        .put("nom", client.getStrFIRSTNAME() == null ? "" : client.getStrFIRSTNAME())
                        .put("prenom", client.getStrLASTNAME() == null ? "" : client.getStrLASTNAME())
                        .put("telephone", client.getStrADRESSE() == null ? "" : client.getStrADRESSE()));
            }
            return new JSONObject().put("success", true).put("total", data.length()).put("data", data);
        } catch (Exception e) {
            java.util.logging.Logger.getLogger(ModeReglementServiceImpl.class.getName())
                    .log(java.util.logging.Level.WARNING, "clientsMobileMoney", e);
            return new JSONObject().put("success", true).put("total", 0).put("data", data);
        }
    }

    @Override
    public JSONObject setClientDefaut(String modeReglementId, String clientId) {
        try {
            TModeReglement mode = em.find(TModeReglement.class, modeReglementId);
            if (mode == null) {
                return new JSONObject().put("success", false).put("msg", "Mode de règlement introuvable");
            }
            if (clientId == null || clientId.trim().isEmpty() || "0".equals(clientId)) {
                mode.setLgCLIENTDEFAUTID(null);
            } else {
                dal.TClient client = em.find(dal.TClient.class, clientId);
                if (client == null) {
                    return new JSONObject().put("success", false).put("msg", "Client introuvable");
                }
                mode.setLgCLIENTDEFAUTID(clientId);
            }
            em.merge(mode);
            return new JSONObject().put("success", true);
        } catch (Exception e) {
            java.util.logging.Logger.getLogger(ModeReglementServiceImpl.class.getName())
                    .log(java.util.logging.Level.SEVERE, "setClientDefaut", e);
            return new JSONObject().put("success", false).put("msg", "L'opération a échoué");
        }
    }

}
