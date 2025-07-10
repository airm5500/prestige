/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import dal.TTauxRembourssement;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;
import toolkits.utils.date;
import toolkits.utils.logger;

/**
 *
 * @author AMIGONE
 */
public class TauxRembourssementManagement extends bllBase {

    Object Otable = TTauxRembourssement.class;

    public TauxRembourssementManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(int str_CODE_REMB, String str_LIBELLEE) {

        try {

            TTauxRembourssement TTauxRembourssement = new TTauxRembourssement();

            TTauxRembourssement.setLgTAUXREMBOURID(this.getKey().getComplexId());
            TTauxRembourssement.setStrCODEREMB(str_CODE_REMB);
            TTauxRembourssement.setStrLIBELLEE(str_LIBELLEE);

            TTauxRembourssement.setStrSTATUT(commonparameter.statut_enable);
            TTauxRembourssement.setDtCREATED(new Date());

            this.persiste(TTauxRembourssement);
            new logger().oCategory.info("Mise a jour TTauxRembourssement " + TTauxRembourssement.getLgTAUXREMBOURID()
                    + " StrName " + TTauxRembourssement.getStrLIBELLEE());

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public void update(String lg_TAUX_REMBOUR_ID, int str_CODE_REMB, String str_LIBELLEE) {

        try {

            new logger().oCategory.info("lg_TAUX_REMBOUR_ID     Create   " + lg_TAUX_REMBOUR_ID);

            dal.TTauxRembourssement TTauxRembourssement = null;

            TTauxRembourssement = getOdataManager().getEm().find(TTauxRembourssement.class, lg_TAUX_REMBOUR_ID);
            TTauxRembourssement.setStrCODEREMB(str_CODE_REMB);
            TTauxRembourssement.setStrLIBELLEE(str_LIBELLEE);

            TTauxRembourssement.setStrSTATUT(commonparameter.statut_enable);
            TTauxRembourssement.setDtUPDATED(new Date());

            this.persiste(TTauxRembourssement);
            new logger().oCategory.info("Mise a jour TTauxRembourssement " + TTauxRembourssement.getLgTAUXREMBOURID()
                    + " StrLabel " + TTauxRembourssement.getStrLIBELLEE());

        } catch (Exception e) {

            new logger().oCategory.info("Mise a jour TTauxRembourssement IMPOSSIBLE");

        }

    }

}
