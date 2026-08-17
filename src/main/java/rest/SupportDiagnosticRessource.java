/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package rest;

import dal.ApplicationEvent;
import dal.SupportTicket;
import dal.TUser;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import javax.ejb.EJB;
import javax.inject.Inject;
import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportEventService;
import rest.service.SupportTicketService;
import util.Constant;

/**
 * Export d'un dossier de diagnostic (zip) pour depannage a distance : etat de sante, evenements recents, tickets et
 * fichiers logs associes. Lecture seule.
 *
 * @author koben
 */
@Path("v1/support/diagnostic")
public class SupportDiagnosticRessource {

    private static final Logger LOG = Logger.getLogger(SupportDiagnosticRessource.class.getName());
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final int MAX_EVENEMENTS = 300;
    private static final int MAX_TICKETS = 300;
    private static final int MAX_FICHIERS_LOG = 100;
    private static final long MAX_TAILLE_LOG = 2L * 1024 * 1024;

    @Inject
    private HttpServletRequest servletRequest;
    @EJB
    private SupportEventService supportEventService;
    @EJB
    private SupportTicketService supportTicketService;
    @EJB
    private job.SupportWatchdog supportWatchdog;
    @EJB
    private job.SupportPreflight supportPreflight;
    @EJB
    private job.SupportDatabaseMonitor supportDatabaseMonitor;

