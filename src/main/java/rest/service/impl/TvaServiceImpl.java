/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.TvaDTO;
import dal.TParameters;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TemporalType;
import javax.persistence.Tuple;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.TvaService;

/**
 *
 * @author koben
 */
@Stateless
public class TvaServiceImpl implements TvaService {

    private static final Logger LOG = Logger.getLogger(TvaServiceImpl.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private EntityManager getEntityManager() {
        return em;
    }

    @Override
    public JSONObject tvaData(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId) {
        List<TvaDTO> datas = tva(dtStart, dtEnd, checked, emplacementId);
        JSONObject json = new JSONObject();
        json.put("total", datas.size());
        json.put("data", new JSONArray(datas));
        return json;
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
    public List<TvaDTO> tva(LocalDate dtStart, LocalDate dtEnd, boolean checked, String emplacementId) {
        List<TvaDTO> data = new ArrayList<>();
        List<TvaDTO> vno = tvaVnoData(dtStart, dtEnd);
        List<TvaDTO> voNonExclusDuCa = tvaVoData(dtStart, dtEnd, checked, emplacementId);
        Stream.of(vno, voNonExclusDuCa).flatMap(x -> x.stream()).collect(Collectors.groupingBy(TvaDTO::getTaux))
                .forEach((k, v) -> {
                    TvaDTO o = new TvaDTO();
                    long montantTTC = v.stream().mapToLong(TvaDTO::getMontantTtc).reduce(0, Long::sum);

                    Double valeurTva = 1 + (Double.valueOf(k) / 100);
                    long htAmont = (long) Math.ceil(montantTTC / valeurTva);
                    long montantTva = montantTTC - htAmont;
                    o.setMontantHt(htAmont);
                    o.setMontantTva(montantTva);
                    o.setMontantTtc(montantTTC);
                    o.setTaux(k);
                    data.add(o);
                });
        data.sort(Comparator.comparing(TvaDTO::getTaux));
        return data;
    }

    private List<TvaDTO> tvaVoData(LocalDate dtStart, LocalDate dtEnd, boolean to_be_exclude, String emplacementId) {
        try {
            List<Tuple> list = getEntityManager().createNativeQuery(
                    "SELECT SUM(d.int_PRICE) AS montantTTC,d.valeurTva  FROM  t_preenregistrement_detail d,t_preenregistrement p,t_client c,t_compte_client cp,t_tiers_payant tp,t_compte_client_tiers_payant ccp WHERE p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID "
                            + " AND p.lg_CLIENT_ID=c.lg_CLIENT_ID AND p.str_TYPE_VENTE='VO' AND p.b_IS_CANCEL=0 AND p.int_PRICE >0 AND p.lg_TYPE_VENTE_ID <>'5' AND p.str_STATUT='is_Closed' AND c.lg_CLIENT_ID=cp.lg_CLIENT_ID AND "
                            + " cp.lg_COMPTE_CLIENT_ID=ccp.lg_COMPTE_CLIENT_ID AND tp.lg_TIERS_PAYANT_ID=ccp.lg_TIERS_PAYANT_ID AND tp.to_be_exclude=?1 AND DATE(p.dt_UPDATED) BETWEEN ?2 AND ?3 GROUP BY d.valeurTva ",
                    Tuple.class).setParameter(1, to_be_exclude)
                    .setParameter(2, java.sql.Date.valueOf(dtStart), TemporalType.DATE)
                    .setParameter(3, java.sql.Date.valueOf(dtEnd), TemporalType.DATE).getResultList();

            return list.stream().map(t -> new TvaDTO(t.get(1, Integer.class), t.get(0, BigDecimal.class)))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }

    }

    private List<TvaDTO> tvaVnoData(LocalDate dtStart, LocalDate dtEnd) {
        try {
            List<Tuple> list = getEntityManager().createNativeQuery(
                    "SELECT SUM(d.int_PRICE) AS montantTTC,d.valeurTva  FROM  t_preenregistrement_detail d,t_preenregistrement p WHERE p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID "
                            + "  AND p.str_TYPE_VENTE='VNO' AND p.b_IS_CANCEL=0 AND p.int_PRICE >0 AND p.lg_TYPE_VENTE_ID <>'5' AND p.str_STATUT='is_Closed' "
                            + "  AND DATE(p.dt_UPDATED) BETWEEN ?1 AND ?2 GROUP BY d.valeurTva ",
                    Tuple.class).setParameter(1, java.sql.Date.valueOf(dtStart), TemporalType.DATE)
                    .setParameter(2, java.sql.Date.valueOf(dtEnd), TemporalType.DATE).getResultList();

            return list.stream().map(t -> new TvaDTO(t.get(1, Integer.class), t.get(0, BigDecimal.class)))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }

    }

}
