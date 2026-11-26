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

    /** Modes ecartes de la liste (et de la vente) : 3, 4 et 6. */
    static final Set<String> MODES_ECARTES = Set.of("3", "4", "6");

    /**
     * journal support du 26/11, capitale (J26-7) : la liste lisait chaque TModeReglement avec son QR code (MEDIUMBLOB,
     * jusqu'a 780 Ko par mode), et org.json l'ecrivait en tableau de nombres : plusieurs Mo de JSON, plus de 5 s, pour
     * une vignette. La liste lit maintenant les colonnes utiles et la seule taille du QR code ; l'image est servie a
     * part ({@link #qrCode(String)}).
     */
    @Override
    @SuppressWarnings("unchecked")
    public List<ModeReglementTDO> fetchAll() {
        List<Object[]> lignes = em.createNativeQuery("SELECT m.lg_MODE_REGLEMENT_ID AS mode_id,"
                + " m.str_NAME AS mode_nom, t.lg_TYPE_REGLEMENT_ID AS type_id, t.str_NAME AS type_nom,"
                + " t.bool_CLIENT_REQUIS AS client_requis, m.lg_CLIENT_DEFAUT_ID AS client_defaut,"
                + " IFNULL(LENGTH(m.qr_code), 0) AS qr_taille"
                + " FROM t_mode_reglement m JOIN t_type_reglement t ON t.lg_TYPE_REGLEMENT_ID = m.lg_TYPE_REGLEMENT_ID"
                + " WHERE m.str_STATUT = ?1").setParameter(1, Constant.STATUT_ENABLE).getResultList();
        List<ModeReglementTDO> modes = liste(lignes);
        for (ModeReglementTDO mode : modes) {
            // client par defaut (mobile money) pour l'affichage du menu Mode reglement
            if (mode.getClientDefautId() != null) {
                dal.TClient client = em.find(dal.TClient.class, mode.getClientDefautId());
                if (client != null) {
                    mode.setClientDefautNom((client.getStrFIRSTNAME() == null ? "" : client.getStrFIRSTNAME()) + " "
                            + (client.getStrLASTNAME() == null ? "" : client.getStrLASTNAME()));
                }
            }
        }
        return modes;
    }

    /**
     * Lignes de la liste (sans base) : {id du mode, nom du mode, id du type, nom du type, client requis, client par
     * defaut, taille du QR code}. Modes 3, 4 et 6 ecartes, tri sur le nom du mode, aucun octet d'image.
     */
    static List<ModeReglementTDO> liste(List<Object[]> lignes) {
        return lignes.stream().filter(l -> l[0] != null && !MODES_ECARTES.contains(String.valueOf(l[0])))
                .sorted(Comparator.comparing((Object[] l) -> l[1] == null ? "" : String.valueOf(l[1]),
                        Comparator.nullsFirst(Comparator.naturalOrder())))
                .map(l -> {
                    ModeReglementTDO m = new ModeReglementTDO();
                    m.setId(String.valueOf(l[0]));
                    m.setTypeReglementId(l[2] == null ? null : String.valueOf(l[2]));
                    m.setName(l[3] == null ? null : String.valueOf(l[3]));
                    m.setMobileMoney(util.MobileMoney.est(m.getTypeReglementId()));
                    m.setClientRequis(vrai(l[4]));
                    String client = l[5] == null ? "" : String.valueOf(l[5]).trim();
                    if (!client.isEmpty()) {
                        m.setClientDefautId(client);
                    }
                    long taille = l[6] == null ? 0L : ((Number) l[6]).longValue();
                    if (taille > 0) {
                        // la taille change avec l'image : une nouvelle image n'est pas prise dans le cache du
                        // navigateur
                        m.setQrCodeUrl("../api/v1/modereglement/" + m.getId() + "/qrcode?v=" + taille);
                    }
                    return m;
                }).collect(Collectors.toList());
    }

    private static boolean vrai(Object o) {
        if (o instanceof Boolean) {
            return (Boolean) o;
        }
        if (o instanceof Number) {
            return ((Number) o).intValue() != 0;
        }
        return o != null && ("1".equals(String.valueOf(o)) || "true".equalsIgnoreCase(String.valueOf(o)));
    }

    /** Image du QR code d'un mode de reglement, ou null s'il n'en a pas. */
    @Override
    @SuppressWarnings("unchecked")
    public byte[] qrCode(String modeReglementId) {
        List<Object> r = em.createNativeQuery("SELECT qr_code FROM t_mode_reglement WHERE lg_MODE_REGLEMENT_ID = ?1")
                .setParameter(1, modeReglementId).getResultList();
        return r.isEmpty() || !(r.get(0) instanceof byte[]) || ((byte[]) r.get(0)).length == 0 ? null
                : (byte[]) r.get(0);
    }

    @Override
    public JSONObject fetch() {
        return FunctionUtils.returnData(fetchAll());
    }

    @Override
    public JSONObject clientsMobileMoney() {
        org.json.JSONArray data = new org.json.JSONArray();
        try {
            /*
             * journal support du 26/11 (J26-7) : sans charger les TModeReglement, dont le QR code (MEDIUMBLOB) venait
             * avec chaque mode a chaque ouverture de la vente
             */
            @SuppressWarnings("unchecked")
            List<Object[]> modes = em
                    .createNativeQuery("SELECT t.lg_TYPE_REGLEMENT_ID, t.str_NAME, m.lg_CLIENT_DEFAUT_ID"
                            + " FROM t_mode_reglement m JOIN t_type_reglement t ON t.lg_TYPE_REGLEMENT_ID = m.lg_TYPE_REGLEMENT_ID"
                            + " WHERE m.str_STATUT = ?1")
                    .setParameter(1, Constant.STATUT_ENABLE).getResultList();
            for (Object[] mode : modes) {
                String typeId = mode[0] == null ? null : String.valueOf(mode[0]);
                String clientId = mode[2] == null ? "" : String.valueOf(mode[2]).trim();
                if (typeId == null || !util.MobileMoney.est(typeId) || clientId.isEmpty()) {
                    continue;
                }
                dal.TClient client = em.find(dal.TClient.class, clientId);
                if (client == null) {
                    continue;
                }
                data.put(new JSONObject().put("typeReglementId", typeId)
                        .put("modeLibelle", mode[1] == null ? null : String.valueOf(mode[1]))
                        .put("clientId", client.getLgCLIENTID())
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
    public JSONObject creer(String nom, boolean mobileMoney, boolean clientRequis) {
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
            // Un mode mobile money demande toujours un client : c'etait deja le cas des operateurs
            // historiques, la case ne sert donc qu'aux autres modes.
            type.setBoolCLIENTREQUIS(mobileMoney || clientRequis);
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

    /**
     * Change l'exigence de client d'un mode de reglement. C'est ce reglage, et non plus une liste dans le code de
     * l'ecran de vente, qui decide si le parcours « choisir ou creer un client » s'ouvre a la selection du mode.
     */
    @Override
    public JSONObject setClientRequis(String modeReglementId, boolean clientRequis) {
        try {
            TModeReglement mode = em.find(TModeReglement.class, modeReglementId);
            if (mode == null || mode.getLgTYPEREGLEMENTID() == null) {
                return new JSONObject().put("success", false).put("msg", "Mode de règlement introuvable");
            }
            TTypeReglement type = mode.getLgTYPEREGLEMENTID();
            type.setBoolCLIENTREQUIS(clientRequis);
            type.setDtUPDATED(new Date());
            em.merge(type);
            return new JSONObject().put("success", true);
        } catch (Exception e) {
            java.util.logging.Logger.getLogger(ModeReglementServiceImpl.class.getName())
                    .log(java.util.logging.Level.SEVERE, "exigence de client d'un mode de reglement", e);
            return new JSONObject().put("success", false).put("msg", "L'enregistrement a échoué");
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
