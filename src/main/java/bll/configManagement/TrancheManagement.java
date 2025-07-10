/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.Imanager;
import bll.bllBase;
import dal.TTranche;
import dal.TUser;
import dal.dataManager;
import java.io.Serializable;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.logger;

/**
 *
 * @author AMETCH
 */
public class TrancheManagement extends bllBase implements Imanager {

    int intMAX = 200;

    public TrancheManagement(dataManager OdataManager, TUser OTuser) {
        this.setOTUser(OTuser);
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void fixintMax(int intMAXTemp) {
        intMAX = intMAXTemp;

    }

    public TTranche create(Double dbl_POURCENTAGE_TRANCHE, Integer int_MONTANT_MIN, Integer int_MONTANT_MAX) {
        TTranche OTTranche = new TTranche();

        OTTranche.setLgTRANCHEID(this.getKey().getComplexId());
        OTTranche.setIntMONTANTMIN(int_MONTANT_MIN);
        OTTranche.setIntMONTANTMAX(int_MONTANT_MAX);
        OTTranche.setDblPOURCENTAGETRANCHE(dbl_POURCENTAGE_TRANCHE);
        OTTranche.setStrSTATUT(commonparameter.statut_enable);
        OTTranche.setDtCREATED(new Date());
        new logger().OCategory.info("int_MONTANT_MAX aavt " + int_MONTANT_MAX);
        if (isValaible(OTTranche)) {
            new logger().OCategory.info("int_MONTANT_MAX after " + OTTranche.getIntMONTANTMAX());
            this.persiste(OTTranche);
            this.buildSuccesTraceMessage("Tranche creee avec succes");
            return OTTranche;
        } else {
            return null;
        }

    }

    public TTranche update(String lg_TRANCHE_ID, Double dbl_POURCENTAGE_TRANCHE, Integer int_MONTANT_MIN,
            Integer int_MONTANT_MAX) {

        TTranche OTTranche = null;
        OTTranche = (TTranche) this.find(lg_TRANCHE_ID, new TTranche());

        if (OTTranche != null) {

            if (this.isValaible(int_MONTANT_MIN, int_MONTANT_MAX)) {
                OTTranche.setIntMONTANTMIN(int_MONTANT_MIN);
                OTTranche.setIntMONTANTMAX(int_MONTANT_MAX);
                OTTranche.setDblPOURCENTAGETRANCHE(dbl_POURCENTAGE_TRANCHE);
                OTTranche.setDtUPDATED(new Date());

                this.persiste(OTTranche);

                this.buildSuccesTraceMessage("Tranche modifiee avec succes");
                return OTTranche;
            } else {
                this.buildSuccesTraceMessage("Chevauchement d'intervalle");
                return OTTranche;
            }
        } else {
            this.buildSuccesTraceMessage("*** Desole  Tranche Inexistante *** ");
            return null;
        }
    }

    public boolean isValaible(TTranche OTTranche) {

        if (isMinInfThanZERO(OTTranche)) {
            return false;
        }

        if (isMinxSupThanMax(OTTranche)) {
            return false;
        }

        if (isMinxequalsMax(OTTranche)) {
            return false;
        }
        if (isMinxOrMaxIsAllreadyUse(OTTranche.getIntMONTANTMIN(), OTTranche.getIntMONTANTMAX(), OTTranche)) {
            return false;
        }

        this.buildSuccesTraceMessage("Intervalle tranche correcte");
        return true;
    }

    public boolean isValaible(int min, int max) {

        if (isMinInfThanZERO(min, max)) {
            return false;
        }

        if (isMinxSupThanMax(min, max)) {
            return false;
        }

        if (isMinxequalsMax(min, max)) {
            return false;
        }
        if (isMinxOrMaxIsAllreadyUse(min, max)) {
            return false;
        }

        this.buildSuccesTraceMessage("Intervalle tranche correcte");
        return true;
    }

    private boolean isMinInfThanZERO(TTranche OTTranche) {

        if (OTTranche.getIntMONTANTMIN() < 0) {
            this.buildErrorTraceMessage("MIN < 0");
            return true;
        }
        return false;
    }

    private boolean isValueSupThanMax(TTranche OTTranche) {

        if (OTTranche.getIntMONTANTMAX() > intMAX) {
            this.buildErrorTraceMessage("MAX> " + intMAX);
            return true;
        }

        return false;
    }

    private boolean isMinxSupThanMax(TTranche OTTranche) {

        if (OTTranche.getIntMONTANTMIN() > OTTranche.getIntMONTANTMAX()) {
            this.buildErrorTraceMessage("Impossible MIN > MAX");
            return true;
        }

        return false;
    }

    private boolean isMinxequalsMax(TTranche OTTranche) {

        if (OTTranche.getIntMONTANTMIN().equals(OTTranche.getIntMONTANTMAX())) {
            this.buildErrorTraceMessage("Impossible MIN = MAX");
            return true;
        }

        return false;
    }

    private boolean isMinxOrMaxIsAllreadyUse(Integer min, Integer max, TTranche OTTranche) {
        List<TTranche> lstTTranche = getTTranche();

        for (int i = 0; i < lstTTranche.size(); i++) {

            TTranche OTTrancheTemp = lstTTranche.get(i);
            if (min.equals(OTTrancheTemp.getIntMONTANTMIN())) {
                this.buildErrorTraceMessage(" *** MONTANT MIN  deja utilise *** ");
                return true;

            }

            if (min < OTTrancheTemp.getIntMONTANTMIN() && max > OTTrancheTemp.getIntMONTANTMAX()) {

                this.buildErrorTraceMessage(" ***  MONTANT MIN   deja compris dans un intervalle *** ");
                return true;
            }

            if (min < OTTrancheTemp.getIntMONTANTMIN() && max < OTTrancheTemp.getIntMONTANTMAX()
                    && max > OTTrancheTemp.getIntMONTANTMIN()) {

                this.buildErrorTraceMessage(" ***  MONTANT MAX   deja compris dans un intervalle *** ");
                return true;
            }

            if (min < OTTrancheTemp.getIntMONTANTMIN() && max > OTTrancheTemp.getIntMONTANTMIN()) {

                this.buildErrorTraceMessage(" ***  MONTANT MAX   deja compris dans un intervalle *** ");
                return true;
            }

            if (min > OTTrancheTemp.getIntMONTANTMIN() && min < OTTrancheTemp.getIntMONTANTMAX()) {

                this.buildErrorTraceMessage(" ***  MONTANT MIN   deja compris dans un intervalle *** ");
                return true;
            }

            if (max.equals(OTTrancheTemp.getIntMONTANTMAX())) {
                this.buildErrorTraceMessage(" MONTANT MAX  deja utilise");
                return true;
            }
            if (max > OTTrancheTemp.getIntMONTANTMIN() && max < OTTrancheTemp.getIntMONTANTMAX()) {
                this.buildErrorTraceMessage(" MONTANT MAX  deja compris dans un intervalle");
                return true;
            }

        }

        return false;
    }

    public List<TTranche> getTTranche() {

        List<TTranche> lstTTranche = this.getOdataManager().getEm()
                .createQuery("SELECT t FROM TTranche t WHERE  t.strSTATUT LIKE ?2 ORDER BY t.intMONTANTMIN ")
                .setParameter(2, commonparameter.statut_enable).getResultList();

        for (int i = 0; i < lstTTranche.size(); i++) {
            TTranche oTTranche = lstTTranche.get(i);
            this.getOdataManager().getEm().refresh(oTTranche);

        }

        return lstTTranche;

    }

    private boolean isMinInfThanZERO(int min, int max) {

        if (min < 0) {
            this.buildErrorTraceMessage("MIN < 0");
            return true;
        }
        return false;
    }

    private boolean isValueSupThanMax(int min, int max) {

        if (max > intMAX) {
            this.buildErrorTraceMessage("MAX> " + intMAX);
            return true;
        }

        return false;
    }

    private boolean isMinxSupThanMax(int min, int max) {

        if (min > max) {
            this.buildErrorTraceMessage("Impossible MIN > MAX");
            return true;
        }

        return false;
    }

    private boolean isMinxequalsMax(int min, int max) {

        if (min == (max)) {
            this.buildErrorTraceMessage("Impossible MIN = MAX");
            return true;
        }

        return false;
    }

    private boolean isMinxOrMaxIsAllreadyUse(Integer min, Integer max) {
        List<TTranche> lstTTranche = getTTranche();

        for (int i = 0; i < lstTTranche.size(); i++) {

            TTranche OTTrancheTemp = lstTTranche.get(i);
            if (min.equals(OTTrancheTemp.getIntMONTANTMIN())) {
                this.buildErrorTraceMessage(" *** MONTANT MIN  deja utilise *** ");
                return true;

            }

            if (min < OTTrancheTemp.getIntMONTANTMIN() && max > OTTrancheTemp.getIntMONTANTMAX()) {

                this.buildErrorTraceMessage(" ***  MONTANT MIN   deja compris dans un intervalle *** ");
                return true;
            }

            if (min < OTTrancheTemp.getIntMONTANTMIN() && max < OTTrancheTemp.getIntMONTANTMAX()
                    && max > OTTrancheTemp.getIntMONTANTMIN()) {

                this.buildErrorTraceMessage(" ***  MONTANT MAX   deja compris dans un intervalle *** ");
                return true;
            }

            if (min < OTTrancheTemp.getIntMONTANTMIN() && max > OTTrancheTemp.getIntMONTANTMIN()) {

                this.buildErrorTraceMessage(" ***  MONTANT MAX   deja compris dans un intervalle *** ");
                return true;
            }

            if (min > OTTrancheTemp.getIntMONTANTMIN() && min < OTTrancheTemp.getIntMONTANTMAX()) {

                this.buildErrorTraceMessage(" ***  MONTANT MIN   deja compris dans un intervalle *** ");
                return true;
            }

            if (max.equals(OTTrancheTemp.getIntMONTANTMAX())) {
                this.buildErrorTraceMessage(" MONTANT MAX  deja utilise");
                return true;
            }
            if (max > OTTrancheTemp.getIntMONTANTMIN() && max < OTTrancheTemp.getIntMONTANTMAX()) {
                this.buildErrorTraceMessage(" MONTANT MAX  deja compris dans un intervalle");
                return true;
            }

        }

        return false;
    }

    @Override
    public Serializable find(Object o) {
        return this.find(o, new TTranche());

    }

}
