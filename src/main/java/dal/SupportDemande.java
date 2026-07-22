/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

/**
 * Demande envoyee au support editeur depuis le sous-menu "Me contacter" du Centre de Support.
 *
 * @author koben
 */
@Entity
@Table(name = "t_support_demande")
@NamedQueries({
        @NamedQuery(name = "SupportDemande.all", query = "SELECT o FROM SupportDemande o ORDER BY o.createdAt DESC") })
public class SupportDemande extends AbstractEntity {

    private static final long serialVersionUID = 1L;

    public static final String STATUT_ENVOI_EN_COURS = "EN_COURS";
    public static final String STATUT_ENVOI_ENVOYEE = "ENVOYEE";
    public static final String STATUT_ENVOI_ECHOUEE = "ECHOUEE";

    @NotNull
    @Column(name = "objet", nullable = false)
    private String objet;
    @NotNull
    @Column(name = "message", nullable = false, length = 4000)
    private String message;
    @Column(name = "module_concerne", length = 100)
    private String moduleConcerne;
    @Column(name = "urgence", length = 20)
    private String urgence = "MOYENNE";
    @Column(name = "nom_officine")
    private String nomOfficine;
    @Column(name = "email_officine")
    private String emailOfficine;
    @Column(name = "telephone", length = 30)
    private String telephone;
    @Column(name = "cree_par")
    private String creePar;
    @Column(name = "statut_envoi", length = 20)
    private String statutEnvoi = STATUT_ENVOI_EN_COURS;
    @Column(name = "erreur_envoi", length = 1000)
    private String erreurEnvoi;
    @Column(name = "pieces_jointes", length = 2000)
    private String piecesJointes;

    public String getObjet() {
        return objet;
    }

    public void setObjet(String objet) {
        this.objet = objet;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getModuleConcerne() {
        return moduleConcerne;
    }

    public void setModuleConcerne(String moduleConcerne) {
        this.moduleConcerne = moduleConcerne;
    }

    public String getUrgence() {
        return urgence;
    }

    public void setUrgence(String urgence) {
        this.urgence = urgence;
    }

    public String getNomOfficine() {
        return nomOfficine;
    }

    public void setNomOfficine(String nomOfficine) {
        this.nomOfficine = nomOfficine;
    }

    public String getEmailOfficine() {
        return emailOfficine;
    }

    public void setEmailOfficine(String emailOfficine) {
        this.emailOfficine = emailOfficine;
    }

    public String getTelephone() {
        return telephone;
    }

    public void setTelephone(String telephone) {
        this.telephone = telephone;
    }

    public String getCreePar() {
        return creePar;
    }

    public void setCreePar(String creePar) {
        this.creePar = creePar;
    }

    public String getStatutEnvoi() {
        return statutEnvoi;
    }

    public void setStatutEnvoi(String statutEnvoi) {
        this.statutEnvoi = statutEnvoi;
    }

    public String getErreurEnvoi() {
        return erreurEnvoi;
    }

    public void setErreurEnvoi(String erreurEnvoi) {
        this.erreurEnvoi = erreurEnvoi;
    }

    public String getPiecesJointes() {
        return piecesJointes;
    }

    public void setPiecesJointes(String piecesJointes) {
        this.piecesJointes = piecesJointes;
    }

}
