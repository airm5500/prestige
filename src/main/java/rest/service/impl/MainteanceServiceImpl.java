package rest.service.impl;

import com.google.common.collect.HashBiMap;
import commonTasks.dto.MontantAPaye;
import commonTasks.dto.TiersPayantParams;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TGrossiste;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import org.apache.commons.collections4.CollectionUtils;
import org.json.JSONObject;
import rest.service.MainteanceService;
import rest.service.SalesNetComputingService;
import rest.service.dto.DoublonsDTO;
import util.DateUtil;
import util.FunctionUtils;

/**
 *
 * @author koben
 */
@Stateless
public class MainteanceServiceImpl implements MainteanceService {

    private static final Logger LOG = Logger.getLogger(MainteanceServiceImpl.class.getName());

    private static final String GROSSISTE_PRODUIT_UNIQUE_CONSTRAINT_REMOVE = " ALTER TABLE t_famille_grossiste DROP CONSTRAINT  un_gros_ci";
    private static final String GROSSISTE_PRODUIT_UNIQUE_CONSTRAINT_QUERY = "ALTER TABLE t_famille_grossiste ADD  CONSTRAINT  const_gros_produit UNIQUE (lg_FAMILLE_ID,lg_GROSSISTE_ID)";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SalesNetComputingService computingService;

    private List<DoublonsDTO> familleProduit(Tuple tuple) {

        return this.em.createQuery(
                "SELECT o FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND o.lgGROSSISTEID.lgGROSSISTEID=?2",
                TFamilleGrossiste.class).setParameter(1, tuple.get("produitId", String.class))
                .setParameter(2, tuple.get("grossisteId", String.class)).getResultList().stream()
                .map(this::buildDoublon).collect(Collectors.toList());
    }

    @Override
    public JSONObject getDoublonsFamilleGrossistes() {
        List<DoublonsDTO> list = fetchDoublonsFamilleGrossistes();
        list.sort(Comparator.comparing(DoublonsDTO::getProduitId));
        return FunctionUtils.returnData(list, list.size());
    }

