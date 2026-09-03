/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest.service.impl;

import dal.ApplicationEvent;
import dal.SupportTicket;
import dal.TParameters;
import dal.TUser;
import java.io.File;
import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Asynchronous;
import javax.ejb.EJB;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.annotation.security.PermitAll;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.TypedQuery;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportEventService;
import rest.service.SupportBusinessException;
import rest.service.SupportTicketService;
import rest.service.dto.SupportEventDTO;
import util.AppParameters;
import util.Constant;
import util.DateCommonUtils;

/**
 *
 * @author koben
 */
@PermitAll
@Stateless
public class SupportEventServiceImpl implements SupportEventService {

    private static final Logger LOG = Logger.getLogger(SupportEventServiceImpl.class.getName());

    private static final String KEY_SUPPORT_STORAGE_DIR = "SUPPORT_STORAGE_DIR";
    private static final String KEY_SUPPORT_EMAIL = "SUPPORT_EMAIL";
    private static final String KEY_AUTO_TICKET_ENABLED = "SUPPORT_AUTO_TICKET_ENABLED";
    private static final String KEY_AUTO_TICKET_SEUIL = "SUPPORT_AUTO_TICKET_SEUIL";
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SupportTicketService supportTicketService;

    @Asynchronous
    @Override
    public void record(SupportEventDTO dto, String utilisateur) {
        try {
            if (dto == null || StringUtils.isBlank(dto.getMessageCourt())) {
                return;
            }
            String signature = buildSignature(dto);
            ApplicationEvent event = findBySignature(signature);
            if (event != null) {
                event.setOccurrences(event.getOccurrences() + 1);
                event.setLastSeenAt(LocalDateTime.now());
                if (StringUtils.isNotBlank(utilisateur)) {
                    event.setUtilisateur(StringUtils.abbreviate(utilisateur, 255));
                }
            } else {
                event = buildEvent(dto, signature, utilisateur);
                em.persist(event);
                try {
                    em.flush();
                } catch (Exception e) {
                    // Doublon concurrent sur l'index unique de signature : un autre
                    // appel a deja cree l'evenement. La transaction courante est alors
                    // condamnee, on ne peut plus y toucher ; on sort sans bruit
                    // (l'increment de cette occurrence est perdu, sans consequence).
                    LOG.log(Level.FINE, "record: signature dupliquee, evenement ignore", e);
                    return;
                }
            }
            addOccurrence(event);
            applyAutoTicket(event);
        } catch (Exception e) {
            // la capture d'un evenement ne doit jamais perturber l'application
            LOG.log(Level.SEVERE, "record", e);
        }
    }

    @Override
    public List<ApplicationEvent> findAll(int start, int limit, String niveau) {
        TypedQuery<ApplicationEvent> query;
        if (StringUtils.isNotBlank(niveau)) {
            query = em
                    .createQuery("SELECT o FROM ApplicationEvent o WHERE o.niveau = :niveau ORDER BY o.lastSeenAt DESC",
                            ApplicationEvent.class)
                    .setParameter("niveau", niveau);
        } else {
            query = em.createQuery("SELECT o FROM ApplicationEvent o ORDER BY o.lastSeenAt DESC",
                    ApplicationEvent.class);
        }
        return query.setFirstResult(start).setMaxResults(limit > 0 ? limit : 20).getResultList();
    }

    @Override
    public long count(String niveau) {
        if (StringUtils.isNotBlank(niveau)) {
            return em.createQuery("SELECT COUNT(o) FROM ApplicationEvent o WHERE o.niveau = :niveau", Long.class)
                    .setParameter("niveau", niveau).getSingleResult();
        }
        return em.createQuery("SELECT COUNT(o) FROM ApplicationEvent o", Long.class).getSingleResult();
    }

