/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TUser;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 *
 * @author Kobena
 */
public class ClotureVenteParams implements Serializable {

    private String typeRegleId, compteClientId, remiseId, userVendeurId, commentaire, clientId, ayantDroitId;
    String banque = "", lieux = "";
    String nom = "";
    Integer montantRecu = 0, montantRemis = 0, totalRecap = 0, montantPaye, partTP = 0, marge = 0;
    private TUser userId;
    private String venteId;
    private boolean sansBon;
    private String typeVenteId, natureVenteId;
    private TiersPayantParams compteTp, compteTpNouveau;
    private List<TiersPayantParams> tierspayants = new ArrayList<>();
    private MontantAPaye data;
    private Set<VenteReglementDTO> reglements = new HashSet<>();

    public Set<VenteReglementDTO> getReglements() {
        return reglements;
    }

    public ClotureVenteParams setReglements(Set<VenteReglementDTO> reglements) {
        this.reglements = reglements;
        return this;
    }

    public MontantAPaye getData() {
        return data;
    }

    public void setData(MontantAPaye data) {
        this.data = data;
    }

    public TUser getUserId() {
        return userId;
    }

    public TiersPayantParams getCompteTp() {
        return compteTp;
    }

    public void setCompteTp(TiersPayantParams compteTp) {
        this.compteTp = compteTp;
    }

    public TiersPayantParams getCompteTpNouveau() {
        return compteTpNouveau;
    }

    public void setCompteTpNouveau(TiersPayantParams compteTpNouveau) {
        this.compteTpNouveau = compteTpNouveau;
    }

    public List<TiersPayantParams> getTierspayants() {
        return tierspayants;
    }

    public void setTierspayants(List<TiersPayantParams> tierspayants) {
        this.tierspayants = tierspayants;
    }

    public Integer getPartTP() {
        return partTP;
    }

    public Integer getMarge() {
        return marge;
    }

    public void setMarge(Integer marge) {
        this.marge = marge;
    }

    public void setPartTP(Integer partTP) {
        this.partTP = partTP;
    }

    public String getTypeVenteId() {
        return typeVenteId;
    }

    public void setTypeVenteId(String typeVenteId) {
        this.typeVenteId = typeVenteId;
    }

    public String getNatureVenteId() {
        return natureVenteId;
    }

    public void setNatureVenteId(String natureVenteId) {
        this.natureVenteId = natureVenteId;
    }

    public void setUserId(TUser userId) {
        this.userId = userId;
    }

    public Integer getMontantPaye() {
        return montantPaye;
    }

    public void setMontantPaye(Integer montantPaye) {
        this.montantPaye = montantPaye;
    }

    public String getVenteId() {
        return venteId;
    }

    public void setVenteId(String venteId) {
        this.venteId = venteId;
    }

    public boolean isSansBon() {
        return sansBon;
    }

    public void setSansBon(boolean sansBon) {
        this.sansBon = sansBon;
    }

    public String getTypeRegleId() {
        return typeRegleId;
    }

    public void setTypeRegleId(String typeRegleId) {
        this.typeRegleId = typeRegleId;
    }

    public String getCompteClientId() {
        return compteClientId;
    }

    public void setCompteClientId(String compteClientId) {
        this.compteClientId = compteClientId;
    }

    public String getRemiseId() {
        return remiseId;
    }

    public void setRemiseId(String remiseId) {
        this.remiseId = remiseId;
    }

    public String getUserVendeurId() {
        return userVendeurId;
    }

    public void setUserVendeurId(String userVendeurId) {
        this.userVendeurId = userVendeurId;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getAyantDroitId() {
        return ayantDroitId;
    }

    public void setAyantDroitId(String ayantDroitId) {
        this.ayantDroitId = ayantDroitId;
    }

    public String getBanque() {
        return banque;
    }

    public void setBanque(String banque) {
        this.banque = banque;
    }

    public String getLieux() {
        return lieux;
    }

    public void setLieux(String lieux) {
        this.lieux = lieux;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public Integer getMontantRecu() {
        return montantRecu;
    }

    public void setMontantRecu(Integer montantRecu) {
        this.montantRecu = montantRecu;
    }

    public Integer getMontantRemis() {
        return montantRemis;
    }

    public void setMontantRemis(Integer montantRemis) {
        this.montantRemis = montantRemis;
    }

    public Integer getTotalRecap() {
        return totalRecap;
    }

    public void setTotalRecap(Integer totalRecap) {
        this.totalRecap = totalRecap;
    }

    @Override
    public String toString() {
        return "ClotureVenteParams {" + "typeRegleId=" + typeRegleId + ", compteClientId=" + compteClientId
                + ", remiseId=" + remiseId + ", userVendeurId=" + userVendeurId + ", commentaire=" + commentaire
                + ", clientId=" + clientId + ", ayantDroitId=" + ayantDroitId + ", banque=" + banque + ", lieux="
                + lieux + ", nom=" + nom + ", montantRecu=" + montantRecu + ", montantRemis=" + montantRemis
                + ", totalRecap=" + totalRecap + ", montantPaye=" + montantPaye + ", partTP=" + partTP + ", userId="
                + userId + ", venteId=" + venteId + ", sansBon=" + sansBon + ", typeVenteId=" + typeVenteId
                + ", natureVenteId=" + natureVenteId + '}';
    }

}
