/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.teller;

import bll.common.Parameter;
import bll.entity.EntityData;
import bll.preenregistrement.Preenregistrement;
import dal.TDepenses;
import dal.TModeReglement;
import dal.TMvtCaisse;
import dal.TRecettes;
import dal.TReglement;
import dal.TTypeMvtCaisse;
import dal.TUser;
import dal.dataManager;
import dal.jconnexion;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import toolkits.parameters.commonparameter;
import toolkits.utils.conversion;
import toolkits.utils.logger;

/**
 *
 * @author AMETCH
 */
public class TellerMovement extends bll.bllBase {

    public TellerMovement(dataManager odataManager, TUser oTUser) {
        super.setOTUser(oTUser);
        super.setOdataManager(odataManager);
        super.checkDatamanager();

    }

    // 03092019
    public TMvtCaisse AddTMvtCaisseDiff(TTypeMvtCaisse OTTypeMvtCaisse, String str_NUM_COMPTE,
            String str_NUM_PIECE_COMPTABLE, TReglement reglement, double int_AMOUNT, String str_BANQUE, String str_LIEU,
            String str_CODE_MONNAIE, String str_COMMENTAIRE_REGLEMENT, int int_TAUX, Date dt_DATE_MVT, boolean action,
            String str_FIRST_LAST_NAME, String P_KEY, String str_COMMENTAIRE, int int_AMOUNT_REMIS, int int_AMOUNT_RECU,
            boolean bool_CHECKED, Date dt_CREATED) {
        TMvtCaisse OTMvtCaisse;
        TModeReglement OTModeReglement;

        caisseManagement OcaisseManagement = new caisseManagement(this.getOdataManager(), this.getOTUser());

        if (!OcaisseManagement.CheckResumeCaisse()) {
            this.buildErrorTraceMessage("ERROR", "DESOLE LA CAISSE EST FERMEE");
            return null;
        }

        OTModeReglement = reglement.getLgMODEREGLEMENTID();

        if (OTModeReglement == null) {
            this.buildErrorTraceMessage("Echec d'encaissement. Mode de règlement inexistant.");
            return null;
        }

        OTMvtCaisse = new TMvtCaisse();
        OTMvtCaisse.setLgMVTCAISSEID(this.getKey().getComplexId());
        OTMvtCaisse.setLgTYPEMVTCAISSEID(OTTypeMvtCaisse);
        OTMvtCaisse.setLgMODEREGLEMENTID(OTModeReglement);
        OTMvtCaisse.setStrNUMCOMPTE(str_NUM_COMPTE);
        OTMvtCaisse.setStrNUMPIECECOMPTABLE(str_NUM_PIECE_COMPTABLE);
        OTMvtCaisse.setIntAMOUNT(int_AMOUNT);
        OTMvtCaisse.setStrCOMMENTAIRE(str_COMMENTAIRE);
        OTMvtCaisse.setStrSTATUT(commonparameter.statut_enable);
        OTMvtCaisse.setDtDATEMVT(dt_DATE_MVT);
        OTMvtCaisse.setStrCREATEDBY(this.getOTUser());
        OTMvtCaisse.setDtCREATED(dt_CREATED);
        OTMvtCaisse.setPKey(P_KEY);
        OTMvtCaisse.setDtUPDATED(dt_CREATED);
        OTMvtCaisse.setStrREFTICKET(this.getKey().getShortId(10));
        OTMvtCaisse.setLgUSERID(this.getOTUser().getLgUSERID());

        // code ajouté 15/07/2015
        OTMvtCaisse.setBoolCHECKED(bool_CHECKED);
        // fin code ajouté 15/07/2015
        // OTReglement = new Preenregistrement(this.getOdataManager(),
        // this.getOTUser()).CreateTReglement(this.getOTUser().getLgUSERID(), OTMvtCaisse.getLgMVTCAISSEID(),
        // str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE_REGLEMENT, lg_MODE_REGLEMENT_ID, int_TAUX,
        // int_AMOUNT,str_FIRST_LAST_NAME,new Date(), bool_CHECKED); // a decommenter en cas de probleme. 09/08/2016

        this.persiste(OTMvtCaisse);
        if (action) {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String Description = "Mouvement d'une somme de  " + OTMvtCaisse.getIntAMOUNT() + " Type de mouvement "
                    + OTTypeMvtCaisse.getStrDESCRIPTION();
            String transaction = "", lg_MOTIF_REGLEMENT_ID = "";
            if (OTTypeMvtCaisse.getLgTYPEMVTCAISSEID().equalsIgnoreCase("4")) {
                transaction = commonparameter.TRANSACTION_DEBIT;
                lg_MOTIF_REGLEMENT_ID = "3";
                // OTMvtCaisse.setIntAMOUNT((-1) * OTMvtCaisse.getIntAMOUNT());
            } else {
                transaction = commonparameter.TRANSACTION_CREDIT;
                lg_MOTIF_REGLEMENT_ID = "2";
            }
            new caisseManagement(this.getOdataManager(), this.getOTUser()).add_to_cash_transaction(Ojconnexion,
                    transaction, OTMvtCaisse.getIntAMOUNT(), Description, OTTypeMvtCaisse.getStrCODECOMPTABLE(),
                    int_AMOUNT_REMIS, int_AMOUNT_RECU, OTMvtCaisse.getLgMVTCAISSEID(), str_NUM_PIECE_COMPTABLE,
                    Parameter.KEY_TASK_OTHER, Parameter.KEY_TASK_OTHER, reglement.getLgREGLEMENTID(),
                    reglement.getStrFIRSTLASTNAME(), lg_MOTIF_REGLEMENT_ID,
                    OTModeReglement.getLgTYPEREGLEMENTID().getLgTYPEREGLEMENTID(), true, bool_CHECKED, dt_CREATED);
            this.do_event_log(Ojconnexion, commonparameter.ALL, Description, this.getOTUser().getStrLOGIN(),
                    commonparameter.statut_enable, "t_mvt_caisse", "caisse", "Mouvement de Caisse",
                    this.getOTUser().getLgUSERID());
            this.is_activity(Ojconnexion);
            Ojconnexion.CloseConnexion();
        }

        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        return OTMvtCaisse;
    }

