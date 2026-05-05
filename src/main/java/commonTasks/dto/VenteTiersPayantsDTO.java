/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.TGroupeTierspayant;
import dal.TPreenregistrement;
import dal.TPreenregistrementCompteClientTiersPayent;
import dal.TTiersPayant;
import dal.TTypeTiersPayant;
import dal.TUser;
import java.io.Serializable;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import rest.service.dto.VenteExclusDTO;
import util.DateConverter;

/**
 *
 * @author koben
 */
public class VenteTiersPayantsDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String libelleGroupe;
    private Integer groupeId;
    private String tiersPayantId;
    private String libelleTiersPayant;
    private String codeTiersPayant;
    private int nbreDossier, taux;
    private long montant, account;
    private long montantRemise;
    private String typeTiersPayant;
    private String typeTiersPayantId;
    private String refVente, dateVente, refBon;
    private String operateur;
    private LocalDateTime createdAt;
    private String groupBy;
    private final DateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss");
    private static String dateFormatPattern = "dd/MM/yyyy HH:mm:ss";

    public long getAccount() {
        return account;
    }

    public String getGroupBy() {
        return groupBy;
    }

    public void setGroupBy(String groupBy) {
        this.groupBy = groupBy;
    }

    public void setAccount(long account) {
        this.account = account;
    }

    public int getTaux() {
        return taux;
    }

    public void setTaux(int taux) {
        this.taux = taux;
    }

    public String getRefVente() {
        return refVente;
    }

    public void setRefVente(String refVente) {
        this.refVente = refVente;
    }

    public String getDateVente() {
        return dateVente;
    }

    public void setDateVente(String dateVente) {
        this.dateVente = dateVente;
    }

    public String getRefBon() {
        return refBon;
    }

    public void setRefBon(String refBon) {
        this.refBon = refBon;
    }

    public String getOperateur() {
        return operateur;
    }

    public void setOperateur(String operateur) {
        this.operateur = operateur;
    }

    public String getLibelleGroupe() {
        return libelleGroupe;
    }

    public String getTypeTiersPayant() {
        return typeTiersPayant;
    }

    public void setTypeTiersPayant(String typeTiersPayant) {
        this.typeTiersPayant = typeTiersPayant;
    }

    public String getTypeTiersPayantId() {
        return typeTiersPayantId;
    }

    public void setTypeTiersPayantId(String typeTiersPayantId) {
        this.typeTiersPayantId = typeTiersPayantId;
    }

    public void setLibelleGroupe(String libelleGroupe) {
        this.libelleGroupe = libelleGroupe;
    }

    public String getLibelleTiersPayant() {
        return libelleTiersPayant;
    }

    public void setLibelleTiersPayant(String libelleTiersPayant) {
        this.libelleTiersPayant = libelleTiersPayant;
    }

    public String getCodeTiersPayant() {
        return codeTiersPayant;
    }

    public void setCodeTiersPayant(String codeTiersPayant) {
        this.codeTiersPayant = codeTiersPayant;
    }

    public int getNbreDossier() {
        return nbreDossier;
    }

    public void setNbreDossier(int nbreDossier) {
        this.nbreDossier = nbreDossier;
    }

    public long getMontant() {
        return montant;
    }

    public void setMontant(long montant) {
        this.montant = montant;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public VenteTiersPayantsDTO(TTiersPayant payant,
            List<TPreenregistrementCompteClientTiersPayent> clientTiersPayents) {

        this.tiersPayantId = payant.getLgTIERSPAYANTID();
        this.codeTiersPayant = payant.getStrCODEORGANISME();
        this.libelleTiersPayant = payant.getStrFULLNAME();
        TGroupeTierspayant groupe = payant.getLgGROUPEID();
        if (groupe != null) {
            this.groupeId = groupe.getLgGROUPEID();
            this.libelleGroupe = groupe.getStrLIBELLE();
        }

        clientTiersPayents.forEach(e -> {
            this.nbreDossier++;
            this.montant += e.getIntPRICE();
            this.montantRemise += e.getIntPRICERESTE();
        });
    }

    public Integer getGroupeId() {
        return groupeId;
    }

    public void setGroupeId(Integer groupeId) {
        this.groupeId = groupeId;
    }

    public String getTiersPayantId() {
        return tiersPayantId;
    }

    public void setTiersPayantId(String tiersPayantId) {
        this.tiersPayantId = tiersPayantId;
    }

    public long getMontantRemise() {
        return montantRemise;
    }

    public void setMontantRemise(long montantRemise) {
        this.montantRemise = montantRemise;
    }

    public VenteTiersPayantsDTO(TPreenregistrementCompteClientTiersPayent p) {
        this.montant = p.getIntPRICE();
        TPreenregistrement pr = p.getLgPREENREGISTREMENTID();
        TUser user = pr.getLgUSERID();
        this.operateur = user.getStrFIRSTNAME().concat(" ").concat(user.getStrLASTNAME());
        this.dateVente = dateFormat.format(pr.getDtUPDATED());
        this.taux = p.getIntPERCENT();
        this.refBon = p.getStrREFBON();
        this.refVente = pr.getStrREF();
        TTiersPayant payant = p.getLgCOMPTECLIENTTIERSPAYANTID().getLgTIERSPAYANTID();
        this.tiersPayantId = payant.getLgTIERSPAYANTID();
        this.codeTiersPayant = payant.getStrCODEORGANISME();
        this.libelleTiersPayant = payant.getStrFULLNAME();
        this.createdAt = DateConverter.convertDateToLocalDateTime(pr.getDtUPDATED());
    }

    @Override
    public String toString() {
        return "VenteTiersPayantsDTO{" + "libelleGroupe=" + libelleGroupe + ", groupeId=" + groupeId
                + ", tiersPayantId=" + tiersPayantId + ", libelleTiersPayant=" + libelleTiersPayant
                + ", codeTiersPayant=" + codeTiersPayant + ", nbreDossier=" + nbreDossier + ", taux=" + taux
                + ", montant=" + montant + ", account=" + account + ", montantRemise=" + montantRemise
                + ", typeTiersPayant=" + typeTiersPayant + ", typeTiersPayantId=" + typeTiersPayantId + ", refVente="
                + refVente + ", dateVente=" + dateVente + ", refBon=" + refBon + ", operateur=" + operateur
                + ", createdAt=" + createdAt + ", dateFormat=" + dateFormat + '}';
    }

    public VenteTiersPayantsDTO() {
    }

    public VenteTiersPayantsDTO(VenteExclusDTO venteExclus) {
        this.montant = venteExclus.getMontantTiersPayant();
        this.operateur = venteExclus.getUserFullName();
        this.dateVente = venteExclus.getModifiedAt().format(DateTimeFormatter.ofPattern(dateFormatPattern));

        this.refBon = venteExclus.getRefBon();
        this.refVente = venteExclus.getPreenregistrementRef();

        this.tiersPayantId = venteExclus.getTiersPayantId();

        this.libelleTiersPayant = venteExclus.getTiersPayantName();
        this.createdAt = venteExclus.getModifiedAt();
    }

    // Constructeur final et sécurisé avec l'objet Number pour contrer les bugs d'Hibernate
    public VenteTiersPayantsDTO(TTiersPayant payant, Number nbreDossier, Number montant, Number montantRemise) {

        this.tiersPayantId = payant.getLgTIERSPAYANTID();
        this.codeTiersPayant = payant.getStrCODEORGANISME();
        this.libelleTiersPayant = payant.getStrFULLNAME();
        TTypeTiersPayant typeTierPayant = payant.getLgTYPETIERSPAYANTID();

        if (typeTierPayant != null) {
            this.typeTiersPayant = typeTierPayant.getStrLIBELLETYPETIERSPAYANT();
            this.typeTiersPayantId = typeTierPayant.getLgTYPETIERSPAYANTID();
        }
        TGroupeTierspayant groupe = payant.getLgGROUPEID();

        if (groupe != null) {
            this.groupeId = groupe.getLgGROUPEID();
            this.libelleGroupe = groupe.getStrLIBELLE();
            this.groupBy = groupe.getStrLIBELLE();
        } else {
            this.groupBy = "";
        }

        // Sécurise l'affectation en gérant les potentiels null retournés par SQL et caste correctement
        this.nbreDossier = (nbreDossier != null) ? nbreDossier.intValue() : 0;
        this.montant = (montant != null) ? montant.longValue() : 0L;
        this.montantRemise = (montantRemise != null) ? montantRemise.longValue() : 0L;
    }
}