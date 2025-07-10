/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import commonTasks.dto.FamilleDTO;
import commonTasks.dto.FamilleGrossisteDTO;
import commonTasks.dto.FamilleStockDTO;
import commonTasks.dto.HistoriqueImportationDTO;
import commonTasks.dto.SalesStatsParams;
import controller.importation.Importaion;
import dal.HistoriqueImportValue;
import dal.HistoriqueImportation;
import dal.HistoriqueImportation_;
import dal.MvtTransaction;
import dal.Reference;
import dal.TAyantDroit;
import dal.TCategorieAyantdroit;
import dal.TClient;
import dal.TCompteClient;
import dal.TCompteClientTiersPayant;
import dal.TEmplacement;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamilleStock;
import dal.TGroupeTierspayant;
import dal.TModeReglement;
import dal.TModelFacture;
import dal.TNatureVente;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrement_;
import dal.TReglement;
import dal.TRemise;
import dal.TRisque;
import dal.TTiersPayant;
import dal.TTypeClient;
import dal.TTypeMvtCaisse;
import dal.TTypeReglement;
import dal.TTypeTiersPayant;
import dal.TTypeVente;
import dal.TTypeVente_;
import dal.TUser;
import dal.TUser_;
import dal.TZoneGeographique;
import dal.enumeration.CategoryTransaction;
import dal.enumeration.TypeTransaction;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.Stack;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.ejb.TransactionManagement;
import javax.ejb.TransactionManagementType;
import javax.inject.Inject;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import javax.transaction.HeuristicMixedException;
import javax.transaction.HeuristicRollbackException;
import javax.transaction.NotSupportedException;
import javax.transaction.RollbackException;
import javax.transaction.SystemException;
import javax.transaction.UserTransaction;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import rest.service.CaisseService;

import toolkits.parameters.commonparameter;
import util.DateConverter;

/**
 *
 * @author koben
 */
@Stateless
@TransactionManagement(TransactionManagementType.BEAN)
public class ImportationVente {

