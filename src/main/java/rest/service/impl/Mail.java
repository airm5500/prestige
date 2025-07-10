/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.mail.Address;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import org.apache.commons.lang3.StringUtils;
import util.AppParameters;

/**
 *
 * @author koben
 */
public class Mail implements Runnable {

    private static final Logger LOG = Logger.getLogger(Mail.class.getName());

    private String message;
    private String receiverAddres;
    private String subject;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getReceiverAddres() {
        return receiverAddres;
    }

    public void setReceiverAddres(String receiverAddres) {
        this.receiverAddres = receiverAddres;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    @Override
    public void run() {
        sendMail();
    }

    public void sendMail() {
        AppParameters sp = AppParameters.getInstance();
        Properties props = new Properties();
        props.put("mail.smtp.host", sp.smtpHost);
        props.put("mail.transport.protocol", sp.protocol);
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.port", "25");
        props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
        Session session = Session.getInstance(props);
        MimeMessage msg = new MimeMessage(session);

        try {
            String email = getReceiverAddres();
            if (StringUtils.isEmpty(email)) {
                email = sp.mailOfficine;
            }
            Address sender = new InternetAddress(sp.email);
            Address recipient = new InternetAddress(email);
            msg.setText(getMessage());

            msg.setFrom(sender);
            msg.setRecipient(Message.RecipientType.TO, recipient);
            msg.setSubject(getSubject());
            Transport.send(msg, sp.email, sp.password);

        } catch (MessagingException ex) {
            LOG.log(Level.SEVERE, "sendMail", ex);
        }
    }
}
