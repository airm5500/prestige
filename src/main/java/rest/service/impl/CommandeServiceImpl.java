/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.Params;
import dal.HMvtProduit;
import dal.Notification;
import dal.NotificationClient;
import dal.Rupture;
import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TClient;
import dal.TEmplacement;
import dal.TEtiquette;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamilleStock;
import dal.TGrossiste;
import dal.TInventaire;
import dal.TInventaireFamille;
import dal.TLot;
import dal.TOfficine;
import dal.TOrder;
import dal.TOrderDetail;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TRuptureHistory;
import dal.TTypeetiquette;
import dal.TUser;
import dal.TWarehouse;
import dal.Typemvtproduit;
import dal.enumeration.TypeLog;
import dal.enumeration.TypeNotification;
import java.io.IOException;
import java.io.InputStreamReader;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.LongAdder;
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
import javax.persistence.criteria.CriteriaUpdate;
import javax.persistence.criteria.Root;
import javax.servlet.http.Part;
import javax.transaction.HeuristicMixedException;
import javax.transaction.HeuristicRollbackException;
import javax.transaction.NotSupportedException;
import javax.transaction.RollbackException;
import javax.transaction.Status;
import javax.transaction.SystemException;
import javax.transaction.UserTransaction;
import org.apache.commons.collections4.ListUtils;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.commons.lang3.StringUtils;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.CommandeService;
import rest.service.LogService;
import rest.service.MouvementProduitService;
import rest.service.MvtProduitService;
import rest.service.NotificationService;
import rest.service.OrderService;
import rest.service.TransactionService;
import util.Constant;
import util.DateCommonUtils;
import util.DateConverter;
import util.FunctionUtils;
import util.NotificationUtils;
import util.NumberUtils;

/**
 *
 * @author DICI
 */
@Stateless
@TransactionManagement(TransactionManagementType.BEAN)
public class CommandeServiceImpl implements CommandeService {

    private static final Logger LOG = Logger.getLogger(CommandeServiceImpl.class.getName());

    @EJB
    private MvtProduitService mvtProduitService;
    @EJB
    private MouvementProduitService mouvementProduitService;
    @EJB
    private TransactionService transactionService;
    @EJB
    private LogService logService;
    @EJB
    private OrderService orderService;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private NotificationService notificationService;

    public EntityManager getEm() {
        return em;
    }

    @Inject
    private UserTransaction userTransaction;

    private List<TBonLivraisonDetail> bonLivraisonDetail(String id) {
        try {
            String query = "SELECT t FROM TBonLivraisonDetail t WHERE  t.lgBONLIVRAISONID.lgBONLIVRAISONID =?1";
            TypedQuery<TBonLivraisonDetail> q = this.em.createQuery(query, TBonLivraisonDetail.class).setParameter(1,
                    id);
            return q.getResultList();

        } catch (Exception e) {
            return Collections.emptyList();
        }

    }

    public List<Object[]> listLot(String refBon, String idArticle) {
        try {
            CriteriaBuilder cb = this.getEm().getCriteriaBuilder();
            CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
            Root<TLot> root = cq.from(TLot.class);
            cq.multiselect(cb.sum(root.get("intNUMBER")), cb.sum(root.get("intNUMBERGRATUIT")),
                    root.get("lgFAMILLEID").get("lgFAMILLEID")).groupBy(root.get("lgFAMILLEID").get("lgFAMILLEID"));
            cq.where(cb.and(cb.equal(root.get("strREFLIVRAISON"), refBon),
                    cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), idArticle)));
            Query q = this.getEm().createQuery(cq);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    private boolean isEntreeStockIsAuthorize(List<TBonLivraisonDetail> lstTBonLivraisonDetail) {
        java.util.function.Predicate<TBonLivraisonDetail> p = e -> (e.getIntQTERECUE() < e.getIntQTECMDE())
                && (e.getLgFAMILLEID().getBoolCHECKEXPIRATIONDATE());
        return lstTBonLivraisonDetail.parallelStream().anyMatch(p);
    }

