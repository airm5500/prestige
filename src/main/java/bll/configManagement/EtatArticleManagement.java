/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import dal.TEtatArticle;
import dal.dataManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class EtatArticleManagement extends bllBase {

    Object Otable = TEtatArticle.class;

    public EtatArticleManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String str_CODE, String str_LIBELLEE) {

        try {

            TEtatArticle OTEtatArticle = new TEtatArticle();

            OTEtatArticle.setLgETATARTICLEID(this.getKey().getComplexId());
            OTEtatArticle.setStrCODE(str_CODE);
            OTEtatArticle.setStrLIBELLEE(str_LIBELLEE);

            OTEtatArticle.setStrSTATUT(commonparameter.statut_enable);
            OTEtatArticle.setDtCREATED(new Date());

            this.persiste(OTEtatArticle);
            new logger().oCategory.info("Mise a jour OTEtatArticle " + OTEtatArticle.getLgETATARTICLEID() + " StrName "
                    + OTEtatArticle.getStrLIBELLEE());

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String lg_ETAT_ARTICLE_ID, String str_CODE, String str_LIBELLEE) {

        try {

            new logger().oCategory.info("lg_ETAT_ARTICLE_ID     Create   " + lg_ETAT_ARTICLE_ID);

            dal.TEtatArticle OTEtatArticle = null;

            OTEtatArticle = getOdataManager().getEm().find(TEtatArticle.class, lg_ETAT_ARTICLE_ID);
            OTEtatArticle.setStrCODE(str_CODE);
            OTEtatArticle.setStrLIBELLEE(str_LIBELLEE);

            OTEtatArticle.setStrSTATUT(commonparameter.statut_enable);
            OTEtatArticle.setDtUPDATED(new Date());

            this.persiste(OTEtatArticle);
            new logger().oCategory.info("Mise a jour OTEtatArticle " + OTEtatArticle.getLgETATARTICLEID() + " StrLabel "
                    + OTEtatArticle.getStrLIBELLEE());

        } catch (Exception e) {

            new logger().oCategory.info("Mise a jour OTEtatArticle IMPOSSIBLE");

        }

    }

    // liste etat article
    public List<TEtatArticle> getAllEtatArticle(String search_value) {
        List<TEtatArticle> lstTEtatArticle = new ArrayList<TEtatArticle>();

        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            lstTEtatArticle = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TEtatArticle t WHERE (t.strCODE LIKE ?2 OR t.strLIBELLEE LIKE ?2) AND t.strSTATUT = ?1 ")
                    .setParameter(1, commonparameter.statut_enable).setParameter(2, search_value + "%").getResultList();

        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lstTEtatArticle taille " + lstTEtatArticle.size());
        return lstTEtatArticle;
    }
    // fin liste etat article

}
