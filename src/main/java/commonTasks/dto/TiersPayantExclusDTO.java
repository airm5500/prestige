/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TTiersPayant;
import java.util.ArrayList;
import java.util.List;

/**
 *
 * @author koben
 */
public class TiersPayantExclusDTO {

    private String id;
    private String nom, nomComplet, code;
    private boolean toBeExclude, depot;
    private long chiffreAffaire, account, nbreVente, montantRemise;
    private List<VenteTiersPayantsDTO> ventes = new ArrayList<>();

    public String getId() {
        return id;
    }

    public boolean isDepot() {
        return depot;
    }

    public void setDepot(boolean depot) {
        this.depot = depot;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getNomComplet() {
        return nomComplet;
    }

    public void setNomComplet(String nomComplet) {
        this.nomComplet = nomComplet;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public boolean isToBeExclude() {
        return toBeExclude;
    }

    public void setToBeExclude(boolean toBeExclude) {
        this.toBeExclude = toBeExclude;
    }

    public TiersPayantExclusDTO(TTiersPayant payant) {
        this.id = payant.getLgTIERSPAYANTID();
        this.nom = payant.getStrNAME();
        this.nomComplet = payant.getStrFULLNAME();
        this.code = payant.getStrCODEORGANISME();
        this.toBeExclude = payant.getToBeExclude();
        this.account = payant.getAccount();
        this.depot = payant.getIsDepot();
    }

    public TiersPayantExclusDTO() {
    }

    public long getChiffreAffaire() {
        return chiffreAffaire;
    }

    public TiersPayantExclusDTO setChiffreAffaire(long chiffreAffaire) {
        this.chiffreAffaire = chiffreAffaire;
        return this;
    }

    public long getAccount() {
        return account;
    }

    public TiersPayantExclusDTO setAccount(long account) {
        this.account = account;
        return this;
    }

    public long getNbreVente() {
        return nbreVente;
    }

    public TiersPayantExclusDTO setNbreVente(long nbreVente) {
        this.nbreVente = nbreVente;
        return this;
    }

    public List<VenteTiersPayantsDTO> getVentes() {
        return ventes;
    }

    public long getMontantRemise() {
        return montantRemise;
    }

    public TiersPayantExclusDTO setMontantRemise(long montantRemise) {
        this.montantRemise = montantRemise;
        return this;
    }

    public TiersPayantExclusDTO setVentes(List<VenteTiersPayantsDTO> ventes) {
        this.ventes = ventes;
        ventes.forEach(e -> {
            this.nbreVente++;
            this.chiffreAffaire += e.getMontant();
            this.montantRemise += e.getMontantRemise();
        });
        return this;
    }

    public TiersPayantExclusDTO(long chiffreAffaire, long nbreVente) {
        this.chiffreAffaire = chiffreAffaire;
        this.nbreVente = nbreVente;
    }

}
