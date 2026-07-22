/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import dal.ApplicationEvent;
import dal.TUser;
import java.util.List;
import java.util.Map;
import javax.ejb.Local;
import rest.service.dto.SupportEventDTO;

/**
 * Journal des evenements applicatifs du Centre de Support : capture, deduplication par signature, creation automatique
 * de tickets, sante application et purge.
 *
 * @author koben
 */
@Local
public interface SupportEventService {

    void record(SupportEventDTO dto, String utilisateur);

    /**
     * Enregistre l'etat COURANT d'un controle de coherence : un seul evenement par controle, rafraichi a chaque passage
     * (nombre de cas, echantillon, fichier log). Si {@code nbCas <= 0}, l'evenement et son log sont supprimes (anomalie
     * resolue).
     */
    void recordCoherence(String code, String libelle, String module, int nbCas, String payloadSample,
            String listeComplete);

    List<ApplicationEvent> findAll(int start, int limit, String niveau);

    long count(String niveau);

    String createTicketFromEvent(String eventId, TUser user);

    Map<String, Object> sante();

    int purgeOldEvents();
}
