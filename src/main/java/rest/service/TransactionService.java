/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import dal.TBonLivraison;
import dal.TGrossiste;
import dal.TTypeMvtCaisse;
import dal.TTypeReglement;
import dal.TUser;
import dal.enumeration.CategoryTransaction;
import dal.enumeration.TypeTransaction;
import java.time.LocalDate;
import javax.ejb.Local;
import javax.persistence.EntityManager;

/**
 *
 * @author DICI
 */
@Local
// @Remote
public interface TransactionService {

    void addTransaction(TUser ooTUser, String pkey, Integer montant, Integer montantNet, Integer montantVerse,
            TGrossiste grossiste, Integer montantTva, String reference);

    void addTransaction(TUser ooTUser, TUser caisse, String pkey, Integer montant, Integer voidAmount,
            Integer montantNet, Integer montantVerse, Boolean checked, CategoryTransaction categoryTransaction,
            TypeTransaction typeTransaction, TTypeReglement reglement, TTypeMvtCaisse tTypeMvtCaisse, EntityManager emg,
            Integer montantPaye, Integer montantTva, Integer marge, String reference);

    void addTransaction(TUser ooTUser, TUser caisse, String pkey, Integer montant, Integer voidAmount,
            Integer montantNet, Integer montantVerse, Boolean checked, CategoryTransaction categoryTransaction,
            TypeTransaction typeTransaction, TTypeReglement reglement, TTypeMvtCaisse tTypeMvtCaisse, EntityManager emg,
            Integer montantPaye, Integer montantTva, Integer marge, String reference, String organisme);

    void addTransaction(TUser ooTUser, TUser caisse, String pkey, Integer montant, Integer voidAmount,
            Integer montantNet, Integer discount, Integer montantVerse, Boolean checked,
            CategoryTransaction categoryTransaction, TypeTransaction typeTransaction, TTypeReglement reglement,
            TTypeMvtCaisse tTypeMvtCaisse, Integer montantCredit, EntityManager emg, Integer montantPaye,
            Integer montantTva, Integer marge, String reference);

    Integer avoidAmount(String userId, LocalDate dtStart, EntityManager emg);

    void addTransaction(TUser ooTUser, TUser caisse, String pkey, Integer montant, Integer voidAmount,
            Integer montantNet, Integer montantVerse, Boolean checked, CategoryTransaction categoryTransaction,
            TypeTransaction typeTransaction, TTypeReglement reglement, TTypeMvtCaisse tTypeMvtCaisse, EntityManager emg,
            Integer montantPaye, Integer montantTva, Integer marge, String reference, String organisme,
            Integer montantRestant);

    void addTransactionBL(TUser ooTUser, TBonLivraison bl);

}
