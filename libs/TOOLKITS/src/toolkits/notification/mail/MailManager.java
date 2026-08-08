/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package toolkits.notification.mail;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import javax.activation.DataHandler;
import javax.activation.DataSource;
import javax.activation.FileDataSource;
import javax.mail.BodyPart;
import javax.mail.Message;
import javax.mail.Multipart;
import javax.mail.SendFailedException;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import toolkits.filesmanagers.FilesType.files;
import toolkits.notification.mail.entity.FileAttachment;
import toolkits.parameters.commonparameter;
import toolkits.utils.StringUtils;
import toolkits.utils.jdom;
import toolkits.utils.logger;

/**
 *
 * @author INFOTRONIQUE
 */
public class MailManager {

    private String emailSubjectTxt;

    public MailManager() {
        jdom.InitRessource();
        jdom.LoadRessource();
    }

    public boolean buildandsend(String OemailSubjectTxt, List<String> lstAdresse, List<FileAttachment> lstFileToAchement) {
        new logger().OCategory.info("Begin Sent mail to " + lstAdresse + " File attach (" + lstFileToAchement.size() + ")");
        this.emailSubjectTxt = OemailSubjectTxt;
        return this.sendMail(lstAdresse, lstFileToAchement);
    }

    public boolean sendMail(List<String> lstAdresse, List<FileAttachment> lstFileToAchement) {
        try {
            String host = jdom.smtp_server;// "smtp.gmail.com";
            String Password = jdom.mail_password;
            String from = jdom.mail_account;
            Properties props = System.getProperties();
            props.put("mail.smtp.host", host);
            props.put("mail.smtps.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            Session session = Session.getInstance(props, null);
            MimeMessage message = new MimeMessage(session);
            InternetAddress[] addressTo = new InternetAddress[lstAdresse.size()];
            for (int i = 0; i < lstAdresse.size(); i++) {
                addressTo[i] = new InternetAddress(lstAdresse.get(i));
            }
            message.setRecipients(Message.RecipientType.TO, addressTo);
            message.setFrom(new InternetAddress(from));
            message.setSubject(emailSubjectTxt);
            Multipart multipart = new MimeMultipart();
            for (int i = 0; i < lstFileToAchement.size(); i++) {
                String filename = lstFileToAchement.get(i).getFileName();
                BodyPart messageBodyPart = new MimeBodyPart();
                messageBodyPart.setText(lstFileToAchement.get(i).getSubject());
                multipart.addBodyPart(messageBodyPart);
                messageBodyPart = new MimeBodyPart();
                DataSource source = new FileDataSource(filename);
                messageBodyPart.setDataHandler(new DataHandler(source));
                messageBodyPart.setFileName(filename);
                multipart.addBodyPart(messageBodyPart);
            }
            message.setContent(multipart);
            try {
                Transport tr = session.getTransport("smtps");
                tr.connect(host, from, Password);
                tr.sendMessage(message, message.getAllRecipients());
                System.out.println("Mail Sent Successfully");
                tr.close();
                return true;
            } catch (SendFailedException sfe) {
                System.out.println(sfe);
                return false;
            }

        } catch (Exception ex) {
            ex.printStackTrace();
            System.out.println("Exception " + ex);
            return false;
        }

    }

    public boolean BuildMail(String ObjectMail,String mail_customer) {

        files Ofiles = new files();

        List<String> lstAdresse = new ArrayList<String>();

        String[] partstrMail = StringUtils.split(mail_customer, commonparameter.SEPARATEUR_POINT_VIRGULE);

        for (int i = 0; i < partstrMail.length; i++) {
            lstAdresse.add(partstrMail[i]);
        }

        List<File> lst = Ofiles.loadDirectoryAll(jdom.scr_report_pdf + "IN/");
        List<FileAttachment> lstFileToAchement = new ArrayList<>();

        for (int i = 0; i < lst.size(); i++) {
            lstFileToAchement.add(new FileAttachment(lst.get(i).getAbsolutePath(), "Le report pdf" + lst.get(i).getName()));

        }
        return this.buildandsend(ObjectMail, lstAdresse, lstFileToAchement);

    }

}