    private static final Logger LOG = Logger.getLogger(ImportationVente.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private CaisseService caisseService;
    /*
     * @EJB private ProduitService produitService;
     */
    @EJB
    private Importaion importaion;

    public EntityManager getEntityManager() {
        return em;
    }

    @Inject
    private UserTransaction userTransaction;

    public JSONArray exportToJson(SalesStatsParams params) {
        List<TPreenregistrement> data = listVentesToExportInJsonFile(params);
        JSONArray array = new JSONArray();

        try {

            for (TPreenregistrement op : data) {
                JSONObject json = new JSONObject();
                json.put("uuid", op.getLgPREENREGISTREMENTID());
                // json.put("strREF", op.getStrREF());
                json.put("strREFTICKET", op.getStrREFTICKET());
                json.put("intPRICE", op.getIntPRICE());
                json.put("intPRICEREMISE", op.getIntPRICEREMISE());
                json.put("intCUSTPART", op.getIntCUSTPART());
                json.put("dtUPDATED", op.getDtUPDATED());
                json.put("strREFBON", op.getStrREFBON());
                json.put("strINFOSCLT", op.getStrINFOSCLT());
                json.put("strSTATUTVENTE", op.getStrSTATUTVENTE());
                json.put("strTYPEVENTE", op.getStrTYPEVENTE());
                // json.put("lgREMISEID", op.getLgREMISEID());
                // json.put("strFIRSTNAMECUSTOMER", op.getStrFIRSTNAMECUSTOMER());
                // json.put("strLASTNAMECUSTOMER", op.getStrLASTNAMECUSTOMER());
                // json.put("strPHONECUSTOME", op.getStrPHONECUSTOME());
                json.put("bWITHOUTBON", op.getBWITHOUTBON());
                json.put("intPRICEOTHER", op.getIntPRICEOTHER());
                json.put("lgTYPEVENTEID", op.getLgTYPEVENTEID().getStrNAME());
                json.put("lgNATUREVENTEID", op.getLgNATUREVENTEID().getStrLIBELLE());
                json.put("intACCOUNT", op.getIntACCOUNT());
                json.put("intREMISEPARA", op.getIntREMISEPARA());
                // json.put("pkBrand", op.getPkBrand());
                json.put("montantTva", op.getMontantTva());
                // json.put("checked", op.getChecked());
                // json.put("copy", op.getCopy());

                try {
                    json.put("remise", op.getRemise().getLgREMISEID());
                } catch (Exception e) {
                }

                JSONObject reglement = new JSONObject();
                JSONObject clientJson = new JSONObject();
                JSONObject ayantDroit = new JSONObject();
                TReglement tr = op.getLgREGLEMENTID();
                try {
                    reglement.put("strBANQUE", tr.getStrBANQUE());
                    reglement.put("strLIEU", tr.getStrLIEU());
                    reglement.put("strCODEMONNAIE", tr.getStrCODEMONNAIE());
                    reglement.put("intTAUX", tr.getIntTAUX());
                    reglement.put("strCOMMENTAIRE", tr.getStrCOMMENTAIRE());
                    reglement.put("strFIRSTLASTNAME", tr.getStrFIRSTLASTNAME());
                    reglement.put("bISFACTURE", tr.getBISFACTURE());
                    reglement.put("boolCHECKED", tr.getBoolCHECKED());
                    reglement.put("lgMODEREGLEMENTID", tr.getLgMODEREGLEMENTID().getStrNAME());

                } catch (Exception e) {
                }

                json.put("reglement", reglement);

                TClient client = op.getClient();
                try {
                    clientJson.put("uuid", client.getLgCLIENTID());
                    clientJson.put("email", client.getEmail());
                    clientJson.put("strFIRSTNAME", client.getStrFIRSTNAME());
                    clientJson.put("strLASTNAME", client.getStrLASTNAME());
                    clientJson.put("strNUMEROSECURITESOCIAL", client.getStrNUMEROSECURITESOCIAL());
                    clientJson.put("dtNAISSANCE", client.getDtNAISSANCE());
                    clientJson.put("strSEXE", client.getStrSEXE());
                    clientJson.put("strADRESSE", client.getStrADRESSE());
                    clientJson.put("strDOMICILE", client.getStrDOMICILE());
                    clientJson.put("strAUTREADRESSE", client.getStrAUTREADRESSE());
                    clientJson.put("strCODEPOSTAL", client.getStrCODEPOSTAL());
                    clientJson.put("strCOMMENTAIRE", client.getStrCOMMENTAIRE());
                    clientJson.put("lgTYPECLIENTID", client.getLgTYPECLIENTID().getLgTYPECLIENTID());

                } catch (Exception e) {
                }
                TAyantDroit ayant = op.getAyantDroit();
                try {
                    ayantDroit.put("uuid", ayant.getLgAYANTSDROITSID());
                    ayantDroit.put("strFIRSTNAME", ayant.getStrFIRSTNAME());
                    ayantDroit.put("strLASTNAME", ayant.getStrLASTNAME());
                    ayantDroit.put("strNUMEROSECURITESOCIAL", ayant.getStrNUMEROSECURITESOCIAL());
                    ayantDroit.put("dtNAISSANCE", ayant.getDtNAISSANCE());
                    ayantDroit.put("strSEXE", ayant.getStrSEXE());
                    ayantDroit.put("lgRISQUEID", ayant.getLgRISQUEID().getLgRISQUEID());
                    ayantDroit.put("lgCATEGORIEAYANTDROITID",
                            ayant.getLgCATEGORIEAYANTDROITID().getLgCATEGORIEAYANTDROITID());

                } catch (Exception e) {
                }
                json.put("client", clientJson);
                json.put("ayantDroit", ayantDroit);

                JSONArray clientTierspayantItems = new JSONArray();
                List<TPreenregistrementCompteClientTiersPayent> l = findClientTiersPayents(
                        op.getLgPREENREGISTREMENTID());
                l.forEach(p -> {
                    JSONObject it = new JSONObject();
                    TCompteClientTiersPayant clientTiersPayant = p.getLgCOMPTECLIENTTIERSPAYANTID();
                    it.put("intPERCENT", p.getIntPERCENT());
                    it.put("intPRICE", p.getIntPRICE());
                    it.put("intPRICERESTE", p.getIntPRICERESTE());
                    it.put("strSTATUTFACTURE", p.getStrSTATUTFACTURE());
                    it.put("strREFBON", p.getStrREFBON());
                    TTiersPayant payant = clientTiersPayant.getLgTIERSPAYANTID();
                    it.put("tierspayantId", payant.getLgTIERSPAYANTID());
                    it.put("intNBREBONS", payant.getIntNBREBONS());
                    it.put("intMONTANTFAC", payant.getIntMONTANTFAC());
                    it.put("bCANBEUSE", payant.getBCANBEUSE());
                    it.put("dbCONSOMMATIONMENSUELLE", payant.getDbCONSOMMATIONMENSUELLE());
                    it.put("bIsAbsolute", payant.getBIsAbsolute());
                    it.put("strCODEORGANISME", payant.getStrCODEORGANISME());
                    it.put("strNAME", payant.getStrNAME());
                    it.put("strFULLNAME", payant.getStrFULLNAME());
                    it.put("strADRESSE", payant.getStrADRESSE());
                    it.put("strMOBILE", payant.getStrMOBILE());
                    it.put("strTELEPHONE", payant.getStrTELEPHONE());
                    it.put("strMAIL", payant.getStrMAIL());
                    it.put("dblPLAFONDCREDIT", payant.getDblPLAFONDCREDIT());
                    it.put("dblTAUXREMBOURSEMENT", payant.getDblTAUXREMBOURSEMENT());
                    it.put("strNUMEROCAISSEOFFICIEL", payant.getStrNUMEROCAISSEOFFICIEL());
                    it.put("strCENTREPAYEUR", payant.getStrCENTREPAYEUR());
                    it.put("strCODEREGROUPEMENT", payant.getStrCODEREGROUPEMENT());
                    it.put("dblPOURCENTAGEREMISE", payant.getDblPOURCENTAGEREMISE());
                    it.put("dblREMISEFORFETAIRE", payant.getDblREMISEFORFETAIRE());
                    it.put("dblREMISEFORFETAIRE", payant.getDblREMISEFORFETAIRE());
                    it.put("intNBREEXEMPLAIREBORD", payant.getIntNBREEXEMPLAIREBORD());
                    it.put("lgTYPETIERSPAYANTID", payant.getLgTYPETIERSPAYANTID().getLgTYPETIERSPAYANTID());
                    it.put("lgMODELFACTUREID", payant.getLgMODELFACTUREID().getLgMODELFACTUREID());
                    it.put("dblQUOTACONSOVENTE", clientTiersPayant.getDblQUOTACONSOVENTE());
                    it.put("dblPLAFOND", clientTiersPayant.getDblPLAFOND());
                    it.put("strNUMEROSECURITESOCIAL", clientTiersPayant.getStrNUMEROSECURITESOCIAL());
                    it.put("intPOURCENTAGE", clientTiersPayant.getIntPOURCENTAGE());
                    it.put("intPRIORITY", clientTiersPayant.getIntPRIORITY());
                    it.put("bISRO", clientTiersPayant.getBISRO());
                    it.put("bCANBEUSE", clientTiersPayant.getBCANBEUSE());
                    it.put("dblQUOTACONSOMENSUELLE", clientTiersPayant.getDblQUOTACONSOMENSUELLE());
                    it.put("dbCONSOMMATIONMENSUELLE", clientTiersPayant.getDbCONSOMMATIONMENSUELLE());
                    it.put("db_PLAFOND_ENCOURS", clientTiersPayant.getDbPLAFONDENCOURS());
                    it.put("isCapped", clientTiersPayant.getIsCapped());
                    it.put("bIsAbsolute", clientTiersPayant.getBIsAbsolute());
                    TGroupeTierspayant lgGROUPEID = payant.getLgGROUPEID();
                    if (lgGROUPEID != null) {
                        it.put("lgGROUPEID", lgGROUPEID.getLgGROUPEID());
                    }
                    clientTierspayantItems.put(it);
                });

                MvtTransaction mt = caisseService.findByVenteId(op.getLgPREENREGISTREMENTID());
                JSONObject mvtTransaction = new JSONObject();
                try {
                    mvtTransaction.put("montant", mt.getMontant());
                    mvtTransaction.put("montantRestant", mt.getMontantRestant());
                    mvtTransaction.put("montantRegle", mt.getMontantRegle());
                    mvtTransaction.put("montantCredit", mt.getMontantCredit());
                    mvtTransaction.put("montantVerse", mt.getMontantVerse());
                    mvtTransaction.put("montantNet", mt.getMontantNet());
                    mvtTransaction.put("montantRemise", mt.getMontantRemise());
                    mvtTransaction.put("montantPaye", mt.getMontantPaye());
                    mvtTransaction.put("avoidAmount", mt.getAvoidAmount());
                    mvtTransaction.put("montantAcc", mt.getMontantAcc());
                    // mvtTransaction.put("checked", mt.getChecked());
                    mvtTransaction.put("typeReglementId", mt.getReglement().getLgTYPEREGLEMENTID());
                    mvtTransaction.put("typeMvtCaisseId", mt.gettTypeMvtCaisse().getLgTYPEMVTCAISSEID());
                    mvtTransaction.put("categoryTransaction", mt.getCategoryTransaction().name());
                    mvtTransaction.put("typeTransaction", mt.getTypeTransaction().name());
                    // mvtTransaction.put("reference", mt.getReference());
                    mvtTransaction.put("montantTva", mt.getMontantTva());
                    mvtTransaction.put("marge", mt.getMarge());
                    // mvtTransaction.put("organisme", mt.getOrganisme());

                } catch (Exception e) {
                }
                json.put("mvtTransaction", mvtTransaction);
                json.put("venteAssurances", clientTierspayantItems);
                JSONArray itemsJson = new JSONArray();
                List<TPreenregistrementDetail> items = findByParent(op.getLgPREENREGISTREMENTID());
                items.forEach(it -> {
                    JSONObject e = new JSONObject();
                    TFamille f = it.getLgFAMILLEID();
                    e.put("cip", f.getIntCIP());
                    e.put("intQUANTITY", it.getIntQUANTITY());
                    e.put("intQUANTITYSERVED", it.getIntQUANTITYSERVED());
                    e.put("intAVOIR", it.getIntAVOIR());
                    e.put("intAVOIRSERVED", it.getIntAVOIRSERVED());
                    e.put("intPRICE", it.getIntPRICE());
                    e.put("intPRICEUNITAIR", it.getIntPRICEUNITAIR());
                    e.put("intNUMBER", it.getIntNUMBER());
                    e.put("intPRICEREMISE", it.getIntPRICEREMISE());
                    e.put("lgGRILLEREMISEID", it.getLgGRILLEREMISEID());
                    e.put("bISAVOIR", it.getBISAVOIR());
                    e.put("intFREEPACKNUMBER", it.getIntFREEPACKNUMBER());
                    e.put("intPRICEOTHER", it.getIntPRICEOTHER());
                    e.put("intPRICEDETAILOTHER", it.getIntPRICEDETAILOTHER());
                    e.put("boolACCOUNT", it.getBoolACCOUNT());
                    e.put("intUG", it.getIntUG());
                    e.put("montantTva", it.getMontantTva());
                    e.put("prixAchat", it.getPrixAchat());
                    e.put("valeurTva", it.getValeurTva());

                    itemsJson.put(e);
                });
                json.put("items", itemsJson);
                array.put(json);
            }
        } catch (Exception e) {
            e.printStackTrace(System.err);
        }
        //
        return array;
    }

    private List<TPreenregistrement> listVentesToExportInJsonFile(SalesStatsParams params) {
        try {

            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<TPreenregistrement> cq = cb.createQuery(TPreenregistrement.class);
            Root<TPreenregistrement> root = cq.from(TPreenregistrement.class);
            cq.select(root).orderBy(cb.asc(root.get(TPreenregistrement_.dtUPDATED)));
            // cq.select(root).orderBy(cb.asc(root.get(TPreenregistrement_.client).get(TClient_.strFIRSTNAME)),
            // cb.asc(root.get(TPreenregistrement_.client).get(TClient_.strLASTNAME)));
            Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(LocalDate.parse(params.getDtStart().toString())),
                    java.sql.Date.valueOf(LocalDate.parse(params.getDtEnd().toString())));
            predicates.add(btw);
            predicates.add(cb.equal(root.get(TPreenregistrement_.strSTATUT), commonparameter.statut_is_Closed));
            predicates.add(cb.isFalse(root.get(TPreenregistrement_.bISCANCEL)));
            predicates.add(cb.greaterThan(root.get(TPreenregistrement_.intPRICE), 0));
            predicates.add(cb.equal(root.get(TPreenregistrement_.lgTYPEVENTEID).get(TTypeVente_.lgTYPEVENTEID),
                    params.getTypeVenteId()));

            cq.where(cb.and(predicates.toArray(new Predicate[predicates.size()])));
            TypedQuery<TPreenregistrement> q = getEntityManager().createQuery(cq);
            return q.getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    private List<TPreenregistrementCompteClientTiersPayent> findClientTiersPayents(String idVente) {
        return getEntityManager().createQuery(
                "SELECT o FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1 ")
                .setParameter(1, idVente).getResultList();
    }

    private List<TPreenregistrementDetail> findByParent(String idVente) {
        return getEntityManager().createQuery(
                "SELECT o FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1 ")
                .setParameter(1, idVente).getResultList();
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

    private TCategorieAyantdroit findCateAyantById(String id) {
        try {
            return getEntityManager().find(TCategorieAyantdroit.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private TTypeClient findTypeClientById(String id) {
        try {
            return getEntityManager().find(TTypeClient.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private Optional<TClient> findClientById(String clientId) {
        try {
            return Optional.ofNullable(getEntityManager().find(TClient.class, clientId));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public TAyantDroit addAyantDroitToClient(JSONObject ayantDroitRecord, TClient client, Date dateOperation,
            Stack<TAyantDroit> ayantDroits) {
        if (ayantDroitRecord.isEmpty()) {
            return null;
        }
        TAyantDroit ayantDroit = null;
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

    private TFamille findArticleByCip(String cip) {
        try {
            TypedQuery<TFamille> query = getEntityManager().createNamedQuery("TFamille.findByIntCIP", TFamille.class);
            query.setParameter("intCIP", cip);
            query.setMaxResults(1);
            return query.getSingleResult();
        } catch (Exception e) {
            e.printStackTrace(System.err);
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

    private TTiersPayant findTiersPayantById(String id) {
        try {
            return getEntityManager().find(TTiersPayant.class, id);
        } catch (Exception e) {
            return null;
        }
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

    private TCompteClientTiersPayant findByClientTiersPayantId(String clientId, String tiersPayantId) {
        try {
            return getEntityManager().createQuery(
                    "SELECT o FROM TCompteClientTiersPayant o WHERE o.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID=?1 AND o.strNUMEROSECURITESOCIAL =?2 ",
                    TCompteClientTiersPayant.class).setParameter(1, clientId).setParameter(2, tiersPayantId)
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
            userTransaction.begin();
            for (int i = 0; i < data.length(); i++) {
                JSONObject record = data.getJSONObject(i);
                createPreVente(record, tierspaynts, clients, ayantDroits, user, coupleClientTierPayant,
                        compteClientTiersPayants);
                count++;
                if (count > 0 && count % 10 == 0) {
                    getEntityManager().flush();
                    getEntityManager().clear();
                }
            }
            userTransaction.commit();
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

    private TFamille findTFamilleById(String id) {
        try {
            return getEntityManager().find(TFamille.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    public String fromPreenregistrementItems(String idVente) throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        List<TPreenregistrementDetail> items = findByParent(idVente);
        Set<FamilleDTO> datas = new HashSet<>(items.size());
        for (TPreenregistrementDetail item : items) {
            TFamille famille = item.getLgFAMILLEID();
            TFamilleStock familleStock = importaion.getByFamille(famille.getLgFAMILLEID()).stream()
                    .filter(e -> e.getLgEMPLACEMENTID().getLgEMPLACEMENTID().equals(DateConverter.OFFICINE)).findAny()
                    .get();
            List<TFamilleGrossiste> familleGrossistes = importaion
                    .getFamilleGrossistesByFamille(famille.getLgFAMILLEID());
            FamilleStockDTO stock = new FamilleStockDTO(item, familleStock);
            FamilleDTO dTO = new FamilleDTO(famille,
                    familleGrossistes.stream().map(FamilleGrossisteDTO::new).collect(Collectors.toList()),
                    List.of(stock));
            if (famille.getBoolDECONDITIONNE() == 1) {
                TFamille parent = findTFamilleById(famille.getLgFAMILLEPARENTID());
                FamilleDTO parentdTO = new FamilleDTO(parent,
                        importaion.getFamilleGrossistesByFamille(parent.getLgFAMILLEID()).stream()
                                .map(FamilleGrossisteDTO::new).collect(Collectors.toList()),
                        Collections.emptyList());
                dTO.parent(parentdTO);
            }
            datas.add(dTO);
        }
        return objectMapper.writeValueAsString(datas);

    }

    private TZoneGeographique findGeographiqueById(String id) {
        try {
            return getEntityManager().find(TZoneGeographique.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private TFamilleStock findFamilleStock(String id, String empl) {
        try {
            TypedQuery<TFamilleStock> q = getEntityManager()
                    .createNamedQuery("TFamilleStock.findFamilleStockByProduitAndEmplacement", TFamilleStock.class);
            q.setParameter("lgFAMILLEID", id);
            q.setParameter("lgEMPLACEMENTID", empl);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private TFamilleStock findFamilleStockById(String id) {
        try {
            return getEntityManager().find(TFamilleStock.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private TFamilleGrossiste findFamilleGrossisteById(String id) {
        try {
            return getEntityManager().find(TFamilleGrossiste.class, id);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean findpermission() {
        try {
            TParameters parameters = getEntityManager().find(TParameters.class, "KEY_EXPORT_VENTE_AS_STOCK");
            return Integer.valueOf(parameters.getStrVALUE().trim()) == 1;
        } catch (Exception e) {
            return false;
        }
    }

    private void updateFamilleGrossiste(List<FamilleGrossisteDTO> grossistes, TFamille famille) throws Exception {
        for (FamilleGrossisteDTO grossiste : grossistes) {
            TFamilleGrossiste familleGrossiste = findFamilleGrossisteById(grossiste.getLgFAMILLEGROSSISTEID());
            if (familleGrossiste != null) {
                familleGrossiste = FamilleGrossisteDTO.build(grossiste, familleGrossiste);
                getEntityManager().merge(familleGrossiste);
            } else {
                familleGrossiste = FamilleGrossisteDTO.build(grossiste);
                familleGrossiste.setLgFAMILLEID(famille);
                getEntityManager().persist(familleGrossiste);
            }
        }
    }

    private void updateFamilleStock(TFamille famille, TEmplacement em) throws Exception {
        TFamilleStock familleStock = findFamilleStock(famille.getLgFAMILLEID(), em.getLgEMPLACEMENTID());
        if (familleStock == null) {
            familleStock = new TFamilleStock();
            familleStock.setLgEMPLACEMENTID(em);
            familleStock.setIntNUMBER(0);
            familleStock.setIntNUMBERAVAILABLE(0);
            familleStock.setLgFAMILLESTOCKID(UUID.randomUUID().toString());
            familleStock.setLgFAMILLEID(famille);
            familleStock.setIntUG(0);
            getEntityManager().merge(familleStock);
        }
    }
    // @Transactional(dontRollbackOn = {EntityNotFoundException.class,NoResultException.class})

    public JSONObject importVenteAsStockFromJsonFile(InputStream inputStream, TUser user) {
        JSONObject json = new JSONObject();
        if (!findpermission()) {
            return json.put("success", false);
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            List<FamilleDTO> datas = mapper.readValue(inputStream, new TypeReference<List<FamilleDTO>>() {
            });
            int count = 0;
            TEmplacement emplacement = user.getLgEMPLACEMENTID();
            userTransaction.begin();
            HistoriqueImportation importation = new HistoriqueImportation();
            importation.setUser(user);
            int qtyImp = 0, init = 0, montantVente = 0, montantAchat = 0;
            for (FamilleDTO dto : datas) {
                List<FamilleStockDTO> stocks = dto.getFamilleStock();
                List<FamilleGrossisteDTO> grossistes = dto.getFamilleGrosiste();
                TFamille famille = importaion.findById(dto.getLgFAMILLEID());
                if (famille != null) {
                    famille = FamilleDTO.build(dto, famille);
                    getEntityManager().merge(famille);
                } else {
                    famille = FamilleDTO.build(dto);
                    famille.setLgZONEGEOID(findGeographiqueById(dto.getLgZONEGEOID()));
                    famille.setLgREMISEID(findRemiseById(dto.getLgREMISEID()));
                    getEntityManager().persist(famille);
                }
                for (FamilleStockDTO stock : stocks) {
                    qtyImp = stock.getIntNUMBERAVAILABLE();
                    TFamilleStock familleStock = findFamilleStockById(stock.getLgFAMILLESTOCKID());
                    if (familleStock != null) {
                        init = familleStock.getIntNUMBERAVAILABLE();
                        familleStock = FamilleStockDTO.build(stock, familleStock);
                        getEntityManager().merge(familleStock);
                    } else {
                        familleStock = FamilleStockDTO.build(stock);
                        familleStock.setLgFAMILLEID(famille);
                        familleStock.setLgEMPLACEMENTID(emplacement);
                        getEntityManager().persist(familleStock);
                    }
                }
                updateFamilleGrossiste(grossistes, famille);
                if (dto.getParent() != null) {
                    FamilleDTO parent = dto.getParent();
                    List<FamilleGrossisteDTO> grossistesParent = parent.getFamilleGrosiste();
                    TFamille familleParent = importaion.findById(parent.getLgFAMILLEID());
                    if (familleParent == null) {
                        familleParent = FamilleDTO.build(parent);
                        familleParent.setLgZONEGEOID(findGeographiqueById(parent.getLgZONEGEOID()));
                        familleParent.setLgREMISEID(findRemiseById(parent.getLgREMISEID()));
                        getEntityManager().persist(familleParent);
                        updateFamilleStock(familleParent, emplacement);
                    }
                    updateFamilleGrossiste(grossistesParent, familleParent);
                }
                importation.addDetail(new HistoriqueImportValue().cip(famille.getIntCIP()).libelle(famille.getStrNAME())
                        .montantAchat(dto.getIntPAF() * qtyImp).montantVente(dto.getIntPRICE() * qtyImp)
                        .prixPaf(dto.getIntPAF()).prixUni(dto.getIntPRICE()).qty(qtyImp).stockInit(init)
                        .stockOfDay(qtyImp + init));
                montantAchat += (dto.getIntPAF() * qtyImp);
                montantVente += (dto.getIntPRICE() * qtyImp);
                count++;
                if (count > 0 && count % 50 == 0) {
                    getEntityManager().flush();
                    getEntityManager().clear();
                }
            }
            importation.setMontantAchat(montantAchat);
            importation.setMontantVente(montantVente);
            importation.setNbreLigne(count);
            getEntityManager().persist(importation);
            userTransaction.commit();
            json.put("count", count);
            json.put("ligne", datas.size());
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

    public List<HistoriqueImportationDTO> listHistoriqueImportation(LocalDate dtStart, LocalDate dtEnd, String user) {
        try {
            List<Predicate> predicates = new ArrayList<>();
            CriteriaBuilder cb = getEntityManager().getCriteriaBuilder();
            CriteriaQuery<HistoriqueImportation> cq = cb.createQuery(HistoriqueImportation.class);
            Root<HistoriqueImportation> root = cq.from(HistoriqueImportation.class);
            cq.select(root).orderBy(cb.desc(root.get(HistoriqueImportation_.createdAt)));
            predicates.add(cb.between(root.get(HistoriqueImportation_.mvtDate), dtStart, dtEnd));
            if (!StringUtils.isEmpty(user)) {
                predicates.add(cb.equal(root.get(HistoriqueImportation_.user).get(TUser_.lgUSERID), user));
            }
            cq.where(cb.and(predicates.toArray(new Predicate[predicates.size()])));
            Query q = getEntityManager().createQuery(cq);
            List<HistoriqueImportation> data = q.getResultList();
            return data.stream().map(HistoriqueImportationDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

}
