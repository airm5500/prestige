/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import dal.TFormeArticle;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;

/**
 *
 * @author AKOUAME
 */
public class formeArticleManagement extends bllBase {

    Object Otable = TFormeArticle.class;

    public formeArticleManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String str_CODE, String str_LIBELLE) {

        try {

            TFormeArticle OTFormeArticle = new TFormeArticle();
            OTFormeArticle.setLgFORMEARTICLEID(this.getKey().getComplexId()); // Génération automatique d'un ID à partir
                                                                              // de la date courante
            OTFormeArticle.setStrLIBELLE(str_LIBELLE);
            OTFormeArticle.setStrCODE(str_CODE);
            OTFormeArticle.setStrSTATUT(commonparameter.statut_enable);
            OTFormeArticle.setDtCREATED(new Date());

            if (this.persiste(OTFormeArticle)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de création de la forme d'article");
            }

        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de création de la forme d'article");
        }

    }

    public void update(String lg_FORME_ARTICLE_ID, String str_CODE, String str_LIBELLE) {
        TFormeArticle OTFormeArticle = null;
        try {

            OTFormeArticle = getOdataManager().getEm().find(TFormeArticle.class, lg_FORME_ARTICLE_ID);
            OTFormeArticle.setStrLIBELLE(str_LIBELLE);
            OTFormeArticle.setStrCODE(str_CODE);
            OTFormeArticle.setDtUPDATED(new Date());

            if (this.persiste(OTFormeArticle)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de mise à jour de la forme d'article");
            }

        } catch (Exception e) {
            this.buildErrorTraceMessage("Echec de mise à jour de la forme d'article");
        }

    }

    // supprimer forme article
    public boolean deleteFormeArticle(String lg_FORME_ARTICLE_ID) {
        boolean result = false;
        try {
            TFormeArticle OTFormeArticle = this.getOdataManager().getEm().find(TFormeArticle.class,
                    lg_FORME_ARTICLE_ID);
            if (this.delete(OTFormeArticle)) {
                this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            } else {
                this.buildErrorTraceMessage("Echec de suppression de la forme article");
            }
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de la forme article");
        }
        return result;
    }
    // fin supprimer forme article

}
