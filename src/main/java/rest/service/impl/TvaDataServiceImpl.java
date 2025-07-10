package rest.service.impl;

import commonTasks.dto.Params;
import commonTasks.dto.TvaDTO;
import dal.TParameters;
import dal.enumeration.TypeTransaction;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.Tuple;
import javax.persistence.TypedQuery;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.CaisseService;
import util.DateConverter;
import rest.service.TvaDataService;

/**
 *
 * @author koben
 */
@Stateless
public class TvaDataServiceImpl implements TvaDataService {

    private static final Logger LOG = Logger.getLogger(TvaDataServiceImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private CaisseService caisseService;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public List<TvaDTO> statistiqueTvaWithSomeCriteria(Params params) {
        long montant = caisseService.montantAccount(LocalDate.parse(params.getDtStart()),
                LocalDate.parse(params.getDtEnd()), params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(),
                TypeTransaction.VENTE_COMPTANT, DateConverter.MODE_ESP, DateConverter.MVT_REGLE_VNO);

        List<TvaDTO> tvas = new ArrayList<>();
        List<TvaDTO> datas = findTvaDatas(params);
        for (TvaDTO data : datas) {
            TvaDTO o = new TvaDTO();
            long montantTTC = data.getMontantTtc();
            long montantUg = data.getMontantHt();
            if (data.getTaux() == 0) {
                montantTTC -= montant;
            }

            montantTTC -= montantUg;
            Double valeurTva = 1 + (Double.valueOf(data.getTaux()) / 100);
            long htAmont = (long) Math.ceil(montantTTC / valeurTva);
            long montantTva = montantTTC - htAmont;
            o.setMontantTva(montantTva);
            o.setMontantTtc(montantTTC);
            o.setTaux(data.getTaux());
            o.setMontantHt(htAmont);
            tvas.add(o);
        }
        return tvas;
    }

    private long montantFlag(Params params) {

        try {
            TypedQuery<Long> query = getEntityManager().createQuery(
                    "SELECT COALESCE(SUM(o.montantAcc),0) FROM MvtTransaction o WHERE o.mvtDate BETWEEN ?1 AND ?2 AND o.flag IS NOT NULL",
                    Long.class);
            query.setParameter(1, LocalDate.parse(params.getDtStart()));
            query.setParameter(2, LocalDate.parse(params.getDtEnd()));
            return query.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }

    }

    @Override
    public List<TvaDTO> statistiqueTva(Params params) {
        List<TvaDTO> tvas = new ArrayList<>();
        List<TvaDTO> datas = findTvaDatas(params);
        for (TvaDTO data : datas) {
            TvaDTO o = new TvaDTO();
            Double valeurTva = 1 + (Double.valueOf(data.getTaux()) / 100);
            long montantTTC = data.getMontantTtc();
            if (data.getTaux() == 0) {
                montantTTC -= montantFlag(params);
            }
            long htAmont = (long) Math.ceil(montantTTC / valeurTva);
            long montantTva = montantTTC - htAmont;
            o.setMontantTva(montantTva);
            o.setMontantTtc(montantTTC);
            o.setTaux(data.getTaux());
            o.setMontantHt(htAmont);
            tvas.add(o);
        }
        return tvas;
    }

    @Override
    public JSONObject statistiqueTvaView(Params params) {
        JSONObject json = new JSONObject();
        List<TvaDTO> datas = statistiqueTva(params);
        json.put("total", datas.size());
        json.put("data", new JSONArray(datas));
        return json;
    }

    @Override
    public List<TvaDTO> tvaVnoDatas(Params params) {

        List<TvaDTO> datas = tvaVnoData(params);
        List<TvaDTO> tvas = new ArrayList<>();
        datas.stream().collect(Collectors.groupingBy(TvaDTO::getTaux)).forEach((taux, list) -> {
            TvaDTO o = new TvaDTO();
            long montantTTC = 0;
            long montantUg = 0;
            for (TvaDTO data : list) {

                montantTTC += data.getMontantTtc();
                montantUg += data.getMontantHt();

            }

            montantTTC -= montantUg;
            Double valeurTva = 1 + (Double.valueOf(taux) / 100);
            long htAmont = (long) Math.ceil(montantTTC / valeurTva);
            long montantTva = montantTTC - htAmont;
            o.setMontantTva(montantTva);
            o.setMontantTtc(montantTTC);
            o.setTaux(taux);
            o.setMontantHt(htAmont);
            tvas.add(o);
        });

        return tvas;
    }

    @Override
    public JSONObject statistiqueTvaVnoOnlyView(Params params) {
        JSONObject json = new JSONObject();
        List<TvaDTO> datas = tvaVnoData(params);
        List<TvaDTO> tvas = new ArrayList<>();
        datas.stream().collect(Collectors.groupingBy(TvaDTO::getTaux)).forEach((taux, list) -> {
            TvaDTO o = new TvaDTO();
            long montantTTC = 0;
            long montantUg = 0;
            for (TvaDTO data : list) {

                montantTTC += data.getMontantTtc();
                montantUg += data.getMontantHt();

            }

            montantTTC -= montantUg;
            Double valeurTva = 1 + (Double.valueOf(taux) / 100);
            long htAmont = (long) Math.ceil(montantTTC / valeurTva);
            long montantTva = montantTTC - htAmont;
            o.setMontantTva(montantTva);
            o.setMontantTtc(montantTTC);
            o.setTaux(taux);
            o.setMontantHt(htAmont);
            tvas.add(o);
        });
        json.put("total", tvas.size());
        json.put("data", new JSONArray(tvas));
        return json;
    }

    @Override
    public JSONObject statistiqueTvaViewSomeCriteria(Params params) {
        JSONObject json = new JSONObject();
        List<TvaDTO> datas;
        if (!isExcludTiersPayantActive()) {

            datas = statistiqueTvaWithSomeCriteria(params);
        } else {
            datas = statistiqueTvaWithSomeTiersPayantToExclude(params);
        }

        json.put("total", datas.size());
        json.put("data", new JSONArray(datas));
        return json;
    }

    @Override
    public JSONObject statistiqueTvaGroupByDayViewSomeCriteria(Params params) {
        JSONObject json = new JSONObject();
        List<TvaDTO> datas = statistiqueTvaGroupByDayWithSomeCriteria(params);
        json.put("total", datas.size());
        json.put("data", new JSONArray(datas));
        return json;
    }

    @Override
    public List<TvaDTO> statistiqueTvaGroupByDayWithSomeCriteria(Params params) {
        List<TvaDTO> tvas = new ArrayList<>();
        List<TvaDTO> datas = findTvaGroupByDayDatas(params);
        for (TvaDTO data : datas) {
            long montant = caisseService.montantAccount(data.getLocalOperation(), data.getLocalOperation(),
                    params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(), TypeTransaction.VENTE_COMPTANT,
                    DateConverter.MODE_ESP, DateConverter.MVT_REGLE_VNO);
            TvaDTO o = new TvaDTO();
            long montantTTC = data.getMontantTtc();
            long montantUg = data.getMontantHt();
            if (data.getTaux() == 0) {
                montantTTC -= montant;
            }
            montantTTC -= montantUg;
            Double valeurTva = 1 + (Double.valueOf(data.getTaux()) / 100);
            long htAmont = (long) Math.ceil(montantTTC / valeurTva);
            long montantTva = montantTTC - htAmont;
            o.setMontantTva(montantTva);
            o.setMontantTtc(montantTTC);
            o.setTaux(data.getTaux());
            o.setMontantHt(htAmont);
            o.setLocalOperation(data.getLocalOperation());
            o.setDateOperation(data.getLocalOperation().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
            tvas.add(o);
        }
        return tvas;
    }

    @Override
    public List<TvaDTO> statistiqueGroupByDayTva(Params params) {
        List<TvaDTO> tvas = new ArrayList<>();
        List<TvaDTO> datas = findTvaGroupByDayDatas(params);
        for (TvaDTO data : datas) {
            TvaDTO o = new TvaDTO();
            Double valeurTva = 1 + (Double.valueOf(data.getTaux()) / 100);
            long htAmont = (long) Math.ceil(data.getMontantTtc() / valeurTva);
            long montantTva = data.getMontantTtc() - htAmont;
            o.setMontantTva(montantTva);
            o.setMontantTtc(data.getMontantTtc());
            o.setTaux(data.getTaux());
            o.setMontantHt(htAmont);
            o.setLocalOperation(data.getLocalOperation());
            o.setDateOperation(data.getLocalOperation().format(DateTimeFormatter.ofPattern("yyyy/MM/dd")));
            tvas.add(o);
        }
        return tvas;
    }

    @Override
    public boolean isExcludTiersPayantActive() {
        try {
            TParameters q = getEntityManager().find(TParameters.class, "EXCLUSION_TIERS6PAYANT_CARNET");
            return Integer.parseInt(q.getStrVALUE()) == 1;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public List<TvaDTO> statistiqueTvaWithSomeTiersPayantToExclude(Params params) {
        List<TvaDTO> tvas = new ArrayList<>();
        List<TvaDTO> vo = tvaVoData(params, true);
        List<TvaDTO> vno = tvaVnoData(params);
        long montant = caisseService.montantAccount(LocalDate.parse(params.getDtStart()),
                LocalDate.parse(params.getDtEnd()), params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID(),
                TypeTransaction.VENTE_COMPTANT, DateConverter.MODE_ESP, DateConverter.MVT_REGLE_VNO);

        Stream.of(vno, vo).flatMap(x -> x.stream()).collect(Collectors.groupingBy(TvaDTO::getTaux))
                .forEach((taux, list) -> {
                    TvaDTO o = new TvaDTO();
                    long montantTTC = 0;
                    long montantUg = 0;
                    for (TvaDTO data : list) {

                        montantTTC += data.getMontantTtc();
                        montantUg += data.getMontantHt();

                    }
                    if (taux == 0) {
                        montantTTC -= montant;
                    }
                    montantTTC -= montantUg;
                    Double valeurTva = 1 + (Double.valueOf(taux) / 100);
                    long htAmont = (long) Math.ceil(montantTTC / valeurTva);
                    long montantTva = montantTTC - htAmont;
                    o.setMontantTva(montantTva);
                    o.setMontantTtc(montantTTC);
                    o.setTaux(taux);
                    o.setMontantHt(htAmont);
                    tvas.add(o);
                });
        return tvas;
    }

    private List<TvaDTO> tvaVoData(Params params, boolean toBeExclude) {
        try {
            List<Tuple> list = getEntityManager().createNativeQuery(
                    "SELECT SUM(d.int_PRICE) AS montantTTC,d.valeurTva  FROM  t_preenregistrement_detail d,t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID "
                            + "  AND p.str_TYPE_VENTE='VO' AND p.b_IS_CANCEL=0 AND p.int_PRICE >0 AND p.lg_TYPE_VENTE_ID <>'5' AND p.str_STATUT='is_Closed' AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM  vente_exclu v)"
                            + "  AND DATE(p.dt_UPDATED) BETWEEN ?1 AND ?2 GROUP BY d.valeurTva ",
                    Tuple.class).setParameter(1, java.sql.Date.valueOf(params.getDtStart()), TemporalType.DATE)
                    .setParameter(1, java.sql.Date.valueOf(params.getDtEnd()), TemporalType.DATE).getResultList();

            return list.stream().map(t -> new TvaDTO(t.get(1, Integer.class), t.get(0, BigDecimal.class)))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    @Override
    public List<TvaDTO> tvaVnoData(Params params) {
        List<TvaDTO> tvas = new ArrayList<>();
        try {
            Query query = getEntityManager().createNativeQuery(
                    "SELECT SUM(p.int_PRICE) AS montantTTC,SUM(p.int_UG*p.int_PRICE_UNITAIR) AS montantUg,p.valeurTva AS valeurTva FROM t_preenregistrement_detail p,t_preenregistrement o,t_user u WHERE o.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID"
                            + " AND o.b_IS_CANCEL=0 AND o.int_PRICE>0 AND o.lg_TYPE_VENTE_ID <> '5' AND o.str_STATUT='is_Closed' AND DATE(o.dt_UPDATED) BETWEEN ?1 AND ?2 AND o.lg_USER_ID=u.lg_USER_ID AND u.lg_EMPLACEMENT_ID=?3 AND o.str_TYPE_VENTE='VNO'   GROUP BY p.valeurTva"
                            + " ",
                    Tuple.class);
            query.setParameter(1, java.sql.Date.valueOf(params.getDtStart()), TemporalType.DATE);
            query.setParameter(2, java.sql.Date.valueOf(params.getDtEnd()), TemporalType.DATE);
            query.setParameter(3, params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            List<Tuple> list = query.getResultList();
            for (Tuple tuple : list) {
                TvaDTO o = new TvaDTO();
                o.setMontantTtc(tuple.get("montantTTC", BigDecimal.class).longValue());
                o.setMontantHt(tuple.get("montantUg", BigDecimal.class).longValue());
                o.setTaux(tuple.get("valeurTva", Integer.class));
                tvas.add(o);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "", e);
        }
        return tvas;
    }

    @Override
    public List<TvaDTO> statistiqueTvaVnoGroupByDayTva(Params params) {
        List<TvaDTO> tvas = new ArrayList<>();
        List<TvaDTO> datas = findTvaVnoGroupByDayDatas(params);
        for (TvaDTO data : datas) {
            TvaDTO o = new TvaDTO();
            Double valeurTva = 1 + (Double.valueOf(data.getTaux()) / 100);
            long htAmont = (long) Math.ceil(data.getMontantTtc() / valeurTva);
            long montantTva = data.getMontantTtc() - htAmont;
            o.setMontantTva(montantTva);
            o.setMontantTtc(data.getMontantTtc());
            o.setTaux(data.getTaux());
            o.setMontantHt(htAmont);
            o.setLocalOperation(data.getLocalOperation());
            o.setDateOperation(data.getLocalOperation().format(DateTimeFormatter.ofPattern("yyyy/MM/dd")));
            tvas.add(o);
        }
        return tvas;
    }

    private List<TvaDTO> findTvaDatas(Params params) {
        List<TvaDTO> tvas = new ArrayList<>();
        try {
            Query query = getEntityManager().createNativeQuery(
                    "SELECT SUM(p.int_PRICE) AS montantTTC,SUM(p.int_UG*p.int_PRICE_UNITAIR) AS montantUg,p.valeurTva AS valeurTva FROM t_preenregistrement_detail p,t_preenregistrement o,t_user u WHERE o.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID"
                            + " AND o.b_IS_CANCEL=0  AND o.`int_PRICE`>0  AND o.lg_TYPE_VENTE_ID <> '5' AND o.str_STATUT='is_Closed' AND DATE(o.dt_UPDATED) BETWEEN ?1 AND ?2 AND o.lg_USER_ID=u.lg_USER_ID AND u.lg_EMPLACEMENT_ID=?3 AND o.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM  vente_exclu v)  GROUP BY p.valeurTva"
                            + " ",
                    Tuple.class);
            query.setParameter(1, java.sql.Date.valueOf(params.getDtStart()), TemporalType.DATE);
            query.setParameter(2, java.sql.Date.valueOf(params.getDtEnd()), TemporalType.DATE);
            query.setParameter(3, params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            List<Tuple> list = query.getResultList();
            for (Tuple tuple : list) {
                TvaDTO o = new TvaDTO();
                o.setMontantTtc(tuple.get("montantTTC", BigDecimal.class).longValue());
                o.setMontantHt(tuple.get("montantUg", BigDecimal.class).longValue());
                o.setTaux(tuple.get("valeurTva", Integer.class));
                tvas.add(o);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "", e);
        }
        return tvas;
    }

    private List<TvaDTO> findTvaGroupByDayDatas(Params params) {
        List<TvaDTO> tvas = new ArrayList<>();
        try {
            Query query = getEntityManager().createNativeQuery(
                    "SELECT SUM(p.int_PRICE) AS montantTTC,SUM(p.int_UG*p.int_PRICE_UNITAIR) AS montantUg,p.valeurTva AS valeurTva,DATE(o.dt_UPDATED) AS dateOperation FROM t_preenregistrement_detail p,t_preenregistrement o,t_user u WHERE o.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID"
                            + " AND o.b_IS_CANCEL=0 AND o.int_PRICE>0 AND o.lg_TYPE_VENTE_ID <> '5' AND o.str_STATUT='is_Closed' AND DATE(o.dt_UPDATED) BETWEEN ?1 AND ?2 AND o.lg_USER_ID=u.lg_USER_ID AND u.lg_EMPLACEMENT_ID=?3 AND o.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM  vente_exclu v)  GROUP BY p.valeurTva ,DATE(o.dt_UPDATED)"
                            + " ",
                    Tuple.class);
            query.setParameter(1, java.sql.Date.valueOf(params.getDtStart()), TemporalType.DATE);
            query.setParameter(2, java.sql.Date.valueOf(params.getDtEnd()), TemporalType.DATE);
            query.setParameter(3, params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            List<Tuple> list = query.getResultList();
            for (Tuple tuple : list) {
                TvaDTO o = new TvaDTO();
                o.setMontantTtc(tuple.get("montantTTC", BigDecimal.class).longValue());
                o.setMontantHt(tuple.get("montantUg", BigDecimal.class).longValue());
                o.setTaux(tuple.get("valeurTva", Integer.class));
                o.setLocalOperation(LocalDate.parse(tuple.get("dateOperation").toString()));
                tvas.add(o);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "", e);
        }
        return tvas;
    }

    private List<TvaDTO> findTvaVnoGroupByDayDatas(Params params) {
        List<TvaDTO> tvas = new ArrayList<>();
        try {
            Query query = getEntityManager().createNativeQuery(
                    "SELECT SUM(p.int_PRICE) AS montantTTC,SUM(p.int_UG*p.int_PRICE_UNITAIR) AS montantUg,p.valeurTva AS valeurTva,DATE(o.dt_UPDATED) AS dateOperation FROM t_preenregistrement_detail p,t_preenregistrement o,t_user u WHERE o.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID"
                            + " AND o.b_IS_CANCEL=0 AND o.int_PRICE>0 AND o.lg_TYPE_VENTE_ID <> '5' AND o.str_STATUT='is_Closed' AND DATE(o.dt_UPDATED) BETWEEN ?1 AND ?2 AND o.lg_USER_ID=u.lg_USER_ID AND u.lg_EMPLACEMENT_ID=?3  AND o.str_TYPE_VENTE='VNO'  GROUP BY p.valeurTva ,DATE(o.dt_UPDATED)"
                            + " ",
                    Tuple.class);
            query.setParameter(1, java.sql.Date.valueOf(params.getDtStart()), TemporalType.DATE);
            query.setParameter(2, java.sql.Date.valueOf(params.getDtEnd()), TemporalType.DATE);
            query.setParameter(3, params.getOperateur().getLgEMPLACEMENTID().getLgEMPLACEMENTID());
            List<Tuple> list = query.getResultList();
            for (Tuple tuple : list) {
                TvaDTO o = new TvaDTO();
                o.setMontantTtc(tuple.get("montantTTC", BigDecimal.class).longValue());
                o.setMontantHt(tuple.get("montantUg", BigDecimal.class).longValue());
                o.setTaux(tuple.get("valeurTva", Integer.class));
                o.setLocalOperation(LocalDate.parse(tuple.get("dateOperation").toString()));
                tvas.add(o);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "", e);
        }
        return tvas;
    }
}
