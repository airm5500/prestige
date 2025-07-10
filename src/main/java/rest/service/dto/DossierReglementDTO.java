/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package rest.service.dto;

import dal.TDossierReglement;
import dal.TFacture;
import dal.TTiersPayant;
import dal.TUser;
import java.time.LocalDateTime;
import util.DateConverter;

/**
 *
 * @author koben
 */
public class DossierReglementDTO {

    private String lgDOSSIERREGLEMENTID;
    private long montantRegle;
    private long montantAttendu;
    private long montantRestant;
    private long montantFacture;
    private String numFacture;
    private String operateur;
    private int totalDossier;
    private LocalDateTime dateReglement;
    private String dateHeureReglement;
    private String tiersPayantId;
    private String tiersPayantName;

    public String getLgDOSSIERREGLEMENTID() {
        return lgDOSSIERREGLEMENTID;
    }

    public void setLgDOSSIERREGLEMENTID(String lgDOSSIERREGLEMENTID) {
        this.lgDOSSIERREGLEMENTID = lgDOSSIERREGLEMENTID;
    }

    public long getMontantRegle() {
        return montantRegle;
    }

    public void setMontantRegle(long montantRegle) {
        this.montantRegle = montantRegle;
    }

    public long getMontantAttendu() {
        return montantAttendu;
    }

    public void setMontantAttendu(long montantAttendu) {
        this.montantAttendu = montantAttendu;
    }

    public long getMontantRestant() {
        return montantRestant;
    }

    public void setMontantRestant(long montantRestant) {
        this.montantRestant = montantRestant;
    }

    public long getMontantFacture() {
        return montantFacture;
    }

    public void setMontantFacture(long montantFacture) {
        this.montantFacture = montantFacture;
    }

    public String getNumFacture() {
        return numFacture;
    }

    public void setNumFacture(String numFacture) {
        this.numFacture = numFacture;
    }

    public String getOperateur() {
        return operateur;
    }

    public void setOperateur(String operateur) {
        this.operateur = operateur;
    }

    public int getTotalDossier() {
        return totalDossier;
    }

    public void setTotalDossier(int totalDossier) {
        this.totalDossier = totalDossier;
    }

    public LocalDateTime getDateReglement() {
        return dateReglement;
    }

    public void setDateReglement(LocalDateTime dateReglement) {
        this.dateReglement = dateReglement;
    }

    public String getDateHeureReglement() {
        return dateHeureReglement;
    }

    public void setDateHeureReglement(String dateHeureReglement) {
        this.dateHeureReglement = dateHeureReglement;
    }

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
    }

    public String getTiersPayantName() {
        return tiersPayantName;
    }

    public void setTiersPayantName(String tiersPayantName) {
        this.tiersPayantName = tiersPayantName;
    }

    public DossierReglementDTO(TDossierReglement dossierReglement, TTiersPayant payant) {
        this.lgDOSSIERREGLEMENTID = dossierReglement.getLgDOSSIERREGLEMENTID();
        this.montantRegle = dossierReglement.getDblAMOUNT().longValue();
        this.montantAttendu = dossierReglement.getDblMONTANTATTENDU().longValue();
        TFacture facture = dossierReglement.getLgFACTUREID();
        if (facture != null) {
            this.numFacture = facture.getStrCODEFACTURE();
            this.montantFacture = facture.getDblMONTANTCMDE().longValue();

        }
        this.montantRestant = this.montantAttendu - this.montantRegle;
        TUser user = dossierReglement.getLgUSERID();
        if (user != null) {
            this.operateur = user.getStrFIRSTNAME() + " " + user.getStrLASTNAME();
        }

        this.totalDossier = dossierReglement.getTDossierReglementDetailCollection().size();
        this.dateReglement = DateConverter.convertDateToLocalDateTimeElseNull(dossierReglement.getDtREGLEMENT());
        this.dateHeureReglement = DateConverter.convertDateToDD_MM_YYYY_HH_mm(dossierReglement.getDtREGLEMENT());
        if (payant != null) {
            this.tiersPayantId = payant.getLgTIERSPAYANTID();
            this.tiersPayantName = payant.getStrFULLNAME();
        }

    }

}
