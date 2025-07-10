/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.configManagement;

import bll.bllBase;
import dal.TSnapShopDalyRecette;
import dal.TTauxMarque;
import dal.TTrancheHoraire;
import dal.dataManager;
import java.util.Date;
import toolkits.parameters.commonparameter;

/**
 *
 * @author TBEKOLA
 */
public class trancheHoraireManagement extends bllBase {

    Object Otable = TTrancheHoraire.class;

    public trancheHoraireManagement(dataManager OdataManager) {
        this.setOdataManager(OdataManager);
        this.checkDatamanager();
    }

    public void create(int int_HEURE_MIN, int int_HEURE_MAX, String str_LIBELLE) {
        try {

            TTrancheHoraire OTTrancheHoraire = new TTrancheHoraire();
            OTTrancheHoraire.setLgTRANCHEHORAIREID(this.getKey().getComplexId()); // Génération automatique d'un ID à
                                                                                  // partir de la date courante
            OTTrancheHoraire.setIntHEUREMIN(int_HEURE_MIN);
            OTTrancheHoraire.setIntHEUREMAX(int_HEURE_MAX);

            OTTrancheHoraire.setStrLIBELLE(str_LIBELLE);
            OTTrancheHoraire.setStrSTATUT(commonparameter.statut_enable);
            OTTrancheHoraire.setDtCREATED(new Date());

            this.persiste(OTTrancheHoraire);

            this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        } catch (Exception e) {
            this.buildErrorTraceMessage("Impossible de creer un " + Otable, e.getMessage());
        }

    }

    public TTrancheHoraire find(String lg_TRANCHE_HORAIRE_ID) {
        return (TTrancheHoraire) this.find(lg_TRANCHE_HORAIRE_ID, new TTrancheHoraire());
    }

    public TTrancheHoraire find(Date Odate) {
        int heure = new Integer(this.getKey().getoHours(Odate));
        TTrancheHoraire OTTrancheHoraire = null;
        try {
            OTTrancheHoraire = (TTrancheHoraire) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTrancheHoraire t WHERE  t.intHEUREMIN >= ?3  AND t.intHEUREMAX <= ?4 AND t.strSTATUT LIKE ?5 ")
                    .setParameter(3, heure).setParameter(4, heure + 1).setParameter(5, commonparameter.statut_enable)
                    .getSingleResult();
        } catch (Exception e) {
            this.buildErrorTraceMessage(e.getMessage());
        }
        return OTTrancheHoraire;
    }

    /*
     * for(int i =0;i<24;i++){ new trancheHoraireManagement(OdataManager).create(i, i+1, i+"H00 a "+(i+1)+"H00"); }
     */
}
