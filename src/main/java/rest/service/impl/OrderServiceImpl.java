/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.ArticleDTO;
import commonTasks.dto.EntreeStockDetailFiltre;
import commonTasks.dto.GenererFactureDTO;
import commonTasks.dto.Params;
import commonTasks.dto.RuptureDTO;
import commonTasks.dto.RuptureDetailDTO;
import dal.*;
import dal.enumeration.TypeLog;
import dal.enumeration.TypeNotification;
import java.math.BigDecimal;
import java.math.BigInteger;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.*;

import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.LogService;
import rest.service.NotificationService;
import rest.service.OrderService;
import rest.service.SessionHelperService;
import rest.service.dto.*;
import util.*;

/**
 * @author DICI
 */
@Stateless
public class OrderServiceImpl implements OrderService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private LogService logService;
    @EJB
    private NotificationService notificationService;
    @EJB
    private SessionHelperService sessionHelperService;

    private static final String QUERY = "SELECT g.`str_TELEPHONE` AS telephone,g.`str_MOBILE` AS mobile,g.str_URL_PHARMAML AS urlPharma,g.str_URL_EXTRANET AS urlExtranet, o.`lg_ORDER_ID` AS orderId, u.`str_FIRST_NAME` AS userName,u.`str_LAST_NAME` AS userLastName, SUM(d.`int_PRICE_DETAIL` * d.`int_NUMBER`) AS montantVente, SUM(d.`int_PRICE`) AS montantAchat, o.`str_REF_ORDER` AS refernceOrder, o.`lg_GROSSISTE_ID` AS grossisteId,g.str_LIBELLE AS libelleGrossiste, DATE_FORMAT(o.`dt_CREATED`, '%d/%m/%Y') AS dateCreation,\n"
            + " DATE_FORMAT(o.`dt_CREATED`, '%k:%i:%s') AS heureCreation, o.`lg_ORDER_ID`, o.`str_STATUT` AS status,COUNT(d.`lg_ORDERDETAIL_ID`) AS itemCount,SUM(d.`int_NUMBER`)AS productCount  FROM  t_order o JOIN t_grossiste g ON g.`lg_GROSSISTE_ID`=o.`lg_GROSSISTE_ID` JOIN t_user u ON u.`lg_USER_ID`=o.`lg_USER_ID`  JOIN t_order_detail d ON o.`lg_ORDER_ID`=d.`lg_ORDER_ID`\n"
            + " JOIN t_famille p ON p.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` WHERE o.`str_STATUT` IN (?1) {searchPlaceHolder} GROUP  BY o.`lg_ORDER_ID` ORDER BY o.`dt_UPDATED`  DESC ";
    private static final String QUERY_COUNT = "SELECT COUNT( distinct o.`lg_ORDER_ID`)  FROM  t_order o JOIN t_grossiste g ON g.`lg_GROSSISTE_ID`=o.`lg_GROSSISTE_ID` JOIN t_user u ON u.`lg_USER_ID`=o.`lg_USER_ID`  JOIN t_order_detail d ON o.`lg_ORDER_ID`=d.`lg_ORDER_ID`\n"
            + " JOIN t_famille p ON p.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID`  WHERE o.`str_STATUT` IN (?1) {searchPlaceHolder} ";

    public EntityManager getEmg() {
        return em;
    }

    private TFamilleStock getTProductItemStock(String produitId, String emp) {
        try {
            TypedQuery<TFamilleStock> q = getEmg().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgFAMILLEID.strSTATUT='enable'  AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2 AND t.strSTATUT ='enable' ",
                    TFamilleStock.class).setParameter(1, produitId).setParameter(2, emp);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            return null;
        }

    }

    private TFamilleStock getTProductItemStock(String produitId) {
        try {
            TypedQuery<TFamilleStock> q = getEmg().createQuery(
                    "SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1   AND t.lgEMPLACEMENTID.lgEMPLACEMENTID = ?2 AND t.strSTATUT ='enable' ",
                    TFamilleStock.class).setParameter(1, produitId).setParameter(2, "1");
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            return null;
        }

    }

    @Override
    public JSONObject creerBonLivraison(Params params) throws JSONException {
        JSONObject json = new JSONObject();
        params.setOperateur(this.sessionHelperService.getCurrentUser());
        List<String> erro = new ArrayList<>();

        TOrder order = getEmg().find(TOrder.class, params.getRefParent());
        if (order == null) {
            return json.put("success", false).put("msg", "Echec: La commande n'existe pas");
        }
        TGrossiste grossiste = order.getLgGROSSISTEID();
        if (isRefBLExistForGrossiste(params.getRef(), grossiste.getLgGROSSISTEID())) {
            return json.put("success", false).put("msg", "Cette référence a déjà été utilisé pour ce grossiste");
        }
        TEmplacement emplacement = params.getOperateur().getLgEMPLACEMENTID();
        String emp = emplacement.getLgEMPLACEMENTID();
        List<TOrderDetail> listTOrderDetail = new ArrayList<>(order.getTOrderDetailCollection());
        TBonLivraison oBonLivraison = createBL(order, params.getOperateur(), params.getRef(),
                DateCommonUtils.convertLocalDateToDate(LocalDate.parse(params.getDtStart())), params.getValue(),
                params.getValueTwo());

        int montant = 0;
        int count = 0;
        int count2 = 0;
        for (TOrderDetail d : listTOrderDetail) {
            TFamille famille = d.getLgFAMILLEID();
            TFamilleStock stock = getTProductItemStock(famille.getLgFAMILLEID(), emp);
            if (stock != null) {
                createBLDetail(oBonLivraison, grossiste, famille, d, famille.getLgZONEGEOID(),
                        stock.getIntNUMBERAVAILABLE());
                d.setStrSTATUT(Constant.STATUT_ENTREE_STOCK);
                d.setDtUPDATED(new Date());
                d.setIntORERSTATUS((short) 4);
                getEmg().merge(d);
                count++;
                montant += d.getIntPRICE();
            } else {
                count2++;
                erro.add(famille.getIntCIP());
            }

        }
        order.setStrSTATUT(Constant.STATUT_IS_CLOSED);
        order.setIntPRICE(montant);
        order.setDtUPDATED(new Date());
        getEmg().merge(order);
        return json.put("success", true).put("count", count).put("nb", count2).put("data", new JSONArray(erro))
                .put("msg", "Opération effectuée avec success");
    }

    private TBonLivraisonDetail createBLDetail(TBonLivraison oTBonLivraison, TGrossiste oTGrossiste, TFamille oTFamille,
            TOrderDetail d, TZoneGeographique oTZoneGeographique, int initStock) {
        TUser user = oTBonLivraison.getLgUSERID();

        TOrder order = oTBonLivraison.getLgORDERID();
        TGrossiste grossiste = order.getLgGROSSISTEID();
        TBonLivraisonDetail oTBonLivraisonDetail = new TBonLivraisonDetail();
        oTBonLivraisonDetail.setLgBONLIVRAISONDETAIL(UUID.randomUUID().toString());
        oTBonLivraisonDetail.setLgBONLIVRAISONID(oTBonLivraison);
        oTBonLivraisonDetail.setLgGROSSISTEID(oTGrossiste);
        oTBonLivraisonDetail.setLgFAMILLEID(oTFamille);
        oTBonLivraisonDetail.setLgZONEGEOID(oTZoneGeographique);
        oTBonLivraisonDetail.setIntQTECMDE(d.getIntNUMBER());
        int qteCmd = Objects.requireNonNullElse(d.getIntNUMBER(), 0);
        int qteRecu = Objects.requireNonNullElse(d.getIntQTEREPGROSSISTE(), 0);
        oTBonLivraisonDetail.setIntQTERECUE(qteRecu);

        oTBonLivraisonDetail.setIntPRIXREFERENCE(d.getIntPRICEDETAIL());
        oTBonLivraisonDetail.setIntPRIXVENTE(d.getIntPRICEDETAIL());
        oTBonLivraisonDetail.setIntPAF(d.getIntPAFDETAIL());
        oTBonLivraisonDetail.setIntPAREEL(d.getIntPAFDETAIL());
        oTBonLivraisonDetail.setPrixUni(d.getPrixUnitaire());
        oTBonLivraisonDetail.setPrixTarif(d.getPrixAchat());
        oTBonLivraisonDetail.setStrETATARTICLE("");
        oTBonLivraisonDetail.setStrLIVRAISONADP("");
        oTBonLivraisonDetail.setStrMANQUEFORCES("");
        oTBonLivraisonDetail.setIntINITSTOCK(initStock);
        oTBonLivraisonDetail.setIntQTEMANQUANT(qteRecu < qteCmd ? qteCmd - qteRecu : 0);
        oTBonLivraisonDetail.setDtCREATED(new Date());
        oTBonLivraisonDetail.setDtUPDATED(oTBonLivraisonDetail.getDtCREATED());
        oTBonLivraisonDetail.setStrSTATUT(Constant.STATUT_ENABLE);
        oTBonLivraisonDetail.setLots(d.getLots());
        TTypeetiquette tTypeetiquette = oTFamille.getLgTYPEETIQUETTEID() == null
                ? em.find(TTypeetiquette.class, Constant.DEFAUL_TYPEETIQUETTE) : oTFamille.getLgTYPEETIQUETTEID();
        List<OrderDetailLot> lots = oTBonLivraisonDetail.getLots();
        if (!CollectionUtils.isEmpty(lots)) {
            lots.forEach(lotDTO -> {
                LocalDate dtpremption = DateUtil.fromString(lotDTO.getDatePeremption());
                Date dtp = DateUtil.from(dtpremption);

                TEtiquette etiquette = createEtiquette(oTBonLivraisonDetail, user, tTypeetiquette, dtp, oTFamille,
                        String.valueOf(lotDTO.getQuantity() + lotDTO.getQuantityGratuit()));
                createTLot(lotDTO, user, oTFamille, oTBonLivraison.getStrREFLIVRAISON(), grossiste,
                        order.getStrREFORDER(), dtp, dtpremption, etiquette);

            });
        }

        getEmg().persist(oTBonLivraisonDetail);
        return oTBonLivraisonDetail;

    }

    private void createTLot(OrderDetailLot orderDetailLot, TUser u, TFamille oFamille, String strRELIVRAISON,
            TGrossiste grossiste, String strREFORDER, Date peremption, LocalDate dtpremption, TEtiquette etiquette) {

        TLot lot = new TLot(UUID.randomUUID().toString());
        lot.setDtCREATED(new Date());
        lot.setLgUSERID(u);
        lot.setLgFAMILLEID(oFamille);
        lot.setIntNUMBER(orderDetailLot.getQuantity());
        lot.setDtSORTIEUSINE(lot.getDtCREATED());
        lot.setStrREFLIVRAISON(strRELIVRAISON);
        lot.setLgGROSSISTEID(grossiste);
        lot.setDtUPDATED(lot.getDtCREATED());
        lot.setStrREFORDER(strREFORDER);
        lot.setIntNUMBERGRATUIT(orderDetailLot.getQuantityGratuit());
        lot.setStrSTATUT(Constant.STATUT_ENABLE);
        lot.setIntQTYVENDUE(0);
        lot.setIntNUMLOT(orderDetailLot.getNumeroLot());
        lot.setDtPEREMPTION(peremption);

        LocalDate tonow = LocalDate.now();

        if ((Objects.nonNull(dtpremption)) && (dtpremption.isBefore(tonow) || dtpremption.isEqual(tonow))) {
            lot.setStrSTATUT(Constant.STATUT_PERIME);
        } else {

            if (tonow.plusMonths(getNombreMois()).isBefore(tonow)) {
                lot.setStrSTATUT(Constant.STATUT_ENCOURS_PEREMPTION);
            }

        }

        getEmg().persist(lot);
        addWarehouse(u, oFamille, lot, grossiste, etiquette);

    }

    private int getNombreMois() {
        try {
            return Integer.parseInt(getEmg().find(TParameters.class, Constant.KEY_MONTH_PERIME).getStrVALUE().trim());
        } catch (Exception e) {
            return 1000;
        }
    }

    private TEtiquette createEtiquette(TBonLivraisonDetail bn, TUser u, TTypeetiquette oTypeetiquette,
            Date dtPeremption, TFamille oFamille, String intNUMBER) {
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
            etiquette = createEtiquette(u, dtPeremption, oTypeetiquette, result, typeEtiquetteName, oFamille,
                    intNUMBER);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
        return etiquette;
    }

    private TEtiquette createEtiquette(TUser u, Date dtPeremption, TTypeetiquette typeetiquette, String strCODE,
            String strNAME, TFamille oTFamille, String intNUMBER) {
        TEtiquette tEtiquette = null;
        try {
            tEtiquette = new TEtiquette();
            tEtiquette.setLgETIQUETTEID(UUID.randomUUID().toString());
            tEtiquette.setStrCODE(strCODE);
            tEtiquette.setStrNAME(strNAME);
            tEtiquette.setDtPEROMPTION(dtPeremption);
            tEtiquette.setLgFAMILLEID(oTFamille);
            tEtiquette.setStrSTATUT(Constant.STATUT_ENABLE);
            tEtiquette.setDtCREATED(new Date());
            tEtiquette.setIntNUMBER(intNUMBER);
            tEtiquette.setLgTYPEETIQUETTEID(typeetiquette);
            tEtiquette.setLgEMPLACEMENTID(u.getLgEMPLACEMENTID());
            this.getEmg().persist(tEtiquette);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return tEtiquette;
    }

    private boolean isRefBLExistForGrossiste(String ref, String idGrossiste) {

        try {
            TypedQuery<TBonLivraison> q = getEmg().createQuery(
                    "SELECT t FROM TBonLivraison t WHERE t.strREFLIVRAISON = ?1 AND t.lgORDERID.lgGROSSISTEID.lgGROSSISTEID = ?2",
                    TBonLivraison.class);
            q.setParameter(1, ref).setParameter(2, idGrossiste).setMaxResults(1);
            return q.getSingleResult() != null;
        } catch (Exception e) {
            return false;
        }

    }

    private TBonLivraison createBL(TOrder order, TUser user, String strREFLIVRAISON, Date dtDATELIVRAISON, int intMHT,
            int intTVA) {
        TBonLivraison bonLivraison = new TBonLivraison(UUID.randomUUID().toString());
        bonLivraison.setStrREFLIVRAISON(strREFLIVRAISON);
        bonLivraison.setDtDATELIVRAISON(dtDATELIVRAISON);
        bonLivraison.setIntMHT(intMHT);
        bonLivraison.setLgUSERID(user);
        bonLivraison.setIntTVA(intTVA);
        bonLivraison.setLgORDERID(order);
        bonLivraison.setIntHTTC(bonLivraison.getIntMHT() + bonLivraison.getIntTVA());
        bonLivraison.setStrSTATUT(Constant.STATUT_ENABLE);
        bonLivraison.setDtCREATED(new Date());
        bonLivraison.setDtUPDATED(dtDATELIVRAISON);
        bonLivraison.setDirectImport(order.getDirectImport());
        getEmg().persist(bonLivraison);
        return bonLivraison;

    }

    @Override
    public TOrder findByRef(String reference, String idCommande) {
        if (!StringUtils.isEmpty(idCommande)) {
            return getEmg().find(TOrder.class, idCommande);
        }
        TypedQuery<TOrder> q = getEmg().createQuery("SELECT o FROM TOrder o WHERE o.strREFORDER=?1", TOrder.class);
        q.setParameter(1, reference);
        return q.getSingleResult();
    }

    @Override
    public List<TOrderDetail> findByOrderId(String idCommande) {
        TypedQuery<TOrderDetail> q = getEmg()
                .createQuery("SELECT o FROM TOrderDetail o WHERE o.lgORDERID.lgORDERID= ?1", TOrderDetail.class);
        q.setParameter(1, idCommande);
        return q.getResultList();
    }

    @Override
    public TOrderDetail findByCipAndOrderId(String codeCip, String idCommande) {
        try {
            TypedQuery<TOrderDetail> q = getEmg().createQuery(
                    "SELECT o FROM TOrderDetail o WHERE o.lgFAMILLEID.intCIP=?1 AND  o.lgORDERID.lgORDERID= ?2",
                    TOrderDetail.class);
            q.setParameter(1, codeCip);
            q.setParameter(2, idCommande);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public Rupture creerRupture(TOrder order) {
        Rupture rupture = new Rupture();
        TGrossiste grossiste = order.getLgGROSSISTEID();
        rupture.setGrossiste(grossiste);
        rupture.setReference(order.getStrREFORDER());
        getEmg().persist(rupture);
        return rupture;

    }

    @Override
    public void creerRuptureItem(Rupture rupture, TFamille famille, int qty) {
        RuptureDetail ruptureDetail = new RuptureDetail();
        ruptureDetail.setProduit(famille);
        ruptureDetail.setRupture(rupture);
        ruptureDetail.setQty(qty);
        ruptureDetail.setPrixAchat(famille.getIntPAF());
        ruptureDetail.setPrixVente(famille.getIntPRICE());
        getEmg().persist(ruptureDetail);
    }

    @Override
    public JSONObject removeRupture(String id) {
        Rupture r = getEmg().find(Rupture.class, id);
        removeRutureItems(r);
        getEmg().remove(r);
        return new JSONObject().put("success", true);
    }

    public void removeRutureItems(Rupture r) {
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaDelete<RuptureDetail> cq = cb.createCriteriaDelete(RuptureDetail.class);
            Root<RuptureDetail> root = cq.from(RuptureDetail.class);
            cq.where(cb.equal(root.get(RuptureDetail_.rupture), r));
            getEmg().createQuery(cq).executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
    }

    @Override
    public List<RuptureDTO> listeRuptures(LocalDate dtStart, LocalDate dtEnd, String query, String grossisteId,
            int start, int limit, boolean all) {

        if (StringUtils.isEmpty(query)) {
            return listeRuptures(dtStart, dtEnd, grossisteId, start, limit, all);
        }
        return listeRupturesByRuptureDetails(dtStart, dtEnd, query, grossisteId, start, limit, all);

    }

    private List<Predicate> predicats(CriteriaBuilder cb, Root<Rupture> root, LocalDate dtStart, LocalDate dtEnd,
            String grossisteId) {
        List<Predicate> predicates = new ArrayList<>();
        Predicate btw = cb.between(root.get(Rupture_.dtCreated), dtStart, dtEnd);
        predicates.add(btw);
        if (!StringUtils.isEmpty(grossisteId)) {
            predicates.add(cb.equal(root.get(Rupture_.grossiste).get(TGrossiste_.lgGROSSISTEID), grossisteId));
        }
        return predicates;
    }

    private List<Predicate> predicats(CriteriaBuilder cb, Root<RuptureDetail> root, LocalDate dtStart, LocalDate dtEnd,
            String grossisteId, String query) {
        List<Predicate> predicates = new ArrayList<>();
        Predicate btw = cb.between(root.get(RuptureDetail_.rupture).get(Rupture_.dtCreated), dtStart, dtEnd);
        predicates.add(btw);
        if (!StringUtils.isEmpty(grossisteId)) {
            predicates.add(
                    cb.equal(root.get(RuptureDetail_.rupture).get(Rupture_.grossiste).get(TGrossiste_.lgGROSSISTEID),
                            grossisteId));
        }
        if (!StringUtils.isEmpty(query)) {
            predicates.add(cb.or(cb.like(root.get(RuptureDetail_.produit).get(TFamille_.intCIP), query + "%"),
                    cb.like(root.get(RuptureDetail_.produit).get(TFamille_.strNAME), query + "%")));
        }
        return predicates;
    }

    long listeRupturesByRuptureDetails(LocalDate dtStart, LocalDate dtEnd, String grossisteId, String query) {
        try {
            CriteriaBuilder cb = getEmg().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<RuptureDetail> root = cq.from(RuptureDetail.class);
            cq.select(cb.countDistinct(root.get(RuptureDetail_.rupture)));
            List<Predicate> predicates = predicats(cb, root, dtStart, dtEnd, grossisteId, query);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = getEmg().createQuery(cq);
            return (long) q.getSingleResult();
        } catch (Exception e) {
            return 0l;
        }
    }

    List<RuptureDTO> listeRupturesByRuptureDetails(LocalDate dtStart, LocalDate dtEnd, String grossisteId, String query,
            int start, int limit, boolean all) {
        try {
            CriteriaBuilder cb = getEmg().getCriteriaBuilder();
            CriteriaQuery<Rupture> cq = cb.createQuery(Rupture.class);
            Root<RuptureDetail> root = cq.from(RuptureDetail.class);
            cq.select(root.get(RuptureDetail_.rupture)).distinct(true)
                    .orderBy(cb.desc(root.get(RuptureDetail_.rupture).get(Rupture_.dtUpdated)));
            List<Predicate> predicates = predicats(cb, root, dtStart, dtEnd, grossisteId, query);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<Rupture> q = getEmg().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            return q.getResultList().stream().map(x -> new RuptureDTO(x, ruptureDetaisDtoByRupture(x.getId()).stream()
                    .map(RuptureDetailDTO::new).collect(Collectors.toList()))).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    List<RuptureDTO> listeRuptures(LocalDate dtStart, LocalDate dtEnd, String grossisteId, int start, int limit,
            boolean all) {
        try {
            CriteriaBuilder cb = getEmg().getCriteriaBuilder();
            CriteriaQuery<Rupture> cq = cb.createQuery(Rupture.class);
            Root<Rupture> root = cq.from(Rupture.class);
            cq.select(root).orderBy(cb.desc(root.get(Rupture_.dtUpdated)));
            List<Predicate> predicates = predicats(cb, root, dtStart, dtEnd, grossisteId);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<Rupture> q = getEmg().createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            return q.getResultList().stream()
                    .map(x -> new RuptureDTO(x,
                            ruptureDetaisDtoByRupture(x.getId()).stream().map(RuptureDetailDTO::new)
                                    .collect(Collectors.toList())))
                    .filter(e -> e.getNbreProduit() > 0).collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    @Override
    public JSONObject listeRuptures(LocalDate dtStart, LocalDate dtEnd, String query, String grossisteId, int start,
            int limit) throws JSONException {
        if (StringUtils.isEmpty(query)) {
            List<RuptureDTO> data = listeRuptures(dtStart, dtEnd, grossisteId, start, limit, true);
            return new JSONObject().put("total", data.size()).put("data", new JSONArray(data));
        }
        return new JSONObject().put("total", listeRupturesByRuptureDetails(dtStart, dtEnd, grossisteId, query)).put(
                "data",
                new JSONArray(listeRupturesByRuptureDetails(dtStart, dtEnd, grossisteId, query, start, limit, false)));
    }

    @Override
    public List<RuptureDetail> ruptureDetaisDtoByRupture(String idRupture) {
        TypedQuery<RuptureDetail> q = getEmg().createQuery("SELECT o FROM RuptureDetail o WHERE o.rupture.id =?1",
                RuptureDetail.class);
        q.setParameter(1, idRupture);
        return q.getResultList();
    }

    @Override
    public RuptureDetail ruptureDetaisByRuptureAndProduitId(String idRupture, String produitId) {
        TypedQuery<RuptureDetail> q = getEmg().createQuery(
                "SELECT o FROM RuptureDetail o WHERE o.rupture.id =?1 AND o.produit.lgFAMILLEID =?2 ",
                RuptureDetail.class);
        q.setParameter(1, idRupture);
        q.setParameter(2, produitId);
        q.setMaxResults(1);
        return q.getSingleResult();
    }

    @Override
    public List<RuptureDetailDTO> listeRuptures(LocalDate dtStart, LocalDate dtEnd, String query, String grossisteId,
            String emplacementId) {
        try {
            CriteriaBuilder cb = getEmg().getCriteriaBuilder();
            CriteriaQuery<RuptureDetail> cq = cb.createQuery(RuptureDetail.class);
            Root<RuptureDetail> root = cq.from(RuptureDetail.class);
            cq.select(root).orderBy(cb.asc(root.get(RuptureDetail_.produit).get(TFamille_.strNAME)));
            List<Predicate> predicates = predicats(cb, root, dtStart, dtEnd, grossisteId, query);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<RuptureDetail> q = getEmg().createQuery(cq);
            return q.getResultList().stream()
                    .map(x -> new RuptureDetailDTO(x, findProduitStock(x.getProduit().getLgFAMILLEID(), emplacementId)))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    @Override
    public int findProduitStock(String idProduit, String emplacementId) {
        try {
            Query q = this.getEmg().createQuery(
                    "SELECT o.intNUMBERAVAILABLE FROM TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgEMPLACEMENTID.lgEMPLACEMENTID=?2 AND o.strSTATUT='enable' ");
            q.setParameter(1, idProduit);
            q.setParameter(2, emplacementId);
            q.setMaxResults(1);
            return ((Integer) q.getSingleResult());
        } catch (Exception e) {

            return 0;
        }
    }

    @Override
    public JSONObject creerRupture(GenererFactureDTO datas) throws JSONException {
        try {
            List<RuptureDetail> ruptureDetails = new ArrayList<>();

            TGrossiste grossiste = this.getEmg().find(TGrossiste.class, datas.getOrganismeId());
            Rupture rupture = new Rupture();
            rupture.setGrossiste(grossiste);
            rupture.setReference(genererReferenceCommande());
            getEmg().persist(rupture);
            datas.getDatas().forEach(s -> ruptureDetails.addAll(ruptureDetaisDtoByRupture(s)));
            Map<TFamille, List<RuptureDetail>> map = ruptureDetails.stream()
                    .collect(Collectors.groupingBy(RuptureDetail::getProduit));
            map.forEach((k, v) -> {
                RuptureDetail rd = v.get(0);
                if (v.size() > 1) {
                    int sumQty = v.stream().filter(obj -> !obj.equals(rd)).peek(o -> {
                        this.getEmg().refresh(o);
                    }).map(RuptureDetail::getQty).reduce(0, Integer::sum);
                    rd.setQty(rd.getQty() + sumQty);

                }
                TFamilleGrossiste familleGrossiste = findOrCreateFamilleGrossiste(k, grossiste);
                if (familleGrossiste != null) {
                    rd.setPrixAchat(familleGrossiste.getIntPAF());
                    rd.setPrixVente(familleGrossiste.getIntPRICE());
                    rd.setRupture(rupture);

                } else {
                    rd.setRupture(rupture);
                }

                this.getEmg().merge(rd);
            });

            datas.getDatas().forEach(s -> {

                this.getEmg().remove(this.getEmg().find(Rupture.class, s));
            });
            return new JSONObject().put("success", true).put("ruptureId", rupture.getId());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false);
        }

    }

    public String genererReferenceCommande() {
        TParameters oTParameters = this.getEmg().find(TParameters.class, "KEY_LAST_ORDER_COMMAND_NUMBER");
        TParameters param = this.getEmg().find(TParameters.class, "KEY_SIZE_ORDER_NUMBER");
        JSONArray jsonArray = new JSONArray(oTParameters.getStrVALUE());
        JSONObject jsonObject = jsonArray.getJSONObject(0);
        LocalDate date = LocalDate.parse(jsonObject.getString("str_last_date"),
                DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        int lastCode = 0;
        if (date.equals(LocalDate.now())) {
            lastCode = Integer.parseInt(jsonObject.getString("int_last_code"));
        } else {
            date = LocalDate.now();
        }
        lastCode++;

        String left = StringUtils.leftPad("" + lastCode, Integer.parseInt(param.getStrVALUE()), '0');
        jsonObject.put("int_last_code", left);
        jsonObject.put("str_last_date", date.format(DateTimeFormatter.ofPattern("yyyy/MM/dd")));
        jsonArray = new JSONArray();
        jsonArray.put(jsonObject);
        oTParameters.setStrVALUE(jsonArray.toString());
        this.getEmg().merge(oTParameters);
        return LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy")).concat("_") + left;
    }

    @Override
    public TFamilleGrossiste findOrCreateFamilleGrossiste(TFamille famille, TGrossiste grossiste) {
        try {
            TFamilleGrossiste familleGrossiste = finFamilleGrossisteByIdFamilleAndIdGrossiste(famille.getLgFAMILLEID(),
                    grossiste.getLgGROSSISTEID());
            if (familleGrossiste != null) {
                return familleGrossiste;
            }
            familleGrossiste = new TFamilleGrossiste();
            familleGrossiste.setLgFAMILLEID(famille);
            familleGrossiste.setLgGROSSISTEID(grossiste);
            familleGrossiste.setIntPAF(famille.getIntPAF());
            familleGrossiste.setIntPRICE(famille.getIntPRICE());
            familleGrossiste.setStrCODEARTICLE(famille.getIntCIP());
            this.getEmg().persist(familleGrossiste);
            return familleGrossiste;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    @Override
    public TFamilleGrossiste finFamilleGrossisteByFamilleCipAndIdGrossiste(String cip, String grossisteId) {
        try {
            TypedQuery<TFamilleGrossiste> q = this.getEmg().createQuery(
                    "SELECT OBJECT(o) FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.intCIP =?1 AND o.lgGROSSISTEID.lgGROSSISTEID=?2 AND o.strSTATUT='enable' ",
                    TFamilleGrossiste.class);
            q.setParameter(1, cip);
            q.setParameter(2, grossisteId);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {

            return null;
        }
    }

    @Override
    public TFamilleGrossiste finFamilleGrossisteByIdFamilleAndIdGrossiste(String id, String grossisteId) {
        try {
            TypedQuery<TFamilleGrossiste> q = this.getEmg().createQuery(
                    "SELECT OBJECT(o) FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgGROSSISTEID.lgGROSSISTEID=?2 AND o.strSTATUT='enable' ",
                    TFamilleGrossiste.class);
            q.setParameter(1, id);
            q.setParameter(2, grossisteId);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }

    private static final Logger LOG = Logger.getLogger(OrderServiceImpl.class.getName());

    @Override
    public TOrder createOrder(TGrossiste grossiste, TUser u) {
        TOrder order = new TOrder(new KeyUtilGen().getComplexId());
        order.setDtCREATED(new Date());
        order.setDtUPDATED(order.getDtCREATED());
        order.setLgGROSSISTEID(grossiste);
        order.setStrREFORDER(genererReferenceCommande());
        order.setStrSTATUT(Constant.STATUT_PASSED);
        order.setIntPRICE(0);
        order.setLgUSERID(u);
        return order;

    }

    @Override
    public TOrderDetail modificationProduitCommandeEncours(ArticleDTO dto, TUser user) {

        TOrderDetail detail = this.getEmg().find(TOrderDetail.class, dto.getId());
        TFamille f = detail.getLgFAMILLEID();
        TOrder order = detail.getLgORDERID();
        TFamilleGrossiste produitGrossiste = findOrCreateFamilleGrossiste(f, order.getLgGROSSISTEID());
        if (dto.getPrixAchat() != produitGrossiste.getIntPAF()) {
            String desc = "Modification du prix d'achat du produit : " + f.getIntCIP() + " " + f.getStrNAME()
                    + " ancien prix: " + produitGrossiste.getIntPAF() + " nouveau prix :" + dto.getPrixAchat();
            logService.updateItem(user, produitGrossiste.getStrCODEARTICLE(), desc,
                    TypeLog.MODIFICATION_INFO_PRODUIT_COMMANDE, f);

            saveMouvementPrice(f, dto.getPrixAchat(), produitGrossiste.getIntPAF(), f.getIntCIP(), user);

            Map<String, Object> donnee = new HashMap<>();
            donnee.put(NotificationUtils.PRIX_ACHAT_INIT.getId(),
                    NumberUtils.formatIntToString(produitGrossiste.getIntPAF()));
            donnee.put(NotificationUtils.PRIX_ACHAT_FINAL.getId(), NumberUtils.formatIntToString(dto.getPrixAchat()));
            donnee.put(NotificationUtils.ITEM_KEY.getId(), f.getIntCIP());
            donnee.put(NotificationUtils.ITEM_DESC.getId(), f.getStrNAME());
            donnee.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.MODIFICATION_PA_PRODUIT_COMMANDE.getValue());
            donnee.put(NotificationUtils.USER.getId(), user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
            donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
            createNotification(desc, TypeNotification.MODIFICATION_INFO_PRODUIT_COMMANDE, user, donnee,
                    f.getLgFAMILLEID());
        }

        detail.setIntNUMBER(dto.getStock());
        detail.setIntQTEREPGROSSISTE(dto.getStock());
        detail.setIntQTEMANQUANT(dto.getStock());
        detail.setIntPRICE(dto.getStock() * dto.getPrixAchat());
        detail.setIntPAFDETAIL(dto.getPrixAchat());

        detail.setStrSTATUT(Constant.STATUT_IS_PROGRESS);
        detail.setDtUPDATED(new Date());
        detail.setPrixAchat(produitGrossiste.getIntPAF());

        this.getEmg().merge(detail);
        order.setDtUPDATED(detail.getDtUPDATED());
        this.getEmg().merge(order);
        return detail;
    }

    private void createNotification(String msg, TypeNotification typeNotification, TUser user,
            Map<String, Object> donneesMap, String entityRef) {
        try {
            notificationService.save(
                    new Notification().entityRef(entityRef).donnees(this.notificationService.buildDonnees(donneesMap))
                            .setCategorieNotification(notificationService.getOneByName(typeNotification)).message(msg)
                            .addUser(user));
        } catch (Exception ex) {
            LOG.log(Level.SEVERE, null, ex);
        }

    }

    private void saveMouvementPrice(TFamille famille, int prix, int oldPrice, String ref, TUser u) {

        try {
            TMouvementprice mouvementprice = new TMouvementprice(UUID.randomUUID().toString());
            mouvementprice.setLgUSERID(u);
            mouvementprice.setStrACTION(Constant.ACTION_COMMANDE);
            mouvementprice.setDtUPDATED(new Date());
            mouvementprice.setDtCREATED(mouvementprice.getDtCREATED());
            mouvementprice.setIntPRICENEW(prix);
            mouvementprice.setIntPRICEOLD(oldPrice);
            mouvementprice.setStrREF(ref);
            mouvementprice.setDtDAY(new Date());
            mouvementprice.setStrSTATUT(Constant.STATUT_ENABLE);
            mouvementprice.setLgFAMILLEID(famille);
            this.getEmg().persist(mouvementprice);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }

    }

    @Override
    public TFamilleGrossiste findOrCreateFamilleGrossisteByFamilleAndGrossiste(TFamille famille, TGrossiste grossiste) {
        try {
            TFamilleGrossiste familleGrossiste = finFamilleGrossisteByByFamilleAndIdGrossiste(famille.getLgFAMILLEID(),
                    grossiste.getLgGROSSISTEID());
            if (familleGrossiste != null) {
                return familleGrossiste;
            }

            familleGrossiste = new TFamilleGrossiste();
            familleGrossiste.setLgFAMILLEID(famille);
            familleGrossiste.setLgGROSSISTEID(grossiste);
            familleGrossiste.setIntPAF(famille.getIntPAF());
            familleGrossiste.setIntPRICE(famille.getIntPRICE());
            familleGrossiste.setStrCODEARTICLE(famille.getIntCIP());
            this.getEmg().persist(familleGrossiste);
            return familleGrossiste;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    @Override
    public TFamilleGrossiste finFamilleGrossisteByByFamilleAndIdGrossiste(String idFamille, String grossisteId) {
        try {
            TypedQuery<TFamilleGrossiste> q = this.getEmg().createQuery(
                    "SELECT OBJECT(o) FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.lgFAMILLEID =?1 AND o.lgGROSSISTEID.lgGROSSISTEID=?2 AND o.strSTATUT='enable' ",
                    TFamilleGrossiste.class);
            q.setParameter(1, idFamille);
            q.setParameter(2, grossisteId);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    @Override
    public TGrossiste findGrossiste(String id) {
        return getEmg().find(TGrossiste.class, id);
    }

    @Override
    public JSONObject updateScheduled(String idProduit, boolean scheduled) throws JSONException {
        try {
            TFamille famille = getEmg().find(TFamille.class, idProduit);
            famille.setScheduled(scheduled);
            getEmg().merge(famille);
            return new JSONObject().put("success", true);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false);
        }
    }

    @Override
    public List<CommandeEncourDetailDTO> fetchOrderItems(CommandeFiltre filtre, String orderId, String query, int start,
            int limit, boolean all) {
        try {

            CriteriaBuilder cb = getEmg().getCriteriaBuilder();
            CriteriaQuery<TOrderDetail> cq = cb.createQuery(TOrderDetail.class);
            Root<TOrderDetail> root = cq.from(TOrderDetail.class);
            cq.select(root).orderBy(cb.desc(root.get(TOrderDetail_.dtUPDATED)),
                    cb.asc(root.get(TOrderDetail_.lgFAMILLEID).get(TFamille_.strNAME)));
            List<Predicate> predicates = fetchOrderItemsPredicats(cb, root, orderId, filtre, query);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TOrderDetail> q = getEmg().createQuery(cq);
            if (!all && filtre != CommandeFiltre.PRIX_VENTE_PLUS_30) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            if (filtre == CommandeFiltre.PRIX_VENTE_PLUS_30) {
                return q.getResultList().stream().filter(FunctionUtils.ECART_PRIX_VENTE_30)
                        .map(CommandeEncourDetailDTO::new).collect(Collectors.toList());
            }
            return q.getResultList().stream().map(
                    e -> new CommandeEncourDetailDTO(e, this.getTProductItemStock(e.getLgFAMILLEID().getLgFAMILLEID())))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private List<Predicate> fetchOrderItemsPredicats(CriteriaBuilder cb, Root<TOrderDetail> root, String orderId,
            CommandeFiltre filtre, String query) {
        List<Predicate> predicates = new ArrayList<>();

        predicates.add(cb.equal(root.get(TOrderDetail_.lgORDERID).get(TOrder_.lgORDERID), orderId));

        CommandeFiltre commandeFiltre = Objects.isNull(filtre) ? CommandeFiltre.ALL : filtre;

        switch (commandeFiltre) {
        case PRIX_VENTE_DIFF:
            predicates.add(cb.notEqual(root.get(TOrderDetail_.intPRICEDETAIL),
                    root.get(TOrderDetail_.lgFAMILLEID).get(TFamille_.intPRICE)));
            break;
        case PRIX_VENTE_PLUS_30:
        case ALL:
            break;
        default:
            break;
        }
        if (StringUtils.isNotEmpty(query)) {
            predicates.add(cb.or(cb.like(root.get(TOrderDetail_.lgFAMILLEID).get(TFamille_.intCIP), query + "%"),
                    cb.like(root.get(TOrderDetail_.lgFAMILLEID).get(TFamille_.strNAME), query + "%")));
        }
        return predicates;
    }

    @Override
    public JSONObject fetchOrderItems(CommandeFiltre filtre, String orderId, String query, int start, int limit) {
        List<CommandeEncourDetailDTO> data = this.fetchOrderItems(filtre, orderId, query, start, limit, false);
        if (filtre == CommandeFiltre.PRIX_VENTE_PLUS_30) {
            return FunctionUtils.returnData(data);
        }
        return FunctionUtils.returnData(data, fetchOrderItemsCount(filtre, orderId, query));
    }

    @Override
    public String modifierProduitPrixVenteCommandeEnCours(ArticleDTO dto, TUser user) {

        TOrderDetail detail = this.getEmg().find(TOrderDetail.class, dto.getId());
        TFamille f = detail.getLgFAMILLEID();
        TOrder order = detail.getLgORDERID();
        TFamilleGrossiste produitGrossiste = findOrCreateFamilleGrossiste(f, order.getLgGROSSISTEID());

        String desc = "Modification du prix de vente du produit :" + f.getStrNAME() + " prix importé: "
                + detail.getIntPRICEDETAIL() + " nouveau prix :" + dto.getPrixVente();
        int prixInitial = detail.getIntPRICEDETAIL();
        logService.updateItem(user, produitGrossiste.getStrCODEARTICLE(), desc,
                TypeLog.MODIFICATION_INFO_PRODUIT_COMMANDE, f);

        saveMouvementPrice(f, dto.getPrixVente(), detail.getIntPRICEDETAIL(), f.getIntCIP(), user);
        detail.setIntPRICEDETAIL(dto.getPrixVente());
        detail.setStrSTATUT(DateConverter.STATUT_PROCESS);
        detail.setDtUPDATED(new Date());
        detail.setPrixUnitaire(dto.getPrixVente());
        this.getEmg().merge(detail);
        order.setDtUPDATED(detail.getDtUPDATED());
        order.setLgUSERID(user);
        this.getEmg().merge(order);
        Map<String, Object> donnee = new HashMap<>();
        donnee.put(NotificationUtils.PRIX_INIT.getId(), NumberUtils.formatIntToString(prixInitial));
        donnee.put(NotificationUtils.PRIX_FINAL.getId(), NumberUtils.formatIntToString(dto.getPrixVente()));
        donnee.put(NotificationUtils.ITEM_KEY.getId(), f.getIntCIP());
        donnee.put(NotificationUtils.ITEM_DESC.getId(), f.getStrNAME());
        donnee.put(NotificationUtils.TYPE_NAME.getId(), TypeLog.MODIFICATION_PU_PRODUIT_COMMANDE.getValue());
        donnee.put(NotificationUtils.USER.getId(), user.getStrFIRSTNAME() + " " + user.getStrLASTNAME());
        donnee.put(NotificationUtils.MVT_DATE.getId(), DateCommonUtils.formatCurrentDate());
        createNotification(desc, TypeNotification.MODIFICATION_INFO_PRODUIT_COMMANDE, user, donnee, f.getLgFAMILLEID());
        return order.getLgORDERID();
    }

    private long fetchOrderItemsCount(CommandeFiltre filtre, String orderId, String query) {
        try {

            CriteriaBuilder cb = getEmg().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TOrderDetail> root = cq.from(TOrderDetail.class);
            cq.select(cb.count(root));
            List<Predicate> predicates = fetchOrderItemsPredicats(cb, root, orderId, filtre, query);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<Long> q = getEmg().createQuery(cq);

            return q.getSingleResult().intValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    @Override
    public JSONObject fetch(String search, Set<String> status, int start, int limit) {
        long count = getOrderCount(search, status);
        return FunctionUtils.returnData(getOrders(search, status, start, limit), count);

    }

    private TFamilleGrossiste findFamilleGrossiste(String familleId, String grossisteId) {

        try {
            Query qry = getEmg().createQuery(
                    "SELECT DISTINCT t FROM TFamilleGrossiste t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgGROSSISTEID.lgGROSSISTEID = ?2  AND t.strSTATUT = ?3 ")
                    .setParameter(1, familleId).setParameter(2, grossisteId).setParameter(3, Constant.STATUT_ENABLE);
            qry.setMaxResults(1);
            return (TFamilleGrossiste) qry.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.INFO, null, e.getMessage());
            return null;

        }
    }

    @Override
    public void removeItem(String itemId) {
        TOrderDetail item = getEmg().find(TOrderDetail.class, itemId);
        TOrder order = item.getLgORDERID();
        if (CollectionUtils.isNotEmpty(order.getTOrderDetailCollection())
                && order.getTOrderDetailCollection().size() == 1) {
            getEmg().remove(item);
            getEmg().remove(order);
        } else {
            getEmg().remove(item);
            order.setDtUPDATED(new Date());
            getEmg().persist(order);
        }

    }

    @Override
    public JSONObject getCommandeAmount(String commandeId) {

        try {
            long montantAchat = 0;
            long montantVente = 0;
            TOrder order = getEmg().find(TOrder.class, commandeId);
            for (TOrderDetail item : order.getTOrderDetailCollection()) {
                montantAchat += item.getIntPRICE();
                montantVente += ((long) item.getIntNUMBER() * item.getIntPRICEDETAIL());
            }
            return new JSONObject().put("orderRef", order.getStrREFORDER()).put("success", true)
                    .put("prixAchat", montantAchat).put("prixVente", montantVente);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject();
        }

    }

    @Override
    public JSONObject addItem(OrderDetailDTO orderDetail, TUser user) {
        Objects.requireNonNull(orderDetail.getQte(), "La quantité ne doit pas être null");
        JSONObject json = new JSONObject();
        if (StringUtils.isNotEmpty(orderDetail.getOrderId()) && !orderDetail.getOrderId().equals("0")) {
            find(orderDetail.getOrderId()).ifPresent(order -> {
                createOrUpdate(orderDetail, order);
                json.put("orderId", order.getLgORDERID());
            });
        } else {
            TOrder tOrder = createOrder(orderDetail, user);
            json.put("orderId", tOrder.getLgORDERID());
        }

        return json;
    }

    private TOrder createOrder(OrderDetailDTO orderDetail, TUser user) {

        TGrossiste grossiste = this.getEmg().find(TGrossiste.class, orderDetail.getGrossisteId());
        KeyUtilGen keyUtilGen = new KeyUtilGen();

        TOrder order = new TOrder();
        order.setLgORDERID(keyUtilGen.getComplexId());
        order.setLgUSERID(user);
        order.setLgGROSSISTEID(grossiste);
        order.setStrREFORDER(this.buildCommandeRef(new Date(), keyUtilGen));
        order.setStrSTATUT(orderDetail.getStatut());
        order.setDtCREATED(new Date());
        order.setDtUPDATED(order.getDtCREATED());
        this.getEmg().persist(order);
        createOrderItem(order, orderDetail, keyUtilGen);
        return order;

    }

    private String buildCommandeRef(Date date, KeyUtilGen keyUtilGen) {
        TParameters parameters = this.getEmg().find(TParameters.class, "KEY_LAST_ORDER_COMMAND_NUMBER");
        TParameters parameters1 = this.getEmg().find(TParameters.class, "KEY_SIZE_ORDER_NUMBER");
        String jsondata = parameters.getStrVALUE();
        int int_last_code = 0;
        int_last_code = int_last_code + 1;

        try {
            JSONArray jsonArray = new JSONArray(jsondata);
            JSONObject jsonObject = jsonArray.getJSONObject(0);
            int_last_code = Integer.parseInt(jsonObject.getString("int_last_code"));
            Date dt_last_date = keyUtilGen.stringToDate(jsonObject.getString("str_last_date"),
                    keyUtilGen.formatterMysqlShort2);

            String str_lasd = KeyUtilGen.dateToString(dt_last_date, keyUtilGen.formatterMysqlShort2);
            String str_actd = KeyUtilGen.dateToString(date, keyUtilGen.formatterMysqlShort2);

            if (!str_lasd.equals(str_actd)) {
                int_last_code = 0;
            }

        } catch (Exception e) {

        }

        Calendar now = Calendar.getInstance();
        int hh = now.get(Calendar.HOUR_OF_DAY);
        int mois = now.get(Calendar.MONTH) + 1;
        int jour = now.get(Calendar.DAY_OF_MONTH);
        String mois_tostring = "";

        int intsize = ((int_last_code + 1) + "").length();
        int intsize_tobuild = Integer.parseInt(parameters1.getStrVALUE());
        String str_last_code = "";
        for (int i = 0; i < (intsize_tobuild - intsize); i++) {
            str_last_code = str_last_code + "0";
        }

        str_last_code = str_last_code + (int_last_code + 1) + "";
        if (mois < 10) {
            mois_tostring = "0" + mois;
        } else {
            mois_tostring = String.valueOf(mois);
        }
        String str_code = jour + "" + mois_tostring + "" + keyUtilGen.getYear(date) + "_" + str_last_code;
        JSONObject json = new JSONObject();
        JSONArray arrayObj = new JSONArray();
        json.put("int_last_code", str_last_code);
        json.put("str_last_date", KeyUtilGen.dateToString(date, keyUtilGen.formatterMysqlShort2));
        arrayObj.put(json);
        String jsonData = arrayObj.toString();

        parameters.setStrVALUE(jsonData);
        this.getEmg().persist(parameters);

        return str_code;
    }

    private Optional<TOrder> find(String id) {
        try {
            return Optional.ofNullable(this.getEmg().find(TOrder.class, id));
        } catch (Exception e) {
            return Optional.empty();

        }
    }

    private TFamilleGrossiste createIfNotExist(OrderDetailDTO orderDetailDTO, TOrder order) {
        TFamilleGrossiste familleGrossiste = findFamilleGrossiste(orderDetailDTO.getFamilleId(),
                order.getLgGROSSISTEID().getLgGROSSISTEID());
        if (familleGrossiste == null) {
            TFamille famille = this.getEmg().find(TFamille.class, orderDetailDTO.getFamilleId());
            familleGrossiste = new TFamilleGrossiste();
            familleGrossiste.setLgFAMILLEID(famille);
            familleGrossiste.setLgGROSSISTEID(order.getLgGROSSISTEID());
            familleGrossiste.setIntPAF(famille.getIntPAF());
            familleGrossiste.setIntPRICE(famille.getIntPRICE());
            familleGrossiste.setStrCODEARTICLE("");
            getEmg().persist(familleGrossiste);

        }
        return familleGrossiste;
    }

    private void createOrderItem(TOrder order, OrderDetailDTO orderDetailDTO, KeyUtilGen keyUtilGen) {
        TFamilleGrossiste familleGrossiste = createIfNotExist(orderDetailDTO, order);

        TFamille famille = familleGrossiste.getLgFAMILLEID();
        TOrderDetail detail = new TOrderDetail();
        detail.setLgORDERDETAILID(keyUtilGen.getComplexId());
        detail.setLgORDERID(order);
        detail.setIntNUMBER(orderDetailDTO.getQte());
        detail.setIntQTEREPGROSSISTE(detail.getIntNUMBER());
        detail.setIntQTEMANQUANT(detail.getIntNUMBER());
        detail.setIntPAFDETAIL(familleGrossiste.getIntPAF());
        detail.setIntPRICEDETAIL(familleGrossiste.getIntPRICE());
        detail.setIntPRICE(detail.getIntPAFDETAIL() * detail.getIntNUMBER());
        detail.setLgFAMILLEID(famille);
        detail.setLgGROSSISTEID(order.getLgGROSSISTEID());
        detail.setStrSTATUT(Constant.STATUT_IS_PROGRESS);
        detail.setDtCREATED(new Date());
        detail.setDtUPDATED(detail.getDtCREATED());
        detail.setIntORERSTATUS((short) 2);
        detail.setPrixAchat(familleGrossiste.getIntPAF());
        this.getEmg().persist(detail);

    }

    private void updateItem(TOrderDetail detail, int qte) {
        detail.setIntNUMBER(detail.getIntNUMBER() + qte);
        detail.setIntQTEREPGROSSISTE(detail.getIntNUMBER());
        detail.setIntQTEMANQUANT(detail.getIntNUMBER());
        detail.setIntPRICE(detail.getIntPAFDETAIL() * detail.getIntNUMBER());
        detail.setDtUPDATED(new Date());
        this.getEmg().merge(detail);
    }

    private void createOrUpdate(OrderDetailDTO orderDetailDTO, TOrder order) {
        findOne(orderDetailDTO.getFamilleId(), order.getLgORDERID()).ifPresentOrElse(
                it -> updateItem(it, orderDetailDTO.getQte()),
                () -> createOrderItem(order, orderDetailDTO, new KeyUtilGen()));

    }

    private Optional<TOrderDetail> findOne(String lgFamilleId, String orderId) {

        try {
            return Optional.ofNullable(this.getEmg().createQuery(
                    "SELECT t FROM TOrderDetail t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgORDERID.lgORDERID = ?2",
                    TOrderDetail.class).setParameter(1, lgFamilleId).setParameter(2, orderId).setMaxResults(1)
                    .getSingleResult());

        } catch (Exception e) {
            return Optional.empty();

        }

    }

    private CommandeCsvDTO buildFromOrderDetail(TOrderDetail d) {
        TFamille famille = d.getLgFAMILLEID();
        String code = famille.getIntEAN13();
        if (StringUtils.isEmpty(code)) {
            TFamilleGrossiste tfg = findFamilleGrossiste(d.getLgFAMILLEID().getLgFAMILLEID(),
                    d.getLgORDERID().getLgGROSSISTEID().getLgGROSSISTEID());
            if (Objects.nonNull(tfg) && StringUtils.isNotEmpty(tfg.getStrCODEARTICLE())) {
                code = tfg.getStrCODEARTICLE();
            } else {
                code = famille.getIntCIP();
            }

        }
        return new CommandeCsvDTO(code, d.getIntNUMBER());

    }

    @Override
    public Map<String, List<CommandeCsvDTO>> commandeEncoursCsv(String idCommande) {
        TOrder order = this.getEmg().find(TOrder.class, idCommande);
        return Map.of(order.getStrREFORDER(), order.getTOrderDetailCollection().stream().map(this::buildFromOrderDetail)
                .collect(Collectors.toList()));

    }

    @Override
    public void passerLaCommande(String orderId) {

        changeOrderStatuts(this.getEmg().find(TOrder.class, orderId), Constant.STATUT_PASSED);
    }

    @Override
    public void changerEnCommandeEnCours(String orderId) {
        changeOrderStatuts(this.getEmg().find(TOrder.class, orderId), Constant.STATUT_IS_PROGRESS);
    }

    private void changeOrderStatuts(TOrder order, String status) {
        Date toDay = new Date();

        order.getTOrderDetailCollection().forEach(it -> {
            updateOrderItemStatut(it, status, toDay);

        });
        order.setDtUPDATED(toDay);
        order.setStrSTATUT(status);
        getEmg().merge(order);

    }

    private void updateOrderItemStatut(TOrderDetail detail, String status, Date date) {
        detail.setStrSTATUT(status);
        detail.setDtUPDATED(date);
        getEmg().merge(detail);

    }

    private TOrder createOrderFromSuggession(TGrossiste grossiste, TUser u, KeyUtilGen keyUtilGen) {
        TOrder order = new TOrder(keyUtilGen.getComplexId());
        order.setDtCREATED(new Date());
        order.setDtUPDATED(order.getDtCREATED());
        order.setLgGROSSISTEID(grossiste);
        order.setStrREFORDER(genererReferenceCommande());
        order.setStrSTATUT(Constant.STATUT_IS_PROGRESS);
        order.setIntPRICE(0);
        order.setLgUSERID(u);
        this.em.persist(order);
        return order;

    }

    @Override
    public void transformSuggestionToOrder(String suggestionId, TUser user) {
        KeyUtilGen keyUtilGen = new KeyUtilGen();
        TSuggestionOrder suggestionOrder = em.find(TSuggestionOrder.class, suggestionId);
        TGrossiste grossiste = suggestionOrder.getLgGROSSISTEID();
        TOrder order = createOrderFromSuggession(grossiste, user, keyUtilGen);
        for (TSuggestionOrderDetails details : suggestionOrder.getTSuggestionOrderDetailsCollection()) {
            createOrderDetail(order, details, grossiste, keyUtilGen);
        }
        em.remove(suggestionOrder);
    }

    private void createOrderDetail(TOrder order, TSuggestionOrderDetails details, TGrossiste grossiste,
            KeyUtilGen keyUtilGen) {
        TFamille famille = details.getLgFAMILLEID();

        TOrderDetail orderDetail = new TOrderDetail();
        orderDetail.setLgORDERDETAILID(keyUtilGen.getComplexId());
        orderDetail.setLgORDERID(order);
        orderDetail.setIntNUMBER(details.getIntNUMBER());
        orderDetail.setIntQTEREPGROSSISTE(orderDetail.getIntNUMBER());
        orderDetail.setIntQTEMANQUANT(orderDetail.getIntNUMBER());
        orderDetail.setIntPAFDETAIL(details.getIntPAFDETAIL());
        orderDetail.setIntPRICEDETAIL(details.getIntPRICEDETAIL());
        orderDetail.setIntPRICE(orderDetail.getIntNUMBER() * orderDetail.getIntPAFDETAIL());
        orderDetail.setLgFAMILLEID(famille);
        orderDetail.setLgGROSSISTEID(grossiste);
        orderDetail.setStrSTATUT(Constant.STATUT_IS_PROGRESS);
        orderDetail.setDtCREATED(order.getDtCREATED());
        orderDetail.setDtUPDATED(order.getDtCREATED());
        em.persist(orderDetail);
        em.remove(details);
    }

    @Override
    public void removeOrder(String orderId) {
        em.remove(em.find(TOrder.class, orderId));

    }

    private String buildQuery(String search, String sql) {
        if (StringUtils.isNotEmpty(search)) {
            search = search + "%";
            return sql.replace("{searchPlaceHolder}",
                    " AND (o.`str_REF_ORDER` LIKE '{search}' OR p.`int_CIP` LIKE '{search}'  OR p.`str_NAME` LIKE '{search}') "
                            .replace("{search}", search));
        }
        return sql.replace("{searchPlaceHolder}", " ");
    }

    private List<Tuple> getListOrder(String search, Set<String> status, int start, int limit) {
        try {
            Query q = em.createNativeQuery(buildQuery(search, QUERY), Tuple.class).setParameter(1, status);
            q.setFirstResult(start);
            q.setMaxResults(limit);
            return q.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new ArrayList<>();
        }
    }

    private int getOrderCount(String query, Set<String> status) {
        try {
            Query q = em.createNativeQuery(buildQuery(query, QUERY_COUNT)).setParameter(1, status);

            return ((Number) q.getSingleResult()).intValue();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private List<CommandeDTO> getOrders(String search, Set<String> status, int start, int limit) {
        return getListOrder(search, status, start, limit).stream().map(this::buildFromTuple)
                .collect(Collectors.toList());
    }

    private CommandeDTO buildFromTuple(Tuple t) {

        CommandeDTO commande = new CommandeDTO();
        commande.setMobile(t.get("mobile", String.class));
        commande.setTelephone(t.get("telephone", String.class));
        commande.setLgGROSSISTEID(t.get("grossisteId", String.class));
        commande.setLgORDERID(t.get("orderId", String.class));
        commande.setLibelleGrossiste(t.get("libelleGrossiste", String.class));
        commande.setUrlPharma(t.get("urlPharma", String.class));
        commande.setUrlExtranet(t.get("urlExtranet", String.class));
        commande.setUserFullName(t.get("userName", String.class).charAt(0) + "." + t.get("userLastName", String.class));
        commande.setDtCREATED(t.get("dateCreation", String.class));
        commande.setDtUPDATED(t.get("heureCreation", String.class));
        commande.setStrSTATUT(t.get("status", String.class));
        commande.setStrRefOrder(t.get("refernceOrder", String.class));
        commande.setNbreLigne(t.get("itemCount", BigInteger.class).intValue());
        commande.setTotalQty(t.get("productCount", BigDecimal.class).intValue());
        commande.setMontantAchat(t.get("montantAchat", BigDecimal.class).intValue());
        commande.setMontantVente(t.get("montantVente", BigDecimal.class).intValue());
        commande.setStatutTraitement(getCommandStatut(commande.getLgORDERID()));

        return commande;
    }

    private TOrderDetail createMergeOrderDetail(TOrder order, TOrderDetail tod, TGrossiste grossiste,
            KeyUtilGen keyUtilGen) {
        TFamille famille = tod.getLgFAMILLEID();

        TOrderDetail orderDetail = new TOrderDetail();
        orderDetail.setLgORDERDETAILID(keyUtilGen.getComplexId());
        orderDetail.setLgORDERID(order);
        orderDetail.setIntNUMBER(tod.getIntNUMBER());
        orderDetail.setIntQTEREPGROSSISTE(orderDetail.getIntNUMBER());
        orderDetail.setIntQTEMANQUANT(orderDetail.getIntNUMBER());
        orderDetail.setIntPAFDETAIL(tod.getIntPAFDETAIL());
        orderDetail.setIntPRICEDETAIL(tod.getIntPRICEDETAIL());
        orderDetail.setIntPRICE(orderDetail.getIntNUMBER() * orderDetail.getIntPAFDETAIL());
        orderDetail.setLgFAMILLEID(famille);
        orderDetail.setLgGROSSISTEID(grossiste);
        orderDetail.setStrSTATUT(Constant.STATUT_IS_PROGRESS);
        orderDetail.setDtCREATED(order.getDtCREATED());
        orderDetail.setDtUPDATED(order.getDtCREATED());
        em.persist(orderDetail);
        return orderDetail;
    }

    @Override
    public void mergeOrder(CommandeIdsDTO commandeIds) {
        String[] orderIds = commandeIds.getOrderId();
        String firstId = orderIds[0];
        TOrder order = this.em.find(TOrder.class, firstId);
        TGrossiste grossiste = order.getLgGROSSISTEID();
        Collection<TOrderDetail> tOrderDetailCollection = order.getTOrderDetailCollection();

        KeyUtilGen keyUtilGen = new KeyUtilGen();
        for (String id : orderIds) {
            if (!firstId.equals(id)) {
                TOrder order0 = this.em.find(TOrder.class, id);
                for (TOrderDetail tOrderDetail : order0.getTOrderDetailCollection()) {
                    TFamille famille = tOrderDetail.getLgFAMILLEID();
                    boolean isExist = false;
                    for (TOrderDetail o : tOrderDetailCollection) {
                        if (famille.getLgFAMILLEID().equals(o.getLgFAMILLEID().getLgFAMILLEID())) {
                            o.setIntNUMBER(o.getIntNUMBER() + tOrderDetail.getIntNUMBER());
                            this.em.merge(o);

                            isExist = true;
                            break;
                        }
                    }
                    if (!isExist) {
                        TOrderDetail orderDetail = createMergeOrderDetail(order, tOrderDetail, grossiste, keyUtilGen);
                        tOrderDetailCollection.add(orderDetail);

                    }
                }
                this.em.remove(order0);
                order.setDtUPDATED(new Date());
                this.em.merge(order);

            }
        }
    }

    @Override
    public void changeGrossiste(String idCommande, String grossisteId) {
        try {
            TOrder order = em.find(TOrder.class, idCommande);
            TGrossiste grossiste = em.find(TGrossiste.class, grossisteId);
            order.setLgGROSSISTEID(grossiste);
            updateOrderItemGrossiste(grossiste, order);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }

    }

    // Les details ne devraient pas avoir de relation avec le grossiste, juste pour faire ISO avec l'existant
    private void updateOrderItemGrossiste(TGrossiste grossiste, TOrder order) {
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaUpdate<TOrderDetail> cq = cb.createCriteriaUpdate(TOrderDetail.class);
            Root<TOrderDetail> root = cq.from(TOrderDetail.class);
            cq.set(root.get(TOrderDetail_.lgGROSSISTEID), grossiste);
            cq.where(cb.equal(root.get(TOrderDetail_.lgORDERID), order));
            em.createQuery(cq).executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    @Override
    public JSONObject getListBons(String statut, String search, int start, int limit, String dtStart, String dtEnd) {
        JSONObject json = new JSONObject();
        int count = getListBonsCount(statut, search, dtStart, dtEnd);

        json.put("total", count);
        return json.put("data", buildListBons(statut, search, start, limit, dtStart, dtEnd));

    }

    private List<Predicate> getListBonsPredicats(CriteriaBuilder cb, Root<TBonLivraison> root, String statut,
            String search, String dtStart, String dtEnd) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get(TBonLivraison_.strSTATUT), statut));
        if (StringUtils.isNotEmpty(search)) {
            predicates.add(cb.or(cb.like(root.get(TBonLivraison_.strREFLIVRAISON), search + "%")));
        }
        if (StringUtils.isNotEmpty(dtStart) && StringUtils.isNotEmpty(dtEnd)) {
            predicates.add(cb.between(cb.function("DATE", Date.class, root.get(TBonLivraison_.dtUPDATED)),
                    java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd)));
        }

        return predicates;
    }

    private int getListBonsCount(String statut, String search, String dtStart, String dtEnd) {
        try {

            CriteriaBuilder cb = getEmg().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TBonLivraison> root = cq.from(TBonLivraison.class);
            cq.select(cb.count(root));
            List<Predicate> predicates = getListBonsPredicats(cb, root, statut, search, dtStart, dtEnd);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<Long> q = getEmg().createQuery(cq);

            return q.getSingleResult().intValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private List<TBonLivraison> fetchListBons(String statut, int start, int limit, String search, String dtStart,
            String dtEnd) {
        try {

            CriteriaBuilder cb = getEmg().getCriteriaBuilder();
            CriteriaQuery<TBonLivraison> cq = cb.createQuery(TBonLivraison.class);
            Root<TBonLivraison> root = cq.from(TBonLivraison.class);

            cq.select(root).orderBy(cb.desc(root.get(TBonLivraison_.dtUPDATED)));
            List<Predicate> predicates = getListBonsPredicats(cb, root, statut, search, dtStart, dtEnd);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TBonLivraison> q = getEmg().createQuery(cq);
            if (limit != 0) {

                q.setFirstResult(start);
                q.setMaxResults(limit);
            }

            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return List.of();
        }
    }

    private boolean checkDatePeremption() {
        try {
            TParameters p = getEmg().find(TParameters.class, Constant.KEY_ACTIVATE_PEREMPTION_DATE);
            return p.getStrVALUE().trim().equals("1");
        } catch (Exception e) {
            return false;
        }

    }

    private JSONArray buildListBons(String statut, String search, int start, int limit, String dtStart, String dtEnd) {
        try {
            JSONArray array = new JSONArray();
            List<TBonLivraison> datats = fetchListBons(statut, start, limit, search, dtStart, dtEnd);

            for (TBonLivraison bonLivraison : datats) {
                JSONObject json = new JSONObject();
                json.put("directImport", bonLivraison.getDirectImport());
                json.put("lg_BON_LIVRAISON_ID", bonLivraison.getLgBONLIVRAISONID());
                json.put("str_REF_LIVRAISON", bonLivraison.getStrREFLIVRAISON());

                json.put("lg_USER_ID", bonLivraison.getLgUSERID().getStrFIRSTNAME() + " "
                        + bonLivraison.getLgUSERID().getStrLASTNAME());
                json.put("str_REF_ORDER", bonLivraison.getLgORDERID().getStrREFORDER());
                json.put("lg_GROSSISTE_ID", bonLivraison.getLgORDERID().getLgGROSSISTEID().getLgGROSSISTEID());
                json.put("str_GROSSISTE_LIBELLE", bonLivraison.getLgORDERID().getLgGROSSISTEID().getStrLIBELLE());

                json.put("int_MHT", bonLivraison.getIntMHT());
                json.put("int_TVA", bonLivraison.getIntTVA());
                json.put("int_HTTC", bonLivraison.getIntHTTC());
                int totalQte = 0;
                int prixAchat = 0;
                int count = 0;
                for (TBonLivraisonDetail it : bonLivraison.getTBonLivraisonDetailCollection()) {
                    totalQte += it.getIntQTECMDE();
                    prixAchat += (it.getIntPAF() * it.getIntQTECMDE());
                    count++;
                }
                json.put("int_NBRE_LIGNE_BL_DETAIL", count);
                json.put("int_NBRE_PRODUIT", totalQte);

                json.put("PRIX_ACHAT_TOTAL", prixAchat);
                json.put("DISPLAYFILTER", !checkDatePeremption());

                json.put("str_STATUT", bonLivraison.getStrSTATUT());
                json.put("dt_DATE_LIVRAISON", DateUtil.convertDateToDD_MM_YYYY(bonLivraison.getDtDATELIVRAISON()));
                json.put("dt_CREATED", DateUtil.convertDateToDD_MM_YYYY(bonLivraison.getDtCREATED()));
                json.put("dt_CREATED", DateUtil.convertDateToDD_MM_YYYY(bonLivraison.getDtUPDATED()));
                json.put("statutTraitement", getBonStatut(bonLivraison.getLgBONLIVRAISONID()));
                array.put(json);
            }
            return array;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONArray();
        }
    }

    @Override
    public void deleteBonLivraison(String id) {
        TBonLivraison bonLivraison = getEmg().find(TBonLivraison.class, id);
        bonLivraison.getTBonLivraisonDetailCollection().forEach(getEmg()::remove);
        deleteLots(bonLivraison.getStrREFLIVRAISON());
        TOrder order = bonLivraison.getLgORDERID();
        order.getTOrderDetailCollection().forEach(d -> {

            d.setStrSTATUT(Constant.STATUT_IS_PROGRESS);
            getEmg().merge(d);
        });
        order.setStrSTATUT(Constant.STATUT_IS_PROGRESS);
        getEmg().remove(bonLivraison);
        getEmg().merge(order);
    }

    private void deleteLots(String blRef) {

        try {
            List<TLot> lot = getEmg().createQuery("SELECT o FROM  TLot o WHERE o.strREFLIVRAISON=?1")
                    .setParameter(1, blRef).getResultList();
            lot.forEach(getEmg()::remove);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }

    }

    @Override
    public JSONObject getListBonsDetails(String bonId, String search, int start, int limit,
            EntreeStockDetailFiltre filtre, Boolean checkDatePeremption, String sort, String dir) {
        JSONObject json = new JSONObject();
        int count = getListBonsDetailsCount(bonId, search, filtre, checkDatePeremption, sort, dir);

        json.put("total", count);
        return json.put("data", buildListBonsDetails(
                fetchListBonsDetails(bonId, search, start, limit, filtre, checkDatePeremption, sort, dir)));
    }

    private int getListBonsDetailsCount(String bonId, String search, EntreeStockDetailFiltre filtre,
            Boolean checkDatePeremption, String sort, String dir) {
        boolean checkDate = Objects.requireNonNullElse(checkDatePeremption, false);
        String searchQuery = " AND (t.lgFAMILLEID.intCIP LIKE '%s' OR t.lgFAMILLEID.intEAN13 LIKE '%s' OR t.lgFAMILLEID.strDESCRIPTION LIKE '%s') ";
        String searchQueryFinal = StringUtils.isNotEmpty(search)
                ? String.format(searchQuery, search + "%", search + "%", search + "%") : "";

        try {
            String query = "SELECT COUNT(t) FROM TBonLivraisonDetail t WHERE t.lgBONLIVRAISONID.lgBONLIVRAISONID = ?1 %s ";
            if (filtre == EntreeStockDetailFiltre.PRIX) {
                String prix = checkDate ? "  AND t.lgFAMILLEID.boolCHECKEXPIRATIONDATE=TRUE  " : "";
                query = "SELECT COUNT(t) FROM TBonLivraisonDetail t WHERE  t.lgBONLIVRAISONID.lgBONLIVRAISONID = ?1 %s AND t.intQTERECUE = 0 AND t.intPRIXVENTE <> t.lgFAMILLEID.intPRICE "
                        + prix;

            }

            return ((Number) getEmg().createQuery(String.format(query, searchQueryFinal)).setParameter(1, bonId)
                    .getSingleResult()).intValue();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private List<TBonLivraisonDetail> fetchListBonsDetails(String bonId, String search, int start, int limit,
            EntreeStockDetailFiltre filtre, Boolean checkDatePeremption, String sort, String dir) {
        try {
            boolean checkDate = Objects.requireNonNullElse(checkDatePeremption, false);

            String searchQuery = " AND (t.lgFAMILLEID.intCIP LIKE '%s' OR t.lgFAMILLEID.intEAN13 LIKE '%s' OR t.lgFAMILLEID.strDESCRIPTION LIKE '%s') ";
            String searchQueryFinal = StringUtils.isNotEmpty(search)
                    ? String.format(searchQuery, search + "%", search + "%", search + "%") : "";

            // Base SANS ORDER BY en dur
            String base = "SELECT t FROM TBonLivraisonDetail t WHERE t.lgBONLIVRAISONID.lgBONLIVRAISONID = ?1 %s";

            // Filtre PRIX (toujours sans ORDER BY en dur)
            if (filtre == EntreeStockDetailFiltre.PRIX) {
                String prix = checkDate ? " AND t.lgFAMILLEID.boolCHECKEXPIRATIONDATE=TRUE " : " ";
                base = "SELECT t FROM TBonLivraisonDetail t WHERE t.lgBONLIVRAISONID.lgBONLIVRAISONID = ?1 %s"
                        + " AND t.intQTERECUE = 0 AND t.intPRIXVENTE <> t.lgFAMILLEID.intPRICE" + prix;
            }

            // champs triables
            String sortField;
            if ("lg_FAMILLE_NAME".equalsIgnoreCase(sort)) {
                sortField = "t.lgFAMILLEID.strNAME";
            } else if ("lg_FAMILLE_CIP".equalsIgnoreCase(sort)) {
                sortField = "t.lgFAMILLEID.intCIP";
            } else if ("int_PAF".equalsIgnoreCase(sort)) {
                sortField = "t.intPAF";
            } else if ("int_PRIX_VENTE".equalsIgnoreCase(sort)) {
                sortField = "t.intPRIXVENTE";
            } else if ("dbl_PRIX_MOYEN_PONDERE".equalsIgnoreCase(sort)) {
                sortField = "t.lgFAMILLEID.dblPRIXMOYENPONDERE";
            } else if ("int_QTE_CMDE".equalsIgnoreCase(sort)) {
                sortField = "t.intQTECMDE";
            } else {
                sortField = "t.dtUPDATED"; // fallback si sort inconnu/absent
            }

            String direction = "DESC".equalsIgnoreCase(dir) ? "DESC" : "ASC";
            String orderBy = " ORDER BY " + sortField + " " + direction;

            String jpql = String.format(base, searchQueryFinal) + orderBy;

            return getEmg().createQuery(jpql, TBonLivraisonDetail.class).setParameter(1, bonId).setFirstResult(start)
                    .setMaxResults(limit).getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return List.of();
        }

    }

    private List<TLot> getLot(String idProduit, String bonRef) {
        try {
            TypedQuery<TLot> query = em.createNamedQuery("TLot.findByProduitAndBonRef", TLot.class);
            query.setParameter("lgFAMILLEID", idProduit);
            query.setParameter("strREFLIVRAISON", bonRef);
            return query.getResultList();
        } catch (Exception e) {
            return List.of();
        }
    }

    private String getPeremption(List<TLot> lots) {
        return String.join(" | ", lots.stream().filter(lot -> Objects.nonNull(lot.getDtPEREMPTION())).map(l -> {
            return DateCommonUtils.format(l.getDtPEREMPTION());
        }).distinct().collect(Collectors.toList()));
    }

    private String getLot(List<TLot> lots) {
        return String.join(" | ", lots.stream().filter(lot -> StringUtils.isNoneEmpty(lot.getIntNUMLOT())).map(l -> {
            return l.getIntNUMLOT();
        }).distinct().collect(Collectors.toList()));
    }

    private int getLotQty(List<TLot> lots) {
        return lots.stream().mapToInt(TLot::getIntNUMBER).sum();
    }

    private JSONArray buildListBonsDetails(List<TBonLivraisonDetail> bonLivraisonDetails) {
        try {
            JSONArray array = new JSONArray();
            TBonLivraison bonLivraison = bonLivraisonDetails.get(0).getLgBONLIVRAISONID();
            String grossiste = bonLivraison.getLgORDERID().getLgGROSSISTEID().getLgGROSSISTEID();
            boolean checkDatePeremption = checkDatePeremption();
            for (TBonLivraisonDetail bonLivraisonDetail : bonLivraisonDetails) {
                TFamille famille = bonLivraisonDetail.getLgFAMILLEID();
                List<TLot> lots = getLot(famille.getLgFAMILLEID(), bonLivraison.getStrREFLIVRAISON());
                JSONObject json = new JSONObject();

                TFamilleGrossiste oTFamilleGrossiste = findFamilleGrossiste(famille.getLgFAMILLEID(), grossiste);
                String datePeremption = getPeremption(lots);
                json.put("lg_BON_LIVRAISON_DETAIL", bonLivraisonDetail.getLgBONLIVRAISONDETAIL());
                json.put("int_QTE_CMDE", bonLivraisonDetail.getIntQTECMDE());
                json.put("datePeremption", datePeremption);
                json.put("lots", getLot(lots));
                json.put("quantiteSaisie", getLotQty(lots));

                json.put("int_QTE_RECUE_REEL", (bonLivraisonDetail.getIntQTERECUE() > 0
                        ? bonLivraisonDetail.getIntQTERECUE() - bonLivraisonDetail.getIntQTEUG() : "-"));
                json.put("int_QTE_RECUE_BIS", (bonLivraisonDetail.getIntQTERECUE() > 0
                        ? bonLivraisonDetail.getIntQTERECUE() - bonLivraisonDetail.getIntQTEUG() : -1));
                json.put("str_LIVRAISON_ADP", bonLivraisonDetail.getStrLIVRAISONADP());
                json.put("str_MANQUE_FORCES", bonLivraisonDetail.getStrMANQUEFORCES());
                json.put("str_ETAT_ARTICLE", bonLivraisonDetail.getStrETATARTICLE());
                json.put("int_PRIX_REFERENCE", bonLivraisonDetail.getIntPRIXREFERENCE());
                json.put("int_PRIX_VENTE", bonLivraisonDetail.getIntPRIXVENTE());

                json.put("int_PAF", bonLivraisonDetail.getIntPAF());
                json.put("int_PA_REEL", bonLivraisonDetail.getIntPAREEL());
                json.put("lg_FAMILLE_PRIX_ACHAT", bonLivraisonDetail.getIntQTEUG());

                json.put("lg_FAMILLE_ID", famille.getLgFAMILLEID());
                json.put("lg_FAMILLE_NAME", famille.getStrNAME());

                json.put("lg_FAMILLE_CIP",
                        (oTFamilleGrossiste != null ? oTFamilleGrossiste.getStrCODEARTICLE() : famille.getIntCIP()));

                json.put("str_REF_LIVRAISON", bonLivraison.getStrREFLIVRAISON());

                json.put("int_SEUIL", famille.getIntSEUILMIN());
                json.put("hasLots", isExistLot(bonLivraison.getStrREFLIVRAISON(), famille.getLgFAMILLEID()));
                json.put("existLots", hasExistLot(bonLivraison.getStrREFLIVRAISON(), famille.getLgFAMILLEID()));
                json.put("freeQty", bonLivraisonDetail.getIntQTEUG());
                json.put("Stock_Init", bonLivraisonDetail.getIntINITSTOCK());
                // dbl_PRIX_MOYEN_PONDERE
                json.put("dbl_PRIX_MOYEN_PONDERE", (bonLivraisonDetail.getLgFAMILLEID().getDblPRIXMOYENPONDERE() != null
                        ? bonLivraisonDetail.getLgFAMILLEID().getDblPRIXMOYENPONDERE() : 0));

                try {

                    TFamille oTFamille = bonLivraisonDetail.getLgFAMILLEID();

                    TFamilleStock oTFamilleStock = getTProductItemStock(oTFamille.getLgFAMILLEID());

                    int qteStock = oTFamilleStock.getIntNUMBERAVAILABLE();
                    json.put("lg_FAMILLE_QTE_STOCK", qteStock);
                    json.put("prixDiff", bonLivraisonDetail.getIntPRIXVENTE().compareTo(oTFamille.getIntPRICE()) != 0);

                } catch (Exception E) {

                }

                try {
                    json.put("lg_ZONE_GEO_ID", bonLivraisonDetail.getLgZONEGEOID().getLgZONEGEOID());
                    json.put("lg_ZONE_GEO_NAME", bonLivraisonDetail.getLgZONEGEOID().getStrLIBELLEE());
                } catch (Exception e) {

                }
                try {
                    json.put("lg_GROSSISTE_ID", bonLivraisonDetail.getLgGROSSISTEID().getStrLIBELLE());
                } catch (Exception e) {
                }

                try {
                    json.put("lg_BON_LIVRAISON_ID", bonLivraisonDetail.getLgBONLIVRAISONID().getStrREFLIVRAISON());
                    json.put("str_REF_ORDER", bonLivraisonDetail.getLgBONLIVRAISONID().getLgORDERID().getStrREFORDER());

                    json.put("str_STATUT", bonLivraisonDetail.getStrSTATUT());

                } catch (Exception e) {
                }

                json.put("lg_FAMILLE_CIP", (oTFamilleGrossiste != null ? oTFamilleGrossiste.getStrCODEARTICLE()
                        : bonLivraisonDetail.getLgFAMILLEID().getIntCIP()));
                json.put("int_NUMBERDETAIL", bonLivraisonDetail.getLgFAMILLEID().getIntNUMBERDETAIL());
                json.put("bool_DECONDITIONNE", bonLivraisonDetail.getLgFAMILLEID().getBoolDECONDITIONNE());
                json.put("bool_DECONDITIONNE_EXIST", bonLivraisonDetail.getLgFAMILLEID().getBoolDECONDITIONNEEXIST());

                boolean checkExpirationdate = Objects.requireNonNullElse(famille.getBoolCHECKEXPIRATIONDATE(), false)
                        && checkDatePeremption;

                json.put("checkExpirationdate", checkExpirationdate);
                json.put("DISPLAYFILTER", checkExpirationdate);
                json.put("int_QTE_RECUE", getQteRecu(checkExpirationdate, bonLivraisonDetail));
                if (checkExpirationdate) {
                    json.put("int_QTE_RECUE", bonLivraisonDetail.getIntQTECMDE());
                }
                json.put("int_QTE_MANQUANT", Math.max(getQteManquante(bonLivraisonDetail), 0));
                json.put("checked", bonLivraisonDetail.isChecked());
                json.put("checkedQuantity", bonLivraisonDetail.getCheckedQuantity());
                array.put(json);
            }
            return array;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONArray();
        }
    }

    private int getQteManquante(TBonLivraisonDetail bonLivraisonDetail) {

        return Objects.requireNonNullElse(bonLivraisonDetail.getIntQTECMDE(), 0)
                - Objects.requireNonNullElse(bonLivraisonDetail.getIntQTERECUE(), 0);

    }

    private int getQteRecu(boolean checkExpirationdate, TBonLivraisonDetail bonLivraisonDetail) {
        if (checkExpirationdate) {
            return Objects.requireNonNullElse(bonLivraisonDetail.getIntQTERECUE(), 0)
                    - Objects.requireNonNullElse(bonLivraisonDetail.getIntQTEUG(), 0);
        }
        return Objects.requireNonNullElse(bonLivraisonDetail.getIntQTECMDE(), 0);
    }

    private boolean hasExistLot(String bonNum, String produitId) {
        try {
            Query q = this.em.createNativeQuery(
                    "SELECT COUNT(o.lg_LOT_ID)>0 FROM t_lot o WHERE o.str_REF_LIVRAISON =?1 AND o.lg_FAMILLE_ID=?2 AND (o.int_NUM_LOT IS NOT NULL AND o.int_NUM_LOT <>'') ");
            q.setParameter(1, bonNum);
            q.setParameter(2, produitId);
            return ((Integer) q.getSingleResult()) > 0;
        } catch (Exception e) {

            return false;
        }
    }

    private boolean isExistLot(String bonNum, String produitId) {
        try {
            Query q = this.em.createNativeQuery(
                    "SELECT COUNT(o.lg_LOT_ID)>0 FROM t_lot o WHERE o.str_REF_LIVRAISON =?1 AND o.lg_FAMILLE_ID=?2");
            q.setParameter(1, bonNum);
            q.setParameter(2, produitId);
            return ((Integer) q.getSingleResult()) > 0;
        } catch (Exception e) {

            return false;
        }
    }

    private void addWarehouse(TUser user, TFamille oTFamille, TLot lot, TGrossiste oGrossiste, TEtiquette etiquette) {

        TWarehouse warehouse = new TWarehouse();
        warehouse.setLgWAREHOUSEID(UUID.randomUUID().toString());
        warehouse.setLgUSERID(user);
        warehouse.setLgFAMILLEID(oTFamille);
        warehouse.setIntNUMBER(lot.getIntNUMBER());
        warehouse.setDtPEREMPTION(lot.getDtPEREMPTION());
        warehouse.setDtSORTIEUSINE(lot.getDtSORTIEUSINE());
        warehouse.setStrREFLIVRAISON(lot.getStrREFLIVRAISON());
        warehouse.setLgGROSSISTEID(oGrossiste);
        warehouse.setStrREFORDER(lot.getStrREFORDER());
        warehouse.setDtCREATED(new Date());
        warehouse.setDtUPDATED(warehouse.getDtCREATED());
        warehouse.setIntNUMLOT(lot.getIntNUMLOT());
        warehouse.setIntNUMBERGRATUIT(lot.getIntNUMBERGRATUIT());
        warehouse.setStrSTATUT(Constant.STATUT_ENABLE);
        warehouse.setLgTYPEETIQUETTEID(etiquette.getLgTYPEETIQUETTEID());
        warehouse.setStrCODEETIQUETTE(etiquette.getStrCODE());
        this.getEmg().persist(warehouse);

    }

    @Override
    public void removeLot(DeleteLot deleteLot) {
        TBonLivraisonDetail bonLivraisonDetail = getEmg().find(TBonLivraisonDetail.class, deleteLot.getIdBonDetail());

        int freeQty = 0;
        List<TLot> lots;
        if (deleteLot.isRemoveLot()) {
            lots = getLotByIdProduitAndNumLot(deleteLot);
        } else {
            lots = getLotByIdProduitAndRefBon(deleteLot);
        }

        for (TLot lot : lots) {

            freeQty += lot.getIntNUMBERGRATUIT();
            getEmg().remove(lot);
        }
        getWSByIdProduitAndRefBon(deleteLot).forEach(this.getEmg()::remove);
        bonLivraisonDetail.setIntQTERECUE(bonLivraisonDetail.getIntQTERECUE() - freeQty);

        bonLivraisonDetail.setIntQTEUG(bonLivraisonDetail.getIntQTEUG() - freeQty);
        bonLivraisonDetail.setDtUPDATED(new Date());
        getEmg().merge(bonLivraisonDetail);
    }

    private List<TLot> getLotByIdProduitAndRefBon(DeleteLot deleteLot) {
        TypedQuery<TLot> typedQuery = getEmg().createQuery(
                "SELECT o FROM TLot o WHERE o.strREFLIVRAISON=?1 AND o.lgFAMILLEID.lgFAMILLEID=?2", TLot.class);
        typedQuery.setParameter(1, deleteLot.getRefBon());
        typedQuery.setParameter(2, deleteLot.getIdProduit());
        return typedQuery.getResultList();
    }

    private List<TLot> getLotByIdProduitAndNumLot(DeleteLot deleteLot) {
        TypedQuery<TLot> typedQuery = getEmg()
                .createQuery("SELECT o FROM TLot o WHERE o.intNUMLOT =?1 AND o.lgFAMILLEID.lgFAMILLEID=?2", TLot.class);
        typedQuery.setParameter(1, deleteLot.getNumLot());
        typedQuery.setParameter(2, deleteLot.getIdProduit());
        return typedQuery.getResultList();
    }

    private List<TWarehouse> getWSByIdProduitAndRefBon(DeleteLot deleteLot) {
        TypedQuery<TWarehouse> typedQuery = getEmg().createQuery(
                "SELECT o FROM TWarehouse o WHERE o.strREFLIVRAISON =?1 AND o.lgFAMILLEID.lgFAMILLEID=?2",
                TWarehouse.class);
        typedQuery.setParameter(1, deleteLot.getNumLot());
        typedQuery.setParameter(2, deleteLot.getIdProduit());
        return typedQuery.getResultList();
    }

    private TParameters getParamettre(String key) {
        try {
            return getEmg().find(TParameters.class, key);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public JSONObject addLot(AddLot lot) {
        TUser tUser = this.sessionHelperService.getCurrentUser();
        TBonLivraisonDetail bonLivraisonDetail = getEmg().find(TBonLivraisonDetail.class, lot.getIdBonDetail());
        TBonLivraison bonLivraison = bonLivraisonDetail.getLgBONLIVRAISONID();

        if (!lot.isDirectImport()) {
            return addNewLot(lot, bonLivraisonDetail, tUser, bonLivraison, false);
        } else {
            Optional<TLot> enOptionl = getLotByProduitIdAndBon(bonLivraisonDetail.getLgFAMILLEID().getLgFAMILLEID(),
                    bonLivraison.getStrREFLIVRAISON());
            if (enOptionl.isPresent()) {
                addFreeQty(enOptionl.get(), lot, bonLivraisonDetail, bonLivraison.getStrREFLIVRAISON());
            } else {
                return addNewLot(lot, bonLivraisonDetail, tUser, bonLivraison, false);
            }

        }

        return new JSONObject().put("success", true);
    }

    private JSONObject addNewLot(AddLot lot, TBonLivraisonDetail bonLivraisonDetai, TUser tUser,
            TBonLivraison bonLivraison, boolean isFreeQty) {

        TFamille famille = bonLivraisonDetai.getLgFAMILLEID();
        TOrder order = bonLivraison.getLgORDERID();
        TGrossiste grossiste = order.getLgGROSSISTEID();
        int qty = getQtyLot(famille.getLgFAMILLEID(), bonLivraison.getStrREFLIVRAISON(), grossiste.getLgGROSSISTEID())
                + lot.getQty();
        if (bonLivraisonDetai.getIntQTECMDE() < qty && !isFreeQty) {
            return new JSONObject().put("msg", "La quantité réçue est supérieure à la quantité commantée.")
                    .put("success", false);

        }
        TTypeetiquette tTypeetiquette = getEmg().find(TTypeetiquette.class, Constant.DEFAUL_TYPEETIQUETTE);

        TLot oTLot = new TLot();
        oTLot.setLgTYPEETIQUETTEID(tTypeetiquette);

        oTLot.setLgLOTID(new KeyUtilGen().getComplexId());
        oTLot.setLgUSERID(tUser);
        oTLot.setStrSTATUT(Constant.STATUT_ENABLE);
        oTLot.setLgFAMILLEID(famille);
        oTLot.setIntNUMBER(lot.getQty() + lot.getFreeQty());
        if (isFreeQty) {
            oTLot.setIntNUMBER(bonLivraisonDetai.getIntQTERECUE() + lot.getFreeQty());
        }
        if (StringUtils.isNotEmpty(lot.getDatePeremption())) {
            Date dtPEREMPTION = java.sql.Date.valueOf(lot.getDatePeremption());
            oTLot.setDtPEREMPTION(dtPEREMPTION);
            LocalDate tonow = LocalDate.now();
            LocalDate dtpremption = LocalDate.parse(lot.getDatePeremption());
            if (dtpremption.isBefore(tonow) || dtpremption.isEqual(tonow)) {
                oTLot.setStrSTATUT(Constant.STATUT_PERIME);
            } else {
                TParameters parameters = getParamettre(Constant.KEY_MONTH_PERIME);
                int nbr = 0;
                if (parameters != null) {
                    nbr = Integer.parseInt(parameters.getStrVALUE());
                }
                LocalDate peremption = tonow.plusMonths(nbr);
                if (dtpremption.isBefore(peremption) || dtpremption.isEqual(peremption)) {
                    oTLot.setStrSTATUT(Constant.STATUT_ENCOURS_PEREMPTION);
                }

            }

        }
        if (StringUtils.isNotEmpty(lot.getDateUsine())) {
            LocalDate dtSORTIEUSINE = LocalDate.parse(lot.getDateUsine());
            oTLot.setDtSORTIEUSINE(java.sql.Date.valueOf(dtSORTIEUSINE));
        }
        oTLot.setStrREFLIVRAISON(bonLivraison.getStrREFLIVRAISON());
        oTLot.setLgGROSSISTEID(grossiste);
        oTLot.setDtCREATED(new Date());
        oTLot.setDtUPDATED(oTLot.getDtCREATED());
        oTLot.setStrREFORDER(order.getStrREFORDER());
        oTLot.setIntNUMLOT(lot.getNumLot());
        oTLot.setIntNUMBERGRATUIT(lot.getFreeQty());
        oTLot.setIntQTYVENDUE(0);
        getEmg().persist(oTLot);
        updateTBonLivraisonDetailFromBonLivraison(bonLivraisonDetai, lot.getFreeQty(), lot.getFreeQty());
        addWarehouse(bonLivraisonDetai, oTLot, lot);
        return new JSONObject().put("success", true);
    }

    private void addFreeQty(TLot entityLot, AddLot lot, TBonLivraisonDetail bonLivraisonDetail, String bonNum) {

        String famille = bonLivraisonDetail.getLgFAMILLEID().getLgFAMILLEID();

        if (StringUtils.isNotEmpty(lot.getNumLot())) {
            entityLot.setIntNUMLOT(lot.getNumLot());
        }
        entityLot.setIntNUMBER((Objects.requireNonNullElse(entityLot.getIntNUMBER(), 0)
                - Objects.requireNonNullElse(entityLot.getIntNUMBERGRATUIT(), 0)) + lot.getFreeQty());
        entityLot.setIntNUMBERGRATUIT(lot.getFreeQty());
        entityLot.setDtUPDATED(new Date());
        if (StringUtils.isNoneBlank(lot.getDatePeremption())) {
            Date dtPEREMPTION = java.sql.Date.valueOf(lot.getDatePeremption());
            entityLot.setDtPEREMPTION(dtPEREMPTION);
        }

        bonLivraisonDetail.setIntQTERECUE(
                (bonLivraisonDetail.getIntQTERECUE() - bonLivraisonDetail.getIntQTEUG()) + lot.getFreeQty());
        bonLivraisonDetail.setIntQTEUG(lot.getFreeQty());
        bonLivraisonDetail.setDtUPDATED(new Date());
        getEmg().merge(bonLivraisonDetail);
        getEmg().merge(entityLot);
        TWarehouse tWarehouse = getOneByProduitIdAndBon(famille, bonNum);
        tWarehouse.setIntNUMBERGRATUIT(lot.getFreeQty());
        tWarehouse.setIntNUMBER(bonLivraisonDetail.getIntQTERECUE());
        tWarehouse.setDtUPDATED(new Date());
        getEmg().merge(tWarehouse);

    }

    private void updateTBonLivraisonDetailFromBonLivraison(TBonLivraisonDetail bonLivraisonDetai, int qteLivree,
            int freeQty) {

        bonLivraisonDetai.setIntQTERECUE(bonLivraisonDetai.getIntQTERECUE() + qteLivree);
        bonLivraisonDetai.setIntQTEMANQUANT(bonLivraisonDetai.getIntQTEMANQUANT() - (qteLivree - freeQty));
        bonLivraisonDetai.setIntQTEUG(bonLivraisonDetai.getIntQTEUG() + freeQty);
        bonLivraisonDetai.setDtUPDATED(new Date());
        getEmg().merge(bonLivraisonDetai);

    }

    private int getQtyLot(String idProduit, String refBon, String grossisteId) {
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TLot> root = cq.from(TLot.class);
            Join<TLot, TFamille> or = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate criteria = cb.conjunction();
            criteria = cb.and(criteria, cb.equal(or.get(TFamille_.lgFAMILLEID), idProduit));
            criteria = cb.and(criteria, cb.equal(root.get(TLot_.strREFLIVRAISON), refBon));
            criteria = cb.and(criteria,
                    cb.equal(root.get(TLot_.lgGROSSISTEID).get(TGrossiste_.lgGROSSISTEID), grossisteId));
            cq.select(cb.sumAsLong(root.get(TLot_.intNUMBER)));
            cq.where(criteria);
            Query q = em.createQuery(cq);
            return ((Long) q.getSingleResult()).intValue();

        } catch (Exception e) {
            return 0;
        }
    }

    private Optional<TLot> getLotByProduitIdAndBon(String produitId, String bonNum) {
        try {
            TypedQuery<TLot> q = em.createQuery(
                    "SELECT o FROM TLot o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.strREFLIVRAISON=?2", TLot.class);
            q.setParameter(1, produitId);
            q.setParameter(2, bonNum);
            q.setMaxResults(1);
            return Optional.ofNullable(q.getSingleResult());
        } catch (Exception e) {
            return Optional.empty();
        }

    }

    private TWarehouse getOneByProduitIdAndBon(String produitId, String bonNum) {
        TypedQuery<TWarehouse> q = em.createQuery(
                "SELECT o FROM TWarehouse o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.strREFLIVRAISON=?2",
                TWarehouse.class);
        q.setParameter(1, produitId);
        q.setParameter(2, bonNum);
        q.setMaxResults(1);
        return q.getSingleResult();
    }

    private void addWarehouse(TBonLivraisonDetail bonLivraisonDetail, TLot lot, AddLot lotDto) {

        Date now = new Date();
        TWarehouse oTWarehouse = new TWarehouse();
        oTWarehouse.setLgWAREHOUSEID(new KeyUtilGen().getComplexId());
        oTWarehouse.setLgUSERID(lot.getLgUSERID());
        oTWarehouse.setLgFAMILLEID(lot.getLgFAMILLEID());
        oTWarehouse.setIntNUMBER(bonLivraisonDetail.getIntQTERECUE());
        oTWarehouse.setDtPEREMPTION(lot.getDtPEREMPTION());
        oTWarehouse.setDtSORTIEUSINE(lot.getDtSORTIEUSINE());
        oTWarehouse.setStrREFLIVRAISON(lot.getStrREFLIVRAISON());
        oTWarehouse.setLgGROSSISTEID(lot.getLgGROSSISTEID());
        oTWarehouse.setStrREFORDER(lot.getStrREFORDER());
        oTWarehouse.setDtCREATED(now);
        oTWarehouse.setDtUPDATED(now);
        oTWarehouse.setIntNUMLOT(lot.getIntNUMLOT());
        oTWarehouse.setIntNUMBERGRATUIT(lotDto.getFreeQty());
        oTWarehouse.setStrSTATUT(Constant.STATUT_ENABLE);
        oTWarehouse.setLgTYPEETIQUETTEID(lot.getLgTYPEETIQUETTEID());
        TEtiquette oTEtiquette = createEtiquetteBis(bonLivraisonDetail, oTWarehouse,
                String.valueOf(oTWarehouse.getIntNUMBER()));
        oTWarehouse.setStrCODEETIQUETTE(oTEtiquette.getStrCODE());
        em.persist(oTWarehouse);

    }

    public TEtiquette createEtiquette(TWarehouse oTWarehouse, String code, String etiqueteName, String qty) {

        TEtiquette oTEtiquette = new TEtiquette();
        oTEtiquette.setLgETIQUETTEID(new KeyUtilGen().getComplexId());
        oTEtiquette.setStrCODE(code);
        oTEtiquette.setStrNAME(etiqueteName);
        oTEtiquette.setDtPEROMPTION(oTWarehouse.getDtPEREMPTION());
        oTEtiquette.setLgFAMILLEID(oTWarehouse.getLgFAMILLEID());
        oTEtiquette.setStrSTATUT(Constant.STATUT_ENABLE);
        oTEtiquette.setDtCREATED(new Date());
        oTEtiquette.setIntNUMBER(qty);
        oTEtiquette.setLgTYPEETIQUETTEID(oTWarehouse.getLgTYPEETIQUETTEID());
        oTEtiquette.setLgEMPLACEMENTID(this.sessionHelperService.getCurrentUser().getLgEMPLACEMENTID());
        em.persist(oTEtiquette);

        return oTEtiquette;
    }

    public TEtiquette createEtiquetteBis(TBonLivraisonDetail bonLivraisonDetail, TWarehouse warehouse, String qty) {

        String result;
        TFamille famille = warehouse.getLgFAMILLEID();

        String typeEtiquetteName = warehouse.getLgTYPEETIQUETTEID().getStrNAME();
        if (typeEtiquetteName.equalsIgnoreCase("CIP")) {
            result = famille.getIntCIP();
        } else if (typeEtiquetteName.equalsIgnoreCase("CIP_PRIX")) {
            result = new KeyUtilGen().getShortId(4) + "-" + famille.getIntCIP() + "-"
                    + bonLivraisonDetail.getIntPRIXVENTE();
        } else if (typeEtiquetteName.equalsIgnoreCase("CIP_DESIGNATION")) {
            result = new KeyUtilGen().getShortId(4) + "-" + famille.getIntCIP() + "-" + famille.getStrNAME();
        } else if (typeEtiquetteName.equalsIgnoreCase("CIP_PRIX_DESIGNATION")) {
            result = new KeyUtilGen().getShortId(4) + "-" + famille.getIntCIP() + "-"
                    + bonLivraisonDetail.getIntPRIXVENTE() + "-" + famille.getStrNAME();
        } else if (typeEtiquetteName.equalsIgnoreCase("POSITION")) {
            result = new KeyUtilGen().getShortId(4) + "-" + famille.getLgZONEGEOID().getStrLIBELLEE();
        } else {
            result = new KeyUtilGen().getShortId(4) + "-" + famille.getIntCIP() + "-"
                    + bonLivraisonDetail.getIntPRIXVENTE() + "-" + famille.getStrNAME();
        }
        return createEtiquette(warehouse, result, typeEtiquetteName, qty);

    }

    private List<Predicate> getListBonsDetailsByPredictes(CriteriaBuilder cb, Root<TBonLivraisonDetail> root,
            String produitId, String search, String dtStart, String dtEnd, String grossisteId) {

        List<Predicate> predicate = new ArrayList<>();
        predicate.add(cb.equal(root.get(TBonLivraisonDetail_.lgFAMILLEID).get(TFamille_.lgFAMILLEID), produitId));
        predicate.add(cb.equal(root.get(TBonLivraisonDetail_.lgBONLIVRAISONID).get(TBonLivraison_.strSTATUT),
                Constant.STATUT_IS_CLOSED));
        if (StringUtils.isNotEmpty(grossisteId)) {
            predicate.add(
                    cb.equal(root.get(TBonLivraisonDetail_.lgGROSSISTEID).get(TGrossiste_.lgGROSSISTEID), grossisteId));
        }
        if (StringUtils.isNotEmpty(search)) {
            predicate.add(cb.like(root.get(TBonLivraisonDetail_.lgBONLIVRAISONID).get(TBonLivraison_.strREFLIVRAISON),
                    search + "%"));
        }
        if (StringUtils.isEmpty(dtStart)) {
            dtStart = LocalDate.now().toString();
        }
        if (StringUtils.isEmpty(dtEnd)) {
            dtEnd = LocalDate.now().toString();
        }

        predicate.add(cb.between(
                cb.function("DATE", Date.class,
                        root.get(TBonLivraisonDetail_.lgBONLIVRAISONID).get(TBonLivraison_.dtUPDATED)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd)));
        return predicate;
    }

    private long getListBonsDetailsByProduitsCount(String produitId, String search, String dtStart, String dtEnd,
            String grossisteId) {
        try {

            CriteriaBuilder cb = getEmg().getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TBonLivraisonDetail> root = cq.from(TBonLivraisonDetail.class);
            cq.select(cb.count(root));
            List<Predicate> predicates = getListBonsDetailsByPredictes(cb, root, produitId, search, dtStart, dtEnd,
                    grossisteId);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<Long> q = getEmg().createQuery(cq);

            return q.getSingleResult().intValue();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    private List<TBonLivraisonDetail> getListBonsDetailsByProduits(String produitId, String search, String dtStart,
            String dtEnd, String grossisteId) {
        try {

            CriteriaBuilder cb = getEmg().getCriteriaBuilder();
            CriteriaQuery<TBonLivraisonDetail> cq = cb.createQuery(TBonLivraisonDetail.class);
            Root<TBonLivraisonDetail> root = cq.from(TBonLivraisonDetail.class);
            cq.select(root);
            List<Predicate> predicates = getListBonsDetailsByPredictes(cb, root, produitId, search, dtStart, dtEnd,
                    grossisteId);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TBonLivraisonDetail> q = getEmg().createQuery(cq);

            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return List.of();
        }
    }

    private JSONArray buildBonsDetailsByProduits(List<TBonLivraisonDetail> bonLivraisonDetails) {
        JSONArray array = new JSONArray();
        bonLivraisonDetails.forEach(t -> {

            JSONObject json = new JSONObject();

            json.put("dt_PEREMPTION", DateUtil.convertDateToDD_MM_YYYY(t.getLgBONLIVRAISONID().getDtDATELIVRAISON()));
            json.put("int_NUM_LOT", t.getLgBONLIVRAISONID().getStrREFLIVRAISON());
            json.put("lg_GROSSISTE_ID", t.getLgGROSSISTEID().getStrLIBELLE());
            json.put("int_NUMBER", t.getIntQTECMDE());
            json.put("lg_FAMILLE_ID", t.getLgFAMILLEID().getLgFAMILLEID());
            json.put("str_NAME", t.getLgFAMILLEID().getStrDESCRIPTION());
            json.put("lg_ZONE_GEO_ID", t.getLgFAMILLEID().getLgZONEGEOID().getStrLIBELLEE());
            json.put("int_CIP", t.getLgFAMILLEID().getIntCIP());
            json.put("int_STOCK_REAPROVISONEMENT", t.getIntQTERECUE());
            json.put("int_VALUE1", t.getIntQTEUG());
            json.put("int_VALUE2", NumberUtils.formatIntToString(t.getIntPAF()));
            json.put("dt_ENTREE", DateUtil.convertDateToDD_MM_YYYY_HH_mm(t.getLgBONLIVRAISONID().getDtUPDATED()));
            array.put(json);
        });
        return array;

    }

    @Override
    public JSONObject getListBonsDetailsByProduits(String produitId, String search, String dtStart, String dtEnd,
            int start, int limit, String grossisteId) {
        long total = getListBonsDetailsByProduitsCount(produitId, search, dtStart, dtEnd, grossisteId);
        return new JSONObject().put("total", total).put("data", buildBonsDetailsByProduits(
                getListBonsDetailsByProduits(produitId, search, dtStart, dtEnd, grossisteId)));
    }

    @Override
    public JSONObject addFreeQty(AddLot lot) {
        if (lot.getFreeQty() < 0) {
            return new JSONObject().put("success", false);
        }
        TUser tUser = this.sessionHelperService.getCurrentUser();
        TBonLivraisonDetail bonLivraisonDetail = getEmg().find(TBonLivraisonDetail.class, lot.getIdBonDetail());
        TBonLivraison bonLivraison = bonLivraisonDetail.getLgBONLIVRAISONID();
        Optional<TLot> enOptionl = getLotByProduitIdAndBon(bonLivraisonDetail.getLgFAMILLEID().getLgFAMILLEID(),
                bonLivraison.getStrREFLIVRAISON());
        if (enOptionl.isPresent()) {
            addFreeQty(enOptionl.get(), lot, bonLivraisonDetail, bonLivraison.getStrREFLIVRAISON());
        } else {
            return addNewLot(lot, bonLivraisonDetail, tUser, bonLivraison, true);
        }
        return new JSONObject().put("success", true);
    }

    @Override
    public List<TBonLivraisonDetail> getBonItems(String bonId) {
        TypedQuery<TBonLivraisonDetail> q = em.createQuery(
                "SELECT o FROM  TBonLivraisonDetail o where o.lgBONLIVRAISONID.lgBONLIVRAISONID=?1",
                TBonLivraisonDetail.class);
        q.setParameter(1, bonId);
        return q.getResultList();
    }

    @Override
    public void addCheckedQuantity(AddCheckedQuantity addCheckedQuantity) {
        TOrderDetail orderDetail = getEmg().find(TOrderDetail.class, addCheckedQuantity.getId());
        orderDetail.setChecked(true);
        orderDetail.setCheckedQuantity(addCheckedQuantity.getCheckedQuantity());
        getEmg().merge(orderDetail);

    }

    @Override
    public void addBonItemCheckedQuantity(AddCheckedQuantity addCheckedQuantity) {
        TBonLivraisonDetail bonLivraisonDetail = getEmg().find(TBonLivraisonDetail.class, addCheckedQuantity.getId());
        bonLivraisonDetail.setChecked(true);
        bonLivraisonDetail.setCheckedQuantity(addCheckedQuantity.getCheckedQuantity());
        getEmg().merge(bonLivraisonDetail);

    }

    private StatutTraitement getCommandStatut(String id) {
        Query q = getEmg().createNativeQuery(
                "SELECT SUM(CASE WHEN d.checked THEN 1 ELSE 0 END) AS checkedCount,SUM(CASE WHEN d.checked IS FALSE THEN 1 ELSE 0 END) AS uncheckedCount FROM t_order_detail d WHERE  d.lg_ORDER_ID=?1");
        q.setParameter(1, id);

        Object[] result = (Object[]) q.getSingleResult();

        return getStatutTraitement(result);
    }

    private StatutTraitement getBonStatut(String id) {

        Query q = getEmg().createNativeQuery(
                "SELECT SUM(CASE WHEN d.checked THEN 1 ELSE 0 END) AS checkedCount,SUM(CASE WHEN d.checked IS FALSE THEN 1 ELSE 0 END) AS uncheckedCount FROM t_bon_livraison_detail d WHERE d.lg_BON_LIVRAISON_ID=?1");
        q.setParameter(1, id);
        Object[] result = (Object[]) q.getSingleResult();

        return getStatutTraitement(result);
    }

    private StatutTraitement getStatutTraitement(Object[] result) {
        int checkedCount = ((Number) result[0]).intValue();
        int uncheckedCount = ((Number) result[1]).intValue();
        if (uncheckedCount == 0) {
            return StatutTraitement.TERMINE;
        }
        if (checkedCount == 0) {
            return StatutTraitement.A_FAIRE;
        }
        return StatutTraitement.EN_COURS;
    }
}
