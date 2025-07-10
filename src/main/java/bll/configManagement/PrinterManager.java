/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import bll.entity.EntityData;
import dal.TImprimante;
import dal.TUser;
import dal.dataManager;
import java.util.Date;
import java.util.*;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AKOUAME
 */
public class PrinterManager extends bllBase {

    public PrinterManager(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public PrinterManager(dataManager odataManager, TUser oTUser) {
        this.setOTUser(oTUser);
        this.setOdataManager(odataManager);
        this.checkDatamanager();
    }

    // recupere l'imprimante
    public TImprimante getTImprimante(String lg_IMPRIMANTE_ID) {
        TImprimante OTImprimante = null;
        try {
            OTImprimante = (TImprimante) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TImprimante t WHERE (t.lgIMPRIMANTEID LIKE ?1 OR t.strNAME LIKE ?1) AND t.strSTATUT = ?2")
                    .setParameter(1, lg_IMPRIMANTE_ID).setParameter(2, commonparameter.statut_enable).getSingleResult();
            new logger().OCategory.info("Mois " + OTImprimante.getStrNAME());
        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTImprimante;
    }
    // fin recupere l'imprimante

    // fonction pour créer une imprimante
    public boolean createImprimante(String str_NAME, String str_DESCRIPTION) {
        boolean result = false;
        try {
            TImprimante OTImprimante = new TImprimante();
            OTImprimante.setLgIMPRIMANTEID(this.getKey().getComplexId());
            OTImprimante.setStrNAME(str_NAME);
            OTImprimante.setStrDESCRIPTION(str_DESCRIPTION);
            OTImprimante.setStrSTATUT(commonparameter.statut_enable);
            OTImprimante.setDtCREATED(new Date());
            if (this.persiste(OTImprimante)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec d'enregistrement de l'imprimante");
            }

        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'enregistrement de l'imprimante");
        }
        return result;
    }
    // fin fonction pour créer une imprimante

    // mise a jour d'une imprimante
    public boolean updateImprimante(String lg_IMPRIMANTE_ID, String str_NAME, String str_DESCRIPTION) {
        boolean result = false;
        try {
            TImprimante OTImprimante = this.getTImprimante(lg_IMPRIMANTE_ID);
            OTImprimante.setStrNAME(str_NAME);
            OTImprimante.setStrDESCRIPTION(str_DESCRIPTION);
            OTImprimante.setDtUPDATED(new Date());
            if (this.persiste(OTImprimante)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
                result = true;
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour de l'imprimante");
            }

        } catch (Exception e) {
            // e.printStackTrace();
            this.buildErrorTraceMessage("Echec de mise à jour de l'imprimante");
        }
        return result;
    }
    // fin mise a jour d'une imprimante

    // fonction pour supprimer d'une imprimante
    public boolean deleteImprimante(String lg_IMPRIMANTE_ID) {
        boolean result = false;
        try {
            TImprimante OTImprimante = this.getTImprimante(lg_IMPRIMANTE_ID);
            OTImprimante.setStrSTATUT(commonparameter.statut_delete);
            OTImprimante.setDtUPDATED(new Date());
            this.persiste(OTImprimante);
            result = true;
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de l'impimante");
        }
        return result;
    }
    // fin fonction pour supprimer une imprimante

    // Liste des imprimantes
    public List<TImprimante> getListeImprimante(String search_value, String lg_IMPRIMANTE_ID) {
        List<TImprimante> lstTImprimante = new ArrayList<TImprimante>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTImprimante = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TImprimante t WHERE (t.lgIMPRIMANTEID LIKE ?1 OR t.strNAME LIKE ?1) AND t.strSTATUT = ?2 AND (t.strDESCRIPTION LIKE ?3 OR t.strNAME LIKE ?3) ORDER BY t.strDESCRIPTION ASC")
                    .setParameter(1, lg_IMPRIMANTE_ID).setParameter(2, commonparameter.statut_enable)
                    .setParameter(3, search_value + "%").getResultList();
        } catch (Exception e) {
            // e.printStackTrace();
        }
        new logger().OCategory.info("Taille liste " + lstTImprimante.size());
        return lstTImprimante;
    }

    /*
     * public List<TUserImprimante> getListeImprimanteByUser(String lg_USER_ID, String lg_IMPRIMANTE_ID) {
     * List<TUserImprimante> lstTUserImprimante = new ArrayList<TUserImprimante>();
     *
     * try { lstTUserImprimante = this.getOdataManager().getEm().
     * createQuery("SELECT t FROM TUserImprimante t WHERE t.lgIMPRIMANTEID.lgIMPRIMANTEID LIKE ?1 AND t.lgUSERID.lgUSERID LIKE ?2 AND t.strSTATUT = ?3 ORDER BY t.dtCREATED DESC"
     * ) .setParameter(1, lg_IMPRIMANTE_ID).setParameter(2, lg_USER_ID).setParameter(3,
     * commonparameter.statut_enable).getResultList(); } catch (Exception e) { // e.printStackTrace(); } new
     * logger().OCategory.info("Taille liste " + lstTUserImprimante.size()); return lstTUserImprimante; } //fin Liste
     * des imprimantes
     *
     * //recuperation de l'imprimante d'un utilisateur public TUserImprimante getTUserImprimante(String lg_USER_ID,
     * String lg_IMPRIMANTE_ID, String str_NAME) { TUserImprimante OTUserImprimante = null; List<TUserImprimante>
     * lstTUserImprimante = new ArrayList<TUserImprimante>(); try { lstTUserImprimante = this.getOdataManager().getEm().
     * createQuery("SELECT t FROM TUserImprimante t WHERE t.lgUSERID.lgUSERID = ?1 AND t.lgIMPRIMANTEID.lgIMPRIMANTEID LIKE ?2 AND t.strNAME = ?3 AND t.strSTATUT = ?4"
     * ) .setParameter(1, lg_USER_ID).setParameter(2, lg_IMPRIMANTE_ID).setParameter(3, str_NAME).setParameter(4,
     * commonparameter.statut_enable).getResultList(); if(lstTUserImprimante.size() > 0) { OTUserImprimante =
     * lstTUserImprimante.get(0); this.buildSuccesTraceMessage("Utilisateur valide"); } else {
     * this.buildErrorTraceMessage("Utilisateur non abilité à utiliser l'imprimante"); }
     *
     * } catch (Exception e) { e.printStackTrace();
     * this.buildErrorTraceMessage("Utilisateur non abilité à utiliser l'imprimante"); } return OTUserImprimante; }
     *
     * public TUserImprimante getTUserImprimante(String lg_USER_ID, String lg_IMPRIMANTE_ID) { TUserImprimante
     * OTUserImprimante = null; try { OTUserImprimante = (TUserImprimante) this.getOdataManager().getEm().
     * createQuery("SELECT t FROM TUserImprimante t WHERE t.lgUSERID.lgUSERID = ?1 AND t.lgIMPRIMANTEID.lgIMPRIMANTEID LIKE ?2 AND t.strSTATUT = ?4"
     * ) .setParameter(1, lg_USER_ID).setParameter(2, lg_IMPRIMANTE_ID).setParameter(4,
     * commonparameter.statut_enable).getSingleResult(); this.buildSuccesTraceMessage("Utilisateur valide"); } catch
     * (Exception e) { e.printStackTrace();
     * this.buildErrorTraceMessage("Utilisateur non abilité à utiliser l'imprimante"); } return OTUserImprimante; }
     *
     * //assignation d'une imprimante a un utilisateur public boolean createUserImprimante(TImprimante OTImprimante,
     * TUser OTUser, String str_NAME) { boolean result = false; try { TUserImprimante OTUserImprimante = new
     * TUserImprimante(); OTUserImprimante.setLgUSERIMPRIMQNTEID(this.getKey().getComplexId());
     * OTUserImprimante.setLgIMPRIMANTEID(OTImprimante); OTUserImprimante.setLgUSERID(OTUser);
     * OTUserImprimante.setStrNAME(str_NAME); OTUserImprimante.setStrDESCRIPTION(OTUserImprimante.getStrNAME());
     * OTUserImprimante.setStrSTATUT(commonparameter.statut_enable); OTUserImprimante.setDtCREATED(new Date());
     * this.persiste(OTUserImprimante); result = true;
     * this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES")); } catch (Exception e) {
     * e.printStackTrace();
     * this.buildErrorTraceMessage("Echec d'assignation de l'imprimante à l'utilisateur sélectionné"); } return result;
     * }
     *
     * //fin assignation d'une imprimante a un utilisateur
     *
     * //suppression d'une imprimante a un utilisateur public boolean deleteUserImprimante(String lg_USER_IMPRIMQNTE_ID)
     * { boolean result = false; try { TUserImprimante OTUserImprimante =
     * this.getOdataManager().getEm().find(TUserImprimante.class, lg_USER_IMPRIMQNTE_ID); this.delete(OTUserImprimante);
     * result = true; this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES")); } catch (Exception e) {
     * e.printStackTrace();
     * this.buildErrorTraceMessage("Echec de suppression de l'imprimante pour cet utilisateur sélectionné"); } return
     * result; }
     *
     * //fin suppression d'une imprimante a un utilisateur
     */
    public List<EntityData> showAllOrOneUserByImprimante(String search_value, String lg_USER_ID,
            String lg_IMPRIMANTE_ID) {

        List<EntityData> Lst = new ArrayList<EntityData>();
        List<TImprimante> lstTImprimante = new ArrayList<TImprimante>();
        EntityData OEntityData = null;

        try {
            lstTImprimante = this.getListeImprimante(search_value, lg_IMPRIMANTE_ID);
            for (TImprimante OTImprimante : lstTImprimante) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(OTImprimante.getLgIMPRIMANTEID());
                OEntityData.setStr_value2(OTImprimante.getStrDESCRIPTION());
                // OEntityData.setStr_value3(String.valueOf(this.isExistUserImprimante(lg_USER_ID,
                // OTImprimante.getLgIMPRIMANTEID())));

                Lst.add(OEntityData);
            }

        } catch (Exception ex) {
            new logger().OCategory.fatal(ex.getMessage());
        }
        new logger().OCategory.info("Taille liste " + Lst.size());
        return Lst;
    }

    /*
     * public boolean isExistUserImprimante(String lg_USER_ID, String lg_IMPRIMANTE_ID) { boolean result = false; try {
     * TUserImprimante OTUserImprimante = (TUserImprimante) this.getOdataManager().getEm().
     * createQuery("SELECT t FROM TUserImprimante t WHERE t.lgUSERID.lgUSERID LIKE ?1 AND t.lgIMPRIMANTEID.lgIMPRIMANTEID LIKE ?2"
     * ) .setParameter(1, lg_USER_ID).setParameter(2, lg_IMPRIMANTE_ID).getSingleResult(); if (OTUserImprimante != null)
     * { result = true; } } catch (Exception e) { // e.printStackTrace(); } return result; }
     */
}