    @Override
    public JSONObject cloturerBonLivraison(String id, TUser user) throws JSONException {
        JSONObject json = new JSONObject();

        try {
            TParameters tp = findParameter(Constant.KEY_ACTIVATE_PEREMPTION_DATE);
            TBonLivraison bonLivraison = this.getEm().find(TBonLivraison.class, id);
            List<TPreenregistrementDetail> avoirs = getAvoirs();
            Set<TPreenregistrementDetail> avoirs0 = new HashSet<>();
            TOfficine officine = getEm().find(TOfficine.class, Constant.OFFICINE);
            userTransaction.begin();
            if (tp == null) {
                return json.put("success", false).put("msg",
                        "Paramètre d'autorisation de saisie de produit sans date de péremption inexistant");
            }
            TOrder order = bonLivraison.getLgORDERID();
            TGrossiste grossiste = order.getLgGROSSISTEID();
            if (bonLivraison.getStrSTATUT().equals(Constant.STATUT_IS_CLOSED)) {
                return json.put("success", false).put("msg",
                        "Impossible de trouver ce bon. Verifier s'il ce bon n'est pas deja cloturé");
            }
            List<TBonLivraisonDetail> lstTBonLivraisonDetail = bonLivraisonDetail(id);
            if (Integer.parseInt(tp.getStrVALUE()) == 1 && isEntreeStockIsAuthorize(lstTBonLivraisonDetail)) {
                return json.put("success", false).put("msg",
                        "La reception de certains produits n'a pas ete faites. Veuillez verifier vos saisie");

            }

            JSONArray ugArray = new JSONArray();
            for (TBonLivraisonDetail bn : lstTBonLivraisonDetail) {
                TFamille oFamille = bn.getLgFAMILLEID();
                int diff = Math.abs(bn.getIntPRIXVENTE() - oFamille.getIntPRICE());

                boolean isTableau = StringUtils.isNotEmpty(oFamille.getIntT())
                        || (diff == FunctionUtils.VALEUR_TABLEAU);
                List<Object[]> lst = listLot(bonLivraison.getStrREFLIVRAISON(), oFamille.getLgFAMILLEID());

                if (lst.isEmpty()) {
                    createTLot(bn, user, oFamille, bn.getIntQTECMDE(), bonLivraison.getStrREFLIVRAISON(), grossiste,
                            order.getStrREFORDER(), 0);
                    addToStock(bn.getIntPRIXVENTE(), bn.getIntPAF(), bn.getLgBONLIVRAISONDETAIL(), user,
                            bn.getIntQTECMDE(), 0, oFamille);
                    bn.setIntQTERECUE(bn.getIntQTECMDE());
                    bn.setIntQTEMANQUANT(0);
                    bn.setIntQTEUG(0);
                } else {
                    for (Object[] item : lst) {
                        Integer cmde = Integer.valueOf(item[0] + ""), qu = Integer.valueOf(item[1] + "");
                        if (cmde < bn.getIntQTECMDE()) {
                            LOG.log(Level.INFO, "La reception de certains produits n'a pas ete faite {0} {1} {2}",
                                    new Object[] { oFamille.getIntCIP(), cmde, bn.getIntQTECMDE() });
                            if (userTransaction.getStatus() == Status.STATUS_ACTIVE) {
                                userTransaction.rollback();
                            }
                            return json.put("success", false).put("msg",
                                    "La reception de certains produits n'a pas ete faite. Veuillez verifier vos saisie");
                        }
                        cmde = (cmde > (bn.getIntQTECMDE() + bn.getIntQTEUG()) ? (bn.getIntQTECMDE() + bn.getIntQTEUG())
                                : cmde);
                        addToStock(bn.getIntPRIXVENTE(), bn.getIntPAF(), bn.getLgBONLIVRAISONDETAIL(), user, cmde, qu,
                                oFamille);

                        if (qu > 0) {

                            String comm = "ENTREE UG Num BL :  " + bonLivraison.getStrREFLIVRAISON() + " PRODUIT : "
                                    + oFamille.getIntCIP() + " " + oFamille.getStrNAME() + " QUANTITE " + qu + "  PAR "
                                    + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME();
                            logService.updateItem(user, bonLivraison.getStrREFLIVRAISON(), comm, TypeLog.QUANTITE_UG,
                                    bn);

                            JSONObject jsonItemUg = new JSONObject();
                            jsonItemUg.put(NotificationUtils.ITEM_KEY.getId(), oFamille.getIntCIP());
                            jsonItemUg.put(NotificationUtils.ITEM_DESC.getId(), oFamille.getStrNAME());
                            jsonItemUg.put(NotificationUtils.ITEM_QTY.getId(), qu);
                            ugArray.put(jsonItemUg);
                        }

                    }

                }
                if (!ugArray.isEmpty()) {

                    Map<String, Object> donnee = new HashMap<>();
                    donnee.put(NotificationUtils.ITEMS.getId(), ugArray);
                    donnee.put(NotificationUtils.NUM_BL.getId(), bonLivraison.getStrREFLIVRAISON());
                    donnee.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.QUANTITE_UG.getValue());
                    donnee.put(NotificationUtils.USER.getId(), user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
                    donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
                    donnee.put(NotificationUtils.MONTANT_TVA.getId(),
                            NumberUtils.formatIntToString(bonLivraison.getIntTVA()));
                    donnee.put(NotificationUtils.MONTANT_TTC.getId(),
                            NumberUtils.formatIntToString(bonLivraison.getIntHTTC()));
                    donnee.put(NotificationUtils.DATE_BON.getId(),
                            DateCommonUtils.formatDate(bonLivraison.getDtDATELIVRAISON()));
                    createNotification("", TypeNotification.QUANTITE_UG, user, donnee,
                            bonLivraison.getLgBONLIVRAISONID(), null);

                }

                bn.setStrSTATUT(Constant.STATUT_IS_CLOSED);
                bn.setDtUPDATED(new Date());
                this.getEm().merge(bn);
                oFamille.setDtDATELASTENTREE(new Date());
                oFamille.setDtUPDATED(new Date());
                oFamille.setIntPAF(bn.getIntPAF());
                oFamille.setIntPAT(oFamille.getIntPAF());
                TFamilleGrossiste familleGrossiste = this.findFamilleGrossiste(oFamille.getLgFAMILLEID(),
                        grossiste.getLgGROSSISTEID());
                if (familleGrossiste != null) {
                    familleGrossiste.setIntPAF(bn.getIntPAF());
                }
                if (bn.getPrixUni() != null
                        || (!isTableau && bn.getIntPRIXVENTE().compareTo(oFamille.getIntPRICE()) > 0)) {

                    oFamille.setIntPRICE(bn.getIntPRIXVENTE());
                    if (familleGrossiste != null) {
                        familleGrossiste.setIntPRICE(bn.getIntPRIXVENTE());
                    }
                }
                this.getEm().merge(oFamille);

                if (familleGrossiste != null) {
                    this.getEm().merge(familleGrossiste);
                }

                avoirs.stream().filter(e -> e.getLgFAMILLEID().equals(oFamille)).forEach(s -> avoirs0.add(s));

            }

            closureOrder(order);
            bonLivraison.setStrSTATUT(Constant.STATUT_IS_CLOSED);
            bonLivraison.setDtUPDATED(new Date());
            bonLivraison.setLgUSERID(user);
            this.getEm().merge(bonLivraison);
            transactionService.addTransactionBL(user, bonLivraison);
            String comm = "ENTREE EN STOCK DU BL " + bonLivraison.getStrREFLIVRAISON() + " PAR "
                    + user.getStrFIRSTNAME() + " " + user.getStrLASTNAME();
            logService.updateItem(user, bonLivraison.getStrREFLIVRAISON(), comm, TypeLog.ENTREE_EN_STOCK, bonLivraison);

            Map<String, Object> donnee = new HashMap<>();
            donnee.put(NotificationUtils.NUM_BL.getId(), bonLivraison.getStrREFLIVRAISON());
            donnee.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.ENTREE_EN_STOCK.getValue());
            donnee.put(NotificationUtils.USER.getId(), user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
            donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
            donnee.put(NotificationUtils.MONTANT_TVA.getId(), NumberUtils.formatIntToString(bonLivraison.getIntTVA()));
            donnee.put(NotificationUtils.MONTANT_TTC.getId(), NumberUtils.formatIntToString(bonLivraison.getIntHTTC()));
            donnee.put(NotificationUtils.DATE_BON.getId(),
                    DateCommonUtils.formatDate(bonLivraison.getDtDATELIVRAISON()));
            createNotification(comm, TypeNotification.ENTREE_EN_STOCK, user, donnee, bonLivraison.getLgBONLIVRAISONID(),
                    null);

            Map<TClient, List<TPreenregistrementDetail>> map = avoirs0.stream()
                    .filter(e -> Objects.nonNull(e.getLgPREENREGISTREMENTID().getClient()))
                    .collect(Collectors.groupingBy(e -> e.getLgPREENREGISTREMENTID().getClient()));
            map.forEach((k, v) -> {
                if (k != null) {
                    StringBuilder sb = new StringBuilder();
                    sb.append(officine.getStrNOMABREGE()).append(" ").append("M/Mme ");
                    sb.append(k.getStrFIRSTNAME()).append(" ").append(k.getStrLASTNAME())
                            .append(" Vos produits en avoir suivant(s) sont disponibles: ").append("\n");
                    Map<TPreenregistrement, List<TPreenregistrementDetail>> mapp = v.stream()
                            .collect(Collectors.groupingBy(e -> e.getLgPREENREGISTREMENTID()));
                    mapp.forEach((p, values) -> {
                        values.forEach(e -> sb.append("-").append(e.getLgFAMILLEID().getStrNAME()).append("( ")
                                .append(e.getIntAVOIR()).append(" )").append("\n"));
                        sb.append("Ref:  ").append(p.getStrREFTICKET()).append(". Montant vente=")
                                .append(DateConverter.amountFormat(p.getIntPRICE())).append("\n");
                    });
                    sb.append("Merci de nous faire toujours confiance.");

                    Map<String, Object> donneesMap = new HashMap<>();
                    donneesMap.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.AVOIR_PRODUIT.getValue());
                    donneesMap.put(NotificationUtils.MESSAGE.getId(), sb.toString());
                    donneesMap.put(NotificationUtils.USER.getId(),
                            user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
                    donneesMap.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());

                    createNotification(sb.toString(), TypeNotification.AVOIR_PRODUIT, user, donneesMap,
                            bonLivraison.getLgBONLIVRAISONID(), k);
                }

            });
            userTransaction.commit();

        } catch (IllegalStateException | NumberFormatException | SecurityException | HeuristicMixedException
                | HeuristicRollbackException | NotSupportedException | RollbackException | SystemException
                | JSONException e) {
            try {
                LOG.log(Level.SEVERE, null, e);

                if (userTransaction.getStatus() == Status.STATUS_ACTIVE
                        || userTransaction.getStatus() == Status.STATUS_MARKED_ROLLBACK) {
                    userTransaction.rollback();
                }

                return json.put("success", false).put("msg", "Echec de validation de l'entrée en stock");
            } catch (SystemException ex) {
                LOG.log(Level.SEVERE, null, ex);
            }
        }
        return json.put("success", true).put("msg", "Opération effectuée avec success");
    }

    List<TPreenregistrementDetail> getAvoirs() {
        try {
            TypedQuery<TPreenregistrementDetail> q = getEm().createNamedQuery("TPreenregistrementDetail.findAvoir",
                    TPreenregistrementDetail.class);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();

        }

    }

    private TEtiquette createEtiquette(TUser u, TWarehouse warehouse, TTypeetiquette typeetiquette, String strCODE,
            String strNAME, TFamille oTFamille, String intNUMBER) {
        TEtiquette tEtiquette = null;
        try {
            tEtiquette = new TEtiquette();
            tEtiquette.setLgETIQUETTEID(UUID.randomUUID().toString());
            tEtiquette.setStrCODE(strCODE);
            tEtiquette.setStrNAME(strNAME);
            tEtiquette.setDtPEROMPTION(warehouse.getDtPEREMPTION());
            tEtiquette.setLgFAMILLEID(oTFamille);
            tEtiquette.setStrSTATUT(Constant.STATUT_ENABLE);
            tEtiquette.setDtCREATED(new Date());
            tEtiquette.setIntNUMBER(intNUMBER);
            tEtiquette.setLgTYPEETIQUETTEID(typeetiquette);
            tEtiquette.setLgEMPLACEMENTID(u.getLgEMPLACEMENTID());
            this.getEm().persist(tEtiquette);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return tEtiquette;
    }

    private TParameters findParameter(String key) {
        try {
            return this.getEm().find(TParameters.class, key);

        } catch (Exception e) {
            return null;
        }
    }

    private void addToStock(Integer prixU, Integer prixA, String key, TUser u, int qty, int ug, TFamille oFamille) {
        int initStock = mvtProduitService.updateStockReturnInitStock(oFamille, u.getLgEMPLACEMENTID(), qty, ug);
        int finalQty = initStock + qty;
        if (finalQty > 0) {
            oFamille.setDblPRIXMOYENPONDERE(
                    Double.valueOf(calculPrixMoyenPondereReception(initStock, oFamille.getIntPAF(), qty, prixA)));
        }

        mouvementProduitService.saveMvtProduit(prixU, prixA, key, DateConverter.ENTREE_EN_STOCK, oFamille, u,
                u.getLgEMPLACEMENTID(), qty, initStock, finalQty, 0);

    }

    private TEtiquette createEtiquette(TBonLivraisonDetail bn, TUser u, TTypeetiquette oTypeetiquette,
            TWarehouse warehouse, TFamille oFamille, String intNUMBER) {
        TEtiquette etiquette = null;
        String result;
        try {
            String typeEtiquetteName = oTypeetiquette.getStrNAME();
            if (typeEtiquetteName.equalsIgnoreCase("CIP")) {
                result = oFamille.getIntCIP();
            } else if (typeEtiquetteName.equalsIgnoreCase("CIP_PRIX")) {
                result = DateConverter.getShortId(4) + "-" + oFamille.getIntCIP() + "-" + bn.getIntPRIXVENTE();
            } else if (typeEtiquetteName.equalsIgnoreCase("CIP_DESIGNATION")) {
                result = DateConverter.getShortId(4) + "-" + oFamille.getIntCIP() + "-" + oFamille.getStrNAME();
            } else if (typeEtiquetteName.equalsIgnoreCase("CIP_PRIX_DESIGNATION")) {
                result = DateConverter.getShortId(4) + "-" + oFamille.getIntCIP() + "-" + bn.getIntPRIXVENTE() + "-"
                        + oFamille.getStrNAME();
            } else if (typeEtiquetteName.equalsIgnoreCase("POSITION")) {
                result = DateConverter.getShortId(4) + "-" + oFamille.getLgZONEGEOID().getStrLIBELLEE();
            } else {
                result = DateConverter.getShortId(4) + "-" + oFamille.getIntCIP() + "-" + bn.getIntPRIXVENTE() + "-"
                        + oFamille.getStrNAME();
            }
            etiquette = createEtiquette(u, warehouse, oTypeetiquette, result, typeEtiquetteName, oFamille, intNUMBER);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
        return etiquette;
    }

    private void addWarehouse(TBonLivraisonDetail bn, TUser user, TFamille oTFamille, Integer intNUMBER,
            TGrossiste oGrossiste, String strREFLIVRAISON, Date dtSORTIEUSINE, Date dtPEREMPTION, int intNUMBERGRATUIT,
            TTypeetiquette oTypeetiquette, String strREFORDER, String intNUMLOT) {
        TEtiquette etiquette;
        try {

            TWarehouse warehouse = new TWarehouse();
            warehouse.setLgWAREHOUSEID(UUID.randomUUID().toString());
            warehouse.setLgUSERID(user);
            warehouse.setLgFAMILLEID(oTFamille);
            warehouse.setIntNUMBER(intNUMBER);
            warehouse.setDtPEREMPTION(dtPEREMPTION);
            warehouse.setDtSORTIEUSINE(dtSORTIEUSINE);
            warehouse.setStrREFLIVRAISON(strREFLIVRAISON);
            warehouse.setLgGROSSISTEID(oGrossiste);
            warehouse.setStrREFORDER(strREFORDER);
            warehouse.setDtCREATED(new Date());
            warehouse.setDtUPDATED(warehouse.getDtCREATED());
            warehouse.setIntNUMLOT(intNUMLOT);
            warehouse.setIntNUMBERGRATUIT(intNUMBERGRATUIT);
            warehouse.setStrSTATUT(Constant.STATUT_ENABLE);
            warehouse.setLgTYPEETIQUETTEID(oTypeetiquette == null
                    ? em.find(TTypeetiquette.class, Constant.DEFAUL_TYPEETIQUETTE) : oTFamille.getLgTYPEETIQUETTEID());
            etiquette = createEtiquette(bn, user, warehouse.getLgTYPEETIQUETTEID(), warehouse, oTFamille,
                    String.valueOf(warehouse.getIntNUMBER()));
            warehouse.setStrCODEETIQUETTE(etiquette.getStrCODE());
            this.getEm().persist(warehouse);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }

    }

    private TLot createTLot(TBonLivraisonDetail bn, TUser u, TFamille oFamille, int intNUMBER, String strRELIVRAISON,
            TGrossiste grossiste, String strREFORDER, int intUG) {
        TLot lot = null;
        try {

            lot = new TLot(UUID.randomUUID().toString());
            lot.setDtCREATED(new Date());
            lot.setLgUSERID(u);
            lot.setLgFAMILLEID(oFamille);
            lot.setIntNUMBER(intNUMBER); // quantite commandé + quantité livré
            lot.setDtSORTIEUSINE(lot.getDtCREATED());
            lot.setStrREFLIVRAISON(strRELIVRAISON);
            lot.setLgGROSSISTEID(grossiste);
            lot.setDtUPDATED(lot.getDtCREATED());
            lot.setStrREFORDER(strREFORDER);
            lot.setIntNUMBERGRATUIT(intUG);
            lot.setStrSTATUT(Constant.STATUT_ENABLE);
            lot.setIntQTYVENDUE(0);
            this.getEm().persist(lot);
            addWarehouse(bn, u, oFamille, intNUMBER, grossiste, strRELIVRAISON, new Date(), null, 0, null, strREFORDER,
                    null);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }

        return lot;
    }

    @Override
    public void closureOrder(TOrder order) {
        try {
            CriteriaBuilder cb = this.getEm().getCriteriaBuilder();
            CriteriaUpdate<TOrderDetail> cq = cb.createCriteriaUpdate(TOrderDetail.class);
            Root<TOrderDetail> root = cq.from(TOrderDetail.class);
            cq.set(root.get("strSTATUT"), Constant.STATUT_IS_CLOSED).set(root.get("dtUPDATED"), new Date());
            cq.where(cb.equal(root.get("lgORDERID").get("lgORDERID"), order.getLgORDERID()));
            em.createQuery(cq).executeUpdate();
            order.setStrSTATUT(Constant.STATUT_IS_CLOSED);
            order.setRecu(Boolean.TRUE);
            order.setDtUPDATED(new Date());
            em.merge(order);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
    }

    private List<TInventaireFamille> findByInventaire(String id) {
        try {
            TypedQuery<TInventaireFamille> q = getEm().createQuery(
                    "SELECT o FROM TInventaireFamille o WHERE o.lgINVENTAIREID.lgINVENTAIREID=?1",
                    TInventaireFamille.class);
            q.setParameter(1, id);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private Typemvtproduit findById(String id) {
        return getEm().find(Typemvtproduit.class, id);
    }

    public void saveMvtProduit(String pkey, Typemvtproduit typemvtproduit, TFamille famille, TUser lgUSERID,
            TEmplacement emplacement, Integer qteMvt, Integer qteDebut, Integer qteFinale) {
        HMvtProduit h = new HMvtProduit();
        h.setUuid(UUID.randomUUID().toString());
        h.setCreatedAt(LocalDateTime.now());
        h.setEmplacement(emplacement);
        h.setLgUSERID(lgUSERID);
        h.setFamille(famille);
        h.setMvtDate(LocalDate.now());
        h.setValeurTva(0);
        h.setTypemvtproduit(typemvtproduit);
        h.setPrixUn(famille.getIntPRICE());
        h.setPrixAchat(famille.getIntPAF());
        h.setQteMvt(qteMvt);
        h.setQteDebut(qteDebut);
        h.setPkey(pkey);
        h.setQteFinale(qteFinale);
        h.setChecked(true);
        getEm().persist(h);
    }

    @Override
    public JSONObject cloturerInvetaire(String inventaireId, TUser user) throws JSONException {
        JSONObject json = new JSONObject();
        EntityManager emg = this.getEm();
        try {
            TInventaire inventaire = emg.find(TInventaire.class, inventaireId);
            List<TInventaireFamille> list = findByInventaire(inventaireId);
            Typemvtproduit typemvtproduit = findById(Constant.INVENTAIRE);
            userTransaction.begin();
            LongAdder count = new LongAdder();
            LongAdder count2 = new LongAdder();
            TEmplacement emplacement = user.getLgEMPLACEMENTID();
            list.stream().forEach(s -> {
                if (s.getIntNUMBER().compareTo(s.getIntNUMBERINIT()) != 0) {
                    count.increment();
                    TFamilleStock stock = s.getLgFAMILLESTOCKID();
                    stock.setIntNUMBERAVAILABLE(s.getIntNUMBER());
                    stock.setIntNUMBER(s.getIntNUMBER());
                    stock.setDtUPDATED(new Date());
                    emg.merge(stock);
                    s.setStrSTATUT(Constant.STATUT_IS_CLOSED);
                    s.setDtUPDATED(new Date());
                    emg.merge(s);

                }

                saveMvtProduit(s.getLgINVENTAIREFAMILLEID() + "", typemvtproduit, s.getLgFAMILLEID(), user, emplacement,
                        s.getIntNUMBER(), s.getIntNUMBERINIT(), s.getIntNUMBER());

                count2.increment();
                if (count2.intValue() > 0 && count2.intValue() % 10 == 0) {
                    emg.flush();
                    emg.clear();

                }
            });
            inventaire.setStrSTATUT(Constant.STATUT_IS_CLOSED);
            inventaire.setDtUPDATED(new Date());
            inventaire.setLgUSERID(user);
            emg.merge(inventaire);
            String result = "Cloture effectuée avec succès; " + count.intValue() + " Articles mis à jour";
            json.put("success", true).put("msg", result);
            userTransaction.commit();

        } catch (IllegalStateException | SecurityException | HeuristicMixedException | HeuristicRollbackException
                | NotSupportedException | RollbackException | SystemException | JSONException e) {
            json.put("success", false).put("msg", "La cloture n'a pas abouti");
            try {
                LOG.log(Level.SEVERE, null, e);

                if (userTransaction.getStatus() == Status.STATUS_ACTIVE
                        || userTransaction.getStatus() == Status.STATUS_MARKED_ROLLBACK) {
                    userTransaction.rollback();
                }
            } catch (SystemException ex) {
                Logger.getLogger(CommandeServiceImpl.class.getName()).log(Level.SEVERE, null, ex);
            }
        }
        return json;
    }

    @Override
    public String generateCIP(String cip) {
        String result;
        int resultCIP = 0;

        char[] charArray = cip.toCharArray();

        if (cip.length() == 6) {
            for (int i = 1; i <= charArray.length; i++) {
                resultCIP += Integer.parseInt(charArray[(i - 1)] + "") * (i + 1);
            }

            int mod = resultCIP % 11;
            result = cip + "" + mod;
        } else {
            result = cip;
        }

        return result;
    }

    private TGrossiste getGrossiste(String grossisteId) {

        try {
            TypedQuery<TGrossiste> grossiste = getEm().createQuery(
                    "SELECT t FROM TGrossiste t WHERE (t.lgGROSSISTEID = ?1 OR t.strLIBELLE = ?1 OR t.strCODE = ?1) AND t.strSTATUT = ?2",
                    TGrossiste.class).setParameter(1, grossisteId).setParameter(2, Constant.STATUT_ENABLE);
            return grossiste.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }

    }

    private TFamilleGrossiste findFamilleGrossiste(String produitId, String grossisteId) {
        TFamilleGrossiste familleGrossiste = null;
        try {
            TypedQuery<TFamilleGrossiste> qry = this.getEm().createQuery(
                    "SELECT DISTINCT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND (t.lgGROSSISTEID.lgGROSSISTEID = ?2 OR t.lgGROSSISTEID.strDESCRIPTION = ?2) AND t.strSTATUT = ?3 ",
                    TFamilleGrossiste.class).setParameter(1, produitId).setParameter(2, grossisteId)
                    .setParameter(3, Constant.STATUT_ENABLE);
            qry.setMaxResults(1);
            familleGrossiste = qry.getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();
        }

        return familleGrossiste;
    }

    @Override
    public JSONObject createProduct(Params params) throws JSONException {
        JSONObject json = new JSONObject();
        try {
            if (params.getDescription().length() < 6) {
                json.put("success", false);
                json.put("msg", "Le code CIP doit avoir au minimum 6 caractères");
                return json;

            }
            userTransaction.begin();
            EntityManager entityManager = this.getEm();
            TFamille oFamille = entityManager.find(TFamille.class, params.getRef());
            TGrossiste grossiste = getGrossiste(params.getRefParent());
            TFamilleGrossiste familleGrossiste = findFamilleGrossiste(oFamille.getLgFAMILLEID(),
                    grossiste.getLgGROSSISTEID());
            String strCODEARTICLE = generateCIP(params.getDescription());
            if (familleGrossiste != null) {
                familleGrossiste.setStrCODEARTICLE(strCODEARTICLE);
                familleGrossiste.setDtUPDATED(new Date());
                entityManager.merge(familleGrossiste);

            } else {
                familleGrossiste = new TFamilleGrossiste();
                familleGrossiste.setLgFAMILLEID(oFamille);
                familleGrossiste.setIntPAF(oFamille.getIntPAF());
                familleGrossiste.setIntPRICE(oFamille.getIntPRICE());
                familleGrossiste.setLgGROSSISTEID(grossiste);
                familleGrossiste.setDtUPDATED(new Date());
                familleGrossiste.setDtCREATED(familleGrossiste.getDtUPDATED());
                familleGrossiste.setStrCODEARTICLE(strCODEARTICLE);
                entityManager.persist(familleGrossiste);

            }
            userTransaction.commit();
            json.put("success", true);
            json.put("msg", "Opération effectée avec success ");
        } catch (NotSupportedException | SystemException e) {
            json.put("success", false);
            json.put("msg", "Impossible de creer un code article ERROR :: " + e.getMessage());
            LOG.log(Level.SEVERE, null, e);
            try {
                if (userTransaction.getStatus() == Status.STATUS_ACTIVE
                        || userTransaction.getStatus() == Status.STATUS_MARKED_ROLLBACK) {
                    userTransaction.rollback();
                }
            } catch (SystemException ex) {
                LOG.log(Level.SEVERE, null, ex);
            }

        } catch (RollbackException | HeuristicMixedException | HeuristicRollbackException | SecurityException
                | IllegalStateException ex) {
            LOG.log(Level.SEVERE, null, ex);
        }
        return json;
    }

    @Override
    public String genererReferenceCommande() {
        TParameters parameters = this.getEm().find(TParameters.class, "KEY_LAST_ORDER_COMMAND_NUMBER");
        TParameters params2 = this.getEm().find(TParameters.class, "KEY_SIZE_ORDER_NUMBER");
        JSONArray jsonArray = new JSONArray(parameters.getStrVALUE());
        JSONObject jsonObject = jsonArray.getJSONObject(0);
        LocalDate date = LocalDate.parse(jsonObject.getString("str_last_date"),
                DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        int lastCode = 0;
        if (date.equals(LocalDate.now())) {
            lastCode = Integer.parseInt(jsonObject.getString("str_last_date"));
        } else {
            date = LocalDate.now();
        }
        lastCode++;

        String left = StringUtils.leftPad("" + lastCode, Integer.parseInt(params2.getStrVALUE()), '0');
        jsonObject.put("int_last_code", left);
        jsonObject.put("str_last_date", date.format(DateTimeFormatter.ofPattern("yyyy/MM/dd")));
        jsonArray = new JSONArray();
        jsonArray.put(jsonObject);
        parameters.setStrVALUE(jsonArray.toString());
        this.getEm().merge(parameters);
        return LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy")).concat("_") + left;
    }

    private TFamille findByCipOrEan0(String searchValue, TGrossiste grossiste) {
        try {
            TypedQuery<TFamille> q = getEm().createQuery(
                    "SELECT o FROM TFamille o WHERE o.lgGROSSISTEID =?1 AND (o.intCIP LIKE ?2 OR o.intEAN13 LIKE ?2) AND o.strSTATUT='enable' ",
                    TFamille.class);
            q.setParameter(1, grossiste);
            q.setParameter(2, searchValue);
            q.setMaxResults(1);
            return q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    @Override
    public TFamille findByCipOrEan(String searchValue, TGrossiste grossiste) {
        TFamille famille = findByCipOrEan0(searchValue, grossiste);
        if (famille != null) {
            return famille;
        }
        famille = findByCipOrEan1(searchValue, grossiste);
        return famille;
    }

    private TFamille findByCipOrEan1(String searchValue, TGrossiste grossiste) {
        try {
            TypedQuery<TFamilleGrossiste> q = getEm().createQuery(
                    "SELECT o FROM TFamilleGrossiste o WHERE o.lgGROSSISTEID =?1 AND o.strCODEARTICLE=?2 AND o.strSTATUT='enable' ",
                    TFamilleGrossiste.class);
            q.setParameter(1, grossiste);
            q.setParameter(2, searchValue);
            q.setMaxResults(1);
            return q.getSingleResult().getLgFAMILLEID();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    @Override
    public TOrderDetail findByProductAndOrder(TOrder order, TFamille famille) {
        try {
            TypedQuery<TOrderDetail> q = getEm().createNamedQuery("TOrderDetail.findByLgORDERIDAndLgFAMILLEID",
                    TOrderDetail.class);
            q.setParameter("lgORDERID", order);
            q.setParameter("lgFAMILLEID", famille);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    @Override
    public void updateOrderItemQtyFromResponse(TOrderDetail item, int qty, TGrossiste grossiste) {

        item.setIntPRICE(qty * item.getIntPAFDETAIL());
        item.setIntQTEREPGROSSISTE(qty);
        item.setDtUPDATED(new Date());
        getEm().merge(item);

    }

    @Override
    public void addRuptureHistory(TOrderDetail item, TGrossiste grossiste) {
        TRuptureHistory ouptureHistory = new TRuptureHistory();
        ouptureHistory.setLgRUPTUREHISTORYID(UUID.randomUUID().toString());
        ouptureHistory.setLgFAMILLEID(item.getLgFAMILLEID());
        ouptureHistory.setIntNUMBER(item.getIntNUMBER());
        ouptureHistory.setDtCREATED(new Date());
        ouptureHistory.setGrossisteId(grossiste);
        getEm().persist(ouptureHistory);
        getEm().remove(item);
    }

    @Override
    public JSONObject verificationCommande(Part part, String orderId, TUser OTUser) {
        String fileName = part.getSubmittedFileName();
        String extension = fileName.substring(fileName.indexOf(".") + 1, fileName.length());
        try {
            if (extension.equalsIgnoreCase("csv")) {

                return verificationCommandeCsv(part, orderId, OTUser);

            } else {
                return verificationCommandeXlsx(part, orderId, OTUser);
            }

        } catch (IOException ex) {
            LOG.log(Level.SEVERE, null, ex);
            return new JSONObject().put("success", false);
        }

    }

    JSONObject verificationCommandeCsv(Part part, String orderId, TUser oUser) throws IOException {
        try {
            CSVParser parser = new CSVParser(new InputStreamReader(part.getInputStream()),
                    CSVFormat.EXCEL.withDelimiter(';'));
            int nbrePrisEnCompte = 0, nbreNonPrisEnCompte = 0, totalItemsCount = 0;
            TOrder order = getEm().find(TOrder.class, orderId);
            List<TOrderDetail> l = orderService.findByOrderId(order.getLgORDERID());
            TGrossiste grossiste = order.getLgGROSSISTEID();
            Set<TFamille> s = new HashSet<>();
            userTransaction.begin();
            Rupture rupture = orderService.creerRupture(order);
            for (CSVRecord cSVRecord : parser) {
                TFamille famille = findByCipOrEan(cSVRecord.get(0), grossiste);
                if (famille != null) {
                    totalItemsCount++;
                    s.add(famille);
                    TOrderDetail item = findByProductAndOrder(order, famille);
                    if (item == null) {
                        continue;
                    }
                    int qtyCommande = Integer.parseInt(cSVRecord.get(1));
                    int qtyResponse = Integer.parseInt(cSVRecord.get(3));
                    int qty = qtyCommande - qtyResponse;
                    if (qtyResponse > 0) {
                        updateOrderItemQtyFromResponse(item, qtyResponse, grossiste);
                        nbrePrisEnCompte++;
                        if (qtyCommande > qtyResponse) {
                            orderService.creerRuptureItem(rupture, famille, qty);
                            nbreNonPrisEnCompte++;
                        }
                    } else {
                        orderService.creerRuptureItem(rupture, famille, qty);
                        getEm().remove(item);
                        nbreNonPrisEnCompte++;
                    }

                }
            }
            Set<TOrderDetail> orderDetails = productNotInOrderResponse(s, order, l.size(), totalItemsCount);
            nbreNonPrisEnCompte = orderDetails.stream().map(orderDetail -> {
                orderService.creerRuptureItem(rupture, orderDetail.getLgFAMILLEID(), orderDetail.getIntNUMBER());
                return orderDetail;
            }).map(orderDetail -> {
                getEm().remove(orderDetail);
                return orderDetail;
            }).map(it -> 1).reduce(nbreNonPrisEnCompte, Integer::sum);
            if (nbrePrisEnCompte == 0) {
                order.setStrSTATUT(DateConverter.STATUT_DELETE);
                getEm().merge(order);
            }
            userTransaction.commit();

            return new JSONObject().put("success", true).put("nbrePrisEnCompte",
                    "Nombre de produits pris en compte :: " + nbrePrisEnCompte + "<br>"
                            + (nbreNonPrisEnCompte > 0 ? nbreNonPrisEnCompte + " produit(s) en rupture" : ""));
        } catch (NotSupportedException | SystemException | RollbackException | HeuristicMixedException
                | HeuristicRollbackException | SecurityException | IllegalStateException ex) {
            try {
                LOG.log(Level.SEVERE, null, ex);
                userTransaction.rollback();
            } catch (IllegalStateException | SecurityException | SystemException ex1) {
                LOG.log(Level.SEVERE, null, ex1);
            }
            return new JSONObject().put("success", false);

        }

    }

    public Rupture creerRupture(TOrder order) {
        Rupture rupture = new Rupture();
        TGrossiste grossiste = order.getLgGROSSISTEID();
        rupture.setGrossiste(grossiste);
        rupture.setReference(order.getStrREFORDER());
        rupture.setStatut(DateConverter.STATUT_RUPTURE);
        getEm().persist(rupture);
        return rupture;

    }

    private Set<TOrderDetail> productNotInOrderResponse(Set<TFamille> familles, TOrder order, int originalSize,
            int totalItemsCount) {

        if (originalSize == totalItemsCount) {
            return Collections.emptySet();
        }
        List<TOrderDetail> l = orderService.findByOrderId(order.getLgORDERID());
        Set<TOrderDetail> s = new HashSet<>();

        Set<TFamille> set = l.stream().map(x -> x.getLgFAMILLEID()).collect(Collectors.toSet());

        ListUtils.removeAll(set, familles).forEach(e -> {

            TOrderDetail detail = findByProductAndOrder(order, e);
            s.add(detail);
        });
        return s;

    }

    JSONObject verificationCommandeXlsx(Part part, String orderId, TUser OTUse) throws IOException {
        try {

            int nbrePrisEnCompte = 0, nbreNonPrisEnCompte = 0, totalItemsCount = 0;
            TOrder order = getEm().find(TOrder.class, orderId);
            TGrossiste grossiste = order.getLgGROSSISTEID();
            List<TOrderDetail> l = orderService.findByOrderId(order.getLgORDERID());
            HSSFWorkbook workbook = new HSSFWorkbook(part.getInputStream());
            int num = workbook.getNumberOfSheets();
            userTransaction.begin();
            Rupture rupture = orderService.creerRupture(order);
            Set<TFamille> s = new HashSet<>();
            for (int j = 0; j < num; j++) {
                Sheet sheet = workbook.getSheetAt(j);
                Iterator rows = sheet.rowIterator();
                while (rows.hasNext()) {
                    Row nextrow = (Row) rows.next();

                    Cell cipCell = nextrow.getCell(0);
                    Cell qtyCell = nextrow.getCell(3);
                    Cell qtyCmd = nextrow.getCell(1);
                    TFamille famille = findByCipOrEan(((cipCell.getCellType() == 1) ? cipCell.getStringCellValue()
                            : cipCell.getNumericCellValue() + ""), grossiste);
                    if (famille != null) {
                        totalItemsCount++;
                        s.add(famille);
                        TOrderDetail item = findByProductAndOrder(order, famille);
                        int qtyResponse = (int) qtyCell.getNumericCellValue();
                        int qtyCommande = (int) qtyCmd.getNumericCellValue();
                        int qty = qtyCommande - qtyResponse;
                        if (qtyResponse > 0) {
                            updateOrderItemQtyFromResponse(item, qtyResponse, grossiste);
                            nbrePrisEnCompte++;
                            if (qtyCommande > qtyResponse) {
                                orderService.creerRuptureItem(rupture, famille, qty);
                                nbreNonPrisEnCompte++;
                            }
                        } else {
                            orderService.creerRuptureItem(rupture, famille, item.getIntNUMBER());
                            getEm().remove(item);
                            nbreNonPrisEnCompte++;
                        }
                    }

                }
            }
            Set<TOrderDetail> orderDetails = productNotInOrderResponse(s, order, l.size(), totalItemsCount);
            for (TOrderDetail orderDetail : orderDetails) {
                orderService.creerRuptureItem(rupture, orderDetail.getLgFAMILLEID(), orderDetail.getIntNUMBER());
                getEm().remove(orderDetail);
                nbreNonPrisEnCompte++;
            }
            if (nbrePrisEnCompte == 0) {
                order.setStrSTATUT(DateConverter.STATUT_DELETE);
                getEm().merge(order);
            }
            userTransaction.commit();
            return new JSONObject().put("success", true).put("nbrePrisEnCompte",
                    "Nombre de produits pris en compte :: " + nbrePrisEnCompte + "<br>"
                            + (nbreNonPrisEnCompte > 0 ? nbreNonPrisEnCompte + " produit(s) en rupture" : ""));
        } catch (NotSupportedException | SystemException | RollbackException | HeuristicMixedException
                | HeuristicRollbackException | SecurityException | IllegalStateException ex) {
            try {
                LOG.log(Level.SEVERE, null, ex);
                userTransaction.rollback();
            } catch (IllegalStateException | SecurityException | SystemException ex1) {
                LOG.log(Level.SEVERE, null, ex1);
            }
            return new JSONObject().put("success", false);

        }
    }

    private void createNotification(String msg, TypeNotification typeNotification, TUser user,
            Map<String, Object> donneesMap, String entityRef, TClient client) {
        try {

            var notification = new Notification().entityRef(entityRef)
                    .donnees(this.notificationService.buildDonnees(donneesMap))
                    .setCategorieNotification(notificationService.getOneByName(typeNotification)).message(msg)
                    .addUser(user);
            if (Objects.nonNull(client)) {
                NotificationClient notificationClient = new NotificationClient(client, notification);
                notification.addNotificationClients(notificationClient);
            }
            notificationService.save(notification);
        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }

    }
}
