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
        event.setUtilisateur(StringUtils.abbreviate(utilisateur, 255));
        event.setLastSeenAt(LocalDateTime.now());
        event.setLogRef(writeLogFile(event.getId(), dto));
        return event;
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
    public void recordCoherence(String code, String libelle, String module, int nbCas, String payloadSample,
            String listeComplete) {
        try {
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
            if (event == null) {
                event = new ApplicationEvent();
                event.setSignature(signature);
                event.setType("COHERENCE");
                event.setNiveau("WARN");
                event.setUrlOuEcran("controle:" + StringUtils.abbreviate(code, 240));
                em.persist(event);
            }
            // Rafraichit systematiquement l'etat courant : nombre de cas, echantillon, log.
            event.setModule(StringUtils.abbreviate(StringUtils.defaultIfBlank(module, "COHERENCE"), 100));
            event.setMessageCourt(StringUtils.abbreviate(libelle, 500));
            event.setOccurrences(nbCas);
            event.setLastSeenAt(LocalDateTime.now());
            event.setPayloadJson(StringUtils.abbreviate(payloadSample, 4000));
            event.setLogRef(
                    writeCoherenceLog(event.getModule(), code, event.getId(), event.getLogRef(), listeComplete));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "recordCoherence", e);
        }
    }

    private String writeCoherenceLog(String module, String code, String eventId, String existingPath, String content) {
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
            sb.append("Module : ").append(StringUtils.defaultString(module)).append("\n\n");
            sb.append(StringUtils.defaultString(content));
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
        return Paths.get(System.getProperty("user.home"), "prestige-support");
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
