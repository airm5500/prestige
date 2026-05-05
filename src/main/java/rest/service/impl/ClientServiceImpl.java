/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.AyantDroitDTO;
import commonTasks.dto.ClientDTO;
import commonTasks.dto.ClientLambdaDTO;
import commonTasks.dto.TiersPayantDTO;
import commonTasks.dto.TiersPayantParams;
import commonTasks.dto.VenteTiersPayantsDTO;
import dal.TAyantDroit;
import dal.TAyantDroit_;
import dal.TCategorieAyantdroit;
import dal.TClient;
import dal.TClient_;
import dal.TCompteClient;
import dal.TCompteClientTiersPayant;
import dal.TCompteClientTiersPayant_;
import dal.TCompteClient_;
import dal.TEmplacement_;
import dal.TGroupeTierspayant;
import dal.TGroupeTierspayant_;
import dal.TModelFacture;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClient;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementCompteClientTiersPayent_;
import dal.TPreenregistrementCompteClient_;
import dal.TPreenregistrement_;
import dal.TRemise;
import dal.TRisque;
import dal.TTiersPayant;
import dal.TTiersPayant_;
import dal.TTypeClient;
import dal.TTypeTiersPayant;
import dal.TTypeTiersPayant_;
import dal.TUser_;
import dal.TVille;
import java.io.IOException;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.ClientService;
import rest.service.ExcelGeneratorService;
import rest.service.dto.GenericExcelDTO;
import util.Constant;
import util.DateConverter;
import util.FunctionUtils;

/**
 *
 * @author Kobena
 */
@Stateless
public class ClientServiceImpl implements ClientService {

    private static final Logger LOG = Logger.getLogger(ClientServiceImpl.class.getName());
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
    @EJB
    private ExcelGeneratorService excelGeneratorService;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public EntityManager getEmg() {
        return em;

    }

    @Override
    public JSONObject createClient(ClientLambdaDTO clientLambda, String venteId) throws JSONException {
        try {
            TPreenregistrement tp = getEmg().find(TPreenregistrement.class, venteId);
            TClient tc = new TClient(UUID.randomUUID().toString());
            tc.setStrADRESSE(clientLambda.getStrADRESSE());
            tc.setLgTYPECLIENTID(new TTypeClient(clientLambda.getLgTYPECLIENTID()));
            tc.setStrFIRSTNAME(clientLambda.getStrFIRSTNAME());
            tc.setStrLASTNAME(clientLambda.getStrLASTNAME());
            tc.setStrSEXE(clientLambda.getStrSEXE());
            tc.setStrSTATUT(Constant.STATUT_ENABLE);
            tc.setDtUPDATED(new Date());
            tc.setDtCREATED(tc.getDtUPDATED());
            tc.setEmail(clientLambda.getEmail());
            tc.setStrCODEINTERNE(DateConverter.getShortId(6));
            getEmg().persist(tc);
            createCompteClient(tc);
            tp.setClient(tc);
            tp.setStrFIRSTNAMECUSTOMER(tc.getStrFIRSTNAME());
            tp.setStrLASTNAMECUSTOMER(tc.getStrLASTNAME());
            tp.setStrPHONECUSTOME(clientLambda.getStrADRESSE());
            getEmg().merge(tp);
            return new JSONObject().put("success", true);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

            return new JSONObject().put("success", false).put("msg",
                    "La mise à jour des infos du client n'a pas abouti");
        }
    }

