package rest.service.impl;

import dal.Caution;
import dal.TCompteClient;
import dal.TCompteClientTiersPayant;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TPreenregistrementCompteClientTiersPayent_;
import dal.TTiersPayant;
import dal.TTiersPayant_;
import dal.TTypeTiersPayant;
import dal.TTypeTiersPayant_;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;
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
import rest.service.TiersPayantService;
import util.Constant;
import util.DateUtil;

/**
 *
 * @author koben
 */
@Stateless
public class TiersPayantServiceImpl implements TiersPayantService {

    private static final Logger LOG = Logger.getLogger(TiersPayantServiceImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /**
     *
     * @param start
     * @param limit
     * @param search
     * @param typeTierspayant
     * @param btnDesactive
     * @param delete
     *
     * @return
     */
    @Override
    public JSONObject fetchList(int start, int limit, String search, String typeTierspayant, boolean btnDesactive,
            boolean delete) {
        JSONObject data = new JSONObject();
        List<TTiersPayant> list = showAllOrOneTierspayant(search, typeTierspayant, start, limit);
        int count = showAllOrOneTierspayant(search, typeTierspayant);
        data.put("total", count);
        JSONArray jsonarray = new JSONArray();

        for (TTiersPayant tTiersPayant : list) {
            JSONObject json = new JSONObject();
            TCompteClient compteClient = getTCompteClient(tTiersPayant.getLgTIERSPAYANTID());
            Caution c = tTiersPayant.getCaution();
            if (Objects.nonNull(c)) {
                json.put("caution", c.getMontant());
            }

            json.put("lg_TIERS_PAYANT_ID", tTiersPayant.getLgTIERSPAYANTID());
            // str_CODE_ORGANISME
            json.put("str_CODE_ORGANISME", tTiersPayant.getStrCODEORGANISME());
            // str_NAME
            json.put("str_NAME", tTiersPayant.getStrNAME());
            // str_FULLNAME
            json.put("str_FULLNAME", tTiersPayant.getStrFULLNAME());
            // str_ADRESSE
            json.put("str_ADRESSE", tTiersPayant.getStrADRESSE());
            // str_MOBILE
            json.put("str_MOBILE", tTiersPayant.getStrMOBILE());
            // str_TELEPHONE
            json.put("str_TELEPHONE", tTiersPayant.getStrTELEPHONE());
            // str_MAIL
            json.put("str_MAIL", tTiersPayant.getStrMAIL());
            // dbl_PLAFOND_CREDIT
            json.put("dbl_PLAFOND_CREDIT", tTiersPayant.getDblPLAFONDCREDIT());
            // dbl_TAUX_REMBOURSEMENT (à associer à la table TRembourcement
            json.put("dbl_TAUX_REMBOURSEMENT", tTiersPayant.getDblTAUXREMBOURSEMENT());
            // str_NUMERO_CAISSE_OFFICIEL
            json.put("str_NUMERO_CAISSE_OFFICIEL", tTiersPayant.getStrNUMEROCAISSEOFFICIEL());
            // str_CENTRE_PAYEUR
            json.put("str_CENTRE_PAYEUR", tTiersPayant.getStrCENTREPAYEUR());
            // str_CODE_REGROUPEMENT
            json.put("str_CODE_REGROUPEMENT", tTiersPayant.getStrCODEREGROUPEMENT());
            // dbl_SEUIL_MINIMUM
            json.put("dbl_SEUIL_MINIMUM", tTiersPayant.getDblSEUILMINIMUM());
            // bool_INTERDICTION
            json.put("bool_INTERDICTION", tTiersPayant.getBoolINTERDICTION());
            // str_CODE_COMPTABLE
            json.put("str_CODE_COMPTABLE", tTiersPayant.getStrCODECOMPTABLE());
            // bool_PRENUM_FACT_SUBROGATOIRE
            json.put("bool_PRENUM_FACT_SUBROGATOIRE", tTiersPayant.getBoolPRENUMFACTSUBROGATOIRE());
            // int_NUMERO_DECOMPTE
            json.put("int_NUMERO_DECOMPTE", tTiersPayant.getIntNUMERODECOMPTE());
            // str_CODE_PAIEMENT
            json.put("str_CODE_PAIEMENT", tTiersPayant.getStrCODEPAIEMENT());
            // dt_DELAI_PAIEMENT
            json.put("dt_DELAI_PAIEMENT", tTiersPayant.getDtDELAIPAIEMENT());
            // dbl_POURCENTAGE_REMISE
            json.put("dbl_POURCENTAGE_REMISE", tTiersPayant.getDblPOURCENTAGEREMISE());
            // dbl_REMISE_FORFETAIRE
            json.put("dbl_REMISE_FORFETAIRE", tTiersPayant.getDblREMISEFORFETAIRE());
            // str_CODE_EDIT_BORDEREAU
            json.put("str_CODE_EDIT_BORDEREAU", tTiersPayant.getLgMODELFACTUREID().getStrVALUE());
            // int_NBRE_EXEMPLAIRE_BORD
            json.put("int_NBRE_EXEMPLAIRE_BORD", tTiersPayant.getIntNBREEXEMPLAIREBORD());
            // int_PERIODICITE_EDIT_BORD
            json.put("int_PERIODICITE_EDIT_BORD", tTiersPayant.getIntPERIODICITEEDITBORD());
            // int_DATE_DERNIERE_EDITION
            json.put("int_DATE_DERNIERE_EDITION", tTiersPayant.getIntDATEDERNIEREEDITION());
            // str_NUMERO_IDF_ORGANISME
            json.put("str_NUMERO_IDF_ORGANISME", tTiersPayant.getStrNUMEROIDFORGANISME());
            // dbl_MONTANT_F_CLIENT
            json.put("dbl_MONTANT_F_CLIENT", tTiersPayant.getDblMONTANTFCLIENT());
            // dbl_BASE_REMISE
            json.put("dbl_BASE_REMISE", tTiersPayant.getDblBASEREMISE());
            // str_CODE_DOC_COMPTOIRE
            json.put("str_CODE_DOC_COMPTOIRE", tTiersPayant.getStrCODEDOCCOMPTOIRE());
            // bool_ENABLED
            json.put("bool_ENABLED", tTiersPayant.getBoolENABLED());
            json.put("str_COMPTE_CONTRIBUABLE", tTiersPayant.getStrCOMPTECONTRIBUABLE());
            json.put("lgGROUPEID",
                    (tTiersPayant.getLgGROUPEID() != null) ? tTiersPayant.getLgGROUPEID().getStrLIBELLE() : "");

            json.put("lg_CUSTOMER_ID", tTiersPayant.getLgTIERSPAYANTID());
            json.put("str_LIBELLE", tTiersPayant.getStrNAME());
            json.put("lg_VILLE_ID",
                    (tTiersPayant.getLgVILLEID() != null ? tTiersPayant.getLgVILLEID().getStrName() : ""));
            json.put("lg_TYPE_TIERS_PAYANT_ID", (tTiersPayant.getLgTYPETIERSPAYANTID() != null
                    ? tTiersPayant.getLgTYPETIERSPAYANTID().getStrLIBELLETYPETIERSPAYANT() : ""));
            json.put("lg_TYPE_CONTRAT_ID", (tTiersPayant.getLgTYPECONTRATID() != null
                    ? tTiersPayant.getLgTYPECONTRATID().getStrLIBELLETYPECONTRAT() : ""));
            json.put("lg_RISQUE_ID",
                    (tTiersPayant.getLgRISQUEID() != null ? tTiersPayant.getLgRISQUEID().getStrLIBELLERISQUE() : ""));
            json.put("lg_REGIMECAISSE_ID", (tTiersPayant.getLgREGIMECAISSEID() != null
                    ? tTiersPayant.getLgREGIMECAISSEID().getStrCODEREGIMECAISSE() : ""));
            json.put("str_CODE_OFFICINE",
                    tTiersPayant.getStrCODEOFFICINE() != null ? tTiersPayant.getStrCODEOFFICINE() : "");
            json.put("str_REGISTRE_COMMERCE",
                    tTiersPayant.getStrREGISTRECOMMERCE() != null ? tTiersPayant.getStrREGISTRECOMMERCE() : "");
            json.put("groupingByTaux", tTiersPayant.getGroupingByTaux());
            json.put("str_STATUT", tTiersPayant.getStrSTATUT());
            json.put("b_IsAbsolute", tTiersPayant.getBIsAbsolute());
            json.put("db_CONSOMMATION_MENSUELLE", getAccount(tTiersPayant.getLgTIERSPAYANTID()));
            json.put("dbl_PLAFOND_CREDIT", tTiersPayant.getDblPLAFONDCREDIT());
            json.put("nbrbons", (tTiersPayant.getIntNBREBONS() != null)
                    ? (tTiersPayant.getIntNBREBONS() > 0 ? tTiersPayant.getIntNBREBONS() : 0) : 0);
            json.put("montantFact", (tTiersPayant.getIntMONTANTFAC() != null)
                    ? (tTiersPayant.getIntMONTANTFAC() > 0 ? tTiersPayant.getIntMONTANTFAC() : 0) : 0);

            json.put("str_PHOTO", tTiersPayant.getStrPHOTO());

            json.put("dt_CREATED", DateUtil.convertDateToDD_MM_YYYY_HH_mm(tTiersPayant.getDtCREATED()));

            json.put("dt_UPDATED", DateUtil.convertDateToDD_MM_YYYY_HH_mm(tTiersPayant.getDtUPDATED()));

            if (tTiersPayant.getLgMODELFACTUREID() != null) {
                json.put("lg_MODEL_FACTURE_ID", tTiersPayant.getLgMODELFACTUREID().getStrVALUE());
            }
            if (compteClient != null) {

                json.put("dbl_CAUTION", compteClient.getDblCAUTION());
                json.put("dbl_PLAFOND", compteClient.getDblPLAFOND());
                json.put("dbl_QUOTA_CONSO_MENSUELLE", compteClient.getDblQUOTACONSOMENSUELLE());
            }

            List<TCompteClientTiersPayant> lstTCompteClientTiersPayant = getTiersPayantsByClient(
                    tTiersPayant.getLgTIERSPAYANTID());

            String strProduct = "";
            for (int k = 0; k < lstTCompteClientTiersPayant.size(); k++) {
                if (lstTCompteClientTiersPayant.get(k).getLgCOMPTECLIENTID().getLgCLIENTID() != null) {
                    strProduct = "<b><span style='display:inline-block;width: 15%;'>"
                            + (!lstTCompteClientTiersPayant.get(k).getStrNUMEROSECURITESOCIAL().equalsIgnoreCase("")
                                    ? lstTCompteClientTiersPayant.get(k).getStrNUMEROSECURITESOCIAL()
                                    : lstTCompteClientTiersPayant.get(k).getLgCOMPTECLIENTID().getLgCLIENTID()
                                            .getStrCODEINTERNE())
                            + "</span><span style='display:inline-block;width: 15%;'>"
                            + lstTCompteClientTiersPayant.get(k).getLgCOMPTECLIENTID().getLgCLIENTID().getStrFIRSTNAME()
                            + "</span><span style='display:inline-block;width: 25%;'>"
                            + lstTCompteClientTiersPayant.get(k).getLgCOMPTECLIENTID().getLgCLIENTID().getStrLASTNAME()
                            + "</span></b><br> " + strProduct;
                }
            }

            if (strProduct.equalsIgnoreCase("")) {
                strProduct = "Aucun client associé";
            }
            json.put("BTNDELETE", delete);
            json.put("P_BTN_DESACTIVER_TIERS_PAYANT", btnDesactive);
            json.put("int_NUMBER_CLIENT", lstTCompteClientTiersPayant.size());
            json.put("str_FAMILLE_ITEM", strProduct);
            jsonarray.put(json);

        }

        data.put("results", jsonarray);
        return data;
    }

    private int getAccount(String tp) {

        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
            Root<TPreenregistrementCompteClientTiersPayent> root = cq
                    .from(TPreenregistrementCompteClientTiersPayent.class);
            Join<TPreenregistrementCompteClientTiersPayent, TCompteClientTiersPayant> cmp = root
                    .join("lgCOMPTECLIENTTIERSPAYANTID", JoinType.INNER);
            Predicate criteria = cb.conjunction();
            criteria = cb.and(criteria, cb.equal(cmp.get("lgTIERSPAYANTID").get("lgTIERSPAYANTID"), tp));
            criteria = cb.and(criteria, cb.notEqual(
                    root.get(TPreenregistrementCompteClientTiersPayent_.strSTATUTFACTURE), Constant.STATUT_PAID));
            criteria = cb.and(criteria,
                    cb.equal(root.get("lgPREENREGISTREMENTID").get("strSTATUT"), Constant.STATUT_IS_CLOSED));
            criteria = cb.and(criteria, cb.equal(root.get("lgPREENREGISTREMENTID").get("bISCANCEL"), false));
            Predicate ge = cb.greaterThan(root.get("lgPREENREGISTREMENTID").get("intPRICE"), 0);
            cq.select(cb.sum(root.get(TPreenregistrementCompteClientTiersPayent_.intPRICERESTE)));
            cq.where(criteria, ge);
            Query q = em.createQuery(cq);
            var c = (Integer) q.getSingleResult();
            if (Objects.nonNull(c)) {
                return c;
            }
            return 0;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }

    }

