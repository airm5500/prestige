/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.eventlog;

import dal.TAlertEvent;
import dal.TAlertEventUserFone;
import dal.TEventLog;
import dal.TUserFone;
import dal.dataManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author TBEKOLA
 */
public class EventLogManagement extends bll.bllBase {

    public EventLogManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public List<TEventLog> GetLstTEventLog() {
        List<TEventLog> lstTEventLog = new ArrayList<TEventLog>();
        lstTEventLog = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TEventLog t WHERE t.strTABLECONCERN  LIKE ?1 AND t.strSTATUT  LIKE ?2  ORDER BY t.dtCREATED")
                .setParameter(1, "TFamille").setParameter(2, commonparameter.statut_enable).getResultList();

        return lstTEventLog;
    }

    public List<TEventLog> GetLstTEventLog(String Table) {
        List<TEventLog> lstTEventLog = new ArrayList<TEventLog>();
        lstTEventLog = this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TEventLog t WHERE t.strTABLECONCERN  LIKE ?1 AND t.strSTATUT  LIKE ?2  ORDER BY t.dtCREATED")
                .setParameter(1, Table).setParameter(2, commonparameter.statut_enable).getResultList();

        return lstTEventLog;
    }

    public boolean createAlertEventUserPhone(String str_Event, String lg_USER_FONE_ID) {
        boolean result = false;
        try {
            TAlertEvent OTAlertEvent = this.getOdataManager().getEm().find(TAlertEvent.class, str_Event);
            TUserFone OTUserFone = this.getOdataManager().getEm().find(TUserFone.class, lg_USER_FONE_ID);
            TAlertEventUserFone OAlertEventUserFone = new TAlertEventUserFone();
            OAlertEventUserFone.setLgID(this.getKey().getComplexId());
            OAlertEventUserFone.setLgUSERFONEID(OTUserFone);
            OAlertEventUserFone.setStrEvent(OTAlertEvent);
            OAlertEventUserFone.setStrSTATUT(commonparameter.statut_enable);
            this.persiste(OAlertEventUserFone);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        return result;
    }

    public boolean updateAlertEventUserPhone(TAlertEventUserFone OAlertEventUserFone, TAlertEvent OTAlertEvent,
            TUserFone OTUserFone) {
        boolean result = false;
        try {
            OAlertEventUserFone.setLgUSERFONEID(OTUserFone);
            OAlertEventUserFone.setStrEvent(OTAlertEvent);
            OAlertEventUserFone.setStrSTATUT(commonparameter.statut_enable);
            this.persiste(OAlertEventUserFone);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        return result;
    }

    public boolean removeAlertEventUserPhone(String str_Event, String lg_USER_FONE_ID) {
        boolean result = false;
        try {
            TAlertEventUserFone OAlertEventUserFone = (TAlertEventUserFone) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TAlertEventUserFone t WHERE t.lgUSERFONEID.lgUSERFONEID = ?1 AND t.strEvent.strEvent = ?2")
                    .setParameter(1, lg_USER_FONE_ID).setParameter(2, str_Event).getSingleResult();

            this.delete(OAlertEventUserFone);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        return result;
    }

    public boolean removeAlertEventUserPhone(TAlertEventUserFone OAlertEventUserFone) {
        boolean result = false;
        try {
            this.delete(OAlertEventUserFone);
            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de l'opération");
        }
        return result;
    }

    public List<TAlertEvent> getListeAlertEvent() {
        List<TAlertEvent> lst = new ArrayList<TAlertEvent>();
        try {
            lst = this.getOdataManager().getEm().createQuery("SELECT t FROM TAlertEvent t").getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lst getListeAlertEvent " + lst.size());
        return lst;
    }

    public List<TAlertEvent> getListeAlertEvent(String str_Event) {
        List<TAlertEvent> lst = new ArrayList<TAlertEvent>();
        try {
            lst = this.getOdataManager().getEm().createQuery("SELECT t FROM TAlertEvent t WHERE t.strEvent LIKE ?1")
                    .setParameter(1, str_Event).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lst getListeAlertEvent " + lst.size());
        return lst;
    }

    public List<TAlertEventUserFone> getListeAlertEventUserFone(String lg_USER_FONE_ID) {
        List<TAlertEventUserFone> lst = new ArrayList<TAlertEventUserFone>();
        try {
            lst = this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TAlertEventUserFone t WHERE t.lgUSERFONEID.lgUSERFONEID LIKE ?1")
                    .setParameter(1, lg_USER_FONE_ID).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("lst getListeAlertEventUserFone " + lst.size());
        return lst;
    }

}
