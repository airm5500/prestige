/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import dal.SupportDemande;
import dal.TUser;
import java.util.List;
import javax.ejb.Local;
import javax.servlet.http.Part;

/**
 * Service du Centre de Support (Lot 1 : demandes "Me contacter").
 *
 * @author koben
 */
@Local
public interface SupportService {

    SupportDemande createDemande(TUser user, String objet, String message, String moduleConcerne, String urgence,
            List<Part> attachments);

    void sendDemandeEmail(String demandeId);

    /**
     * Notifie le support par e-mail lors de la creation d'un ticket automatique (incident critique). Asynchrone et sans
     * effet si le parametre SUPPORT_NOTIFY_ENABLED est a 0 ou SUPPORT_EMAIL non renseigne.
     */
    void notifyAutoTicket(String numero, String sujet, String module, String priorite, String description);

    List<SupportDemande> findAll(int start, int limit);

    /** Toutes les demandes, sans pagination : pour l'export Excel (point 2). */
    List<SupportDemande> toutes();

    long count();
}
