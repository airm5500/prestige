/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package job;

import dal.Notification;
import dal.NotificationClient;
import dal.SmsToken;
import dal.StockDailyValue;
import dal.TParameters;
import dal.enumeration.Canal;
import dal.enumeration.Statut;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.ejb.EJBException;
import javax.ejb.ScheduleExpression;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.ejb.Timeout;
import javax.ejb.Timer;
import javax.ejb.TimerConfig;
import javax.ejb.TimerService;
import javax.ejb.TransactionManagement;
import javax.ejb.TransactionManagementType;
import javax.enterprise.concurrent.ManagedExecutorService;
import javax.inject.Inject;
import javax.mail.Address;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import javax.persistence.TypedQuery;
import javax.sql.DataSource;
import javax.transaction.HeuristicMixedException;
import javax.transaction.HeuristicRollbackException;
import javax.transaction.NotSupportedException;
import javax.transaction.RollbackException;
import javax.transaction.SystemException;
import javax.transaction.UserTransaction;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.Entity;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.MultivaluedHashMap;
import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.core.Response;
import org.apache.commons.lang3.StringUtils;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.NotificationService;
import util.Constant;
import util.AppParameters;

/**
 *
 * @author Kobena
 */
@Singleton
@Startup
@TransactionManagement(value = TransactionManagementType.BEAN)
public class DatabaseToolkit {

    private static final Logger LOG = Logger.getLogger(DatabaseToolkit.class.getName());
    @Resource(mappedName = "jdbc/__laborex_pool")
    private DataSource dataSource;
    @Resource(name = "concurrent/__defaultManagedExecutorService")
    ManagedExecutorService mes;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @Resource
    private TimerService timerService;
    @Inject
    private UserTransaction userTransaction;
    @EJB
    private NotificationService notificationService;

    @PostConstruct
    public void init() {
        if (dataSource == null) {
            LOG.info("no datasource found to execute the db migrations!");
            throw new EJBException("no datasource found to execute the db migrations!");
        }
        try {
            Flyway flyway = Flyway.configure().dataSource(dataSource).baselineOnMigrate(true)
                    .ignoreMissingMigrations(true).outOfOrder(true).cleanOnValidationError(true)
                    .validateOnMigrate(false).ignoreFutureMigrations(true).load();
            flyway.migrate();
        } catch (FlywayException e) {
            LOG.log(Level.SEVERE, "ini migration", e);
        }

        createTimer();
        mes.submit(this::updateStockDailyValue);

    }

    private void manageSms() {
        if (checkParameterByKey(Constant.KEY_SMS_CLOTURE_CAISSE)) {
            List<Notification> notifications = findAllByCanal();
            for (Notification notification : notifications) {
                try {
                    sendSMS(notification);
                } catch (Exception e) {
                    LOG.log(Level.SEVERE, "", e);
                }

            }

        }

    }

    private void createTimer() {

        final TimerConfig email = new TimerConfig("email", false);
        // timerService.createCalendarTimer(new ScheduleExpression().minute("*/5").hour("*").dayOfMonth("*").year("*"),
        // email);

        timerService.createCalendarTimer(new ScheduleExpression().hour(findScheduledValues()).dayOfMonth("*").year("*"),
                email);

        final TimerConfig sms = new TimerConfig("sms", false);
        timerService.createCalendarTimer(new ScheduleExpression().minute("*/2").hour("*").dayOfMonth("*").year("*"),
                sms);
    }

    private void manageEmail() {
        List<Notification> data = findByStatut(Statut.NOT_SEND).stream()
                .filter(e -> e.getNotificationClients().isEmpty()).collect(Collectors.toList());
        boolean result = sendMail(buildEmailContent(data), null, "Resumé activité prestige 2");
        if (result) {
            try {
                userTransaction.begin();
                data.stream().forEach(e -> {
                    e.setStatut(Statut.SENT);
                    e.setModfiedAt(LocalDateTime.now());
                    em.merge(e);
                });
                userTransaction.commit();
            } catch (NotSupportedException | SystemException | RollbackException | HeuristicMixedException
                    | HeuristicRollbackException | SecurityException | IllegalStateException ex) {
                LOG.log(Level.SEVERE, null, ex);
            }
        }
    }

