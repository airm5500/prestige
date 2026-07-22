/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import dal.SupportTicket;
import dal.SupportTicketMessage;
import dal.TOfficine;
import dal.TUser;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import javax.annotation.security.PermitAll;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportBusinessException;
import rest.service.SupportTicketService;
import util.Constant;

/**
 *
 * @author koben
 */
@PermitAll
@Stateless
public class SupportTicketServiceImpl implements SupportTicketService {

    private static final List<String> STATUTS_VALIDES = Arrays.asList(SupportTicket.STATUT_NOUVEAU,
            SupportTicket.STATUT_OUVERT, SupportTicket.STATUT_AFFECTE, SupportTicket.STATUT_EN_COURS,
            SupportTicket.STATUT_EN_ATTENTE_CLIENT, SupportTicket.STATUT_RESOLU, SupportTicket.STATUT_CLOTURE,
            SupportTicket.STATUT_ANNULE);

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public SupportTicket createTicket(TUser user, String sujet, String description, String module, String type,
            String priorite) {
        SupportTicket ticket = buildTicket(sujet, description, module, StringUtils.isNotBlank(type) ? type : "INCIDENT",
                priorite);
        if (user != null) {
            ticket.setUtilisateur(StringUtils.abbreviate(StringUtils.trimToEmpty(user.getStrFIRSTNAME()) + " "
                    + StringUtils.trimToEmpty(user.getStrLASTNAME()) + " (" + user.getStrLOGIN() + ")", 255));
        }
        em.persist(ticket);
        addSystemMessage(ticket.getId(), "Ticket créé par " + ticket.getUtilisateur());
        return ticket;
    }

    @Override
    public SupportTicket createAutoTicket(String sujet, String description, String module, String priorite,
            String eventSignature, String applicationEventId) {
        SupportTicket ticket = buildTicket(sujet, description, module, "BUG_AUTO", priorite);
        ticket.setUtilisateur("SYSTEME");
        ticket.setEventSignature(eventSignature);
        ticket.setApplicationEventId(applicationEventId);
        em.persist(ticket);
        addSystemMessage(ticket.getId(), "Ticket créé automatiquement depuis un événement applicatif capturé");
        return ticket;
    }

    @Override
    public SupportTicket findOpenBySignature(String signature) {
        if (StringUtils.isBlank(signature)) {
            return null;
        }
        List<SupportTicket> tickets = em.createNamedQuery("SupportTicket.findOpenBySignature", SupportTicket.class)
                .setParameter("signature", signature).setMaxResults(1).getResultList();
        return tickets.isEmpty() ? null : tickets.get(0);
    }

    @Override
    public SupportTicket changeStatut(String ticketId, String statut, String auteur) {
        SupportTicket ticket = em.find(SupportTicket.class, ticketId);
        if (ticket == null) {
            throw new SupportBusinessException("Ticket introuvable");
        }
        String nouveau = StringUtils.upperCase(StringUtils.trimToEmpty(statut), Locale.FRENCH);
        if (!STATUTS_VALIDES.contains(nouveau)) {
            throw new SupportBusinessException("Statut invalide : " + statut);
        }
        if (nouveau.equals(ticket.getStatutTicket())) {
            return ticket;
        }
        String ancien = ticket.getStatutTicket();
        ticket.setStatutTicket(nouveau);
        addSystemMessage(ticketId, "Statut changé de " + ancien + " à " + nouveau + " par " + auteur);
        return ticket;
    }

    @Override
    public SupportTicketMessage addMessage(String ticketId, String message, String auteur, String direction) {
        SupportTicket ticket = em.find(SupportTicket.class, ticketId);
        if (ticket == null) {
            throw new SupportBusinessException("Ticket introuvable");
        }
        SupportTicketMessage ticketMessage = new SupportTicketMessage();
        ticketMessage.setTicketId(ticketId);
        ticketMessage.setMessage(StringUtils.abbreviate(message, 4000));
        ticketMessage.setAuteur(StringUtils.abbreviate(auteur, 255));
        ticketMessage
                .setDirection(StringUtils.isNotBlank(direction) ? direction : SupportTicketMessage.DIRECTION_OFFICINE);
        em.persist(ticketMessage);
        // met a jour la date de derniere modification du ticket
        ticket.setModifiedAt(LocalDateTime.now());
        return ticketMessage;
    }

    @Override
    public List<SupportTicketMessage> findMessages(String ticketId) {
        return em.createNamedQuery("SupportTicketMessage.findByTicket", SupportTicketMessage.class)
                .setParameter("ticketId", ticketId).getResultList();
    }

    @Override
    public List<SupportTicket> findAll(int start, int limit, String statut) {
        TypedQuery<SupportTicket> query;
        if (StringUtils.isNotBlank(statut)) {
            query = em.createQuery(
                    "SELECT o FROM SupportTicket o WHERE o.statutTicket = :statut ORDER BY o.createdAt DESC",
                    SupportTicket.class).setParameter("statut", statut);
        } else {
            query = em.createQuery("SELECT o FROM SupportTicket o ORDER BY o.createdAt DESC", SupportTicket.class);
        }
        return query.setFirstResult(start).setMaxResults(limit > 0 ? limit : 20).getResultList();
    }

    @Override
    public long count(String statut) {
        if (StringUtils.isNotBlank(statut)) {
            return em.createQuery("SELECT COUNT(o) FROM SupportTicket o WHERE o.statutTicket = :statut", Long.class)
                    .setParameter("statut", statut).getSingleResult();
        }
        return em.createQuery("SELECT COUNT(o) FROM SupportTicket o", Long.class).getSingleResult();
    }

    @Override
    public long countOpen() {
        return em.createQuery(
                "SELECT COUNT(o) FROM SupportTicket o WHERE o.statutTicket NOT IN ('RESOLU','CLOTURE','ANNULE')",
                Long.class).getSingleResult();
    }

    private SupportTicket buildTicket(String sujet, String description, String module, String type, String priorite) {
        SupportTicket ticket = new SupportTicket();
        ticket.setNumero("TCK-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-"
                + ticket.getId().substring(0, 8).toUpperCase());
        ticket.setSujet(StringUtils.abbreviate(sujet, 255));
        ticket.setDescription(StringUtils.abbreviate(description, 4000));
        ticket.setModule(StringUtils.abbreviate(module, 100));
        ticket.setType(StringUtils.abbreviate(type, 50));
        ticket.setPriorite(StringUtils.isNotBlank(priorite) ? priorite : "MOYENNE");
        ticket.setStatutTicket(SupportTicket.STATUT_NOUVEAU);
        TOfficine officine = em.find(TOfficine.class, Constant.OFFICINE);
        if (officine != null) {
            ticket.setOfficine(StringUtils.abbreviate(officine.getStrNOMCOMPLET(), 255));
        }
        return ticket;
    }

    private void addSystemMessage(String ticketId, String message) {
        SupportTicketMessage systemMessage = new SupportTicketMessage();
        systemMessage.setTicketId(ticketId);
        systemMessage.setMessage(StringUtils.abbreviate(message, 4000));
        systemMessage.setAuteur("SYSTEME");
        systemMessage.setDirection(SupportTicketMessage.DIRECTION_SYSTEME);
        em.persist(systemMessage);
    }
}