    public TMvtCaisse AddTMvtCaisse(TTypeMvtCaisse OTTypeMvtCaisse, String str_NUM_COMPTE,
            String str_NUM_PIECE_COMPTABLE, String lg_MODE_REGLEMENT_ID, double int_AMOUNT, String str_BANQUE,
            String str_LIEU, String str_CODE_MONNAIE, String str_COMMENTAIRE_REGLEMENT, int int_TAUX, Date dt_DATE_MVT,
            boolean action, String str_FIRST_LAST_NAME, String P_KEY, String str_COMMENTAIRE, int int_AMOUNT_REMIS,
            int int_AMOUNT_RECU, boolean bool_CHECKED, Date dt_CREATED) {
        TMvtCaisse OTMvtCaisse;
        TModeReglement OTModeReglement;
        TReglement OTReglement;
        caisseManagement OcaisseManagement = new caisseManagement(this.getOdataManager(), this.getOTUser());

        if (!OcaisseManagement.CheckResumeCaisse()) {
            this.buildErrorTraceMessage("ERROR", "DESOLE LA CAISSE EST FERMEE");
            return null;
        }
        OTModeReglement = (TModeReglement) this.getOdataManager().getEm().createQuery(
                "SELECT t FROM TModeReglement t WHERE t.lgMODEREGLEMENTID LIKE ?1 OR t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?2")
                .setParameter(1, lg_MODE_REGLEMENT_ID).setParameter(2, lg_MODE_REGLEMENT_ID).getSingleResult();

        if (OTModeReglement == null) {
            this.buildErrorTraceMessage("Echec d'encaissement. Mode de règlement inexistant.");
            return null;
        }
        OTMvtCaisse = new TMvtCaisse();
        OTMvtCaisse.setLgMVTCAISSEID(this.getKey().getComplexId());
        OTMvtCaisse.setLgTYPEMVTCAISSEID(OTTypeMvtCaisse);
        OTMvtCaisse.setLgMODEREGLEMENTID(OTModeReglement);
        OTMvtCaisse.setStrNUMCOMPTE(str_NUM_COMPTE);
        OTMvtCaisse.setStrNUMPIECECOMPTABLE(str_NUM_PIECE_COMPTABLE);
        OTMvtCaisse.setIntAMOUNT(int_AMOUNT);
        OTMvtCaisse.setStrCOMMENTAIRE(str_COMMENTAIRE);
        OTMvtCaisse.setStrSTATUT(commonparameter.statut_enable);
        OTMvtCaisse.setDtDATEMVT(dt_DATE_MVT);
        OTMvtCaisse.setStrCREATEDBY(this.getOTUser());
        OTMvtCaisse.setDtCREATED(dt_CREATED);
        OTMvtCaisse.setPKey(P_KEY);
        OTMvtCaisse.setDtUPDATED(dt_CREATED);
        OTMvtCaisse.setStrREFTICKET(this.getKey().getShortId(10));
        OTMvtCaisse.setLgUSERID(this.getOTUser().getLgUSERID());

        // code ajouté 15/07/2015
        OTMvtCaisse.setBoolCHECKED(bool_CHECKED);
        // fin code ajouté 15/07/2015
        // OTReglement = new Preenregistrement(this.getOdataManager(),
        // this.getOTUser()).CreateTReglement(this.getOTUser().getLgUSERID(), OTMvtCaisse.getLgMVTCAISSEID(),
        // str_BANQUE, str_LIEU, str_CODE_MONNAIE, str_COMMENTAIRE_REGLEMENT, lg_MODE_REGLEMENT_ID, int_TAUX,
        // int_AMOUNT,str_FIRST_LAST_NAME,new Date(), bool_CHECKED); // a decommenter en cas de probleme. 09/08/2016
        OTReglement = new Preenregistrement(this.getOdataManager(), this.getOTUser()).CreateTReglement(
                this.getOTUser().getLgUSERID(), OTMvtCaisse.getLgMVTCAISSEID(), str_BANQUE, str_LIEU, str_CODE_MONNAIE,
                str_COMMENTAIRE_REGLEMENT, OTModeReglement, int_TAUX, int_AMOUNT, str_FIRST_LAST_NAME, dt_CREATED,
                bool_CHECKED);
        this.persiste(OTMvtCaisse);
        if (action) {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String Description = "Mouvement d'une somme de  " + OTMvtCaisse.getIntAMOUNT() + " Type de mouvement "
                    + OTTypeMvtCaisse.getStrDESCRIPTION();
            String transaction = "", lg_MOTIF_REGLEMENT_ID = "";
            if (OTTypeMvtCaisse.getLgTYPEMVTCAISSEID().equalsIgnoreCase("4")) {
                transaction = commonparameter.TRANSACTION_DEBIT;
                lg_MOTIF_REGLEMENT_ID = "3";
                // OTMvtCaisse.setIntAMOUNT((-1) * OTMvtCaisse.getIntAMOUNT());
            } else {
                transaction = commonparameter.TRANSACTION_CREDIT;
                lg_MOTIF_REGLEMENT_ID = "2";
            }
            new caisseManagement(this.getOdataManager(), this.getOTUser()).add_to_cash_transaction(Ojconnexion,
                    transaction, OTMvtCaisse.getIntAMOUNT(), Description, OTTypeMvtCaisse.getStrCODECOMPTABLE(),
                    int_AMOUNT_REMIS, int_AMOUNT_RECU, OTMvtCaisse.getLgMVTCAISSEID(), str_NUM_PIECE_COMPTABLE,
                    Parameter.KEY_TASK_OTHER, Parameter.KEY_TASK_OTHER, OTReglement.getLgREGLEMENTID(), "",
                    lg_MOTIF_REGLEMENT_ID, OTModeReglement.getLgTYPEREGLEMENTID().getLgTYPEREGLEMENTID(), true,
                    bool_CHECKED, dt_CREATED);
            this.do_event_log(Ojconnexion, commonparameter.ALL, Description, this.getOTUser().getStrLOGIN(),
                    commonparameter.statut_enable, "t_mvt_caisse", "caisse", "Mouvement de Caisse",
                    this.getOTUser().getLgUSERID());
            this.is_activity(Ojconnexion);
            Ojconnexion.CloseConnexion();
        }

        this.buildSuccesTraceMessage(this.getOTranslate().getValue("SUCCES"));
        return OTMvtCaisse;
    }

