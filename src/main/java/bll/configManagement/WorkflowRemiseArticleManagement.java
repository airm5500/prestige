/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import dal.TGrilleRemise;
import dal.TWorkflowRemiseArticle;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class WorkflowRemiseArticleManagement extends bllBase {

    Object Otable = TWorkflowRemiseArticle.class;

    public WorkflowRemiseArticleManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(String str_DESCRIPTION, String str_CODE_REMISE_ARTICLE, int str_CODE_GRILLE_VO,
            int str_CODE_GRILLE_VNO) {

        try {

            TWorkflowRemiseArticle OTWorkflowRemiseArticle = new TWorkflowRemiseArticle();

            OTWorkflowRemiseArticle.setLgWORKFLOWREMISEARTICLEID(this.getKey().getComplexId());
            OTWorkflowRemiseArticle.setStrDESCRIPTION(str_DESCRIPTION);

            TGrilleRemise OTGrilleRemise_VO = null;
            TGrilleRemise OTGrilleRemise_VNO = null;

            try {
                OTGrilleRemise_VO = (TGrilleRemise) this.getOdataManager().getEm()
                        .createQuery("SELECT t FROM TGrilleRemise t WHERE t.strCODEGRILLE = ?1")
                        .setParameter(1, str_CODE_GRILLE_VO).getSingleResult();

                OTWorkflowRemiseArticle.setStrCODEGRILLEVO(OTGrilleRemise_VO.getStrCODEGRILLE());

            } catch (Exception e) {
                new logger().OCategory.info("ERROR Workflow Remise VO  " + e.toString());
                this.buildErrorTraceMessage("ERROR Workflow Remise VO", e.toString());
            }

            try {
                OTGrilleRemise_VNO = (TGrilleRemise) this.getOdataManager().getEm()
                        .createQuery("SELECT t FROM TGrilleRemise t WHERE t.strCODEGRILLE = ?1")
                        .setParameter(1, str_CODE_GRILLE_VNO).getSingleResult();

                OTWorkflowRemiseArticle.setStrCODEGRILLEVNO(OTGrilleRemise_VNO.getStrCODEGRILLE());
            } catch (Exception e) {
                new logger().OCategory.info("ERROR Workflow Remise VNO  " + e.toString());
                this.buildErrorTraceMessage("ERROR Workflow Remise VNO", e.toString());

            }

            OTWorkflowRemiseArticle.setStrCODEREMISEARTICLE(str_CODE_REMISE_ARTICLE);
            OTWorkflowRemiseArticle.setStrSTATUT(commonparameter.statut_enable);
            OTWorkflowRemiseArticle.setDtCREATED(new Date());

            this.persiste(OTWorkflowRemiseArticle);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String lg_WORKFLOW_REMISE_ARTICLE_ID, String str_DESCRIPTION, String str_CODE_REMISE_ARTICLE,
            int str_CODE_GRILLE_VO, int str_CODE_GRILLE_VNO) {

        try {

            TWorkflowRemiseArticle OTWorkflowRemiseArticle = null;

            OTWorkflowRemiseArticle = getOdataManager().getEm().find(TWorkflowRemiseArticle.class,
                    lg_WORKFLOW_REMISE_ARTICLE_ID);

            TGrilleRemise OTGrilleRemise_VO = null;
            TGrilleRemise OTGrilleRemise_VNO = null;

            try {
                OTGrilleRemise_VO = (TGrilleRemise) this.getOdataManager().getEm()
                        .createQuery("SELECT t FROM TGrilleRemise t WHERE t.strCODEGRILLE = ?1")
                        .setParameter(1, str_CODE_GRILLE_VO).getSingleResult();

                OTWorkflowRemiseArticle.setStrCODEGRILLEVO(OTGrilleRemise_VO.getStrCODEGRILLE());

            } catch (Exception e) {
                new logger().OCategory.info("ERROR Workflow Remise VO  " + e.toString());
                this.buildErrorTraceMessage("ERROR Workflow Remise VO", e.toString());
            }

            try {
                OTGrilleRemise_VNO = (TGrilleRemise) this.getOdataManager().getEm()
                        .createQuery("SELECT t FROM TGrilleRemise t WHERE t.strCODEGRILLE = ?1")
                        .setParameter(1, str_CODE_GRILLE_VNO).getSingleResult();

                OTWorkflowRemiseArticle.setStrCODEGRILLEVNO(OTGrilleRemise_VNO.getStrCODEGRILLE());
            } catch (Exception e) {
                new logger().OCategory.info("ERROR Workflow Remise VNO  " + e.toString());
                this.buildErrorTraceMessage("ERROR Workflow Remise VNO", e.toString());

            }

            OTWorkflowRemiseArticle.setStrCODEREMISEARTICLE(str_CODE_REMISE_ARTICLE);
            OTWorkflowRemiseArticle.setStrDESCRIPTION(str_DESCRIPTION);

            OTWorkflowRemiseArticle.setStrSTATUT(commonparameter.statut_enable);
            OTWorkflowRemiseArticle.setDtUPDATED(new Date());

            this.persiste(OTWorkflowRemiseArticle);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }
}
