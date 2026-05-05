/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.MvtTransaction;
import dal.TClient;
import dal.TDossierReglementDetail;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClient;
import dal.TUser;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import util.DateConverter;

/**
 *
 * @author DICI
 */
public class DelayedDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String idRegle, libelleRegl, heure, dateOp, clientFullName, clientId, reference, userFullName;
    private Integer montantAttendu = 0, montantRegle = 0, totalAmount = 0, montantPaye = 0, montantRestant = 0;
    private LocalDate dateOperation;
    private String id, bon;
    private LocalDateTime date;
    private int solde;
    private String soldeFormated;

    public String getId() {
        return id;
    }

    public String getSoldeFormated() {
        return soldeFormated;
    }

    public void setSoldeFormated(String soldeFormated) {
        this.soldeFormated = soldeFormated;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getSolde() {
        return solde;
    }

    public void setSolde(int solde) {
        this.solde = solde;
    }

    public String getBon() {
        return bon;
    }

    public void setBon(String bon) {
        this.bon = bon;
    }

    public String getUserFullName() {
        return userFullName;
    }

    public LocalDateTime getDate() {
        return date;
    }

    public void setDate(LocalDateTime date) {
        this.date = date;
    }

    public void setUserFullName(String userFullName) {
        this.userFullName = userFullName;
    }

    public String getIdRegle() {
        return idRegle;
    }

    public Integer getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Integer totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public void setIdRegle(String idRegle) {
        this.idRegle = idRegle;
    }

    public String getLibelleRegl() {
        return libelleRegl;
    }

    public void setLibelleRegl(String libelleRegl) {
        this.libelleRegl = libelleRegl;
    }

    public String getHeure() {
        return heure;
    }

    public void setHeure(String heure) {
        this.heure = heure;
    }

    public String getDateOp() {
        return dateOp;
    }

    public void setDateOp(String dateOp) {
        this.dateOp = dateOp;
    }

    public String getClientFullName() {
        return clientFullName;
    }

    public void setClientFullName(String clientFullName) {
        this.clientFullName = clientFullName;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public Integer getMontantAttendu() {
        return montantAttendu;
    }

    public void setMontantAttendu(Integer montantAttendu) {
        this.montantAttendu = montantAttendu;
    }

    public Integer getMontantPaye() {
        return montantPaye;
    }

    public Integer getMontantRestant() {
        return montantRestant;
    }

    public void setMontantRestant(Integer montantRestant) {
        this.montantRestant = montantRestant;
    }

    public void setMontantPaye(Integer montantPaye) {
        this.montantPaye = montantPaye;
    }

    public Integer getMontantRegle() {
        return montantRegle;
    }

    public void setMontantRegle(Integer montantRegle) {
        this.montantRegle = montantRegle;
    }

    public LocalDate getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(LocalDate dateOperation) {
        this.dateOperation = dateOperation;
    }

    public DelayedDTO(TDossierReglementDetail d, TPreenregistrementCompteClient tp) {
        LocalDateTime localDateTime = DateConverter.convertDateToLocalDateTime(tp.getDtUPDATED());
        this.dateOp = localDateTime.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        this.heure = localDateTime.format(DateTimeFormatter.ofPattern("HH:mm"));
        TPreenregistrement p = tp.getLgPREENREGISTREMENTID();
        this.montantRegle = d.getDblAMOUNT().intValue();
        this.reference = p.getStrREF();
        if (p.getStrTYPEVENTE().equals(DateConverter.VENTE_ASSURANCE)) {
            this.reference = p.getStrREFBON();
        }
    }

    public DelayedDTO(TPreenregistrementCompteClient tp) {
        this.dateOperation = DateConverter.convertDateToLocalDate(tp.getDtUPDATED());
        this.id = tp.getLgPREENREGISTREMENTCOMPTECLIENTID();
        TPreenregistrement p = tp.getLgPREENREGISTREMENTID();
        this.reference = p.getStrREF();
        this.totalAmount = p.getIntPRICE() - p.getIntPRICEREMISE();
        LocalDateTime localDateTime = DateConverter.convertDateToLocalDateTime(tp.getDtUPDATED());
        this.dateOp = localDateTime.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        this.heure = localDateTime.format(DateTimeFormatter.ofPattern("HH:mm"));
        if (p.getStrTYPEVENTE().equals(DateConverter.VENTE_ASSURANCE)) {
            this.montantAttendu = tp.getIntPRICERESTE();
            this.montantPaye = p.getIntCUSTPART() - p.getIntPRICEREMISE() - tp.getIntPRICERESTE();
            this.bon = p.getStrREFBON();
        } else {
            this.montantAttendu = tp.getIntPRICERESTE();
            this.montantPaye = p.getIntPRICE() - p.getIntPRICEREMISE() - tp.getIntPRICERESTE();
            this.bon = p.getStrREF();
        }
        this.montantRegle = tp.getIntPRICERESTE();
        try {
            TClient client = tp.getLgCOMPTECLIENTID().getLgCLIENTID();
            this.clientId = client.getLgCLIENTID();
            this.clientFullName = client.getStrFIRSTNAME() + " " + client.getStrLASTNAME();
        } catch (Exception e) {
        }

        TUser user = tp.getLgUSERID();
        this.userFullName = user.getStrFIRSTNAME() + " " + user.getStrLASTNAME();
        this.date = DateConverter.convertDateToLocalDateTime(tp.getDtUPDATED());
    }

    public DelayedDTO() {
    }

    public DelayedDTO(MvtTransaction tp, TClient client) {
        this.dateOperation = tp.getMvtDate();
        LocalDateTime localDateTime = tp.getCreatedAt();
        this.dateOp = localDateTime.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        this.heure = localDateTime.format(DateTimeFormatter.ofPattern("HH:mm"));
        this.montantAttendu = tp.getAvoidAmount();
        this.montantRegle = tp.getMontantRegle();
        this.libelleRegl = tp.getReglement().getStrNAME();
        this.montantRestant = tp.getMontantRestant();
        if (client != null) {
            this.clientId = client.getLgCLIENTID();
            this.clientFullName = client.getStrFIRSTNAME() + " " + client.getStrLASTNAME();
        }
        TUser user = tp.getUser();
        this.userFullName = user.getStrFIRSTNAME() + " " + user.getStrLASTNAME();
        this.date = tp.getCreatedAt();
        this.reference = tp.getPkey();
    }
}
