package rest.service.impl;

import dal.HMvtProduit;
import dal.MvtTransaction;
import dal.TCodeTva;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TPreenregistrement;
import dal.TPreenregistrementDetail;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TemporalType;
import javax.persistence.Tuple;
import javax.persistence.TypedQuery;

/**
 *
 * @author koben
 */
@Stateless
public class CommonCorrection {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager entityManager;

    private class Item {

        final String id;
        final String cip;
        final String nom;
        final int tva;
        final String tab;
        final int price;
        final String code;

        public Item(String id, String cip, String nom, int tva, String tab, int price, String code) {
            this.id = id;
            this.cip = cip;
            this.nom = nom;
            this.tva = tva;
            this.tab = tab;
            this.price = price;
            this.code = code;
        }

        public String getId() {
            return id;
        }

        public String getCip() {
            return cip;
        }

        public String getNom() {
            return nom;
        }

        public int getTva() {
            return tva;
        }

        public String getTab() {
            return tab;
        }

        public int getPrice() {
            return price;
        }

        public String getCode() {
            return code;
        }

    }

    private List<Item> fetch() {
        List<Item> items = new ArrayList<>();
        try {
            Query q = entityManager.createNativeQuery(
                    "SELECT t.cip,t.nom,t.tab,t.tva,f.lg_FAMILLE_ID AS id,f.int_PRICE AS price,f.int_T AS code FROM t_famille f, tva t WHERE f.int_CIP=t.cip",
                    Tuple.class);
            List<Tuple> l = q.getResultList();
            l.forEach((t) -> {
                Item item = new Item(t.get(4, String.class), t.get(0, String.class), t.get(1, String.class),
                        Integer.valueOf(t.get(3, String.class)), t.get(2, String.class), t.get(5, Integer.class),
                        t.get(6, String.class));
                items.add(item);
            });

        } catch (Exception e) {
            e.printStackTrace();
        }
        return items;
    }

    public int updateVente() {
        AtomicInteger atomicInteger = new AtomicInteger(0);
        findPreenregistrement().forEach((p) -> {
            atomicInteger.incrementAndGet();
            int montantTva = 0;
            List<TPreenregistrementDetail> details = findPreenregistrementDetailsByIdVente(
                    p.getLgPREENREGISTREMENTID());
            for (TPreenregistrementDetail d : details) {
                montantTva += d.getMontantTva();
            }
            p.setMontantTva(montantTva);
            entityManager.merge(p);
            findMvtTransactions(p.getLgPREENREGISTREMENTID()).forEach((m) -> {
                m.setMontantTva(p.getMontantTva());
                entityManager.merge(m);
            });
        });
        return atomicInteger.get();
    }

    public int updateFamille() {
        AtomicInteger atomicInteger = new AtomicInteger(0);
        fetch().forEach((item) -> {
            TFamille famille = findFamilleAndUpdate(item.getId());
            atomicInteger.incrementAndGet();
            TCodeTva codeTva = famille.getLgCODETVAID();
            int tva = codeTva != null ? codeTva.getIntVALUE() : 0;
            try {
                Integer code = Integer.valueOf(famille.getIntT().trim());
                if (code == 0) {
                    famille.setIntPRICE(famille.getIntPRICE() - 30);
                    findHFamilleGrossistes(item.getId()).forEach((t) -> {
                        t.setIntPRICE(t.getIntPRICE() - 30);
                        entityManager.merge(t);
                    });
                    entityManager.merge(famille);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            findHMvtProduits(famille.getLgFAMILLEID()).forEach((t) -> {
                t.setValeurTva(tva);
                entityManager.merge(t);
            });
            updateVenteItem(famille, tva);
        });
        return atomicInteger.get();
    }

    private TFamille findFamilleAndUpdate(String id) {
        TFamille famille = entityManager.find(TFamille.class, id);
        return famille;
    }

    public void updateVenteItem(TFamille famille, int tva) {
        findPreenregistrementDetails(famille.getLgFAMILLEID()).forEach((t) -> {
            t.setMontantTva(calculeTva(tva, t.getIntPRICE()));
            t.setValeurTva(tva);
            entityManager.merge(t);
        });

    }

    private Integer calculeTva(int tva, int amount) {
        if (tva == 0) {
            return 0;
        }
        Double HT = amount / (1 + (Double.valueOf(tva) / 100));
        return amount - HT.intValue();
    }

    List<TPreenregistrementDetail> findPreenregistrementDetails(String id) {
        TypedQuery<TPreenregistrementDetail> query = entityManager.createQuery(
                "SELECT o FROM TPreenregistrementDetail o WHERE o.lgFAMILLEID.lgFAMILLEID=?1 AND FUNCTION('DATE',o.dtCREATED) BETWEEN  ?2 AND ?3",
                TPreenregistrementDetail.class);
        query.setParameter(1, id);
        query.setParameter(2, java.sql.Date.valueOf(LocalDate.parse("2022-04-01")), TemporalType.DATE);
        query.setParameter(3, java.sql.Date.valueOf(LocalDate.now()), TemporalType.DATE);
        return query.getResultList();
    }

    List<HMvtProduit> findHMvtProduits(String id) {
        TypedQuery<HMvtProduit> query = entityManager.createQuery(
                "SELECT o FROM HMvtProduit o WHERE o.famille.lgFAMILLEID = ?1  AND o.mvtDate BETWEEN ?2 AND ?3",
                HMvtProduit.class);
        query.setParameter(1, id);
        query.setParameter(2, LocalDate.parse("2022-04-01"));
        query.setParameter(3, LocalDate.now());
        return query.getResultList();
    }

    List<TFamilleGrossiste> findHFamilleGrossistes(String id) {
        TypedQuery<TFamilleGrossiste> query = entityManager.createQuery(
                "SELECT o FROM TFamilleGrossiste o WHERE o.lgFAMILLEID.lgFAMILLEID = ?1", TFamilleGrossiste.class);
        query.setParameter(1, id);
        return query.getResultList();
    }

    List<TPreenregistrement> findPreenregistrement() {
        TypedQuery<TPreenregistrement> query = entityManager.createQuery(
                "SELECT o FROM TPreenregistrement o WHERE  FUNCTION('DATE',o.dtCREATED) BETWEEN  ?1 AND ?2",
                TPreenregistrement.class);
        query.setParameter(1, java.sql.Date.valueOf(LocalDate.parse("2022-04-01")), TemporalType.DATE);
        query.setParameter(2, java.sql.Date.valueOf(LocalDate.now()), TemporalType.DATE);
        return query.getResultList();
    }

    List<MvtTransaction> findMvtTransactions(String id) {
        TypedQuery<MvtTransaction> query = entityManager
                .createQuery("SELECT o FROM MvtTransaction o WHERE o.pkey = ?1  ", MvtTransaction.class);
        query.setParameter(1, id);
        return query.getResultList();
    }

    List<TPreenregistrementDetail> findPreenregistrementDetailsByIdVente(String id) {
        TypedQuery<TPreenregistrementDetail> query = entityManager.createQuery(
                "SELECT o FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID =?1 ",
                TPreenregistrementDetail.class);
        query.setParameter(1, id);
        return query.getResultList();
    }

}