    private List<TTiersPayant> showAllOrOneTierspayant(String searchValue, String typeTierspayant, int start,
            int limit) {
        List<TTiersPayant> list = new ArrayList<>();

        try {

            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TTiersPayant> cq = cb.createQuery(TTiersPayant.class);
            Root<TTiersPayant> root = cq.from(TTiersPayant.class);
            Join<TTiersPayant, TTypeTiersPayant> j = root.join("lgTYPETIERSPAYANTID", JoinType.INNER);

            cq.select(root).orderBy(cb.asc(j.get(TTypeTiersPayant_.strLIBELLETYPETIERSPAYANT)),
                    cb.asc(root.get(TTiersPayant_.strNAME)));
            List<Predicate> predicates = predicates(searchValue, typeTierspayant, cb, root, j);
            cq.where(cb.and(predicates.toArray(Predicate[]::new)));
            TypedQuery<TTiersPayant> q = em.createQuery(cq);

            q.setFirstResult(start);
            q.setMaxResults(limit);

            list = q.getResultList();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return list;
    }

    private int showAllOrOneTierspayant(String searchValue, String typeTierspayant) {

        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<TTiersPayant> root = cq.from(TTiersPayant.class);
        Join<TTiersPayant, TTypeTiersPayant> j = root.join("lgTYPETIERSPAYANTID", JoinType.INNER);
        cq.select(cb.count(root));
        List<Predicate> predicates = predicates(searchValue, typeTierspayant, cb, root, j);
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));

