/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import dal.SupportDemande;
import dal.TOfficine;
import dal.TParameters;
import dal.TUser;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Asynchronous;
import javax.annotation.security.PermitAll;
import javax.ejb.Stateless;
import javax.mail.Address;
import javax.mail.Message;
import javax.mail.Multipart;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeBodyPart;
import javax.mail.internet.MimeMessage;
import javax.mail.internet.MimeMultipart;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.servlet.http.Part;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportService;
import util.AppParameters;
import util.Constant;

/**
 *
 * @author koben
 */
@PermitAll
@Stateless
public class SupportServiceImpl implements SupportService {

    private static final Logger LOG = Logger.getLogger(SupportServiceImpl.class.getName());

    private static final String KEY_SUPPORT_EMAIL = "SUPPORT_EMAIL";
    private static final String KEY_SUPPORT_STORAGE_DIR = "SUPPORT_STORAGE_DIR";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public SupportDemande createDemande(TUser user, String objet, String message, String moduleConcerne, String urgence,
            List<Part> attachments) {
        SupportDemande demande = new SupportDemande();
        demande.setObjet(StringUtils.abbreviate(objet, 255));
        demande.setMessage(StringUtils.abbreviate(message, 4000));
        demande.setModuleConcerne(StringUtils.abbreviate(moduleConcerne, 100));
        demande.setUrgence(StringUtils.isNotBlank(urgence) ? urgence : "MOYENNE");
        demande.setStatutEnvoi(SupportDemande.STATUT_ENVOI_EN_COURS);
        if (user != null) {
            demande.setCreePar(StringUtils.abbreviate(StringUtils.trimToEmpty(user.getStrFIRSTNAME()) + " "
                    + StringUtils.trimToEmpty(user.getStrLASTNAME()) + " (" + user.getStrLOGIN() + ")", 255));
        }
        TOfficine officine = em.find(TOfficine.class, Constant.OFFICINE);
        if (officine != null) {
            demande.setNomOfficine(StringUtils.abbreviate(officine.getStrNOMCOMPLET(), 255));
            demande.setTelephone(StringUtils.abbreviate(officine.getStrPHONE(), 30));
        }
        demande.setEmailOfficine(StringUtils.abbreviate(AppParameters.getInstance().mailOfficine, 255));
        demande.setPiecesJointes(saveAttachments(demande.getId(), attachments));
        em.persist(demande);
        return demande;
    }

