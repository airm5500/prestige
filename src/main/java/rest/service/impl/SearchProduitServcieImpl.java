package rest.service.impl;

import dal.TBonLivraison;
import dal.TBonLivraisonDetail;
import dal.TBonLivraison_;
import dal.TDci_;
import dal.TEmplacement_;
import dal.TFamille;
import dal.TFamilleDci;
import dal.TFamilleDci_;
import dal.TFamilleGrossiste;
import dal.TFamilleGrossiste_;
import dal.TFamilleStock;
import dal.TFamilleStock_;
import dal.TFamille_;
import dal.TInventaire;
import dal.TInventaireFamille;
import dal.TInventaire_;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrement_;
import dal.TPrivilege;
import dal.TTypeStockFamille;
import dal.TUser;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
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
import org.json.JSONObject;
import rest.service.ProductStateService;
import rest.service.SearchProduitServcie;
import toolkits.utils.date;
import util.Constant;
import util.DateConverter;
import util.DateUtil;

/**
 *
 * @author koben
 */
@Stateless
public class SearchProduitServcieImpl implements SearchProduitServcie {

    private static final Logger LOG = Logger.getLogger(SearchProduitServcieImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private ProductStateService productStateService;

    @Override
    public JSONObject fetchProduits(List<TPrivilege> usersPrivileges, TUser user, String produitId, String search,
            String diciId, String type, int limit, int start) {
        boolean checkExpirationdate = checkDatePeremption();
        JSONObject data = new JSONObject();
        Object[] objs = getPrivilegeProductByUser(user.getLgUSERID());
        boolean canceledBtn = Constant.hasAuthorityByName(usersPrivileges, Constant.ACTION_DESACTIVE_PRODUIT);
        JSONArray arrayObj = new JSONArray();
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        if (StringUtils.isNotEmpty(produitId)) {
            TFamille famille = this.em.find(TFamille.class, produitId);
            arrayObj.put(buildProduitData(canceledBtn, famille, objs, user, empl, checkExpirationdate));
            data.put("total", 1);
        } else {
            getAll(false, search, diciId, empl, type, true, start, limit).forEach(
                    t -> arrayObj.put(buildProduitData(canceledBtn, t, objs, user, empl, checkExpirationdate)));
            data.put("total", getAllCount(search, diciId, empl, type, true));
        }
        data.put("results", arrayObj);
        return data;
    }

    @Override
    public JSONObject fetchOrderProduits(TUser user, String produitId, String search, int limit, int start) {
        JSONArray arrayObj = new JSONArray();
        JSONObject data = new JSONObject();
        String empl = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();
        if (StringUtils.isNotEmpty(produitId)) {
            TFamille famille = this.em.find(TFamille.class, produitId);
            arrayObj.put(buildProduitData(famille, empl));
            data.put("total", 1);
        } else {
            long count = getAllCount(search, null, empl, null, false);
            if (count == 0) {
                JSONObject jSONObject = new JSONObject();
                jSONObject.put("lg_FAMILLE_ID", "0");
                jSONObject.put("CIP", "0");
                jSONObject.put("int_CIP", 0);
                jSONObject.put("str_DESCRIPTION", "Ajouter un nouvel article");
                jSONObject.put("str_DESCRIPTION_PLUS", "Ajouter un nouvel article");
                arrayObj.put(jSONObject);
            } else {
                getAll(false, search, null, empl, null, false, start, limit)
                        .forEach(t -> arrayObj.put(buildProduitData(t, empl)));
            }

            data.put("total", count);
        }
        data.put("data", arrayObj);
        return data;
    }

    private boolean checkDatePeremption() {
        try {
            return Integer.parseInt(
                    em.getReference(TParameters.class, "KEY_ACTIVATE_PEREMPTION_DATE").getStrVALUE().trim()) == 1;
        } catch (Exception e) {
            return false;
        }
    }

    private List<Predicate> produitsPredicates(CriteriaBuilder cb, Join<TFamille, TFamilleStock> fs,
            Join<TFamille, TFamilleGrossiste> fg, Root<TFamille> root, String search, String diciId,
            String emplacementId, String type, boolean checkDeconditionne) {
        List<Predicate> predicates = new ArrayList<>();

        if (StringUtils.isNotEmpty(search)) {
            search = search + "%";
            predicates.add(cb.or(cb.like(root.get(TFamille_.intCIP), search),
                    cb.like(fg.get(TFamilleGrossiste_.strCODEARTICLE), search),
                    cb.like(root.get(TFamille_.intEAN13), search), cb.like(root.get(TFamille_.strNAME), search),
                    cb.like(root.get(TFamille_.lgFAMILLEID), search),
                    cb.like(root.get(TFamille_.strDESCRIPTION), search)));
        }
        predicates.add(cb.equal(root.get(TFamille_.strSTATUT), Constant.STATUT_ENABLE));
        predicates.add(
                cb.equal(fs.get(TFamilleStock_.lgEMPLACEMENTID).get(TEmplacement_.lgEMPLACEMENTID), emplacementId));
        predicates.add(cb.equal(root.get(TFamille_.strSTATUT), Constant.STATUT_ENABLE));
        if (!checkDeconditionne) {
            predicates.add(cb.equal(root.get(TFamille_.boolDECONDITIONNE), 0));
        }
        if (StringUtils.isNotEmpty(diciId)) {
            Join<TFamille, TFamilleDci> fd = root.join("tFamilleDciCollection", JoinType.INNER);
            predicates.add(cb.equal(fd.get(TFamilleDci_.lgDCIID).get(TDci_.lgDCIID), diciId));
        }

        if (StringUtils.isNotEmpty(type)) {
            switch (type) {
            case "DECONDITIONNE":
                predicates.add(cb.equal(root.get(TFamille_.boolDECONDITIONNE), Short.valueOf("1")));
                predicates.add(cb.equal(root.get(TFamille_.boolDECONDITIONNEEXIST), Short.valueOf("1")));
                break;
            case "DECONDITION":
                predicates.add(cb.equal(root.get(TFamille_.boolDECONDITIONNE), Short.valueOf("0")));
                predicates.add(cb.equal(root.get(TFamille_.boolDECONDITIONNEEXIST), Short.valueOf("1")));
                break;
            case "SANSEMPLACEMENT":
                predicates.add(cb.equal(root.get("lgZONEGEOID").get("lgZONEGEOID"), "1"));
                break;
            default:
                break;
            }
        }
        return predicates;
    }

    public Object[] getPrivilegeProductByUser(String userId) {
        try {
            return (Object[]) em.createNativeQuery("call proc_getprivilege_user_for_product(?)").setParameter(1, userId)
                    .getSingleResult();

        } catch (Exception e) {
            return null;
        }
    }

    private List<TFamille> getAll(boolean all, String search, String diciId, String emplacementId, String type,
            boolean checkDeconditionne, int start, int limit) {
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TFamille> cq = cb.createQuery(TFamille.class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TFamilleStock> fs = root.join("tFamilleStockCollection", JoinType.INNER);
            Join<TFamille, TFamilleGrossiste> fg = root.join("tFamilleGrossisteCollection", JoinType.INNER);
            cq.select(root).distinct(true);

            List<Predicate> predicates = produitsPredicates(cb, fs, fg, root, search, diciId, emplacementId, type,
                    checkDeconditionne);
            cq.where(cb.and(predicates.toArray(Predicate[]::new))).orderBy(cb.asc(root.get(TFamille_.strDESCRIPTION)));
            Query q = em.createQuery(cq);
            if (!all) {
                q.setFirstResult(start);
                q.setMaxResults(limit);
            }
            return q.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private long getAllCount(String search, String diciId, String emplacementId, String type,
            boolean checkDeconditionne) {
        try {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<TFamille> root = cq.from(TFamille.class);
            Join<TFamille, TFamilleStock> fs = root.join("tFamilleStockCollection", JoinType.INNER);
            Join<TFamille, TFamilleGrossiste> fg = root.join("tFamilleGrossisteCollection", JoinType.INNER);
            cq.select(cb.countDistinct(root));

            List<Predicate> predicates = produitsPredicates(cb, fs, fg, root, search, diciId, emplacementId, type,
                    checkDeconditionne);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            Query q = em.createQuery(cq);
            return ((Long) q.getSingleResult());

        } catch (Exception e) {

            LOG.log(Level.SEVERE, null, e);
            return 0l;
        }
    }

    private JSONObject buildProduitData(TFamille t, String empl) {
        JSONObject json = new JSONObject();
        int stock = getStock(t.getLgFAMILLEID(), empl);
        json.put("int_NUMBER", stock);
        json.put("lg_FAMILLE_ID", t.getLgFAMILLEID());
        json.put("int_NUMBER_AVAILABLE", stock);
        json.put("str_NAME", t.getStrNAME());
        json.put("STATUS", t.getIntORERSTATUS());
        json.put("str_DESCRIPTION", t.getStrDESCRIPTION());
        json.put("int_PRICE", t.getIntPRICE());
        json.put("int_EAN13", t.getIntEAN13());
        json.put("int_CIP", t.getIntCIP());
        json.put("CIP", t.getIntCIP());
        json.put("int_PAF", t.getIntPAF());
        json.put("int_PAT", t.getIntPAT());
        json.put("lg_ZONE_GEO_ID", (t.getLgZONEGEOID() != null ? t.getLgZONEGEOID().getStrLIBELLEE() : ""));
        return json;
    }

    private JSONObject buildProduitData(boolean canceledAction, TFamille t, Object[] objArray, TUser user, String empl,
            boolean checkExpirationdate) {
        JSONObject json = new JSONObject();
        try {

            json.put("ACTION_DESACTIVE_PRODUIT", canceledAction);
            json.put("BTNDELETE", Boolean.valueOf(objArray[1].toString()));
            json.put("P_BT_UPDATE", Boolean.valueOf(objArray[2].toString()));
            json.put("P_UPDATE_PAF", Boolean.valueOf(objArray[3].toString()));
            json.put("P_UPDATE_PRIXVENTE", Boolean.valueOf(objArray[4].toString()));
            json.put("P_UPDATE_CODETABLEAU", Boolean.valueOf(objArray[5].toString()));
            json.put("P_UPDATE_CODEREMISE", Boolean.valueOf(objArray[6].toString()));
            json.put("P_UPDATE_CIP", Boolean.valueOf(objArray[7].toString()));
            json.put("P_UPDATE_DESIGNATION", Boolean.valueOf(objArray[8].toString()));
            json.put("lg_FAMILLE_ID", t.getLgFAMILLEID());
            json.put("scheduled", t.isScheduled());
            json.put("cmu_price", 0);

            try {
                json.put("gammeId", t.getGamme().getId());
            } catch (Exception e) {
            }
            try {
                json.put("laboratoireId", t.getLaboratoire().getId());
            } catch (Exception e) {
            }
            json.put("dt_Peremtion",
                    (t.getDtPEREMPTION() != null ? date.formatterShort.format(t.getDtPEREMPTION()) : ""));
            json.put("dtPEREMPTION", (t.getDtPEREMPTION() != null ? date.formatterMysqlShort.format(t.getDtPEREMPTION())
                    : LocalDate.now().toString()));
            json.put("lg_FAMILLEARTICLE_ID", t.getLgFAMILLEARTICLEID().getStrLIBELLE());
            json.put("str_NAME", t.getStrNAME());
            json.put("STATUS", t.getIntORERSTATUS());
            json.put("str_DESCRIPTION", t.getStrDESCRIPTION());
            json.put("int_PRICE", t.getIntPRICE());
            json.put("lg_GROSSISTE_ID", t.getLgGROSSISTEID().getStrLIBELLE());
            json.put("int_CIP", t.getIntCIP());
            json.put("int_PAF", t.getIntPAF());
            json.put("int_PAT", t.getIntPAT());
            json.put("int_QTE_REAPPROVISIONNEMENT",
                    (t.getIntQTEREAPPROVISIONNEMENT() != null ? t.getIntQTEREAPPROVISIONNEMENT() : 0));
            json.put("int_STOCK_REAPROVISONEMENT", (t.getIntSEUILMIN() != null ? t.getIntSEUILMIN() : 0));
            json.put("int_EAN13", t.getIntEAN13());
            json.put("int_S", t.getIntS());
            json.put("int_T", t.getIntT());
            json.put("int_SEUIL_MIN", (t.getIntSEUILMIN() != null ? t.getIntSEUILMIN() : 0));
            json.put("lg_ZONE_GEO_ID",
                    (t.getLgZONEGEOID().getStrLIBELLEE() != null ? t.getLgZONEGEOID().getStrLIBELLEE() : ""));
            if (t.getBoolDECONDITIONNE() == 0 && t.getBoolDECONDITIONNEEXIST() == 1) {
                TFamilleStock oFamilleStock = getDecondionneParent(t.getLgFAMILLEID());
                if (oFamilleStock != null) {
                    json.put("lg_FAMILLE_DECONDITION_ID", oFamilleStock.getLgFAMILLEID().getLgFAMILLEID());
                    json.put("str_DESCRIPTION_DECONDITION", oFamilleStock.getLgFAMILLEID().getStrDESCRIPTION());
                    json.put("int_NUMBER_AVAILABLE_DECONDITION", oFamilleStock.getIntNUMBERAVAILABLE());
                }
            }
            json.put("int_NUMBERDETAIL", t.getIntNUMBERDETAIL());

            json.put("int_PRICE_TIPS", t.getIntPRICETIPS());
            json.put("int_TAUX_MARQUE", t.getIntTAUXMARQUE());
            try {
                json.put("lg_TYPEETIQUETTE_ID", t.getLgTYPEETIQUETTEID().getStrDESCRIPTION());
            } catch (Exception e) {
            }
            try {
                json.put("lg_CODE_ACTE_ID", t.getLgCODEACTEID().getStrLIBELLEE());
            } catch (Exception e) {
            }
            try {
                json.put("lg_CODE_GESTION_ID", t.getLgCODEGESTIONID().getStrCODEBAREME());
            } catch (Exception e) {
            }
            try {
                json.put("lg_FABRIQUANT_ID", t.getLgFABRIQUANTID().getStrNAME());
            } catch (Exception e) {

            }
            try {
                json.put("lg_INDICATEUR_REAPPROVISIONNEMENT_ID",
                        t.getLgINDICATEURREAPPROVISIONNEMENTID().getStrLIBELLEINDICATEUR());
            } catch (Exception e) {

            }
            json.put("str_CODE_TAUX_REMBOURSEMENT", t.getStrCODETAUXREMBOURSEMENT());

            try {
                json.put("str_CODE_REMISE", t.getStrCODEREMISE());
                json.put("lg_REMISE_ID", t.getLgREMISEID().getStrNAME());
            } catch (Exception e) {

            }

            json.put("bool_DECONDITIONNE", t.getBoolDECONDITIONNE());
            json.put("bool_DECONDITIONNE_EXIST", t.getBoolDECONDITIONNEEXIST());

            try {
                json.put("lg_CODE_TVA_ID", t.getLgCODETVAID().getStrNAME());
            } catch (Exception e) {

            }

            int stock = getStock(t.getLgFAMILLEID(), empl);
            json.put("int_NUMBER", stock);
            json.put("int_NUMBER_AVAILABLE", stock);
            json.put("str_STATUT", t.getStrSTATUT());

            json.put("bool_RESERVE", t.getBoolRESERVE());

            if (t.getBoolRESERVE() && "1".equals(empl)) {
                json.put("int_SEUIL_RESERVE", t.getIntSEUILRESERVE());
                TTypeStockFamille tTypeStockFamille = getTTypeStockFamilleByTypestock(t.getLgFAMILLEID(), empl);
                json.put("int_STOCK_RESERVE", tTypeStockFamille.getIntNUMBER());
            }

            json.put("dt_CREATED", DateUtil.convertDateToDD_MM_YYYY_HH_mm(t.getDtCREATED()));
            json.put("dt_UPDATED", DateUtil.convertDateToDD_MM_YYYY_HH_mm(t.getDtUPDATED()));

            json.put("lg_EMPLACEMENT_ID", empl);
            if (checkExpirationdate) {
                json.put("checkExpirationdate", t.getBoolCHECKEXPIRATIONDATE());
            } else {
                json.put("checkExpirationdate", false);
            }
            try {

                json.put("dt_LAST_INVENTAIRE", dateDerniereInventare(t.getLgFAMILLEID(), user));
            } catch (Exception e) {
                LOG.log(Level.SEVERE, null, e);
            }

            try {

                String dateVente = dateDerniereVente(t.getLgFAMILLEID(), user);

                json.put("dt_LAST_VENTE", dateVente);

            } catch (Exception e) {
                LOG.log(Level.SEVERE, null, e);
            }

            try {

                String dateEntree = dateEntree(t.getLgFAMILLEID());

                json.put("dt_LAST_ENTREE", dateEntree);

            } catch (Exception e) {
                LOG.log(Level.SEVERE, null, e);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }

        TBonLivraison bonLivraison = findByFamille(t);

        if (bonLivraison != null) {
            json.put("dt_DATE_LIVRAISON", DateConverter.convertDateToDD_MM_YYYY(bonLivraison.getDtDATELIVRAISON()));
        }

        json.put("produitState", new JSONObject(productStateService.getEtatProduit(t.getLgFAMILLEID())));

        return json;
    }

    public TFamilleStock getDecondionneParent(String produitId) {

        try {

            return em.createQuery("SELECT t FROM TFamilleStock t WHERE t.lgFAMILLEID.lgFAMILLEPARENTID = ?1 ",
                    TFamilleStock.class).setMaxResults(1).setParameter(1, produitId).getSingleResult();

        } catch (Exception e) {
            return null;
        }

    }

    private TBonLivraison findByFamille(TFamille famille) {
        try {
            TypedQuery<TBonLivraison> q = em.createQuery(
                    "SELECT o.lgBONLIVRAISONID FROM TBonLivraisonDetail o where o.lgFAMILLEID=?1 AND o.lgBONLIVRAISONID.strSTATUT='is_Closed' ORDER BY o.lgBONLIVRAISONID.dtDATELIVRAISON DESC  ",
                    TBonLivraison.class);
            q.setMaxResults(1);
            q.setParameter(1, famille);
            return q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.INFO, "TBonLivraison not found");
            return null;
        }
    }

    public Integer getStock(String lgFAMILLEID, String lgEMPLACEMENT) {
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TFamilleStock> root = cq.from(TFamilleStock.class);
            cq.select(root.get(TFamilleStock_.intNUMBERAVAILABLE));
            cq.where(cb.and(cb.equal(root.get("lgFAMILLEID").get("lgFAMILLEID"), lgFAMILLEID)),
                    cb.equal(root.get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"), lgEMPLACEMENT));
            Query q = em.createQuery(cq);
            q.setMaxResults(1);
            return (Integer) q.getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
        return null;
    }

    private String dateEntree(String lgFAMILLEID) {
        String date = "";
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<String> cq = cb.createQuery(String.class);

            Root<TBonLivraisonDetail> root = cq.from(TBonLivraisonDetail.class);
            Join<TBonLivraisonDetail, TBonLivraison> j = root.join("lgBONLIVRAISONID", JoinType.INNER);
            Join<TBonLivraisonDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);

            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(j.get(TBonLivraison_.strSTATUT), Constant.STATUT_IS_CLOSED));
            predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lgFAMILLEID));
            cq.select(cb.function("DATE_FORMAT", String.class, j.get(TBonLivraison_.dtUPDATED),
                    cb.literal("%d/%m/%Y %H:%i"))).orderBy(cb.desc(j.get(TBonLivraison_.dtUPDATED)));

            cq.where(predicate);
            Query q = em.createQuery(cq);
            q.setFirstResult(0);
            q.setMaxResults(1);
            date = (String) q.getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();

        }
        return date;
    }

