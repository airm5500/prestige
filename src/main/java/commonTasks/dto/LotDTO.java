/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import util.DateConverter;

/**
 *
 * @author Kobena
 */
public class LotDTO {

    private String codeCip;
    private String libelleFamille;
    private String libelleRayon;
    private String libelle;
    private String numLot;
    private String libelleGrossiste;
    private Integer quantiteLot;
    private Integer valeurAchat;
    private Integer valeurVente;
    private String datePerement;
    private String statut;
    private int periode;

    private Long totalQuantiteLot;
    private Long totalValeurAchat;
    private Long totalValeurVente;

    public LotDTO() {
    }

    public String getCodeCip() {
        return codeCip;
    }

    public void setCodeCip(String codeCip) {
        this.codeCip = codeCip;
    }

    public String getLibelleFamille() {
        return libelleFamille;
    }

    public void setLibelleFamille(String libelleFamille) {
        this.libelleFamille = libelleFamille;
    }

    public String getLibelleRayon() {
        return libelleRayon;
    }

    public void setLibelleRayon(String libelleRayon) {
        this.libelleRayon = libelleRayon;
    }

    public String getLibelle() {
        return libelle;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getNumLot() {
        return numLot;
    }

    public void setNumLot(String numLot) {
        this.numLot = numLot;
    }

    public String getLibelleGrossiste() {
        return libelleGrossiste;
    }

    public void setLibelleGrossiste(String libelleGrossiste) {
        this.libelleGrossiste = libelleGrossiste;
    }

    public Integer getQuantiteLot() {
        return quantiteLot;
    }

    public void setQuantiteLot(Integer quantiteLot) {
        this.quantiteLot = quantiteLot;
    }

    public Integer getValeurAchat() {
        return valeurAchat;
    }

    public void setValeurAchat(Integer valeurAchat) {
        this.valeurAchat = valeurAchat;
    }

    public Integer getValeurVente() {
        return valeurVente;
    }

    public void setValeurVente(Integer valeurVente) {
        this.valeurVente = valeurVente;
    }

    public String getDatePerement() {
        return datePerement;
    }

    public void setDatePerement(String datePerement) {
        this.datePerement = datePerement;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public int getPeriode() {
        return periode;
    }

    public void setPeriode(int periode) {
        this.periode = periode;
    }

    public Long getTotalQuantiteLot() {
        return totalQuantiteLot;
    }

    public void setTotalQuantiteLot(Long totalQuantiteLot) {
        this.totalQuantiteLot = totalQuantiteLot;
    }

    public Long getTotalValeurAchat() {
        return totalValeurAchat;
    }

    public void setTotalValeurAchat(Long totalValeurAchat) {
        this.totalValeurAchat = totalValeurAchat;
    }

    public Long getTotalValeurVente() {
        return totalValeurVente;
    }

    public void setTotalValeurVente(Long totalValeurVente) {
        this.totalValeurVente = totalValeurVente;
    }

    public LotDTO(Long totalQuantiteLot, Long totalValeurAchat, Long totalValeurVente) {
        this.totalQuantiteLot = totalQuantiteLot;
        this.totalValeurAchat = totalValeurAchat;
        this.totalValeurVente = totalValeurVente;
    }

    public LotDTO(String codeCip, String libelleFamille, String libelleRayon, String libelle, String numLot,
            Date datePerement, String libelleGrossiste, Integer quantiteLot, Integer valeurAchat, Integer valeurVente) {
        this.codeCip = codeCip;
        this.libelleFamille = libelleFamille;
        this.libelleRayon = libelleRayon;
        this.libelle = libelle;
        this.numLot = numLot;
        this.libelleGrossiste = libelleGrossiste;
        this.quantiteLot = quantiteLot;
        this.valeurVente = valeurVente;
        this.valeurAchat = valeurAchat;

        LocalDate dateTime = DateConverter.convertDateToLocalDate(datePerement);
        this.datePerement = dateTime.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        LocalDate toDate = LocalDate.now();

        Period p = Period.between(toDate, dateTime);
        int years = p.getYears();
        int months = p.getMonths();
        int days = p.getDays();

        if (dateTime.isBefore(toDate)) {
            Period diff = Period.between(dateTime, toDate);

            String txtYears = diff.getYears() > 0 ? diff.getYears() + " an(s) " : "";
            String txtMonths = diff.getMonths() > 0 ? diff.getMonths() + " mois " : "";
            String txtDays = diff.getDays() > 0 ? diff.getDays() + " jour(s)" : "";
            this.statut = "Périmé il y a " + txtYears + txtMonths + txtDays;

        } else if (dateTime.isEqual(toDate)) {
            days = 0;
            this.statut = "Périme aujourd'hui";
        } else {
            String txtYears = years > 0 ? years + " an(s) " : "";
            String txtMonths = months > 0 ? months + " mois " : "";
            String txtDays = days > 0 ? days + " jour(s)" : "";
            this.statut = "Périme dans " + txtYears + txtMonths + txtDays;

        }
        this.periode = days < 0 || months < 0 || years < 0 ? -1 : days;

    }

}
