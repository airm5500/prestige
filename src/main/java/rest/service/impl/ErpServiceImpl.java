/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.ErProduitDTO;
import commonTasks.dto.ErpAchatFournisseurDTO;
import commonTasks.dto.ErpCaComptant;
import commonTasks.dto.ErpFactureDTO;
import commonTasks.dto.ErpFournisseur;
import commonTasks.dto.ErpReglementDTO;
import commonTasks.dto.ErpTiersPayant;
import commonTasks.dto.ErpTiersPayantDTO;
import commonTasks.dto.StockDailyValueDTO;
import commonTasks.ws.ClientTiersPayantDTO;
import commonTasks.ws.CustomerDTO;
import commonTasks.ws.GroupeTiersPayantDTO;
import commonTasks.ws.TiersPayantDto;
import commonTasks.ws.WsCaAchatVente;
import commonTasks.ws.WsCaAchatVenteDTO;
import dal.StockDailyValue;
import dal.TAyantDroit;
import dal.TClient;
import dal.TCompteClientTiersPayant;
import dal.TDossierReglement;
import dal.TFacture;
import dal.TGroupeTierspayant;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TReglement;
import dal.TTiersPayant;
import dal.TTypeClient;
import dal.TTypeTiersPayant;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TemporalType;
import javax.persistence.Tuple;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Root;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.math.NumberUtils;
import rest.service.ErpService;
import util.DateConverter;
import util.DateUtil;
import static util.DateUtil.convertStringToDate;
import static util.DateUtil.validationDate;

/**
 *
 * @author koben
 */
@Stateless
public class ErpServiceImpl implements ErpService {

    private static final Logger LOG = Logger.getLogger(ErpServiceImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public StockDailyValueDTO valorisation(String day) {
        try {
            StockDailyValue sdv = getEntityManager().find(StockDailyValue.class,
                    Integer.valueOf(LocalDate.parse(day).format(DateTimeFormatter.ofPattern("yyyyMMdd"))));
            return new StockDailyValueDTO(sdv);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "valorisation =====>>", e);
            return new StockDailyValueDTO();
        }
    }

    /* Valorisation periode */
    @Override
    public List<StockDailyValueDTO> valorisationAll(String dtStart, String dtEnd) {
        try {
            // Conversion des dates en format numérique attendu par l'ID
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");

            // LocalDate startDate1 = convertStringToDate(dtStart);
            // LocalDate endDate2 = convertStringToDate(dtEnd);

            LocalDate startDate = LocalDate.parse(dtStart);
            LocalDate endDate = LocalDate.parse(dtEnd);

            Integer startId = Integer.parseInt(startDate.format(formatter));
            Integer endId = Integer.parseInt(endDate.format(formatter));

            validationDate(startDate, endDate);
            System.out.println("Les dates sont dans le bon ordre");

            // Création de la requête avec paramètres typés
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<StockDailyValue> cq = cb.createQuery(StockDailyValue.class);
            Root<StockDailyValue> root = cq.from(StockDailyValue.class);

            cq.select(root).where(cb.between(root.get("id"), startId, endId)).orderBy(cb.asc(root.get("id")));

            // Exécution et conversion en DTO
            return em.createQuery(cq).getResultList().stream().map(StockDailyValueDTO::new)
                    .collect(Collectors.toList());

        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("Format de date invalide. Utilisez le format yyyy-MM-dd");
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Erreur de conversion de la date en ID numérique");
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la récupération des données", e);
        }
    }