    @Override
    public String readLogContent(String eventId) {
        ApplicationEvent event = em.find(ApplicationEvent.class, eventId);
        if (event == null) {
            return "Aucun fichier log associé à cet événement.";
        }
        if (StringUtils.isBlank(event.getLogRef())) {
            return StringUtils.isBlank(event.getStackExtrait()) ? "Aucun fichier log associé à cet événement."
                    : extraitConserve(event, "Aucun fichier log associé à cet événement.");
        }
        try {
            Path base = getStorageBase().resolve("logs").toRealPath();
            Path file = Paths.get(event.getLogRef()).toRealPath();
            // Securite : le fichier doit etre SOUS le dossier logs du support (pas de lecture arbitraire).
            if (!file.startsWith(base)) {
                return "Chemin de log non autorisé.";
            }
            long taille = Files.size(file);
            if (taille > 1024L * 1024L) {
                return "Fichier log trop volumineux (" + (taille / 1024)
                        + " Ko) : ouvrez-le directement sur le poste :\n" + event.getLogRef();
            }
            return new String(Files.readAllBytes(file), StandardCharsets.UTF_8);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "readLogContent " + eventId, e);
            // Le fichier a disparu (purge, ou dossier de travail change avec le compte du serveur) : on rend
            // l'extrait conserve en base, qui suffit a nommer la cause.
            return extraitConserve(event,
                    "Fichier de détail introuvable sur le disque (purgé, ou écrit par une installation précédente) :\n"
                            + event.getLogRef() + "\nDossier de travail actuel : " + getStorageBase().resolve("logs"));
        }
    }

    /**
     * Contexte metier d'une erreur survenue sur la vente, deduit de l'adresse appelee : identite de la vente concernee,
     * son etat et qui la tenait.
     *
     * Sans cela, l'evenement ne dit que « violation d'integrite sur la ligne 4c8f... » : il faut alors interroger la
     * base pour savoir de quelle vente il s'agissait et dans quel etat elle etait, ce qui n'est plus possible a
     * distance. Recherche bornee : une vente, sinon une ligne de vente, et jamais d'echec propage.
     */
    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public String contexteMetier(String uri) {
        // Transaction DEDIEE : on lit la vente alors qu'une exception vient de survenir, donc alors que la
        // transaction appelante peut deja etre condamnee ; la lecture ne doit pas s'y greffer.
        try {
            if (StringUtils.isBlank(uri) || !uri.contains("/vente")) {
                return null;
            }
            for (String segment : uri.split("/")) {
                if (segment.length() < 20) {
                    continue;
                }
                Object[] vente = chercherVente(segment, false);
                if (vente == null) {
                    vente = chercherVente(segment, true);
                }
                if (vente != null) {
                    return decrireVente((String) vente[0], (String) vente[1], (java.util.Date) vente[2],
                            (java.util.Date) vente[3], (String) vente[4]);
                }
            }
            return null;
        } catch (Exception e) {
            LOG.log(Level.FINE, "contexteMetier " + uri, e);
            return null;
        }
    }

    /** Vente designee par son identifiant, ou par l'identifiant d'une de ses lignes quand {@code parLigne}. */
    private Object[] chercherVente(String identifiant, boolean parLigne) {
        try {
            String sql = "SELECT p.str_REF, p.str_STATUT, p.dt_CREATED, p.dt_UPDATED,"
                    + " CONCAT_WS(' ', u.str_FIRST_NAME, u.str_LAST_NAME) FROM t_preenregistrement p"
                    + " LEFT JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID"
                    + (parLigne
                            ? " JOIN t_preenregistrement_detail d"
                                    + " ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
                                    + " WHERE d.lg_PREENREGISTREMENT_DETAIL_ID = ?1"
                            : " WHERE p.lg_PREENREGISTREMENT_ID = ?1");
            List<Object[]> lignes = em.createNativeQuery(sql).setParameter(1, identifiant).setMaxResults(1)
                    .getResultList();
            return lignes.isEmpty() ? null : lignes.get(0);
        } catch (Exception e) {
            LOG.log(Level.FINE, "chercherVente " + identifiant, e);
            return null;
        }
    }

    /** Une ligne lisible : « Vente N° 260903_00035 (clôturée), créée le ..., dernière écriture le ..., par ... ». */
    static String decrireVente(String reference, String statut, java.util.Date creee, java.util.Date modifiee,
            String operateur) {
        StringBuilder texte = new StringBuilder("Vente concernée : N° ")
                .append(StringUtils.defaultIfBlank(reference, "(sans référence)"));
        texte.append(" (").append(libelleStatutVente(statut)).append(")");
        String creation = DateCommonUtils.formatDateHeureCreation(creee);
        if (!creation.isEmpty()) {
            texte.append(", créée le ").append(creation);
        }
        String ecriture = DateCommonUtils.formatDateHeureCreation(modifiee);
        if (!ecriture.isEmpty()) {
            texte.append(", dernière écriture le ").append(ecriture);
        }
        if (StringUtils.isNotBlank(operateur)) {
            texte.append(", par ").append(operateur.trim());
        }
        return texte.append('.').toString();
    }

    /** Statut technique de la vente traduit pour le journal. */
    private static String libelleStatutVente(String statut) {
        if (Constant.STATUT_IS_CLOSED.equals(statut)) {
            return "clôturée, donc encaissée";
        }
        if (Constant.STATUT_IS_PROGRESS.equals(statut)) {
            return "en cours";
        }
        return StringUtils.defaultIfBlank(statut, "état inconnu");
    }

    /** Extrait conserve en base, precede de la raison pour laquelle le fichier complet n'a pas pu etre lu. */
    private String extraitConserve(ApplicationEvent event, String entete) {
        if (StringUtils.isBlank(event.getStackExtrait())) {
            return entete;
        }
        return entete + "\n\n--- Détail conservé avec l'événement ---\n" + event.getStackExtrait();
    }

    @Override
    public String getParameter(String key) {
        return getParameterValue(key);
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void recordJobRun(String code) {
        try {
            String hostname = StringUtils.abbreviate(StringUtils.defaultString(System.getProperty("user.name")) + "@"
                    + StringUtils.defaultString(System.getProperty("os.name")), 255);
            em.createNativeQuery("INSERT INTO t_support_job_run (code, last_run_at, hostname) VALUES (?1, NOW(), ?2) "
                    + "ON DUPLICATE KEY UPDATE last_run_at = NOW(), hostname = ?2").setParameter(1, code)
                    .setParameter(2, hostname).executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "recordJobRun " + code, e);
        }
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void recordServerIncident(String code, String niveau, String message, String detail) {
        try {
            String signature = sha256Hex("SERVEUR|" + StringUtils.trimToEmpty(code));
            ApplicationEvent connu = findBySignature(signature);
            if (connu != null) {
                /*
                 * Incident deja enregistre : on ne cree pas de doublon, mais on COMPTE. L'ancienne version repartait
                 * sans rien faire, si bien qu'un incident survenu quarante fois dans la journee se lisait comme survenu
                 * une seule fois - or c'est justement le nombre, et l'heure de la derniere fois, qui disent si le
                 * probleme s'aggrave et a quel moment de la journee il frappe.
                 */
                connu.setOccurrences(connu.getOccurrences() + 1);
                connu.setLastSeenAt(LocalDateTime.now());
                em.merge(connu);
                addOccurrence(connu);
                return;
            }
            SupportEventDTO dto = new SupportEventDTO();
            dto.setType("SERVEUR");
            dto.setModule("SERVEUR");
            dto.setUrlOuEcran("serveur:" + StringUtils.abbreviate(code, 240));
            dto.setMessageCourt(message);
            dto.setStack(detail);
            ApplicationEvent event = new ApplicationEvent();
            event.setSignature(signature);
            event.setType("SERVEUR");
            event.setNiveau(normalizeNiveau(niveau));
            event.setModule("SERVEUR");
            event.setMessageCourt(StringUtils.abbreviate(StringUtils.defaultIfBlank(message, "Incident serveur"), 500));
            event.setUrlOuEcran(StringUtils.abbreviate(dto.getUrlOuEcran(), 255));
            event.setUtilisateur("WATCHDOG");
            event.setOccurrences(1);
            event.setLastSeenAt(LocalDateTime.now());
            event.setLogRef(writeLogFile(event.getId(), dto, "WATCHDOG"));
            em.persist(event);
            /*
             * Deux incidents identiques peuvent tomber en meme temps (deux threads HTTP, ou une surveillance qui
             * repasse pendant qu'un incident s'ecrit) : la lecture ci-dessus n'a alors rien trouve dans les deux, et
             * les deux insertions se presentent avec la MEME signature. Sans ce flush, la violation de l'index unique
             * ne se produisait qu'au COMMIT, donc apres la sortie de la methode - hors de portee du catch : elle
             * ressortait en « Duplicate entry ... for key uk_application_event_signature » dans le journal du serveur,
             * alors qu'il ne s'agit que d'un doublon sans consequence. On force donc l'ecriture ici pour la voir, et on
             * sort sans bruit : l'autre appel a deja enregistre l'incident.
             */
            try {
                em.flush();
            } catch (Exception doublon) {
                LOG.log(Level.FINE, "recordServerIncident: signature dupliquee, incident deja enregistre", doublon);
                return;
            }
            addOccurrence(event);
            applyAutoTicket(event);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "recordServerIncident " + code, e);
        }
    }

    @Override
    public String createTicketFromEvent(String eventId, TUser user) {
        ApplicationEvent event = em.find(ApplicationEvent.class, eventId);
        if (event == null) {
            throw new SupportBusinessException("Événement introuvable");
        }
        if (StringUtils.isNotBlank(event.getTicketId())) {
            SupportTicket existing = em.find(SupportTicket.class, event.getTicketId());
            if (existing != null) {
                return existing.getNumero();
            }
        }
        SupportTicket ticket = supportTicketService.createTicket(user, "[Bug] " + event.getMessageCourt(),
                buildTicketDescription(event), event.getModule(), "BUG", prioriteFromNiveau(event.getNiveau()));
        ticket.setEventSignature(event.getSignature());
        ticket.setApplicationEventId(event.getId());
        event.setTicketId(ticket.getId());
        return ticket.getNumero();
    }

    @Override
    public Map<String, Object> sante() {
        Map<String, Object> sante = new LinkedHashMap<>();
        long start = System.nanoTime();
        try {
            em.createNativeQuery("SELECT 1").getSingleResult();
            sante.put("baseConnectee", true);
            sante.put("latenceBaseMs", (System.nanoTime() - start) / 1_000_000);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "sante: base", e);
            sante.put("baseConnectee", false);
            sante.put("latenceBaseMs", -1);
        }
        Runtime runtime = Runtime.getRuntime();
        sante.put("jvmMemoireUtiliseeMo", (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024));
        sante.put("jvmMemoireMaxMo", runtime.maxMemory() / (1024 * 1024));
        sante.put("uptimeMinutes", ManagementFactory.getRuntimeMXBean().getUptime() / 60000);
        try {
            sante.put("erreurs24h", countErrorsSince(LocalDateTime.now().minusHours(24)));
            sante.put("erreurs7j", countErrorsSince(LocalDateTime.now().minusDays(7)));
            sante.put("ticketsOuverts", supportTicketService.countOpen());
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "sante: compteurs", e);
        }
        AppParameters sp = AppParameters.getInstance();
        sante.put("emailSupportConfigure", StringUtils.isNotBlank(getParameterValue(KEY_SUPPORT_EMAIL)));
        sante.put("emailExpediteurConfigure", StringUtils.isNotBlank(sp.email));
        sante.put("smtpHost", sp.smtpHost);
        File storage = getStorageBase().toFile();
        sante.put("dossierSupport", storage.getAbsolutePath());
        sante.put("espaceDisqueLibreMo", storage.exists() ? storage.getUsableSpace() / (1024 * 1024) : -1);
        sante.put("derniersIncidents", lastIncidents());
        return sante;
    }

    @Override
    public int purgeOldEvents() {
        int purged = 0;
        Map<String, Integer> retentions = new HashMap<>();
        retentions.put(ApplicationEvent.NIVEAU_INFO, getIntParameter("SUPPORT_RETENTION_INFO", 30));
        retentions.put(ApplicationEvent.NIVEAU_WARN, getIntParameter("SUPPORT_RETENTION_WARN", 60));
        retentions.put(ApplicationEvent.NIVEAU_ERROR, getIntParameter("SUPPORT_RETENTION_ERROR", 90));
        retentions.put(ApplicationEvent.NIVEAU_FATAL, getIntParameter("SUPPORT_RETENTION_FATAL", 180));
        for (Map.Entry<String, Integer> retention : retentions.entrySet()) {
            try {
                LocalDateTime cutoff = LocalDateTime.now().minusDays(retention.getValue());
                List<ApplicationEvent> events = em.createQuery(
                        "SELECT o FROM ApplicationEvent o WHERE o.ticketId IS NULL AND o.niveau = :niveau AND o.lastSeenAt < :cutoff",
                        ApplicationEvent.class).setParameter("niveau", retention.getKey())
                        .setParameter("cutoff", cutoff).getResultList();
                for (ApplicationEvent event : events) {
                    deleteLogFile(event.getLogRef());
                    em.createNativeQuery("DELETE FROM t_application_event_occurrence WHERE event_id = ?1")
                            .setParameter(1, event.getId()).executeUpdate();
                    em.remove(event);
                    purged++;
                }
            } catch (Exception e) {
                LOG.log(Level.SEVERE, "purgeOldEvents " + retention.getKey(), e);
            }
        }
        if (purged > 0) {
            LOG.log(Level.INFO, "Purge Centre de Support : {0} événement(s) supprimé(s)", purged);
        }
        return purged;
    }

    /**
     * Enregistre la date/heure de cette occurrence (niveaux ERROR/FATAL uniquement) avec l'utilisateur + IP + poste qui
     * l'a constatee, plafonnee a 100 lignes par evenement (les plus anciennes sont supprimees). Best-effort : ne
     * perturbe jamais la capture.
     */
    private void addOccurrence(ApplicationEvent event) {
        try {
            if (event == null || !(ApplicationEvent.NIVEAU_ERROR.equals(event.getNiveau())
                    || ApplicationEvent.NIVEAU_FATAL.equals(event.getNiveau()))) {
                return;
            }
            em.createNativeQuery(
                    "INSERT INTO t_application_event_occurrence (id, event_id, seen_at, constate_par) VALUES (LEFT(UUID(), 50), ?1, NOW(), ?2)")
                    .setParameter(1, event.getId()).setParameter(2, StringUtils.abbreviate(event.getUtilisateur(), 255))
                    .executeUpdate();
            em.createNativeQuery("DELETE FROM t_application_event_occurrence WHERE event_id = ?1 AND id NOT IN ("
                    + "SELECT id FROM (SELECT id FROM t_application_event_occurrence WHERE event_id = ?1 "
                    + "ORDER BY seen_at DESC LIMIT 100) conserve)").setParameter(1, event.getId()).executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "addOccurrence", e);
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<String> findOccurrences(String eventId) {
        List<String> dates = new ArrayList<>();
        try {
            List<Object> rows = em
                    .createNativeQuery("SELECT CONCAT(DATE_FORMAT(seen_at, '%d/%m/%Y %H:%i:%s'), "
                            + "IF(constate_par IS NULL OR constate_par = '', '', CONCAT('  —  ', constate_par))) "
                            + "FROM t_application_event_occurrence WHERE event_id = ?1 ORDER BY seen_at DESC")
                    .setParameter(1, eventId).getResultList();
            for (Object row : rows) {
                dates.add(String.valueOf(row));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "findOccurrences " + eventId, e);
        }
        return dates;
    }

    @Override
    public long countForPurge(String niveaux, String avantLe, boolean inclureTickets) {
        try {
            StringBuilder jpql = new StringBuilder("SELECT COUNT(o) FROM ApplicationEvent o WHERE 1=1");
            Map<String, Object> params = buildPurgeCriteria(jpql, niveaux, avantLe, inclureTickets);
            TypedQuery<Long> query = em.createQuery(jpql.toString(), Long.class);
            params.forEach(query::setParameter);
            return query.getSingleResult();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "countForPurge", e);
            return 0;
        }
    }

    @Override
    public int purgeSelective(String niveaux, String avantLe, boolean inclureTickets, String utilisateur) {
        int purged = 0;
        try {
            StringBuilder jpql = new StringBuilder("SELECT o FROM ApplicationEvent o WHERE 1=1");
            Map<String, Object> params = buildPurgeCriteria(jpql, niveaux, avantLe, inclureTickets);
            TypedQuery<ApplicationEvent> query = em.createQuery(jpql.toString(), ApplicationEvent.class);
            params.forEach(query::setParameter);
            for (ApplicationEvent event : query.getResultList()) {
                deleteLogFile(event.getLogRef());
                em.createNativeQuery("DELETE FROM t_application_event_occurrence WHERE event_id = ?1")
                        .setParameter(1, event.getId()).executeUpdate();
                em.remove(event);
                purged++;
            }
            if (purged > 0) {
                recordMaintenance("PURGE_EVENEMENTS",
                        "Purge manuelle du journal : " + purged + " événement(s) supprimé(s)"
                                + (StringUtils.isNotBlank(niveaux) ? " (niveaux " + niveaux + ")" : " (tous niveaux)")
                                + (StringUtils.isNotBlank(avantLe) ? " avant le " + avantLe : "")
                                + (inclureTickets ? ", y compris les événements liés à un ticket" : ""),
                        utilisateur);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "purgeSelective", e);
        }
        return purged;
    }

    private Map<String, Object> buildPurgeCriteria(StringBuilder jpql, String niveaux, String avantLe,
            boolean inclureTickets) {
        Map<String, Object> params = new HashMap<>();
        if (StringUtils.isNotBlank(niveaux)) {
            List<String> liste = new ArrayList<>();
            for (String niveau : niveaux.split(",")) {
                String normalise = StringUtils.upperCase(StringUtils.trimToEmpty(niveau));
                if (StringUtils.isNotBlank(normalise)) {
                    liste.add(normalise);
                }
            }
            if (!liste.isEmpty()) {
                jpql.append(" AND o.niveau IN :niveaux");
                params.put("niveaux", liste);
            }
        }
        if (StringUtils.isNotBlank(avantLe)) {
            jpql.append(" AND o.lastSeenAt < :avantLe");
            params.put("avantLe", LocalDate.parse(avantLe.trim()).atStartOfDay());
        }
        if (!inclureTickets) {
            jpql.append(" AND o.ticketId IS NULL");
        }
        return params;
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> recap(String dtStart, String dtEnd) {
        List<Map<String, Object>> recap = new ArrayList<>();
        try {
            StringBuilder sql = new StringBuilder(
                    "SELECT o.module, o.type, o.niveau, COUNT(*) AS nb_anomalies, SUM(o.occurrences) AS total_occurrences, "
                            + "DATE_FORMAT(MAX(o.last_seen_at), '%d/%m/%Y %H:%i') AS derniere_apparition "
                            + "FROM t_application_event o WHERE 1=1");
            List<Object> params = new ArrayList<>();
            if (StringUtils.isNotBlank(dtStart)) {
                sql.append(" AND o.last_seen_at >= ?").append(params.size() + 1);
                params.add(dtStart.trim() + " 00:00:00");
            }
            if (StringUtils.isNotBlank(dtEnd)) {
                sql.append(" AND o.last_seen_at <= ?").append(params.size() + 1);
                params.add(dtEnd.trim() + " 23:59:59");
            }
            sql.append(" GROUP BY o.module, o.type, o.niveau ORDER BY total_occurrences DESC, nb_anomalies DESC");
            javax.persistence.Query query = em.createNativeQuery(sql.toString());
            for (int i = 0; i < params.size(); i++) {
                query.setParameter(i + 1, params.get(i));
            }
            for (Object[] row : (List<Object[]>) query.getResultList()) {
                Map<String, Object> ligne = new LinkedHashMap<>();
                ligne.put("module", row[0]);
                ligne.put("type", row[1]);
                ligne.put("niveau", row[2]);
                ligne.put("nbAnomalies", ((Number) row[3]).longValue());
                ligne.put("totalOccurrences", ((Number) row[4]).longValue());
                ligne.put("derniereApparition", row[5]);
                recap.add(ligne);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "recap", e);
        }
        return recap;
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void recordMaintenance(String action, String message, String utilisateur) {
        try {
            ApplicationEvent event = new ApplicationEvent();
            // Signature unique par execution : chaque action de maintenance reste un evenement distinct
            // (pas de deduplication), pour garder l'historique complet de qui a fait quoi et quand.
            event.setSignature(sha256Hex("MAINTENANCE|" + StringUtils.trimToEmpty(action) + "|" + event.getId()));
            event.setType("MAINTENANCE");
            event.setNiveau(ApplicationEvent.NIVEAU_INFO);
            event.setModule("SUPPORT");
            event.setMessageCourt(StringUtils.abbreviate(StringUtils.defaultIfBlank(message, action), 500));
            event.setUrlOuEcran("maintenance:" + StringUtils.abbreviate(action, 240));
            event.setUtilisateur(StringUtils.abbreviate(StringUtils.defaultIfBlank(utilisateur, "SYSTEME"), 255));
            event.setOccurrences(1);
            event.setLastSeenAt(LocalDateTime.now());
            em.persist(event);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "recordMaintenance " + action, e);
        }
    }

    private ApplicationEvent findBySignature(String signature) {
        List<ApplicationEvent> events = em.createNamedQuery("ApplicationEvent.findBySignature", ApplicationEvent.class)
                .setParameter("signature", signature).setMaxResults(1).getResultList();
        return events.isEmpty() ? null : events.get(0);
    }

    private ApplicationEvent buildEvent(SupportEventDTO dto, String signature, String utilisateur) {
        ApplicationEvent event = new ApplicationEvent();
        event.setSignature(signature);
        event.setType(StringUtils.abbreviate(StringUtils.defaultIfBlank(dto.getType(), "AUTRE"), 50));
        event.setNiveau(normalizeNiveau(dto.getNiveau()));
        event.setModule(StringUtils.abbreviate(StringUtils.defaultIfBlank(dto.getModule(), "INCONNU"), 100));
        event.setMessageCourt(StringUtils.abbreviate(dto.getMessageCourt(), 500));
        event.setUrlOuEcran(StringUtils.abbreviate(dto.getUrlOuEcran(), 255));
        event.setPayloadJson(StringUtils.abbreviate(dto.getPayloadJson(), 4000));
        event.setStackExtrait(extraitStack(dto.getStack()));
        event.setUtilisateur(StringUtils.abbreviate(utilisateur, 255));
        event.setLastSeenAt(LocalDateTime.now());
        event.setLogRef(writeLogFile(event.getId(), dto, utilisateur));
        return event;
    }

    /**
     * Debut du detail technique garde EN BASE, a cote de l'evenement.
     *
     * Le fichier log complet reste ecrit sur le disque du serveur, mais il devient illisible des que le compte qui fait
     * tourner Payara change (le dossier de travail suit ce compte) ou apres une purge : le journal exporte portait
     * alors « Log introuvable » et l'analyse a distance etait impossible. Cet extrait suffit a nommer la cause : les
     * premieres lignes portent l'exception et l'endroit du code.
     */
    static String extraitStack(String stack) {
        if (StringUtils.isBlank(stack)) {
            return null;
        }
        return StringUtils.abbreviate(stack.replace("\r", "").trim(), 4000);
    }

    private void applyAutoTicket(ApplicationEvent event) {
        try {
            if (StringUtils.isNotBlank(event.getTicketId())) {
                return;
            }
            // rattache d'abord a un ticket ouvert existant pour la meme signature
            SupportTicket open = supportTicketService.findOpenBySignature(event.getSignature());
            if (open != null) {
                event.setTicketId(open.getId());
                return;
            }
            if (!"1".equals(StringUtils.trimToEmpty(getParameterValue(KEY_AUTO_TICKET_ENABLED)))) {
                return;
            }
            boolean fatal = ApplicationEvent.NIVEAU_FATAL.equals(event.getNiveau());
            boolean seuilAtteint = ApplicationEvent.NIVEAU_ERROR.equals(event.getNiveau())
                    && event.getOccurrences() >= getIntParameter(KEY_AUTO_TICKET_SEUIL, 5);
            if (fatal || seuilAtteint) {
                SupportTicket ticket = supportTicketService.createAutoTicket(
                        "[Auto] " + StringUtils.abbreviate(event.getMessageCourt(), 200), buildTicketDescription(event),
                        event.getModule(), prioriteFromNiveau(event.getNiveau()), event.getSignature(), event.getId());
                event.setTicketId(ticket.getId());
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "applyAutoTicket", e);
        }
    }

    private String buildTicketDescription(ApplicationEvent event) {
        StringBuilder sb = new StringBuilder();
        sb.append("Événement applicatif capturé automatiquement.\n");
        sb.append("Module : ").append(StringUtils.defaultString(event.getModule())).append("\n");
        sb.append("Niveau : ").append(event.getNiveau()).append("\n");
        sb.append("Constaté par : ").append(StringUtils.defaultString(event.getUtilisateur())).append("\n");
        sb.append("Écran/URL : ").append(StringUtils.defaultString(event.getUrlOuEcran())).append("\n");
        sb.append("Occurrences : ").append(event.getOccurrences()).append("\n");
        sb.append("Première apparition : ")
                .append(event.getCreatedAt() != null ? event.getCreatedAt().format(DATE_FORMAT) : "").append("\n");
        sb.append("Signature : ").append(event.getSignature()).append("\n");
        if (StringUtils.isNotBlank(event.getLogRef())) {
            sb.append("Fichier log : ").append(event.getLogRef()).append("\n");
        }
        sb.append("Message : ").append(event.getMessageCourt());
        return sb.toString();
    }

    private String prioriteFromNiveau(String niveau) {
        return ApplicationEvent.NIVEAU_FATAL.equals(niveau) ? "CRITIQUE" : "HAUTE";
    }

    private String normalizeNiveau(String niveau) {
        String value = StringUtils.upperCase(StringUtils.trimToEmpty(niveau));
        switch (value) {
        case ApplicationEvent.NIVEAU_INFO:
        case ApplicationEvent.NIVEAU_WARN:
        case ApplicationEvent.NIVEAU_ERROR:
        case ApplicationEvent.NIVEAU_FATAL:
            return value;
        default:
            return ApplicationEvent.NIVEAU_ERROR;
        }
    }

    private long countErrorsSince(LocalDateTime since) {
        return em.createQuery(
                "SELECT COUNT(o) FROM ApplicationEvent o WHERE o.lastSeenAt >= :since AND o.niveau IN ('ERROR','FATAL')",
                Long.class).setParameter("since", since).getSingleResult();
    }

    private List<Map<String, Object>> lastIncidents() {
        List<Map<String, Object>> incidents = new ArrayList<>();
        try {
            List<ApplicationEvent> events = em.createQuery(
                    "SELECT o FROM ApplicationEvent o WHERE o.niveau IN ('ERROR','FATAL') ORDER BY o.lastSeenAt DESC",
                    ApplicationEvent.class).setMaxResults(5).getResultList();
            for (ApplicationEvent event : events) {
                Map<String, Object> incident = new LinkedHashMap<>();
                incident.put("date", event.getLastSeenAt() != null ? event.getLastSeenAt().format(DATE_FORMAT) : "");
                incident.put("niveau", event.getNiveau());
                incident.put("module", event.getModule());
                incident.put("message", event.getMessageCourt());
                incident.put("occurrences", event.getOccurrences());
                incident.put("utilisateur", event.getUtilisateur());
                incidents.add(incident);
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "lastIncidents", e);
        }
        return incidents;
    }

    private String buildSignature(SupportEventDTO dto) {
        String normalizedMessage = StringUtils.lowerCase(StringUtils.trimToEmpty(dto.getMessageCourt()))
                .replaceAll("[0-9]+", "#");
        String firstStackLine = "";
        if (StringUtils.isNotBlank(dto.getStack())) {
            for (String line : dto.getStack().split("\n")) {
                if (StringUtils.isNotBlank(line)) {
                    firstStackLine = line.trim().replaceAll("[0-9]+", "#");
                    break;
                }
            }
        }
        String base = StringUtils.defaultString(dto.getType()) + "|" + StringUtils.defaultString(dto.getModule()) + "|"
                + normalizedMessage + "|" + firstStackLine + "|"
                + StringUtils.defaultString(dto.getUrlOuEcran()).replaceAll("[0-9]+", "#");
        return sha256Hex(base);
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "sha256Hex", e);
            return StringUtils.abbreviate(value.replaceAll("[^a-zA-Z0-9]", ""), 64);
        }
    }

    private String writeLogFile(String eventId, SupportEventDTO dto) {
        return writeLogFile(eventId, dto, null);
    }

    private String writeLogFile(String eventId, SupportEventDTO dto, String utilisateur) {
        if (StringUtils.isBlank(dto.getStack())) {
            return null;
        }
        try {
            LocalDate now = LocalDate.now();
            Path dir = getStorageBase().resolve("logs").resolve(String.valueOf(now.getYear()))
                    .resolve(String.format("%02d", now.getMonthValue()));
            Files.createDirectories(dir);
            Path file = dir.resolve("event-" + sanitizeForFileName(dto.getModule()) + "-" + eventId + ".log");
            StringBuilder content = new StringBuilder();
            content.append("Date : ").append(LocalDateTime.now().format(DATE_FORMAT)).append("\n");
            content.append("Type : ").append(StringUtils.defaultString(dto.getType())).append("\n");
            content.append("Module : ").append(StringUtils.defaultString(dto.getModule())).append("\n");
            if (StringUtils.isNotBlank(utilisateur)) {
                content.append("Constaté par : ").append(utilisateur).append("\n");
            }
            content.append("Écran/URL : ").append(StringUtils.defaultString(dto.getUrlOuEcran())).append("\n");
            content.append("Message : ").append(StringUtils.defaultString(dto.getMessageCourt())).append("\n\n");
            content.append(dto.getStack());
            Files.write(file, content.toString().getBytes(StandardCharsets.UTF_8));
            return StringUtils.abbreviate(file.toString(), 500);
        } catch (IOException e) {
            LOG.log(Level.SEVERE, "writeLogFile", e);
            return null;
        }
    }

    private void deleteLogFile(String logRef) {
        if (StringUtils.isBlank(logRef)) {
            return;
        }
        try {
            Files.deleteIfExists(Paths.get(logRef));
        } catch (IOException e) {
            LOG.log(Level.SEVERE, "deleteLogFile", e);
        }
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    public void recordCoherence(String code, String libelle, String module, String requeteSql, int nbCas,
            String payloadSample, String listeComplete) {
        // Transaction DEDIEE (REQUIRES_NEW) : l'ecriture de l'evenement est isolee de la transaction du controle.
        // Le fichier log (donnees concernees) est ecrit avant tout acces base : il reste disponible meme si l'insert
        // echoue. En cas d'erreur, l'exception est propagee et traitee "best-effort" par le veilleur.
        String signature = sha256Hex("COHERENCE|" + StringUtils.trimToEmpty(code));
        ApplicationEvent event = findBySignature(signature);
        if (nbCas <= 0) {
            // Anomalie resolue : on retire l'evenement de coherence et son fichier log.
            if (event != null) {
                deleteLogFile(event.getLogRef());
                em.remove(event);
            }
            return;
        }
        boolean nouveau = event == null;
        if (nouveau) {
            event = new ApplicationEvent();
            event.setSignature(signature);
            event.setType("COHERENCE");
            event.setNiveau("WARN");
            event.setUrlOuEcran("controle:" + StringUtils.abbreviate(code, 240));
        }
        // Rafraichit systematiquement l'etat courant : nombre de cas, echantillon, log.
        event.setModule(StringUtils.abbreviate(StringUtils.defaultIfBlank(module, "COHERENCE"), 100));
        event.setMessageCourt(StringUtils.abbreviate(StringUtils.defaultIfBlank(libelle, code), 500));
        event.setOccurrences(nbCas);
        event.setLastSeenAt(LocalDateTime.now());
        event.setUtilisateur("VEILLE_COHERENCE");
        event.setPayloadJson(StringUtils.abbreviate(payloadSample, 4000));
        event.setLogRef(writeCoherenceLog(event.getModule(), code, requeteSql, event.getId(), event.getLogRef(),
                listeComplete));
        // Persist APRES avoir renseigne tous les champs obligatoires (evite tout insert incomplet).
        if (nouveau) {
            em.persist(event);
        }
        // Force l'ecriture dans CETTE transaction dediee : l'erreur eventuelle est ainsi confinee ici.
        em.flush();
    }

    private String writeCoherenceLog(String module, String code, String requeteSql, String eventId, String existingPath,
            String content) {
        try {
            Path file;
            if (StringUtils.isNotBlank(existingPath)) {
                // On reecrit le meme fichier pour refleter l'etat courant (pas d'orphelin).
                file = Paths.get(existingPath);
                if (file.getParent() != null) {
                    Files.createDirectories(file.getParent());
                }
            } else {
                LocalDate now = LocalDate.now();
                Path dir = getStorageBase().resolve("logs").resolve(String.valueOf(now.getYear()))
                        .resolve(String.format("%02d", now.getMonthValue()));
                Files.createDirectories(dir);
                file = dir.resolve("event-" + sanitizeForFileName(module) + "-" + eventId + ".log");
            }
            StringBuilder sb = new StringBuilder();
            sb.append("Date : ").append(LocalDateTime.now().format(DATE_FORMAT)).append("\n");
            sb.append("Controle : ").append(StringUtils.defaultString(code)).append("\n");
            sb.append("Module : ").append(StringUtils.defaultString(module)).append("\n");
            if (StringUtils.isNotBlank(requeteSql)) {
                sb.append("Requete SQL du controle :\n").append(requeteSql).append("\n");
            }
            sb.append("\n").append(StringUtils.defaultString(content));
            Files.write(file, sb.toString().getBytes(StandardCharsets.UTF_8));
            return StringUtils.abbreviate(file.toString(), 500);
        } catch (IOException e) {
            LOG.log(Level.SEVERE, "writeCoherenceLog", e);
            return existingPath;
        }
    }

    private String sanitizeForFileName(String module) {
        String cleaned = StringUtils.defaultIfBlank(module, "EVENT").replaceAll("[^A-Za-z0-9]", "");
        return StringUtils.abbreviate(StringUtils.defaultIfBlank(cleaned, "EVENT"), 40);
    }

    private Path getStorageBase() {
        String configured = getParameterValue(KEY_SUPPORT_STORAGE_DIR);
        if (StringUtils.isNotBlank(configured)) {
            return Paths.get(configured.trim());
        }
        // Disque de donnees (D: puis F: puis E:) plutot que le profil utilisateur : le compte de service
        // Windows n'a pas toujours le droit d'ecrire dans C:\Users\... (AccessDeniedException).
        return util.StockageDisque.sousDossier("support");
    }

    private int getIntParameter(String key, int defaultValue) {
        try {
            String value = getParameterValue(key);
            return StringUtils.isNotBlank(value) ? Integer.parseInt(value.trim()) : defaultValue;
        } catch (NumberFormatException e) {
            return defaultValue;
        }
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
}
