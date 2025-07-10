/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import dal.MvtTransaction;
import dal.Reference;
import dal.TAyantDroit;
import dal.TCategorieAyantdroit;
import dal.TClient;
import dal.TCompteClient;
import dal.TCompteClientTiersPayant;
import dal.TEmplacement;
import dal.TFamille;
import dal.TGroupeTierspayant;
import dal.TModeReglement;
import dal.TModelFacture;
import dal.TNatureVente;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementDetail;
import dal.TReglement;
import dal.TRemise;
import dal.TRisque;
import dal.TTiersPayant;
import dal.TTypeClient;
import dal.TTypeMvtCaisse;
import dal.TTypeReglement;
import dal.TTypeTiersPayant;
import dal.TTypeVente;
import dal.TUser;
import dal.enumeration.CategoryTransaction;
import dal.enumeration.TypeTransaction;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.Iterator;
import java.util.Optional;
import java.util.Stack;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.transaction.HeuristicMixedException;
import javax.transaction.HeuristicRollbackException;
import javax.transaction.NotSupportedException;
import javax.transaction.RollbackException;
import javax.transaction.SystemException;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import toolkits.parameters.commonparameter;
import util.DateConverter;

/**
 *
 * @author koben
 */
@Stateless
public class ImportationVenteDepot {

