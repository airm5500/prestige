/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.MvtTransaction;
import dal.TClient;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClient;
import dal.TPreenregistrementDetail;
import dal.TRemise;
import dal.TTypeVente;
import dal.TUser;
import java.io.Serializable;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import util.DateConverter;

/**
 *
 * @author Kobena
 */
public class VenteDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy");
    private final SimpleDateFormat heureFormat = new SimpleDateFormat("HH:mm");
    private String lgPREENREGISTREMENTID;
    private String strREF;
    private String strREFTICKET;
    private Integer intPRICE;
    private Integer intPRICEREMISE;
    private String strTYPEVENTE;
    private Integer intCUSTPART, remiseDepot = 0;
    private Integer montantPaye = 0;//arrondi de la caisse
    private String dtUPDATED, heure;
    private String strSTATUT, strREFBON, lgUPDATEDBY, dtCREATED, HEUREVENTE, lgREMISEID, lgUSERVENDEURID, lgTYPEVENTEID, lgNATUREVENTEID, userFullName, userVendeurName;
    private AyantDroitDTO ayantDroit;
    private ClientDTO client;
    private boolean cancel, avoir, sansbon, beCancel = false, modification;
    private String dateAnnulation;
    private String typeRemiseId, details = " ", userCaissierName, lgUSERCAISSIERID;
    private List<TiersPayantParams> tierspayants = new ArrayList<>();
    private List<VenteDetailsDTO> items = new ArrayList<>();
    private MagasinDTO magasin;
    private String lgTYPEDEPOTID, lgCLIENTID, strNAME, gerantFullName, lgEMPLACEMENTID, desciptiontypedepot;
    private String clientFullName, strTYPEVENTENAME, mvdate;
    private boolean copy = false;
    private Integer intPRICERESTE;

    public List<VenteDetailsDTO> getItems() {
        return items;
    }

    public void setItems(List<VenteDetailsDTO> items) {
        this.items = items;
    }

    public Integer getMontantPaye() {
        return montantPaye;
    }

    public boolean isCopy() {
        return copy;
    }

    public void setCopy(boolean copy) {
        this.copy = copy;
    }

    public void setMontantPaye(Integer montantPaye) {
        this.montantPaye = montantPaye;
    }

    public String getStrTYPEVENTENAME() {
        return strTYPEVENTENAME;
    }

    public String getDateAnnulation() {
        return dateAnnulation;
    }

    public void setDateAnnulation(String dateAnnulation) {
        this.dateAnnulation = dateAnnulation;
    }

    public boolean isModification() {
        return modification;
    }

    public void setModification(boolean modification) {
        this.modification = modification;
    }

    public void setStrTYPEVENTENAME(String strTYPEVENTENAME) {
        this.strTYPEVENTENAME = strTYPEVENTENAME;
    }

    public boolean isBeCancel() {
        return beCancel;
    }

    public String getClientFullName() {
        return clientFullName;
    }

    public void setClientFullName(String clientFullName) {
        this.clientFullName = clientFullName;
    }

    public void setBeCancel(boolean beCancel) {
        this.beCancel = beCancel;
    }

    public boolean isSansbon() {
        return sansbon;
    }

    public void setSansbon(boolean sansbon) {
        this.sansbon = sansbon;
    }

    public boolean isCancel() {
        return cancel;
    }

    public void setCancel(boolean cancel) {
        this.cancel = cancel;
    }

    public boolean isAvoir() {
        return avoir;
    }

    public void setAvoir(boolean avoir) {
        this.avoir = avoir;
    }

    public String getLgCLIENTID() {
        return lgCLIENTID;
    }

    public String getLgUSERCAISSIERID() {
        return lgUSERCAISSIERID;
    }

    public void setLgUSERCAISSIERID(String lgUSERCAISSIERID) {
        this.lgUSERCAISSIERID = lgUSERCAISSIERID;
    }

    public void setLgCLIENTID(String lgCLIENTID) {
        this.lgCLIENTID = lgCLIENTID;
    }

    public String getTypeRemiseId() {
        return typeRemiseId;
    }

    public String getDesciptiontypedepot() {
        return desciptiontypedepot;
    }

    public void setDesciptiontypedepot(String desciptiontypedepot) {
        this.desciptiontypedepot = desciptiontypedepot;
    }

    public String getUserCaissierName() {
        return userCaissierName;
    }

    public void setUserCaissierName(String userCaissierName) {
        this.userCaissierName = userCaissierName;
    }

    public Integer getRemiseDepot() {
        return remiseDepot;
    }

    public void setRemiseDepot(Integer remiseDepot) {
        this.remiseDepot = remiseDepot;
    }

    public String getLgEMPLACEMENTID() {
        return lgEMPLACEMENTID;
    }

    public void setLgEMPLACEMENTID(String lgEMPLACEMENTID) {
        this.lgEMPLACEMENTID = lgEMPLACEMENTID;
    }

    public String getUserFullName() {
        return userFullName;
    }

    public String getLgTYPEDEPOTID() {
        return lgTYPEDEPOTID;
    }

    public void setLgTYPEDEPOTID(String lgTYPEDEPOTID) {
        this.lgTYPEDEPOTID = lgTYPEDEPOTID;
    }

    public String getStrNAME() {
        return strNAME;
    }

    public void setStrNAME(String strNAME) {
        this.strNAME = strNAME;
    }

    public String getGerantFullName() {
        return gerantFullName;
    }

    public void setGerantFullName(String gerantFullName) {
        this.gerantFullName = gerantFullName;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public void setTypeRemiseId(String typeRemiseId) {
        this.typeRemiseId = typeRemiseId;
    }

    public String getLgPREENREGISTREMENTID() {
        return lgPREENREGISTREMENTID;
    }

    public void setLgPREENREGISTREMENTID(String lgPREENREGISTREMENTID) {
        this.lgPREENREGISTREMENTID = lgPREENREGISTREMENTID;
    }

    public String getStrREF() {
        return strREF;
    }

    public void setStrREF(String strREF) {
        this.strREF = strREF;
    }

    public String getStrREFTICKET() {
        return strREFTICKET;
    }

    public void setStrREFTICKET(String strREFTICKET) {
        this.strREFTICKET = strREFTICKET;
    }

    public Integer getIntPRICE() {
        return intPRICE;
    }

    public void setIntPRICE(Integer intPRICE) {
        this.intPRICE = intPRICE;
    }

    public Integer getIntPRICEREMISE() {
        return intPRICEREMISE;
    }

    public void setIntPRICEREMISE(Integer intPRICEREMISE) {
        this.intPRICEREMISE = intPRICEREMISE;
    }

    public String getStrTYPEVENTE() {
        return strTYPEVENTE;
    }

    public void setStrTYPEVENTE(String strTYPEVENTE) {
        this.strTYPEVENTE = strTYPEVENTE;
    }

    public Integer getIntCUSTPART() {
        return intCUSTPART;
    }

    public void setIntCUSTPART(Integer intCUSTPART) {
        this.intCUSTPART = intCUSTPART;
    }

    public String getDtUPDATED() {
        return dtUPDATED;
    }

    public void setDtUPDATED(String dtUPDATED) {
        this.dtUPDATED = dtUPDATED;
    }

    public String getHeure() {
        return heure;
    }

    public void setHeure(String heure) {
        this.heure = heure;
    }

    public String getStrSTATUT() {
        return strSTATUT;
    }

    public void setStrSTATUT(String strSTATUT) {
        this.strSTATUT = strSTATUT;
    }

    public String getStrREFBON() {
        return strREFBON;
    }

    public void setStrREFBON(String strREFBON) {
        this.strREFBON = strREFBON;
    }

    public String getLgREMISEID() {
        return lgREMISEID;
    }

    public void setLgREMISEID(String lgREMISEID) {
        this.lgREMISEID = lgREMISEID;
    }

    public String getLgUSERVENDEURID() {
        return lgUSERVENDEURID;
    }

    public void setLgUSERVENDEURID(String lgUSERVENDEURID) {
        this.lgUSERVENDEURID = lgUSERVENDEURID;
    }

    public String getLgTYPEVENTEID() {
        return lgTYPEVENTEID;
    }

    public void setLgTYPEVENTEID(String lgTYPEVENTEID) {
        this.lgTYPEVENTEID = lgTYPEVENTEID;
    }

    public String getLgNATUREVENTEID() {
        return lgNATUREVENTEID;
    }

    public void setLgNATUREVENTEID(String lgNATUREVENTEID) {
        this.lgNATUREVENTEID = lgNATUREVENTEID;
    }

    public AyantDroitDTO getAyantDroit() {
        return ayantDroit;
    }

    public void setAyantDroit(AyantDroitDTO ayantDroit) {
        this.ayantDroit = ayantDroit;
    }

    public ClientDTO getClient() {
        return client;
    }

    public void setClient(ClientDTO client) {
        this.client = client;
    }

    public List<TiersPayantParams> getTierspayants() {
        return tierspayants;
    }

    public void setTierspayants(List<TiersPayantParams> tierspayants) {
        this.tierspayants = tierspayants;
    }

    public Integer getIntPRICERESTE() {
        return intPRICERESTE;
    }

    public void setIntPRICERESTE(Integer intPRICERESTE) {
        this.intPRICERESTE = intPRICERESTE;
    }

    @Override
    public int hashCode() {
        int hash = 5;
        hash = 53 * hash + Objects.hashCode(this.lgPREENREGISTREMENTID);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final VenteDTO other = (VenteDTO) obj;
        return Objects.equals(this.lgPREENREGISTREMENTID, other.lgPREENREGISTREMENTID);
    }

    public VenteDTO() {
    }

    public VenteDTO(TPreenregistrement tp, List<TiersPayantParams> tierspayants, AyantDroitDTO ayantDroit, ClientDTO client, List<TPreenregistrementDetail> tpds) {
        this.lgPREENREGISTREMENTID = tp.getLgPREENREGISTREMENTID();
        this.strREF = tp.getStrREF();
        this.strREFTICKET = tp.getStrREFTICKET();
        this.intPRICE = tp.getIntPRICE();
        this.intPRICEREMISE = tp.getIntPRICEREMISE();
        this.strTYPEVENTE = tp.getStrTYPEVENTE();
        this.intCUSTPART = tp.getIntCUSTPART();
        this.dtUPDATED = dateFormat.format(tp.getDtUPDATED());
        this.heure = heureFormat.format(tp.getDtUPDATED());
        this.strSTATUT = tp.getStrSTATUT();
        this.strREFBON = tp.getStrREFBON();
        this.copy = tp.getCopy();
        this.mvdate = DateConverter.convertDateToYYYY_MM_DD(tp.getDtUPDATED());
        try {
            TRemise remise = tp.getRemise();
            this.lgREMISEID = remise.getLgREMISEID();
            this.typeRemiseId = remise.getLgTYPEREMISEID().getLgTYPEREMISEID();
        } catch (Exception e) {
        }
        try {
            TUser tu = tp.getLgUSERVENDEURID();
            this.lgUSERVENDEURID = tu.getLgUSERID();
            this.userFullName = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
        } catch (Exception e) {
        }
        try {
            TTypeVente typeVente = tp.getLgTYPEVENTEID();
            this.strTYPEVENTENAME = typeVente.getStrNAME();
            this.lgTYPEVENTEID = typeVente.getLgTYPEVENTEID();
        } catch (Exception e) {
        }
        try {
            this.lgNATUREVENTEID = tp.getLgNATUREVENTEID().getLgNATUREVENTEID();
        } catch (Exception e) {
        }
        this.tierspayants = tierspayants;
        this.ayantDroit = ayantDroit;
        this.client = client;
        if (client != null) {
            this.clientFullName = client.getStrFIRSTNAME() + " " + client.getStrLASTNAME();
        } else {
            TClient cl = tp.getClient();
            if (cl != null) {
                this.clientFullName = cl.getStrFIRSTNAME() + " " + cl.getStrLASTNAME();
            }
        }
        tpds.forEach((tpd) -> {
            this.details = "<b><span style='display:inline-block;width: 7%;'>" + tpd.getLgFAMILLEID().getIntCIP() + "</span><span style='display:inline-block;width: 25%;'>" + tpd.getLgFAMILLEID().getStrDESCRIPTION() + "</span><span style='display:inline-block;width: 10%;'>(" + tpd.getIntQUANTITY() + ")</span><span style='display:inline-block;width: 15%;'>" + DateConverter.amountFormat(tpd.getIntPRICEUNITAIR(), '.') + " F CFA " + "</span></b><br> " + this.details;
        });
    }
    private String heureAnnulation;

    public String getHeureAnnulation() {
        return heureAnnulation;
    }

    public void setHeureAnnulation(String heureAnnulation) {
        this.heureAnnulation = heureAnnulation;
    }

    public VenteDTO(TPreenregistrement tp, ClientDTO client, List<TPreenregistrementDetail> tpds) {
        this.lgPREENREGISTREMENTID = tp.getLgPREENREGISTREMENTID();
        this.mvdate = DateConverter.convertDateToYYYY_MM_DD(tp.getDtUPDATED());
        this.strREF = tp.getStrREF();
        this.strREFTICKET = tp.getStrREFTICKET();
        this.intPRICE = tp.getIntPRICE();
        this.intPRICEREMISE = tp.getIntPRICEREMISE();
        this.strTYPEVENTE = tp.getStrTYPEVENTE();
        this.intCUSTPART = tp.getIntCUSTPART();
        this.dtUPDATED = dateFormat.format(tp.getDtUPDATED());
        this.copy = tp.getCopy();
        try {
            this.dateAnnulation = dateFormat.format(tp.getDtANNULER());
            this.heureAnnulation = heureFormat.format(tp.getDtANNULER());
        } catch (Exception e) {
        }
        this.heure = heureFormat.format(tp.getDtUPDATED());
        this.strSTATUT = tp.getStrSTATUT();
        this.strREFBON = tp.getStrREFBON();
        try {
            TRemise remise = tp.getRemise();
            this.lgREMISEID = remise.getLgREMISEID();
            this.typeRemiseId = remise.getLgTYPEREMISEID().getLgTYPEREMISEID();
        } catch (Exception e) {
        }
        try {
            this.lgUSERVENDEURID = tp.getLgUSERVENDEURID().getLgUSERID();
        } catch (Exception e) {
        }
        try {
            TTypeVente typeVente = tp.getLgTYPEVENTEID();
            this.strTYPEVENTENAME = typeVente.getStrNAME();
            this.lgTYPEVENTEID = typeVente.getLgTYPEVENTEID();
        } catch (Exception e) {
        }
        try {
            this.lgNATUREVENTEID = tp.getLgNATUREVENTEID().getLgNATUREVENTEID();
        } catch (Exception e) {
        }

        this.client = client;
        if (client != null) {
            this.clientFullName = client.getStrFIRSTNAME() + " " + client.getStrLASTNAME();
        } else {
            TClient cl = tp.getClient();
            if (cl != null) {
                this.clientFullName = cl.getStrFIRSTNAME() + " " + cl.getStrLASTNAME();
            }
        }
        tpds.forEach((tpd) -> {
            this.details = "<b><span style='display:inline-block;width: 7%;'>" + tpd.getLgFAMILLEID().getIntCIP() + "</span><span style='display:inline-block;width: 25%;'>" + tpd.getLgFAMILLEID().getStrDESCRIPTION() + "</span><span style='display:inline-block;width: 10%;'>(" + tpd.getIntQUANTITY() + ")</span><span style='display:inline-block;width: 15%;'>" + DateConverter.amountFormat(tpd.getIntPRICEUNITAIR(), '.') + " F CFA " + "</span></b><br> " + this.details;
        });
    }

    public MagasinDTO getMagasin() {
        return magasin;
    }

    public void setMagasin(MagasinDTO magasin) {
        this.magasin = magasin;
    }

    public VenteDTO(TPreenregistrement tp, MagasinDTO magasin) {
        this.lgPREENREGISTREMENTID = tp.getLgPREENREGISTREMENTID();
        this.strREF = tp.getStrREF();
        this.strREFTICKET = tp.getStrREFTICKET();
        this.intPRICE = tp.getIntPRICE();
        this.intPRICEREMISE = tp.getIntPRICEREMISE();
        this.strTYPEVENTE = tp.getStrTYPEVENTE();
        this.intCUSTPART = tp.getIntCUSTPART();
        this.dtUPDATED = dateFormat.format(tp.getDtUPDATED());
        this.heure = heureFormat.format(tp.getDtUPDATED());
        this.strSTATUT = tp.getStrSTATUT();
        this.copy = tp.getCopy();
        this.mvdate = DateConverter.convertDateToYYYY_MM_DD(tp.getDtUPDATED());
        try {
            this.dateAnnulation = dateFormat.format(tp.getDtANNULER());
            this.heureAnnulation = heureFormat.format(tp.getDtANNULER());
        } catch (Exception e) {
        }
        try {
            this.remiseDepot = Integer.valueOf(tp.getLgREMISEID());
        } catch (Exception e) {
        }
        try {
            TUser tu = tp.getLgUSERVENDEURID();
            this.lgUSERVENDEURID = tu.getLgUSERID();
            this.userFullName = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
        } catch (Exception e) {
        }
        this.lgEMPLACEMENTID = magasin.getLgEMPLACEMENTID();
        this.magasin = magasin;
        this.lgTYPEDEPOTID = magasin.getLgTYPEDEPOTID();
        this.lgCLIENTID = magasin.getLgCLIENTID();
        this.desciptiontypedepot = magasin.getDesciptiontypedepot();
        this.strNAME = magasin.getStrNAME();
        this.gerantFullName = magasin.getGerantFullName();
        TClient c = tp.getClient();
        if (c != null) {
            this.clientFullName = c.getStrFIRSTNAME() + " " + c.getStrLASTNAME();
        }
    }

    public VenteDTO(TPreenregistrement tp, List<TPreenregistrementDetail> tpds, MvtTransaction mt) {
        this.lgPREENREGISTREMENTID = tp.getLgPREENREGISTREMENTID();
        this.strREF = tp.getStrREF();
        this.strREFTICKET = tp.getStrREFTICKET();
        this.intPRICE = tp.getIntPRICE();
        this.intPRICEREMISE = tp.getIntPRICEREMISE();
        this.strTYPEVENTE = tp.getStrTYPEVENTE();
        this.intCUSTPART = tp.getIntCUSTPART();
        this.dtUPDATED = dateFormat.format(tp.getDtUPDATED());
        this.heure = heureFormat.format(tp.getDtUPDATED());
        this.dtCREATED = dateFormat.format(tp.getDtUPDATED());
        this.HEUREVENTE = heureFormat.format(tp.getDtUPDATED());
        this.strSTATUT = tp.getStrSTATUT();
        this.avoir = tp.getBISAVOIR();
        this.cancel = tp.getBISCANCEL();
        this.sansbon = tp.getBWITHOUTBON();
        this.lgTYPEVENTEID = tp.getLgTYPEVENTEID().getLgTYPEVENTEID();
        this.copy = tp.getCopy();
        this.mvdate = DateConverter.convertDateToYYYY_MM_DD(tp.getDtUPDATED());
        try {
            this.montantPaye = mt.getMontantPaye();
        } catch (Exception e) {
        }

        TClient cl = tp.getClient();
        if (cl != null) {
            this.clientFullName = cl.getStrFIRSTNAME() + " " + cl.getStrLASTNAME();
        }
        try {

            this.dateAnnulation = dateFormat.format(tp.getDtANNULER());
            this.heureAnnulation = heureFormat.format(tp.getDtANNULER());
        } catch (Exception e) {
        }
        try {
            TUser tu = tp.getLgUSERVENDEURID();
            TUser c = tp.getLgUSERCAISSIERID();
            TUser op = tp.getLgUSERID();
            this.lgUSERVENDEURID = tu.getLgUSERID();
            this.userVendeurName = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
            this.userCaissierName = c.getStrFIRSTNAME() + " " + c.getStrLASTNAME();
            this.lgUSERCAISSIERID = c.getLgUSERID();
            this.userFullName = op.getStrFIRSTNAME() + " " + op.getStrLASTNAME();
        } catch (Exception e) {
        }

        tpds.forEach((tpd) -> {
            this.details = "<b><span style='display:inline-block;width: 7%;'>" + tpd.getLgFAMILLEID().getIntCIP() + "</span><span style='display:inline-block;width: 25%;'>" + tpd.getLgFAMILLEID().getStrDESCRIPTION() + "</span><span style='display:inline-block;width: 10%;'>(" + tpd.getIntQUANTITY() + ")</span><span style='display:inline-block;width: 15%;'>" + DateConverter.amountFormat(tpd.getIntPRICEUNITAIR(), '.') + " F CFA " + "</span></b><br> " + this.details;
        });
    }

    public VenteDTO(TPreenregistrement tp, List<TPreenregistrementDetail> tpds) {
        this.lgPREENREGISTREMENTID = tp.getLgPREENREGISTREMENTID();
        this.strREF = tp.getStrREF();
        this.strREFTICKET = tp.getStrREFTICKET();
        this.intPRICE = tp.getIntPRICE();
        this.intPRICEREMISE = tp.getIntPRICEREMISE();
        this.strTYPEVENTE = tp.getStrTYPEVENTE();
        this.intCUSTPART = tp.getIntCUSTPART();
        this.dtUPDATED = dateFormat.format(tp.getDtUPDATED());
        this.heure = heureFormat.format(tp.getDtUPDATED());
        this.dtCREATED = dateFormat.format(tp.getDtUPDATED());
        this.HEUREVENTE = heureFormat.format(tp.getDtUPDATED());
        this.strSTATUT = tp.getStrSTATUT();
        this.avoir = tp.getBISAVOIR();
        this.cancel = tp.getBISCANCEL();
        this.sansbon = tp.getBWITHOUTBON();
        this.lgTYPEVENTEID = tp.getLgTYPEVENTEID().getLgTYPEVENTEID();
        this.copy = tp.getCopy();
        this.mvdate = DateConverter.convertDateToYYYY_MM_DD(tp.getDtUPDATED());
        TClient cl = tp.getClient();
        if (cl != null) {
            this.clientFullName = cl.getStrFIRSTNAME() + " " + cl.getStrLASTNAME();
        }
        try {

            this.dateAnnulation = dateFormat.format(tp.getDtANNULER());
            this.heureAnnulation = heureFormat.format(tp.getDtANNULER());
        } catch (Exception e) {
        }
        try {
            TUser tu = tp.getLgUSERVENDEURID();
            TUser c = tp.getLgUSERCAISSIERID();
            TUser op = tp.getLgUSERID();
            this.lgUSERVENDEURID = tu.getLgUSERID();
            this.userVendeurName = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
            this.userCaissierName = c.getStrFIRSTNAME() + " " + c.getStrLASTNAME();
            this.lgUSERCAISSIERID = c.getLgUSERID();
            this.userFullName = op.getStrFIRSTNAME() + " " + op.getStrLASTNAME();
        } catch (Exception e) {
        }

        tpds.forEach((tpd) -> {
            this.details = "<b><span style='display:inline-block;width: 7%;'>" + tpd.getLgFAMILLEID().getIntCIP() + "</span><span style='display:inline-block;width: 25%;'>" + tpd.getLgFAMILLEID().getStrDESCRIPTION() + "</span><span style='display:inline-block;width: 10%;'>(" + tpd.getIntQUANTITY() + ")</span><span style='display:inline-block;width: 15%;'>" + DateConverter.amountFormat(tpd.getIntPRICEUNITAIR(), '.') + " F CFA " + "</span></b><br> " + this.details;
        });
    }

    public VenteDTO(TPreenregistrement tp, List<TPreenregistrementDetail> tpds, boolean becancel, boolean modification, TPreenregistrementCompteClient tpcc) {
        this.lgPREENREGISTREMENTID = tp.getLgPREENREGISTREMENTID();
        this.intPRICERESTE = 0;
        if (tpcc != null) {
            this.intPRICERESTE = tpcc.getIntPRICERESTE();
        }

        this.strREF = tp.getStrREF();
        this.strREFTICKET = tp.getStrREFTICKET();
        this.intPRICE = tp.getIntPRICE();
        this.intPRICEREMISE = tp.getIntPRICEREMISE();
        this.strTYPEVENTE = tp.getStrTYPEVENTE();
        this.intCUSTPART = tp.getIntCUSTPART();
        this.dtUPDATED = dateFormat.format(tp.getDtUPDATED());
        this.heure = heureFormat.format(tp.getDtUPDATED());
        this.dtCREATED = dateFormat.format(tp.getDtUPDATED());
        this.HEUREVENTE = heureFormat.format(tp.getDtUPDATED());
        this.strSTATUT = tp.getStrSTATUT();
        this.avoir = tp.getBISAVOIR();
        this.cancel = tp.getBISCANCEL();
        this.beCancel = becancel;
        this.modification = modification;
        this.sansbon = tp.getBWITHOUTBON();
        this.lgTYPEVENTEID = tp.getLgTYPEVENTEID().getLgTYPEVENTEID();
        this.mvdate = DateConverter.convertDateToYYYY_MM_DD(tp.getDtUPDATED());
        TClient cl = tp.getClient();
        this.copy = tp.getCopy();
        if (cl != null) {
            this.clientFullName = cl.getStrFIRSTNAME() + " " + cl.getStrLASTNAME();
        }

        try {
            TUser tu = tp.getLgUSERVENDEURID();
            TUser c = tp.getLgUSERCAISSIERID();
            TUser op = tp.getLgUSERID();
            this.lgUSERVENDEURID = tu.getLgUSERID();
            this.userCaissierName = c.getStrFIRSTNAME() + " " + c.getStrLASTNAME();
            this.lgUSERCAISSIERID = c.getLgUSERID();
            this.lgUPDATEDBY = op.getStrFIRSTNAME() + " " + op.getStrLASTNAME();
            this.userVendeurName = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();

            this.userFullName = op.getStrFIRSTNAME() + " " + op.getStrLASTNAME();
        } catch (Exception e) {
        }
        try {
            this.dateAnnulation = dateFormat.format(tp.getDtANNULER());
            this.heureAnnulation = heureFormat.format(tp.getDtANNULER());
        } catch (Exception e) {
        }
        tpds.forEach((tpd) -> {
            this.details = "<b><span style='display:inline-block;width: 7%;'>" + tpd.getLgFAMILLEID().getIntCIP() + "</span><span style='display:inline-block;width: 25%;'>" + tpd.getLgFAMILLEID().getStrDESCRIPTION() + "</span><span style='display:inline-block;width: 10%;'>(" + tpd.getIntQUANTITY() + ")</span><span style='display:inline-block;width: 15%;'>" + DateConverter.amountFormat(tpd.getIntPRICEUNITAIR(), '.') + " F CFA " + "</span></b><br> " + this.details;
        });
    }

    public VenteDTO(TPreenregistrement tp, MagasinDTO magasin, List<TPreenregistrementDetail> tpds) {
        this.lgPREENREGISTREMENTID = tp.getLgPREENREGISTREMENTID();
        this.strREF = tp.getStrREF();
        this.strREFTICKET = tp.getStrREFTICKET();
        this.intPRICE = tp.getIntPRICE();
        this.intPRICEREMISE = tp.getIntPRICEREMISE();
        this.strTYPEVENTE = tp.getStrTYPEVENTE();
        this.intCUSTPART = tp.getIntCUSTPART();
        this.dtUPDATED = dateFormat.format(tp.getDtUPDATED());
        this.heure = heureFormat.format(tp.getDtUPDATED());
        this.strSTATUT = tp.getStrSTATUT();
        this.mvdate = DateConverter.convertDateToYYYY_MM_DD(tp.getDtUPDATED());
        this.copy = tp.getCopy();
        try {
            this.remiseDepot = Integer.valueOf(tp.getLgREMISEID());
        } catch (Exception e) {
        }
        try {
            TUser tu = tp.getLgUSERVENDEURID();
            this.lgUSERVENDEURID = tu.getLgUSERID();
            this.userFullName = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
        } catch (Exception e) {
        }
        try {
            this.dateAnnulation = dateFormat.format(tp.getDtANNULER());
            this.heureAnnulation = heureFormat.format(tp.getDtANNULER());
        } catch (Exception e) {
        }
        this.lgEMPLACEMENTID = magasin.getLgEMPLACEMENTID();
        this.magasin = magasin;
        this.lgTYPEDEPOTID = magasin.getLgTYPEDEPOTID();
        this.lgCLIENTID = magasin.getLgCLIENTID();
        this.desciptiontypedepot = magasin.getDesciptiontypedepot();
        this.strNAME = magasin.getStrNAME();
        this.gerantFullName = magasin.getGerantFullName();
        TClient cl = tp.getClient();
        if (cl != null) {
            this.clientFullName = cl.getStrFIRSTNAME() + " " + cl.getStrLASTNAME();
        }
        tpds.forEach((tpd) -> {
            this.details = "<b><span style='display:inline-block;width: 7%;'>" + tpd.getLgFAMILLEID().getIntCIP() + "</span><span style='display:inline-block;width: 25%;'>" + tpd.getLgFAMILLEID().getStrDESCRIPTION() + "</span><span style='display:inline-block;width: 10%;'>(" + tpd.getIntQUANTITY() + ")</span><span style='display:inline-block;width: 15%;'>" + DateConverter.amountFormat(tpd.getIntPRICEUNITAIR(), '.') + " F CFA " + "</span></b><br> " + this.details;
        });
    }

    public VenteDTO(TPreenregistrement tp, List<TiersPayantParams> tierspayants, AyantDroitDTO ayantDroit, ClientDTO client) {
        this.lgPREENREGISTREMENTID = tp.getLgPREENREGISTREMENTID();
        this.strREF = tp.getStrREF();
        this.strREFTICKET = tp.getStrREFTICKET();
        this.intPRICE = tp.getIntPRICE();
        this.intPRICEREMISE = tp.getIntPRICEREMISE();
        this.strTYPEVENTE = tp.getStrTYPEVENTE();
        this.intCUSTPART = tp.getIntCUSTPART();
        this.dtUPDATED = dateFormat.format(tp.getDtUPDATED());
        this.heure = heureFormat.format(tp.getDtUPDATED());
        this.strSTATUT = tp.getStrSTATUT();
        this.strREFBON = tp.getStrREFBON();
        this.copy = tp.getCopy();
        this.mvdate = DateConverter.convertDateToYYYY_MM_DD(tp.getDtUPDATED());
        try {
            this.dateAnnulation = dateFormat.format(tp.getDtANNULER());
            this.heureAnnulation = heureFormat.format(tp.getDtANNULER());
        } catch (Exception e) {
        }
        try {
            TRemise remise = tp.getRemise();
            this.lgREMISEID = remise.getLgREMISEID();
            this.typeRemiseId = remise.getLgTYPEREMISEID().getLgTYPEREMISEID();
        } catch (Exception e) {
        }
        try {
            TUser tu = tp.getLgUSERVENDEURID();
            this.lgUSERVENDEURID = tu.getLgUSERID();
            this.userFullName = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();
            TUser caisse = tp.getLgUSERCAISSIERID();
            this.userCaissierName = caisse.getStrFIRSTNAME() + " " + caisse.getStrLASTNAME();
        } catch (Exception e) {
        }
        try {
            TTypeVente typeVente = tp.getLgTYPEVENTEID();
            this.strTYPEVENTENAME = typeVente.getStrNAME();
            this.lgTYPEVENTEID = typeVente.getLgTYPEVENTEID();
        } catch (Exception e) {
        }
        try {
            this.lgNATUREVENTEID = tp.getLgNATUREVENTEID().getLgNATUREVENTEID();
        } catch (Exception e) {
        }
        this.tierspayants = tierspayants;
        this.ayantDroit = ayantDroit;
        this.client = client;

        if (client != null) {
            this.clientFullName = client.getStrFIRSTNAME() + " " + client.getStrLASTNAME();
        } else {
            TClient cl = tp.getClient();
            if (cl != null) {
                this.clientFullName = cl.getStrFIRSTNAME() + " " + cl.getStrLASTNAME();
            }
        }

    }

    public String getLgUPDATEDBY() {
        return lgUPDATEDBY;
    }

    public void setLgUPDATEDBY(String lgUPDATEDBY) {
        this.lgUPDATEDBY = lgUPDATEDBY;
    }

    public String getDtCREATED() {
        return dtCREATED;
    }

    public void setDtCREATED(String dtCREATED) {
        this.dtCREATED = dtCREATED;
    }

    public String getHEUREVENTE() {
        return HEUREVENTE;
    }

    public void setHEUREVENTE(String HEUREVENTE) {
        this.HEUREVENTE = HEUREVENTE;
    }

    public String getUserVendeurName() {
        return userVendeurName;
    }

    public void setUserVendeurName(String userVendeurName) {
        this.userVendeurName = userVendeurName;
    }
    private Date dateOperation;

    public VenteDTO(TPreenregistrement tp, MvtTransaction mvtTransaction, List<VenteDetailsDTO> tpds, TClient tc, MagasinDTO dTO) {
        this.lgPREENREGISTREMENTID = tp.getLgPREENREGISTREMENTID();
        this.strREF = tp.getStrREF();
        this.strREFTICKET = tp.getStrREFTICKET();
        this.intPRICE = tp.getIntPRICE();
        this.intPRICEREMISE = tp.getIntPRICEREMISE();
        this.strTYPEVENTE = tp.getStrTYPEVENTE();
        this.intCUSTPART = tp.getIntCUSTPART();
        this.avoir = tp.getBISAVOIR();
        this.cancel = tp.getBISCANCEL();
        this.sansbon = tp.getBWITHOUTBON();
        this.lgTYPEVENTEID = tp.getLgTYPEVENTEID().getLgTYPEVENTEID();
        this.copy = tp.getCopy();
        this.dateOperation = tp.getDtUPDATED();
        this.mvdate = DateConverter.convertDateToYYYY_MM_DD(tp.getDtUPDATED());
        this.items = tpds;
        TClient cl = tp.getClient();
        if (cl != null) {
            this.clientFullName = cl.getStrFIRSTNAME() + " " + cl.getStrLASTNAME();
        }
        try {

            this.dateAnnulation = dateFormat.format(tp.getDtANNULER());
            this.heureAnnulation = heureFormat.format(tp.getDtANNULER());
        } catch (Exception e) {
        }
        try {
            TUser tu = tp.getLgUSERVENDEURID();
            TUser c = tp.getLgUSERCAISSIERID();
            TUser op = tp.getLgUSERID();
            this.lgUSERVENDEURID = tu.getLgUSERID();
            this.userVendeurName = tu.getStrFIRSTNAME().substring(0, 1).toUpperCase() + " " + tu.getStrLASTNAME();
            this.userCaissierName = c.getStrFIRSTNAME().substring(0, 1).toUpperCase() + " " + c.getStrLASTNAME();
            this.lgUSERCAISSIERID = c.getLgUSERID();
            this.userFullName = op.getStrFIRSTNAME().substring(0, 1).toUpperCase() + " " + op.getStrLASTNAME();
        } catch (Exception e) {
        }

    }

    public Date getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(Date dateOperation) {
        this.dateOperation = dateOperation;
    }

    public String getMvdate() {
        return mvdate;
    }

    public void setMvdate(String mvdate) {
        this.mvdate = mvdate;
    }

    public  VenteDTO buildAvoirs(TPreenregistrement tp, List<VenteDetailsDTO> items) {
        VenteDTO d = new VenteDTO();
        d.items = items;
        d.lgPREENREGISTREMENTID = tp.getLgPREENREGISTREMENTID();
        d.strREF = tp.getStrREF();
        d.strREFTICKET = tp.getStrREFTICKET();
        d.intPRICE = tp.getIntPRICE();
        d.intPRICEREMISE = tp.getIntPRICEREMISE();
        d.strTYPEVENTE = tp.getStrTYPEVENTE();
        d.intCUSTPART = tp.getIntCUSTPART();
        d.dtUPDATED = dateFormat.format(tp.getDtUPDATED());
        d.heure = heureFormat.format(tp.getDtUPDATED());
        d.dtCREATED = dateFormat.format(tp.getDtUPDATED());
        d.HEUREVENTE = heureFormat.format(tp.getDtUPDATED());
        d.strSTATUT = tp.getStrSTATUT();
        d.avoir = tp.getBISAVOIR();
        d.cancel = tp.getBISCANCEL();
        d.sansbon = tp.getBWITHOUTBON();
        d.lgTYPEVENTEID = tp.getLgTYPEVENTEID().getLgTYPEVENTEID();
        d.mvdate = DateConverter.convertDateToYYYY_MM_DD(tp.getDtUPDATED());
        TClient cl = tp.getClient();

        if (cl != null) {
            d.clientFullName = cl.getStrFIRSTNAME() + " " + cl.getStrLASTNAME();
        }

        try {
            TUser tu = tp.getLgUSERVENDEURID();
            TUser c = tp.getLgUSERCAISSIERID();
            TUser op = tp.getLgUSERID();
            d.lgUSERVENDEURID = tu.getLgUSERID();
            d.userCaissierName = c.getStrFIRSTNAME() + " " + c.getStrLASTNAME();
            d.lgUSERCAISSIERID = c.getLgUSERID();
            d.lgUPDATEDBY = op.getStrFIRSTNAME() + " " + op.getStrLASTNAME();
            d.userVendeurName = tu.getStrFIRSTNAME() + " " + tu.getStrLASTNAME();

            d.userFullName = op.getStrFIRSTNAME() + " " + op.getStrLASTNAME();
        } catch (Exception e) {
        }
        try {
            d.dateAnnulation = dateFormat.format(tp.getDtANNULER());
            d.heureAnnulation = heureFormat.format(tp.getDtANNULER());
        } catch (Exception e) {
        }
        return d;

    }

}