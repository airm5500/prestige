/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

/**
 * Evenement applicatif capture automatiquement (exception Java, erreur SQL, erreur JavaScript, echec Ajax...). Les
 * occurrences d'une meme erreur sont dedupliquees par signature technique.
 *
 * @author koben
 */
@Entity
@Table(name = "t_application_event")
@NamedQueries({
        @NamedQuery(name = "ApplicationEvent.all", query = "SELECT o FROM ApplicationEvent o ORDER BY o.lastSeenAt DESC"),
        @NamedQuery(name = "ApplicationEvent.findBySignature", query = "SELECT o FROM ApplicationEvent o WHERE o.signature = :signature") })
public class ApplicationEvent extends AbstractEntity {

    private static final long serialVersionUID = 1L;

    public static final String NIVEAU_INFO = "INFO";
    public static final String NIVEAU_WARN = "WARN";
    public static final String NIVEAU_ERROR = "ERROR";
    public static final String NIVEAU_FATAL = "FATAL";

    @NotNull
    @Column(name = "last_seen_at", nullable = false)
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastSeenAt = LocalDateTime.now();
    @Column(name = "module", length = 100)
    private String module;
    @NotNull
    @Column(name = "type", nullable = false, length = 50)
    private String type;
    @NotNull
    @Column(name = "niveau", nullable = false, length = 20)
    private String niveau = NIVEAU_ERROR;
    @NotNull
    @Column(name = "signature", nullable = false, length = 64)
    private String signature;
    @NotNull
    @Column(name = "message_court", nullable = false, length = 500)
    private String messageCourt;
    @Column(name = "occurrences", nullable = false)
    private int occurrences = 1;
    @Column(name = "utilisateur")
    private String utilisateur;
    @Column(name = "url_ou_ecran")
    private String urlOuEcran;
    @Column(name = "payload_json", length = 4000)
    private String payloadJson;
    @Column(name = "log_ref", length = 500)
    private String logRef;
    @Column(name = "ticket_id", length = 50)
    private String ticketId;

    public LocalDateTime getLastSeenAt() {
        return lastSeenAt;
    }

    public void setLastSeenAt(LocalDateTime lastSeenAt) {
        this.lastSeenAt = lastSeenAt;
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

    public String getNiveau() {
        return niveau;
    }

    public void setNiveau(String niveau) {
        this.niveau = niveau;
    }

    public String getSignature() {
        return signature;
    }

    public void setSignature(String signature) {
        this.signature = signature;
    }

    public String getMessageCourt() {
        return messageCourt;
    }

    public void setMessageCourt(String messageCourt) {
        this.messageCourt = messageCourt;
    }

    public int getOccurrences() {
        return occurrences;
    }

    public void setOccurrences(int occurrences) {
        this.occurrences = occurrences;
    }

    public String getUtilisateur() {
        return utilisateur;
    }

    public void setUtilisateur(String utilisateur) {
        this.utilisateur = utilisateur;
    }

    public String getUrlOuEcran() {
        return urlOuEcran;
    }

    public void setUrlOuEcran(String urlOuEcran) {
        this.urlOuEcran = urlOuEcran;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }

    public String getLogRef() {
        return logRef;
    }

    public void setLogRef(String logRef) {
        this.logRef = logRef;
    }

    public String getTicketId() {
        return ticketId;
    }

    public void setTicketId(String ticketId) {
        this.ticketId = ticketId;
    }

}
