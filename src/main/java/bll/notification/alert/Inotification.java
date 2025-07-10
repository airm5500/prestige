/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package bll.notification.alert;

import java.io.Serializable;
import java.util.List;

/**
 *
 * @author DELL
 */
public interface Inotification {

    boolean isValide(Serializable OTS);

    // boolean send(List<String> List, TSmsNotSend OTSmsNotSend);

    public boolean send(Serializable OTSms);

    public boolean send();

    public void PersisteMaster(String Message);

    public void RemoveMaster(String ID_SMS);

    public void PersisteContactInscription(Serializable OTInscriptions, Serializable OTSms);

    public void RemoveContactInscription(Serializable OTInscriptions, Serializable OTSms);

    public void ConfirmContactInscription(Serializable OTSms);

    public void BuildAndsend(Serializable OTSms);
}