    @Override
    public List<ErpCaComptant> caComptant(String dtStart, String dtEnd) {
        try {
            List<Tuple> list = getEntityManager().createNativeQuery(
                    "SELECT SUM(m.montantRegle) AS MONTANTREGLE,SUM(m.montantPaye) AS MONTANTPAYE, SUM(m.montantRemise) AS montantRemise, SUM(m.montantTva) as montantTva,m.mvtdate,m.typeReglementId FROM mvttransaction m where m.checked=1 AND (m.typeTransaction=0 OR m.typeTransaction=1) AND m.lg_EMPLACEMENT_ID='1' AND DATE(m.mvtdate) BETWEEN ?1 AND ?2 GROUP BY m.mvtdate,m.typeReglementId",
                    Tuple.class).setParameter(1, LocalDate.parse(dtStart)).setParameter(2, LocalDate.parse(dtEnd))
                    .getResultList();
            List<ErpCaComptant> caComptants = new ArrayList<>();
            list.stream().map(t -> {
                // long montantRegle = t.get(0, BigDecimal.class).longValue();
                long montantPaye = t.get(1, BigDecimal.class).longValue();
                long montantRemise = t.get(2, BigDecimal.class).longValue();
                long montantTva = t.get(3, BigDecimal.class).longValue();
                LocalDate mvtDate = t.get(4, java.sql.Date.class).toLocalDate();
                String typeReglementId = t.get(5, String.class);
                ErpCaComptant caComptant = new ErpCaComptant();
                caComptant.setMode(typeReglementId);
                caComptant.setTotEsp(montantPaye);
                caComptant.setRemiseSurCA(montantRemise);
                caComptant.setTotTVA(montantTva);
                caComptant.setMvtDate(mvtDate.format(DateTimeFormatter.ofPattern("yyyyMMdd")));
                return caComptant;
            }).forEachOrdered(caComptant -> {
                caComptants.add(caComptant);
            });
            List<ErpCaComptant> caComptants2 = new ArrayList<>();
            Map<String, List<ErpCaComptant>> map = caComptants.stream()
                    .collect(Collectors.groupingBy(ErpCaComptant::getMvtDate));
            map.forEach((k, v) -> {
                ErpCaComptant caComptant = new ErpCaComptant();
                caComptant.setMvtDate(k);
                v.forEach(e -> {
                    caComptant.setRemiseSurCA(caComptant.getRemiseSurCA() + e.getRemiseSurCA());
                    caComptant.setTotTVA(caComptant.getTotTVA() + e.getTotTVA());
                    switch (e.getMode()) {
                    case DateConverter.MODE_ESP:
                        caComptant.setTotEsp(caComptant.getTotEsp() + e.getTotEsp());
                        break;
                    case DateConverter.MODE_CHEQUE:
                        caComptant.setTotChq(caComptant.getTotChq() + e.getTotEsp());
                        break;
                    case DateConverter.MODE_CB:
                        caComptant.setTotCB(caComptant.getTotCB() + e.getTotEsp());
                        break;
                    case DateConverter.MODE_VIREMENT:
                        caComptant.setTotVirement(caComptant.getTotVirement() + e.getTotEsp());
                        break;
                    case DateConverter.MODE_MOOV:
                    case DateConverter.TYPE_REGLEMENT_ORANGE:
                    case DateConverter.MODE_MTN:
                    case DateConverter.MODE_WAVE:
                    case DateConverter.MODE_DJAMO:
                        caComptant.setTotMobile(caComptant.getTotMobile() + e.getTotEsp());
                        break;
                    default:
                        break;
                    }
                });

                caComptants2.add(caComptant);
            });
            return caComptants2;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "caComptant =====>>", e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ErpCaComptant> caAll(String dtStart, String dtEnd) {
        try {
            List<Tuple> list = getEntityManager().createNativeQuery(
                    "SELECT SUM(m.montantCredit) AS montantCredit, sum(v.montant_attentu) AS montantVerse, SUM(m.montantRemise) AS montantRemise, SUM(m.montantTva) as montantTva,m.mvtdate,v.type_regelement FROM mvttransaction m, vente_reglement v where m.vente_id=v.vente_id AND m.checked=1 AND (m.typeTransaction=0 OR m.typeTransaction=1) AND m.lg_EMPLACEMENT_ID='1' AND DATE(m.mvtdate) BETWEEN ?1 AND ?2 GROUP BY m.mvtdate,v.type_regelement",
                    Tuple.class).setParameter(1, LocalDate.parse(dtStart)).setParameter(2, LocalDate.parse(dtEnd))
                    .getResultList();
            List<ErpCaComptant> caComptants = new ArrayList<>();
            list.stream().map(t -> {
                long montantCredit = t.get("montantCredit", BigDecimal.class).longValue();
                long montantPaye = t.get("montantVerse", BigDecimal.class).longValue();
                long montantRemise = t.get("montantRemise", BigDecimal.class).longValue();
                long montantTva = t.get("montantTva", BigDecimal.class).longValue();
                LocalDate mvtDate = t.get("mvtdate", java.sql.Date.class).toLocalDate();
                String type_regelement = t.get("type_regelement", String.class);
                ErpCaComptant caComptant = new ErpCaComptant();
                caComptant.setMode(type_regelement);
                caComptant.setTotEsp(montantPaye);
                caComptant.setRemiseSurCA(montantRemise);
                caComptant.setTotTVA(montantTva);
                caComptant.setMvtDate(mvtDate.format(DateTimeFormatter.ofPattern("yyyyMMdd")));
                caComptant.setMontantCredit(montantCredit);
                return caComptant;
            }).forEachOrdered(caComptant -> {
                caComptants.add(caComptant);
            });
            List<ErpCaComptant> caComptants2 = new ArrayList<>();
            Map<String, List<ErpCaComptant>> map = caComptants.stream()
                    .collect(Collectors.groupingBy(ErpCaComptant::getMvtDate));
            map.forEach((k, v) -> {
                ErpCaComptant caComptant = new ErpCaComptant();
                caComptant.setMvtDate(k);

                v.forEach(e -> {
                    caComptant.setRemiseSurCA(caComptant.getRemiseSurCA() + e.getRemiseSurCA());
                    caComptant.setTotTVA(caComptant.getTotTVA() + e.getTotTVA());
                    caComptant.setMontantCredit(caComptant.getMontantCredit() + e.getMontantCredit());
                    switch (e.getMode()) {
                    case DateConverter.MODE_ESP:
                        caComptant.setTotEsp(caComptant.getTotEsp() + e.getTotEsp());
                        break;
                    case DateConverter.MODE_CHEQUE:
                        caComptant.setTotChq(caComptant.getTotChq() + e.getTotEsp());
                        break;
                    case DateConverter.MODE_CB:
                        caComptant.setTotCB(caComptant.getTotCB() + e.getTotEsp());
                        break;
                    case DateConverter.MODE_VIREMENT:
                        caComptant.setTotVirement(caComptant.getTotVirement() + e.getTotEsp());
                        break;
                    case DateConverter.MODE_MOOV:
                    case DateConverter.TYPE_REGLEMENT_ORANGE:
                    case DateConverter.MODE_MTN:
                    case DateConverter.MODE_WAVE:
                    case DateConverter.MODE_DJAMO:
                        caComptant.setTotMobile(caComptant.getTotMobile() + e.getTotEsp());
                        break;
                    default:
                        break;
                    }
                });

                caComptants2.add(caComptant);
            });
            return caComptants2;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "caComptant =====>>", e);
            return Collections.emptyList();
        }
    }

    private List<TPreenregistrementCompteClientTiersPayent> nonFactures(String dtStart, String dtEnd) {
        try {
            TypedQuery<TPreenregistrementCompteClientTiersPayent> q = getEntityManager().createQuery(
                    "SELECT o FROM TPreenregistrementCompteClientTiersPayent o WHERE o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND o.lgPREENREGISTREMENTID.intPRICE >0 AND FUNCTION('DATE',o.lgPREENREGISTREMENTID.dtCREATED) BETWEEN ?1 AND ?2 AND o.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID NOT IN (SELECT s.strREF FROM TFactureDetail s  )",
                    TPreenregistrementCompteClientTiersPayent.class);
            q.setParameter(1, java.sql.Date.valueOf(dtStart), TemporalType.DATE);
            q.setParameter(2, java.sql.Date.valueOf(dtEnd), TemporalType.DATE);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "nonFactures =====>>", e);
            return Collections.emptyList();
        }
    }

