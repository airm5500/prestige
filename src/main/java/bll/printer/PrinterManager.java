/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package bll.printer;

import bll.bllBase;
import dal.TImprimante;
import dal.TUser;
import dal.dataManager;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import javax.persistence.Query;
import toolkits.parameters.commonparameter;

/**
 *
 * @author MKABOU
 */
public class PrinterManager extends bllBase {

    public PrinterManager(dataManager O) {
        this.setOdataManager(O);
        this.checkDatamanager();
    }

    public PrinterManager(dataManager O, TUser OTUser) {
        this.setOdataManager(O);
        this.setOTUser(OTUser);
        this.checkDatamanager();
    }

    public TImprimante getTImprimanteByName(String search_value) {
        TImprimante OTImprimante = null;
        try {
            Query qry = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TImprimante t WHERE t.strNAME = ?1 OR t.strDESCRIPTION = ?1 OR t.lgIMPRIMANTEID = ?1")
                    .setParameter(1, search_value);
            if (qry.getResultList().size() > 0) {
                OTImprimante = (TImprimante) qry.getSingleResult();
            }
        } catch (Exception e) {
        }
        return OTImprimante;
    }

    public boolean createTImprimante(String str_NAME, String str_DESCRIPTION, int int_BEGIN, int int_COLUMN1,
            int int_COLUMN2, int int_COLUMN3, int int_COLUMN4, int int_FONT) {
        TImprimante OTImprimante = null;
        boolean result = false;
        try {
            OTImprimante = new TImprimante();
            OTImprimante.setLgIMPRIMANTEID(this.getKey().getComplexId());
            OTImprimante.setStrNAME(str_NAME);
            OTImprimante.setStrDESCRIPTION(str_DESCRIPTION);
            OTImprimante.setIntBEGIN(int_BEGIN);
            OTImprimante.setIntCOLUMN1(int_COLUMN1);
            OTImprimante.setIntCOLUMN2(int_COLUMN2);
            OTImprimante.setIntCOLUMN3(int_COLUMN3);
            OTImprimante.setIntCOLUMN4(int_COLUMN4);
            OTImprimante.setIntFONT(int_FONT);
            OTImprimante.setStrSTATUT(commonparameter.statut_enable);
            OTImprimante.setDtCREATED(new Date());
            this.persiste(OTImprimante);
            this.buildSuccesTraceMessage(
                    "Imprimante " + OTImprimante.getStrDESCRIPTION() + " créée à jour avec succès");
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'enregistrement de l'imprimante. Veuillez reessayer svp!");
        }
        return result;
    }

    public boolean updateTImprimante(String lg_IMPRIMANTE_ID, String str_NAME, String str_DESCRIPTION, int int_BEGIN,
            int int_COLUMN1, int int_COLUMN2, int int_COLUMN3, int int_COLUMN4, int int_FONT) {
        TImprimante OTImprimante = null;
        boolean result = false;
        try {
            OTImprimante = this.getTImprimanteByName(lg_IMPRIMANTE_ID);
            if (OTImprimante == null) {
                this.buildErrorTraceMessage("Echec de mise a jour de l'imprimante. Référence inexistante");
                return result;
            }
            OTImprimante.setStrNAME(str_NAME);
            OTImprimante.setStrDESCRIPTION(str_DESCRIPTION);
            OTImprimante.setIntBEGIN(int_BEGIN);
            OTImprimante.setIntCOLUMN1(int_COLUMN1);
            OTImprimante.setIntCOLUMN2(int_COLUMN2);
            OTImprimante.setIntCOLUMN3(int_COLUMN3);
            OTImprimante.setIntCOLUMN4(int_COLUMN4);
            OTImprimante.setIntFONT(int_FONT);
            OTImprimante.setDtUPDATED(new Date());
            this.persiste(OTImprimante);
            this.buildSuccesTraceMessage("Imprimante mise à jour avec succès");
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec d'enregistrement de l'imprimante. Veuillez reessayer svp!");
        }
        return result;
    }

    public boolean deleteTImprimante(String lg_IMPRIMANTE_ID) {
        TImprimante OTImprimante = null;
        boolean result = false;
        String DetailMessage = "Echec de suppression de l'imprimante. Référence inexistante";
        try {
            OTImprimante = this.getTImprimanteByName(lg_IMPRIMANTE_ID);
            if (OTImprimante == null) {
                this.buildErrorTraceMessage(DetailMessage);
                return result;
            }
            DetailMessage = "Imprimante " + OTImprimante.getStrDESCRIPTION() + " supprimée avec succès";
            this.delete(OTImprimante);
            this.buildSuccesTraceMessage(DetailMessage);
            result = true;
        } catch (Exception e) {
            e.printStackTrace();
            this.buildErrorTraceMessage("Echec de suppression de l'imprimante. Veuillez reessayer svp!");
        }
        return result;
    }

    public List<TImprimante> showOneOrAllImprimante(String search_value) {
        List<TImprimante> lsTImprimantes = new ArrayList<>();
        try {
            lsTImprimantes = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TImprimante t WHERE t.strNAME LIKE ?1 OR t.strDESCRIPTION LIKE ?1 ORDER BY t.strDESCRIPTION")
                    .setParameter(1, search_value + "%").getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return lsTImprimantes;
    }
}
