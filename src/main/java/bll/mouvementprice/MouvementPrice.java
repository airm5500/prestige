/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.mouvementprice;

import bll.common.Parameter;
import bll.userManagement.privilege;
import dal.TMouvementprice;
import dal.TUser;
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
public class MouvementPrice extends bll.bllBase {

    public MouvementPrice(dataManager OdataManager, TUser OTuser) {
        super.setOTUser(OTuser);
        super.setOdataManager(OdataManager);
        super.checkDatamanager();
    }

    public List<TMouvementprice> listPrixModifies(String search_value, Date dtDEBUT, Date dtFin, String lg_USER_ID,
            String lg_FAMILLE_ID, String str_ACTION) {

        List<TMouvementprice> lstTMouvementprice = new ArrayList<>();
        privilege Oprivilege = new privilege(this.getOdataManager(), this.getOTUser());
        String lg_EMPLACEMENT_ID = "";
        try {
            if (search_value.equalsIgnoreCase("") || search_value == null) {
                search_value = "%%";
            }
            if (Oprivilege.isColonneStockMachineIsAuthorize(Parameter.P_SHOW_ALL_ACTIVITY_ADMIN)) {
                lg_EMPLACEMENT_ID = "%%";
            } else {
                lg_EMPLACEMENT_ID = this.getOTUser().getLgEMPLACEMENTID().getLgEMPLACEMENTID();
            }
            lstTMouvementprice = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMouvementprice t WHERE t.lgFAMILLEID.lgFAMILLEID LIKE ?1 AND t.lgUSERID.lgUSERID LIKE ?2 AND t.strACTION LIKE ?3 AND  (t.dtCREATED BETWEEN ?4 AND ?5) AND ( t.lgFAMILLEID.intCIP LIKE ?6 OR t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6) AND t.lgUSERID.lgEMPLACEMENTID.lgEMPLACEMENTID LIKE ?7 ORDER BY t.strACTION DESC, t.lgFAMILLEID.strDESCRIPTION ASC, t.dtCREATED DESC")
                    .setParameter(1, lg_FAMILLE_ID).setParameter(2, lg_USER_ID).setParameter(3, str_ACTION)
                    .setParameter(4, dtDEBUT).setParameter(5, dtFin).setParameter(6, search_value + "%")
                    .setParameter(7, lg_EMPLACEMENT_ID).getResultList();

        } catch (Exception e) {
            e.printStackTrace();
            this.setMessage(commonparameter.PROCESS_FAILED);
        }
        new logger().OCategory.info("lstTPreenregistrement taille " + lstTMouvementprice.size());
        return lstTMouvementprice;
    }
}
