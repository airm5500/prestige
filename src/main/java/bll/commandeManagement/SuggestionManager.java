/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.commandeManagement;

import bll.bllBase;
import bll.configManagement.familleGrossisteManagement;
import dal.TFamille;
import dal.TFamilleGrossiste;
import dal.TGrossiste;
import dal.TPreenregistrementDetail;
import dal.TSuggestionOrder;
import dal.TSuggestionOrderDetails;
import dal.dataManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author KKOFFI
 */
public class SuggestionManager extends bllBase {

    public SuggestionManager(dataManager OdataManager) {
        super.setOdataManager(OdataManager);
        super.checkDatamanager();
    }

    public void createsuggestionOrderDetails(TFamille OTFamille, TGrossiste OTGrossiste,
            TSuggestionOrder OTSuggestionOrder, int int_qte, String str_STATUT) {
        TSuggestionOrderDetails OTSuggestionOrderDetails = null;

        try {

            OTSuggestionOrderDetails = this.isProductExistInSomeSuggestion(OTFamille.getLgFAMILLEID(), str_STATUT);
            if (OTSuggestionOrderDetails == null) {

                OTSuggestionOrderDetails = this.initTSuggestionOrderDetail(OTSuggestionOrder, OTFamille, OTGrossiste,
                        int_qte, str_STATUT);
            } else if (str_STATUT.equalsIgnoreCase(commonparameter.statut_is_Process)) {
                OTSuggestionOrderDetails.setIntNUMBER(int_qte);
                OTSuggestionOrderDetails.setIntPRICE(int_qte * OTSuggestionOrderDetails.getIntPAFDETAIL());
            }
            // code ajouté
            OTSuggestionOrder.setDtUPDATED(new Date());
            this.getOdataManager().getEm().merge(OTSuggestionOrderDetails);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'ajout du produit à la suggestion");
        }

        new logger().OCategory
                .info("Mise a jour de OTSuggestionOrderDetails " + OTSuggestionOrderDetails.getIntNUMBER());

    }

    private TSuggestionOrder createSuggestionOrder(String lgGROSSISTE_ID, String str_STATUT) {
        TSuggestionOrder OTSuggestionOrder = null;
        TGrossiste OTGrossiste = null;
        try {
            OTSuggestionOrder = new TSuggestionOrder();
            OTSuggestionOrder.setLgSUGGESTIONORDERID(this.getKey().getComplexId());
            OTSuggestionOrder.setStrREF("REF_" + this.getKey().getShortId(7));
            OTGrossiste = this.getOdataManager().getEm().find(TGrossiste.class, lgGROSSISTE_ID);
            if (OTGrossiste == null) {
                this.buildErrorTraceMessage("Echec d'enregistrement de la suggestion. Grossiste inexistant");
                return null;
            }
            OTSuggestionOrder.setLgGROSSISTEID(OTGrossiste);
            OTSuggestionOrder.setStrSTATUT(str_STATUT);
            OTSuggestionOrder.setDtCREATED(new Date());
            OTSuggestionOrder.setDtUPDATED(new Date());
            this.getOdataManager().getEm().persist(OTSuggestionOrder);

        } catch (Exception e) {
            e.printStackTrace();
        }
        return OTSuggestionOrder;
    }

