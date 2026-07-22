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
 * Ticket d'assistance du Centre de Support. Cree manuellement par un utilisateur autorise ou automatiquement depuis un
 * evenement applicatif.
 *
 * @author koben
 */
@Entity
@Table(name = "t_support_ticket")
@NamedQueries({
        @NamedQuery(name = "SupportTicket.all", query = "SELECT o FROM SupportTicket o ORDER BY o.createdAt DESC"),
        @NamedQuery(name = "SupportTicket.findOpenBySignature", query = "SELECT o FROM SupportTicket o WHERE o.eventSignature = :signature AND o.statutTicket NOT IN ('RESOLU','CLOTURE','ANNULE')") })
public class SupportTicket extends AbstractEntity {

    private static final long serialVersionUID = 1L;

    public static final String STATUT_NOUVEAU = "NOUVEAU";
    public static final String STATUT_OUVERT = "OUVERT";
    public static final String STATUT_AFFECTE = "AFFECTE";
    public static final String STATUT_EN_COURS = "EN_COURS";
    public static final String STATUT_EN_ATTENTE_CLIENT = "EN_ATTENTE_CLIENT";
    public static final String STATUT_RESOLU = "RESOLU";
    public static final String STATUT_CLOTURE = "CLOTURE";
    public static final String STATUT_ANNULE = "ANNULE";

    @NotNull
    @Column(name = "numero", nullable = false, length = 30)
    private String numero;
    @Column(name = "officine")
    private String officine;
    @Column(name = "utilisateur")
    private String utilisateur;
    @Column(name = "module", length = 100)
    private String module;
    @Column(name = "type", length = 50)
    private String type = "INCIDENT";
    @Column(name = "priorite", length = 20)
    private String priorite = "MOYENNE";
    @NotNull
    @Column(name = "sujet", nullable = false)
    private String sujet;
    @Column(name = "description", length = 4000)
    private String description;
    @NotNull
    @Column(name = "statut_ticket", nullable = false, length = 30)
    private String statutTicket = STATUT_NOUVEAU;
    @Column(name = "affecte_a")
    private String affecteA;
    @Column(name = "event_signature", length = 64)
    private String eventSignature;
    @Column(name = "application_event_id", length = 50)
    private String applicationEventId;
    @Column(name = "pieces_jointes", length = 2000)
    private String piecesJointes;

    public String getNumero() {
        return numero;
    }

    public void setNumero(String numero) {
        this.numero = numero;
    }

    public String getOfficine() {
        return officine;
    }

    public void setOfficine(String officine) {
        this.officine = officine;
    }

    public String getUtilisateur() {
        return utilisateur;
    }

    public void setUtilisateur(String utilisateur) {
        this.utilisateur = utilisateur;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getPriorite() {
        return priorite;
    }

    public void setPriorite(String priorite) {
        this.priorite = priorite;
    }

    public String getSujet() {
        return sujet;
    }

    public void setSujet(String sujet) {
        this.sujet = sujet;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatutTicket() {
        return statutTicket;
    }

    public void setStatutTicket(String statutTicket) {
        this.statutTicket = statutTicket;
    }

    public String getAffecteA() {
        return affecteA;
    }

    public void setAffecteA(String affecteA) {
        this.affecteA = affecteA;
    }

    public String getEventSignature() {
        return eventSignature;
    }

    public void setEventSignature(String eventSignature) {
        this.eventSignature = eventSignature;
    }

    public String getApplicationEventId() {
        return applicationEventId;
    }

    public void setApplicationEventId(String applicationEventId) {
        this.applicationEventId = applicationEventId;
    }

    public String getPiecesJointes() {
        return piecesJointes;
    }

    public void setPiecesJointes(String piecesJointes) {
        this.piecesJointes = piecesJointes;
    }

}
