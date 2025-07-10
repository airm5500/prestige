/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import dal.HMvtProduit;
import dal.TEmplacement;
import dal.TFamille;
import dal.TUser;
import dal.Typemvtproduit;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import javax.persistence.EntityManager;

/**
 *
 * @author DICI
 */
public class MvtProduitObselete {

    // private final EntityManager em;

    public MvtProduitObselete() {
        // this.em = _em;

    }

    public void saveMvtProduit(String pkey, Typemvtproduit typemvtproduit, TFamille famille, TUser lgUSERID,
            TEmplacement emplacement, Integer qteMvt, Integer qteDebut, Integer qteFinale, Integer valeurTva,
            EntityManager em) {
        HMvtProduit h = new HMvtProduit();
        h.setUuid(UUID.randomUUID().toString());
        h.setCreatedAt(LocalDateTime.now());
        h.setEmplacement(emplacement);
        h.setLgUSERID(lgUSERID);
        h.setFamille(famille);
        h.setMvtDate(LocalDate.now());
        h.setValeurTva(valeurTva);
        h.setTypemvtproduit(typemvtproduit);
        h.setPrixUn(famille.getIntPRICE());
        h.setPrixAchat(famille.getIntPAF());
        h.setQteMvt(qteMvt);
        h.setQteDebut(qteDebut);
        h.setPkey(pkey);
        h.setQteFinale(qteFinale);
        em.persist(h);
    }

    private Typemvtproduit getTypemvtproduitByID(String id, EntityManager em) {
        return em.find(Typemvtproduit.class, id);
    }

    public void saveMvtProduit(Integer prixUn, String pkey, String typemvtproduit, TFamille famille, TUser lgUSERID,
            TEmplacement emplacement, Integer qteMvt, Integer qteDebut, Integer qteFinale, Integer valeurTva,
            EntityManager em) {
        HMvtProduit h = new HMvtProduit();
        h.setUuid(UUID.randomUUID().toString());
        h.setCreatedAt(LocalDateTime.now());
        h.setEmplacement(emplacement);
        h.setLgUSERID(lgUSERID);
        h.setFamille(famille);
        h.setMvtDate(LocalDate.now());
        h.setTypemvtproduit(getTypemvtproduitByID(typemvtproduit, em));
        h.setQteMvt(qteMvt);
        h.setValeurTva(valeurTva);
        h.setQteDebut(qteDebut);
        h.setPrixUn(prixUn);
        h.setPrixAchat(famille.getIntPAF());
        h.setPkey(pkey);
        h.setQteFinale(qteFinale);
        em.persist(h);
    }

    public void saveMvtProduit(String pkey, String typemvtproduit, TFamille famille, TUser lgUSERID,
            TEmplacement emplacement, Integer qteMvt, Integer qteDebut, Integer qteFinale, Integer valeurTva,
            EntityManager em) {
        HMvtProduit h = new HMvtProduit();
        h.setUuid(UUID.randomUUID().toString());
        h.setCreatedAt(LocalDateTime.now());
        h.setEmplacement(emplacement);
        h.setLgUSERID(lgUSERID);
        h.setFamille(famille);
        h.setMvtDate(LocalDate.now());
        h.setTypemvtproduit(getTypemvtproduitByID(typemvtproduit, em));
        h.setQteMvt(qteMvt);
        h.setValeurTva(valeurTva);
        h.setQteDebut(qteDebut);
        h.setPrixUn(famille.getIntPRICE());
        h.setPrixAchat(famille.getIntPAF());
        h.setPkey(pkey);
        h.setQteFinale(qteFinale);
        em.persist(h);
    }

}
