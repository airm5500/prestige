/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.MotifReglement;
import dal.ReglementCarnet;
import dal.TTiersPayant;
import dal.TUser;
import dal.enumeration.TypeReglementCarnet;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import org.apache.commons.lang3.StringUtils;

/**
 *
 * @author koben
 */
public class ReglementCarnetDTO {

    private Integer id;

    private String description;

    private Integer montantPaye;

    private Integer montantPayer;
    private LocalDateTime created;
    private Integer montantRestant;
    private String userId;
    private String user;
    private String tiersPayantId;
    private String tiersPayant;
    private String reference;
    private String createdAt;
    private String typeReglement;
    private String idDossier;
    private String motifLibelle;
    private TypeReglementCarnet typeReglementCarnet;
    private String dateReglement;
    private Integer motifId;
    private String motif;

    public Integer getId() {
        return id;
    }

    public String getMotif() {
        return motif;
    }

    public void setMotif(String motif) {
        this.motif = motif;
    }

    public Integer getMotifId() {
        if (Objects.isNull(motifId) && StringUtils.isNotEmpty(motif)) {
            motifId = Integer.valueOf(motif);
        }
        return motifId;
    }

    public void setMotifId(Integer motifId) {
        this.motifId = motifId;
    }

    public String getDateReglement() {
        return dateReglement;
    }

    public void setDateReglement(String dateReglement) {
        this.dateReglement = dateReglement;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getMontantPaye() {
        return montantPaye;
    }

    public void setMontantPaye(Integer montantPaye) {
        this.montantPaye = montantPaye;
    }

    public Integer getMontantPayer() {
        return montantPayer;
    }

    public void setMontantPayer(Integer montantPayer) {
        this.montantPayer = montantPayer;
    }

    public String getTypeReglement() {
        return typeReglement;
    }

    public void setTypeReglement(String typeReglement) {
        this.typeReglement = typeReglement;
    }

    public Integer getMontantRestant() {
        return montantRestant;
    }

    public void setMontantRestant(Integer montantRestant) {
        this.montantRestant = montantRestant;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUser() {
        return user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public ReglementCarnetDTO setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
        return this;
    }

    public ReglementCarnetDTO typeReglementCarnet(TypeReglementCarnet typeReglementCarnet) {
        this.typeReglementCarnet = typeReglementCarnet;
        return this;
    }

    public String getTiersPayant() {
        return tiersPayant;
    }

    public void setTiersPayant(String tiersPayant) {
        this.tiersPayant = tiersPayant;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getCreated() {
        return created;
    }

    public void setCreated(LocalDateTime created) {
        this.created = created;
    }

    public ReglementCarnetDTO() {
    }

    public String getMotifLibelle() {
        return motifLibelle;
    }

    public void setMotifLibelle(String motifLibelle) {
        this.motifLibelle = motifLibelle;
    }

    public TypeReglementCarnet getTypeReglementCarnet() {
        return typeReglementCarnet;
    }

    public void setTypeReglementCarnet(TypeReglementCarnet typeReglementCarnet) {
        this.typeReglementCarnet = typeReglementCarnet;
    }

    public ReglementCarnetDTO(ReglementCarnet carnet) {
        this.id = carnet.getId();
        this.description = carnet.getDescription();
        this.montantPaye = carnet.getMontantPaye();
        this.montantPayer = carnet.getMontantPayer();
        this.montantRestant = carnet.getMontantRestant();
        TUser us = carnet.getUser();
        this.userId = us.getLgUSERID();
        this.user = us.getStrFIRSTNAME().concat(" ").concat(us.getStrLASTNAME());
        TTiersPayant payant = carnet.getTiersPayant();
        this.tiersPayantId = payant.getLgTIERSPAYANTID();
        this.tiersPayant = payant.getStrFULLNAME();
        this.createdAt = carnet.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        this.description = carnet.getDescription();
        this.reference = StringUtils.leftPad(carnet.getReference().toString(), 5, '0');
        this.created = carnet.getCreatedAt();
        this.idDossier = carnet.getIdDossier();
        MotifReglement motifReglement = carnet.getMotifReglement();
        if (Objects.nonNull(motifReglement)) {
            this.motifLibelle = motifReglement.getLibelle();
            this.motifId = motifReglement.getId();
        }
        this.typeReglementCarnet = Objects.nonNull(carnet.getTypeReglementCarnet()) ? carnet.getTypeReglementCarnet()
                : TypeReglementCarnet.REGLEMENT;
    }

    public String getIdDossier() {
        return idDossier;
    }

    public void setIdDossier(String idDossier) {
        this.idDossier = idDossier;
    }

    public ReglementCarnetDTO(Long montantPaye, Long montantPayer) {
        this.montantPaye = Objects.nonNull(montantPaye) ? montantPaye.intValue() : 0;
        this.montantPayer = Objects.nonNull(montantPayer) ? montantPayer.intValue() : 0;

    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

}
