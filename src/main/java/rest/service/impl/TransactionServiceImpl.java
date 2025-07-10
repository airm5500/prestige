/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import dal.MvtTransaction;
import dal.MvtTransaction_;
import dal.TBonLivraison;
import dal.TGrossiste;
import dal.TPreenregistrement;
import dal.TTypeMvtCaisse;
import dal.TTypeReglement;
import dal.TUser;
import dal.TUser_;
import dal.enumeration.CategoryTransaction;
import dal.enumeration.TypeTransaction;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import rest.service.TransactionService;
import util.DateConverter;

/**
 *
 * @author DICI
 */
@Stateless
public class TransactionServiceImpl implements TransactionService {
    private static final Logger LOG = Logger.getLogger(TransactionServiceImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public void addTransaction(TUser ooTUser, String pkey, Integer montant, Integer montantNet, Integer montantVerse,
            TGrossiste grossiste, Integer montantTva, String reference) {
        MvtTransaction mvtTransaction = new MvtTransaction();
        mvtTransaction.setUuid(UUID.randomUUID().toString());
        mvtTransaction.setUser(ooTUser);
        mvtTransaction.setCreatedAt(LocalDateTime.now());
        mvtTransaction.setPkey(pkey);
        mvtTransaction.setMvtDate(LocalDate.now());
        mvtTransaction.setAvoidAmount(0);
        mvtTransaction.setMontant(montant);
        mvtTransaction.setMontantTva(montantTva);
        mvtTransaction.setMagasin(ooTUser.getLgEMPLACEMENTID());
        mvtTransaction.setCaisse(ooTUser);
        mvtTransaction.setMontantCredit(0);
        mvtTransaction.setGrossiste(grossiste);
        mvtTransaction.setMontantRegle(0);
        mvtTransaction.setMontantVerse(montantVerse);
        mvtTransaction.setMontantRestant(montant);
        mvtTransaction.setMontantNet(montantNet);
        mvtTransaction.setMontantRemise(0);
        mvtTransaction.setMarge(0);
        mvtTransaction.setReference(reference);
        mvtTransaction.setCategoryTransaction(CategoryTransaction.DEBIT);
        mvtTransaction.setTypeTransaction(TypeTransaction.ACHAT);
        mvtTransaction.setChecked(Boolean.TRUE);
        this.getEntityManager().persist(mvtTransaction);
    }

    @Override
    public void addTransaction(TUser ooTUser, TUser caisse, String pkey, Integer montant, Integer voidAmount,
            Integer montantNet, Integer montantVerse, Boolean checked, CategoryTransaction categoryTransaction,
            TypeTransaction typeTransaction, TTypeReglement reglement, TTypeMvtCaisse tTypeMvtCaisse, EntityManager emg,
            Integer montantPaye, Integer montantTva, Integer marge, String reference) {
        MvtTransaction mvtTransaction = new MvtTransaction();
        int compare = montantNet.compareTo(montantVerse);
        Integer montantPaid, montantRestant = 0;
        if (compare <= 0) {
            montantPaid = montantNet;
        } else {
            montantPaid = montantVerse;
            montantRestant = montantNet - montantVerse;
        }

        mvtTransaction.setUuid(UUID.randomUUID().toString());
        mvtTransaction.setUser(ooTUser);
        mvtTransaction.setCreatedAt(LocalDateTime.now());
        mvtTransaction.setPkey(pkey);
        mvtTransaction.setMvtDate(LocalDate.now());
        mvtTransaction.setAvoidAmount(voidAmount);
        mvtTransaction.setMontant(montant);
        mvtTransaction.setMagasin(ooTUser.getLgEMPLACEMENTID());
        mvtTransaction.setCaisse(caisse);
        mvtTransaction.setMontantCredit(0);
        mvtTransaction.setMontantVerse(montantVerse);
        mvtTransaction.setMontantRegle(montantPaid);
        mvtTransaction.setReference(reference);
        mvtTransaction.setMontantNet(montantNet);
        mvtTransaction.settTypeMvtCaisse(tTypeMvtCaisse);
        mvtTransaction.setReglement(reglement);
        // mvtTransaction.setMontantRestant(montantRestant);
        mvtTransaction.setMontantRestant(montantRestant > 4 ? montantRestant : 0);
        mvtTransaction.setMarge(marge);
        mvtTransaction.setMontantPaye(montantPaye);
        mvtTransaction.setMontantRemise(montant - montantNet);
        mvtTransaction.setCategoryTransaction(categoryTransaction);
        mvtTransaction.setTypeTransaction(typeTransaction);
        mvtTransaction.setChecked(checked);
        mvtTransaction.setMontantTva(montantTva);
        emg.persist(mvtTransaction);

    }

    @Override
    public void addTransaction(TUser ooTUser, TUser caisse, String pkey, Integer montant, Integer voidAmount,
            Integer montantNet, Integer discount, Integer montantVerse, Boolean checked,
            CategoryTransaction categoryTransaction, TypeTransaction typeTransaction, TTypeReglement reglement,
            TTypeMvtCaisse tTypeMvtCaisse, Integer montantCredit, EntityManager emg, Integer montantPaye,
            Integer montantTva, Integer marge, String reference) {
        MvtTransaction mvtTransaction = new MvtTransaction();
        int compare = montantNet.compareTo(montantVerse);
        Integer montantPaid, montantRestant = 0;
        if (compare <= 0) {
            montantPaid = montantNet;
        } else {
            montantPaid = montantVerse;
            montantRestant = montantNet - montantVerse;
        }

        mvtTransaction.setUuid(UUID.randomUUID().toString());
        mvtTransaction.setUser(ooTUser);
        mvtTransaction.setCreatedAt(LocalDateTime.now());
        mvtTransaction.setPkey(pkey);
        mvtTransaction.setMvtDate(LocalDate.now());
        mvtTransaction.setAvoidAmount(voidAmount);
        mvtTransaction.setMontant(montant);
        mvtTransaction.setMagasin(ooTUser.getLgEMPLACEMENTID());
        mvtTransaction.setCaisse(caisse);
        mvtTransaction.setMontantCredit(montantCredit);
        mvtTransaction.setMontantVerse(montantVerse);
        mvtTransaction.setMontantRegle(montantPaid);
        mvtTransaction.setMontantPaye(montantPaye);
        mvtTransaction.setMontantNet(montantNet + montantCredit);
        mvtTransaction.settTypeMvtCaisse(tTypeMvtCaisse);
        mvtTransaction.setReglement(reglement);
        // _new.setMontantRestant(montantRestant);
        mvtTransaction.setMontantRestant(montantRestant > 4 ? montantRestant : 0);
        mvtTransaction.setMontantRemise(discount);
        mvtTransaction.setMontantTva(montantTva);
        mvtTransaction.setMarge(marge);
        mvtTransaction.setCategoryTransaction(categoryTransaction);
        mvtTransaction.setTypeTransaction(typeTransaction);
        mvtTransaction.setChecked(checked);
        mvtTransaction.setReference(reference);
        emg.persist(mvtTransaction);
    }

    @Override
    public void addTransaction(TUser ooTUser, TUser caisse, String pkey, Integer montant, Integer voidAmount,
            Integer montantNet, Integer montantVerse, Boolean checked, CategoryTransaction categoryTransaction,
            TypeTransaction typeTransaction, TTypeReglement reglement, TTypeMvtCaisse tTypeMvtCaisse, EntityManager emg,
            Integer montantPaye, Integer montantTva, Integer marge, String reference, String organisme) {
        MvtTransaction mvtTransaction = new MvtTransaction();
        int compare = montantNet.compareTo(montantVerse);
        Integer montantPaid, montantRestant = 0;
        if (compare <= 0) {
            montantPaid = montantNet;
        } else {
            montantPaid = montantVerse;
            montantRestant = montantNet - montantVerse;
        }
        mvtTransaction.setUuid(UUID.randomUUID().toString());
        mvtTransaction.setUser(ooTUser);
        mvtTransaction.setCreatedAt(LocalDateTime.now());
        mvtTransaction.setPkey(pkey);
        mvtTransaction.setMvtDate(LocalDate.now());
        mvtTransaction.setAvoidAmount(voidAmount);
        mvtTransaction.setMontant(montant);
        mvtTransaction.setMagasin(ooTUser.getLgEMPLACEMENTID());
        mvtTransaction.setCaisse(caisse);
        mvtTransaction.setMontantCredit(0);
        mvtTransaction.setMontantVerse(montantVerse);
        mvtTransaction.setMontantRegle(montantPaid);
        mvtTransaction.setMontantPaye(montantPaye);
        mvtTransaction.setMontantNet(montantNet);
        mvtTransaction.settTypeMvtCaisse(tTypeMvtCaisse);
        mvtTransaction.setReglement(reglement);
        mvtTransaction.setMontantRestant(montantRestant > 4 ? montantRestant : 0);
        mvtTransaction.setMontantRemise(0);
        mvtTransaction.setMontantTva(montantTva);
        mvtTransaction.setMarge(marge);
        mvtTransaction.setCategoryTransaction(categoryTransaction);
        mvtTransaction.setTypeTransaction(typeTransaction);
        mvtTransaction.setChecked(checked);
        mvtTransaction.setReference(reference);
        mvtTransaction.setOrganisme(organisme);
        emg.persist(mvtTransaction);
    }

    @Override
    public Integer avoidAmount(String userId, LocalDate dtStart, EntityManager emg) {
        List<Predicate> predicates = new ArrayList<>();
        try {
            CriteriaBuilder cb = emg.getCriteriaBuilder();
            CriteriaQuery<MvtTransaction> cq = cb.createQuery(MvtTransaction.class);
            Root<MvtTransaction> root = cq.from(MvtTransaction.class);
            cq.select(root);
            // Predicate btw = cb.between(root.get(MvtTransaction_.mvtDate), dtStart, dtEnd);
            predicates.add(cb.equal(root.get(MvtTransaction_.mvtDate), dtStart));
            predicates.add(cb.equal(root.get(MvtTransaction_.caisse).get(TUser_.lgUSERID), userId));
            predicates.add(cb.equal(root.get(MvtTransaction_.categoryTransaction), CategoryTransaction.DEBIT));
            predicates.add(root.get(MvtTransaction_.typeTransaction).in(TypeTransaction.VENTE_CREDIT,
                    TypeTransaction.VENTE_COMPTANT));

            cq.where(cb.and(predicates.toArray(new Predicate[predicates.size()])));
            TypedQuery<MvtTransaction> q = emg.createQuery(cq);
            List<MvtTransaction> list = q.getResultList();

            return list.stream().map(x -> Math.abs(x.getMontantRegle())).reduce(0, Integer::sum);

        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return 0;
        }
    }

    @Override
    public void addTransaction(TUser ooTUser, TUser caisse, String pkey, Integer montant, Integer voidAmount,
            Integer montantNet, Integer montantVerse, Boolean checked, CategoryTransaction categoryTransaction,
            TypeTransaction typeTransaction, TTypeReglement reglement, TTypeMvtCaisse tTypeMvtCaisse, EntityManager emg,
            Integer montantPaye, Integer montantTva, Integer marge, String reference, String organisme,
            Integer montantRestant) {
        MvtTransaction transaction = new MvtTransaction();
        int compare = montantNet.compareTo(montantVerse);
        Integer montantPaid;
        if (compare <= 0) {
            montantPaid = montantNet;
        } else {
            montantPaid = montantVerse;

        }
        transaction.setUuid(UUID.randomUUID().toString());
        transaction.setUser(ooTUser);
        transaction.setCreatedAt(LocalDateTime.now());
        transaction.setPkey(pkey);
        transaction.setMvtDate(LocalDate.now());
        transaction.setAvoidAmount(voidAmount);
        transaction.setMontant(montant);
        transaction.setMagasin(ooTUser.getLgEMPLACEMENTID());
        transaction.setCaisse(caisse);
        transaction.setMontantCredit(0);
        transaction.setMontantVerse(montantVerse);
        transaction.setMontantRegle(montantPaid);
        transaction.setMontantPaye(montantPaye);
        transaction.setMontantNet(montantNet);
        transaction.settTypeMvtCaisse(tTypeMvtCaisse);
        transaction.setReglement(reglement);
        transaction.setMontantRestant(montantRestant > 4 ? montantRestant : 0);
        transaction.setMontantRemise(0);
        transaction.setMontantTva(montantTva);
        transaction.setMarge(marge);
        transaction.setCategoryTransaction(categoryTransaction);
        transaction.setTypeTransaction(typeTransaction);
        transaction.setChecked(checked);
        transaction.setReference(reference);
        transaction.setOrganisme(organisme);
        emg.persist(transaction);
    }

    public void addTransactionBL(TUser ooTUser, TBonLivraison bl) {

        MvtTransaction transaction = new MvtTransaction();
        transaction.setUuid(UUID.randomUUID().toString());
        transaction.setUser(ooTUser);
        transaction.setCreatedAt(DateConverter.convertDateToLocalDateTime(bl.getDtDATELIVRAISON()));
        transaction.setPkey(bl.getLgBONLIVRAISONID());
        transaction.setMvtDate(DateConverter.convertDateToLocalDate(bl.getDtDATELIVRAISON()));
        transaction.setAvoidAmount(0);
        transaction.setMontant(bl.getIntHTTC());
        transaction.setMontantTva(bl.getIntTVA());
        transaction.setMagasin(ooTUser.getLgEMPLACEMENTID());
        transaction.setCaisse(ooTUser);
        transaction.setMontantCredit(0);
        transaction.setGrossiste(bl.getLgORDERID().getLgGROSSISTEID());
        transaction.setMontantRegle(0);
        transaction.setMontantVerse(0);
        transaction.setMontantRestant(bl.getIntHTTC());
        transaction.setMontantNet(bl.getIntMHT());
        transaction.setMontantRemise(0);
        transaction.setMarge(0);
        transaction.setMontantAcc(bl.getIntMHT());
        transaction.setReference(bl.getStrREFLIVRAISON());
        transaction.setCategoryTransaction(CategoryTransaction.DEBIT);
        transaction.setTypeTransaction(TypeTransaction.ACHAT);
        transaction.setChecked(Boolean.TRUE);
        this.getEntityManager().persist(transaction);
    }

}
