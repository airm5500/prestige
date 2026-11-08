/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.FournisseurProduitDTO;
import commonTasks.dto.MaxAndMinDate;
import commonTasks.dto.PaymentDTO;
import commonTasks.dto.ProduitDTO;
import commonTasks.dto.SaleDTO;
import commonTasks.dto.SaleLineDTO;
import dal.GammeProduit;
import dal.Laboratoire;
import dal.MvtTransaction;
import dal.TClient;
import dal.TCodeTva;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TFamilleStock;
import dal.TFamillearticle;
import dal.TFormeArticle;
import dal.TGrossiste;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import dal.TTypeReglement;
import dal.TTypeetiquette;
import dal.TUser;
import dal.TZoneGeographique;
import dal.HMvtProduit;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.FlushModeType;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import util.DateConverter;

/**
 *
 * @author koben
 */
@Stateless
public class DataExportService {

    private static final Logger LOG = Logger.getLogger(DataExportService.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public EntityManager getEntityManager() {
        return em;
    }

    private TFamille detail(String idParent) {
        try {
            TypedQuery<TFamille> q = getEntityManager().createQuery(
                    "SELECT o FROM TFamille o WHERE o.strSTATUT <> 'delete' AND o.lgFAMILLEPARENTID=?1",
                    TFamille.class);
            q.setMaxResults(1);
            q.setFlushMode(FlushModeType.COMMIT);
            q.setParameter(1, idParent);
            return q.getSingleResult();
        } catch (Exception e) {
            // LOG.log(Level.SEVERE, "factures =====>>", e);
            return null;
        }
    }

    private List<TFamille> familles() {
        return getEntityManager()
                .createQuery("SELECT o FROM TFamille o WHERE o.strSTATUT <> 'delete' AND o.lgFAMILLEPARENTID=''",
                        TFamille.class)
                .setFlushMode(FlushModeType.COMMIT).getResultList();
    }

    private ProduitDTO build(TFamille f, Map<String, TFamille> details,
            Map<String, List<TFamilleGrossiste>> fournisseurs, Map<String, List<TFamilleStock>> stocks) {
        ProduitDTO o = new ProduitDTO();
        o.setItemQty(1);
        o.setTypeProduit(1);
        /*
         * champs vides (NULL) = non : un article detail cree par l'ecran n'a pas bool_DECONDITIONNE_EXIST (erreur 500)
         */
        if (Short.valueOf((short) 1).equals(f.getBoolDECONDITIONNE())) {
            o.setTypeProduit(0);
        }
        o.setItemCostAmount(f.getIntPAF());
        o.setItemRegularUnitPrice(f.getIntPRICE());
        TGrossiste gros = f.getLgGROSSISTEID();
        o.setStatus(f.getStrSTATUT().equals("enable") ? 0 : 1);
        Collection<TFamilleGrossiste> lus = fournisseurs.containsKey(f.getLgFAMILLEID())
                ? fournisseurs.get(f.getLgFAMILLEID()) : f.getTFamilleGrossisteCollection();
        lus.stream().map(FournisseurProduitDTO::new).forEach(a -> {
            if (a.getFournisseurLibelle().equalsIgnoreCase(gros.getStrLIBELLE())) {
                a.setPrincipal(true);
            }
            o.getFournisseurProduits().add(a);
        });

        Collection<TFamilleStock> stocksLus = stocks.containsKey(f.getLgFAMILLEID()) ? stocks.get(f.getLgFAMILLEID())
                : f.getTFamilleStockCollection();
        Optional<TFamilleStock> familleStock = stocksLus.stream()
                .filter(s -> s.getLgEMPLACEMENTID().getLgEMPLACEMENTID().equals(DateConverter.OFFICINE)).findFirst();
        if (familleStock.isPresent()) {
            TFamilleStock s = familleStock.get();
            o.setTotalQuantity(s.getIntNUMBERAVAILABLE());
            o.setQtyUG(s.getIntUG());
        }

        if (Short.valueOf((short) 1).equals(f.getBoolDECONDITIONNEEXIST())) {
            TFamille d = details.containsKey(f.getLgFAMILLEID()) ? details.get(f.getLgFAMILLEID())
                    : detail(f.getLgFAMILLEID());
            o.setDeconditionnable(Boolean.TRUE);
            o.setItemQty(f.getIntNUMBERDETAIL());
            if (d != null) {
                o.setItemCostAmount(d.getIntPAF());
                o.setItemRegularUnitPrice(d.getIntPRICE());
                o.getProduits().add(build(d, details, fournisseurs, stocks));
            }

        }
        o.setChiffre(f.getBoolACCOUNT());
        o.setCodeEan(f.getIntEAN13());
        o.setCostAmount(f.getIntPAF());
        o.setRegularUnitPrice(f.getIntPRICE());
        o.setDateperemption(f.getDtPEREMPTION() != null);
        o.setPerimeAt(DateConverter.convertDateToLocalDateAndReturnNull(f.getDtPEREMPTION()));
        o.setLibelle(f.getStrNAME());
        try {
            o.setPrixMnp(f.getDblPRIXMOYENPONDERE().intValue());
        } catch (Exception e) {
        }
        o.setQtyAppro(f.getIntQTEREAPPROVISIONNEMENT());
        o.setQtySeuilMini(f.getIntSEUILMIN());
        TFamillearticle tf = f.getLgFAMILLEARTICLEID();
        if (tf != null) {
            o.setFamilleLibelle(tf.getStrLIBELLE());
        }
        TFormeArticle fr = f.getLgFORMEID();
        if (fr != null) {
            o.setFormeLibelle(fr.getStrLIBELLE());
        }
        TTypeetiquette e = f.getLgTYPEETIQUETTEID();
        if (e != null) {
            o.setTypeEtyquetteLibelle(e.getStrNAME());
        }
        GammeProduit gammeProduit = f.getGamme();
        if (gammeProduit != null) {
            o.setGammeLibelle(gammeProduit.getLibelle());
        }
        Laboratoire l = f.getLaboratoire();
        if (l != null) {
            o.setLaboratoireLibelle(l.getLibelle());
        }
        TCodeTva codeTva = f.getLgCODETVAID();
        if (codeTva != null) {
            o.setTvaTaux(codeTva.getIntVALUE());
        }
        TZoneGeographique ra = f.getLgZONEGEOID();
        if (ra != null) {
            o.setRayonLibelle(ra.getStrLIBELLEE());
        }
        return o;
    }

    public List<ProduitDTO> listProduits() {
        /*
         * Lecture seule : sans FlushModeType.COMMIT, Hibernate repassait avant chacune des ~90 requetes par lots sur
         * toutes les entites deja chargees (22 000 articles, leurs stocks et fournisseurs) : 123 s sur la copie de
         * l'officine. Rien n'est modifie ici, il n'y a donc rien a ecrire avant de lire.
         */
        List<ProduitDTO> datas = new ArrayList<>();
        List<TFamille> familles = familles();
        /*
         * Audit des exports (journal du 15/10) : fournisseurs, stocks et article detail lus par lots de 500 articles,
         * au lieu de deux a trois requetes par article. Memes donnees (l'ordre des fournisseurs n'a jamais ete fixe :
         * ProduitDTO les range dans un HashSet).
         */
        List<String> ids = familles.stream().map(TFamille::getLgFAMILLEID).collect(Collectors.toList());
        Map<String, TFamille> details = new HashMap<>();
        for (List<String> lot : lots(ids)) {
            getEntityManager()
                    .createQuery(
                            "SELECT o FROM TFamille o WHERE o.strSTATUT <> 'delete' AND o.lgFAMILLEPARENTID IN :ids",
                            TFamille.class)
                    .setFlushMode(FlushModeType.COMMIT).setParameter("ids", lot).getResultList()
                    .forEach(d -> details.putIfAbsent(d.getLgFAMILLEPARENTID(), d));
        }
        List<String> tous = new ArrayList<>(ids);
        details.values().forEach(d -> tous.add(d.getLgFAMILLEID()));
        Map<String, List<TFamilleGrossiste>> fournisseurs = new HashMap<>();
        Map<String, List<TFamilleStock>> stocks = new HashMap<>();
        for (List<String> lot : lots(tous)) {
            getEntityManager()
                    .createQuery("SELECT o FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.lgFAMILLEID IN :ids",
                            TFamilleGrossiste.class)
                    .setFlushMode(FlushModeType.COMMIT).setParameter("ids", lot).getResultList().forEach(g -> fournisseurs
                            .computeIfAbsent(g.getLgFAMILLEID().getLgFAMILLEID(), k -> new ArrayList<>()).add(g));
            getEntityManager()
                    .createQuery("SELECT o FROM TFamilleStock o WHERE o.lgFAMILLEID.lgFAMILLEID IN :ids",
                            TFamilleStock.class)
                    .setFlushMode(FlushModeType.COMMIT).setParameter("ids", lot).getResultList().forEach(t -> stocks
                            .computeIfAbsent(t.getLgFAMILLEID().getLgFAMILLEID(), k -> new ArrayList<>()).add(t));
        }
        /* un article absent des lots (detail d'un detail) garde la lecture d'origine */
        tous.forEach(id -> {
            fournisseurs.putIfAbsent(id, new ArrayList<>());
            stocks.putIfAbsent(id, new ArrayList<>());
        });
        familles.forEach(f -> {
            datas.add(build(f, details, fournisseurs, stocks));
        });

        return datas;
    }

    public List<SaleDTO> listVentes(String dtStart, String dtEnd, String type) {
        List<TPreenregistrement> data = fromDtStartToDtEndAndByType(dtStart, dtEnd, type);
        /*
         * Journal du 15/10 (audit des exports) : lignes, paiements et mouvements de stock lus par lots de 500 ventes,
         * au lieu de deux requetes par vente et d'une par ligne de vente. Memes donnees, meme ordre.
         */
        Map<String, List<TPreenregistrementDetail>> lignes = new HashMap<>();
        Map<String, MvtTransaction> paiements = new HashMap<>();
        Map<String, HMvtProduit> mouvements = new HashMap<>();
        List<String> ids = data.stream().map(TPreenregistrement::getLgPREENREGISTREMENTID).collect(Collectors.toList());
        for (List<String> lot : lots(ids)) {
            getEntityManager()
                    .createQuery(
                            "SELECT o FROM TPreenregistrementDetail o"
                                    + " WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID IN :ids",
                            TPreenregistrementDetail.class)
                    .setParameter("ids", lot).getResultList()
                    .forEach(d -> lignes.computeIfAbsent(d.getLgPREENREGISTREMENTID().getLgPREENREGISTREMENTID(),
                            k -> new ArrayList<>()).add(d));
            getEntityManager().createQuery("SELECT o FROM MvtTransaction o WHERE o.pkey IN :ids", MvtTransaction.class)
                    .setParameter("ids", lot).getResultList().forEach(m -> paiements.putIfAbsent(m.getPkey(), m));
        }
        List<String> idsLignes = lignes.values().stream().flatMap(List::stream)
                .map(TPreenregistrementDetail::getLgPREENREGISTREMENTDETAILID).collect(Collectors.toList());
        for (List<String> lot : lots(idsLignes)) {
            getEntityManager().createQuery("SELECT o FROM HMvtProduit o WHERE o.pkey IN :ids", HMvtProduit.class)
                    .setParameter("ids", lot).getResultList().forEach(h -> mouvements.putIfAbsent(h.getPkey(), h));
        }
        return data.stream().map(e -> buildVNO(e, lignes.getOrDefault(e.getLgPREENREGISTREMENTID(), List.of()),
                paiements.get(e.getLgPREENREGISTREMENTID()), mouvements)).collect(Collectors.toList());
    }

    private static List<List<String>> lots(List<String> ids) {
        List<List<String>> lots = new ArrayList<>();
        for (int i = 0; i < ids.size(); i += 500) {
            lots.add(ids.subList(i, Math.min(i + 500, ids.size())));
        }
        return lots;
    }

    private List<TPreenregistrement> fromDtStartToDtEndAndByType(String dtStart, String dtEnd, String type) {
        TypedQuery<TPreenregistrement> l = getEntityManager().createQuery(
                "SELECT o from TPreenregistrement o WHERE  FUNCTION('DATE',o.dtUPDATED) BETWEEN ?1 AND ?2 AND o.strTYPEVENTE=?3 AND o.bISCANCEL=FALSE AND o.intPRICE>0 AND o.strSTATUT ='is_Closed'",
                TPreenregistrement.class);
        l.setParameter(1, java.sql.Date.valueOf(dtStart));
        l.setParameter(2, java.sql.Date.valueOf(dtEnd));
        l.setParameter(3, type);
        return l.getResultList();

    }

    private void buildVenteDetails(SaleDTO o, List<TPreenregistrementDetail> itm, Map<String, HMvtProduit> mouvements) {
        Integer costAmount = 0, ttc = 0;
        List<SaleLineDTO> d = new ArrayList<>();
        for (TPreenregistrementDetail i : itm) {
            costAmount += (i.getPrixAchat() * i.getIntQUANTITY());
            ttc += i.getIntPRICE();
            SaleLineDTO t = new SaleLineDTO();
            t.setQuantitySold(i.getIntQUANTITYSERVED());
            t.setQuantityRequested(i.getIntQUANTITY());
            t.setQuantiyAvoir(i.getIntAVOIR());
            t.setCostAmount(i.getPrixAchat());
            t.setTaxAmount(i.getMontantTva());
            t.setRegularUnitPrice(i.getIntPRICEUNITAIR());
            t.setQuantityUg(i.getIntUG());
            t.setGrossAmount(i.getIntPRICE());
            t.setSalesAmount(i.getIntPRICE());
            t.setNetAmount(i.getIntPRICE() - i.getIntPRICEREMISE());
            t.setNetUnitPrice(i.getIntPRICEUNITAIR());
            t.setDiscountAmount(i.getIntPRICEREMISE());
            t.setDiscountUnitPrice(i.getIntPRICEUNITAIR());
            t.setMontantTvaUg(i.getMontantTvaUg());
            t.setToIgnore(!i.getBoolACCOUNT());
            t.setTaxValue(i.getValeurTva());
            if (!i.getBoolACCOUNT()) {
                t.setAmountToBeTakenIntoAccount(i.getIntPRICEOTHER());
            } else {
                t.setAmountToBeTakenIntoAccount(t.getNetAmount());
            }
            t.setCreatedAt(DateConverter.convertDateToLocalDateTime(i.getDtCREATED()).toInstant(ZoneOffset.UTC));
            t.setUpdatedAt(DateConverter.convertDateToLocalDateTime(i.getDtUPDATED()).toInstant(ZoneOffset.UTC));
            t.setEffectiveUpdateDate(t.getUpdatedAt());
            t.setProduitLibelle(i.getLgFAMILLEID().getStrNAME());
            HMvtProduit h = mouvements.get(i.getLgPREENREGISTREMENTDETAILID());
            if (h != null) {
                commonTasks.dto.InventoryTransactionDTO n = new commonTasks.dto.InventoryTransactionDTO();
                n.setProduitLibelle(t.getProduitLibelle());
                n.setQuantity(h.getQteMvt());
                n.setQuantityAfter(h.getQteFinale());
                n.setQuantityBefor(h.getQteDebut());
                t.setSnapshot(n);
            }
            d.add(t);
        }
        o.setCostAmount(costAmount);
        o.setMarge((ttc - o.getTaxAmount()) - costAmount);
        o.setSalesLines(d);
    }

    private SaleDTO buildVNO(TPreenregistrement tp, List<TPreenregistrementDetail> lignes, MvtTransaction paiement,
            Map<String, HMvtProduit> mouvements) {
        SaleDTO o = new SaleDTO();
        o.setAmountToBePaid(tp.getIntPRICE() - tp.getIntPRICEREMISE());
        o.setAmountToBeTakenIntoAccount(tp.getIntPRICE() - tp.getIntPRICEREMISE());
        o.setCreatedAt(DateConverter.convertDateToLocalDateTime(tp.getDtCREATED()).toInstant(ZoneOffset.UTC));
        o.setUpdatedAt(DateConverter.convertDateToLocalDateTime(tp.getDtUPDATED()).toInstant(ZoneOffset.UTC));
        o.setEffectiveUpdateDate(o.getUpdatedAt());
        o.setDateDimensionId(Integer.parseInt(DateConverter.convertDateToLocalDate(tp.getDtUPDATED())
                .format(DateTimeFormatter.ofPattern("yyyyMMdd"))));
        o.setDiscountAmount(tp.getIntPRICEREMISE());
        o.setGrossAmount(tp.getIntPRICE());
        o.setType(tp.getStrTYPEVENTE().toUpperCase());
        o.setRestToPay(0);
        o.setSalesAmount(tp.getIntPRICE());
        o.setPayrollAmount(o.getAmountToBePaid());
        o.setNetAmount(o.getAmountToBePaid());
        o.setNumberTransaction(tp.getStrREF());
        o.setTicketNumber(tp.getStrREFTICKET());
        o.setTaxAmount(tp.getMontantTva());
        o.setToIgnore(!tp.getChecked());
        o.setImported(tp.isImported());
        o.setCopy(tp.getCopy());
        o.setMargeUg(tp.getMargeug());
        o.setMontantTvaUg(tp.getMontantTvaUg());
        o.setMontantttcUg(tp.getMontantttcug());
        TUser caissier = tp.getLgUSERCAISSIERID();
        if (caissier != null) {
            o.setUserFullName(caissier.getStrLOGIN());
        }
        TUser vendeur = tp.getLgUSERVENDEURID();
        if (vendeur != null) {
            o.setSellerUserName(vendeur.getStrLOGIN());
        }
        buildVenteDetails(o, lignes, mouvements);
        buildPaymentDTO(o, paiement);
        TClient c = tp.getClient();
        if (c != null) {
            o.setCustomerNum(c.getStrCODEINTERNE());
        }
        return o;
    }

    private void buildPaymentDTO(SaleDTO o, MvtTransaction n) {
        if (n != null) {
            PaymentDTO p = new PaymentDTO();
            p.setCreatedAt(o.getCreatedAt());
            p.setUpdatedAt(o.getUpdatedAt());
            p.setNetAmount(n.getMontantNet());
            p.setPaidAmount(n.getMontantPaye());
            p.setReelPaidAmount(n.getMontantRegle());
            p.setRestToPay(n.getMontantRestant());
            TTypeReglement reglement = n.getReglement();
            p.setPaymentCode(reglement.getStrNAME());
            o.getPayments().add(p);
        }
    }

    public MaxAndMinDate getMaxAndMinDate() {
        MaxAndMinDate andMinDate = new MaxAndMinDate();
        TypedQuery<TPreenregistrement> q = getEntityManager()
                .createQuery("SELECT o FROM TPreenregistrement o ORDER BY o.dtUPDATED DESC ", TPreenregistrement.class);
        q.setMaxResults(1);
        andMinDate.setMaxDate(DateConverter.convertDateToLocalDate(q.getSingleResult().getDtUPDATED())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
        q = getEntityManager().createQuery("SELECT o FROM TPreenregistrement o ORDER BY o.dtUPDATED ASC ",
                TPreenregistrement.class);
        q.setMaxResults(1);
        andMinDate.setMinDate(DateConverter.convertDateToLocalDate(q.getSingleResult().getDtUPDATED())
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
        return andMinDate;
    }

}
