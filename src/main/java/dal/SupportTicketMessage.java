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
 * Message de la conversation d'un ticket support. Les changements de statut sont historises sous forme de messages
 * SYSTEME.
 *
 * @author koben
 */
@Entity
@Table(name = "t_support_ticket_message")
@NamedQueries({
        @NamedQuery(name = "SupportTicketMessage.all", query = "SELECT o FROM SupportTicketMessage o ORDER BY o.createdAt ASC"),
        @NamedQuery(name = "SupportTicketMessage.findByTicket", query = "SELECT o FROM SupportTicketMessage o WHERE o.ticketId = :ticketId ORDER BY o.createdAt ASC") })
public class SupportTicketMessage extends AbstractEntity {

    private static final long serialVersionUID = 1L;

    public static final String DIRECTION_OFFICINE = "OFFICINE";
    public static final String DIRECTION_SUPPORT = "SUPPORT";
    public static final String DIRECTION_SYSTEME = "SYSTEME";

    @NotNull
    @Column(name = "ticket_id", nullable = false, length = 50)
    private String ticketId;
    @Column(name = "auteur")
    private String auteur;
    @NotNull
    @Column(name = "direction", nullable = false, length = 20)
    private String direction = DIRECTION_OFFICINE;
    @NotNull
    @Column(name = "message", nullable = false, length = 4000)
    private String message;
    @Column(name = "pieces_jointes", length = 2000)
    private String piecesJointes;

    public String getTicketId() {
        return ticketId;
    }

    public void setTicketId(String ticketId) {
        this.ticketId = ticketId;
    }

    public String getAuteur() {
        return auteur;
    }

    public void setAuteur(String auteur) {
        this.auteur = auteur;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getPiecesJointes() {
        return piecesJointes;
    }

    public void setPiecesJointes(String piecesJointes) {
        this.piecesJointes = piecesJointes;
    }

}