    public TMvtCaisse UpdateTMvtCaisse(String lg_MVT_CAISSE_ID, String lg_TYPE_MVT_CAISSE_ID, String str_NUM_COMPTE,
            String str_NUM_PIECE_COMPTABLE, String lg_MODE_REGLEMENT_ID, double int_AMOUNT, String str_BANQUE,
            String str_LIEU, String str_CODE_MONNAIE, String str_COMMENTAIRE, int int_TAUX, Date dt_DATE_MVT) {
        TMvtCaisse OTMvtCaisse = null;
        TTypeMvtCaisse OTTypeMvtCaisse = null;
        TModeReglement OTModeReglement = null;
        TReglement OTReglement = null;
        try {
            OTMvtCaisse = (TMvtCaisse) this.find(lg_MVT_CAISSE_ID, new TMvtCaisse());

        } catch (Exception e) {
            this.buildErrorTraceMessage("ERROR", " MOUVEMENT CAISSE INEXISTANT  " + e.toString());
            return null;
        }
        try {

            OTTypeMvtCaisse = (TTypeMvtCaisse) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TTypeMvtCaisse t WHERE t.lgTYPEMVTCAISSEID LIKE ?1 OR t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?2")
                    .setParameter(1, lg_TYPE_MVT_CAISSE_ID).setParameter(2, lg_TYPE_MVT_CAISSE_ID).getSingleResult();

        } catch (Exception e) {
            this.buildErrorTraceMessage("ERROR", "TYPE MOUVEMENT CAISSE INEXISTANT  " + e.toString());
            return null;
        }

        try {

            OTModeReglement = (TModeReglement) this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TModeReglement t WHERE t.lgMODEREGLEMENTID LIKE ?1 OR t.strNAME LIKE ?2 OR t.strDESCRIPTION LIKE ?2")
                    .setParameter(1, lg_MODE_REGLEMENT_ID).setParameter(2, lg_MODE_REGLEMENT_ID).getSingleResult();

        } catch (Exception e) {
            this.buildErrorTraceMessage("ERROR", "ModeReglement INEXISTANT  " + e.toString());
            return null;
        }

        OTMvtCaisse.setLgTYPEMVTCAISSEID(OTTypeMvtCaisse);
        OTMvtCaisse.setLgMODEREGLEMENTID(OTModeReglement);
        // OTMvtCaisse.setStrNUMCOMPTE(str_NUM_COMPTE);
        OTMvtCaisse.setStrNUMCOMPTE(OTTypeMvtCaisse.getStrCODECOMPTABLE());
        OTMvtCaisse.setStrNUMPIECECOMPTABLE(str_NUM_PIECE_COMPTABLE);
        OTMvtCaisse.setIntAMOUNT(int_AMOUNT);
        OTMvtCaisse.setStrSTATUT(commonparameter.statut_enable);
        OTMvtCaisse.setDtUPDATED(new Date());
        OTMvtCaisse.setDtDATEMVT(dt_DATE_MVT);
        OTReglement = this.GetReglementByTMvtCaisse(OTMvtCaisse.getLgMVTCAISSEID());
        if (OTMvtCaisse.getLgTYPEMVTCAISSEID().getLgTYPEMVTCAISSEID().equals("1")) {
            TRecettes OTRecettes = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddRecette(int_AMOUNT,
                    Parameter.KEY_TYPE_RECETTE_VENTE_BOISSON, "Entree de Caisse", OTMvtCaisse.getLgMVTCAISSEID(),
                    int_AMOUNT, int_AMOUNT, OTMvtCaisse.getLgMVTCAISSEID(), OTModeReglement.getLgMODEREGLEMENTID(), "",
                    bll.common.Parameter.KEY_TASK_ENTREE_CAISSE, OTReglement.getLgREGLEMENTID(),
                    this.getOTUser().getLgUSERID(), "2", "", commonparameter.TRANSACTION_CREDIT, true);
            if (OTRecettes == null) {
                this.buildErrorTraceMessage("Impossible de valider lentree de caisse",
                        "la recette  n'a pas pu etre MAJ");

                return null;
            }

        } else {
            TDepenses OTDepenses = new caisseManagement(this.getOdataManager(), this.getOTUser()).AddDepense(int_AMOUNT,
                    Parameter.KEY_TYPE_DEPENSE_SORTIE_CAISSE, "Sortie de Caisse", OTMvtCaisse.getLgMVTCAISSEID(),
                    int_AMOUNT, int_AMOUNT, OTMvtCaisse.getLgMVTCAISSEID(), OTReglement.getLgREGLEMENTID(),
                    bll.common.Parameter.KEY_TASK_SORTIE_CAISSE, "", "", true);
            if (OTDepenses == null) {
                this.buildErrorTraceMessage("Impossible de valider la sortie de caisse",
                        "la depense  n'a pas pu etre MAJ");

                return null;
            }
        }
        this.persiste(OTMvtCaisse);
        return OTMvtCaisse;
    }

