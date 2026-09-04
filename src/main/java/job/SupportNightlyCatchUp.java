/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package job;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.annotation.security.PermitAll;
import javax.ejb.DependsOn;
import javax.ejb.EJB;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.ejb.Timeout;
import javax.ejb.TimerConfig;
import javax.ejb.TimerService;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import rest.service.SupportCoherenceService;
import rest.service.SupportEventService;

/**
 * Rattrapage au demarrage des jobs nocturnes du Centre de Support. Dans les officines qui eteignent le serveur la nuit,
 * la purge (03:45), le veilleur de coherence (04:15), l'expiration des ventes en attente (00:10) et la purge mensuelle
 * du releve de valorisation (le 2 a 02:30) ne peuvent jamais s'executer a leur heure planifiee. Ce bean verifie,
 * quelques minutes apres le demarrage de l'application, si ces jobs ont tourne dans le delai attendu (via
 * t_support_job_run) et les execute immediatement si ce n'est pas le cas.
 *
 * Le delai attendu est celui que le Centre de Support lui-meme surveille (t_support_job.max_age_minutes) : le
 * rattrapage se declenche exactement quand le moniteur s'appreterait a signaler le retard, sans qu'une echeance
 * mensuelle soit rejouee a chaque demarrage.
 *
 * Le differe de quelques minutes evite de ralentir le demarrage et laisse Flyway et les autres jobs d'initialisation se
 * terminer. La valorisation et le snapshot de stock ont deja leur propre rattrapage au demarrage
 * (StartupOrchestrationService, etape STOCK_JOURNALIER) et ne sont pas geres ici.
 *
 * @author koben
 */
@Singleton
@Startup
@PermitAll
@DependsOn("FlywayStartupBean")
public class SupportNightlyCatchUp {

    private static final Logger LOG = Logger.getLogger(SupportNightlyCatchUp.class.getName());

    /** Delai avant le rattrapage apres le demarrage (5 minutes). */
    private static final long DELAI_DEMARRAGE_MS = 5L * 60L * 1000L;
    /** Delai applique quand le job n'est pas decrit dans t_support_job : le cycle quotidien. */
    private static final long AGE_MAX_MINUTES = 24L * 60L;

    @Resource
    private TimerService timerService;
    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SupportCoherenceService supportCoherenceService;
    @EJB
    private SupportEventService supportEventService;
    @EJB
    private VenteAttenteExpiration venteAttenteExpiration;
    @EJB
    private StockSnapshotPurgeScheduler stockSnapshotPurgeScheduler;

    @PostConstruct
    public void planifier() {
        try {
            timerService.createSingleActionTimer(DELAI_DEMARRAGE_MS,
                    new TimerConfig("support-rattrapage-nocturne", false));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "planifier", e);
        }
    }

    @Timeout
    public void rattraper() {
        try {
            if (aBesoinDeRattrapage("PURGE_SUPPORT")) {
                LOG.info("Rattrapage au demarrage : purge du Centre de Support (le job de 03:45 n'a pas tourne)");
                supportEventService.purgeOldEvents();
                supportEventService.recordJobRun("PURGE_SUPPORT");
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "rattrapage purge", e);
        }
        try {
            if (aBesoinDeRattrapage("COHERENCE_SUPPORT")) {
                LOG.info("Rattrapage au demarrage : veilleur de coherence (le job de 04:15 n'a pas tourne)");
                supportCoherenceService.runActiveChecks();
                supportEventService.recordJobRun("COHERENCE_SUPPORT");
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "rattrapage coherence", e);
        }
        try {
            if (aBesoinDeRattrapage(VenteAttenteExpiration.CODE_JOB)) {
                LOG.info("Rattrapage au demarrage : ventes en attente de la veille"
                        + " (le job de 00:10 n'a pas tourne)");
                venteAttenteExpiration.executer();
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "rattrapage ventes en attente", e);
        }
        try {
            if (aBesoinDeRattrapage("PURGE_VALORISATION")) {
                LOG.info("Rattrapage au demarrage : purge du releve de valorisation"
                        + " (le job du 2 a 02:30 n'a pas tourne)");
                stockSnapshotPurgeScheduler.purger();
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "rattrapage purge valorisation", e);
        }
    }

    /**
     * Vrai si le job n'a jamais tourne, ou pas depuis plus longtemps que le delai attendu (d'apres t_support_job_run et
     * t_support_job).
     */
    private boolean aBesoinDeRattrapage(String code) {
        try {
            List<?> resultats = em.createNativeQuery("SELECT last_run_at FROM t_support_job_run WHERE code = ?1")
                    .setParameter(1, code).setMaxResults(1).getResultList();
            if (resultats == null || resultats.isEmpty() || resultats.get(0) == null) {
                return true;
            }
            Object valeur = resultats.get(0);
            if (!(valeur instanceof Timestamp)) {
                return true;
            }
            LocalDateTime dernier = ((Timestamp) valeur).toLocalDateTime();
            return ChronoUnit.MINUTES.between(dernier, LocalDateTime.now()) > ageMaxMinutes(code);
        } catch (Exception e) {
            // Table absente ou base indisponible : on ne force pas le rattrapage.
            LOG.log(Level.WARNING, "aBesoinDeRattrapage " + code, e);
            return false;
        }
    }

    /**
     * Delai tolere pour ce job, tel que le Centre de Support le surveille. Un job mensuel (la purge du releve,
     * tolerance 45 jours) ne doit pas etre rejoue a chaque demarrage sous pretexte qu'il n'a pas tourne dans les 24 h.
     */
    private long ageMaxMinutes(String code) {
        try {
            List<?> resultats = em
                    .createNativeQuery("SELECT max_age_minutes FROM t_support_job WHERE code = ?1 AND actif = 1")
                    .setParameter(1, code).setMaxResults(1).getResultList();
            if (resultats != null && !resultats.isEmpty() && resultats.get(0) instanceof Number) {
                long minutes = ((Number) resultats.get(0)).longValue();
                if (minutes > 0) {
                    return minutes;
                }
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "ageMaxMinutes " + code, e);
        }
        return AGE_MAX_MINUTES;
    }
}