    @Asynchronous
    @Override
    public void sendDemandeEmail(String demandeId) {
        SupportDemande demande = em.find(SupportDemande.class, demandeId);
        if (demande == null) {
            return;
        }
        String supportEmail = getParameterValue(KEY_SUPPORT_EMAIL);
        if (StringUtils.isBlank(supportEmail)) {
            demande.setStatutEnvoi(SupportDemande.STATUT_ENVOI_ECHOUEE);
            demande.setErreurEnvoi("Adresse e-mail du support non configurée (paramètre SUPPORT_EMAIL)");
            return;
        }
        try {
            AppParameters sp = AppParameters.getInstance();
            Session session = Session.getInstance(rest.service.notification.template.Mail.getEmailProperties());
            MimeMessage msg = new MimeMessage(session);
            msg.setFrom(new InternetAddress(sp.email));
            msg.setRecipients(Message.RecipientType.TO, buildRecipients(supportEmail));
            msg.setSubject("[Support Prestige][" + demande.getUrgence() + "] " + demande.getObjet(), "UTF-8");

            Multipart multipart = new MimeMultipart();
            MimeBodyPart body = new MimeBodyPart();
            body.setContent(buildHtmlContent(demande), "text/html; charset=utf-8");
            multipart.addBodyPart(body);
            for (File file : getAttachmentFiles(demande)) {
                MimeBodyPart attachment = new MimeBodyPart();
                attachment.attachFile(file);
                multipart.addBodyPart(attachment);
            }
            msg.setContent(multipart);
            Transport.send(msg, sp.email, sp.password);
            demande.setStatutEnvoi(SupportDemande.STATUT_ENVOI_ENVOYEE);
            demande.setErreurEnvoi(null);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "sendDemandeEmail", e);
            demande.setStatutEnvoi(SupportDemande.STATUT_ENVOI_ECHOUEE);
            demande.setErreurEnvoi(StringUtils.abbreviate(e.getMessage(), 1000));
        }
    }

    @Override
    public List<SupportDemande> findAll(int start, int limit) {
        return em.createQuery("SELECT o FROM SupportDemande o ORDER BY o.createdAt DESC", SupportDemande.class)
                .setFirstResult(start).setMaxResults(limit > 0 ? limit : 20).getResultList();
    }

    @Override
    public long count() {
        return em.createQuery("SELECT COUNT(o) FROM SupportDemande o", Long.class).getSingleResult();
    }

    private Address[] buildRecipients(String supportEmail) throws Exception {
        List<Address> recipients = new ArrayList<>();
        for (String email : supportEmail.split(";")) {
            if (StringUtils.isNotBlank(email)) {
                recipients.add(new InternetAddress(email.trim()));
            }
        }
        return recipients.toArray(new Address[0]);
    }

    private String saveAttachments(String demandeId, List<Part> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return null;
        }
        List<String> saved = new ArrayList<>();
        Path dir = getStorageDir();
        int index = 0;
        for (Part part : attachments) {
            String fileName = part.getSubmittedFileName();
            if (StringUtils.isBlank(fileName) || part.getSize() <= 0) {
                continue;
            }
            String safeName = StringUtils.abbreviate(fileName.replaceAll("[^a-zA-Z0-9._-]", "_"), 100);
            Path target = dir.resolve(demandeId + "_" + (index++) + "_" + safeName);
            try (InputStream in = part.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
                saved.add(target.toString());
            } catch (IOException e) {
                // La sauvegarde d'une piece jointe ne doit jamais bloquer la demande
                LOG.log(Level.SEVERE, "saveAttachments", e);
            }
        }
        return saved.isEmpty() ? null : StringUtils.abbreviate(String.join(";", saved), 2000);
    }

    private List<File> getAttachmentFiles(SupportDemande demande) {
        List<File> files = new ArrayList<>();
        if (StringUtils.isBlank(demande.getPiecesJointes())) {
            return files;
        }
        for (String path : demande.getPiecesJointes().split(";")) {
            File file = new File(path);
            if (file.exists() && file.isFile()) {
                files.add(file);
            }
        }
        return files;
    }

    private Path getStorageDir() {
        String configured = getParameterValue(KEY_SUPPORT_STORAGE_DIR);
        Path base;
        if (StringUtils.isNotBlank(configured)) {
            base = Paths.get(configured.trim());
        } else {
            base = Paths.get(System.getProperty("user.home"), "prestige-support");
        }
        Path dir = base.resolve("pieces-jointes");
        LocalDate now = LocalDate.now();
        dir = dir.resolve(String.valueOf(now.getYear())).resolve(String.format("%02d", now.getMonthValue()));
        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            LOG.log(Level.SEVERE, "getStorageDir", e);
        }
        return dir;
    }

    private String getParameterValue(String key) {
        try {
            TParameters parameter = em.find(TParameters.class, key);
            return parameter != null ? parameter.getStrVALUE() : null;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "getParameterValue", e);
            return null;
        }
    }

    private String buildHtmlContent(SupportDemande demande) {
        StringBuilder sb = new StringBuilder();
        sb.append("<html><body>");
        sb.append("<h3>Nouvelle demande de support Prestige</h3>");
        sb.append("<table border='1' cellpadding='6' cellspacing='0'>");
        appendRow(sb, "Officine", demande.getNomOfficine());
        appendRow(sb, "Téléphone", demande.getTelephone());
        appendRow(sb, "E-mail officine", demande.getEmailOfficine());
        appendRow(sb, "Utilisateur", demande.getCreePar());
        appendRow(sb, "Module concerné", demande.getModuleConcerne());
        appendRow(sb, "Urgence", demande.getUrgence());
        appendRow(sb, "Objet", demande.getObjet());
        appendRow(sb, "Référence", demande.getId());
        sb.append("</table>");
        sb.append("<h4>Message</h4>");
        sb.append("<p>").append(escapeHtml(demande.getMessage()).replace("\n", "<br/>")).append("</p>");
        sb.append("</body></html>");
        return sb.toString();
    }

    private void appendRow(StringBuilder sb, String label, String value) {
        sb.append("<tr><td><b>").append(label).append("</b></td><td>").append(escapeHtml(value)).append("</td></tr>");
    }

    private String escapeHtml(String value) {
        if (StringUtils.isBlank(value)) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