    private List<TPreenregistrementDetail> getPreenregistrementDetails(String lg_Preenrengistrement_id) {
        List<TPreenregistrementDetail> list = new ArrayList<>();
        try {
            list = this.getOdataManager().getEm().createQuery(
                    "SELECT o FROM TPreenregistrementDetail o WHERE o.lgPREENREGISTREMENTID.lgPREENREGISTREMENTID=?1  ")
                    .setParameter(1, lg_Preenrengistrement_id).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return list;
    }

    public boolean createsellsuggestion(String lg_Preenrengistrement_id) {
        boolean isOk = false;
        List<TPreenregistrementDetail> list = getPreenregistrementDetails(lg_Preenrengistrement_id);
        try {

            if (list.size() > 0) {
                if (!this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().begin();
                }
                /*
                 * for (TPreenregistrementDetail tPreenregistrementDetail : list) { TFamille
                 * famille=tPreenregistrementDetail.getLgFAMILLEID(); TGrossiste tg=famille.getLgGROSSISTEID();
                 * TSuggestionOrder order=createSuggestionOrder(tg.getLgGROSSISTEID(),
                 * commonparameter.statut_is_Process); createsuggestionOrderDetails(famille, tg, order,
                 * tPreenregistrementDetail.getIntQUANTITY(), commonparameter.statut_is_Process);
                 *
                 * }
                 */

                list.forEach((tPreenregistrementDetail) -> {
                    TFamille famille = tPreenregistrementDetail.getLgFAMILLEID();
                    TGrossiste tg = famille.getLgGROSSISTEID();
                    TSuggestionOrder order = createSuggestionOrder(tg.getLgGROSSISTEID(),
                            commonparameter.statut_is_Process);
                    createsuggestionOrderDetails(famille, tg, order, tPreenregistrementDetail.getIntQUANTITY(),
                            commonparameter.statut_is_Process);
                });

                if (this.getOdataManager().getEm().getTransaction().isActive()) {
                    this.getOdataManager().getEm().getTransaction().commit();
                    isOk = true;
                }

            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return isOk;

    }

    private TSuggestionOrderDetails isProductExistInSomeSuggestion(String lg_famille_id, String str_STATUT) {
        TSuggestionOrderDetails OTSuggestionOrderDetails = null;
        try {
            OTSuggestionOrderDetails = (TSuggestionOrderDetails) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TSuggestionOrderDetails t WHERE t.lgFAMILLEID.lgFAMILLEID = ?1 AND t.lgSUGGESTIONORDERID.strSTATUT LIKE ?2")
                    .setParameter(1, lg_famille_id).setParameter(2, str_STATUT).setMaxResults(1).getSingleResult();

        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
            new logger().OCategory.info(" *** Desoleeeeeee OTSuggestionOrderDetails   5555 *** " + e.toString());
        }
        return OTSuggestionOrderDetails;
    }

    private TSuggestionOrderDetails initTSuggestionOrderDetail(TSuggestionOrder OTSuggestionOrder, TFamille OTFamille,
            TGrossiste OTGrossiste, int int_NUMBER, String str_STATUT) {
        TFamilleGrossiste OTFamilleGrossiste = null;
        familleGrossisteManagement OfamilleGrossisteManagement = new familleGrossisteManagement(this.getOdataManager());
        try {
            OTFamilleGrossiste = OfamilleGrossisteManagement.findFamilleGrossiste(OTFamille.getLgFAMILLEID(),
                    OTGrossiste.getLgGROSSISTEID());

            TSuggestionOrderDetails OTSuggestionOrderDetails = new TSuggestionOrderDetails();
            OTSuggestionOrderDetails.setLgSUGGESTIONORDERDETAILSID(this.getKey().getComplexId());
            OTSuggestionOrderDetails.setLgSUGGESTIONORDERID(OTSuggestionOrder);
            OTSuggestionOrderDetails.setLgFAMILLEID(OTFamille);
            OTSuggestionOrderDetails.setLgGROSSISTEID(OTGrossiste);
            OTSuggestionOrderDetails.setIntNUMBER(int_NUMBER);
            /*
             * OTSuggestionOrderDetails.setIntPRICE(OTFamille.getIntPAF() * int_NUMBER); //a decommenter en cas de
             * probleme 06/03/2017 OTSuggestionOrderDetails.setIntPAFDETAIL(OTFamille.getIntPAF());
             * OTSuggestionOrderDetails.setIntPRICEDETAIL(OTFamille.getIntPRICE());
             */
            OTSuggestionOrderDetails.setIntPRICE((OTFamilleGrossiste != null && OTFamilleGrossiste.getIntPAF() != null
                    && OTFamilleGrossiste.getIntPAF() != 0) ? OTFamilleGrossiste.getIntPAF() * int_NUMBER
                            : OTFamille.getIntPAF() * int_NUMBER);
            OTSuggestionOrderDetails.setIntPAFDETAIL((OTFamilleGrossiste != null
                    && OTFamilleGrossiste.getIntPAF() != null && OTFamilleGrossiste.getIntPAF() != 0)
                            ? OTFamilleGrossiste.getIntPAF() : OTFamille.getIntPAF());
            OTSuggestionOrderDetails.setIntPRICEDETAIL((OTFamilleGrossiste != null
                    && OTFamilleGrossiste.getIntPRICE() != null && OTFamilleGrossiste.getIntPRICE() != 0)
                            ? OTFamilleGrossiste.getIntPRICE() : OTFamille.getIntPRICE());

            OTSuggestionOrderDetails.setStrSTATUT(str_STATUT);
            OTSuggestionOrderDetails.setDtCREATED(new Date());
            OTSuggestionOrderDetails.setDtUPDATED(new Date());
            this.getOdataManager().getEm().persist(OTSuggestionOrderDetails);
            // this.persiste(OTSuggestionOrderDetails);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
            return OTSuggestionOrderDetails;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Impossible d'ajout cet article à la suggestion");
            return null;
        }
    }

}