        Query q = em.createQuery(cq);
        return ((Long) q.getSingleResult()).intValue();

    }

    private TCompteClient getTCompteClient(String pkey) {
        TCompteClient compteClient = null;

        try {
            compteClient = em
                    .createQuery("SELECT t FROM TCompteClient t WHERE t.pKey = ?1 AND t.strSTATUT = ?2",
                            TCompteClient.class)
                    .setParameter(1, pkey).setParameter(2, Constant.STATUT_ENABLE).setMaxResults(1).getSingleResult();

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return compteClient;
    }

    private List<TCompteClientTiersPayant> getTiersPayantsByClient(String id) {
        List<TCompteClientTiersPayant> lstTCompteClientTiersPayant = new ArrayList<>();
        try {

            lstTCompteClientTiersPayant = em.createQuery(
                    "SELECT t FROM TCompteClientTiersPayant t WHERE  t.lgTIERSPAYANTID.lgTIERSPAYANTID = ?1   ORDER BY t.intPRIORITY ASC")
                    .setParameter(1, id).getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return lstTCompteClientTiersPayant;
    }

    private List<Predicate> predicates(String search, String typeTierspayant, CriteriaBuilder cb,
            Root<TTiersPayant> root, Join<TTiersPayant, TTypeTiersPayant> j) {
        List<Predicate> predicates = new ArrayList<>();

        predicates.add(cb.equal(root.get(TTiersPayant_.strSTATUT), Constant.STATUT_ENABLE));

        if (StringUtils.isNotEmpty(search)) {
            search = search + "%";
            predicates.add(cb.or(cb.like(j.get(TTypeTiersPayant_.strLIBELLETYPETIERSPAYANT), search),
                    cb.like(root.get(TTiersPayant_.strNAME), search),
                    cb.like(root.get(TTiersPayant_.strCODEORGANISME), search)));

        }
        if (StringUtils.isNotEmpty(typeTierspayant)) {
            predicates.add(cb.equal(j.get(TTypeTiersPayant_.lgTYPETIERSPAYANTID), typeTierspayant));
        }

        return predicates;
    }
}
