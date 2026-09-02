package rest.service.impl;

import dal.TModeReglement;
import dal.TTypeReglement;
import java.io.IOException;
import java.util.Base64;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import javax.ejb.EJB;
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
                    modeReglement.setMobileMoney(util.MobileMoney.est(reglement.getLgTYPEREGLEMENTID()));
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

    @Override
    public JSONObject clientsMobileMoney() {
        org.json.JSONArray data = new org.json.JSONArray();
        try {
            List<TModeReglement> modes = em
                    .createQuery("SELECT m FROM TModeReglement m WHERE m.strSTATUT = :statut", TModeReglement.class)
                    .setParameter("statut", Constant.STATUT_ENABLE).getResultList();
            for (TModeReglement mode : modes) {
                TTypeReglement type = mode.getLgTYPEREGLEMENTID();
                if (type == null || !util.MobileMoney.est(type.getLgTYPEREGLEMENTID())
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

    /** Longueur de str_NAME dans t_type_reglement. */
    static final int LONGUEUR_NOM_MAX = 20;

    @EJB
    private MobileMoneyCache mobileMoneyCache;

    @Override
    public JSONObject creer(String nom, boolean mobileMoney) {
        String libelle = nom == null ? "" : nom.trim().toUpperCase();
        if (libelle.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Le nom du mode de règlement est obligatoire");
        }
        if (libelle.length() > LONGUEUR_NOM_MAX) {
            return new JSONObject().put("success", false).put("msg",
                    "Le nom ne doit pas dépasser " + LONGUEUR_NOM_MAX + " caractères");
        }
        try {
            long doublons = em
                    .createQuery("SELECT COUNT(t) FROM TTypeReglement t WHERE UPPER(t.strNAME) = :nom", Long.class)
                    .setParameter("nom", libelle).getSingleResult()
                    + em.createQuery("SELECT COUNT(m) FROM TModeReglement m WHERE UPPER(m.strNAME) = :nom", Long.class)
                            .setParameter("nom", libelle).getSingleResult();
            if (doublons > 0) {
                return new JSONObject().put("success", false).put("msg",
                        "Un mode de règlement « " + libelle + " » existe déjà");
            }
            // Identifiant numerique commun au type et au mode : le plus grand des deux tables + 1.
            String id = String.valueOf(prochainIdentifiant());
            Date maintenant = new Date();
            TTypeReglement type = new TTypeReglement(id);
            type.setStrNAME(libelle);
            type.setStrDESCRIPTION(libelle);
            type.setStrFLAG("0");
            type.setStrSTATUT(Constant.STATUT_ENABLE);
            type.setStrCATEGORIE(
                    mobileMoney ? util.MobileMoney.CATEGORIE_MOBILE_MONEY : util.MobileMoney.CATEGORIE_STANDARD);
            type.setDtCREATED(maintenant);
            type.setDtUPDATED(maintenant);
            em.persist(type);
            TModeReglement mode = new TModeReglement(id);
            mode.setStrNAME(libelle);
            mode.setStrDESCRIPTION(libelle);
            mode.setStrSTATUT(Constant.STATUT_ENABLE);
            mode.setLgTYPEREGLEMENTID(type);
            mode.setDtCREATED(maintenant);
            mode.setDtUPDATED(maintenant);
            em.persist(mode);
            em.flush();
            mobileMoneyCache.rafraichir();
            return new JSONObject().put("success", true).put("id", id).put("msg",
                    "Mode de règlement « " + libelle + " » créé");
        } catch (Exception e) {
            java.util.logging.Logger.getLogger(ModeReglementServiceImpl.class.getName())
                    .log(java.util.logging.Level.SEVERE, "creer mode de reglement", e);
            return new JSONObject().put("success", false).put("msg", "La création a échoué");
        }
    }

    /** Plus grand identifiant numerique des deux tables + 1 (les identifiants non numeriques sont ignores). */
    private long prochainIdentifiant() {
        long max = 0;
        for (String sql : new String[] { "SELECT lg_TYPE_REGLEMENT_ID FROM t_type_reglement",
                "SELECT lg_MODE_REGLEMENT_ID FROM t_mode_reglement" }) {
            for (Object id : em.createNativeQuery(sql).getResultList()) {
                String s = id == null ? "" : id.toString().trim();
                if (s.matches("\\d{1,15}")) {
                    max = Math.max(max, Long.parseLong(s));
                }
            }
        }
        return max + 1;
    }

}