    private void sendSMS(Notification notification) {
        Client client = ClientBuilder.newClient();
        AppParameters sp = AppParameters.getInstance();
        List<NotificationClient> toClients = findNotificationClients(notification);
        String address = null;
        if (!toClients.isEmpty()) { // a revoir pour les envois multiples
            address = toClients.get(0).getClient().getStrADRESSE();
        }
        if (StringUtils.isEmpty(address)) {
            address = sp.mobile;
        }
        JSONObject jSONObject = new JSONObject();
        JSONObject outboundSMSMessageRequest = new JSONObject();
        outboundSMSMessageRequest.put("address", "tel:+225" + address);
        outboundSMSMessageRequest.put("senderAddress", sp.senderAddress);
        JSONObject outboundSMSTextMessage = new JSONObject();
        outboundSMSTextMessage.put("message", notification.getMessage());
        outboundSMSMessageRequest.put("outboundSMSTextMessage", outboundSMSTextMessage);
        jSONObject.put("outboundSMSMessageRequest", outboundSMSMessageRequest);
        WebTarget myResource = client.target(sp.pathsmsapisendmessageurl);
        Response response = myResource.request().header("Authorization", "Bearer ".concat(getAccessToken()))
                .post(Entity.entity(jSONObject.toString(), MediaType.APPLICATION_JSON_TYPE));
        LOG.log(Level.INFO, "sendSMS >>> {0} {1} {2}",
                new Object[] { response.getStatus(), response.readEntity(String.class), address });
        if (response.getStatus() == 201) {
            notification.setStatut(Statut.SENT);

        } else {
            notification.setNumberAttempt(notification.getNumberAttempt() + 1);
            if (notification.getNumberAttempt() >= 3) {
                notification.setModfiedAt(LocalDateTime.now());
                notification.setStatut(Statut.LOCK);
            }
        }

        LOG.log(Level.INFO, null, notification.getStatut());
        try {
            userTransaction.begin();
            em.merge(notification);
            userTransaction.commit();
        } catch (NotSupportedException | SystemException | RollbackException | HeuristicMixedException
                | HeuristicRollbackException | SecurityException | IllegalStateException ex) {
            LOG.log(Level.SEVERE, null, ex);
        }

    }

