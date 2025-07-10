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
import java.util.List;
import java.util.Optional;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
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
                .getResultList();
    }

    private ProduitDTO build(TFamille f) {
        ProduitDTO o = new ProduitDTO();
        o.setItemQty(1);
        o.setTypeProduit(1);
        if (f.getBoolDECONDITIONNE().compareTo((short) 1) == 0) {
            o.setTypeProduit(0);
        }
        o.setItemCostAmount(f.getIntPAF());
        o.setItemRegularUnitPrice(f.getIntPRICE());
        TGrossiste gros = f.getLgGROSSISTEID();
        o.setStatus(f.getStrSTATUT().equals("enable") ? 0 : 1);
        f.getTFamilleGrossisteCollection().stream().map(FournisseurProduitDTO::new).forEach(a -> {
            if (a.getFournisseurLibelle().equalsIgnoreCase(gros.getStrLIBELLE())) {
                a.setPrincipal(true);
            }
            o.getFournisseurProduits().add(a);
        });

        Optional<TFamilleStock> familleStock = f.getTFamilleStockCollection().stream()
                .filter(s -> s.getLgEMPLACEMENTID().getLgEMPLACEMENTID().equals(DateConverter.OFFICINE)).findFirst();
        if (familleStock.isPresent()) {
            TFamilleStock s = familleStock.get();
            o.setTotalQuantity(s.getIntNUMBERAVAILABLE());
            o.setQtyUG(s.getIntUG());
        }

        if (f.getBoolDECONDITIONNEEXIST().compareTo((short) 1) == 0) {
            TFamille d = detail(f.getLgFAMILLEID());
            o.setDeconditionnable(Boolean.TRUE);
            o.setItemQty(f.getIntNUMBERDETAIL());
            if (d != null) {
                o.setItemCostAmount(d.getIntPAF());
                o.setItemRegularUnitPrice(d.getIntPRICE());
                o.getProduits().add(build(d));
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
        List<ProduitDTO> datas = new ArrayList<>();
        List<TFamille> familles = familles();
        familles.forEach(f -> {
            datas.add(build(f));
        });

        return datas;
    }

    public List<SaleDTO> listVentes(String dtStart, String dtEnd, String type) {
        List<TPreenregistrement> data = fromDtStartToDtEndAndByType(dtStart, dtEnd, type);
        return data.stream().map(e -> buildVNO(e)).collect(Collectors.toList());
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

    private List<TPreenregistrementDetail> findItemsById(String id) {
        TypedQuery<TPreenregistrementDetail> l = getEntityManager().createQuery(
                "SELECT o from TPreenregistrementDetail o WHERE  o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1",
                TPreenregistrementDetail.class);
        l.setParameter(1, id);
        return l.getResultList();

    }

    private MvtTransaction findPaymentById(String id) {
        try {
            TypedQuery<MvtTransaction> l = getEntityManager()
                    .createQuery("SELECT o from MvtTransaction o WHERE  o.pkey=?1", MvtTransaction.class);
            l.setParameter(1, id);
            l.setMaxResults(1);
            return l.getSingleResult();
        } catch (Exception e) {
            return null;
        }

    }

    private void buildVenteDetails(SaleDTO o, String id) {
        List<TPreenregistrementDetail> itm = findItemsById(id);
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
            HMvtProduit h = findSnapshotByPkey(i.getLgPREENREGISTREMENTDETAILID());
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

    private SaleDTO buildVNO(TPreenregistrement tp) {
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
        buildVenteDetails(o, tp.getLgPREENREGISTREMENTID());
        buildPaymentDTO(o, tp.getLgPREENREGISTREMENTID());
        TClient c = tp.getClient();
        if (c != null) {
            o.setCustomerNum(c.getStrCODEINTERNE());
        }
        return o;
    }

    private void buildPaymentDTO(SaleDTO o, String id) {
        MvtTransaction n = findPaymentById(id);
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

    private HMvtProduit findSnapshotByPkey(String pkey) {
        try {
            TypedQuery<HMvtProduit> q = getEntityManager().createQuery("SELECT o FROM HMvtProduit o WHERE o.pkey=?1",
                    HMvtProduit.class);
            q.setParameter(1, pkey);
            q.setMaxResults(1);
            return q.getSingleResult();
        } catch (Exception e) {
            return null;
        }
    }
}