    public List<TMvtCaisse> GetMvtCaisseList(Date dtDEBUT, Date dtFin) {
        // TMvtCaisse OTMvtCaisse = null;
        List<TMvtCaisse> lstTMvtCaisse = new ArrayList<TMvtCaisse>();
        try {
            lstTMvtCaisse = this.getOdataManager().getEm().createQuery(
                    "SELECT t FROM TMvtCaisse t WHERE (t.dtCREATED >= ?3 AND t.dtCREATED <= ?4) ORDER BY t.dtCREATED DESC ")
                    .setParameter(3, dtDEBUT).setParameter(4, dtFin).getResultList();
        } catch (Exception e) {
            e.printStackTrace();
        }
        new logger().OCategory.info("La liste des mvt de caisse  " + lstTMvtCaisse.size());

        return lstTMvtCaisse;
    }

    public TReglement GetReglementByTMvtCaisse(String str_ref) {
        TReglement OTReglement = null;
        try {
            OTReglement = (TReglement) this.getOdataManager().getEm()
                    .createQuery("SELECT t FROM TReglement t WHERE  t.strREFRESSOURCE  = ?1  AND t.strSTATUT LIKE ?2")
                    .setParameter(1, str_ref).setParameter(2, commonparameter.statut_is_Closed).getSingleResult();
        } catch (Exception e) {
            this.buildErrorTraceMessage("DESOLE", "PAS DE REGLEMENT POUR CE MOUVEMENT " + e.toString());
        }
        return OTReglement;
    }

