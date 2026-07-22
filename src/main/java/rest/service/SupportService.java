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

    List<SupportDemande> findAll(int start, int limit);

    long count();
}
