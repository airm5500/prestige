package bll.report;

import bll.common.Parameter;

import bll.entity.EntityData;
import bll.utils.TparameterManager;
import dal.TBonLivraisonDetail;
import dal.TClient;
import dal.TCodeTva;
import dal.TFamille;
import dal.TFamilleStock;
import dal.TFamillearticle;
import dal.TGroupeFamille;
import dal.TParameters;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TPreenregistrementDetail_;
import dal.TPreenregistrement_;
import dal.TUser;
import dal.dataManager;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Join;
import javax.persistence.criteria.JoinType;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import toolkits.utils.logger;

/**
 *
 * @author KKOFFI
 */
public class StatisticsFamilleArticle extends bll.bllBase {

    public StatisticsFamilleArticle() {
        this.checkDatamanager();
    }

    public StatisticsFamilleArticle(dataManager O) {
        this.setOdataManager(O);
        this.checkDatamanager();
    }

    public StatisticsFamilleArticle(dataManager O, TUser OTUser) {
        this.setOdataManager(O);
        this.setOTUser(OTUser);
        this.checkDatamanager();
    }

    public List<TPreenregistrementDetail> getUniteVendueData(String dt_start, String dt_end, String lg_ARTICLE_ID,
            String search_value) {
        List<TPreenregistrementDetail> listprePreenregistrements = new ArrayList<>();

        if (!"".equals(dt_start)) {
            Date dtstart = java.sql.Date.valueOf(dt_start);

            try {
                if (!"".equals(dt_end) && !dt_start.equals(dt_end)) {
                    // Date dtend = java.sql.Date.valueOf(dt_end);
                    Date dtend = date.formatterMysql.parse(dt_end);
                    listprePreenregistrements = this.getOdataManager().getEm().createQuery(
                            "SELECT o FROM  TPreenregistrementDetail o WHERE o.dtCREATED BETWEEN ?1 AND ?2  AND  o.lgPREENREGISTREMENTID.intPRICE >0 AND o.lgPREENREGISTREMENTID.strSTATUT =?3 AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE  AND o.lgFAMILLEID.lgFAMILLEID LIKE ?4  AND (o.lgFAMILLEID.strNAME LIKE ?5 OR o.lgFAMILLEID.intCIP LIKE ?5) AND o.lgPREENREGISTREMENTID.lgTYPEVENTEID.lgTYPEVENTEID NOT LIKE ?6 ORDER BY o.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID")
                            .setParameter(1, dtstart).setParameter(2, dtend)
                            .setParameter(3, commonparameter.statut_is_Closed)
                            .setParameter(4, "%" + lg_ARTICLE_ID + "%").setParameter(5, search_value + "%")
                            .setParameter(6, Parameter.VENTE_DEPOT_EXTENSION).getResultList();
                } else {

                    listprePreenregistrements = this.getOdataManager().getEm().createQuery(
                            "SELECT o FROM  TPreenregistrementDetail o WHERE o.dtCREATED >= ?1   AND o.lgPREENREGISTREMENTID.intPRICE >0 AND o.lgPREENREGISTREMENTID.strSTATUT =?2  AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE   AND o.lgFAMILLEID.lgFAMILLEID LIKE ?3 AND (o.lgFAMILLEID.strNAME LIKE ?4 OR o.lgFAMILLEID.intCIP LIKE ?4) AND o.lgPREENREGISTREMENTID.lgTYPEVENTEID.lgTYPEVENTEID NOT LIKE ?6 ORDER BY o.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID ")
                            .setParameter(1, dtstart).setParameter(2, commonparameter.statut_is_Closed)
                            .setParameter(3, "%" + lg_ARTICLE_ID + "%").setParameter(4, search_value + "%")
                            .setParameter(6, Parameter.VENTE_DEPOT_EXTENSION).getResultList();

                }

            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        return listprePreenregistrements;
    }

    // * fonction de formattage des donnees du tableau des unite vendues
    public List<EntityData> getFamillesUniteVendu(String dt_start, String dt_end, String lg_ARTICLE_ID,
            String search_value) {
        Set<TFamille> familles = new HashSet<>();
        List<EntityData> datas = new ArrayList<>();
        try {
            List<TPreenregistrementDetail> listprePreenregistrements = this.getUniteVendueData(dt_start, dt_end,
                    lg_ARTICLE_ID, search_value);
            for (TPreenregistrementDetail OPreenregistrementDetail : listprePreenregistrements) {
                familles.add(OPreenregistrementDetail.getLgFAMILLEID());
            }
            double montantfamille = 0;

            for (TFamille OFamille : familles) {
                montantfamille = getAmountFamilleArticle(OFamille.getLgFAMILLEARTICLEID().getLgFAMILLEARTICLEID(),
                        dt_start, dt_end);
                EntityData OEntityData = new EntityData();
                // int_QTY
                OEntityData.setStr_value1(OFamille.getLgFAMILLEARTICLEID().getStrCODEFAMILLE());
                OEntityData.setStr_value2(OFamille.getLgFAMILLEARTICLEID().getStrLIBELLE());
                OEntityData.setStr_value3(OFamille.getStrNAME());
                OEntityData.setStr_value4(OFamille.getLgFAMILLEID());
                OEntityData.setStr_value5(OFamille.getIntSEUILMIN().toString());
                OEntityData.setStr_value13(OFamille.getIntCIP());
                TFamilleStock familleStock = getFamilleStock(OFamille.getLgFAMILLEID());
                OEntityData.setStr_value15(familleStock.getIntNUMBERAVAILABLE() + "");

                // OEntityData.setStr_value15(OFamille.);qty to see later
                double int_MONTANT_VENTES = 0;
                double int_VENTE_COMPT = 0;
                double int_VENTE_CREDIT = 0;
                double int_QTE_VENDUE = 0, PERCENT = 0, int_NBRE_SORTIE = 0, int_UNITE_MOY_VENTE = 0, NB_VENTES_VNO = 0,
                        NB_VENTES_VO = 0;
                for (TPreenregistrementDetail ODetail : listprePreenregistrements) {
                    if (ODetail.getLgFAMILLEID().getLgFAMILLEID().equals(OFamille.getLgFAMILLEID())) {
                        double priceremise = 0;
                        int_QTE_VENDUE += ODetail.getIntQUANTITY();
                        int_NBRE_SORTIE += ODetail.getIntQUANTITYSERVED();
                        if (ODetail.getIntPRICEREMISE() != null) {
                            priceremise = ODetail.getIntPRICEREMISE();
                        }
                        int_MONTANT_VENTES += (ODetail.getIntPRICE() - priceremise);

                        switch (ODetail.getLgPREENREGISTREMENTID().getStrTYPEVENTE()) {
                        case Parameter.KEY_VENTE_ORDONNANCE:
                            int_VENTE_CREDIT += (ODetail.getIntPRICE() - priceremise);
                            NB_VENTES_VO++;
                            break;
                        case Parameter.KEY_VENTE_NON_ORDONNANCEE:
                            int_VENTE_COMPT += (ODetail.getIntPRICE() - priceremise);
                            NB_VENTES_VNO++;
                            break;
                        }
                    }

                }

                if (montantfamille > 0) {
                    PERCENT = (int_MONTANT_VENTES * 100 / montantfamille);
                }

                OEntityData.setStr_value6(int_MONTANT_VENTES + "");
                OEntityData.setStr_value7(int_VENTE_COMPT + "");
                OEntityData.setStr_value8(int_VENTE_CREDIT + "");
                OEntityData.setStr_value9(int_QTE_VENDUE + "");
                OEntityData.setStr_value10(int_NBRE_SORTIE + "");
                OEntityData.setStr_value11(NB_VENTES_VO + "");
                OEntityData.setStr_value12(NB_VENTES_VNO + "");
                OEntityData.setStr_value14(new BigDecimal(PERCENT).setScale(2, RoundingMode.HALF_UP).toString());
                datas.add(OEntityData);

            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    public double getAmountFamilleArticle(String lg_FAMILLEARTICLE_ID, String dt_start, String dt_end) {
        double amount = 0;
        Object OBJ = null;
        try {
            if (!"".equals(dt_start)) {
                Date dtstart = java.sql.Date.valueOf(dt_start);

                if (!"".equals(dt_end) && !dt_start.equals(dt_end)) {
                    Date dtend = java.sql.Date.valueOf(dt_end);
                    OBJ = this.getOdataManager().getEm().createQuery(
                            "SELECT SUM(o.intPRICE)-SUM(o.intPRICEREMISE) FROM TPreenregistrementDetail o WHERE o.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID =?1 AND o.lgPREENREGISTREMENTID.intPRICE >0 AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE  AND o.lgPREENREGISTREMENTID.strSTATUT =?2 AND o.dtCREATED BETWEEN ?3 AND ?4  ",
                            Object.class).setParameter(1, lg_FAMILLEARTICLE_ID)
                            .setParameter(2, commonparameter.statut_is_Closed).setParameter(3, dtstart)
                            .setParameter(4, dtend).getSingleResult();
                } else {
                    OBJ = this.getOdataManager().getEm().createQuery(
                            "SELECT SUM(o.intPRICE)-SUM(o.intPRICEREMISE) FROM TPreenregistrementDetail o WHERE o.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID =?1 AND o.lgPREENREGISTREMENTID.intPRICE >0 AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND o.lgPREENREGISTREMENTID.strSTATUT =?2 AND o.dtCREATED >= ?3 ",
                            Object.class).setParameter(1, lg_FAMILLEARTICLE_ID)
                            .setParameter(2, commonparameter.statut_is_Closed).setParameter(3, dtstart)
                            .getSingleResult();
                }
                if (OBJ != null) {
                    amount = Double.valueOf(OBJ + "");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return amount;
    }

    private TFamilleStock getFamilleStock(String lg_FAMILLE_ID) {
        return this.getOdataManager().getEm()
                .createQuery("SELECT o FROM TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID=?1", TFamilleStock.class)
                .setParameter(1, lg_FAMILLE_ID).getSingleResult();
    }

    public List<EntityData> getFamillesArticle(String dt_start, String dt_end, String lg_FAMILLE_ARTICLE_ID,
            String search_value) {
        Set<TFamille> familles = new HashSet<>();
        List<EntityData> datas = new ArrayList<>();
        try {

        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    public List<TPreenregistrementDetail> getFamilleArticleVendueData(String dt_start, String dt_end,
            String lg_FAMILLE_ARTICLE_ID, String search_value) {
        List<TPreenregistrementDetail> listprePreenregistrements = new ArrayList<>();

        if (!"".equals(dt_start)) {
            Date dtstart = java.sql.Date.valueOf(dt_start);
            try {
                if (!"".equals(dt_end) && !dt_start.equals(dt_end)) {

                    Date dtend = date.formatterMysql.parse(dt_end);
                    // listprePreenregistrements = this.getOdataManager().getEm().createQuery("SELECT o FROM
                    // TPreenregistrementDetail o WHERE o.dtCREATED BETWEEN ?1 AND ?2 AND
                    // o.lgPREENREGISTREMENTID.intPRICE >0 AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND
                    // o.lgPREENREGISTREMENTID.strSTATUT =?3 AND o.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID
                    // LIKE ?4 AND (o.lgFAMILLEID.lgFAMILLEARTICLEID.strLIBELLE LIKE ?5 OR
                    // o.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?5) ORDER BY
                    // o.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE")

                    listprePreenregistrements = this.getOdataManager().getEm().createQuery(
                            "SELECT o FROM  TPreenregistrementDetail o  WHERE o.dtCREATED >= ?1 AND   o.dtCREATED <=?2  AND  o.lgPREENREGISTREMENTID.intPRICE >0 AND  o.lgPREENREGISTREMENTID.bISCANCEL=FALSE  AND o.lgPREENREGISTREMENTID.strSTATUT =?3  AND o.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID  LIKE ?4  AND (o.lgFAMILLEID.lgFAMILLEARTICLEID.strLIBELLE LIKE ?5 OR o.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?5) ORDER BY o.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE")
                            .setParameter(1, dtstart).setParameter(2, dtend)
                            .setParameter(3, commonparameter.statut_is_Closed)
                            .setParameter(4, "%" + lg_FAMILLE_ARTICLE_ID + "%").setParameter(5, search_value + "%")
                            .getResultList();
                    for (TPreenregistrementDetail detail : listprePreenregistrements) {
                        this.refresh(detail);
                    }
                } else {

                    listprePreenregistrements = this.getOdataManager().getEm().createQuery(
                            "SELECT o FROM  TPreenregistrementDetail o  WHERE o.dtCREATED >= ?1   AND o.lgPREENREGISTREMENTID.intPRICE >0 AND o.lgPREENREGISTREMENTID.strSTATUT =?2 AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE  AND o.lgFAMILLEID.lgFAMILLEID LIKE ?3 AND (o.lgFAMILLEID.lgFAMILLEARTICLEID.strLIBELLE LIKE ?4 OR o.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?4) ORDER BY o.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE ")
                            .setParameter(1, dtstart).setParameter(2, commonparameter.statut_is_Closed)
                            .setParameter(3, "%" + lg_FAMILLE_ARTICLE_ID + "%").setParameter(4, search_value + "%")
                            .getResultList();
                    for (TPreenregistrementDetail detail : listprePreenregistrements) {
                        this.refresh(detail);

                    }
                }

            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        return listprePreenregistrements;
    }

    // fonction pour remplir la grille familles statistiques
    public List<EntityData> getFamillesArticleVendu(String dt_start, String dt_end, String lg_FAMILLE_ARTICLE_ID,
            String search_value) {
        // Set<TFamillearticle> familles = new HashSet<>();
        List<EntityData> datas = new ArrayList<>();
        try {

            List<TPreenregistrementDetail> listprePreenregistrements = this.getFamilleArticleVendueData(dt_start,
                    dt_end, lg_FAMILLE_ARTICLE_ID, search_value);
            // List<TPreenregistrementDetail> annuler = findPrevente(dt_start, dt_end);
            // Map<TFamillearticle, List<TPreenregistrementDetail>> mapannuler =
            // annuler.stream().collect(Collectors.groupingBy(a -> a.getLgFAMILLEID().getLgFAMILLEARTICLEID()));
            Map<TFamillearticle, List<TPreenregistrementDetail>> map = listprePreenregistrements.stream()
                    .collect(Collectors.groupingBy(a -> a.getLgFAMILLEID().getLgFAMILLEARTICLEID()));
            double TOTALHT = 0, MARGETOTAL = 0, MONTANTACHATOTAL = 0;

            for (Map.Entry<TFamillearticle, List<TPreenregistrementDetail>> entry : map.entrySet()) {
                TFamillearticle OFamille = entry.getKey();

                EntityData OEntityData = new EntityData();
                double MONTANT_TTC = 0, MONTANT_HT = 0, MONTANT_ACHAT = 0, MARGE_NET = 0, MARGE_PERCENT = 0,
                        MONTANT_HT_PERCENT = 0, MONTANT_HT_PERCENT_PERIODE = 0, AMOUNTTVA = 0, TOTALTTC = 0;
                OEntityData.setStr_value1(OFamille.getLgFAMILLEARTICLEID());
                OEntityData.setStr_value2(OFamille.getStrCODEFAMILLE());
                OEntityData.setStr_value3(OFamille.getStrLIBELLE());
                List<TPreenregistrementDetail> values = entry.getValue();
                for (TPreenregistrementDetail ODetail : values) {
                    MONTANTACHATOTAL += (ODetail.getIntQUANTITY() * ODetail.getLgFAMILLEID().getIntPAF());
                    if (ODetail.getIntPRICEREMISE() != null) {
                        TOTALTTC += (ODetail.getIntPRICE() - ODetail.getIntPRICEREMISE());
                        TOTALHT += (ODetail.getIntPRICE() - ODetail.getIntPRICEREMISE())
                                / (1 + (Double.valueOf(ODetail.getLgFAMILLEID().getLgCODETVAID().getIntVALUE()) / 100));
                    } else {
                        TOTALHT += (ODetail.getIntPRICE())
                                / (1 + (Double.valueOf(ODetail.getLgFAMILLEID().getLgCODETVAID().getIntVALUE()) / 100));
                    }

                    if (ODetail.getLgFAMILLEID().getLgFAMILLEARTICLEID().getLgFAMILLEARTICLEID()
                            .equals(OFamille.getLgFAMILLEARTICLEID())) {
                        double priceremise = 0;
                        MONTANT_ACHAT += (ODetail.getIntQUANTITY() * ODetail.getLgFAMILLEID().getIntPAF());
                        if (ODetail.getIntPRICEREMISE() != null) {
                            priceremise = ODetail.getIntPRICEREMISE();
                        }
                        MONTANT_TTC += (ODetail.getIntPRICE() - priceremise);
                        MONTANT_HT += (ODetail.getIntPRICE() - priceremise)
                                / (1 + (Double.valueOf(ODetail.getLgFAMILLEID().getLgCODETVAID().getIntVALUE()) / 100));
                    }

                }
                AMOUNTTVA = MONTANT_TTC - Math.round(MONTANT_HT);
                MARGE_NET = MONTANT_HT - MONTANT_ACHAT;
                MARGETOTAL = TOTALHT - MONTANTACHATOTAL;
                if (TOTALHT > 0) {
                    MONTANT_HT_PERCENT_PERIODE = (MONTANT_HT * 100 / TOTALHT);
                }
                if (MARGETOTAL > 0) {
                    MARGE_PERCENT = (MARGE_NET * 100 / MARGETOTAL);
                }

                OEntityData.setStr_value4(MONTANT_TTC + "");
                OEntityData.setStr_value5(Math.round(MONTANT_HT) + "");
                OEntityData.setStr_value6(MONTANT_ACHAT + "");
                OEntityData.setStr_value7(
                        new BigDecimal(MONTANT_HT_PERCENT_PERIODE).setScale(2, RoundingMode.HALF_UP).toString());
                OEntityData.setStr_value8(MARGE_NET + "");
                OEntityData.setStr_value9(new BigDecimal(MARGE_PERCENT).setScale(2, RoundingMode.HALF_UP).toString());
                datas.add(OEntityData);
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    private List<TPreenregistrementDetail> findPrevente(String dt_start, String dt_end, String empl) {
        EntityManager em = this.getOdataManager().getEm();
        List<TPreenregistrementDetail> list = new ArrayList<>();
        try {
            List<TPreenregistrement> tp = montantAnnuler(LocalDate.parse(dt_start), LocalDate.parse(dt_end), empl);

            for (TPreenregistrement preenregistrement : tp) {
                TypedQuery<TPreenregistrementDetail> tq = em.createQuery(
                        "SELECT o FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID=?1 ",
                        TPreenregistrementDetail.class);
                tq.setParameter(1, preenregistrement);
                List<TPreenregistrementDetail> details = tq.getResultList();
                if (!details.isEmpty()) {
                    list.addAll(details);
                }

            }

        } catch (Exception e) {
        }
        return list;
    }

    private List<TPreenregistrement> montantAnnuler(LocalDate dt_start, LocalDate dt_end, String empl) {
        try {
            Query q = this.getOdataManager().getEm().createQuery(
                    "SELECT DISTINCT o.preenregistrement FROM  AnnulationSnapshot o WHERE FUNCTION('DATE',o.dateOp)  BETWEEN ?1 AND ?2 AND o.emplacement.lgEMPLACEMENTID=?3 ");
            q.setParameter(1, java.sql.Date.valueOf(dt_start), TemporalType.DATE);
            q.setParameter(2, java.sql.Date.valueOf(dt_end), TemporalType.DATE);
            q.setParameter(3, empl);
            return q.getResultList();
        } catch (Exception e) {
            e.printStackTrace(System.err);
            return Collections.emptyList();
        }
    }

    // a revoir pour un probale changement de la tva
    public JSONArray getTvaDatas(String dt_start, String dt_end, String empl) {
        JSONArray array = new JSONArray();

        try {
            List<TPreenregistrementDetail> annuler = findPrevente(dt_start, dt_end, empl);// 07072019
            Map<String, List<TPreenregistrementDetail>> map = annuler.stream()
                    .collect(Collectors.groupingBy(s -> s.getLgFAMILLEID().getLgCODETVAID().getLgCODETVAID()));

            List<TPreenregistrementDetail> listprePreenregistrementsTVA18 = this.getTvaStatisticDatasByTVA(dt_start,
                    dt_end, "2", empl);
            List<TPreenregistrementDetail> tva18Annuler;
            List<TPreenregistrementDetail> tva0Annuler;
            try {
                tva18Annuler = map.get("2");
                tva18Annuler = (tva18Annuler == null) ? Collections.emptyList() : tva18Annuler;
            } catch (Exception e) {
                tva18Annuler = new ArrayList<>();
            }
            try {
                tva0Annuler = map.get("1");
                tva0Annuler = (tva0Annuler == null) ? Collections.emptyList() : tva0Annuler;
            } catch (Exception e) {
                tva0Annuler = new ArrayList<>();
            }
            long TVA = 0;
            long MONTANTTTC = 0;

            double MONTANTHT = 0.0;

            for (TPreenregistrementDetail value : listprePreenregistrementsTVA18) {
                MONTANTTTC += value.getIntPRICE();
                MONTANTHT += (value.getIntPRICE() / (1.18));
            }

            for (TPreenregistrementDetail value : tva18Annuler) {
                MONTANTTTC -= value.getIntPRICE();
                MONTANTHT -= (value.getIntPRICE() / (1.18));
            } // 07072019

            long _MONTANTHT = Math.round(MONTANTHT);
            TVA = MONTANTTTC - _MONTANTHT;
            JSONObject json = new JSONObject();
            json.put("id", 1);
            json.put("TAUX", 18);
            json.put("Total HT", _MONTANTHT);
            json.put("Total TVA", TVA);
            json.put("Total TTC", MONTANTTTC);

            array.put(json);
            // MONTANTTTC =0;
            List<TPreenregistrementDetail> listprePreenregistrements = this.getTvaStatisticDatasByTVA(dt_start, dt_end,
                    "1", empl);
            MONTANTTTC = listprePreenregistrements.stream().mapToLong((value) -> {
                return value.getIntPRICE();
            }).sum();// 07072019
            MONTANTTTC -= tva0Annuler.stream().mapToLong((value) -> {
                return value.getIntPRICE();
            }).sum();// 07072019
            json = new JSONObject();
            json.put("id", 2);
            json.put("TAUX", 0);
            json.put("Total HT", MONTANTTTC);
            json.put("Total TVA", 0);
            json.put("Total TTC", MONTANTTTC);
            array.put(json);

        } catch (Exception e) {
            e.printStackTrace(System.err);
        }

        return array;
    }

    public JSONArray getTvaData(String dt_start, String dt_end) {
        JSONArray array = new JSONArray();
        List<TPreenregistrementDetail> listprePreenregistrements;
        List<TCodeTva> tvalist;
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        JournalVente OJournalVente = new JournalVente(this.getOdataManager(), this.getOTUser());
        TParameters OTParameters = null;
        List<EntityData> listTMvtCaissesFalse = new ArrayList<>();
        Double P_SORTIECAISSE_ESPECE_FALSE = 0d;
        long int_AMOUNT_HT = 0, int_AMOUNT_TVA = 0;
        try {
            OTParameters = OTparameterManager.getParameter(Parameter.KEY_MOVEMENT_FALSE);
            tvalist = this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TCodeTva o WHERE o.strSTATUT =?1 ORDER BY o.intVALUE DESC")
                    .setParameter(1, commonparameter.statut_enable).getResultList();

            listprePreenregistrements = this.getTvaStatisticDatas(dt_start, dt_end);

            int count = 0;
            for (TCodeTva OCodeTva : tvalist) {
                int TVAVALUE = 0;
                long TVA = 0, TVAOTHER = 0, MONTANTTTC = 0, MONTANTTTCOTHER = 0;
                JSONObject json = new JSONObject();
                json.put("id", count);
                json.put("TAUX", OCodeTva.getIntVALUE());
                for (TPreenregistrementDetail OPreenregistrementDetail : listprePreenregistrements) {

                    if (OCodeTva.getIntVALUE() == OPreenregistrementDetail.getLgFAMILLEID().getLgCODETVAID()
                            .getIntVALUE()) {
                        TVAVALUE = OPreenregistrementDetail.getLgFAMILLEID().getLgCODETVAID().getIntVALUE();

                        MONTANTTTC += OPreenregistrementDetail.getIntPRICE();

                        // MONTANTTTCOTHER += (OPreenregistrementDetail.getIntPRICEOTHER() != null ?
                        // OPreenregistrementDetail.getIntPRICEOTHER() : OPreenregistrementDetail.getIntPRICE());
                    }
                }
                double MONTANTHT2 = MONTANTTTC / (1 + (Double.valueOf(TVAVALUE) / 100)),
                        MONTANTHT2OTHER = MONTANTTTCOTHER / (1 + (Double.valueOf(TVAVALUE) / 100));

                TVA = MONTANTTTC - Math.round(MONTANTHT2);
                TVAOTHER = MONTANTTTCOTHER - Math.round(MONTANTHT2OTHER);
                /*
                 * json.put("Total HT", Math.round(MONTANTHT2)); // a decommenter en cas de probleme
                 * json.put("Total TVA", TVA); json.put("Total TTC", MONTANTTTC);
                 */

                if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1
                        && !dt_start.equalsIgnoreCase(dt_end) && OCodeTva.getIntVALUE() != 0) {
                    listTMvtCaissesFalse = OJournalVente.getAllMouvmentsCaisse(dt_start, dt_end, false);
                    P_SORTIECAISSE_ESPECE_FALSE = this.getAmountMvtFalse(listTMvtCaissesFalse);
                    /*
                     * for (EntityData Odata : listTMvtCaissesFalse) { //a decommenter en cas de probleme
                     * P_SORTIECAISSE_ESPECE_FALSE += (-1) * Double.valueOf(Odata.getStr_value1()); } new
                     * logger().OCategory.info("P_SORTIECAISSE_ESPECE_FALSE:" + P_SORTIECAISSE_ESPECE_FALSE);
                     */
                }

                // json.put("Total HT", Math.round((OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE())
                // == 1 && !dt_start.equals(dt_end) && OCodeTva.getIntVALUE() != 0) ? (MONTANTHT2OTHER +
                // P_SORTIECAISSE_ESPECE_FALSE >= 0 ? MONTANTHT2OTHER + P_SORTIECAISSE_ESPECE_FALSE : MONTANTHT2OTHER) :
                // MONTANTHT2));
                // json.put("Total TVA", (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1 &&
                // !dt_start.equals(dt_end) && OCodeTva.getIntVALUE() != 0) ? (TVAOTHER + P_SORTIECAISSE_ESPECE_FALSE >=
                // 0 ? TVAOTHER + P_SORTIECAISSE_ESPECE_FALSE : TVAOTHER) : TVA);
                // json.put("Total TTC", (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1 &&
                // !dt_start.equals(dt_end) && OCodeTva.getIntVALUE() != 0) ? (MONTANTTTCOTHER +
                // P_SORTIECAISSE_ESPECE_FALSE >= 0 ? MONTANTTTCOTHER + P_SORTIECAISSE_ESPECE_FALSE : MONTANTTTCOTHER) :
                // MONTANTTTC);
                int_AMOUNT_TVA = Math.round((OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1
                        && !dt_start.equals(dt_end) && OCodeTva.getIntVALUE() != 0)
                                ? (TVAOTHER + P_SORTIECAISSE_ESPECE_FALSE >= 0 ? TVAOTHER + P_SORTIECAISSE_ESPECE_FALSE
                                        : TVAOTHER)
                                : TVA);
                int_AMOUNT_HT = Math.round((OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1
                        && !dt_start.equals(dt_end) && OCodeTva.getIntVALUE() != 0)
                                ? (TVAOTHER + P_SORTIECAISSE_ESPECE_FALSE >= 0
                                        ? (int_AMOUNT_TVA * 100) / OCodeTva.getIntVALUE() : MONTANTHT2OTHER)
                                : MONTANTHT2);
                json.put("Total HT", int_AMOUNT_HT);
                json.put("Total TVA", int_AMOUNT_TVA);
                json.put("Total TTC", int_AMOUNT_HT + int_AMOUNT_TVA);

                array.put(json);
                count++;
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return array;
    }

    private List<TGroupeFamille> getAllGroupeFamilles() {
        return this.getOdataManager().getEm()
                .createQuery("SELECT o FROM TGroupeFamille o ORDER BY o.strCODEGROUPEFAMILLE ASC").getResultList();
    }

    public List<TBonLivraisonDetail> getABonLivraisonDetails(Date dt_start, Date dt_end, String search_value) {
        List<TBonLivraisonDetail> bonLivraisonDetails = new ArrayList<>();
        try {
            bonLivraisonDetails = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TBonLivraisonDetail o WHERE o.strSTATUT=?1 AND o.dtCREATED >=?2 AND o.dtCREATED <=?3 AND (o.lgFAMILLEID.strNAME LIKE ?4 OR o.lgGROSSISTEID.strLIBELLE LIKE ?4 OR o.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?4 OR o.lgFAMILLEID.lgFAMILLEARTICLEID.strLIBELLE LIKE ?4 OR o.lgBONLIVRAISONID.lgUSERID.strFIRSTNAME LIKE ?4 OR o.lgBONLIVRAISONID.lgUSERID.strLASTNAME LIKE ?4)")
                    .setParameter(1, commonparameter.statut_is_Closed).setParameter(2, dt_start).setParameter(3, dt_end)
                    .setParameter(4, search_value + "%").getResultList();
            for (TBonLivraisonDetail tBonLivraisonDetail : bonLivraisonDetails) {
                this.refresh(tBonLivraisonDetail);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return bonLivraisonDetails;
    }

    public JSONObject achatFournisseur(String search_value, Date dt_start, Date dt_end) throws JSONException {
        List<TBonLivraisonDetail> list = this.getABonLivraisonDetails(dt_start, dt_end, search_value);
        JSONObject object = new JSONObject();

        JSONArray array = new JSONArray();
        array.put("Date");
        array.put("Libellé Famille");
        array.put("Libellé produit");
        array.put("Quantité Commandée");
        array.put("Quantité UG");
        array.put("Qunatité Manquant");
        array.put("Qunatité Reçue");
        array.put("Prix Achat");
        array.put("Montant");
        array.put("Opérateur");

        object.put("dataheader", array);

        JSONArray datavalue = new JSONArray();
        for (TBonLivraisonDetail OData : list) {

            JSONArray dataarray = new JSONArray();

            dataarray.put(date.formatterShort.format(OData.getDtCREATED()));
            dataarray.put(OData.getLgFAMILLEID().getLgFAMILLEARTICLEID().getStrLIBELLE());
            dataarray.put(OData.getLgFAMILLEID().getStrNAME());
            dataarray.put(OData.getIntQTECMDE());
            dataarray.put(OData.getIntQTEUG());
            dataarray.put(OData.getIntQTEMANQUANT());
            dataarray.put(OData.getIntQTERECUE());
            dataarray.put(OData.getIntPAF());
            dataarray.put(OData.getIntPAF() * OData.getIntQTERECUE());
            dataarray.put(OData.getLgBONLIVRAISONID().getLgUSERID().getStrFIRSTNAME().substring(0, 1).toUpperCase()
                    + ". " + OData.getLgBONLIVRAISONID().getLgUSERID().getStrLASTNAME());
            datavalue.put(dataarray);

        }
        object.put("datavalue", datavalue);

        return object;
    }

    private static final String[] CA_MONTH_FIELDS = { "janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet",
            "aout", "sep", "oct", "nov", "dec" };
    private static final String[] CA_MONTH_PERCENT_FIELDS = { "P_janvier", "P_fevrier", "P_mars", "P_avril", "P_mai",
            "P_juin", "P_juillet", "P_aout", "P_sep", "P_oct", "P_nov", "P_dec" };
    private static final String[] CA_MONTH_PROGRESS_FIELDS = { "Prog_janvier", "Prog_fevrier", "Prog_mars",
            "Prog_avril", "Prog_mai", "Prog_juin", "Prog_juillet", "Prog_aout", "Prog_sep", "Prog_oct", "Prog_nov",
            "Prog_dec" };

    private static class FamilleCAAccumulator {
        private final String libelle;
        private final String codeFamille;
        private final double[] currentYearAmounts = new double[12];
        private final double[] previousYearAmounts = new double[12];

        FamilleCAAccumulator(String libelle, String codeFamille) {
            this.libelle = libelle;
            this.codeFamille = codeFamille;
        }
    }

    public JSONArray getFamilleCA_Data(String search_value, String periode, String periode_1) {
        JSONArray array = new JSONArray();
        int currentYear = extractYear(periode, Integer.valueOf(date.FORMATTERYEAR.format(new Date())));
        int previousYear = extractYear(periode_1, currentYear - 1);
        LocalDate startDate = LocalDate.of(previousYear, 1, 1);
        LocalDate endDate = LocalDate.of(currentYear + 1, 1, 1);
        String search = search_value == null ? "" : search_value.trim();
        String searchPattern = "%" + search + "%";

        String query = "SELECT fa.`str_LIBELLE`, fa.`str_CODE_FAMILLE`, YEAR(d.`dt_CREATED`) AS annee, "
                + "MONTH(d.`dt_CREATED`) AS mois, SUM(d.`int_PRICE` - COALESCE(d.`int_PRICE_REMISE`, 0)) AS montant "
                + "FROM t_preenregistrement_detail d "
                + "JOIN t_preenregistrement p ON p.`lg_PREENREGISTREMENT_ID` = d.`lg_PREENREGISTREMENT_ID` "
                + "JOIN t_famille f ON f.`lg_FAMILLE_ID` = d.`lg_FAMILLE_ID` "
                + "JOIN t_famillearticle fa ON fa.`lg_FAMILLEARTICLE_ID` = f.`lg_FAMILLEARTICLE_ID` "
                + "WHERE p.`str_STATUT` = ?1 AND p.`int_PRICE` > 0 AND p.`b_IS_CANCEL` = 0 "
                + "AND d.`dt_CREATED` >= ?2 AND d.`dt_CREATED` < ?3 "
                + "AND (?4 = '' OR fa.`str_LIBELLE` LIKE ?5 OR fa.`str_CODE_FAMILLE` LIKE ?5) "
                + "GROUP BY fa.`str_LIBELLE`, fa.`str_CODE_FAMILLE`, YEAR(d.`dt_CREATED`), MONTH(d.`dt_CREATED`) "
                + "ORDER BY fa.`str_LIBELLE`, fa.`str_CODE_FAMILLE`, annee, mois";
        try {
            Query nativeQuery = this.getOdataManager().getEm().createNativeQuery(query);
            nativeQuery.setParameter(1, commonparameter.statut_is_Closed);
            nativeQuery.setParameter(2, java.sql.Timestamp.valueOf(startDate.atStartOfDay()));
            nativeQuery.setParameter(3, java.sql.Timestamp.valueOf(endDate.atStartOfDay()));
            nativeQuery.setParameter(4, search);
            nativeQuery.setParameter(5, searchPattern);

            List<Object[]> rows = nativeQuery.getResultList();
            Map<String, FamilleCAAccumulator> familles = new java.util.LinkedHashMap<>();
            double[] currentYearTotals = new double[12];
            double[] previousYearTotals = new double[12];

            for (Object[] row : rows) {
                String libelle = row[0] != null ? row[0].toString() : "";
                String codeFamille = row[1] != null ? row[1].toString() : "";
                int year = ((Number) row[2]).intValue();
                int monthIndex = ((Number) row[3]).intValue() - 1;
                double amount = row[4] != null ? Double.valueOf(row[4].toString()) : 0;
                String key = codeFamille + "|" + libelle;
                FamilleCAAccumulator famille = familles.computeIfAbsent(key,
                        k -> new FamilleCAAccumulator(libelle, codeFamille));

                if (monthIndex >= 0 && monthIndex < 12) {
                    if (year == currentYear) {
                        famille.currentYearAmounts[monthIndex] = amount;
                        currentYearTotals[monthIndex] += amount;
                    } else if (year == previousYear) {
                        famille.previousYearAmounts[monthIndex] = amount;
                        previousYearTotals[monthIndex] += amount;
                    }
                }
            }

            int count = 0;
            for (FamilleCAAccumulator famille : familles.values()) {
                JSONObject json = new JSONObject();
                json.put("id", count);
                json.put("GP", famille.codeFamille);
                json.put("str_Libelle_Produit", famille.libelle);
                for (int monthIndex = 0; monthIndex < 12; monthIndex++) {
                    double currentAmount = famille.currentYearAmounts[monthIndex];
                    double previousAmount = famille.previousYearAmounts[monthIndex];
                    json.put(CA_MONTH_FIELDS[monthIndex], currentAmount);
                    json.put(CA_MONTH_FIELDS[monthIndex] + "_1", previousAmount);
                    json.put(CA_MONTH_PERCENT_FIELDS[monthIndex],
                            Math.round(percent(currentAmount, currentYearTotals[monthIndex])));
                    json.put(CA_MONTH_PERCENT_FIELDS[monthIndex] + "_1",
                            Math.round(percent(previousAmount, previousYearTotals[monthIndex])));
                    json.put(CA_MONTH_PROGRESS_FIELDS[monthIndex], Math.round(progress(currentAmount, previousAmount)));
                }
                // une ligne par famille (elle etait ajoutee a chaque mois, soit douze fois)
                array.put(json);
                count++;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return array;
    }

    private int extractYear(String periode, int defaultYear) {
        try {
            if (periode != null && periode.length() >= 4) {
                return Integer.valueOf(periode.substring(0, 4));
            }
        } catch (NumberFormatException e) {
            e.printStackTrace();
        }
        return defaultYear;
    }

    private double percent(double amount, double total) {
        if (total <= 0) {
            return 0;
        }
        return (amount * 100) / total;
    }

    private double progress(double currentAmount, double previousAmount) {
        if (previousAmount <= 0) {
            return 0;
        }
        double value = ((currentAmount - previousAmount) * 100) / previousAmount;
        if (value > 1000) {
            return 1000;
        }
        return value;
    }

    public List<EntityData> getAllShopRuptureStocks(String searchvalue, String dt_start, String dt_end) {
        List<EntityData> datas = new ArrayList<>();
        try {
            List<Object[]> list = this.getOdataManager().getEm()
                    .createNativeQuery("SELECT o.* FROM v_rp_rupture_stock o WHERE DATE(o.`dt_CREATED`)>='" + dt_start
                            + "' AND DATE(o.`dt_CREATED`)<='" + dt_end + "' AND (o.`str_NAME` LIKE '%" + searchvalue
                            + "%' OR o.`int_CIP` LIKE '%" + searchvalue + "%')")
                    .getResultList();
            for (Object[] objects : list) {

                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0] + "");
                entityData.setStr_value2(objects[1] + "");
                entityData.setStr_value3(objects[2] + "");
                entityData.setStr_value4(objects[3] + "");
                entityData.setStr_value5(objects[4] + "");
                entityData.setStr_value6(objects[5] != null ? objects[5].toString() : "");
                entityData.setStr_value7(objects[6] + "");

                entityData.setStr_value8(objects[7] + "");
                entityData.setStr_value9(objects[8] + "");
                datas.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    public List<EntityData> getAnalyseVenteStockData(String dt_start, String dt_end, String search_value) {
        List<EntityData> datas = new ArrayList<>();
        try {
            List<Object[]> list = this.getOdataManager().getEm()
                    .createNativeQuery("CALL  `proc_analyseventestock`(?1,?2,?3)").setParameter(1, dt_start)
                    .setParameter(2, dt_end).setParameter(3, search_value + "%").getResultList();
            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0] + "");// FAMILLE LIB
                entityData.setStr_value2(objects[1] + "");// CODE FAMIILLE
                entityData.setStr_value3(objects[2] + "");// MONTANT VENTE
                entityData.setStr_value4(objects[3] + "");// QUANTITE VENDUE
                entityData.setStr_value5(objects[4] + "");// NB SORTIE
                entityData.setStr_value6(objects[5] + "");// UNITE MOY
                entityData.setStr_value7(objects[6] + "");// SEUIL REAPP
                entityData.setStr_value8(objects[7] + "");// SEUIL ACTUEL
                entityData.setStr_value9(objects[8] + "");// QTE REAPP
                entityData.setStr_value10(objects[9] + "");// QTE STOCK
                entityData.setStr_value11(objects[10] + "");// NB VO
                double qtevendue = Double.valueOf(objects[3] + "");
                double percent = 0;
                if (qtevendue > 0) {
                    percent = Math.round(qtevendue * 100) / Double.valueOf(objects[11] + "");
                }
                entityData.setStr_value12(percent + "");
                entityData.setStr_value13(objects[12] + "");// NB VNO
                datas.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    public List<EntityData> getAChatProduct(String dt_start, String dt_end, String search_value, int start, int limit) {
        List<EntityData> datas = new ArrayList<>();
        try {
            List<Object[]> list = this.getOdataManager().getEm()
                    .createNativeQuery("CALL  `proc_statventeachat`(?1,?2,?3,?4,?5)").setParameter(1, dt_start)
                    .setParameter(2, dt_end).setParameter(3, search_value + "%").setParameter(4, start)
                    .setParameter(5, limit).getResultList();
            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0] + "");
                entityData.setStr_value2(objects[1] + "");
                entityData.setStr_value3(objects[2] + "");
                entityData.setStr_value4(objects[3] + "");
                entityData.setStr_value5(objects[4] + "");
                entityData.setStr_value6(objects[5] + "");
                entityData.setStr_value7(objects[6] + "");
                entityData.setStr_value8(objects[7] + "");
                entityData.setStr_value9(objects[8] + "");
                entityData.setStr_value10(objects[9] + "");
                entityData.setStr_value11(objects[10] + "");
                entityData.setStr_value12(objects[11] + "");
                entityData.setStr_value13(objects[12] + "");
                entityData.setStr_value14(objects[13] + "");
                datas.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    public List<EntityData> getAChatFournisseurs(String dt_start, String dt_end, String search_value) {
        List<EntityData> datas = new ArrayList<>();
        try {
            List<Object[]> list = this.getOdataManager().getEm()
                    .createNativeQuery("CALL  `proc_statachatfournisseur`(?1,?2,?3)").setParameter(1, dt_start)
                    .setParameter(2, dt_end).setParameter(3, search_value + "%").getResultList();
            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0] + "");// ANNE
                entityData.setStr_value2(objects[1] + "");// CODE FAMIILLE
                entityData.setStr_value3(objects[2] + "_" + objects[14]);// MONTANT VENTE
                entityData.setStr_value4(objects[3] + "_" + objects[15]);// QUANTITE VENDUE
                entityData.setStr_value5(objects[4] + "_" + objects[16]);// NB SORTIE
                entityData.setStr_value6(objects[5] + "_" + objects[17]);// UNITE MOY
                entityData.setStr_value7(objects[6] + "_" + objects[18]);// SEUIL REAPP
                entityData.setStr_value8(objects[7] + "_" + objects[19]);// SEUIL ACTUEL
                entityData.setStr_value9(objects[8] + "_" + objects[20]);// QTE REAPP
                entityData.setStr_value10(objects[9] + "_" + objects[21]);// QTE STOCK
                entityData.setStr_value11(objects[10] + "_" + objects[22]);// NB VO
                entityData.setStr_value12(objects[11] + "_" + objects[23]);
                entityData.setStr_value13(objects[12] + "_" + objects[24]);// NB VNO
                entityData.setStr_value14(objects[13] + "_" + objects[25]);
                datas.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    public long getVenteSocietesClientCount(String dt_start, String dt_end, String search_value,
            String type_tierspayant) {
        String query = "SELECT COUNT(*) FROM t_snap_shop_vente_societe o WHERE YEAR(o.`dt_DAY`) >=YEAR('" + dt_start
                + "') AND YEAR(o.`dt_DAY`)<=YEAR('" + dt_end + "') AND  o.`str_TYPE_TIERS_PAYANT`='" + type_tierspayant
                + "' AND o.`str_TIERS_PAYANT` LIKE '" + search_value
                + "%' GROUP BY o.`str_TIERS_PAYANT` ,YEAR(o.`dt_DAY`)";

        long count = 0l;
        try {
            List o = this.getOdataManager().getEm().createNativeQuery(query).getResultList();
            count = o.size();
        } catch (Exception e) {
        }
        return count;
    }

    public List<EntityData> getVenteSocietesClientData(String dt_start, String dt_end, String search_value, int start,
            int limit) {
        List<EntityData> datas = new ArrayList<>();
        try {// *
            List<Object[]> list = this.getOdataManager().getEm()
                    .createNativeQuery("CALL  `proc_ventesocietereglement`(?1,?2,?3,?4,?5)").setParameter(1, dt_start)
                    .setParameter(2, dt_end).setParameter(3, search_value + "%").setParameter(4, start)
                    .setParameter(5, limit).getResultList();
            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0] + "");// ANNE
                entityData.setStr_value2(objects[1] + "");// CODE FAMIILLE
                entityData.setStr_value3(objects[2] + "_" + objects[14]);// MONTANT VENTE
                entityData.setStr_value4(objects[3] + "_" + objects[15]);// QUANTITE VENDUE
                entityData.setStr_value5(objects[4] + "_" + objects[16]);// NB SORTIE
                entityData.setStr_value6(objects[5] + "_" + objects[17]);// UNITE MOY
                entityData.setStr_value7(objects[6] + "_" + objects[18]);// SEUIL REAPP
                entityData.setStr_value8(objects[7] + "_" + objects[19]);// SEUIL ACTUEL
                entityData.setStr_value9(objects[8] + "_" + objects[20]);// QTE REAPP
                entityData.setStr_value10(objects[9] + "_" + objects[21]);// QTE STOCK
                entityData.setStr_value11(objects[10] + "_" + objects[22]);// NB VO
                entityData.setStr_value12(objects[11] + "_" + objects[23]);
                entityData.setStr_value13(objects[12] + "_" + objects[24]);// NB VNO
                entityData.setStr_value14(objects[13] + "_" + objects[25]);
                datas.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    public List<EntityData> getVenteAvoirClientData(String dt_start, String dt_end, String search_value, int start,
            int limit) {
        List<EntityData> datas = new ArrayList<>();
        try {
            List<Object[]> list = this.getOdataManager().getEm()
                    .createNativeQuery("CALL  `proc_venteavoirclient`(?1,?2,?3,?4,?5)").setParameter(1, dt_start)
                    .setParameter(2, dt_end).setParameter(3, search_value + "%").setParameter(4, start)
                    .setParameter(5, limit).getResultList();
            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0] + "");// ANNE
                entityData.setStr_value2(objects[1] + "");// CODE FAMIILLE
                entityData.setStr_value3(objects[2] + "_" + objects[14]);// MONTANT VENTE
                entityData.setStr_value4(objects[3] + "_" + objects[15]);// QUANTITE VENDUE
                entityData.setStr_value5(objects[4] + "_" + objects[16]);// NB SORTIE
                entityData.setStr_value6(objects[5] + "_" + objects[17]);// UNITE MOY
                entityData.setStr_value7(objects[6] + "_" + objects[18]);// SEUIL REAPP
                entityData.setStr_value8(objects[7] + "_" + objects[19]);// SEUIL ACTUEL
                entityData.setStr_value9(objects[8] + "_" + objects[20]);// QTE REAPP
                entityData.setStr_value10(objects[9] + "_" + objects[21]);// QTE STOCK
                entityData.setStr_value11(objects[10] + "_" + objects[22]);// NB VO
                entityData.setStr_value12(objects[11] + "_" + objects[23]);
                entityData.setStr_value13(objects[12] + "_" + objects[24]);// NB VNO
                entityData.setStr_value14(objects[13] + "_" + objects[25]);
                datas.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    public List<EntityData> getRetrocessionData(String dt_start, String dt_end, String search_value) {
        List<EntityData> datas = new ArrayList<>();
        try {
            List<Object[]> list = this.getOdataManager().getEm()
                    .createNativeQuery("CALL  `proc_statretrocession`(?1,?2,?3)").setParameter(1, dt_start)
                    .setParameter(2, dt_end).setParameter(3, search_value + "%").getResultList();
            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0] + "");
                entityData.setStr_value2(objects[1] + "");
                entityData.setStr_value3(objects[2] + "");
                entityData.setStr_value4(objects[3] + "");
                entityData.setStr_value5(objects[4] + "");
                entityData.setStr_value6(objects[5] + "");
                entityData.setStr_value7(objects[6] + "");
                entityData.setStr_value8(objects[7] + "");
                entityData.setStr_value9(objects[8] + "");
                entityData.setStr_value10(objects[9] + "");
                entityData.setStr_value11(objects[10] + "");
                entityData.setStr_value12(objects[11] + "");
                entityData.setStr_value13(objects[12] + "");
                entityData.setStr_value14(objects[13] + "");
                datas.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return datas;
    }

    /**
     * Recapitulatif par compte d'organisme.
     *
     * L'exception n'est plus avalee. Elle l'etait (printStackTrace puis liste vide), et l'ecran affichait alors un
     * tableau vide sans le moindre message : l'utilisateur croyait qu'il n'y avait aucun reglement sur la periode,
     * alors que la requete avait echoue. Le service web renvoyait un succes, donc le Centre de Support n'en gardait
     * aucune trace non plus. L'appelant decide desormais quoi en faire.
     *
     * @throws RuntimeException
     *             quand la procedure stockee echoue, avec la cause d'origine attachee
     */
    public List<EntityData> getRecapReglementByOrganismeData(String dt_start, String dt_end, String lg_tiers_payant_id,
            String search_value) {
        List<EntityData> datas = new ArrayList<>();
        String req = "CALL proc_recaptulatif_organisme(?1,?2,?3,?4)";
        List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(req).setParameter(1, dt_start)
                .setParameter(2, dt_end).setParameter(3, search_value + "%").setParameter(4, lg_tiers_payant_id)
                .getResultList();
        for (Object[] objects : list) {
            EntityData entityData = new EntityData();
            entityData.setStr_value1(objects[0] + "");// organisme
            entityData.setStr_value2(objects[1] + "");// libelle type tiers payant
            entityData.setStr_value3(objects[2] + "");// code organisme
            entityData.setStr_value4(objects[3] + "");// code comptable
            entityData.setStr_value5(objects[4] + "");// num compte
            entityData.setStr_value6(objects[5] + "");// Montantop
            entityData.setStr_value7(objects[6] + "");// Montant credit
            entityData.setStr_value8(objects[7] + "");// solde
            datas.add(entityData);
        }
        return datas;
    }

    public List<EntityData> statisticArticleVendue(String search_value, int start, int limit, String dt_start,
            String dt_end) {
        List<EntityData> datas = new ArrayList<>();
        String query = "SELECT SUM(pd.`int_QUANTITY`)AS QTYVENDU,COUNT(`pd`.`lg_PREENREGISTREMENT_DETAIL_ID`)AS QTYSORTIE,\n"
                + "SUM(CASE WHEN pd.`int_PRICE_REMISE` IS NOT NULL  THEN (pd.`int_PRICE`-pd.`int_PRICE_REMISE`) ELSE pd.`int_PRICE` END) AS MONTANT,\n"
                + "SUM(CASE WHEN p.`str_TYPE_VENTE`='VNO'  THEN pd.`int_QUANTITY` ELSE 0 END) AS NB_VNO, \n"
                + "SUM(CASE WHEN p.`str_TYPE_VENTE`='VO'  THEN pd.`int_QUANTITY` ELSE 0 END) AS NB_VO, \n"
                + " f.`str_NAME`,f.`int_SEUIL_MIN`,f.`int_CIP`,\n"
                + "`fa`.`str_CODE_FAMILLE`,`fa`.`str_LIBELLE` ,s.`int_NUMBER_AVAILABLE`,\n"
                + "ROUND(SUM(pd.`int_QUANTITY`)/COUNT(p.`lg_PREENREGISTREMENT_ID`))AS UNITMOY  "
                + "FROM t_preenregistrement_detail pd,\n"
                + "t_preenregistrement p,`t_famille` f,`t_famillearticle` fa ,`t_famille_stock` s  "
                + "WHERE p.`lg_PREENREGISTREMENT_ID`=pd.`lg_PREENREGISTREMENT_ID`\n"
                + "AND f.`lg_FAMILLE_ID`=pd.`lg_FAMILLE_ID`\n"
                + "AND fa.`lg_FAMILLEARTICLE_ID`=f.`lg_FAMILLEARTICLE_ID` \n"
                + "AND f.`lg_FAMILLE_ID`=s.`lg_FAMILLE_ID`\n" + "AND p.`b_IS_CANCEL`=0 AND DATE(p.`dt_CREATED`)>=DATE('"
                + dt_start + "')  AND DATE(p.`dt_CREATED`)<=DATE('" + dt_end + "') "
                + "AND p.`int_PRICE`>0 AND p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed'\n"
                + "AND (f.`str_NAME` LIKE '" + search_value + "' OR fa.`str_CODE_FAMILLE` LIKE '" + search_value
                + "' OR fa.`str_LIBELLE` LIKE '" + search_value + "'  OR f.`int_CIP` LIKE '" + search_value
                + "') AND s.lg_EMPLACEMENT_ID LIKE '" + this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID()
                + "'\n" + " GROUP BY f.`lg_FAMILLE_ID`  LIMIT " + start + " ," + limit + "";
        try {
            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();
            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                entityData.setStr_value1(objects[0] + "");// QTYVENDU
                entityData.setStr_value2(objects[1] + "");// QTYSORITE
                entityData.setStr_value3(objects[2] + "");// MONTANTVENTE
                entityData.setStr_value4(objects[3] + "");// nb_vno
                entityData.setStr_value5(objects[4] + "");// nb_vo
                entityData.setStr_value6(objects[5] + "");// lib_famille
                entityData.setStr_value7(objects[6] + "");// SEUILACT
                entityData.setStr_value8(objects[7] + "");// CIP
                entityData.setStr_value9(objects[8] + "");// CODEFAMILLE,
                entityData.setStr_value10(objects[9] + "");// LIBEFAMILLEARTICLE
                entityData.setStr_value11(objects[10] + "");// STOCK
                entityData.setStr_value12(objects[11] + "");// UNITMOY
                datas.add(entityData);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return datas;
    }

    public long getStatisticVenteCount(String search_value, String dt_start, String dt_end) {
        long count = 0l;
        try {
            String query = "SELECT  COUNT( DISTINCT f.`lg_FAMILLE_ID`) FROM  t_preenregistrement_detail pd,t_preenregistrement p,t_famille f  ,t_famillearticle fa \n"
                    + "WHERE p.`lg_PREENREGISTREMENT_ID`=pd.`lg_PREENREGISTREMENT_ID` AND f.`lg_FAMILLE_ID`=pd.`lg_FAMILLE_ID` AND fa.`lg_FAMILLEARTICLE_ID`=f.`lg_FAMILLEARTICLE_ID` AND p.`b_IS_CANCEL`=0  AND p.`int_PRICE`>0 AND p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed' \n"
                    + "AND DATE(p.`dt_CREATED`)>=DATE('" + dt_start + "')  AND DATE(p.`dt_CREATED`)<=DATE('" + dt_end
                    + "')\n" + "AND (f.`str_NAME` LIKE '" + search_value + "' OR fa.`str_CODE_FAMILLE` LIKE '"
                    + search_value + "' OR fa.`str_LIBELLE` LIKE '" + search_value + "' OR f.`int_CIP` LIKE '"
                    + search_value + "')";
            Object object = this.getOdataManager().getEm().createNativeQuery(query).getSingleResult();
            count = Long.valueOf(object + "");
        } catch (Exception e) {
            e.printStackTrace();
        }
        return count;
    }

    public long getAChatProductCount(String dt_start, String dt_end, String search_value) {
        String query = "SELECT COUNT(f.`lg_FAMILLE_ID`)  FROM t_bon_livraison_detail d,t_famille f WHERE f.`lg_FAMILLE_ID`=d.`lg_FAMILLE_ID` AND  YEAR( d.`dt_UPDATED`)>=YEAR(?1) AND  YEAR( d.`dt_UPDATED`)<=YEAR(?2) AND d.`str_STATUT`='is_Closed'  AND f.`str_NAME` LIKE ?3 GROUP BY f.`str_NAME`";
        long count = 0l;
        try {
            List list = this.getOdataManager().getEm().createNativeQuery(query).setParameter(1, dt_start)
                    .setParameter(2, dt_end).setParameter(3, search_value + "%").getResultList();
            count = list.size();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return count;
    }

    public List<EntityData> getVenteSocietesClient(String dt_start, String dt_end, String search_value) {
        System.out.println("sfsfsdfsdfsd");
        List<EntityData> datas = new ArrayList<>();
        String query = "SELECT o.`str_TIERS_PAYANT`, YEAR(o.`dt_DAY`), (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='1' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS VENTEJAN,\n"
                + "(SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='1' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS REGJAN,\n"
                + " (SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='2' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS VENTEFEV,\n"
                + "(SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='2' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS REGFEV,\n"
                + "(SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='3' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS VENTEMARS,\n"
                + "(SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='3' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS REGMARS,\n"
                + "(SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='4' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS VENTEAVRIL,\n"
                + "(SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='4' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS REGAVRIL\n" + ",\n"
                + "(SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='5' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS VENTEMAI,\n"
                + "(SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='5' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS REGMAI\n" + ",\n"
                + "(SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='6' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS VENTEJUIN,\n"
                + "(SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='6' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS REGJUIN,\n" + "\n" + "\n"
                + "(SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='7' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS VENTEJUIL,\n"
                + "(SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='7' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS REGJUIL,\n"
                + "(SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='8' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS VENTEAOUT,\n"
                + "(SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='8' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS REGAOUT,\n"
                + "(SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='9' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS VENTESET,\n"
                + "(SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='9' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS REGSET\n" + ",\n" + "\n"
                + "(SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='10' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS VENTEOCT,\n"
                + "(SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='10' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS REGOCT,\n" + "\n"
                + "(SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='11' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS VENTENOV,\n"
                + "(SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='11' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS REGNOV,\n"
                + "(SELECT SUM(p.`int_AMOUNT_SALE`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='12' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS VENTEDEC,\n"
                + "(SELECT SUM(p.`int_AMOUNT_ENCAIS`) FROM t_snap_shop_vente_societe p WHERE MONTH (p.`dt_DAY`)='12' \n"
                + "AND YEAR(p.`dt_DAY`)=YEAR(o.`dt_DAY`) AND p.`str_TIERS_PAYANT`=o.`str_TIERS_PAYANT`)  \n"
                + "AS REGDEC\n" + "FROM t_snap_shop_vente_societe o WHERE  o.`dt_DAY`>='" + dt_start
                + "' AND o.`dt_DAY`<='" + dt_end + "' AND o.`str_TYPE_TIERS_PAYANT`='1' AND o.`str_TIERS_PAYANT` LIKE '"
                + search_value + "'"
                + " GROUP BY o.`str_TIERS_PAYANT` ,YEAR(o.`dt_DAY`) ORDER BY YEAR(o.`dt_DAY`) DESC";
        try {

            List<Object[]> list = this.getOdataManager().getEm().createNativeQuery(query).getResultList();
            System.out.println("list " + list.size());
            for (Object[] objects : list) {
                EntityData entityData = new EntityData();
                double _v1 = 0, _r1 = 0, _v2 = 0, _r2 = 0, _v3 = 0, _r3 = 0, _v4 = 0, _r4 = 0, _v5 = 0, _r5 = 0,
                        _v6 = 0, _r6 = 0, _v7 = 0, _r7 = 0, _v8 = 0, _r8 = 0, _v9 = 0, _r9 = 0, _v10 = 0, _r10 = 0,
                        _v11 = 0, _r11 = 0, _v12 = 0, _r12 = 0;

                entityData.setStr_value2(objects[0] + "");
                entityData.setStr_value1(objects[1] + "");
                entityData.setStr_value3(
                        objects[2] != null ? objects[2] + "" : 0 + "_" + objects[3] != null ? objects[3] + "" : "0");
                entityData.setStr_value4(
                        objects[4] != null ? objects[4] + "" : 0 + "_" + objects[5] != null ? objects[5] + "" : "0");
                entityData.setStr_value5(
                        objects[6] != null ? objects[6] + "" : 0 + "_" + objects[7] != null ? objects[7] + "" : "0");
                entityData.setStr_value6(
                        objects[8] != null ? objects[8] + "" : 0 + "_" + objects[9] != null ? objects[9] + "" : "0");
                entityData.setStr_value7(objects[10] != null ? objects[10] + ""
                        : 0 + "_" + objects[11] != null ? objects[11] + "" : "0");
                entityData.setStr_value8(objects[12] != null ? objects[12] + ""
                        : 0 + "_" + objects[13] != null ? objects[13] + "" : "0");
                entityData.setStr_value9(objects[14] != null ? objects[14] + ""
                        : 0 + "_" + objects[15] != null ? objects[15] + "" : "0");
                entityData.setStr_value10(objects[16] != null ? objects[16] + ""
                        : 0 + "_" + objects[17] != null ? objects[17] + "" : "0");
                entityData.setStr_value11(objects[18] != null ? objects[18] + ""
                        : 0 + "_" + objects[19] != null ? objects[19] + "" : "0");
                entityData.setStr_value12(objects[20] != null ? objects[20] + ""
                        : 0 + "_" + objects[21] != null ? objects[21] + "" : "0");
                entityData.setStr_value13(objects[22] != null ? objects[22] + ""
                        : 0 + "_" + objects[23] != null ? objects[23] + "" : "0");
                entityData.setStr_value14(objects[24] != null ? objects[24] + ""
                        : 0 + "_" + objects[25] != null ? objects[25] + "" : "0");
                datas.add(entityData);

            }
            for (EntityData dat : datas) {
                System.out.println(" **** " + dat.getStr_value3() + " " + dat.getStr_value4());
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return datas;
    }

    public long getRecapReglementByOrganismeCount(String dt_start, String dt_end, String lg_tiers_payant_id,
            String search_value) {
        long count = 0l, result = 0l;
        String req = "SELECT COUNT(t.`str_FULLNAME`) FROM t_dossier_reglement d,t_tiers_payant t,t_type_tiers_payant p WHERE  t.`lg_TIERS_PAYANT_ID`=d.`str_ORGANISME_ID`  AND p.`lg_TYPE_TIERS_PAYANT_ID`=t.`lg_TYPE_TIERS_PAYANT_ID` AND DATE(d.`dt_CREATED`)>=DATE('"
                + dt_start + "') AND DATE(d.`dt_CREATED`) <=DATE('" + dt_end + "') "
                + " AND t.`lg_TIERS_PAYANT_ID` LIKE '" + lg_tiers_payant_id + "' AND (t.`str_FULLNAME` LIKE '"
                + search_value + "%' OR p.`str_LIBELLE_TYPE_TIERS_PAYANT` LIKE '" + search_value
                + "%') GROUP BY t.`str_FULLNAME`";
        try {
            List list = this.getOdataManager().getEm().createNativeQuery(req).getResultList();
            count = list.size();
            long soldecount = getRecapReglementByOrganismeCount(lg_tiers_payant_id, search_value);
            result = (count >= soldecount ? count : soldecount);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    private long getRecapReglementByOrganismeCount(String lg_tiers_payant_id, String search_value) {
        long count = 0l;
        String req = "SELECT COUNT(t.`str_FULLNAME`)    from t_preenregistrement_compte_client_tiers_payent pr,\n"
                + "t_preenregistrement p, " + "t_compte_client c,t_compte_client_tiers_payant cl, "
                + "t_tiers_payant t,t_type_tiers_payant tp  "
                + " WHERE p.`lg_PREENREGISTREMENT_ID`=pr.`lg_PREENREGISTREMENT_ID` "
                + " AND c.`lg_COMPTE_CLIENT_ID`=cl.`lg_COMPTE_CLIENT_ID` "
                + " AND t.`lg_TYPE_TIERS_PAYANT_ID`=tp.`lg_TYPE_TIERS_PAYANT_ID` "
                + " AND cl.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID`=pr.`lg_COMPTE_CLIENT_TIERS_PAYANT_ID` "
                + " AND t.`lg_TIERS_PAYANT_ID`=cl.`lg_TIERS_PAYANT_ID` " + " AND (t.`str_FULLNAME` LIKE '"
                + search_value + "%' OR tp.`str_LIBELLE_TYPE_TIERS_PAYANT` LIKE '" + search_value
                + "%' ) AND t.`lg_TIERS_PAYANT_ID` LIKE '" + lg_tiers_payant_id + "' "
                + " AND pr.`int_PRICE_RESTE`>0 AND p.`b_IS_CANCEL`=0 AND p.`str_STATUT`='is_Closed' "
                + " GROUP BY t.`str_FULLNAME` ";
        try {
            List list = this.getOdataManager().getEm().createNativeQuery(req).getResultList();
            count = list.size();

        } catch (Exception e) {
            e.printStackTrace();
        }
        return count;
    }

    public List<TPreenregistrementDetail> getTvaStatisticData(String dt_start, String dt_end) {
        List<TPreenregistrementDetail> listprePreenregistrements = new ArrayList<>();
        Date dtstart = (!"".equals(dt_start) ? java.sql.Date.valueOf(dt_start) : new Date());
        Date dtend = (!"".equals(dt_end) ? java.sql.Date.valueOf(dt_end) : new Date());

        try {

            listprePreenregistrements = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM  TPreenregistrementDetail o WHERE   FUNCTION('DATE',o.dtCREATED) >= ?1  AND FUNCTION('DATE',o.dtCREATED) <= ?2  AND  o.lgPREENREGISTREMENTID.intPRICE >0 AND o.lgPREENREGISTREMENTID.strSTATUT =?3 AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE   AND o.lgPREENREGISTREMENTID.lgTYPEVENTEID.lgTYPEVENTEID <> ?4 ")
                    .setParameter(1, dtstart).setParameter(2, dtend).setParameter(3, commonparameter.statut_is_Closed)
                    .setParameter(4, Parameter.VENTE_DEPOT_EXTENSION).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return listprePreenregistrements;
    }

    public Double getAmountMvtFalse(List<EntityData> lst) {
        Double result = 0.0;
        try {
            for (EntityData Odata : lst) {
                result += (-1) * Double.valueOf(Odata.getStr_value1());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("result:-----" + result);
        return result;
    }

    public long getVenteClientCount(String dt_start, String dt_end, String search_value) {
        TClient client = findClient(search_value + "%");
        String lgClient = "%%";
        if (client != null) {
            lgClient = client.getLgCLIENTID();
        }

        String query = "SELECT COUNT(*) FROM t_snap_shop_vente_client o WHERE YEAR(o.`dt_DAY`) >=YEAR('" + dt_start
                + "') AND YEAR(o.`dt_DAY`)<=YEAR('" + dt_end + "')  AND o.`lg_CLIENT_ID` LIKE  '" + lgClient
                + "%' GROUP BY o.`lg_CLIENT_ID` ,YEAR(o.`dt_DAY`)";

        long count = 0l;
        try {
            List o = this.getOdataManager().getEm().createNativeQuery(query).getResultList();
            count = o.size();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return count;
    }

    private TClient findClient(String criteria) {
        TClient client = null;
        System.out.println("criteria  " + criteria);
        try {
            client = (TClient) this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TClient o WHERE (o.strFIRSTNAME  LIKE ?1 OR o.strLASTNAME  LIKE ?1 OR o.strCODEINTERNE LIKE ?1 OR o.strNUMEROSECURITESOCIAL LIKE ?1 OR CONCAT(o.strFIRSTNAME,' ',o.strLASTNAME) LIKE ?1)    ")
                    .setParameter(1, criteria).getSingleResult();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return client;
    }

    public JSONArray tvaData(String dt_start, String dt_end) {
        JSONArray array = new JSONArray();
        List<TPreenregistrementDetail> listprePreenregistrements = new ArrayList<>();
        List<TCodeTva> tvalist = new ArrayList<>();
        TparameterManager OTparameterManager = new TparameterManager(this.getOdataManager());
        // JournalVente OJournalVente = new JournalVente(this.getOdataManager(), this.getOTUser());
        TParameters OTParameters = null;
        // List<EntityData> listTMvtCaissesFalse = new ArrayList<EntityData>();
        // Double P_SORTIECAISSE_ESPECE_FALSE = 0d;
        try {
            OTParameters = OTparameterManager.getParameter(Parameter.KEY_MOVEMENT_FALSE);
            tvalist = this.getOdataManager().getEm()
                    .createQuery("SELECT o FROM TCodeTva o WHERE o.strSTATUT =?1 ORDER BY o.intVALUE DESC")
                    .setParameter(1, commonparameter.statut_enable).getResultList();

            listprePreenregistrements = this.getTvaStatisticData(dt_start, dt_end);

            int count = 0;
            for (TCodeTva OCodeTva : tvalist) {
                int TVAVALUE = 0;
                long TVA = 0, TVAOTHER = 0, MONTANTTTC = 0, MONTANTTTCOTHER = 0;
                JSONObject json = new JSONObject();
                json.put("id", count);
                json.put("TAUX", OCodeTva.getIntVALUE());
                for (TPreenregistrementDetail OPreenregistrementDetail : listprePreenregistrements) {

                    if (OCodeTva.getIntVALUE() == OPreenregistrementDetail.getLgFAMILLEID().getLgCODETVAID()
                            .getIntVALUE()) {
                        TVAVALUE = OPreenregistrementDetail.getLgFAMILLEID().getLgCODETVAID().getIntVALUE();

                        MONTANTTTC += OPreenregistrementDetail.getIntPRICE();
                        System.out.println("OPreenregistrementDetail " + OPreenregistrementDetail + " @@@@@@@@@ "
                                + OPreenregistrementDetail.getIntPRICEOTHER());
                        MONTANTTTCOTHER += OPreenregistrementDetail.getIntPRICEOTHER();
                    }
                }
                double MONTANTHT2 = MONTANTTTC / (1 + (Double.valueOf(TVAVALUE) / 100)),
                        MONTANTHT2OTHER = MONTANTTTCOTHER / (1 + (Double.valueOf(TVAVALUE) / 100));

                TVA = MONTANTTTC - Math.round(MONTANTHT2);
                TVAOTHER = MONTANTTTCOTHER - Math.round(MONTANTHT2OTHER);
                json.put("Total HT", Math.round(MONTANTHT2)); // a decommenter en cas de probleme
                json.put("Total TVA", TVA);
                json.put("Total TTC", MONTANTTTC);

                /*
                 * if (OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE()) == 1 &&
                 * !dt_start.equalsIgnoreCase(dt_end) && OCodeTva.getIntVALUE() != 0) { listTMvtCaissesFalse =
                 * OJournalVente.getAllMouvmentsCaisse(dt_start, dt_end, false); P_SORTIECAISSE_ESPECE_FALSE =
                 * this.getAmountMvtFalse(listTMvtCaissesFalse);
                 */
                /*
                 * for (EntityData Odata : listTMvtCaissesFalse) { //a decommenter en cas de probleme
                 * P_SORTIECAISSE_ESPECE_FALSE += (-1) * Double.valueOf(Odata.getStr_value1()); } new
                 * logger().OCategory.info("P_SORTIECAISSE_ESPECE_FALSE:" + P_SORTIECAISSE_ESPECE_FALSE);
                 */
                /* } */

                /*
                 * json.put("Total HT", Math.round((OTParameters != null && Integer.parseInt(OTParameters.getStrVALUE())
                 * == 1 && !dt_start.equals(dt_end) && OCodeTva.getIntVALUE() != 0) ? (MONTANTHT2OTHER +
                 * P_SORTIECAISSE_ESPECE_FALSE >= 0 ? MONTANTHT2OTHER + P_SORTIECAISSE_ESPECE_FALSE : MONTANTHT2OTHER) :
                 * MONTANTHT2)); json.put("Total TVA", (OTParameters != null &&
                 * Integer.parseInt(OTParameters.getStrVALUE()) == 1 && !dt_start.equals(dt_end) &&
                 * OCodeTva.getIntVALUE() != 0) ? (TVAOTHER + P_SORTIECAISSE_ESPECE_FALSE >= 0 ? TVAOTHER +
                 * P_SORTIECAISSE_ESPECE_FALSE : TVAOTHER) : TVA); json.put("Total TTC", (OTParameters != null &&
                 * Integer.parseInt(OTParameters.getStrVALUE()) == 1 && !dt_start.equals(dt_end) &&
                 * OCodeTva.getIntVALUE() != 0) ? (MONTANTTTCOTHER + P_SORTIECAISSE_ESPECE_FALSE >= 0 ? MONTANTTTCOTHER
                 * + P_SORTIECAISSE_ESPECE_FALSE : MONTANTTTCOTHER) : MONTANTTTC);
                 */
                array.put(json);
                count++;
            }
            System.out.println(" array ****************  " + array.toString());
        } catch (Exception e) {
            e.printStackTrace();
        }

        return array;
    }

    public List<TPreenregistrementDetail> getTvaStatisticDatas(String dt_start, String dt_end) {
        List<TPreenregistrementDetail> listprePreenregistrements = new ArrayList<>();
        TParameters KEY_TAKE_INTO_ACCOUNT;
        boolean KEYTAKEINTOACCOUNT = false;
        try {
            EntityManager em = this.getOdataManager().getEm();
            try {
                KEY_TAKE_INTO_ACCOUNT = em.getReference(TParameters.class, "KEY_TAKE_INTO_ACCOUNT");
                if (KEY_TAKE_INTO_ACCOUNT != null) {

                    if (Integer.valueOf(KEY_TAKE_INTO_ACCOUNT.getStrVALUE().trim()) == 1) {
                        KEYTAKEINTOACCOUNT = true;
                    }
                }
            } catch (Exception e) {
            }
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TPreenregistrementDetail> cq = cb.createQuery(TPreenregistrementDetail.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root.join("lgPREENREGISTREMENTID",
                    JoinType.INNER);
            // Join<TPreenregistrementDetail, TFamille> f = root.join("lgFAMILLEID", JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate,
                    cb.equal(join.get(TPreenregistrement_.strSTATUT), commonparameter.statut_is_Closed));
            predicate = cb.and(predicate, cb.equal(join.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate,
                    cb.notLike(join.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), Parameter.VENTE_DEPOT_EXTENSION));
            Predicate ge = cb.greaterThan(join.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate, ge);
            if (KEYTAKEINTOACCOUNT) {
                predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrementDetail_.boolACCOUNT), Boolean.TRUE));
            }
            Predicate btw = cb.between(cb.function("DATE", Date.class, join.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            predicate = cb.and(predicate, btw);
            cq.select(root);

            cq.where(predicate);

            Query q = em.createQuery(cq);

            listprePreenregistrements = q.getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return listprePreenregistrements;
    }

    public List<TPreenregistrementDetail> getTvaStatisticDatas(String dt_start, String dt_end,
            boolean KEYTAKEINTOACCOUNT) {
        List<TPreenregistrementDetail> listprePreenregistrements = new ArrayList<>();

        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TPreenregistrementDetail> cq = cb.createQuery(TPreenregistrementDetail.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root.join("lgPREENREGISTREMENTID",
                    JoinType.INNER);
            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate,
                    cb.equal(join.get(TPreenregistrement_.strSTATUT), commonparameter.statut_is_Closed));
            predicate = cb.and(predicate, cb.equal(join.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate,
                    cb.notLike(join.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), Parameter.VENTE_DEPOT_EXTENSION));
            Predicate ge = cb.greaterThan(join.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate, ge);
            if (KEYTAKEINTOACCOUNT) {
                predicate = cb.and(predicate, cb.equal(root.get(TPreenregistrementDetail_.boolACCOUNT), Boolean.TRUE));
            }
            Predicate btw = cb.between(cb.function("DATE", Date.class, join.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            predicate = cb.and(predicate, btw);
            cq.select(root);

            cq.where(predicate);

            Query q = em.createQuery(cq);

            listprePreenregistrements = q.getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return listprePreenregistrements;
    }
    // fonction a revoir

    public List<TPreenregistrementDetail> getTvaStatisticDatasByTVA(String dt_start, String dt_end, String tva,
            String empl) {
        List<TPreenregistrementDetail> listprePreenregistrements = new ArrayList<>();

        try {
            EntityManager em = this.getOdataManager().getEm();
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<TPreenregistrementDetail> cq = cb.createQuery(TPreenregistrementDetail.class);
            Root<TPreenregistrementDetail> root = cq.from(TPreenregistrementDetail.class);
            Join<TPreenregistrementDetail, TPreenregistrement> join = root.join("lgPREENREGISTREMENTID",
                    JoinType.INNER);
            Join<TPreenregistrementDetail, TFamille> products = root.join("lgFAMILLEID", JoinType.INNER);

            Predicate predicate = cb.conjunction();
            predicate = cb.and(predicate,
                    cb.equal(join.get(TPreenregistrement_.strSTATUT), commonparameter.statut_is_Closed));
            predicate = cb.and(predicate, cb.equal(join.get(TPreenregistrement_.bISCANCEL), Boolean.FALSE));
            predicate = cb.and(predicate, cb.equal(products.get("lgCODETVAID").get("lgCODETVAID"), tva));
            predicate = cb.and(predicate,
                    cb.notLike(join.get("lgTYPEVENTEID").get("lgTYPEVENTEID"), Parameter.VENTE_DEPOT_EXTENSION));
            predicate = cb.and(predicate, cb.equal(
                    root.get("lgPREENREGISTREMENTID").get("lgUSERID").get("lgEMPLACEMENTID").get("lgEMPLACEMENTID"),
                    empl));
            Predicate ge = cb.greaterThan(join.get(TPreenregistrement_.intPRICE), 0);
            predicate = cb.and(predicate, ge);

            Predicate btw = cb.between(cb.function("DATE", Date.class, join.get(TPreenregistrement_.dtUPDATED)),
                    java.sql.Date.valueOf(dt_start), java.sql.Date.valueOf(dt_end));
            predicate = cb.and(predicate, btw);
            cq.select(root).distinct(true);
            cq.where(predicate);
            Query q = em.createQuery(cq);
            listprePreenregistrements = q.getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }

        return listprePreenregistrements;
    }

    public JSONArray getTvaDatasReport(String dt_start, String dt_end, String empl) {
        JSONArray array = new JSONArray();
        try {
            List<TPreenregistrementDetail> annuler = findPrevente(dt_start, dt_end, empl);// 07072019
            Map<String, List<TPreenregistrementDetail>> map = annuler.stream()
                    .collect(Collectors.groupingBy(s -> s.getLgFAMILLEID().getLgCODETVAID().getLgCODETVAID()));

            List<TPreenregistrementDetail> listprePreenregistrementsTVA18 = this.getTvaStatisticDatasByTVA(dt_start,
                    dt_end, "2", empl);

            List<TPreenregistrementDetail> tva18Annuler;
            List<TPreenregistrementDetail> tva0Annuler;
            try {
                tva18Annuler = map.get("2");
                tva18Annuler = (tva18Annuler == null) ? Collections.emptyList() : tva18Annuler;
            } catch (Exception e) {
                tva18Annuler = new ArrayList<>();
            }
            try {
                tva0Annuler = map.get("1");
                tva0Annuler = (tva0Annuler == null) ? Collections.emptyList() : tva0Annuler;
            } catch (Exception e) {
                tva0Annuler = new ArrayList<>();
            }

            long TVA = 0;
            long MONTANTTTC = 0;

            double MONTANTHT = 0.0;

            for (TPreenregistrementDetail value : listprePreenregistrementsTVA18) {
                MONTANTTTC += value.getIntPRICE();
                MONTANTHT += (value.getIntPRICE() / (1.18));
            }
            for (TPreenregistrementDetail value : tva18Annuler) {
                MONTANTTTC -= value.getIntPRICE();
                MONTANTHT -= (value.getIntPRICE() / (1.18));
            } // 0
            long _MONTANTHT = Math.round(MONTANTHT);
            TVA = MONTANTTTC - _MONTANTHT;
            JSONObject json = new JSONObject();
            json.put("id", 1);
            json.put("TAUX", 18);
            json.put("TotalHT", _MONTANTHT);
            json.put("TotalTVA", TVA);
            json.put("TotalTTC", MONTANTTTC);

            array.put(json);
            MONTANTTTC = 0;
            List<TPreenregistrementDetail> listprePreenregistrements = this.getTvaStatisticDatasByTVA(dt_start, dt_end,
                    "1", empl);
            MONTANTTTC = listprePreenregistrements.stream().mapToLong((value) -> {
                return value.getIntPRICE();
            }).sum();
            MONTANTTTC -= tva0Annuler.stream().mapToLong((value) -> {
                return value.getIntPRICE();
            }).sum();// 07072019
            json = new JSONObject();
            json.put("id", 2);
            json.put("TAUX", 0);
            json.put("TotalHT", MONTANTTTC);
            json.put("TotalTVA", 0);
            json.put("TotalTTC", MONTANTTTC);
            array.put(json);

        } catch (Exception e) {
            e.printStackTrace();
        }

        return array;
    }

}
