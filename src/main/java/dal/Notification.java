/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import dal.enumeration.Statut;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "notification", indexes = { @Index(name = "notificationStatut", columnList = "statut") })
@NamedQueries({
        @NamedQuery(name = "Notification.findAllByCreatedAtAndStatus", query = "SELECT o FROM Notification o WHERE o.createdAt >= :createdAt AND o.statut=:statut "),
        @NamedQuery(name = "Notification.findAllByStatus", query = "SELECT o FROM Notification o LEFT JOIN FETCH o.notificationClients WHERE  o.statut=:statut "),
        @NamedQuery(name = "Notification.findAllByStatusAndCanal", query = "SELECT o FROM Notification o LEFT JOIN FETCH o.notificationClients WHERE  o.statut=:statut AND o.categorieNotification.canal IN :canaux"),
        @NamedQuery(name = "Notification.findAllByCreatedAtAndStatusAndCanal", query = "SELECT o FROM Notification o WHERE o.createdAt >= :createdAt AND  o.statut=:statut AND o.categorieNotification.canal =:canal"),
        @NamedQuery(name = "Notification.findAllByCreatedAtAndStatusAndCanaux", query = "SELECT o FROM Notification o WHERE o.createdAt >= :createdAt AND  o.statut IN :statut AND o.categorieNotification.canal IN :canaux")

})
public class Notification implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false)
    private String id = UUID.randomUUID().toString();

    @Column(name = "message", length = 3000)
    private String message;
    @NotNull
    @Column(name = "statut")
    @Enumerated(EnumType.STRING)
    private Statut statut = Statut.NOT_SEND;

    @NotNull
    @ManyToOne(optional = false)
    @JoinColumn(name = "type_notification", referencedColumnName = "id")
    private CategorieNotification categorieNotification;
    @NotNull
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    @NotNull
    @Column(name = "modfied_at", nullable = false)
    private LocalDateTime modfiedAt = LocalDateTime.now();
    @NotNull
    @JoinColumn(name = "user_id", referencedColumnName = "lg_USER_ID", nullable = false)
    @ManyToOne
    private TUser user;
    @JoinColumn(name = "user_to", referencedColumnName = "lg_USER_ID")
    @ManyToOne
    private TUser userTo;
    @OneToMany(cascade = { CascadeType.REMOVE, CascadeType.PERSIST, CascadeType.MERGE }, mappedBy = "notification")
    private Collection<NotificationClient> notificationClients = new ArrayList<>();
    @Column(name = "number_attempt", nullable = false)
    private int numberAttempt = 0;
    @Column(name = "entity_ref")
    private String entityRef;
    @Column(name = "donnees", length = 3000)
    private String donnees;

    public String getDonnees() {
        return donnees;
    }

    public Notification donnees(String donnees) {
        this.donnees = donnees;
        return this;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getMessage() {
        return message;
    }

    public Notification message(String message) {
        this.message = message;
        return this;
    }

    public Notification statut(Statut statut) {
        this.statut = statut;
        return this;
    }

    public String getEntityRef() {
        return entityRef;
    }

    public Notification entityRef(String entityRef) {
        this.entityRef = entityRef;
        return this;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Statut getStatut() {
        return statut;
    }

    public void setStatut(Statut statut) {
        this.statut = statut;
    }

    public CategorieNotification getCategorieNotification() {
        return categorieNotification;
    }

    public Notification setCategorieNotification(CategorieNotification categorieNotification) {
        this.categorieNotification = categorieNotification;
        return this;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getModfiedAt() {
        return modfiedAt;
    }

    public void setModfiedAt(LocalDateTime modfiedAt) {
        this.modfiedAt = modfiedAt;
    }

    public TUser getUser() {
        return user;
    }

    public Notification addUser(TUser user) {
        this.user = user;
        return this;
    }

    public void setUser(TUser user) {
        this.user = user;
    }

    public TUser getUserTo() {
        return userTo;
    }

    public Notification addUserTo(TUser userTo) {
        this.userTo = userTo;
        return this;
    }

    public void setUserTo(TUser userTo) {
        this.userTo = userTo;
    }

    @Override
    public int hashCode() {
        int hash = 3;
        hash = 13 * hash + Objects.hashCode(this.id);
        return hash;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (obj == null) {
            return false;
        }
        if (getClass() != obj.getClass()) {
            return false;
        }
        final Notification other = (Notification) obj;
        if (!Objects.equals(this.id, other.id)) {
            return false;
        }
        return true;
    }

    public Notification() {
    }

    public Collection<NotificationClient> getNotificationClients() {
        return notificationClients;
    }

    public void setNotificationClients(Collection<NotificationClient> notificationClients) {
        this.notificationClients = notificationClients;
    }

    public Notification addNotificationClients(NotificationClient notificationClient) {
        if (Objects.nonNull(notificationClient)) {
            notificationClient.setNotification(this);
            this.getNotificationClients().add(notificationClient);
        }

        return this;

    }

    public int getNumberAttempt() {
        return numberAttempt;
    }

    public void setNumberAttempt(int numberAttempt) {
        this.numberAttempt = numberAttempt;
    }

    public Notification numberAttempt(int numberAttempt) {
        this.numberAttempt = numberAttempt;
        return this;
    }
}
