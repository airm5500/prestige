/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service;

import commonTasks.dto.NotificationDTO;
import dal.CategorieNotification;
import dal.Notification;
import dal.TClient;
import dal.TUser;
import dal.enumeration.Canal;
import dal.enumeration.Statut;
import dal.enumeration.TypeNotification;
import java.util.Map;
import javax.ejb.Local;
import org.json.JSONObject;
import rest.service.v2.dto.ActiviteParam;

/**
 *
 * @author koben
 */
@Local
public interface NotificationService {

    JSONObject findAll(String typeNotification, Canal canal, Statut statut, String dtStart, String dtEnd, int start,
            int limit);

    void save(Notification notification);

    void save(Notification notification, TClient client);

    Notification buildNotification(NotificationDTO notification, TUser user);

    String buildDonnees(Map<String, Object> donneesMap);

    CategorieNotification getOneByName(TypeNotification typeNotification);

    void sendMail();

    void sendMail(Notification notification);

    void sendSms(Notification notification);

    void sendPointActivite(ActiviteParam activiteParam);

}
