/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.dto;

import commonTasks.dto.ReglementCarnetDTO;
import commonTasks.dto.VenteTiersPayantsDTO;
import dal.enumeration.TypeReglementCarnet;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

/**
 *
 * @author koben
 */
public class ExtraitCompteClientDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private static final String PATERN = "MM/yyyy";

    private String libelle, ref;

    private String user;
    private LocalDateTime createdAt;
    private String dateOperation;
    private String tierspayantName;
    private String tierspayantId;
    private Long credit, debit;
    private String monthDay;

    public String getLibelle() {
        return libelle;
    }

    public String getRef() {
        return ref;
    }

    public void setRef(String ref) {
        this.ref = ref;
    }

    public void setLibelle(String libelle) {
        this.libelle = libelle;
    }

    public String getUser() {
        return user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getDateOperation() {
        return dateOperation;
    }

    public void setDateOperation(String dateOperation) {
        this.dateOperation = dateOperation;
    }

    public String getTierspayantName() {
        return tierspayantName;
    }

    public void setTierspayantName(String tierspayantName) {
        this.tierspayantName = tierspayantName;
    }

    public String getTierspayantId() {
        return tierspayantId;
    }

    public void setTierspayantId(String tierspayantId) {
        this.tierspayantId = tierspayantId;
    }

    public Long getCredit() {
        return credit;
    }

    public void setCredit(Long credit) {
        this.credit = credit;
    }

    public Long getDebit() {
        return debit;
    }

    public void setDebit(Long debit) {
        this.debit = debit;
    }

    public String getMonthDay() {
        return monthDay;
    }

    public void setMonthDay(String monthDay) {
        this.monthDay = monthDay;
    }

    public ExtraitCompteClientDTO(VenteTiersPayantsDTO dto) {

        this.libelle = "ACHAT A CREDIT";
        this.user = dto.getOperateur();
        this.createdAt = dto.getCreatedAt();
        this.dateOperation = dto.getDateVente();
        this.tierspayantName = dto.getLibelleTiersPayant();
        this.tierspayantId = dto.getTiersPayantId();
        this.credit = dto.getMontant();
        this.ref = dto.getRefVente();
        this.monthDay = dto.getCreatedAt().format(DateTimeFormatter.ofPattern(PATERN));

    }

    public ExtraitCompteClientDTO(ReglementCarnetDTO dto) {
        TypeReglementCarnet typeReglementCarnet = dto.getTypeReglementCarnet();
        this.libelle = "VERSEMENT";
        if (Objects.nonNull(typeReglementCarnet)) {
            switch (typeReglementCarnet) {
            case DEPENSE:
                this.libelle = "DEPENSE";
                break;
            case REGLEMENT:
                this.libelle = "VERSEMENT";
                break;
            default:
                break;
            }
        }

        this.user = dto.getUser();
        this.createdAt = dto.getCreated();
        this.dateOperation = dto.getCreatedAt();
        this.tierspayantName = dto.getTiersPayant();
        this.tierspayantId = dto.getTiersPayantId();
        this.debit = Long.valueOf(dto.getMontantPaye());
        this.ref = dto.getReference();
        this.monthDay = dto.getCreated().format(DateTimeFormatter.ofPattern("MM/yyyy"));

    }

    public ExtraitCompteClientDTO(RetourCarnetDTO dto) {
        this.libelle = "RETOUR DE PRODUITS";
        this.user = dto.getUser();
        this.createdAt = dto.getCreatedAt();
        this.dateOperation = dto.getDateOperation();
        this.tierspayantName = dto.getTierspayantName();
        this.tierspayantId = dto.getTierspayantId();
        this.debit = dto.getMontant();
        this.ref = "";
        this.monthDay = dto.getCreatedAt().format(DateTimeFormatter.ofPattern(PATERN));

    }
}
