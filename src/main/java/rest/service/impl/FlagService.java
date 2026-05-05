/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.FlagDTO;
import dal.Flag;
import dal.MvtTransaction;
import dal.TPreenregistrement;
import dal.TPreenregistrement_;
import dal.TReglement;
import dal.TUser;
import dal.VenteReglement;
import dal.enumeration.TypeTransaction;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.StringJoiner;
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
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.tuple.Pair;
import org.json.JSONObject;
import rest.service.CaisseService;
import util.Constant;
import util.DateConverter;
import util.NumberUtils;

/**
 *
 * @author koben
 */
@Stateless
public class FlagService {

    private static final Logger LOG = Logger.getLogger(FlagService.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private CaisseService caisseService;

    public EntityManager getEntityManager() {
        return em;
    }

    public List<FlagDTO> listFlags() {
        try {
            TypedQuery<Flag> q = getEntityManager().createNamedQuery("Flag.findAll", Flag.class);
            return q.getResultList().stream().map(FlagDTO::new).collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    /**
     * On verifie que sur la periode on n' a pas dejà ponctionné sur certaines dates Sinon on sauvegarde le montant à
     * retirer
     *
     * @param finalPrice
     * @param dtstart
     * @param datetEnd
     *
     * @return
     */
    private Pair<Boolean, Flag> updateFlag(LocalDate dtSt, LocalDate dtEnd) {
        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyyMMdd");

        List<String> errors = new ArrayList<>();
        StringJoiner joiner = new StringJoiner(", ");
        dtSt.datesUntil(dtEnd).forEach(d -> {
            joiner.add(d.toString());
            if (!verificationDate(d)) {
                errors.add(d.toString());
            }
        });
        joiner.add(dtEnd.toString());
        if (!verificationDate(dtEnd)) {
            errors.add(dtEnd.toString());
        }
        if (!errors.isEmpty()) {
            return Pair.of(true, null);
        }
        Flag flag = new Flag();
        flag.setInterval(joiner.toString());

        flag.setId(dtSt.format(dateTimeFormatter).concat(dtEnd.format(dateTimeFormatter)));
        flag.setDateStart(Integer.valueOf(dtSt.format(dateTimeFormatter)));
        flag.setDateEnd(Integer.valueOf(dtEnd.format(dateTimeFormatter)));
        return Pair.of(false, flag);
    }

    private boolean verificationDate(LocalDate dtSt) {
        TypedQuery<Flag> q = getEntityManager().createNamedQuery("Flag.checkDate", Flag.class);
        q.setParameter(1, "%" + dtSt.toString() + "%");
        return q.getResultList().isEmpty();

    }

    /**
     *
     * @param dtStart
     * @param dtEnd
     *
     * @param virtualAmount
     *            montant saisi directeement depuis UI
     *
     * @return
     */
    public JSONObject ponctionnerMontant(String dtStart, String dtEnd, int virtualAmount) {

        JSONObject json = new JSONObject();
        try {

            LocalDate dtSt = LocalDate.parse(dtStart);
            LocalDate dtEn = LocalDate.parse(dtEnd);

            // Vérification des dates déjà traitées
            Pair<Boolean, Flag> pair = updateFlag(dtSt, dtEn);
            if (pair.getLeft()) {
                return buildError(json, "Certaines dates sont incluses dans des traitements déjà effectués");
            }
            Flag flag = pair.getRight();
            flag.setMontant(0);
            em.persist(flag);

            int ventesImpactees = 0;
            int start = 0;
            final int max = 1000;
            int totalMontantPreleve = 0;

            while (virtualAmount > 0) {

                List<Object[]> list = caisseService.getVenteReglements(dtSt, dtEn, start, max);

                if (list.isEmpty()) {
                    break;
                }

                for (Object[] row : list) {

                    int montantEspece = ((Number) row[0]).intValue();// Meilleure perf que row[0]+""
                    String idReglement = (String) row[1];
                    String idVente = (String) row[2];
                    String idMvTransaction = (String) row[3];

                    if (montantEspece <= 0) {
                        continue;
                    }

                    int netPercent = (virtualAmount * 100) / montantEspece;

                    int tauxPonction = netPercent >= 100 ? 35 : netPercent > 6 ? 30 : 0;

                    if (tauxPonction == 0) {
                        continue;
                    }

                    int montantPonctionMax = NumberUtils.arrondirAuMultipleDe5((montantEspece * tauxPonction) / 100);

                    int montantPreleve = Math.min(virtualAmount, montantPonctionMax);
                    // Chargement des entités
                    TPreenregistrement vente = em.find(TPreenregistrement.class, idVente);
                    MvtTransaction mt = em.find(MvtTransaction.class, idMvTransaction);
                    VenteReglement vr = em.find(VenteReglement.class, idReglement);
                    vente.setIntACCOUNT(montantPreleve);
                    vente.setIntPRICEOTHER(montantPreleve);

                    mt.setMontantAcc(montantPreleve);
                    mt.setFlaged(true);
                    mt.setFlag(flag);

                    vr.setFlagId(flag.getId());
                    vr.setFlagedAmount(montantPreleve);
                    em.merge(vente);
                    em.merge(mt);
                    em.merge(vr);
                    totalMontantPreleve += montantPreleve;

                    ventesImpactees++;
                    virtualAmount -= montantPreleve;

                    if (virtualAmount <= 0) {
                        break;
                    }
                }

                start += max;
            }
            flag.setMontant(totalMontantPreleve);
            em.merge(flag);

            json.put("success", true);
            json.put("nb", ventesImpactees + " ventes impactées");

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            json.put("success", false);
            json.put("nb", 0 + " ventes impactées");
        }
        return json;
    }

    private JSONObject buildError(JSONObject json, String message) {
        json.put("success", false);
        json.put("nb", "0 ventes impactées");
        json.put("msg", message);
        return json;
    }

    public MvtTransaction findByVenteId(String venteId) {
        try {
            TypedQuery<MvtTransaction> q = getEntityManager()
                    .createQuery("SELECT o FROM  MvtTransaction o WHERE o.pkey=?1", MvtTransaction.class);
            q.setMaxResults(1);
            q.setParameter(1, venteId);
            return q.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    private List<MvtTransaction> findByFlagId(String id) {
        try {
            TypedQuery<MvtTransaction> q = getEntityManager()
                    .createQuery("SELECT o FROM  MvtTransaction o WHERE o.flag.id= ?1", MvtTransaction.class);
            q.setParameter(1, id);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    public void upadte(String flagId) {
        findByFlagId(flagId).forEach(e -> {
            e.setFlaged(Boolean.FALSE);
            e.setMontantAcc(0);
            e.setFlag(null);
            getEntityManager().merge(e);
            TPreenregistrement preenregistrement = e.getPreenregistrement();
            preenregistrement.setIntPRICEOTHER(preenregistrement.getIntPRICE());
            preenregistrement.setIntACCOUNT(preenregistrement.getIntPRICE());
            em.merge(preenregistrement);
            getVenteReglementsByFlagId(flagId).forEach(vr -> {
                vr.setFlagId(null);
                vr.setFlagedAmount(0);
                em.merge(vr);
            });
        });
        getEntityManager().remove(getEntityManager().find(Flag.class, flagId));
    }

    public boolean getKeyParams() {
        return caisseService.getKeyParams();
    }

    public JSONObject getMontantCa(String dtStart, String dtEnd) {
        if (!getKeyParams()) {
            return new JSONObject().put("montantCa", 0).put("success", false);
        }
        return new JSONObject()
                .put("montantCa", caisseService.getMontantCa(LocalDate.parse(dtStart), LocalDate.parse(dtEnd)))
                .put("success", true);
    }

    private List<VenteReglement> getVenteReglementsByFlagId(String flagId) {
        return em.createQuery("SELECT o FROM  VenteReglement o WHERE o.flagId=?1", VenteReglement.class)
                .setParameter(1, flagId).getResultList();
    }
}