    private List<DoublonsDTO> fetchDoublonsFamilleGrossistes() {
        List<DoublonsDTO> list = new ArrayList<>();
        try {
            ((List<Tuple>) em.createNativeQuery(
                    "SELECT COUNT(f.lg_FAMILLE_ID) AS produit_count, f.lg_FAMILLE_ID AS produitId,f.lg_GROSSISTE_ID AS grossisteId FROM t_famille_grossiste f,t_famille p WHERE f.lg_FAMILLE_ID=p.lg_FAMILLE_ID  GROUP BY f.lg_FAMILLE_ID,f.lg_GROSSISTE_ID HAVING  produit_count>1",
                    Tuple.class).getResultList()).forEach(t -> list.addAll(familleProduit(t)));

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
        return list;
    }

    private DoublonsDTO buildDoublon(TFamilleGrossiste familleGrossiste) {
        TFamille famille = familleGrossiste.getLgFAMILLEID();
        TGrossiste grossiste = familleGrossiste.getLgGROSSISTEID();
        return DoublonsDTO.builder().cip(famille.getIntCIP()).libelle(famille.getStrNAME())
                .produitId(famille.getLgFAMILLEID().concat(grossiste.getLgGROSSISTEID()))
                .statut("enable".equals(familleGrossiste.getStrSTATUT()) ? "Actif" : "Désactivé")
                .codeProduit(familleGrossiste.getStrCODEARTICLE()).id(familleGrossiste.getLgFAMILLEGROSSISTEID())
                .libelleGrossiste(familleGrossiste.getLgGROSSISTEID().getStrLIBELLE())
                .prixAchat(familleGrossiste.getIntPAF()).prixUnitaire(familleGrossiste.getIntPRICE())
                .dateCreation(DateUtil.convertDateToDD_MM_YYYY_HH_mm(familleGrossiste.getDtCREATED()))
                .dateModification(DateUtil.convertDateToDD_MM_YYYY_HH_mm(familleGrossiste.getDtUPDATED())).build();
    }

    @Override
    public void remove(Set<String> ids) {
        ids.stream().forEach(this::remoteFamilleGrossiste);
    }

    @Override
    public void remoteFamilleGrossiste(String id) {
        this.em.remove(this.em.find(TFamilleGrossiste.class, id));
    }

    private void removeOldConstraint() {
        this.em.createNativeQuery(GROSSISTE_PRODUIT_UNIQUE_CONSTRAINT_REMOVE).executeUpdate();

    }

    private void addNexConstraint() {
        this.em.createNativeQuery(GROSSISTE_PRODUIT_UNIQUE_CONSTRAINT_QUERY).executeUpdate();

    }

    @Override
    public void addConstraint() throws Exception {
        List<DoublonsDTO> list = fetchDoublonsFamilleGrossistes();
        if (CollectionUtils.isNotEmpty(list)) {
            throw new Exception("Il existe encore des doublons non supprimés");
        }
        removeOldConstraint();
        addNexConstraint();
    }

    @Override
    public int updateVoAmount() {
        AtomicInteger count = new AtomicInteger(0);
        try {

            ((List<Tuple>) em.createNativeQuery(
                    "SELECT  distinct pr.lg_PREENREGISTREMENT_ID FROM t_preenregistrement_compte_client_tiers_payent p JOIN t_preenregistrement pr ON pr.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID WHERE RIGHT(CAST(p.int_PERCENT AS CHAR), 1) IN ('1','2', '3','4','6', '7', '9') AND    pr.str_STATUT='is_Closed' AND pr.dt_CREATED > '2025-09-01'  AND p.str_STATUT_FACTURE='unpaid'  AND pr.b_IS_CANCEL =FALSE AND pr.int_PRICE >0",
                    Tuple.class).getResultList()).forEach(t -> {
                        count.incrementAndGet();
                        String idVente = t.get(0, String.class);
                        TPreenregistrement preenregistrement = em.find(TPreenregistrement.class, idVente);

                        List<TPreenregistrementCompteClientTiersPayent> compteClientTiersPayents = new ArrayList<>(
                                preenregistrement.getTPreenregistrementCompteClientTiersPayentCollection());

                        Map<String, List<TiersPayantParams>> tpsBons = new HashMap<>();
                        for (TPreenregistrementCompteClientTiersPayent compteClientTiersPayent : compteClientTiersPayents) {

                            int lastDigit = compteClientTiersPayent.getIntPERCENT() % 10;
                            int finalTaux = compteClientTiersPayent.getIntPERCENT();

                            if (lastDigit == 4) {
                                finalTaux += 1;
                            } else if (lastDigit < 4) {
                                finalTaux -= lastDigit;
                            } else if (lastDigit == 6) {
                                finalTaux -= 1;
                            } else if (lastDigit == 7) {
                                finalTaux -= 2;
                            } else if (lastDigit == 8) {
                                finalTaux += 2;
                            } else if (lastDigit == 9) {
                                finalTaux += 1;
                            }

                            TiersPayantParams params = new TiersPayantParams();
                            params.setLgCOMPTECLIENTID(compteClientTiersPayent.getLgCOMPTECLIENTTIERSPAYANTID()
                                    .getLgCOMPTECLIENTTIERSPAYANTID());
                            params.setNumBon(compteClientTiersPayent.getStrREFBON());
                            params.setTaux(finalTaux);
                            params.setCompteTp(params.getLgCOMPTECLIENTID());
                            compteClientTiersPayent.setIntPERCENT(finalTaux);
                            tpsBons.put(params.getCompteTp(), List.of(params));
                        }

                        computingService.calculeRepair(preenregistrement, compteClientTiersPayents, tpsBons);

                    });

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);

        }
        return count.get();
    }

}