    private List<Notification> findByCreatedAtAndStatut() {
        try {
            TypedQuery<Notification> q = em.createNamedQuery("Notification.findAllByCreatedAtAndStatus",
                    Notification.class);
            q.setParameter("createdAt", LocalDateTime.parse(LocalDate.now().toString() + " " + "00:00",
                    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
            q.setParameter("statut", Statut.NOT_SEND);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private List<Notification> findByStatut(Statut statut) {
        try {
            TypedQuery<Notification> q = em.createNamedQuery("Notification.findAllByStatus", Notification.class);
            q.setParameter("statut", statut);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private List<Notification> findAllByCanal() {
        try {
            TypedQuery<Notification> q = em.createNamedQuery("Notification.findAllByCreatedAtAndStatusAndCanal",
                    Notification.class);
            q.setParameter("createdAt", LocalDateTime.parse(LocalDate.now().minusDays(1).toString() + " " + "00:00",
                    DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")));
            q.setParameter("statut", Statut.NOT_SEND);
            q.setParameter("canal", Canal.SMS);
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private boolean checkParameterByKey(String key) {
        try {
            TParameters parameters = em.find(TParameters.class, key);
            return (Integer.parseInt(parameters.getStrVALUE().trim()) == 1);
        } catch (Exception e) {
            return false;
        }
    }

    private String findScheduledValues() {
        try {
            TParameters parameters = em.find(TParameters.class, Constant.KEY_HEURE_EMAIL);
            return parameters.getStrVALUE();
        } catch (Exception e) {
            return "12,20";
        }
    }

    @Timeout
    public void timeout(Timer timer) {

        if ("sms".equals(timer.getInfo())) {

            manageSms();

        } else if ("email".equals(timer.getInfo())) {

            notificationService.sendMail();
            // manageEmail();

        }
    }

    private List<NotificationClient> findNotificationClients(Notification n) {
        try {
            TypedQuery<NotificationClient> q = em.createNamedQuery("NotificationClient.findByNotificationId",
                    NotificationClient.class);
            q.setParameter("notificationId", n.getId());
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private boolean sendMail(String content, String email, String subject) {
        if (StringUtils.isEmpty(content)) {
            return false;
        }
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
            List<Address> listadd = new ArrayList<>();
            if (StringUtils.isEmpty(email)) {
                email = sp.mailOfficine;
                String[] emails = email.split(";");
                for (String email1 : emails) {
                    listadd.add(new InternetAddress(email1));
                }
            }
            Address[] recipient = new InternetAddress[listadd.size()];
            recipient = listadd.toArray(recipient);
            Address sender = new InternetAddress(sp.email);
            msg.setContent(content, "text/html; charset=utf-8");
            msg.setFrom(sender);
            msg.setRecipients(Message.RecipientType.TO, recipient);
            msg.setSubject(subject);
            Transport.send(msg, sp.email, sp.password);
            return true;
        } catch (MessagingException ex) {
            LOG.log(Level.SEVERE, null, ex);
            return false;
        }
    }

    public String buildEmailContent(List<Notification> notifications) {
        if (notifications.isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        Map<String, List<Notification>> map = notifications.stream()
                .collect(Collectors.groupingBy(e -> e.getCategorieNotification().getName()));
        sb.append("<html><body>");
        map.forEach((key, values) -> {
            sb.append("<h2 style='margin: 10px;padding: 5px;'>").append(key).append("</h2><ol>");
            values.forEach(e -> {
                sb.append("<li>").append(e.getMessage()).append("</li>");
            });
            sb.append("</ol>");
        });
        sb.append("</body></html>");
        return sb.toString();
    }

    void updateStockDailyValue() {
        try {
            LocalDate now = LocalDate.now();
            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyyMMdd");
            List<Integer> ids = List.of(Integer.valueOf(now.format(dtf)), Integer.valueOf(now.minusDays(1).format(dtf)),
                    Integer.valueOf(now.minusDays(2).format(dtf)), Integer.valueOf(now.minusDays(3).format(dtf)));
            userTransaction.begin();
            for (Integer id : ids) {
                if (!checkIsAlreadyUpdated(id)) {
                    List<Tuple> list = em.createNativeQuery(
                            "SELECT SUM(s.int_NUMBER_AVAILABLE * f.int_PRICE) AS VALEUR_VENTE,SUM(s.int_NUMBER_AVAILABLE * f.int_PAF) AS VALEUR_ACHAT from t_famille f,t_famille_stock s WHERE s.lg_FAMILLE_ID=f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID='1' AND s.int_NUMBER_AVAILABLE >0 AND f.str_STATUT='enable' ",
                            Tuple.class).getResultList();
                    Tuple t = list.get(0);
                    StockDailyValue sdv = new StockDailyValue();
                    sdv.setId(id);
                    sdv.setValeurAchat(t.get(1, BigDecimal.class).longValue());
                    sdv.setValeurVente(t.get(0, BigDecimal.class).longValue());
                    em.persist(sdv);
                }
            }
            userTransaction.commit();

        } catch (IllegalStateException | NumberFormatException | SecurityException | HeuristicMixedException
                | HeuristicRollbackException | NotSupportedException | RollbackException | SystemException e) {
            LOG.log(Level.SEVERE, null, e);
        }
    }

    boolean checkIsAlreadyUpdated(int day) {
        try {
            StockDailyValue sdv = em.find(StockDailyValue.class, day);
            return sdv != null;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return false;
        }

    }

    private SmsToken getSmsToken() {
        try {
            return em.find(SmsToken.class, "sms");

        } catch (Exception e) {
            return null;
        }
    }

    private String getAccessToken() {
        try {
            if (!em.getTransaction().isActive()) {
                userTransaction.begin();
            }
            SmsToken smsToken = getOrupdateSmsToken();
            userTransaction.commit();
            return Objects.nonNull(smsToken) ? smsToken.getAccessToken() : null;
        } catch (IllegalStateException | SecurityException | HeuristicMixedException | HeuristicRollbackException
                | NotSupportedException | RollbackException | SystemException e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    private SmsToken getOrupdateSmsToken() {
        SmsToken smsToken = getSmsToken();
        if (smsToken == null) {
            JSONObject json = findAccessToken();
            if (json.has("success") && json.getBoolean("success")) {
                smsToken = new SmsToken();
                smsToken.setId("sms");
                JSONObject data = json.getJSONObject("data");
                smsToken.setAccessToken(data.getString("access_token"));
                smsToken.setExpiresIn(data.getInt("expires_in"));
                smsToken.setHeader("Basic ZkphT2xKZ3dVMmdnY1JXbUlsYlU5czdqWTh0YnNSeTg6U01FNTVndFlkdjJoNlkwUQ==");
                smsToken.setCreateDate(LocalDateTime.now());

                em.persist(smsToken);
            }

        } else {
            if (smsToken.getCreateDate()
                    .isBefore(LocalDateTime.now().minus(smsToken.getExpiresIn(), ChronoUnit.SECONDS))) {
                JSONObject json = findAccessToken();
                if (json.has("success") && json.getBoolean("success")) {
                    JSONObject data = json.getJSONObject("data");
                    smsToken.setAccessToken(data.getString("access_token"));
                    smsToken.setExpiresIn(data.getInt("expires_in"));
                    smsToken.setCreateDate(LocalDateTime.now());
                    em.merge(smsToken);
                }
            }
        }
        return smsToken;
    }

    public JSONObject findAccessToken() {
        try {
            Client client = ClientBuilder.newClient();
            AppParameters sp = AppParameters.getInstance();
            MultivaluedMap<String, String> formdata = new MultivaluedHashMap<>();
            formdata.add("grant_type", Constant.GRANT_TYPE);
            WebTarget myResource = client.target(sp.pathsmsapitokenendpoint);
            Response response = myResource.request(MediaType.APPLICATION_JSON)
                    .header("Authorization", StringUtils.isNotEmpty(getBasicHeader()) ? getBasicHeader() : sp.header)
                    .post(Entity.entity(formdata, MediaType.APPLICATION_FORM_URLENCODED), Response.class);
            if (response.getStatus() == 200) {
                return new JSONObject().put("success", true).put("data",
                        new JSONObject(response.readEntity(String.class)));
            }

            return new JSONObject().put("success", false).put("msg", "Le token n'a pad pu être géneré ");
        } catch (JSONException e) {
            LOG.log(Level.SEVERE, null, e);
            return new JSONObject().put("success", false).put("msg", "Le token n'a pad pu être géneré ");
        }
    }

    private String getBasicHeader() {
        try {
            return em.find(SmsToken.class, "sms").getHeader();

        } catch (Exception e) {
            return "";
        }
    }
}