    // code ajouté
    public EntityData getMvtCaisse(String str_REF) {
        EntityData OEntityData = null;
        List<EntityData> Lst = new ArrayList<>();

        try {
            jconnexion Ojconnexion = new jconnexion();
            Ojconnexion.initConnexion();
            Ojconnexion.OpenConnexion();
            String qry = "SELECT t_type_mvt_caisse.str_CODE_COMPTABLE, t_mvt_caisse.str_REF_TICKET, t_type_mvt_caisse.str_DESCRIPTION, t_user.str_LAST_NAME, t_user.str_FIRST_NAME, t_mvt_caisse.int_AMOUNT,t_mvt_caisse.str_COMMENTAIRE FROM t_mvt_caisse INNER JOIN t_type_mvt_caisse ON (t_mvt_caisse.lg_TYPE_MVT_CAISSE_ID = t_type_mvt_caisse.lg_TYPE_MVT_CAISSE_ID) INNER JOIN t_user ON (t_mvt_caisse.lg_USER_ID = t_user.lg_USER_ID) WHERE t_mvt_caisse.lg_MVT_CAISSE_ID = '"
                    + str_REF + "'";
            new logger().OCategory.info("qry -- " + qry);
            Ojconnexion.set_Request(qry);
            ResultSetMetaData rsmddatas = Ojconnexion.get_resultat().getMetaData();
            while (Ojconnexion.get_resultat().next()) {
                OEntityData = new EntityData();
                OEntityData.setStr_value1(Ojconnexion.get_resultat().getString("str_CODE_COMPTABLE"));
                OEntityData.setStr_value2(Ojconnexion.get_resultat().getString("str_DESCRIPTION"));
                OEntityData.setStr_value3(Ojconnexion.get_resultat().getString("str_LAST_NAME"));
                OEntityData.setStr_value4(Ojconnexion.get_resultat().getString("str_FIRST_NAME"));
                OEntityData.setStr_value5(Ojconnexion.get_resultat().getString("int_AMOUNT"));
                OEntityData.setStr_value6(Ojconnexion.get_resultat().getString("str_REF_TICKET"));
                OEntityData.setStr_value7(Ojconnexion.get_resultat().getString("str_COMMENTAIRE"));

                Lst.add(OEntityData);
            }
            Ojconnexion.CloseConnexion();
        } catch (Exception ex) {
            new logger().OCategory.info(ex.getMessage());
        }
        new logger().OCategory.info("Lst taille " + Lst.size());
        if (Lst.size() > 0) {
            OEntityData = Lst.get(0);
        }

        return OEntityData;
    }

    // chargement des données
    public List<String> generateData(EntityData OEntityData) {
        List<String> datas = new ArrayList<String>();
        double val = Double.valueOf(OEntityData.getStr_value5());
        Double d = new Double(val);
        int int_AMOUNT = d.intValue();
        datas.add("Code comptable: ;" + OEntityData.getStr_value1() + "; ");
        datas.add("Libellé: ;" + OEntityData.getStr_value2() + "; ");
        datas.add("Montant: ;" + conversion.AmountFormat(int_AMOUNT) + "; F CFA");
        datas.add("Opérateur: ;" + OEntityData.getStr_value4() + " " + OEntityData.getStr_value3() + "; ");
        return datas;
    }
    // chargement des données
    // fin code ajouté
}
