/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import commonTasks.dto.NotificationDTO;
import dal.CategorieNotification;
import dal.Notification;
import dal.NotificationClient;
import dal.Notification_;
import dal.TClient;
import dal.TUser;
import dal.enumeration.Canal;
import dal.enumeration.Statut;
import dal.enumeration.TypeNotification;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;
import javax.ejb.Asynchronous;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.mail.Address;
import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import javax.persistence.TypedQuery;
import javax.persistence.criteria.CriteriaBuilder;
import javax.persistence.criteria.CriteriaQuery;
import javax.persistence.criteria.Predicate;
import javax.persistence.criteria.Root;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.collections4.MapUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONObject;
import rest.service.NotificationService;
import rest.service.SmsService;
import rest.service.v2.dto.ActiviteParam;
import util.FunctionUtils;
import util.NumberUtils;
import util.AppParameters;

/**
 *
 * @author koben
 */
@Stateless
public class NotificationImpl implements NotificationService {

    private static final Logger LOG = Logger.getLogger(NotificationImpl.class.getName());
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SmsService smsService;

    public EntityManager getEntityManager() {
        return em;
    }

    @Override
    public JSONObject findAll(String typeNotification, Canal canal, Statut statut, String dtStart, String dtEnd,
            int start, int limit) {
        var locatDateStart = StringUtils.isNotEmpty(dtStart) ? LocalDate.parse(dtStart) : LocalDate.now().minusYears(1);
        var locatDateEnd = StringUtils.isNotEmpty(dtEnd) ? LocalDate.parse(dtEnd) : LocalDate.now();
        var count = count(locatDateStart, locatDateEnd, canal, typeNotification);
        var data = getList(locatDateStart, locatDateEnd, canal, typeNotification, start, limit, false).stream()
                .map(NotificationDTO::new).collect(Collectors.toList());
        return FunctionUtils.returnData(data, count);
    }

    @Override
    public void save(Notification notification) {
        getEntityManager().merge(notification);
    }

    @Override
    public void save(Notification notification, TClient client) {
        notification.addNotificationClients(new NotificationClient(client, notification));
        getEntityManager().persist(notification);

    }

    @Override
    public Notification buildNotification(NotificationDTO notificationDto, TUser user) {
        Notification notification = new Notification();
        CategorieNotification categorieNotification = this.getOneByName(TypeNotification.MASSE);
        notification.setCategorieNotification(categorieNotification);
        notification.setMessage(notificationDto.getMessage());
        notification.setUser(user);
        if (CollectionUtils.isNotEmpty(notificationDto.getClients())) {
            notificationDto.getClients().stream().forEach(u -> {
                TClient client = getEntityManager().find(TClient.class, u.getClientId());
                notification.getNotificationClients().add(new NotificationClient(client, notification));
            });
        }
        getEntityManager().persist(notification);
        return notification;

    }

    private List<Predicate> listPredicates(CriteriaBuilder cb, Root<Notification> root, LocalDate dtStart,
            LocalDate dtEnd, Canal canal, String typeNotification) {
        List<Predicate> predicates = new ArrayList<>();
        // CategorieNotification_.typeNotification
        Predicate btw = cb.between(cb.function("DATE", Date.class, root.get(Notification_.CREATED_AT)),
                java.sql.Date.valueOf(dtStart), java.sql.Date.valueOf(dtEnd));
        predicates.add(btw);
        if (StringUtils.isNotEmpty(typeNotification)) {
            predicates.add(cb.equal(root.get(Notification_.categorieNotification).get("name"),
                    TypeNotification.valueOf(typeNotification).name()));
        }
        if (Objects.nonNull(canal)) {
            predicates.add(cb.equal(root.get(Notification_.categorieNotification).get("canal"), canal));
        }
        return predicates;
    }

