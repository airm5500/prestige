/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package commonTasks.dto;

import dal.NotificationClient;
import dal.TClient;
import java.io.Serializable;

/**
 *
 * @author koben
 */
public class NotificationClientDTO implements Serializable {

    private static final long serialVersionUID = 1L;
    private String fullName;
    private String clientPhone;
    private String clientEmail;
    private String firstName;
    private String lastName;
    private String email;
    private String userId;
    private String clientId;

    public String getFullName() {
        return fullName;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getClientPhone() {
        return clientPhone;
    }

    public void setClientPhone(String clientPhone) {
        this.clientPhone = clientPhone;
    }

    public String getClientEmail() {
        return clientEmail;
    }

    public void setClientEmail(String clientEmail) {
        this.clientEmail = clientEmail;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public NotificationClientDTO() {
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public NotificationClientDTO(NotificationClient notificationClient) {
        TClient client = notificationClient.getClient();
        this.email = client.getEmail();
        this.clientPhone = client.getStrADRESSE();
        this.lastName = client.getStrLASTNAME();
        this.firstName = client.getStrFIRSTNAME();
        this.clientId = client.getLgCLIENTID();
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

}
