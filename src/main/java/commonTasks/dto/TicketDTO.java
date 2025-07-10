/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.MvtTransaction;
import dal.TAyantDroit;
import dal.TClient;
import dal.TEmplacement;
import dal.TPreenregistrement;
import dal.TTypeReglement;
import dal.TUser;
import java.io.Serializable;
import java.util.Date;
import java.util.List;

/**
 *
 * @author kkoffi
 */
public class TicketDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private Date dateOperation, sortedDate;
    private String lgPREENREGISTREMENTID, magasin, gerantName, strREFTICKET, lgTYPEVENTEID, refBon, clientFullName,
            userVendeurName, userCaissierName, userFullName, matricule, modeReglement;
    private Integer montantVente, montantRemise, montantClient, montantTp, montantRestant, montantVerse, montantRendu,
            montantDu, montantNet, montantPaye, montantTva;
    private boolean cancel, avoir, copy;
    private List<TiersPayantParams> payants;
    private List<VenteDetailsDTO> items;

    public String getMagasin() {
        return magasin;
    }

    public Integer getMontantTva() {
        return montantTva;
    }

    public void setMontantTva(Integer montantTva) {
        this.montantTva = montantTva;
    }

    public void setMagasin(String magasin) {
        this.magasin = magasin;
    }

    public Date getSortedDate() {
        return sortedDate;
    }

    public void setSortedDate(Date sortedDate) {
        this.sortedDate = sortedDate;
    }

    public String getGerantName() {
        return gerantName;
    }

    public void setDateOperation(Date dateOperation) {
        this.dateOperation = dateOperation;
    }

    public void setLgPREENREGISTREMENTID(String lgPREENREGISTREMENTID) {
        this.lgPREENREGISTREMENTID = lgPREENREGISTREMENTID;
    }

    public void setStrREFTICKET(String strREFTICKET) {
        this.strREFTICKET = strREFTICKET;
    }

    public void setLgTYPEVENTEID(String lgTYPEVENTEID) {
        this.lgTYPEVENTEID = lgTYPEVENTEID;
    }

    public void setRefBon(String refBon) {
        this.refBon = refBon;
    }

    public void setClientFullName(String clientFullName) {
        this.clientFullName = clientFullName;
    }

    public void setUserVendeurName(String userVendeurName) {
        this.userVendeurName = userVendeurName;
    }

    public void setUserCaissierName(String userCaissierName) {
        this.userCaissierName = userCaissierName;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    public void setMatricule(String matricule) {
        this.matricule = matricule;
    }

    public void setModeReglement(String modeReglement) {
        this.modeReglement = modeReglement;
    }

    public void setMontantVente(Integer montantVente) {
        this.montantVente = montantVente;
    }

    public void setMontantRemise(Integer montantRemise) {
        this.montantRemise = montantRemise;
    }

    public void setMontantClient(Integer montantClient) {
        this.montantClient = montantClient;
    }

    public void setMontantTp(Integer montantTp) {
        this.montantTp = montantTp;
    }

    public void setMontantRestant(Integer montantRestant) {
        this.montantRestant = montantRestant;
    }

    public void setMontantVerse(Integer montantVerse) {
        this.montantVerse = montantVerse;
    }

    public void setMontantRendu(Integer montantRendu) {
        this.montantRendu = montantRendu;
    }

    public void setMontantDu(Integer montantDu) {
        this.montantDu = montantDu;
    }

    public void setMontantNet(Integer montantNet) {
        this.montantNet = montantNet;
    }

    public void setMontantPaye(Integer montantPaye) {
        this.montantPaye = montantPaye;
    }

    public void setCancel(boolean cancel) {
        this.cancel = cancel;
    }

    public void setAvoir(boolean avoir) {
        this.avoir = avoir;
    }

    public void setCopy(boolean copy) {
        this.copy = copy;
    }

    public void setPayants(List<TiersPayantParams> payants) {
        this.payants = payants;
    }

    public void setGerantName(String gerantName) {
        this.gerantName = gerantName;
    }

    public Integer getMontantNet() {
        return montantNet;
    }

    public Integer getMontantPaye() {
        return montantPaye;
    }

    public List<VenteDetailsDTO> getItems() {
        return items;
    }

    public void setItems(List<VenteDetailsDTO> items) {
        this.items = items;
    }

    public TicketDTO(TPreenregistrement p, List<VenteDetailsDTO> items, MvtTransaction transaction,
            List<TiersPayantParams> payants, TEmplacement te) {
        this.dateOperation = p.getDtUPDATED();
        this.lgPREENREGISTREMENTID = p.getLgPREENREGISTREMENTID();
        this.strREFTICKET = p.getStrREFTICKET();
        this.lgTYPEVENTEID = p.getLgTYPEVENTEID().getLgTYPEVENTEID();
        this.refBon = p.getStrREFBON();
        this.sortedDate = p.getDtCREATED();
        TClient c = p.getClient();
        if (c != null) {
            TAyantDroit ayantDroit = p.getAyantDroit();
            if (ayantDroit != null) {
                this.clientFullName = ayantDroit.getStrFIRSTNAME() + " " + ayantDroit.getStrLASTNAME();
            } else {
                this.clientFullName = c.getStrFIRSTNAME() + " " + c.getStrLASTNAME();
                ;
            }

            this.matricule = c.getStrNUMEROSECURITESOCIAL();
        }
        TUser v = p.getLgUSERVENDEURID();
        TUser ca = p.getLgUSERCAISSIERID();
        TUser op = p.getLgUSERID();
        try {
            this.userVendeurName = v.getStrFIRSTNAME().substring(0, 1).toUpperCase() + " " + v.getStrLASTNAME();
            this.userCaissierName = ca.getStrFIRSTNAME().substring(0, 1).toUpperCase() + " " + v.getStrLASTNAME();
            this.userFullName = op.getStrFIRSTNAME().substring(0, 1).toUpperCase() + " " + v.getStrLASTNAME();
        } catch (Exception e) {
        }
        this.montantVente = p.getIntPRICE();
        this.montantRemise = p.getIntPRICEREMISE();
        this.montantClient = p.getIntCUSTPART();
        this.montantTp = p.getIntPRICE() - (p.getIntCUSTPART() - p.getIntPRICEREMISE());

        if (transaction != null) {
            this.montantNet = transaction.getMontantNet();
            this.montantPaye = transaction.getMontantPaye();
            TTypeReglement re = transaction.getReglement();
            if (re != null) {
                this.modeReglement = re.getStrNAME();
            }
            this.montantRemise = transaction.getMontantRemise();
            this.montantTva = transaction.getMontantTva();
            this.montantRestant = transaction.getMontantRestant();
            this.montantVerse = transaction.getMontantVerse();
            this.montantRendu = (transaction.getMontantVerse() - transaction.getMontantPaye() > 0
                    ? transaction.getMontantVerse() - transaction.getMontantPaye() : 0);
        }
        this.montantDu = 0;
        this.cancel = p.getBISCANCEL();
        this.avoir = p.getBISAVOIR();
        this.copy = p.getCopy();
        this.payants = payants;
        this.items = items;

        if (te != null) {
            this.magasin = te.getStrNAME();
            this.gerantName = te.getStrFIRSTNAME().substring(0, 1) + " " + te.getStrLASTNAME();
        }

    }

    public Date getDateOperation() {
        return dateOperation;
    }

    public String getLgPREENREGISTREMENTID() {
        return lgPREENREGISTREMENTID;
    }

    public String getStrREFTICKET() {
        return strREFTICKET;
    }

    public String getLgTYPEVENTEID() {
        return lgTYPEVENTEID;
    }

    public String getRefBon() {
        return refBon;
    }

    public String getClientFullName() {
        return clientFullName;
    }

    public String getUserVendeurName() {
        return userVendeurName;
    }

    public String getUserCaissierName() {
        return userCaissierName;
    }

    public String getUserFullName() {
        return userFullName;
    }

    public String getMatricule() {
        return matricule;
    }

    public String getModeReglement() {
        return modeReglement;
    }

    public Integer getMontantVente() {
        return montantVente;
    }

    public Integer getMontantRemise() {
        return montantRemise;
    }

    public Integer getMontantClient() {
        return montantClient;
    }

    public Integer getMontantTp() {
        return montantTp;
    }

    public Integer getMontantRestant() {
        return montantRestant;
    }

    public Integer getMontantVerse() {
        return montantVerse;
    }

    public Integer getMontantRendu() {
        return montantRendu;
    }

    public Integer getMontantDu() {
        return montantDu;
    }

    public boolean isCancel() {
        return cancel;
    }

    public boolean isAvoir() {
        return avoir;
    }

    public boolean isCopy() {
        return copy;
    }

    public List<TiersPayantParams> getPayants() {
        return payants;
    }

}
