/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package dal;

import dal.enumeration.Statut;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;
import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.NamedQueries;
import javax.persistence.NamedQuery;
import javax.persistence.Table;

/**
 *
 * @author koben
 */
@Entity
@Table(name = "notification_client")
@NamedQueries({
        @NamedQuery(name = "NotificationClient.findByNotificationId", query = "SELECT o FROM NotificationClient o WHERE o.notification.id=:notificationId")

})
public class NotificationClient implements Serializable {

    private static final long serialVersionUID = 1L;
    @Id
    @Basic(optional = false)
    @Column(name = "id", nullable = false)
    private String id = UUID.randomUUID().toString();
    @JoinColumn(name = "client_id", referencedColumnName = "lg_CLIENT_ID")
    @ManyToOne
    private TClient client;
    @JoinColumn(name = "notification_id", referencedColumnName = "id")
    @ManyToOne
    private Notification notification;
    @Column(name = "statut")
    @Enumerated(EnumType.STRING)
    private Statut statut = Statut.NOT_SEND;
    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    public Statut getStatut() {
        return statut;
    }

    public void setStatut(Statut statut) {
        this.statut = statut;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }

    public TClient getClient() {
        return client;
    }

    public NotificationClient addClient(TClient client) {
        this.client = client;
        return this;
    }

    public void setClient(TClient client) {
        this.client = client;
    }

    public NotificationClient() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Notification getNotification() {
        return notification;
    }

    public void setNotification(Notification notification) {
        this.notification = notification;
    }

    public NotificationClient(TClient client, Notification notification) {
        this.client = client;
        this.notification = notification;
    }

    @Override
    public int hashCode() {
        int hash = 3;
        hash = 29 * hash + Objects.hashCode(this.id);
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
        final NotificationClient other = (NotificationClient) obj;
        if (!Objects.equals(this.id, other.id)) {
            return false;
        }
        return true;
    }

}