    private static final Logger LOG = Logger.getLogger(ImportationVenteDepot.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public EntityManager getEntityManager() {
        return em;
    }

    private TModeReglement findModeReglementByStrNAME(String StrNAME) {
        TypedQuery<TModeReglement> query = getEntityManager().createNamedQuery("TModeReglement.findByStrNAME",
                TModeReglement.class);
        query.setParameter("strNAME", StrNAME);
        query.setMaxResults(1);
        return query.getSingleResult();
    }

    private TNatureVente findNatureVente(String strLIBELLE) {
        TypedQuery<TNatureVente> query = getEntityManager().createNamedQuery("TNatureVente.findByStrLIBELLE",
                TNatureVente.class);
        query.setParameter("strLIBELLE", strLIBELLE);
        query.setMaxResults(1);
        return query.getSingleResult();
    }

    private TTypeVente findTypeVente(String strNAME) {
        TypedQuery<TTypeVente> query = getEntityManager().createNamedQuery("TTypeVente.findByStrNAME",
                TTypeVente.class);
        query.setParameter("strNAME", strNAME);
        query.setMaxResults(1);
        return query.getSingleResult();
    }

    private Optional<TAyantDroit> findAyantDroitById(String ayantDroitId) {
        try {
            return Optional.ofNullable(getEntityManager().find(TAyantDroit.class, ayantDroitId));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private TRisque findRisqueById(String id) {
        try {
            return getEntityManager().find(TRisque.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private TReglement addReglement(JSONObject reglementRecord, Date dateOpearation, String venteId, TUser user) {
        TReglement OTReglement = new TReglement(venteId);
        OTReglement.setStrBANQUE(reglementRecord.getString("strBANQUE"));
        OTReglement.setStrCODEMONNAIE(reglementRecord.getString("strCODEMONNAIE"));
        OTReglement.setStrCOMMENTAIRE(reglementRecord.getString("strCOMMENTAIRE"));
        OTReglement.setStrLIEU(reglementRecord.getString("strLIEU"));
        OTReglement.setStrFIRSTLASTNAME(reglementRecord.getString("strFIRSTLASTNAME"));
        OTReglement.setStrREFRESSOURCE(venteId);
        OTReglement.setIntTAUX(0);
        OTReglement.setDtCREATED(dateOpearation);
        OTReglement.setDtUPDATED(dateOpearation);
        OTReglement.setLgMODEREGLEMENTID(findModeReglementByStrNAME(reglementRecord.getString("lgMODEREGLEMENTID")));
        OTReglement.setDtREGLEMENT(dateOpearation);
        OTReglement.setLgUSERID(user);
        OTReglement.setBoolCHECKED(reglementRecord.getBoolean("boolCHECKED"));
        OTReglement.setStrSTATUT(DateConverter.STATUT_ENABLE);
        getEntityManager().persist(OTReglement);
        return OTReglement;
    }

    private TCompteClient findByClientId(String clientId) {
        try {
            return (TCompteClient) getEntityManager()
                    .createQuery("SELECT o FROM TCompteClient o WHERE o.lgCLIENTID.lgCLIENTID=?1 ")
                    .setParameter(1, clientId).setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private TCompteClient findOneByClientOrCreate(TClient tc) {
        TCompteClient OTCompteClient = findByClientId(tc.getLgCLIENTID());
        if (OTCompteClient != null) {
            return OTCompteClient;
        }

        OTCompteClient = new TCompteClient();

        OTCompteClient.setLgCOMPTECLIENTID(tc.getLgCLIENTID());
        OTCompteClient.setStrCODECOMPTECLIENT("");
        OTCompteClient.setDblQUOTACONSOMENSUELLE(0.0);
        OTCompteClient.setDblPLAFOND(-1.0);
        OTCompteClient.setPKey(tc.getLgCLIENTID());
        OTCompteClient.setDblCAUTION(-1.0);
        OTCompteClient.setDecBalanceInDisponible(0);
        OTCompteClient.setDecbalanceDisponible(0);
        OTCompteClient.setDecBalance(0.0);
        OTCompteClient.setStrTYPE("CLIENT");
        OTCompteClient.setStrSTATUT(commonparameter.statut_enable);
        OTCompteClient.setDtCREATED(tc.getDtCREATED());
        OTCompteClient.setLgCLIENTID(tc);
        OTCompteClient.setDtUPDATED(tc.getDtCREATED());
        OTCompteClient.setDtEffective(tc.getDtCREATED());
        getEntityManager().persist(OTCompteClient);
        return OTCompteClient;
    }

    private Optional<TClient> findClientById(String clientId) {
        try {
            return Optional.ofNullable(getEntityManager().find(TClient.class, clientId));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private TTypeClient findTypeClientById(String id) {
        try {
            return getEntityManager().find(TTypeClient.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    public TClient addClient(JSONObject record, Date dateOperation, Stack<TClient> clients) throws Exception {
        if (record.isEmpty()) {
            return null;
        }
        TClient client = null;
        Optional<TClient> op = findClientById(record.getString("uuid"));
        if (op.isPresent()) {
            client = op.get();

        } else {
            client = new TClient(record.getString("uuid"));
            if (clients.contains(client)) {
                return client;
            }
            client.setDtCREATED(dateOperation);
            client.setDtUPDATED(dateOperation);
            client.setStrSTATUT(DateConverter.STATUT_ENABLE);
            client.setStrCODEINTERNE(DateConverter.getShortId(6));
        }
        if (record.has("strSEXE")) {
            client.setStrSEXE(record.getString("strSEXE"));
        }
        client.setStrCODEPOSTAL(record.getString("strCODEPOSTAL"));
        client.setStrFIRSTNAME(record.getString("strFIRSTNAME"));
        client.setStrLASTNAME(record.getString("strLASTNAME"));
        client.setStrNUMEROSECURITESOCIAL(record.getString("strNUMEROSECURITESOCIAL"));
        client.setLgTYPECLIENTID(findTypeClientById(record.getString("lgTYPECLIENTID")));
        if (record.has("dtNAISSANCE")) {
            client.setDtNAISSANCE(DateConverter.dateFromString(record.getString("dtNAISSANCE")));
        }

        if (op.isPresent()) {
            getEntityManager().merge(client);
        } else {
            getEntityManager().persist(client);
        }
        clients.push(client);
        return client;

    }

    private TRemise findRemiseById(String remiseId) {
        if (StringUtils.isEmpty(remiseId)) {
            return null;
        }
        try {
            return getEntityManager().find(TRemise.class, remiseId);
        } catch (Exception e) {
        }
        return null;
    }

    private TCategorieAyantdroit findCateAyantById(String id) {
        try {
            return getEntityManager().find(TCategorieAyantdroit.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    public TAyantDroit addAyantDroitToClient(JSONObject ayantDroitRecord, TClient client, Date dateOperation,
            Stack<TAyantDroit> ayantDroits) {
        if (ayantDroitRecord.isEmpty()) {
            return null;
        }
        TAyantDroit ayantDroit;
        Optional<TAyantDroit> op = findAyantDroitById(ayantDroitRecord.getString("uuid"));
        if (op.isPresent()) {
            ayantDroit = op.get();

        } else {
            ayantDroit = new TAyantDroit(ayantDroitRecord.getString("uuid"));
            if (ayantDroits.contains(ayantDroit)) {
                return ayantDroit;
            }
            ayantDroit.setDtCREATED(dateOperation);
            ayantDroit.setDtUPDATED(dateOperation);
            ayantDroit.setStrSTATUT(DateConverter.STATUT_ENABLE);
            ayantDroit.setLgCLIENTID(client);
            ayantDroit.setLgRISQUEID(findRisqueById(ayantDroitRecord.getString("lgRISQUEID")));
            ayantDroit.setLgCATEGORIEAYANTDROITID(
                    findCateAyantById(ayantDroitRecord.getString("lgCATEGORIEAYANTDROITID")));
            ayantDroit.setStrCODEINTERNE(DateConverter.getShortId(6));

        }

        if (ayantDroitRecord.has("strSEXE")) {
            ayantDroit.setStrSEXE(ayantDroitRecord.getString("strSEXE"));
        }
        if (ayantDroitRecord.has("strNUMEROSECURITESOCIAL")) {
            ayantDroit.setStrNUMEROSECURITESOCIAL(ayantDroitRecord.getString("strNUMEROSECURITESOCIAL"));
        }
        ayantDroit.setStrFIRSTNAME(ayantDroitRecord.getString("strFIRSTNAME"));
        ayantDroit.setStrLASTNAME(ayantDroitRecord.getString("strLASTNAME"));

        if (ayantDroitRecord.has("dtNAISSANCE")) {
            ayantDroit.setDtNAISSANCE(DateConverter.dateFromString(ayantDroitRecord.getString("dtNAISSANCE")));
        }
        if (op.isPresent()) {
            getEntityManager().merge(ayantDroit);

        } else {
            getEntityManager().persist(ayantDroit);
        }

        ayantDroits.push(ayantDroit);
        return ayantDroit;

    }

    public TPreenregistrement createPreVente(JSONObject record, Stack<TTiersPayant> tierspaynts, Stack<TClient> clients,
            Stack<TAyantDroit> ayantDroits, TUser user, Stack<String> coupleClientTierPayant,
            Stack<TCompteClientTiersPayant> compteClientTiersPayants) throws Exception {

        Date dateOpearation = DateConverter.dateFromString(record.getString("dtUPDATED"));
        TReglement reglement = addReglement(record.getJSONObject("reglement"), dateOpearation, record.getString("uuid"),
                user);
        // System.out.println("reglement------->>> " + reglement);
        TNatureVente oTNatureVente = findNatureVente(record.getString("lgNATUREVENTEID"));
        TTypeVente OTTypeVente = findTypeVente(record.getString("lgTYPEVENTEID"));
        TClient client = addClient(record.getJSONObject("client"), dateOpearation, clients);
        // System.out.println("client------->>> " + client);
        TCompteClient compteClient = findOneByClientOrCreate(client);
        // System.out.println("compteClient------->>> " + compteClient);
        TRemise OTRemise = findRemiseById(record.has("remise") ? record.getString("remise") : null);
        TAyantDroit ayantDroit = addAyantDroitToClient(record.getJSONObject("ayantDroit"), client, dateOpearation,
                ayantDroits);
        // System.out.println("ayantDroit------->>> " + ayantDroit);
        TPreenregistrement OTPreenregistrement = new TPreenregistrement(record.getString("uuid"));
        OTPreenregistrement.setLgREGLEMENTID(reglement);
        OTPreenregistrement.setLgUSERVENDEURID(user);
        OTPreenregistrement.setLgUSERCAISSIERID(user);
        OTPreenregistrement.setLgUSERID(user);
        OTPreenregistrement.setImported(true);
        OTPreenregistrement.setStrREFTICKET(record.getString("strREFTICKET"));
        OTPreenregistrement.setStrTYPEVENTE(record.getString("strTYPEVENTE"));
        OTPreenregistrement.setStrSTATUTVENTE(record.getString("strSTATUTVENTE"));
        OTPreenregistrement.setIntPRICE(record.getInt("intPRICE"));
        OTPreenregistrement.setIntACCOUNT(record.getInt("intACCOUNT"));
        OTPreenregistrement.setIntPRICEOTHER(record.getInt("intPRICEOTHER"));
        OTPreenregistrement.setBISCANCEL(false);
        OTPreenregistrement.setBWITHOUTBON(record.getBoolean("bWITHOUTBON"));
        OTPreenregistrement.setIntCUSTPART(record.getInt("intCUSTPART"));
        OTPreenregistrement.setIntPRICEREMISE(record.getInt("intPRICEREMISE"));
        OTPreenregistrement.setIntSENDTOSUGGESTION(0);
        OTPreenregistrement.setMontantTva(record.getInt("montantTva"));
        OTPreenregistrement.setCopy(Boolean.FALSE);
        OTPreenregistrement.setStrREFBON(record.getString("strREFBON"));
        OTPreenregistrement.setChecked(Boolean.TRUE);
        OTPreenregistrement.setIntREMISEPARA(record.getInt("intREMISEPARA"));
        OTPreenregistrement.setPkBrand("");
        OTPreenregistrement.setDtCREATED(dateOpearation);
        OTPreenregistrement.setDtUPDATED(dateOpearation);
        if (client != null) {
            OTPreenregistrement.setClient(client);
            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(client.getStrFIRSTNAME());
            OTPreenregistrement.setStrLASTNAMECUSTOMER(client.getStrLASTNAME());
            OTPreenregistrement.setStrPHONECUSTOME("");

        }
        if (ayantDroit != null) {
            OTPreenregistrement.setAyantDroit(ayantDroit);
            OTPreenregistrement.setStrFIRSTNAMECUSTOMER(ayantDroit.getStrFIRSTNAME());
            OTPreenregistrement.setStrLASTNAMECUSTOMER(ayantDroit.getStrFIRSTNAME());
            OTPreenregistrement.setStrPHONECUSTOME("");
            OTPreenregistrement.setStrINFOSCLT("");
        }
        OTPreenregistrement
                .setStrREF(buildRef(DateConverter.convertDateToLocalDate(dateOpearation), user.getLgEMPLACEMENTID())
                        .getReference());
        OTPreenregistrement.setLgREMISEID(OTRemise != null ? OTRemise.getLgREMISEID() : "");
        OTPreenregistrement.setRemise(OTRemise);
        OTPreenregistrement.setLgNATUREVENTEID(oTNatureVente);
        OTPreenregistrement.setLgTYPEVENTEID(OTTypeVente);
        OTPreenregistrement.setStrSTATUT(DateConverter.STATUT_IS_CLOSED);
        OTPreenregistrement.setBISAVOIR(false);
        // System.out.println("OTPreenregistrement ------->>> " + OTPreenregistrement);
        getEntityManager().persist(OTPreenregistrement);
        clients.push(client);
        if (ayantDroit != null) {
            ayantDroits.push(ayantDroit);
        }
        addMvtTransaction(record.getJSONObject("mvtTransaction"), OTPreenregistrement);
        createDetailsVente(record.getJSONArray("items"), OTPreenregistrement);
        createVenteTiersPayantItems(record.getJSONArray("venteAssurances"), tierspaynts, compteClient,
                OTPreenregistrement, coupleClientTierPayant, compteClientTiersPayants);
        return OTPreenregistrement;
    }

    private TTiersPayant findTiersPayantOrCreateOne(JSONObject json, Stack<TTiersPayant> tierspaynts) {
        TTiersPayant payant = findTiersPayantById(json.getString("tierspayantId"));
        if (payant != null) {
            return payant;
        }

        payant = new TTiersPayant(json.getString("tierspayantId"));
        if (tierspaynts.contains(payant)) {
            return payant;
        }
        payant.setBCANBEUSE(Boolean.TRUE);
        payant.setStrFULLNAME(json.getString("strFULLNAME"));
        payant.setStrNAME(json.getString("strNAME"));
        payant.setStrTELEPHONE(json.getString("strTELEPHONE"));
        payant.setStrMAIL("");
        payant.setStrADRESSE(json.getString("strADRESSE"));
        payant.setStrMOBILE(json.getString("strMOBILE"));
        payant.setStrCODEORGANISME(json.getString("strCODEORGANISME"));
        payant.setBIsAbsolute(json.getBoolean("bIsAbsolute"));
        payant.setStrCODECOMPTABLE("46700000000");
        payant.setIntMONTANTFAC(json.getInt("intMONTANTFAC"));
        payant.setIntNBREBONS(json.getInt("intNBREBONS"));
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
        payant.setStrSTATUT(commonparameter.statut_enable);
        payant.setDtCREATED(new Date());
        payant.setDtUPDATED(new Date());
        payant.setLgMODELFACTUREID(getEntityManager().find(TModelFacture.class, json.getString("lgMODELFACTUREID")));
        payant.setLgTYPETIERSPAYANTID(
                getEntityManager().find(TTypeTiersPayant.class, json.getString("lgTYPETIERSPAYANTID")));
        payant.setLgRISQUEID(getEntityManager().find(TRisque.class, "55181642844215217016"));
        try {
            if (json.has("lgGROUPEID")) {
                payant.setLgGROUPEID(getEntityManager().find(TGroupeTierspayant.class, json.getInt("lgGROUPEID")));
            }
        } catch (Exception e) {

        }
        getEntityManager().persist(payant);
        tierspaynts.push(payant);
        return payant;
    }

    private TTiersPayant findTiersPayantById(String id) {
        try {
            return getEntityManager().find(TTiersPayant.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private TCompteClientTiersPayant findByClientTiersPayantId(String clientId, String tiersPayantId) {
        try {
            return getEntityManager().createQuery(
                    "SELECT o FROM TCompteClientTiersPayant o WHERE o.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID=?1 AND o.lgTIERSPAYANTID.lgTIERSPAYANTID =?2 ",
                    TCompteClientTiersPayant.class).setParameter(1, clientId).setParameter(2, tiersPayantId)
                    .setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private TCompteClientTiersPayant findByClientTiersPayantId(TCompteClient OTCompteClient, String tiersPayantId) {
        try {
            return getEntityManager().createQuery(
                    "SELECT o FROM TCompteClientTiersPayant o WHERE o.lgCOMPTECLIENTID=?1 AND o.strNUMEROSECURITESOCIAL =?2 ",
                    TCompteClientTiersPayant.class).setParameter(1, OTCompteClient).setParameter(2, tiersPayantId)
                    .setMaxResults(1).getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private TCompteClientTiersPayant findOrCreateOneCmpt(JSONObject json, TCompteClient OTCompteClient,
            TTiersPayant payant, Stack<String> coupleClientTierPayant,
            Stack<TCompteClientTiersPayant> compteClientTiersPayants) throws Exception {
        TCompteClientTiersPayant OTCompteClientTiersPayant = findByClientTiersPayantId(
                OTCompteClient.getLgCLIENTID().getLgCLIENTID(), payant.getLgTIERSPAYANTID());
        if (OTCompteClientTiersPayant != null) {
            return OTCompteClientTiersPayant;
        }

        if (coupleClientTierPayant
                .contains(OTCompteClient.getLgCLIENTID().getLgCLIENTID() + "" + payant.getLgTIERSPAYANTID())) {
            for (Iterator<TCompteClientTiersPayant> iterator = compteClientTiersPayants.iterator(); iterator
                    .hasNext();) {
                TCompteClientTiersPayant next = iterator.next();
                if (next.getLgCOMPTECLIENTID().equals(OTCompteClient) && next.getLgTIERSPAYANTID().equals(payant)) {
                    OTCompteClientTiersPayant = next;
                    return OTCompteClientTiersPayant;
                }
            }
        }
        if (OTCompteClientTiersPayant == null) {
            OTCompteClientTiersPayant = new TCompteClientTiersPayant(UUID.randomUUID().toString());
        }
        OTCompteClientTiersPayant.setStrSTATUT(commonparameter.statut_enable);
        OTCompteClientTiersPayant.setStrNUMEROSECURITESOCIAL(json.getString("strNUMEROSECURITESOCIAL"));
        OTCompteClientTiersPayant.setBISRO(json.getBoolean("bISRO"));
        OTCompteClientTiersPayant.setBCANBEUSE(Boolean.TRUE);
        OTCompteClientTiersPayant.setBIsAbsolute(json.getBoolean("bIsAbsolute"));
        OTCompteClientTiersPayant.setDtCREATED(OTCompteClient.getDtUPDATED());
        OTCompteClientTiersPayant.setDtUPDATED(OTCompteClient.getDtUPDATED());
        OTCompteClientTiersPayant.setLgCOMPTECLIENTID(OTCompteClient);
        OTCompteClientTiersPayant.setLgTIERSPAYANTID(payant);
        OTCompteClientTiersPayant.setIntPOURCENTAGE(json.getInt("intPOURCENTAGE"));
        OTCompteClientTiersPayant.setIntPRIORITY(json.getInt("intPRIORITY"));
        OTCompteClientTiersPayant.setDbPLAFONDENCOURS(0);
        OTCompteClientTiersPayant.setDblQUOTACONSOMENSUELLE(0);
        OTCompteClientTiersPayant.setDblPLAFOND(0.0);
        OTCompteClientTiersPayant.setDblQUOTACONSOVENTE(0.0);
        OTCompteClientTiersPayant.setIsCapped(Boolean.FALSE);
        getEntityManager().persist(OTCompteClientTiersPayant);
        compteClientTiersPayants.push(OTCompteClientTiersPayant);
        coupleClientTierPayant.push(OTCompteClient.getLgCLIENTID().getLgCLIENTID() + "" + payant.getLgTIERSPAYANTID());
        return OTCompteClientTiersPayant;
    }

    private void createVenteTiersPayantItems(JSONArray items, Stack<TTiersPayant> tierspaynts,
            TCompteClient compteClient, TPreenregistrement OTPreenregistrement, Stack<String> coupleClientTierPayant,
            Stack<TCompteClientTiersPayant> compteClientTiersPayants) throws Exception {
        for (int i = 0; i < items.length(); i++) {
            JSONObject json = items.getJSONObject(i);
            TTiersPayant tierspayant = findTiersPayantOrCreateOne(json, tierspaynts);
            TCompteClientTiersPayant OTCompteClientTiersPayant = findOrCreateOneCmpt(json, compteClient, tierspayant,
                    coupleClientTierPayant, compteClientTiersPayants);
            TPreenregistrementCompteClientTiersPayent _new = new TPreenregistrementCompteClientTiersPayent();
            _new.setLgPREENREGISTREMENTCOMPTECLIENTPAYENTID(UUID.randomUUID().toString());
            _new.setLgPREENREGISTREMENTID(OTPreenregistrement);
            _new.setIntPRICE(json.getInt("intPRICE"));
            _new.setLgUSERID(OTPreenregistrement.getLgUSERID());
            _new.setStrSTATUT(DateConverter.STATUT_IS_CLOSED);
            _new.setDtCREATED(OTPreenregistrement.getDtUPDATED());
            _new.setDtUPDATED(OTPreenregistrement.getDtUPDATED());
            _new.setLgCOMPTECLIENTTIERSPAYANTID(OTCompteClientTiersPayant);
            _new.setStrREFBON(json.getString("strREFBON"));
            _new.setDblQUOTACONSOVENTE(Double.valueOf(_new.getIntPRICE()));
            _new.setIntPERCENT(json.getInt("intPERCENT"));
            _new.setIntPRICERESTE(json.getInt("intPRICERESTE"));
            _new.setStrSTATUTFACTURE(json.getString("strSTATUTFACTURE"));
            getEntityManager().persist(_new);

        }
    }

    private TFamille findArticleByCip(String cip) {
        try {
            TypedQuery<TFamille> query = getEntityManager().createNamedQuery("TFamille.findByIntCIP", TFamille.class);
            query.setParameter("intCIP", cip);
            query.setMaxResults(1);
            return query.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.INFO, "Le produit avec cip {0} n'existe pas dans la base", cip);
            // throw e;
            return null;
        }

    }

    private void createDetailsVente(JSONArray items, TPreenregistrement op) {
        for (int i = 0; i < items.length(); i++) {
            JSONObject json = items.getJSONObject(i);
            TFamille f = findArticleByCip(json.getString("cip"));
            TPreenregistrementDetail tpd = new TPreenregistrementDetail(UUID.randomUUID().toString());
            tpd.setBoolACCOUNT(json.getBoolean("boolACCOUNT"));
            tpd.setLgFAMILLEID(f);
            tpd.setDtCREATED(op.getDtUPDATED());
            tpd.setDtUPDATED(op.getDtUPDATED());
            tpd.setIntPRICEUNITAIR(json.getInt("intPRICEUNITAIR"));
            tpd.setIntPRICE(json.getInt("intPRICE"));
            tpd.setMontantTva(json.getInt("montantTva"));
            tpd.setValeurTva(json.getInt("valeurTva"));
            tpd.setIntUG(json.getInt("intUG"));
            tpd.setIntQUANTITY(json.getInt("intQUANTITY"));
            tpd.setIntQUANTITYSERVED(json.getInt("intQUANTITYSERVED"));
            tpd.setIntPRICEOTHER(json.getInt("intPRICEOTHER"));
            tpd.setIntPRICEDETAILOTHER(json.getInt("intPRICEDETAILOTHER"));
            tpd.setIntFREEPACKNUMBER(0);
            tpd.setIntPRICEREMISE(json.getInt("intPRICEREMISE"));
            tpd.setIntAVOIR(json.getInt("intAVOIR"));
            tpd.setIntAVOIRSERVED(json.getInt("intAVOIRSERVED"));
            tpd.setStrSTATUT(op.getStrSTATUT());
            tpd.setBISAVOIR(json.getBoolean("bISAVOIR"));
            tpd.setPrixAchat(json.getInt("prixAchat"));
            tpd.setLgPREENREGISTREMENTID(op);
            getEntityManager().persist(tpd);

        }
    }

    private TTypeReglement findTypeReglementById(String id) {
        return this.getEntityManager().find(TTypeReglement.class, id);
    }

    private void addMvtTransaction(JSONObject record, TPreenregistrement tp) {
        MvtTransaction mt = new MvtTransaction();
        mt.setUuid(tp.getLgPREENREGISTREMENTID());
        mt.setReglement(findTypeReglementById(record.getString("typeReglementId")));
        mt.setMvtDate(DateConverter.convertDateToLocalDate(tp.getDtUPDATED()));
        mt.setCreatedAt(DateConverter.convertDateToLocalDateTime(tp.getDtUPDATED()));
        mt.setMagasin(tp.getLgUSERID().getLgEMPLACEMENTID());
        mt.setMontant(record.getInt("montant"));
        mt.setOrganisme(tp.getClient().getLgCLIENTID());
        mt.setMontantRegle(record.getInt("montantRegle"));
        mt.setMontantVerse(record.getInt("montantVerse"));
        mt.setMontantAcc(record.getInt("montantAcc"));
        mt.setMontantRemise(record.getInt("montantRemise"));
        mt.setMontantRestant(record.getInt("montantRestant"));
        mt.setMontantTva(record.getInt("montantTva"));
        mt.setMontantCredit(record.getInt("montantCredit"));
        mt.setMontantNet(record.getInt("montantNet"));
        mt.setMarge(record.getInt("marge"));
        mt.setAvoidAmount(record.getInt("avoidAmount"));
        mt.setChecked(Boolean.TRUE);
        mt.setMontantPaye(record.getInt("montantPaye"));
        mt.setCategoryTransaction(CategoryTransaction.valueOf(record.getString("categoryTransaction")));
        mt.setTypeTransaction(TypeTransaction.valueOf(record.getString("typeTransaction")));
        mt.settTypeMvtCaisse(findTypeMvtCaisseById(record.getString("typeMvtCaisseId")));
        mt.setUser(tp.getLgUSERID());
        mt.setCaisse(tp.getLgUSERCAISSIERID());
        mt.setPkey(tp.getLgPREENREGISTREMENTID());
        mt.setReference(tp.getStrREF());
        getEntityManager().persist(mt);
    }

    private TTypeMvtCaisse findTypeMvtCaisseById(String id) {
        return this.getEntityManager().find(TTypeMvtCaisse.class, id);
    }

    private Optional<Reference> getReferenceByDateAndEmplacementId(LocalDate ODate, String emplacementId,
            boolean isDevis) {
        try {
            TypedQuery<Reference> query = getEntityManager().createNamedQuery("Reference.lastReference",
                    Reference.class);
            query.setParameter("id", ODate.format(DateTimeFormatter.ofPattern("yyyyMMdd")));
            query.setParameter("emplacement", emplacementId);
            query.setParameter("devis", isDevis);
            query.setMaxResults(1);
            return Optional.ofNullable(query.getSingleResult());
        } catch (Exception e) {
            // e.printStackTrace(System.err);
            return Optional.empty();
        }
    }

    public Reference buildRef(LocalDate ODate, TEmplacement emplacement) {
        Reference r = null;
        try {
            Optional<Reference> o = getReferenceByDateAndEmplacementId(ODate, emplacement.getLgEMPLACEMENTID(), false);
            if (o.isPresent()) {
                r = o.get();
                r.setLastIntValue(r.getLastIntValue() + 1);
                r.setReference(ODate.format(DateTimeFormatter.ofPattern("yyMMdd")) + "_"
                        + StringUtils.leftPad(String.valueOf(r.getLastIntValue()), 5, '0'));
            } else {
                r = new Reference().addEmplacement(emplacement)
                        .id(ODate.format(DateTimeFormatter.ofPattern("yyyyMMdd"))).lastIntValue(1).lastIntTmpValue(1)
                        .reference(ODate.format(DateTimeFormatter.ofPattern("yyMMdd")) + "_"
                                + StringUtils.leftPad(String.valueOf(1), 5, '0'))
                        .referenceTemp(ODate.format(DateTimeFormatter.ofPattern("yyMMdd")) + "_"
                                + StringUtils.leftPad(String.valueOf(String.valueOf(1)), 5, '0'));
            }
            getEntityManager().merge(r);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return r;
    }

    public JSONObject importListVenteFromJsonFile(InputStream inputStream, TUser user) {
        JSONObject json = new JSONObject();
        try {
            JSONTokener in = new JSONTokener(inputStream);
            JSONArray data = new JSONArray(in);
            int count = 0;
            Stack<TTiersPayant> tierspaynts = new Stack<>();
            Stack<TClient> clients = new Stack<>();
            Stack<TAyantDroit> ayantDroits = new Stack<>();
            Stack<String> coupleClientTierPayant = new Stack<>();
            Stack<TCompteClientTiersPayant> compteClientTiersPayants = new Stack<>();

            for (int i = 0; i < data.length(); i++) {
                JSONObject record = data.getJSONObject(i);
                createPreVente(record, tierspaynts, clients, ayantDroits, user, coupleClientTierPayant,
                        compteClientTiersPayants);
                count++;

            }

            json.put("count", count);
            json.put("ligne", data.length());
            json.put("success", true);
        } catch (NotSupportedException | SystemException | RollbackException | HeuristicMixedException
                | HeuristicRollbackException | SecurityException | IllegalStateException ex) {
            LOG.log(Level.SEVERE, null, ex);
            json.put("success", false);
        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
            json.put("success", false);
        }
        return json;
    }

}