    public String dateDerniereVente(String lgFAMILLEID, TUser user) {
        String date = "";
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<String> cq = cb.createQuery(String.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> jp = root.join("lgPREENREGISTREMENTID", JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    user.getLgEMPLACEMENTID().getLgEMPLACEMENTID()));
            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.equal(jp.get(TPreenregistrement_.strSTATUT), "is_Closed"));
            Predicate ge = cb.greaterThan(jp.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate, ge);
            predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lgFAMILLEID));
            cq.select(cb.function("DATE_FORMAT", String.class, jp.get(TPreenregistrement_.dtUPDATED),
                    cb.literal("%d/%m/%Y %H:%i"))).orderBy(cb.desc(jp.get(TPreenregistrement_.dtUPDATED)));

            cq.where(predicate);
            Query q = em.createQuery(cq);

            q.setFirstResult(0);
            q.setMaxResults(1);
            date = (String) q.getSingleResult();

        } catch (Exception e) {
            // e.printStackTrace();
        }
        return date;
    }

    public String dateDerniereInventare(String lgFAMILLEID, TUser user) {
        String date = "";
        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<String> cq = cb.createQuery(String.class);
            Root<TInventaireFamille> root = cq.from(TInventaireFamille.class);
            Join<TInventaireFamille, TInventaire> jp = root.join("lgINVENTAIREID", JoinType.INNER);
            Join<TInventaireFamille, TFamille> jf = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate, cb.equal(jp.get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    user.getLgEMPLACEMENTID().getLgEMPLACEMENTID()));

            predicate = cb.and(predicate, cb.equal(jp.get(TInventaire_.strSTATUT), "is_Closed"));

            predicate = cb.and(predicate, cb.equal(jf.get(TFamille_.lgFAMILLEID), lgFAMILLEID));
            cq.select(cb.function("DATE_FORMAT", String.class, jp.get(TInventaire_.dtUPDATED),
                    cb.literal("%d/%m/%Y %H:%i"))).orderBy(cb.desc(jp.get(TInventaire_.dtUPDATED)));

            cq.where(predicate);
            Query q = em.createQuery(cq);

            q.setFirstResult(0);
            q.setMaxResults(1);
            date = (String) q.getSingleResult();

        } catch (Exception e) {
            LOG.info(e.getLocalizedMessage());
        }
        return date;
    }

    private TTypeStockFamille getTTypeStockFamilleByTypestock(String produitId, String empl) {

        try {

            return (TTypeStockFamille) em.createQuery(
                    "SELECT t FROM TTypeStockFamille t WHERE t.lgTYPESTOCKID.lgTYPESTOCKID = ?1 AND t.lgFAMILLEID.lgFAMILLEID = ?2 AND t.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?3")
                    .setParameter(1, "2").setParameter(2, produitId).setParameter(3, empl).setMaxResults(1)
                    .getSingleResult();

        } catch (Exception e) {
            return null;
        }

    }
}