    @Override
    public TClient createClient(ClientLambdaDTO clientLambda) {

        try {
            TClient tc = new TClient(UUID.randomUUID().toString());
            tc.setStrADRESSE(clientLambda.getStrADRESSE());
            tc.setLgTYPECLIENTID(new TTypeClient(clientLambda.getLgTYPECLIENTID()));
            tc.setStrFIRSTNAME(clientLambda.getStrFIRSTNAME());
            tc.setStrLASTNAME(clientLambda.getStrLASTNAME());
            tc.setStrSEXE(clientLambda.getStrSEXE());
            tc.setStrSTATUT(Constant.STATUT_ENABLE);
            tc.setDtUPDATED(new Date());
            tc.setDtCREATED(tc.getDtUPDATED());
            tc.setStrCODEINTERNE(DateConverter.getShortId(6));
            tc.setEmail(clientLambda.getEmail());
            this.getEmg().persist(tc);
            createCompteClient(tc);
            return tc;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    private TCompteClient createCompteClient(TClient tc) {
        TCompteClient oTCompteClient = new TCompteClient();

        oTCompteClient.setLgCOMPTECLIENTID(UUID.randomUUID().toString());
        oTCompteClient.setStrCODECOMPTECLIENT("");
        // oTCompteClient.setDblQUOTACONSOMENSUELLE(dbl_QUOTA_CONSO_MENSUELLE); // a decommenter en cas de probleme.
        // 17/08/2016
        oTCompteClient.setDblQUOTACONSOMENSUELLE(0.0); // forcer l'initialisation de la consommation a 0. La
        // consommation du quota evolue au fur et a mesure de vente
        oTCompteClient.setDblPLAFOND(-1.0); // code ajouté
        oTCompteClient.setPKey("");
        oTCompteClient.setDblCAUTION(-1.0);
        oTCompteClient.setDecBalanceInDisponible(0);
        oTCompteClient.setDecbalanceDisponible(0);
        oTCompteClient.setStrTYPE("");
        oTCompteClient.setStrSTATUT(Constant.STATUT_ENABLE);
        oTCompteClient.setDtCREATED(new Date());
        oTCompteClient.setLgCLIENTID(tc);
        oTCompteClient.setDtUPDATED(new Date());
        em.persist(oTCompteClient);
        return oTCompteClient;
    }

    @Override
    public List<ClientLambdaDTO> findClientLambda(String query) {
        try {
            EntityManager emg = this.getEmg();
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = emg.getCriteriaBuilder();
            CriteriaQuery<ClientLambdaDTO> cq = cb.createQuery(ClientLambdaDTO.class);
            Root<TClient> root = cq.from(TClient.class);
            cq.select(cb.construct(ClientLambdaDTO.class, root.get(TClient_.lgCLIENTID),
                    root.get(TClient_.strFIRSTNAME), root.get(TClient_.strLASTNAME), root.get(TClient_.strADRESSE),
                    root.get(TClient_.lgTYPECLIENTID).get("lgTYPECLIENTID"), root.get(TClient_.strSEXE),
                    root.get(TClient_.email))).orderBy(cb.asc(root.get(TClient_.strFIRSTNAME)));
            predicates.add(cb.and(cb.equal(root.get(TClient_.strSTATUT), Constant.STATUT_ENABLE)));
            predicates.add(cb.and(
                    cb.equal(root.get(TClient_.lgTYPECLIENTID).get("lgTYPECLIENTID"), Constant.STANDART_CLIENT_ID)));

            if (query != null && !query.equals("")) {
                query = query + "%";
                predicates.add(cb.or(cb.like(root.get(TClient_.strFIRSTNAME), query),
                        cb.like(root.get(TClient_.strLASTNAME), query),
                        cb.like(cb.concat(cb.concat(root.get(TClient_.strFIRSTNAME), " "),
                                root.get(TClient_.strLASTNAME)), query)));
            }

            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = emg.createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ClientDTO> findClientAssurance(String query, String typeClientId) {
        try {
            EntityManager emg = this.getEmg();
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = emg.getCriteriaBuilder();
            CriteriaQuery<TClient> cq = cb.createQuery(TClient.class);
            Root<TClient> root = cq.from(TClient.class);
            cq.select(root).orderBy(cb.asc(root.get(TClient_.strFIRSTNAME)));
            predicates.add(cb.and(cb.equal(root.get(TClient_.strSTATUT), Constant.STATUT_ENABLE)));
            if (!StringUtils.isEmpty(typeClientId)) {
                predicates.add(cb.and(cb.equal(root.get(TClient_.lgTYPECLIENTID).get("lgTYPECLIENTID"), typeClientId)));
            }
            if (!StringUtils.isEmpty(query)) {
                query = query + "%";
                predicates.add(cb.or(cb.like(root.get(TClient_.strNUMEROSECURITESOCIAL), query),
                        cb.like(root.get(TClient_.strFIRSTNAME), query),
                        cb.like(cb.concat(cb.concat(root.get(TClient_.strFIRSTNAME), " "),
                                root.get(TClient_.strLASTNAME)), query)));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = emg.createQuery(cq);
            q.setMaxResults(100);
            List<TClient> resultat = q.getResultList();

            return resultat.stream().map(cl -> new ClientDTO(cl, findTiersPayantByClientId(cl.getLgCLIENTID()),
                    findAyantDroitByClientId(cl.getLgCLIENTID()))).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    Comparator<TiersPayantParams> comparator = Comparator.comparingInt(TiersPayantParams::getOrder);

    @Override
    public List<TiersPayantParams> findTiersPayantByClientId(String clientId) {
        try {
            TypedQuery<TCompteClientTiersPayant> query = getEmg().createQuery(
                    "SELECT o FROM TCompteClientTiersPayant o WHERE o.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID=?1 AND o.strSTATUT=?2",
                    TCompteClientTiersPayant.class);
            query.setParameter(1, clientId);
            query.setParameter(2, Constant.STATUT_ENABLE);
            return query.getResultList().stream().map(TiersPayantParams::new).sorted(comparator)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<TiersPayantParams> findTiersPayantByClientIdExcludeRo(String clientId) {
        try {
            TypedQuery<TCompteClientTiersPayant> query = this.getEmg().createQuery(
                    "SELECT o FROM TCompteClientTiersPayant o WHERE o.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID=?1 AND o.intPRIORITY >1  AND o.strSTATUT=?2",
                    TCompteClientTiersPayant.class);
            query.setParameter(1, clientId);
            query.setParameter(2, Constant.STATUT_ENABLE);
            return query.getResultList().stream().map(TiersPayantParams::new).sorted(comparator)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private List<AyantDroitDTO> findAyantDroitByClientId(String clientId) {
        try {
            TypedQuery<TAyantDroit> query = em.createQuery(
                    "SELECT o FROM TAyantDroit o WHERE o.lgCLIENTID.lgCLIENTID=?1 AND o.strSTATUT=?2",
                    TAyantDroit.class);
            query.setParameter(1, clientId);
            query.setParameter(2, Constant.STATUT_ENABLE);
            return query.getResultList().stream().map(AyantDroitDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<TiersPayantDTO> findTiersPayants(String query, String type) {
        try {
            EntityManager emg = this.getEmg();
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = emg.getCriteriaBuilder();
            CriteriaQuery<TiersPayantDTO> cq = cb.createQuery(TiersPayantDTO.class);
            Root<TTiersPayant> root = cq.from(TTiersPayant.class);
            cq.select(cb.construct(TiersPayantDTO.class, root.get(TTiersPayant_.lgTIERSPAYANTID),
                    root.get(TTiersPayant_.strNAME), root.get(TTiersPayant_.strFULLNAME)))
                    .orderBy(cb.asc(root.get(TTiersPayant_.strNAME)));
            predicates.add(cb.and(cb.equal(root.get(TTiersPayant_.strSTATUT), Constant.STATUT_ENABLE)));
            if (type != null && !"".equals(type)) {
                predicates.add(cb.equal(
                        root.get(TTiersPayant_.lgTYPETIERSPAYANTID).get(TTypeTiersPayant_.lgTYPETIERSPAYANTID), type));
            }

            if (query != null && !query.equals("")) {
                query = query + "%";
                predicates.add(cb.or(cb.like(root.get(TTiersPayant_.strCODEORGANISME), query),
                        cb.like(root.get(TTiersPayant_.strNAME), query),
                        cb.like(root.get(TTiersPayant_.strFULLNAME), query)));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = emg.createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private TClient findById(String id) {
        try {
            return em.find(TClient.class, id);

        } catch (Exception e) {
            return null;
        }
    }

    private TClient updateClientCarnet(ClientDTO client, TClient tc, TCompteClientTiersPayant oltp) {
        try {
            tc = updateClient(client, tc);
            updateCompteClient(client, tc);
            findAndUpdate(oltp, client);
            return tc;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }

    }

    private TRemise findRemiseById(String idRemise) {
        try {
            if (idRemise == null) {
                return null;
            }
            return getEmg().find(TRemise.class, idRemise);
        } catch (Exception e) {
            return null;
        }
    }

    private TClient createClientCarnet(ClientDTO client, TClient tc, TTiersPayant p) {

        try {
            tc = createClient(client);
            TCompteClient compteClient = createCompteClient(client, tc);
            createComptClientTierspayant(client, compteClient, p);
            return tc;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    private boolean doesNumeroSecuriteSocialExist(String secu, TTiersPayant payant) {
        try {
            TypedQuery<TCompteClientTiersPayant> query = this.getEmg().createQuery(
                    "SELECT o FROM TCompteClientTiersPayant o WHERE o.strNUMEROSECURITESOCIAL =?1 AND o.lgTIERSPAYANTID.lgTIERSPAYANTID=?2 ",
                    TCompteClientTiersPayant.class);
            query.setParameter(1, secu);
            query.setParameter(2, payant.getLgTIERSPAYANTID());
            return !(query.getResultList().isEmpty());
        } catch (Exception e) {
            return false;
        }
    }

    private TClient updateClient(ClientDTO clientDTO, TClient client) {

        if (client == null) {
            client = getEmg().find(TClient.class, clientDTO.getLgCLIENTID());
        }
        client.setStrSEXE(clientDTO.getStrSEXE());
        client.setStrSTATUT(Constant.STATUT_ENABLE);
        client.setStrNUMEROSECURITESOCIAL(clientDTO.getStrNUMEROSECURITESOCIAL());
        client.setStrLASTNAME(clientDTO.getStrLASTNAME().toUpperCase());
        client.setStrFIRSTNAME(clientDTO.getStrFIRSTNAME().toUpperCase());
        client.setDtUPDATED(new Date());
        client.setStrCODEPOSTAL(clientDTO.getStrCODEPOSTAL());
        client.setStrADRESSE(clientDTO.getStrADRESSE());
        client.setLgVILLEID(findVilleById(clientDTO.getLgVILLEID()));
        client.setRemise(findRemiseById(clientDTO.getRemiseId()));
        try {
            client.setDtNAISSANCE(dateFormat.parse(clientDTO.getDtNAISSANCE()));
        } catch (ParseException e) {
        }
        getEmg().merge(client);
        return client;
    }

    private TClient createClient(ClientDTO clientDTO) {

        TClient client = new TClient(UUID.randomUUID().toString());
        client.setDtCREATED(new Date());
        client.setStrSEXE(clientDTO.getStrSEXE());
        client.setStrSTATUT(Constant.STATUT_ENABLE);
        client.setStrNUMEROSECURITESOCIAL(clientDTO.getStrNUMEROSECURITESOCIAL());
        client.setStrLASTNAME(clientDTO.getStrLASTNAME().toUpperCase());
        client.setStrFIRSTNAME(clientDTO.getStrFIRSTNAME().toUpperCase());
        client.setDtUPDATED(new Date());
        client.setStrCODEPOSTAL(clientDTO.getStrCODEPOSTAL());
        client.setStrADRESSE(clientDTO.getStrADRESSE());
        client.setLgTYPECLIENTID(findTypeClientById(clientDTO.getLgTYPECLIENTID()));
        client.setLgVILLEID(findVilleById(clientDTO.getLgVILLEID()));
        client.setStrCODEINTERNE(DateConverter.getShortId(6));
        client.setRemise(findRemiseById(clientDTO.getRemiseId()));

        try {
            client.setDtNAISSANCE(dateFormat.parse(clientDTO.getDtNAISSANCE()));
        } catch (ParseException e) {
        }
        em.persist(client);
        return client;
    }

    private TVille findVilleById(String id) {
        try {
            return em.find(TVille.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private TTypeClient findTypeClientById(String id) {
        try {
            return em.find(TTypeClient.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private TTiersPayant findTiersPayantById(String id) {
        try {
            return em.find(TTiersPayant.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private TCategorieAyantdroit findCateAyantById(String id) {
        try {
            return em.find(TCategorieAyantdroit.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private TRisque findRisqueById(String id) {
        try {
            return em.find(TRisque.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private TAyantDroit findAyantDroitByNum(String num) {
        try {
            return em.createNamedQuery("TAyantDroit.findByStrNUMEROSECURITESOCIAL", TAyantDroit.class).setMaxResults(1)
                    .setParameter("strNUMEROSECURITESOCIAL", num).getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private void updateAyantDroit(ClientDTO clientDTO, TClient client, String oldNum) {
        TAyantDroit ayantDroit = findAyantDroitByNum(oldNum);
        ayantDroit.setDtUPDATED(new Date());
        ayantDroit.setStrSTATUT(Constant.STATUT_ENABLE);
        ayantDroit.setLgRISQUEID(findRisqueById(clientDTO.getLgRISQUEID()));
        ayantDroit.setLgCATEGORIEAYANTDROITID(findCateAyantById(clientDTO.getLgCATEGORIEAYANTDROITID()));
        ayantDroit.setStrSEXE(clientDTO.getStrSEXE());
        ayantDroit.setStrFIRSTNAME(clientDTO.getStrFIRSTNAME().toUpperCase());
        ayantDroit.setStrLASTNAME(clientDTO.getStrLASTNAME().toUpperCase());
        ayantDroit.setStrNUMEROSECURITESOCIAL(client.getStrNUMEROSECURITESOCIAL());
        try {
            ayantDroit.setDtNAISSANCE(dateFormat.parse(clientDTO.getDtNAISSANCE()));
        } catch (Exception e) {
        }
        em.persist(ayantDroit);
    }

    private TCompteClient createCompteClient(ClientDTO clientDTO, TClient tc) {
        TCompteClient oTCompteClient = new TCompteClient();
        oTCompteClient.setLgCOMPTECLIENTID(UUID.randomUUID().toString());
        oTCompteClient.setStrCODECOMPTECLIENT("");

        oTCompteClient.setDblQUOTACONSOMENSUELLE(clientDTO.getDblQUOTACONSOMENSUELLE().doubleValue());
        oTCompteClient.setDblPLAFOND(-1.0);
        if (clientDTO.getDbPLAFONDENCOURS() > 0) {
            oTCompteClient.setDblPLAFOND(clientDTO.getDbPLAFONDENCOURS().doubleValue());
        }
        oTCompteClient.setPKey(tc.getLgCLIENTID());
        oTCompteClient.setDblCAUTION(-1.0);
        oTCompteClient.setDecBalanceInDisponible(0);
        oTCompteClient.setDecbalanceDisponible(0);
        oTCompteClient.setDecBalance(0.0);
        oTCompteClient.setStrTYPE("CLIENT");
        oTCompteClient.setStrSTATUT(Constant.STATUT_ENABLE);
        oTCompteClient.setDtCREATED(new Date());
        oTCompteClient.setLgCLIENTID(tc);
        oTCompteClient.setDtUPDATED(new Date());
        oTCompteClient.setDtEffective(new Date());
        em.persist(oTCompteClient);
        return oTCompteClient;
    }

    private TCompteClient findByClientId(String clientId) {
        try {
            return (TCompteClient) em.createQuery("SELECT o FROM TCompteClient o WHERE o.lgCLIENTID.lgCLIENTID=?1 ")
                    .setParameter(1, clientId).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private TCompteClient updateCompteClient(ClientDTO clientDTO, TClient tc) {
        TCompteClient OTCompteClient = findByClientId(tc.getLgCLIENTID());
        OTCompteClient.setStrCODECOMPTECLIENT("");
        OTCompteClient.setDblQUOTACONSOMENSUELLE(clientDTO.getDblQUOTACONSOMENSUELLE().doubleValue());
        OTCompteClient.setDblPLAFOND(-1.0);
        if (clientDTO.getDbPLAFONDENCOURS() > 0) {

            OTCompteClient.setDblPLAFOND(clientDTO.getDbPLAFONDENCOURS().doubleValue());
        }
        OTCompteClient.setPKey(tc.getLgCLIENTID());
        OTCompteClient.setDblCAUTION(-1.0);
        OTCompteClient.setDecBalanceInDisponible(0);
        OTCompteClient.setDecbalanceDisponible(0);
        OTCompteClient.setStrTYPE("");
        OTCompteClient.setStrSTATUT(Constant.STATUT_ENABLE);
        OTCompteClient.setDtUPDATED(new Date());

        em.merge(OTCompteClient);
        return OTCompteClient;
    }

    private void createComptClientTierspayant(ClientDTO cdto, TCompteClient oTCompteClient, TTiersPayant p) {
        TCompteClientTiersPayant oTCompteClientTiersPayant = new TCompteClientTiersPayant(UUID.randomUUID().toString());
        oTCompteClientTiersPayant.setStrSTATUT(Constant.STATUT_ENABLE);
        oTCompteClientTiersPayant.setStrNUMEROSECURITESOCIAL(cdto.getStrNUMEROSECURITESOCIAL());
        oTCompteClientTiersPayant.setBISRO(Boolean.TRUE);
        oTCompteClientTiersPayant.setBCANBEUSE(Boolean.TRUE);
        oTCompteClientTiersPayant.setBIsAbsolute(cdto.isbIsAbsolute());
        oTCompteClientTiersPayant.setDtCREATED(new Date());
        oTCompteClientTiersPayant.setDtUPDATED(oTCompteClientTiersPayant.getDtCREATED());
        oTCompteClientTiersPayant.setLgCOMPTECLIENTID(oTCompteClient);
        oTCompteClientTiersPayant.setLgTIERSPAYANTID(p);
        oTCompteClientTiersPayant.setIntPOURCENTAGE(cdto.getIntPOURCENTAGE());
        oTCompteClientTiersPayant.setIntPRIORITY(cdto.getIntPRIORITY());
        oTCompteClientTiersPayant.setDbPLAFONDENCOURS(0);
        oTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(0);
        oTCompteClientTiersPayant.setDblPLAFOND(0.0);
        oTCompteClientTiersPayant.setDblQUOTACONSOVENTE(0.0);
        oTCompteClientTiersPayant.setIsCapped(Boolean.FALSE);
        if (cdto.getDbPLAFONDENCOURS() > 0) {
            oTCompteClientTiersPayant.setIsCapped(Boolean.TRUE);
            oTCompteClientTiersPayant.setDbPLAFONDENCOURS(cdto.getDbPLAFONDENCOURS());
        }
        if (cdto.getDblQUOTACONSOMENSUELLE() > 0) {
            oTCompteClientTiersPayant.setIsCapped(Boolean.TRUE);
            oTCompteClientTiersPayant.setDblPLAFOND(Double.valueOf(cdto.getDblQUOTACONSOMENSUELLE()));
        }
        em.persist(oTCompteClientTiersPayant);
    }

    private void createComptClientTierspayant(List<TiersPayantParams> tiersPayants, TCompteClient oTCompteClient) {
        tiersPayants.forEach(p -> {
            TCompteClientTiersPayant oTCompteClientTiersPayant = new TCompteClientTiersPayant(
                    UUID.randomUUID().toString());
            oTCompteClientTiersPayant.setStrSTATUT(Constant.STATUT_ENABLE);
            oTCompteClientTiersPayant.setStrNUMEROSECURITESOCIAL(p.getNumSecurity());
            oTCompteClientTiersPayant.setBCANBEUSE(Boolean.TRUE);
            oTCompteClientTiersPayant.setBIsAbsolute(p.isbIsAbsolute());
            oTCompteClientTiersPayant.setDtCREATED(new Date());
            oTCompteClientTiersPayant.setDtUPDATED(oTCompteClientTiersPayant.getDtCREATED());
            oTCompteClientTiersPayant.setLgCOMPTECLIENTID(oTCompteClient);
            oTCompteClientTiersPayant.setLgTIERSPAYANTID(findTiersPayantById(p.getLgTIERSPAYANTID()));
            oTCompteClientTiersPayant.setIntPOURCENTAGE(p.getTaux());
            oTCompteClientTiersPayant.setIntPRIORITY(p.getOrder());
            oTCompteClientTiersPayant.setDbPLAFONDENCOURS(0);
            oTCompteClientTiersPayant.setDblPLAFOND(0.0);
            oTCompteClientTiersPayant.setDblQUOTACONSOVENTE(0.0);
            oTCompteClientTiersPayant.setIsCapped(Boolean.FALSE);
            oTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(0);
            if (p.getDbPLAFONDENCOURS() > 0) {
                oTCompteClientTiersPayant.setIsCapped(Boolean.TRUE);
                oTCompteClientTiersPayant.setDbPLAFONDENCOURS(p.getDbPLAFONDENCOURS());
            }
            if (p.getDblQUOTACONSOMENSUELLE() > 0) {
                oTCompteClientTiersPayant.setIsCapped(Boolean.TRUE);
                oTCompteClientTiersPayant.setDblPLAFOND(Double.valueOf(p.getDblQUOTACONSOMENSUELLE()));
            }
            em.persist(oTCompteClientTiersPayant);

        });
    }

    private void findAndUpdate(TCompteClientTiersPayant oTCompteClientTiersPayant, ClientDTO cdto) {
        oTCompteClientTiersPayant.setStrSTATUT(Constant.STATUT_ENABLE);
        oTCompteClientTiersPayant.setStrNUMEROSECURITESOCIAL(cdto.getStrNUMEROSECURITESOCIAL());
        oTCompteClientTiersPayant.setBISRO(Boolean.TRUE);
        oTCompteClientTiersPayant.setBIsAbsolute(cdto.isbIsAbsolute());
        oTCompteClientTiersPayant.setDtUPDATED(new Date());
        oTCompteClientTiersPayant.setLgTIERSPAYANTID(findTiersPayantById(cdto.getLgTIERSPAYANTID()));
        oTCompteClientTiersPayant.setIntPOURCENTAGE(cdto.getIntPOURCENTAGE());
        oTCompteClientTiersPayant.setIntPRIORITY(cdto.getIntPRIORITY());
        oTCompteClientTiersPayant.setDbPLAFONDENCOURS(0);
        oTCompteClientTiersPayant.setIsCapped(Boolean.FALSE);
        oTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(0);
        if (cdto.getDbPLAFONDENCOURS() > 0) {
            oTCompteClientTiersPayant.setIsCapped(Boolean.TRUE);
            oTCompteClientTiersPayant.setDbPLAFONDENCOURS(cdto.getDbPLAFONDENCOURS());
        }
        if (cdto.getDblQUOTACONSOMENSUELLE() > 0) {
            oTCompteClientTiersPayant.setIsCapped(Boolean.TRUE);
            oTCompteClientTiersPayant.setDblPLAFOND(Double.valueOf(cdto.getDblQUOTACONSOMENSUELLE()));
        }
        em.merge(oTCompteClientTiersPayant);
    }

    private void updateComptClientTierspayant(ClientDTO cdto, TTiersPayant p) {
        TCompteClientTiersPayant oTCompteClientTiersPayant = getEmg().find(TCompteClientTiersPayant.class,
                cdto.getCompteTp());
        oTCompteClientTiersPayant.setStrSTATUT(Constant.STATUT_ENABLE);
        oTCompteClientTiersPayant.setStrNUMEROSECURITESOCIAL(cdto.getStrNUMEROSECURITESOCIAL());
        oTCompteClientTiersPayant.setBISRO(Boolean.TRUE);
        oTCompteClientTiersPayant.setBIsAbsolute(cdto.isbIsAbsolute());
        oTCompteClientTiersPayant.setDtUPDATED(new Date());
        oTCompteClientTiersPayant.setLgTIERSPAYANTID(p);
        oTCompteClientTiersPayant.setIntPOURCENTAGE(cdto.getIntPOURCENTAGE());
        oTCompteClientTiersPayant.setIntPRIORITY(cdto.getIntPRIORITY());
        oTCompteClientTiersPayant.setDbPLAFONDENCOURS(0);
        oTCompteClientTiersPayant.setIsCapped(Boolean.FALSE);
        oTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(0);
        if (cdto.getDbPLAFONDENCOURS() > 0) {
            oTCompteClientTiersPayant.setIsCapped(Boolean.TRUE);
            oTCompteClientTiersPayant.setDbPLAFONDENCOURS(cdto.getDbPLAFONDENCOURS());
        }
        if (cdto.getDblQUOTACONSOMENSUELLE() > 0) {
            oTCompteClientTiersPayant.setIsCapped(Boolean.TRUE);
            oTCompteClientTiersPayant.setDblPLAFOND(Double.valueOf(cdto.getDblQUOTACONSOMENSUELLE()));
        }
        getEmg().merge(oTCompteClientTiersPayant);
    }

    private TCompteClientTiersPayant findTCompteClientTiersPayantById(String id) {
        try {
            return em.find(TCompteClientTiersPayant.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private void updateComptClientTierspayant(List<TiersPayantParams> tiersPayants, TCompteClient oCompteClient) {
        tiersPayants.forEach(p -> {
            TCompteClientTiersPayant oTCompteClientTiersPayant = findTCompteClientTiersPayantById(p.getCompteTp());
            if (oTCompteClientTiersPayant == null) {
                oTCompteClientTiersPayant = new TCompteClientTiersPayant(UUID.randomUUID().toString());
                oTCompteClientTiersPayant.setStrSTATUT(Constant.STATUT_ENABLE);
                oTCompteClientTiersPayant.setStrNUMEROSECURITESOCIAL(p.getNumSecurity());
                oTCompteClientTiersPayant.setBCANBEUSE(Boolean.TRUE);
                oTCompteClientTiersPayant.setBIsAbsolute(p.isbIsAbsolute());
                oTCompteClientTiersPayant.setDtCREATED(new Date());
                oTCompteClientTiersPayant.setDtUPDATED(oTCompteClientTiersPayant.getDtCREATED());
                oTCompteClientTiersPayant.setLgCOMPTECLIENTID(oCompteClient);
                oTCompteClientTiersPayant.setLgTIERSPAYANTID(findTiersPayantById(p.getLgTIERSPAYANTID()));
                oTCompteClientTiersPayant.setIntPOURCENTAGE(p.getTaux());
                oTCompteClientTiersPayant.setIntPRIORITY(p.getOrder());
                oTCompteClientTiersPayant.setDbPLAFONDENCOURS(0);
                oTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(0);
                oTCompteClientTiersPayant.setIsCapped(Boolean.FALSE);
                if (p.getDbPLAFONDENCOURS() > 0) {
                    oTCompteClientTiersPayant.setIsCapped(Boolean.TRUE);
                    oTCompteClientTiersPayant.setDbPLAFONDENCOURS(p.getDbPLAFONDENCOURS());
                }
                if (p.getDblQUOTACONSOMENSUELLE() > 0) {
                    oTCompteClientTiersPayant.setIsCapped(Boolean.TRUE);
                    oTCompteClientTiersPayant.setDblPLAFOND(Double.valueOf(p.getDblQUOTACONSOMENSUELLE()));
                }
                em.persist(oTCompteClientTiersPayant);
            }

        });
    }

    private boolean compteClientTpHasSales(String id) {
        try {
            TypedQuery<TPreenregistrementCompteClientTiersPayent> tq = em.createQuery(
                    "SELECT o FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTTIERSPAYANTID=?1 AND o.strSTATUT='enable'",
                    TPreenregistrementCompteClientTiersPayent.class);
            tq.setParameter(1, id);
            return !tq.getResultList().isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    private void createAyantDroit(ClientDTO clientDTO, TClient client) {
        TAyantDroit ayantDroit = new TAyantDroit(client.getLgCLIENTID());
        ayantDroit.setDtCREATED(new Date());
        ayantDroit.setDtUPDATED(ayantDroit.getDtCREATED());
        ayantDroit.setStrSTATUT(Constant.STATUT_ENABLE);
        ayantDroit.setLgCLIENTID(client);
        ayantDroit.setLgRISQUEID(findRisqueById(clientDTO.getLgRISQUEID()));
        ayantDroit.setLgCATEGORIEAYANTDROITID(findCateAyantById(clientDTO.getLgCATEGORIEAYANTDROITID()));
        ayantDroit.setStrSEXE(clientDTO.getStrSEXE());
        ayantDroit.setStrFIRSTNAME(clientDTO.getStrFIRSTNAME());
        ayantDroit.setStrLASTNAME(clientDTO.getStrLASTNAME());
        ayantDroit.setStrCODEINTERNE(client.getStrCODEINTERNE());
        ayantDroit.setStrNUMEROSECURITESOCIAL(client.getStrNUMEROSECURITESOCIAL());
        try {
            ayantDroit.setDtNAISSANCE(dateFormat.parse(clientDTO.getDtNAISSANCE()));
        } catch (Exception e) {
        }
        em.persist(ayantDroit);
    }

    private TCompteClientTiersPayant findByClientTiersPayantId(String clientId, String tiersPayantId) {
        try {
            return em.createQuery(
                    "SELECT o FROM TCompteClientTiersPayant o WHERE o.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID=?1 AND o.strNUMEROSECURITESOCIAL =?2 ",
                    TCompteClientTiersPayant.class).setParameter(1, clientId).setParameter(2, tiersPayantId)
                    .setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private TCompteClientTiersPayant findByClientTiersPayantId(String clientId, String statut, int priority) {
        try {
            return getEmg().createQuery(
                    "SELECT o FROM TCompteClientTiersPayant o WHERE o.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID=?1 AND o.strSTATUT =?2 AND o.intPRIORITY=?3 ",
                    TCompteClientTiersPayant.class).setParameter(1, clientId).setParameter(2, statut)
                    .setParameter(3, priority).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     *
     * @param clientId
     * @param query
     *
     * @return
     */
    @Override
    public List<AyantDroitDTO> findAyantDroitByClientId(String clientId, String query) {
        try {
            EntityManager emg = this.getEmg();
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = emg.getCriteriaBuilder();
            CriteriaQuery<TAyantDroit> cq = cb.createQuery(TAyantDroit.class);
            Root<TAyantDroit> root = cq.from(TAyantDroit.class);
            cq.select(root).orderBy(cb.asc(root.get(TAyantDroit_.strFIRSTNAME)));
            predicates.add(cb.and(cb.equal(root.get(TAyantDroit_.strSTATUT), Constant.STATUT_ENABLE)));
            predicates.add(cb.and(cb.equal(root.get(TAyantDroit_.lgCLIENTID).get(TClient_.lgCLIENTID), clientId)));
            if (query != null && !query.equals("")) {
                predicates.add(cb.or(cb.like(root.get(TAyantDroit_.strFIRSTNAME), query + "%"),
                        cb.like(root.get(TAyantDroit_.strLASTNAME), query + "%"),
                        cb.like(root.get(TAyantDroit_.strNUMEROSECURITESOCIAL), query + "%")));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = emg.createQuery(cq);
            List<TAyantDroit> ayantDroits = q.getResultList();
            return ayantDroits.stream().map(AyantDroitDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public JSONObject addAyantDroitToClient(AyantDroitDTO dto) throws JSONException {
        JSONObject json = new JSONObject();

        try {
            TAyantDroit ayantDroit = new TAyantDroit(UUID.randomUUID().toString());
            ayantDroit.setDtCREATED(new Date());
            ayantDroit.setDtUPDATED(new Date());
            ayantDroit.setStrSTATUT(Constant.STATUT_ENABLE);
            ayantDroit.setLgCLIENTID(findById(dto.getLgCLIENTID()));
            ayantDroit.setLgRISQUEID(findRisqueById(dto.getLgRISQUEID()));
            ayantDroit.setLgCATEGORIEAYANTDROITID(findCateAyantById(dto.getLgCATEGORIEAYANTDROITID()));
            ayantDroit.setStrSEXE(dto.getStrSEXE());
            ayantDroit.setStrFIRSTNAME(dto.getStrFIRSTNAME());
            ayantDroit.setStrLASTNAME(dto.getStrLASTNAME());
            ayantDroit.setStrCODEINTERNE(DateConverter.getShortId(6));
            ayantDroit.setStrNUMEROSECURITESOCIAL(dto.getStrNUMEROSECURITESOCIAL());
            try {
                ayantDroit.setDtNAISSANCE(dateFormat.parse(dto.getDtNAISSANCE()));
            } catch (Exception e) {
            }
            em.persist(ayantDroit);
            AyantDroitDTO data = new AyantDroitDTO(ayantDroit);
            LOG.log(Level.INFO, "{0}", data);
            json.put("success", true).put("data", new JSONObject(data));
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false).put("msg", "L'ajout de l'ayant droit a échoué");
            return json;
        }
    }

    @Override
    public JSONObject findClientAssuranceById(String clientId, String venteId) throws JSONException {
        try {

            TClient cl = this.getEmg().find(TClient.class, clientId);
            return new JSONObject().put("success", true).put("data",
                    new JSONObject(new ClientDTO(cl, findTiersPayantByClientId(clientId),
                            ventesAssuranceByClientId(clientId, venteId), findAyantDroitByClientId(clientId))));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "-- findClientAssuranceById ---- ", e);
            return new JSONObject().put("success", false).put("msg", "Client avec cet idendifient n'existe pas ");
        }
    }

    private List<TiersPayantParams> ventesAssuranceByClientId(String clientId, String venteId) {
        try {
            TypedQuery<TPreenregistrementCompteClientTiersPayent> tq = em.createQuery(
                    "SELECT o FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgCOMPTECLIENTTIERSPAYANTID.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID=?1 AND o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?2  ",
                    TPreenregistrementCompteClientTiersPayent.class).setParameter(1, clientId).setParameter(2, venteId);
            return tq.getResultList().stream().map(TiersPayantParams::new).collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    @Override
    public List<ClientDTO> clientDifferes(String query, String empl) {
        try {
            EntityManager emg = this.getEmg();
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = emg.getCriteriaBuilder();
            CriteriaQuery<TClient> cq = cb.createQuery(TClient.class);
            Root<TPreenregistrementCompteClient> root = cq.from(TPreenregistrementCompteClient.class);
            cq.select(root.get(TPreenregistrementCompteClient_.lgCOMPTECLIENTID).get(TCompteClient_.lgCLIENTID))
                    .distinct(true);
            predicates.add(
                    cb.and(cb.equal(root.get(TPreenregistrementCompteClient_.strSTATUT), Constant.STATUT_IS_CLOSED)));
            predicates.add(cb.and(cb.equal(root.get(TPreenregistrementCompteClient_.lgUSERID)
                    .get(TUser_.lgEMPLACEMENTID).get(TEmplacement_.lgEMPLACEMENTID), empl)));
            predicates.add(cb.and(cb.greaterThan(root.get(TPreenregistrementCompteClient_.intPRICERESTE), 0)));
            if (query != null && !query.equals("")) {
                predicates
                        .add(cb.or(
                                cb.like(root.get(TPreenregistrementCompteClient_.lgCOMPTECLIENTID)
                                        .get(TCompteClient_.lgCLIENTID).get(TClient_.strFIRSTNAME), query + "%"),
                                cb.like(root.get(TPreenregistrementCompteClient_.lgCOMPTECLIENTID)
                                        .get(TCompteClient_.lgCLIENTID).get(TClient_.strLASTNAME), query + "%"),
                                cb.like(cb.concat(
                                        cb.concat(
                                                root.get(TPreenregistrementCompteClient_.lgCOMPTECLIENTID)
                                                        .get(TCompteClient_.lgCLIENTID).get(TClient_.strFIRSTNAME),
                                                " "),
                                        root.get(TPreenregistrementCompteClient_.lgCOMPTECLIENTID)
                                                .get(TCompteClient_.lgCLIENTID).get(TClient_.strLASTNAME)),
                                        query + "%")));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TClient> q = emg.createQuery(cq);
            return q.getResultList().stream().map(ClientDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ClientDTO> clientDiffere(String query, String empl) {
        try {
            EntityManager emg = this.getEmg();
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = emg.getCriteriaBuilder();
            CriteriaQuery<TClient> cq = cb.createQuery(TClient.class);
            Root<TPreenregistrementCompteClient> root = cq.from(TPreenregistrementCompteClient.class);
            cq.select(root.get(TPreenregistrementCompteClient_.lgCOMPTECLIENTID).get(TCompteClient_.lgCLIENTID))
                    .distinct(true);
            predicates.add(
                    cb.and(cb.equal(root.get(TPreenregistrementCompteClient_.strSTATUT), Constant.STATUT_IS_CLOSED)));
            predicates.add(cb.and(cb.equal(root.get(TPreenregistrementCompteClient_.lgUSERID)
                    .get(TUser_.lgEMPLACEMENTID).get(TEmplacement_.lgEMPLACEMENTID), empl)));

            if (query != null && !query.equals("")) {
                predicates
                        .add(cb.or(
                                cb.like(root.get(TPreenregistrementCompteClient_.lgCOMPTECLIENTID)
                                        .get(TCompteClient_.lgCLIENTID).get(TClient_.strFIRSTNAME), query + "%"),
                                cb.like(root.get(TPreenregistrementCompteClient_.lgCOMPTECLIENTID)
                                        .get(TCompteClient_.lgCLIENTID).get(TClient_.strLASTNAME), query + "%"),
                                cb.like(cb.concat(
                                        cb.concat(
                                                root.get(TPreenregistrementCompteClient_.lgCOMPTECLIENTID)
                                                        .get(TCompteClient_.lgCLIENTID).get(TClient_.strFIRSTNAME),
                                                " "),
                                        root.get(TPreenregistrementCompteClient_.lgCOMPTECLIENTID)
                                                .get(TCompteClient_.lgCLIENTID).get(TClient_.strLASTNAME)),
                                        query + "%")));
            }
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TClient> q = emg.createQuery(cq);
            return q.getResultList().stream().map(ClientDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    /*
     * modification du client à la vente avec un tiers payant different
     */
    private TClient updateClientCarnet(ClientDTO client, TClient tc, TTiersPayant p, TCompteClientTiersPayant old) {
        try {
            tc = updateClient(client, tc);
            TCompteClient oTCompteClient = updateCompteClient(client, tc);
            createComptClientTierspayant(client, oTCompteClient, p);
            desabledCompteClientTiersPayant(old);
            return tc;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }

    }

    private void desabledCompteClientTiersPayant(TCompteClientTiersPayant oTCompteClientTiersPayant) {
        oTCompteClientTiersPayant.setStrSTATUT(Constant.STATUT_DELETE);
        oTCompteClientTiersPayant.setIntPRIORITY(-1);
        getEmg().merge(oTCompteClientTiersPayant);
    }

    @Override
    public JSONObject updateOrCreateClientAssurance(ClientDTO client) throws JSONException {
        JSONObject json = new JSONObject();

        try {
            TClient tc = findById(client.getLgCLIENTID());
            TTiersPayant p = findTiersPayantById(client.getLgTIERSPAYANTID());
            if (p == null) {
                json.put("success", false).put("msg", "Veuillez sélectionner un tiers-payant valide");
                return json;
            }
            if (tc == null) {
                if (!StringUtils.isEmpty(client.getStrNUMEROSECURITESOCIAL())) {
                    if (doesNumeroSecuriteSocialExist(client.getStrNUMEROSECURITESOCIAL(), p)) {
                        json.put("success", false).put("msg",
                                "Le numéro de sécurité :: [<span style=\"color: blue; \"> "
                                        + client.getStrNUMEROSECURITESOCIAL()
                                        + " </span>] est déjà utilisé dans le système");
                        return json;
                    }
                }

                tc = createClient(client);
                TCompteClient compteClient = createCompteClient(client, tc);
                createAyantDroit(client, tc);
                createComptClientTierspayant(client, compteClient, p);
                createComptClientTierspayant(client.getTiersPayants(), compteClient);
            } else {
                if (!StringUtils.isEmpty(client.getStrNUMEROSECURITESOCIAL())) {
                    if (!client.getStrNUMEROSECURITESOCIAL().trim().equals(tc.getStrNUMEROSECURITESOCIAL().trim())) {
                        if (doesNumeroSecuriteSocialExist(client.getStrNUMEROSECURITESOCIAL(), p)) {
                            json.put("success", false).put("msg",
                                    "Le numéro de sécurité :: [<span style=\"color: blue; \"> "
                                            + client.getStrNUMEROSECURITESOCIAL()
                                            + " </span>] est déjà utilisé dans le système");
                            return json;
                        }
                    }
                }
                String oldNum = tc.getStrNUMEROSECURITESOCIAL();
                TCompteClientTiersPayant oltp = findByClientTiersPayantId(client.getLgCLIENTID(),
                        Constant.STATUT_ENABLE, Constant.TIERS_PAYANT_PRINCIPAL);
                TTiersPayant oldltp = oltp.getLgTIERSPAYANTID();
                tc = updateClient(client, tc);
                TCompteClient oTCompteClient = updateCompteClient(client, tc);
                if (!oldltp.equals(p)) {
                    createComptClientTierspayant(client, oTCompteClient, p);
                    desabledCompteClientTiersPayant(oltp);
                } else {
                    updateComptClientTierspayant(client, p);
                }

                updateAyantDroit(client, tc, oldNum);

                updateComptClientTierspayant(client.getTiersPayants(), oTCompteClient);
            }
            ClientDTO data = new ClientDTO(findById(tc.getLgCLIENTID()), findTiersPayantByClientId(tc.getLgCLIENTID()),
                    findAyantDroitByClientId(tc.getLgCLIENTID()));
            json.put("success", true).put("data", new JSONObject(data));
            return json;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

            json.put("success", false).put("msg", "Erreur de création du client");
            return json;

        }
    }

    @Override
    public JSONObject updateCreateClientCarnet(ClientDTO client) throws JSONException {
        JSONObject json = new JSONObject();

        TClient tc;
        try {
            tc = findById(client.getLgCLIENTID());
            TTiersPayant p = findTiersPayantById(client.getLgTIERSPAYANTID());
            if (p == null) {
                json.put("success", false).put("msg", "Veuillez sélectionner un tiers-payant valide");
                return json;
            }

            if (tc == null) {
                if (!StringUtils.isEmpty(client.getStrNUMEROSECURITESOCIAL())) {
                    if (doesNumeroSecuriteSocialExist(client.getStrNUMEROSECURITESOCIAL(), p)) {
                        json.put("success", false).put("msg",
                                "Le numéro de sécurité :: [<span style=\"color: blue; \"> "
                                        + client.getStrNUMEROSECURITESOCIAL()
                                        + " </span>] est déjà utilisé dans le système");
                        return json;
                    }
                }
                tc = createClientCarnet(client, tc, p);

            } else {
                if (!StringUtils.isEmpty(client.getStrNUMEROSECURITESOCIAL())) {
                    if (!client.getStrNUMEROSECURITESOCIAL().trim().equals(tc.getStrNUMEROSECURITESOCIAL().trim())) {
                        if (doesNumeroSecuriteSocialExist(client.getStrNUMEROSECURITESOCIAL(), p)) {
                            json.put("success", false).put("msg",
                                    "Le numéro de sécurité :: [<span style=\"color: blue; \"> "
                                            + client.getStrNUMEROSECURITESOCIAL()
                                            + " </span>] est déjà utilisé dans le système");
                            return json;
                        }
                    }
                }
                TCompteClientTiersPayant oldTpcm = findByClientTiersPayantId(client.getLgCLIENTID(),
                        Constant.STATUT_ENABLE, Constant.TIERS_PAYANT_PRINCIPAL);
                TTiersPayant oltp = oldTpcm.getLgTIERSPAYANTID();

                if (!oltp.equals(p)) {
                    updateClientCarnet(client, tc, p, oldTpcm);
                } else {
                    tc = updateClientCarnet(client, tc, oldTpcm);
                }

            }
            ClientDTO data = new ClientDTO(findById(tc.getLgCLIENTID()), findTiersPayantByClientId(tc.getLgCLIENTID()));
            json.put("success", true).put("data", new JSONObject(data));
            return json;
        } catch (Exception e) {

            json.put("success", false).put("msg", "Erreur de création du client");
            return json;

        }
    }

    @Override
    public void updateCompteClientTiersPayantEncourAndPlafond(String venteId) {
        try {
            ventesAssuranceByVenteId(venteId).forEach(x -> {
                TCompteClientTiersPayant tc = x.getLgCOMPTECLIENTTIERSPAYANTID();
                TTiersPayant tp = tc.getLgTIERSPAYANTID();
                tc.setDbCONSOMMATIONMENSUELLE(tc.getDbCONSOMMATIONMENSUELLE() != null
                        ? tc.getDbCONSOMMATIONMENSUELLE() + x.getIntPRICE() : x.getIntPRICE());
                tp.setDbCONSOMMATIONMENSUELLE(tp.getDbCONSOMMATIONMENSUELLE() != null
                        ? tp.getDbCONSOMMATIONMENSUELLE() + x.getIntPRICE() : x.getIntPRICE());
                if (tc.getDbPLAFONDENCOURS() != null && tc.getDbPLAFONDENCOURS() > 0) {
                    tc.setBCANBEUSE(tc.getDbPLAFONDENCOURS().compareTo(tc.getDbCONSOMMATIONMENSUELLE()) > 0);
                }
                if (tp.getDblPLAFONDCREDIT() != null && tp.getDblPLAFONDCREDIT().intValue() > 0) {
                    tp.setBCANBEUSE(tp.getDblPLAFONDCREDIT().intValue() > tp.getDbCONSOMMATIONMENSUELLE());
                }
                getEmg().merge(tc);
                getEmg().merge(tp);
            });
        } catch (Exception e) {
        }
    }

    private List<TPreenregistrementCompteClientTiersPayent> ventesAssuranceByVenteId(String venteId) {
        try {
            TypedQuery<TPreenregistrementCompteClientTiersPayent> tq = this.getEmg().createQuery(
                    "SELECT o FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1  ",
                    TPreenregistrementCompteClientTiersPayent.class).setParameter(1, venteId);
            return tq.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private List<TCompteClientTiersPayant> findTCompteClientTiersPayanCompteClient(String id) {
        try {
            TypedQuery<TCompteClientTiersPayant> tq = this.getEmg()
                    .createQuery(
                            "SELECT o FROM TCompteClientTiersPayant o WHERE o.lgCOMPTECLIENTID.lgCOMPTECLIENTID =?1  ",
                            TCompteClientTiersPayant.class)
                    .setParameter(1, id);
            return tq.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private void updateComptClientTierspayantPriority(String oTCompteClient) {
        findTCompteClientTiersPayanCompteClient(oTCompteClient).forEach(c -> {
            c.setIntPRIORITY(c.getIntPRIORITY() + 1);
            c.setDtUPDATED(new Date());
            getEmg().merge(c);
        });
    }

    private TCompteClientTiersPayant createComptClientTierspayant(TClient cdto, TCompteClient oTCompteClient, int taux,
            TTiersPayant p, boolean isRO, int order) {
        TCompteClientTiersPayant oCompteClientTiersPayant = new TCompteClientTiersPayant(UUID.randomUUID().toString());
        oCompteClientTiersPayant.setStrSTATUT(Constant.STATUT_ENABLE);
        oCompteClientTiersPayant.setStrNUMEROSECURITESOCIAL(cdto.getStrNUMEROSECURITESOCIAL());
        oCompteClientTiersPayant.setBISRO(isRO);
        oCompteClientTiersPayant.setBCANBEUSE(true);
        oCompteClientTiersPayant.setBIsAbsolute(false);
        oCompteClientTiersPayant.setDtCREATED(new Date());
        oCompteClientTiersPayant.setDtUPDATED(oCompteClientTiersPayant.getDtCREATED());
        oCompteClientTiersPayant.setLgCOMPTECLIENTID(oTCompteClient);
        oCompteClientTiersPayant.setLgTIERSPAYANTID(p);
        oCompteClientTiersPayant.setIntPOURCENTAGE(taux);
        oCompteClientTiersPayant.setIntPRIORITY(order);
        oCompteClientTiersPayant.setDbPLAFONDENCOURS(0);
        oCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(0);
        oCompteClientTiersPayant.setDblPLAFOND(0.0);
        oCompteClientTiersPayant.setDblQUOTACONSOVENTE(0.0);
        oCompteClientTiersPayant.setIsCapped(false);
        getEmg().persist(oCompteClientTiersPayant);
        return oCompteClientTiersPayant;
    }

    @Override
    public TCompteClientTiersPayant updateOrCreateClientAssurance(TClient client, TTiersPayant p, int taux)
            throws Exception {
        TCompteClient compteClient = findByClientId(client.getLgCLIENTID());
        updateComptClientTierspayantPriority(compteClient.getLgCOMPTECLIENTID());
        return createComptClientTierspayant(client, compteClient, taux, p, true, 1);

    }

    @Override
    public TCompteClientTiersPayant updateOrCreateClientAssurance(TClient client, TTiersPayant p, int taux,
            TCompteClientTiersPayant old) throws Exception {
        TCompteClient compteClient = old.getLgCOMPTECLIENTID();
        return createComptClientTierspayant(client, compteClient, taux, p, old.getBISRO(), old.getIntPRIORITY());
    }

    @Override
    public JSONObject addNewTiersPayantToClient(TiersPayantDTO tiersPayantDTO, String clientId,
            String typeTiersPayantId, int taux) throws JSONException {
        try {
            TTiersPayant payant = createTiersPayant(tiersPayantDTO, typeTiersPayantId);
            updateOrCreateClientAssurance(getEmg().find(TClient.class, clientId), payant, taux);
            TiersPayantDTO o = new TiersPayantDTO();
            o.setStrFULLNAME(payant.getStrFULLNAME());
            o.setStrNAME(payant.getStrNAME());
            o.setLgTIERSPAYANTID(payant.getLgTIERSPAYANTID());
            return new JSONObject().put("data", new JSONObject(o)).put("success", true);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false).put("msg", "Error ");
        }
    }

    private TTiersPayant createTiersPayant(TiersPayantDTO tiersPayantDTO, String typeTiersPayantId) {
        try {
            TTiersPayant payant = new TTiersPayant(UUID.randomUUID().toString());
            payant.setBCANBEUSE(Boolean.TRUE);
            payant.setStrFULLNAME(tiersPayantDTO.getStrFULLNAME());
            payant.setStrNAME(tiersPayantDTO.getStrNAME());
            payant.setStrTELEPHONE(tiersPayantDTO.getStrTELEPHONE());
            payant.setStrMAIL("");
            payant.setStrADRESSE(tiersPayantDTO.getStrADRESSE());
            payant.setStrMOBILE("");
            payant.setStrCODEORGANISME(tiersPayantDTO.getStrCODEORGANISME());
            payant.setBIsAbsolute(Boolean.FALSE);
            payant.setStrCODECOMPTABLE("46700000000");
            payant.setIntMONTANTFAC(-1);
            payant.setIntNBREBONS(-1);
            payant.setStrCOMPTECONTRIBUABLE("");
            payant.setDblPLAFONDCREDIT(0.0);
            payant.setBoolIsACCOUNT(false);
            payant.setDblTAUXREMBOURSEMENT(0.0);
            payant.setStrNUMEROCAISSEOFFICIEL("");
            payant.setStrCENTREPAYEUR("");
            payant.setStrCODEREGROUPEMENT("");
            payant.setDblSEUILMINIMUM(0.0);
            payant.setBoolINTERDICTION(false);
            payant.setBoolPRENUMFACTSUBROGATOIRE(false);
            payant.setIntNUMERODECOMPTE(0);
            payant.setStrCODEPAIEMENT("");
            payant.setDblPOURCENTAGEREMISE(0.0);
            payant.setDblREMISEFORFETAIRE(0.0);
            payant.setStrCODEEDITBORDEREAU("");
            payant.setIntNBREEXEMPLAIREBORD(1);
            payant.setIntPERIODICITEEDITBORD(0);
            payant.setIntDATEDERNIEREEDITION(0);
            payant.setStrNUMEROIDFORGANISME("reterte");
            payant.setDblMONTANTFCLIENT(0.0);
            payant.setDblBASEREMISE(0.0);
            payant.setStrCODEDOCCOMPTOIRE("");
            payant.setBoolENABLED(false);
            payant.setStrPHOTO("");
            payant.setStrCODEOFFICINE("");
            payant.setStrREGISTRECOMMERCE("");
            payant.setStrSTATUT(Constant.STATUT_ENABLE);
            payant.setDtCREATED(new Date());
            payant.setDtUPDATED(new Date());
            payant.setLgMODELFACTUREID(getEmg().find(TModelFacture.class, "1"));
            payant.setLgTYPETIERSPAYANTID(getEmg().find(TTypeTiersPayant.class, typeTiersPayantId));
            payant.setLgRISQUEID(getEmg().find(TRisque.class, "55181642844215217016"));
            try {
                payant.setLgGROUPEID(
                        getEmg().find(TGroupeTierspayant.class, Integer.valueOf(tiersPayantDTO.getGroupeId())));
            } catch (Exception e) {
                LOG.log(Level.SEVERE, null, e);
            }
            getEmg().persist(payant);
            return payant;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }

    }

    private TCompteClientTiersPayant findCompteClientTiersPayantByClientId(String clientId) {

        try {
            TypedQuery<TCompteClientTiersPayant> query = getEmg().createQuery(
                    "SELECT o FROM TCompteClientTiersPayant o WHERE o.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID=?1 AND o.strSTATUT=?2",
                    TCompteClientTiersPayant.class);
            query.setParameter(1, clientId);
            query.setParameter(2, Constant.STATUT_ENABLE);
            return query.getResultList().stream().filter(e -> e.getIntPRIORITY().compareTo(1) == 0).findFirst().get();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    @Override
    public JSONObject updateClientInfos(ClientDTO client, String id) {
        JSONObject json = new JSONObject();
        try {
            client.setLgCLIENTID(id);
            TClient tc = findById(id);

            return updateInfosClient(client, tc);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return json.put("success", false).put("msg", "Erreur de modification du client");
        }

    }

    private JSONObject updateInfosClient(ClientDTO client, TClient tc) throws Exception {
        JSONObject json = new JSONObject();

        ClientDTO data;
        String oldNum = tc.getStrNUMEROSECURITESOCIAL();
        TCompteClientTiersPayant payant = findCompteClientTiersPayantByClientId(client.getLgCLIENTID());
        TTiersPayant p = payant.getLgTIERSPAYANTID();
        if (!StringUtils.isEmpty(client.getStrNUMEROSECURITESOCIAL())) {
            if (!client.getStrNUMEROSECURITESOCIAL().equals(tc.getStrNUMEROSECURITESOCIAL())) {
                if (doesNumeroSecuriteSocialExist(client.getStrNUMEROSECURITESOCIAL(), p)) {
                    json.put("success", false).put("msg", "Le numéro de sécurité :: [<span style=\"color: blue; \"> "
                            + client.getStrNUMEROSECURITESOCIAL() + " </span>] est déjà utilisé dans le système");
                    return json;
                }
            }
        }
        tc.setStrNUMEROSECURITESOCIAL(client.getStrNUMEROSECURITESOCIAL());
        tc.setStrLASTNAME(client.getStrLASTNAME().toUpperCase());
        tc.setStrFIRSTNAME(client.getStrFIRSTNAME().toUpperCase());
        tc.setDtUPDATED(new Date());
        tc.setStrADRESSE(client.getStrADRESSE());
        getEmg().merge(tc);
        payant.setStrNUMEROSECURITESOCIAL(client.getStrNUMEROSECURITESOCIAL());
        getEmg().merge(payant);

        if (tc.getLgTYPECLIENTID().getLgTYPECLIENTID().equals(Constant.CLIENT_ASSURANCE)) {
            TAyantDroit ayantDroit = findAyantDroitByNum(oldNum);
            ayantDroit.setDtUPDATED(new Date());
            ayantDroit.setStrFIRSTNAME(client.getStrFIRSTNAME().toUpperCase());
            ayantDroit.setStrLASTNAME(client.getStrLASTNAME().toUpperCase());
            ayantDroit.setStrNUMEROSECURITESOCIAL(client.getStrNUMEROSECURITESOCIAL());
            getEmg().merge(ayantDroit);
            data = new ClientDTO(findById(tc.getLgCLIENTID()), Collections.emptyList(),
                    findAyantDroitByClientId(tc.getLgCLIENTID()));
        } else {
            data = new ClientDTO(findById(tc.getLgCLIENTID()), Collections.emptyList(), Collections.emptyList());
        }

        json.put("success", true).put("data", new JSONObject(data));
        return json;

    }

    @Override
    public JSONObject updateAyantDroitInfos(AyantDroitDTO ayantDroitDTO) {
        JSONObject json = new JSONObject();
        try {
            TAyantDroit ayantDroit = getEmg().find(TAyantDroit.class, ayantDroitDTO.getLgAYANTSDROITSID());
            ayantDroit.setStrFIRSTNAME(ayantDroitDTO.getStrFIRSTNAME().toUpperCase());
            ayantDroit.setStrLASTNAME(ayantDroitDTO.getStrLASTNAME().toUpperCase());
            ayantDroit.setStrNUMEROSECURITESOCIAL(ayantDroitDTO.getStrNUMEROSECURITESOCIAL());
            getEmg().merge(ayantDroit);
            return json.put("success", true).put("data", new JSONObject(new AyantDroitDTO(ayantDroit)));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return json.put("success", false).put("msg", "Erreur de modification des infos de  l'ayant droit");
        }
    }

    @Override
    public JSONObject ventesTiersPayants(String query, String dtStart, String dtEnd, String tiersPayantId,
            String groupeId, String typeTp, int start, int limit) {
        List<VenteTiersPayantsDTO> data = ventesTiersPayants(query, dtStart, dtEnd, tiersPayantId, groupeId, typeTp,
                start, limit, true);
        JSONObject json = new JSONObject();
        int nbre = 0;
        long montant = 0;
        for (VenteTiersPayantsDTO venteTiersPayantsDTO : data) {
            nbre += venteTiersPayantsDTO.getNbreDossier();
            montant += venteTiersPayantsDTO.getMontant();
        }
        return json.put("total", data.size()).put("data", new JSONArray(data)).put("metaData",
                new JSONObject().put("nbre", nbre).put("montant", montant));

    }

    // MODIFICATION ICI POUR CONTOURNER LE BUG D'HIBERNATE
    @Override
    public List<VenteTiersPayantsDTO> ventesTiersPayants(String query, String dtStart, String dtEnd,
            String tiersPayantId, String groupeId, String typeTp, int start, int limit, boolean all) {
        List<VenteTiersPayantsDTO> data = new ArrayList<>();
        try {
            CriteriaBuilder cb = this.getEmg().getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TPreenregistrementCompteClientTiersPayent> root = cq
                    .from(TPreenregistrementCompteClientTiersPayent.class);

            cq.multiselect(
                    root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                            .get(TCompteClientTiersPayant_.lgTIERSPAYANTID),
                    cb.count(root), cb.sum(root.get(TPreenregistrementCompteClientTiersPayent_.intPRICE)),
                    cb.sum(root.get(TPreenregistrementCompteClientTiersPayent_.intPRICERESTE)))
                    .orderBy(cb.asc(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                            .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.strFULLNAME)))
                    .groupBy(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                            .get(TCompteClientTiersPayant_.lgTIERSPAYANTID));

            List<Predicate> predicates = predicateventesTiersPayants(cb, root, query, dtStart, dtEnd, tiersPayantId,
                    groupeId, typeTp);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));

            TypedQuery<Object[]> q = this.getEmg().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }

            // Mapping manuel robuste
            List<Object[]> results = q.getResultList();
            for (Object[] row : results) {
                TTiersPayant payant = (TTiersPayant) row[0];
                Number count = (Number) row[1];
                Number sumPrice = (Number) row[2];
                Number sumReste = (Number) row[3];

                data.add(new VenteTiersPayantsDTO(payant, count, sumPrice, sumReste));
            }

            return data;

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
        return data;
    }

    List<Predicate> predicateventesTiersPayants(CriteriaBuilder cb,
            Root<TPreenregistrementCompteClientTiersPayent> root, String query, String dtStart, String dtEnd,
            String tiersPayantId, String groupeId, String typeTp) {
        List<Predicate> predicates = new ArrayList<>();
        Predicate btw = cb.between(
                cb.function("DATE", Date.class,
                        root.get(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID)
                                .get(TPreenregistrement_.dtCREATED)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
        predicates.add(btw);
        predicates.add(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID)
                .get(TPreenregistrement_.strSTATUT), Constant.STATUT_IS_CLOSED));
        predicates.add(
                cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.strSTATUT), Constant.STATUT_IS_CLOSED));
        predicates.add(cb.isFalse(root.get(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID)
                .get(TPreenregistrement_.bISCANCEL)));
        predicates.add(cb.greaterThan(root.get(TPreenregistrementCompteClientTiersPayent_.lgPREENREGISTREMENTID)
                .get(TPreenregistrement_.intPRICE), 0));
        predicates.add(cb.greaterThan(root.get(TPreenregistrementCompteClientTiersPayent_.intPRICE), 0));
        if (!StringUtils.isEmpty(query)) {
            query = query.toUpperCase();
            predicates.add(cb.or(
                    cb.like(cb.upper(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                            .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.strFULLNAME)),
                            query + "%"),
                    cb.like(cb.upper(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                            .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.strNAME)), query + "%")));
        }

        if (!StringUtils.isEmpty(tiersPayantId) || !StringUtils.isEmpty(query) || !StringUtils.isEmpty(groupeId)) {
            Join<TPreenregistrementCompteClientTiersPayent, TCompteClientTiersPayant> join = root
                    .join(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID, JoinType.INNER);
            if (!StringUtils.isEmpty(tiersPayantId)) {
                predicates.add(
                        cb.equal(join.get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.lgTIERSPAYANTID),
                                tiersPayantId));
            }

            if (!StringUtils.isEmpty(groupeId)) {
                predicates.add(cb.equal(join.get(TCompteClientTiersPayant_.lgTIERSPAYANTID)
                        .get(TTiersPayant_.lgGROUPEID).get(TGroupeTierspayant_.lgGROUPEID), Integer.valueOf(groupeId)));

            }

        }
        if (!StringUtils.isEmpty(typeTp) && !"ALL".equals(typeTp)) {
            predicates.add(cb.equal(root.get(TPreenregistrementCompteClientTiersPayent_.lgCOMPTECLIENTTIERSPAYANTID)
                    .get(TCompteClientTiersPayant_.lgTIERSPAYANTID).get(TTiersPayant_.lgTYPETIERSPAYANTID)
                    .get(TTypeTiersPayant_.lgTYPETIERSPAYANTID), typeTp));
        }
        return predicates;

    }

    public TCompteClientTiersPayant updateOrCreateClientCarnet(TClient client, TTiersPayant p, int taux)
            throws Exception {
        TCompteClient compteClient = findByClientId(client.getLgCLIENTID());
        updateComptClientTierspayantPriority(compteClient.getLgCOMPTECLIENTID());
        return createComptClientTierspayant(client, compteClient, taux, p, true, 1);

    }

    @Override
    public JSONObject fetchClients(String query, String typeClientId, int start, int limit) {
        var count = count(query, typeClientId);
        var data = getClients(query, typeClientId, start, limit).stream().map(ClientDTO::new)
                .collect(Collectors.toList());
        return FunctionUtils.returnData(data, count);
    }

    private List<Predicate> listPredicates(CriteriaBuilder cb, Root<TClient> root, String query, String typeClientId) {
        List<Predicate> predicates = new ArrayList<>();

        predicates.add(cb.equal(root.get(TClient_.strSTATUT), Constant.STATUT_ENABLE));
        if (StringUtils.isNotEmpty(typeClientId)) {
            predicates.add(cb.equal(root.get(TClient_.lgTYPECLIENTID).get("lgTYPECLIENTID"), typeClientId));
        }
        if (StringUtils.isNotEmpty(query)) {
            query = query + "%";
            predicates.add(cb.or(cb.like(root.get(TClient_.strFIRSTNAME), query),
                    cb.like(root.get(TClient_.strLASTNAME), query),
                    cb.like(cb.concat(cb.concat(root.get(TClient_.strFIRSTNAME), " "), root.get(TClient_.strLASTNAME)),
                            query),
                    cb.like(root.get(TClient_.strADRESSE), query), cb.like(root.get(TClient_.strCODEINTERNE), query)));
        }
        return predicates;
    }

    private long count(String query, String typeClientId) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<TClient> root = cq.from(TClient.class);
        cq.select(cb.count(root));
        List<Predicate> predicates = listPredicates(cb, root, query, typeClientId);
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        TypedQuery<Long> q = em.createQuery(cq);
        return Objects.isNull(q.getSingleResult()) ? 0 : q.getSingleResult();

    }

    private List<TClient> getClients(String query, String typeClientId, int start, int limit) {

        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<TClient> cq = cb.createQuery(TClient.class);
        Root<TClient> root = cq.from(TClient.class);
        cq.select(root).orderBy(cb.asc(root.get(TClient_.strFIRSTNAME)), cb.asc(root.get(TClient_.strLASTNAME)));
        List<Predicate> predicates = listPredicates(cb, root, query, typeClientId);
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        TypedQuery<TClient> q = em.createQuery(cq);

        q.setFirstResult(start);
        q.setMaxResults(limit);

        return q.getResultList();
    }

    private GenericExcelDTO buildExeclData(boolean isGroupe, String query, String dtStart, String dtEnd,
            String tiersPayantId, String groupeId, String typeTp) {
        GenericExcelDTO genericExcel = new GenericExcelDTO();
        List<VenteTiersPayantsDTO> data = this.ventesTiersPayants(query, dtStart, dtEnd, tiersPayantId, groupeId,
                typeTp, 0, 0, true);
        if (isGroupe) {

            genericExcel.addColumn("Groupe tiers-payant", "Nbre dossiers", "Montant");
            genericExcel.addWidths(16000, 6000, 8000);

            Map<String, List<VenteTiersPayantsDTO>> groupeDtata = data.stream()
                    .sorted(Comparator
                            .comparing(VenteTiersPayantsDTO::getLibelleGroupe,
                                    Comparator.nullsLast(Comparator.naturalOrder()))
                            .thenComparing(VenteTiersPayantsDTO::getLibelleTiersPayant))
                    .collect(Collectors.groupingBy(VenteTiersPayantsDTO::getGroupBy));
            groupeDtata.forEach((g, v) -> {
                int nbre = 0;
                int montant = 0;
                for (VenteTiersPayantsDTO venteTiersPayantsDTO : v) {
                    nbre += venteTiersPayantsDTO.getNbreDossier();
                    montant += venteTiersPayantsDTO.getMontant();
                }
                Object[] row = { g, nbre, montant };
                genericExcel.addRow(row);
            });
        } else {
            data.sort(Comparator.comparing(VenteTiersPayantsDTO::getTypeTiersPayant)
                    .thenComparing(VenteTiersPayantsDTO::getLibelleTiersPayant));
            genericExcel.addColumn("Tiers-payant", "Code organisme", "Nbre dossiers", "Montant");
            genericExcel.addWidths(20000, 8000, 6000, 8000);
            data.forEach(d -> {

                Object[] row = { StringUtils.isNotEmpty(d.getLibelleTiersPayant()) ? d.getLibelleTiersPayant() : "",
                        StringUtils.isNotEmpty(d.getCodeTiersPayant()) ? d.getCodeTiersPayant() : "",
                        d.getNbreDossier(), d.getMontant() };
                genericExcel.addRow(row);
            });
        }

        return genericExcel;
    }

    @Override
    public byte[] generate(boolean isGroupe, String query, String dtStart, String dtEnd, String tiersPayantId,
            String groupeId, String typeTp) throws IOException {

        return this.excelGeneratorService.generate(
                buildExeclData(isGroupe, query, dtStart, dtEnd, tiersPayantId, groupeId, typeTp), "bordereau");
    }

    @Override
    public void updateTiersPayantPriority(TClient tc, List<TiersPayantParams> tierspayants) {
        boolean hasPrincipal = tierspayants.stream().anyMatch(e -> e.isPrincipal());
        if (!hasPrincipal) {
            return;
        }
        List<TCompteClientTiersPayant> compteClientTiersPayants = getClientTiersPayants(tc.getLgCLIENTID());

        int priority = 1;
        TCompteClientTiersPayant ro = null;
        for (TCompteClientTiersPayant compteClientTiersPayant : compteClientTiersPayants) {
            String idCmp = compteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID();
            TTiersPayant payant = compteClientTiersPayant.getLgTIERSPAYANTID();
            String tiersPayntId = payant.getLgTIERSPAYANTID();
            for (TiersPayantParams payantParams : tierspayants) {
                if ((idCmp.equals(payantParams.getCompteTp()) || tiersPayntId.equals(payantParams.getCompteTp()))
                        && payantParams.isPrincipal()) {
                    compteClientTiersPayant.setIntPRIORITY(priority);
                    compteClientTiersPayant.setBISRO(Boolean.TRUE);
                    em.merge(compteClientTiersPayant);
                    priority++;
                    ro = compteClientTiersPayant;
                    break;

                }
            }
            if (Objects.nonNull(ro)) {
                break;
            }
        }

        for (TCompteClientTiersPayant compteClientTiersPayant : compteClientTiersPayants) {
            if (Objects.nonNull(ro) && compteClientTiersPayant.getLgCOMPTECLIENTTIERSPAYANTID()
                    .equals(ro.getLgCOMPTECLIENTTIERSPAYANTID())) {
                continue;
            }
            compteClientTiersPayant.setBISRO(Boolean.FALSE);
            compteClientTiersPayant.setIntPRIORITY(priority);
            priority++;
            em.merge(compteClientTiersPayant);
        }
    }

    private List<TCompteClientTiersPayant> getClientTiersPayants(String clientId) {
        try {
            TypedQuery<TCompteClientTiersPayant> tq = em.createQuery(
                    "SELECT o FROM TCompteClientTiersPayant o WHERE o.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID=?1 ORDER BY o.intPRIORITY ASC    ",
                    TCompteClientTiersPayant.class).setParameter(1, clientId);
            return tq.getResultList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}