    private List<Tuple> factures(String dtStart, String dtEnd) {
        try {
            return getEntityManager().createQuery(
                    "SELECT o,f.lgFACTUREID FROM TPreenregistrementCompteClientTiersPayent o,TFactureDetail f WHERE o.lgPREENREGISTREMENTID.strSTATUT='is_Closed' AND o.lgPREENREGISTREMENTID.bISCANCEL=FALSE AND o.lgPREENREGISTREMENTID.intPRICE >0 AND FUNCTION('DATE',o.lgPREENREGISTREMENTID.dtCREATED) BETWEEN ?1 AND ?2 AND o.lgPREENREGISTREMENTCOMPTECLIENTPAYENTID =f.strREF",
                    Tuple.class).setParameter(1, java.sql.Date.valueOf(dtStart), TemporalType.DATE)
                    .setParameter(2, java.sql.Date.valueOf(dtEnd), TemporalType.DATE).getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "factures =====>>", e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ErpTiersPayantDTO> rrpTiersPayant(String dtStart, String dtEnd) {
        List<ErpTiersPayantDTO> datas = new ArrayList<>();
        datas.addAll(nonFactures(dtStart, dtEnd).stream().map(ErpTiersPayantDTO::new).collect(Collectors.toList()));
        List<Tuple> list = factures(dtStart, dtEnd);
        list.forEach(t -> {
            TPreenregistrementCompteClientTiersPayent p = t.get(0, TPreenregistrementCompteClientTiersPayent.class);
            TFacture facture = t.get(1, TFacture.class);
            datas.add(new ErpTiersPayantDTO(p, facture));
        });
        return datas;

    }

    @Override
    public List<ErpReglementDTO> erpReglements(String dtStart, String dtEnd) {
        List<ErpReglementDTO> datas = new ArrayList<>();
        List<Tuple> list = reglements(dtStart, dtEnd);
        list.forEach(t -> {
            TDossierReglement dossierReglement = t.get(0, TDossierReglement.class);
            TReglement reglement = t.get(1, TReglement.class);
            datas.add(new ErpReglementDTO(dossierReglement, reglement, t.get(2, TTiersPayant.class)));
        });
        return datas;
    }

    private List<Tuple> reglements(String dtStart, String dtEnd) {
        try {
            return getEntityManager().createQuery(
                    "SELECT o,f,p FROM TDossierReglement o,TReglement f,TTiersPayant p WHERE  FUNCTION('DATE',o.dtCREATED) BETWEEN ?1 AND ?2 AND o.lgDOSSIERREGLEMENTID =f.strREFRESSOURCE AND o.strORGANISMEID=p.lgTIERSPAYANTID",
                    Tuple.class).setParameter(1, java.sql.Date.valueOf(dtStart), TemporalType.DATE)
                    .setParameter(2, java.sql.Date.valueOf(dtEnd), TemporalType.DATE).getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "reglements =====>>", e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ErpFactureDTO> erpFactures(String dtStart, String dtEnd) {
        List<ErpFactureDTO> datas = new ArrayList<>();
        List<Tuple> list = facturePeriode(dtStart, dtEnd);
        list.forEach(t -> {
            TFacture facture = t.get(0, TFacture.class);
            datas.add(new ErpFactureDTO(facture, t.get(1, TTiersPayant.class)));
        });
        return datas;
    }

    private List<Tuple> facturePeriode(String dtStart, String dtEnd) {
        try {
            return getEntityManager().createQuery(
                    "SELECT f,p FROM TFacture f,TTiersPayant p WHERE  FUNCTION('DATE',f.dtCREATED) BETWEEN ?1 AND ?2 AND f.strCUSTOMER =p.lgTIERSPAYANTID ",
                    Tuple.class).setParameter(1, java.sql.Date.valueOf(dtStart), TemporalType.DATE)
                    .setParameter(2, java.sql.Date.valueOf(dtEnd), TemporalType.DATE).getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "facturePeriode =====>>", e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<ErpFournisseur> fournisseurs() {
        return getEntityManager()
                .createQuery("SELECT new commonTasks.dto.ErpFournisseur(o) FROM TGrossiste o", ErpFournisseur.class)
                .getResultList();
    }

    @Override
    public List<ErProduitDTO> produits() {
        return getEntityManager().createQuery(
                "SELECT new commonTasks.dto.ErProduitDTO(o) FROM TFamilleStock o WHERE o.strSTATUT='enable'",
                ErProduitDTO.class).getResultList();
    }

    @Override
    public List<ErProduitDTO> checkproduit(String nom) {
        if (StringUtils.isEmpty(nom)) {
            nom = "%%";
        } else {
            nom = nom.toUpperCase() + "%";
        }
        System.err.println("checkproduit " + nom);
        TypedQuery<ErProduitDTO> q = getEntityManager().createQuery(
                "SELECT new commonTasks.dto.ErProduitDTO(o) FROM TFamilleStock o WHERE o.strSTATUT='enable' AND "
                        + " (o.lgFAMILLEID.strNAME LIKE ?1 OR o.lgFAMILLEID.intCIP LIKE ?1 ) AND o.lgFAMILLEID.strSTATUT='enable'  ",
                ErProduitDTO.class);
        q.setParameter(1, nom);
        return q.getResultList();
    }

    @Override
    public List<ErpAchatFournisseurDTO> achatsFournisseurs(String dtStart, String dtEnd) {
        return getEntityManager().createQuery(
                "SELECT new commonTasks.dto.ErpAchatFournisseurDTO(o) FROM TBonLivraison  o WHERE o.strSTATUT='is_Closed' AND FUNCTION('DATE',o.dtCREATED) BETWEEN ?1 AND ?2",
                ErpAchatFournisseurDTO.class).setParameter(1, java.sql.Date.valueOf(dtStart), TemporalType.DATE)
                .setParameter(2, java.sql.Date.valueOf(dtEnd), TemporalType.DATE).getResultList();
    }

    @Override
    public List<ErpTiersPayant> allTiersPayants() {
        return getEntityManager()
                .createQuery("SELECT new commonTasks.dto.ErpTiersPayant(o) FROM TTiersPayant o", ErpTiersPayant.class)
                .getResultList();
    }

    @Override
    public List<GroupeTiersPayantDTO> allGroupeTiersPayants() {

        return getEntityManager()
                .createQuery("SELECT new commonTasks.ws.GroupeTiersPayantDTO(o) FROM TGroupeTierspayant o",
                        GroupeTiersPayantDTO.class)
                .getResultList();
    }

    @Override
    public List<TiersPayantDto> allWsTiersPayants() {
        return buildTiersPayant();
    }

    @Override
    public List<CustomerDTO> allWsClients() {
        return buildClients();
    }

    private List<TTiersPayant> findAllTTiersPayants() {
        return getEntityManager()
                .createQuery("SELECT o FROM TTiersPayant o WHERE o.strSTATUT='enable'", TTiersPayant.class)
                .getResultList();
    }

    private List<TAyantDroit> ayantDroitsByClientId(String idClient) {
        return getEntityManager()
                .createQuery("SELECT o FROM TAyantDroit o WHERE o.lgCLIENTID.lgCLIENTID=?1 ", TAyantDroit.class)
                .setParameter(1, idClient).getResultList();
    }

    private List<TClient> clients(int start, int limit) {
        return getEntityManager()
                .createQuery("SELECT o  FROM TClient o WHERE o.strSTATUT='enable'  ORDER BY o.strCODEINTERNE ASC",
                        TClient.class)
                .setFirstResult(start).setMaxResults(limit).getResultList();
    }

    /*
     * private List<TFamille> produits(int start, int limit) { return getEntityManager()
     * .createQuery("SELECT o  FROM TFamille o WHERE o.strSTATUT='enable'  ORDER BY o.strNAME ASC", TFamille.class)
     * .setFirstResult(start).setMaxResults(limit).getResultList(); }
     */
    private List<TCompteClientTiersPayant> compteClientTiersPayantByTiersPayant(String clientId) {
        return getEntityManager().createQuery(
                "SELECT o FROM TCompteClientTiersPayant o WHERE  o.lgCOMPTECLIENTID.lgCLIENTID.lgCLIENTID=?1 ",
                TCompteClientTiersPayant.class).setParameter(1, clientId).getResultList();
    }

    private List<CustomerDTO> buildAyantDroits(String idClient, String numAssure) {
        List<CustomerDTO> customers = new ArrayList<>();
        List<TAyantDroit> ayantDroits = ayantDroitsByClientId(idClient);
        for (TAyantDroit ayantDroit : ayantDroits) {
            if (idClient.equals(ayantDroit.getLgAYANTSDROITSID()) || StringUtils.isEmpty(numAssure)
                    || numAssure.equals(ayantDroit.getStrNUMEROSECURITESOCIAL())
                    || !ayantDroit.getStrSTATUT().equalsIgnoreCase("enable")) {
                continue;
            }
            CustomerDTO o = new CustomerDTO();
            o.setUniqueId(ayantDroit.getLgAYANTSDROITSID());
            o.setCode(ayantDroit.getStrCODEINTERNE());
            o.setDatNaiss(fromDate(ayantDroit.getDtNAISSANCE()));
            o.setFirstName(ayantDroit.getStrFIRSTNAME());
            o.setLastName(ayantDroit.getStrLASTNAME());
            o.setNumAyantDroit(ayantDroit.getStrNUMEROSECURITESOCIAL());
            o.setSexe(ayantDroit.getStrSEXE());
            o.setType("ASSURE");
            customers.add(o);

        }
        return customers;

    }

    private List<CustomerDTO> buildClients() {
        List<CustomerDTO> customers = new ArrayList<>();
        LocalDateTime startAt = LocalDateTime.now();
        System.out.println("startAt at " + startAt.toString());
        // long count=clientsCount();
        long count = 5000;
        if (count == 0) {
            return Collections.emptyList();
        }

        int start = 0;
        int limit = 100;
        while (start < count) {
            List<TClient> clients = clients(start, limit);
            for (TClient client : clients) {
                CustomerDTO o = new CustomerDTO();
                o.setUniqueId(client.getLgCLIENTID());
                o.setCode(client.getStrCODEINTERNE());
                o.setDatNaiss(fromDate(client.getDtNAISSANCE()));
                o.setFirstName(client.getStrFIRSTNAME());
                o.setLastName(client.getStrLASTNAME());
                o.setNumAyantDroit(client.getStrNUMEROSECURITESOCIAL());
                o.setSexe(client.getStrSEXE());
                o.setEmail(client.getEmail());
                if (checkPhoneNumber(client.getStrADRESSE())) {
                    o.setPhone(client.getStrADRESSE());
                }
                TTypeClient tTypeClient = client.getLgTYPECLIENTID();
                if (tTypeClient != null && (tTypeClient.getLgTYPECLIENTID().equals("1")
                        || tTypeClient.getLgTYPECLIENTID().equals("2"))) {
                    o.setTiersPayants(buildClientTiersPayants(o.getUniqueId()));
                    o.setAyantDroits(buildAyantDroits(o.getUniqueId(), o.getNumAyantDroit()));
                }

                if (tTypeClient != null) {
                    if (tTypeClient.getLgTYPECLIENTID().equals("1") || tTypeClient.getLgTYPECLIENTID().equals("2")) {
                        o.setType("ASSURE");
                    } else {
                        o.setType("STANDARD");
                    }
                } else {
                    if (!o.getTiersPayants().isEmpty()) {
                        o.setType("ASSURE");
                    } else {
                        o.setType("STANDARD");
                    }
                }
                customers.add(o);
            }
            start += limit;
        }
        LocalDateTime endAt = LocalDateTime.now();

        return customers;
    }

    private List<ClientTiersPayantDTO> buildClientTiersPayants(String clientId) {
        List<ClientTiersPayantDTO> l = new ArrayList<>();
        List<TCompteClientTiersPayant> clientTiersPayants = compteClientTiersPayantByTiersPayant(clientId);
        for (TCompteClientTiersPayant clientTiersPayant : clientTiersPayants) {
            TTiersPayant payant = clientTiersPayant.getLgTIERSPAYANTID();
            ClientTiersPayantDTO o = new ClientTiersPayantDTO();
            o.setNum(clientTiersPayant.getStrNUMEROSECURITESOCIAL());
            o.setTiersPayantName(payant.getStrNAME());
            int priorite = clientTiersPayant.getIntPRIORITY();
            if (priorite < 0) {
                priorite = (-1) * clientTiersPayant.getIntPRIORITY();
            } else if (priorite > 0 && priorite < 5) {
                priorite--;
            } else if (priorite > 4) {
                priorite = 3;
            }
            o.setPriorite(priorite);
            o.setTaux(clientTiersPayant.getIntPOURCENTAGE());
            if (clientTiersPayant.getDbPLAFONDENCOURS() != null && clientTiersPayant.getDbPLAFONDENCOURS() > 0) {
                o.setPlafondConso(clientTiersPayant.getDbPLAFONDENCOURS().longValue());
            }
            if (clientTiersPayant.getDblQUOTACONSOVENTE() != null && clientTiersPayant.getDblQUOTACONSOVENTE() > 0) {
                o.setPlafondJournalier(clientTiersPayant.getDblQUOTACONSOVENTE().longValue());
            }
            o.setPlafondAbsolu(clientTiersPayant.getBIsAbsolute());
            l.add(o);
        }
        return l;
    }

    private boolean checkPhoneNumber(String phone) {
        if (StringUtils.isEmpty(phone)) {
            return false;
        }
        if (phone.length() < 8) {
            return false;
        }
        return NumberUtils.isCreatable(phone);
    }

    private LocalDate fromDate(Date date) {
        if (date == null) {
            return null;
        }
        return DateConverter.convertDateToLocalDate(date);
    }

    private List<TiersPayantDto> buildTiersPayant() {
        List<TiersPayantDto> list = new ArrayList<>();
        List<TTiersPayant> l = findAllTTiersPayants();
        for (TTiersPayant p : l) {
            TTypeTiersPayant payant = p.getLgTYPETIERSPAYANTID();
            TiersPayantDto o = new TiersPayantDto();
            o.setName(p.getStrNAME());
            o.setFullName(p.getStrFULLNAME());

            if (p.getIsDepot() != null && p.getIsDepot()) {
                o.setCategorie("DEPOT");
            } else {
                if (payant.getLgTYPETIERSPAYANTID().equals("1")) {
                    o.setCategorie("ASSURANCE");
                } else {
                    o.setCategorie("CARNET");
                }
            }
            if (StringUtils.isNoneEmpty(p.getStrCODEORGANISME())) {
                o.setCodeOrganisme(p.getStrCODEORGANISME());
            }
            if (StringUtils.isNoneEmpty(p.getStrCODEREGROUPEMENT())) {
                o.setCodeRegroupement(p.getStrCODEREGROUPEMENT());
            }
            if (StringUtils.isNoneEmpty(p.getStrMAIL())) {
                o.setEmail(p.getStrMAIL());
            }
            if (StringUtils.isNoneEmpty(p.getStrADRESSE())) {
                o.setAdresse(p.getStrADRESSE());
            }

            if (checkPhoneNumber(p.getStrMOBILE())) {
                o.setTelephone(p.getStrMOBILE());
            }
            if (checkPhoneNumber(p.getStrTELEPHONE())) {
                o.setTelephoneFixe(p.getStrTELEPHONE());
            }
            o.setNbreBordereaux(p.getIntNBREEXEMPLAIREBORD());
            if (p.getDblREMISEFORFETAIRE() != null && p.getDblREMISEFORFETAIRE() > 0) {
                o.setRemiseForfaitaire(p.getDblREMISEFORFETAIRE().longValue());
            }
            if (p.getIntNBREBONS() != null && p.getIntNBREBONS() > 0) {
                o.setNbreBons(p.getIntNBREBONS());
            }
            if (p.getIntMONTANTFAC() != null && p.getIntMONTANTFAC() > 0) {
                o.setMontantMaxParFcture(p.getIntMONTANTFAC().longValue());
            }
            if (p.getBIsAbsolute() != null) {
                o.setPlafondAbsolu(p.getBIsAbsolute());
            }
            if (p.getDblPLAFONDCREDIT() != null && p.getDblPLAFONDCREDIT() > 0) {
                o.setPlafondConso(p.getDblPLAFONDCREDIT().longValue());
            }
            TGroupeTierspayant groupeTierspayant = p.getLgGROUPEID();
            if (groupeTierspayant != null) {
                o.setGroupeTiersPayantName(groupeTierspayant.getStrLIBELLE());
            }

            list.add(o);
        }
        return list;
    }

    @Override
    public List<WsCaAchatVente> getCaAchatVente(String dtStart, String dtEnd) {
        List<WsCaAchatVente> achatVentes = new ArrayList<>();
        Stream.concat(fetchVentesCa(dtStart, dtEnd).stream().map(this::buildFromTupleVente),
                fetchAchats(dtStart, dtEnd).stream().map(this::buildFromTupleAchat))
                .sorted(Comparator.comparing(WsCaAchatVenteDTO::getMvtDay))
                .collect(Collectors.groupingBy(WsCaAchatVenteDTO::getMvtDay)).forEach((date, values) -> {
                    String dateMvt = date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                    BigDecimal montantVente = BigDecimal.ZERO;
                    BigDecimal montantAchat = BigDecimal.ZERO;
                    for (WsCaAchatVenteDTO value : values) {
                        if (value.getType().equals("Vente")) {
                            montantVente = value.getMontant();
                        } else {
                            montantAchat = value.getMontant();
                        }
                    }
                    achatVentes.add(new WsCaAchatVente(dateMvt, montantVente, montantAchat));

                });
        return achatVentes;
    }

    private List<Tuple> fetchVentesCa(String dtStart, String dtEnd) {
        try {
            return getEntityManager().createNativeQuery(
                    "SELECT  IFNULL(SUM(p.int_PRICE) ,0) AS montant,DATE(p.dt_UPDATED) AS mvtDay FROM t_preenregistrement p WHERE p.b_IS_CANCEL=FALSE AND p.int_PRICE >0 AND p.str_STATUT='is_Closed' AND p.lg_TYPE_VENTE_ID <>'5' AND  DATE(p.dt_UPDATED) BETWEEN ?1 AND ?2 GROUP  BY  DATE(p.dt_UPDATED)",
                    Tuple.class).setParameter(1, java.sql.Date.valueOf(dtStart))
                    .setParameter(2, java.sql.Date.valueOf(dtEnd)).getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetchVentesCa =====>>", e);
            return Collections.emptyList();
        }
    }

    private List<Tuple> fetchAchats(String dtStart, String dtEnd) {
        try {
            return getEntityManager().createNativeQuery(
                    "SELECT  IFNULL(SUM(b.int_HTTC) ,0) AS montant, DATE(b.dt_CREATED) AS mvtDay FROM t_bon_livraison b WHERE DATE(b.dt_CREATED) BETWEEN ?1 AND ?2 GROUP  BY DATE(b.dt_CREATED)",
                    Tuple.class).setParameter(1, java.sql.Date.valueOf(dtStart))
                    .setParameter(2, java.sql.Date.valueOf(dtEnd)).getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "fetchAchats =====>>", e);
            return Collections.emptyList();
        }
    }

    private WsCaAchatVenteDTO buildFromTupleVente(Tuple t) {
        return new WsCaAchatVenteDTO("Vente", LocalDate.parse(t.get("mvtDay").toString()),
                t.get("montant", BigDecimal.class));
    }

    private WsCaAchatVenteDTO buildFromTupleAchat(Tuple t) {
        return new WsCaAchatVenteDTO("Achat", LocalDate.parse(t.get("mvtDay").toString()),
                t.get("montant", BigDecimal.class));
    }
}