    /**
     * Mesures courantes de la base de donnees (connexions, requetes en cours, verrous). Photographie en lecture seule :
     * ne declenche aucune alerte, la surveillance periodique s'en charge.
     */
    @GET
    @Path("base")
    @Produces("application/json")
    public Response base() {
        TUser user = (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        return Response.ok().entity(ResultFactory.getSuccessResult(supportDatabaseMonitor.mesures(), 1)).build();
    }

    /**
     * Boite noire du watchdog : dernier etat connu du serveur avant le crash detecte au demarrage, puis etat courant.
     * Lecture seule.
     */
    @GET
    @Path("boite-noire")
    @Produces("text/plain; charset=UTF-8")
    public Response boiteNoire() {
        TUser user = (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        return Response.ok(supportWatchdog.consulterBoiteNoire()).build();
    }

    /**
     * Rejoue l'auto-diagnostic de la configuration de la supervision et rend son resultat. Rejeu SANS trace : seul le
     * passage automatique au demarrage alimente le journal des evenements, pour qu'une verification manuelle repetee ne
     * cree pas de bruit.
     */
    @GET
    @Path("preflight")
    @Produces("application/json")
    public Response preflight() {
        TUser user = (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        return Response.ok().entity(ResultFactory.getSuccessResult(supportPreflight.executer(false), 1)).build();
    }

    @GET
    @Path("log")
    @Produces("text/plain; charset=UTF-8")
    public Response log(@javax.ws.rs.QueryParam("eventId") String eventId) {
        TUser user = (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        if (StringUtils.isBlank(eventId)) {
            return Response.status(Response.Status.BAD_REQUEST).build();
        }
        String contenu = supportEventService.readLogContent(eventId);
        return Response.ok(StringUtils.defaultString(contenu)).build();
    }

    @GET
    @Path("export")
    @Produces("application/zip")
    public Response export() {
        TUser user = (TUser) servletRequest.getSession().getAttribute(Constant.AIRTIME_USER);
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        final Map<String, Object> sante = supportEventService.sante();
        final List<ApplicationEvent> events = supportEventService.findAll(0, MAX_EVENEMENTS, null);
        final List<SupportTicket> tickets = supportTicketService.findAll(0, MAX_TICKETS, null);
        StreamingOutput stream = os -> writeZip(os, sante, events, tickets);
        String nom = "diagnostic-prestige-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm"))
                + ".zip";
        return Response.ok(stream).header("Content-Disposition", "attachment; filename=\"" + nom + "\"").build();
    }

    private void writeZip(OutputStream os, Map<String, Object> sante, List<ApplicationEvent> events,
            List<SupportTicket> tickets) {
        try (ZipOutputStream zip = new ZipOutputStream(os)) {
            ecrireTexte(zip, "info.txt", buildInfo(sante));
            ecrireTexte(zip, "evenements.csv", buildEvenementsCsv(events));
            ecrireTexte(zip, "tickets.csv", buildTicketsCsv(tickets));
            ajouterLogs(zip, events);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "writeZip", e);
        }
    }

    private String buildInfo(Map<String, Object> sante) {
        StringBuilder sb = new StringBuilder();
        sb.append("Dossier de diagnostic Prestige - Centre de Support\n");
        sb.append("Genere le : ").append(LocalDateTime.now().format(DATE_FORMAT)).append("\n\n");
        sb.append("=== Etat de sante ===\n");
        if (sante != null) {
            for (Map.Entry<String, Object> entry : sante.entrySet()) {
                sb.append(entry.getKey()).append(" : ").append(String.valueOf(entry.getValue())).append("\n");
            }
        }
        return sb.toString();
    }

    private String buildEvenementsCsv(List<ApplicationEvent> events) {
        StringBuilder sb = new StringBuilder();
        sb.append(
                "id;created_at;last_seen_at;niveau;type;module;occurrences;utilisateur;url_ou_ecran;message;log_ref\n");
        for (ApplicationEvent e : events) {
            sb.append(csv(e.getId())).append(';').append(csv(format(e.getCreatedAt()))).append(';')
                    .append(csv(format(e.getLastSeenAt()))).append(';').append(csv(e.getNiveau())).append(';')
                    .append(csv(e.getType())).append(';').append(csv(e.getModule())).append(';')
                    .append(e.getOccurrences()).append(';').append(csv(e.getUtilisateur())).append(';')
                    .append(csv(e.getUrlOuEcran())).append(';').append(csv(e.getMessageCourt())).append(';')
                    .append(csv(e.getLogRef())).append('\n');
        }
        return sb.toString();
    }

    private String buildTicketsCsv(List<SupportTicket> tickets) {
        StringBuilder sb = new StringBuilder();
        sb.append("numero;created_at;statut;priorite;type;module;utilisateur;sujet\n");
        for (SupportTicket t : tickets) {
            sb.append(csv(t.getNumero())).append(';').append(csv(format(t.getCreatedAt()))).append(';')
                    .append(csv(t.getStatutTicket())).append(';').append(csv(t.getPriorite())).append(';')
                    .append(csv(t.getType())).append(';').append(csv(t.getModule())).append(';')
                    .append(csv(t.getUtilisateur())).append(';').append(csv(t.getSujet())).append('\n');
        }
        return sb.toString();
    }

    private void ajouterLogs(ZipOutputStream zip, List<ApplicationEvent> events) {
        int ajoutes = 0;
        for (ApplicationEvent e : events) {
            if (ajoutes >= MAX_FICHIERS_LOG) {
                break;
            }
            String logRef = e.getLogRef();
            if (StringUtils.isBlank(logRef)) {
                continue;
            }
            try {
                java.nio.file.Path file = Paths.get(logRef);
                if (!Files.exists(file) || !Files.isRegularFile(file) || Files.size(file) > MAX_TAILLE_LOG) {
                    continue;
                }
                zip.putNextEntry(new ZipEntry("logs/" + file.getFileName().toString()));
                Files.copy(file, zip);
                zip.closeEntry();
                ajoutes++;
            } catch (Exception ex) {
                LOG.log(Level.FINE, "ajouterLogs", ex);
            }
        }
    }

    private void ecrireTexte(ZipOutputStream zip, String nom, String contenu) throws Exception {
        zip.putNextEntry(new ZipEntry(nom));
        zip.write(StringUtils.defaultString(contenu).getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private String format(LocalDateTime date) {
        return date != null ? date.format(DATE_FORMAT) : "";
    }

    private String csv(String value) {
        if (value == null) {
            return "";
        }
        String cleaned = value.replace("\r", " ").replace("\n", " ");
        if (cleaned.contains(";") || cleaned.contains("\"")) {
            cleaned = "\"" + cleaned.replace("\"", "\"\"") + "\"";
        }
        return cleaned;
    }
}