    private long count(LocalDate dtStart, LocalDate dtEnd, Canal canal, String typeNotification) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<Notification> root = cq.from(Notification.class);
        cq.select(cb.count(root));
        List<Predicate> predicates = listPredicates(cb, root, dtStart, dtEnd, canal, typeNotification);
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        TypedQuery<Long> q = em.createQuery(cq);
        return Objects.isNull(q.getSingleResult()) ? 0 : q.getSingleResult();

    }

    private List<Notification> getList(LocalDate dtStart, LocalDate dtEnd, Canal canal, String typeNotification,
            int start, int limit, boolean all) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Notification> cq = cb.createQuery(Notification.class);
        Root<Notification> root = cq.from(Notification.class);
        cq.select(root).orderBy(cb.desc(root.get(Notification_.MODFIED_AT)));
        List<Predicate> predicates = listPredicates(cb, root, dtStart, dtEnd, canal, typeNotification);
        cq.where(cb.and(predicates.toArray(Predicate[]::new)));
        TypedQuery<Notification> q = em.createQuery(cq);
        if (!all) {
            q.setFirstResult(start);
            q.setMaxResults(limit);

        }
        return q.getResultList();
    }

    @Override
    public String buildDonnees(Map<String, Object> donneesMap) {
        if (MapUtils.isEmpty(donneesMap)) {
            return null;
        }
        JSONObject json = new JSONObject();
        donneesMap.forEach(json::put);
        return json.toString();
    }

    @Override
    public CategorieNotification getOneByName(TypeNotification typeNotification) {
        TypedQuery<CategorieNotification> typedQuery = this.em.createNamedQuery("CategorieNotification.findOneByName",
                CategorieNotification.class);
        typedQuery.setParameter("name", typeNotification.name());
        return typedQuery.getSingleResult();
    }

    @Override
    public void sendMail() {
        List<Notification> notifications = findByStatutAndCanal(Set.of(Statut.NOT_SEND),
                Set.of(Canal.EMAIL, Canal.SMS_EMAIL));

        if (!notifications.isEmpty()) {
            StringBuilder html = new StringBuilder();
            html.append(rest.service.notification.template.Mail.beginTag());
            notifications.stream().collect(Collectors.groupingBy(Notification::getCategorieNotification))
                    .forEach((categorie, categorieNotifications) -> {

                        TypeNotification typeNotification = TypeNotification.fromName(categorie.getName());
                        switch (typeNotification) {
                        case CLOTURE_DE_CAISSE:
                            html.append(
                                    rest.service.notification.template.Mail.buildClotureCaisse(categorieNotifications));
                            break;
                        case MVT_DE_CAISSE:
                            html.append(rest.service.notification.template.Mail.buildMvtCaisse(categorieNotifications));
                            break;
                        case ENTREE_EN_STOCK:
                            html.append(
                                    rest.service.notification.template.Mail.buildBonLivraison(categorieNotifications));
                            break;
                        case RETOUR_FOURNISSEUR:
                            html.append(rest.service.notification.template.Mail
                                    .buildRetourFournisseur(categorieNotifications));
                            break;
                        case SAISIS_PERIMES:
                            html.append(rest.service.notification.template.Mail.buildPerimes(categorieNotifications));
                            break;
                        case QUANTITE_UG:
                            html.append(rest.service.notification.template.Mail.buildEntreeUg(categorieNotifications));
                            break;
                        case AJUSTEMENT_DE_PRODUIT:
                            html.append(
                                    rest.service.notification.template.Mail.buildAjustement(categorieNotifications));
                            break;
                        case DECONDITIONNEMENT:
                            html.append(rest.service.notification.template.Mail
                                    .buildDeconditionnement(categorieNotifications));
                            break;
                        case MODIFICATION_INFO_PRODUIT_COMMANDE:
                            html.append(rest.service.notification.template.Mail
                                    .buildModificationProduitCommande(categorieNotifications));
                            break;
                        case MODIFICATION_PRIX_VENTE_PRODUIT:
                            html.append(rest.service.notification.template.Mail
                                    .buildModificationProduitPu(categorieNotifications));
                            break;
                        case AJOUT_DE_NOUVEAU_PRODUIT:
                            html.append(rest.service.notification.template.Mail
                                    .buildCreationProduit(categorieNotifications));
                            break;
                        case MODIFICATION_VENTE:
                            html.append(rest.service.notification.template.Mail.buildVente(categorieNotifications));
                            break;
                        default:
                            break;
                        }
                    });
            html.append(rest.service.notification.template.Mail.endTag());
            sendMail(html.toString());
            notifications.stream().forEach(e -> {
                e.setStatut(Statut.SENT);
                e.setModfiedAt(LocalDateTime.now());
                em.merge(e);
            });

        }

    }

    @Asynchronous
    @Override
    public void sendMail(Notification notification) {
        String html = rest.service.notification.template.Mail.beginTag();
        html += rest.service.notification.template.Mail.buildClotureCaisse(List.of(notification));
        html += rest.service.notification.template.Mail.endTag();
        sendMail(html);
    }
    // Statut.NOT_SEND

    private List<Notification> findByStatutAndCanal(Set<Statut> statut, Set<Canal> canaux) {
        try {
            TypedQuery<Notification> q = em.createNamedQuery("Notification.findAllByCreatedAtAndStatusAndCanaux",
                    Notification.class);
            q.setParameter("statut", statut);
            q.setParameter("canaux", canaux);
            q.setParameter("createdAt", LocalDateTime.of(LocalDate.now().minusDays(1), LocalTime.MIN));
            return q.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return Collections.emptyList();
        }
    }

    private boolean sendMail(String content) {
        try {
            Session session = Session.getInstance(rest.service.notification.template.Mail.getEmailProperties());
            AppParameters sp = rest.service.notification.template.Mail.sp;

            MimeMessage msg = new MimeMessage(session);
            List<Address> listadd = new ArrayList<>();

            var email = sp.mailOfficine;

            String[] emails = email.split(";");
            for (String email1 : emails) {
                listadd.add(new InternetAddress(email1));
            }

            Address[] recipient = new InternetAddress[listadd.size()];
            recipient = listadd.toArray(recipient);
            Address sender = new InternetAddress(sp.email);
            msg.setContent(content, "text/html; charset=utf-8");
            msg.setFrom(sender);
            msg.setRecipients(Message.RecipientType.TO, recipient);
            msg.setSubject("Resumé activité prestige 2");
            Transport.send(msg, sp.email, sp.password);
            return true;
        } catch (MessagingException e) {
            LOG.log(Level.SEVERE, null, e);
        }
        return false;
    }

    @Asynchronous
    @Override
    public void sendSms(Notification notification) {
        this.smsService.sendSMS(notification.getMessage());
    }

    private String sendPointActiviteSms(String date) {
        Data achat = buildAchat(date);
        Data ventes = buildVentes(date);
        List<Data> mvts = buildMvts(date);
        List<Data> ventesReglements = buildVenteReglements(date);
        StringBuilder sb = new StringBuilder();
        if (!ventesReglements.isEmpty()) {
            sb.append("**POINT DE LA CAISSE PAR MODE DE REGLEMENT**").append("\n");
            ventesReglements.forEach(v -> {
                sb.append(v.getModeReglement()).append(": ").append(NumberUtils.formatIntToString(v.getMontant()))
                        .append("\n");
            });
        }
        if (!mvts.isEmpty()) {
            sb.append("**MOUVEMENTS DE CAISSE **").append("\n");
            mvts.forEach(v -> {
                sb.append(v.getLibelleMvt()).append(": ").append(NumberUtils.formatIntToString(v.getMontant()))
                        .append("\n");
            });
        }
        if (Objects.nonNull(ventes)) {
            int montantTtc = ventes.getMontantTtc();
            int panierMoyen = montantTtc / ventes.getCount();
            sb.append("TOTAL TTC: ").append(NumberUtils.formatIntToString(montantTtc)).append("\n");
            sb.append("TOTAL CREDIT: ").append(NumberUtils.formatIntToString(ventes.getMontantCredit())).append("\n");
            sb.append("MARGE: ").append(NumberUtils.formatIntToString(ventes.getMarge())).append("\n");
            sb.append("PANIER MOYEN: ").append(NumberUtils.formatIntToString(panierMoyen)).append("\n");

            if (Objects.nonNull(achat)) {
                int ratio = montantTtc / achat.getMontantTtc();
                sb.append("RATIO V/A: ").append(NumberUtils.formatIntToString(ratio)).append("\n");
            }

        }
        if (Objects.nonNull(achat)) {
            sb.append("**BONS DE LIVRAISONS **").append("\n");
            sb.append("TOTAL BON TTC: ").append(NumberUtils.formatIntToString(achat.getMontantTtc())).append("\n");
            sb.append("TOTAL BON TVA: ").append(NumberUtils.formatIntToString(achat.getMontantTva())).append("\n");
            sb.append("TOTAL BON HT: ").append(NumberUtils.formatIntToString(achat.getMontantHt())).append("\n");
            sb.append("NOMBRE DE BONS: ").append(NumberUtils.formatIntToString(achat.getCount())).append("\n");
        }

        if (sb.length() > 0) {
            return "*** RECAP  ACTIVITE DU " + LocalDate.parse(date).format(DateTimeFormatter.ofPattern("dd/MM/YYYY"))
                    + "***\n" + sb.toString();
            // this.smsService.sendSMS(content);
        }
        return null;

    }

    private Tuple fetchAchats(String date) {
        String strinQuery = "SELECT SUM(b.int_MHT) AS montantHt,SUM(b.int_TVA) AS montantTva,SUM(b.int_HTTC) AS montantTtc, COUNT(b.lg_BON_LIVRAISON_ID) AS nombreBon FROM t_bon_livraison b WHERE DATE(b.dt_CREATED)=?1";
        try {
            Query query = em.createNativeQuery(strinQuery, Tuple.class).setParameter(1, date);
            return (Tuple) query.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }

    }

    private Data buildAchat(String date) {
        Tuple t = fetchAchats(date);
        if (Objects.isNull(t) || Objects.isNull(t.get("montantHt"))) {
            return null;
        }
        Data data = new Data();
        data.setCount(t.get("nombreBon", BigInteger.class).intValue());
        data.setMontantHt(t.get("montantHt", BigDecimal.class).intValue());
        data.setMontantTtc(t.get("montantTtc", BigDecimal.class).intValue());
        data.setMontantTva(t.get("montantTva", BigDecimal.class).intValue());

        return data;
    }

    private Data buildVentes(String date) {
        Tuple t = fetchVentes(date);
        if (Objects.isNull(t) || Objects.isNull(t.get("montantCredit"))) {
            return null;
        }
        Data data = new Data();
        data.setCount(t.get("nombreVente", BigInteger.class).intValue());
        data.setMontantCredit(t.get("montantCredit", BigDecimal.class).intValue()
                + t.get("montantRestant", BigDecimal.class).intValue());
        data.setMarge(t.get("marge", BigDecimal.class).intValue());
        data.setMontantTtc(t.get("montantTtc", BigDecimal.class).intValue());
        return data;
    }

    private Tuple fetchVentes(String date) {
        String strinQuery = "SELECT COUNT(p.lg_PREENREGISTREMENT_ID) AS nombreVente, SUM(m.montantCredit) AS montantCredit, SUM(m.montantRestant) AS montantRestant,SUM(m.marge) AS marge,SUM(p.int_PRICE) AS montantTtc  FROM  mvttransaction m  JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=m.vente_id WHERE DATE(p.dt_UPDATED)=?1 AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=FALSE AND p.int_PRICE>0";
        try {
            Query query = em.createNativeQuery(strinQuery, Tuple.class).setParameter(1, date);
            return (Tuple) query.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return null;
        }
    }

    private List<Tuple> fetchVentesReglements(String date) {
        String strinQuery = "SELECT SUM(v.montant) montant,t.str_NAME AS modeReglement FROM  t_preenregistrement p  JOIN vente_reglement v ON p.lg_PREENREGISTREMENT_ID=v.vente_id JOIN t_type_reglement t ON t.lg_TYPE_REGLEMENT_ID=v.type_regelement WHERE DATE(p.dt_UPDATED)=?1 AND p.str_STATUT='is_Closed' GROUP BY v.type_regelement";
        try {
            Query query = em.createNativeQuery(strinQuery, Tuple.class).setParameter(1, date);
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return List.of();
        }
    }

    private List<Tuple> fetchMvts(String date) {
        String strinQuery = "SELECT SUM(m.int_AMOUNT) AS montant,t.str_NAME AS libelleMvt FROM t_mvt_caisse m JOIN t_type_mvt_caisse t ON m.lg_TYPE_MVT_CAISSE_ID=t.lg_TYPE_MVT_CAISSE_ID WHERE t.lg_TYPE_MVT_CAISSE_ID IN('2','3','5','4')  AND DATE(m.dt_CREATED)=?1 GROUP BY  t.lg_TYPE_MVT_CAISSE_ID";
        try {
            Query query = em.createNativeQuery(strinQuery, Tuple.class).setParameter(1, date);
            return query.getResultList();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, null, e);
            return List.of();
        }
    }

    private List<Data> buildMvts(String date) {
        List<Tuple> t = fetchMvts(date);
        if (t.isEmpty()) {
            return List.of();
        }

        return t.stream().map(v -> {
            Data data = new Data();
            data.setMontant(v.get("montant", Double.class).intValue());
            data.setLibelleMvt(v.get("libelleMvt", String.class));
            return data;
        }).collect(Collectors.toList());
    }

    private List<Data> buildVenteReglements(String date) {
        List<Tuple> t = fetchVentesReglements(date);
        if (t.isEmpty()) {
            return List.of();
        }

        return t.stream().map(v -> {
            Data data = new Data();
            data.setMontant(v.get("montant", BigDecimal.class).intValue());
            data.setModeReglement(v.get("modeReglement", String.class));
            return data;
        }).collect(Collectors.toList());
    }

    @Override
    public void sendPointActivite(ActiviteParam activiteParam) {
        String content = sendPointActiviteSms(activiteParam.getDateActivite());
        if (StringUtils.isNotBlank(content)) {
            if (activiteParam.getCanal() == Canal.SMS) {
                this.smsService.sendSMS(content);
            } else if (activiteParam.getCanal() == Canal.EMAIL) {
                sendMail(content);
            }
        }

    }

    private class Data {

        private int montant;
        private String libelleMvt;
        private String modeReglement;
        private int montantHt;
        private int count;
        private int montantCredit;
        private int montantRestant;

        private int marge;
        private int montantTtc;
        private int montantTva;

        public int getMontant() {
            return montant;
        }

        public void setMontant(int montant) {
            this.montant = montant;
        }

        public String getLibelleMvt() {
            return libelleMvt;
        }

        public void setLibelleMvt(String libelleMvt) {
            this.libelleMvt = libelleMvt;
        }

        public String getModeReglement() {
            return modeReglement;
        }

        public void setModeReglement(String modeReglement) {
            this.modeReglement = modeReglement;
        }

        public int getMontantHt() {
            return montantHt;
        }

        public void setMontantHt(int montantHt) {
            this.montantHt = montantHt;
        }

        public int getCount() {
            return count;
        }

        public void setCount(int count) {
            this.count = count;
        }

        public int getMontantCredit() {
            return montantCredit;
        }

        public void setMontantCredit(int montantCredit) {
            this.montantCredit = montantCredit;
        }

        public int getMontantRestant() {
            return montantRestant;
        }

        public void setMontantRestant(int montantRestant) {
            this.montantRestant = montantRestant;
        }

        public int getMarge() {
            return marge;
        }

        public void setMarge(int marge) {
            this.marge = marge;
        }

        public int getMontantTtc() {
            return montantTtc;
        }

        public void setMontantTtc(int montantTtc) {
            this.montantTtc = montantTtc;
        }

        public int getMontantTva() {
            return montantTva;
        }

        public void setMontantTva(int montantTva) {
            this.montantTva = montantTva;
        }

    }
}
