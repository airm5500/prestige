/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import dal.SupportTicket;
import dal.SupportTicketMessage;
import dal.TUser;
import java.util.List;
import javax.ejb.Local;

/**
 * Gestion des tickets du Centre de Support : cycle de vie, conversation et historisation des changements de statut.
 *
 * @author koben
 */
@Local
public interface SupportTicketService {

    SupportTicket createTicket(TUser user, String sujet, String description, String module, String type,
            String priorite);

    SupportTicket createAutoTicket(String sujet, String description, String module, String priorite,
            String eventSignature, String applicationEventId);

    SupportTicket findOpenBySignature(String signature);

    SupportTicket changeStatut(String ticketId, String statut, String auteur);

    SupportTicketMessage addMessage(String ticketId, String message, String auteur, String direction);

    List<SupportTicketMessage> findMessages(String ticketId);

    List<SupportTicket> findAll(int start, int limit, String statut);

    long count(String statut);

    long countOpen();
}
