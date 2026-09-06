/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package job;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.security.PermitAll;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportEventService;

/**
 * Surveillance des jobs planifies : pour chaque entree active de t_support_job, execute la requete (SELECT renvoyant la
 * date/heure du dernier passage) et cree une alerte si ce passage est introuvable ou plus vieux que max_age_minutes.
 * Detecte qu'un traitement planifie (valorisation, snapshot, purge, veilleur, peremption...) n'a pas tourne.
 *
 * @author koben
 */
@Singleton
@PermitAll
public class SupportJobMonitor {

    private static final Logger LOG = Logger.getLogger(SupportJobMonitor.class.getName());

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SupportEventService supportEventService;

    @Schedule(hour = "*", minute = "10", persistent = false)
    public void verifier() {
        try {
            if (!"1".equals(StringUtils.trimToEmpty(supportEventService.getParameter("SUPPORT_MONITOR_ENABLED")))) {
                return;
            }
            List<Object[]> jobs = lireJobsActifs();
            for (Object[] job : jobs) {
                verifierJob(String.valueOf(job[0]), String.valueOf(job[1]), String.valueOf(job[2]),
                        ((Number) job[3]).longValue(), job[4] == null ? null : String.valueOf(job[4]));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "SupportJobMonitor.verifier", e);
        }
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> lireJobsActifs() {
        return em.createNativeQuery("SELECT code, libelle, requete_sql, max_age_minutes, parametre_actif"
                + " FROM t_support_job WHERE actif = 1 ORDER BY ordre").getResultList();
    }

    private void verifierJob(String code, String libelle, String sql, long maxAgeMinutes, String parametreActif) {
        try {
            if (!isSelectSeul(sql)) {
                return;
            }
            if (estDesactiveParParametre(parametreActif)) {
                // Un traitement qu'on a choisi de ne pas faire tourner n'a jamais de dernier passage : alerter
                // chaque heure reviendrait a reprocher a l'application d'obeir au reglage.
                LOG.log(Level.FINE, "Job {0} ignore : {1} vaut 0.", new Object[] { code, parametreActif });
                return;
            }
            LocalDateTime dernier = premierResultatDate(sql);
            LocalDateTime now = LocalDateTime.now();
            if (dernier == null) {
                alerter(code, libelle, "aucun passage trouve (le job n'a peut-etre jamais tourne)", null,
                        maxAgeMinutes);
                return;
            }
            long ageMinutes = ChronoUnit.MINUTES.between(dernier, now);
            if (ageMinutes > maxAgeMinutes) {
                alerter(code, libelle, "dernier passage il y a " + (ageMinutes / 60) + " h", dernier, maxAgeMinutes);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "verifierJob " + code, e);
        }
    }

    private LocalDateTime premierResultatDate(String sql) {
        Query q = em.createNativeQuery(sql).setMaxResults(1);
        List<?> resultats = q.getResultList();
        if (resultats == null || resultats.isEmpty() || resultats.get(0) == null) {
            return null;
        }
        Object valeur = resultats.get(0);
        if (valeur instanceof Object[]) {
            Object[] ligne = (Object[]) valeur;
            valeur = ligne.length > 0 ? ligne[0] : null;
        }
        return toLocalDateTime(valeur);
    }

    private LocalDateTime toLocalDateTime(Object valeur) {
        if (valeur == null) {
            return null;
        }
        if (valeur instanceof Timestamp) {
            return ((Timestamp) valeur).toLocalDateTime();
        }
        if (valeur instanceof java.sql.Date) {
            return ((java.sql.Date) valeur).toLocalDate().atStartOfDay();
        }
        if (valeur instanceof java.util.Date) {
            return LocalDateTime.ofInstant(((java.util.Date) valeur).toInstant(), java.time.ZoneId.systemDefault());
        }
        return null;
    }

    private void alerter(String code, String libelle, String precision, LocalDateTime dernier, long maxAgeMinutes) {
        String message = "Job planifie en retard : " + libelle + " (" + precision + ")";
        String detail = "Le traitement planifie ne s'est pas execute dans le delai attendu.\n" + "Job : " + libelle
                + " [" + code + "]\n" + "Dernier passage : " + (dernier != null ? dernier.toString() : "inconnu") + "\n"
                + "Delai max tolere : " + (maxAgeMinutes / 60) + " h\n\n"
                + "Verifier que le serveur tourne en continu et que le job est actif.";
        supportEventService.recordServerIncident("job-" + code + "-" + LocalDate.now(), "ERROR", message, detail);
        LOG.log(Level.WARNING, "Alerte job : {0}", message);
    }

    private boolean estDesactiveParParametre(String cle) {
        if (StringUtils.isBlank(cle)) {
            return false;
        }
        try {
            return jobSuspendu(cle, supportEventService.getParameter(cle.trim()));
        } catch (Exception e) {
            LOG.log(Level.FINE, "estDesactiveParParametre " + cle, e);
            return false;
        }
    }

    /**
     * Vrai si le job est commande par un parametre positionne a 0.
     *
     * Un parametre absent de la table, ou une colonne vide, laisse le job surveille : on ne suspend une surveillance
     * que sur un refus EXPLICITE. Le pire des deux cotes n'est pas symetrique - se taire a tort laisse passer une panne
     * reelle, alerter a tort noie les pannes reelles sous des dizaines d'alertes par jour ; seule une consigne claire
     * de ne pas faire tourner le traitement justifie de se taire.
     */
    static boolean jobSuspendu(String cle, String valeurParametre) {
        return StringUtils.isNotBlank(cle) && "0".equals(StringUtils.trimToEmpty(valeurParametre));
    }

    private boolean isSelectSeul(String sql) {
        if (StringUtils.isBlank(sql)) {
            return false;
        }
        String n = sql.trim().toLowerCase();
        boolean uneInstruction = n.indexOf(';') == -1 || n.indexOf(';') == n.length() - 1;
        return n.startsWith("select") && uneInstruction;
    }
}
